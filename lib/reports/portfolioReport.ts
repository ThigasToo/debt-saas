import { db } from '@/lib/db'
import { contracts, companies, debtTranches, installments, extractedFields } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import type { ScheduleSpec } from '@/lib/finance/scheduleSpec'

// ---------- Reconhecimento de nomes próprios em texto corrido ----------
// (mesma lógica já usada em app/api/dashboard/route.ts pra extrair avalistas)
const NAME_CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

function looksLikePersonName(segment: string): boolean {
  if (/\d/.test(segment)) return false
  const words = segment.split(/\s+/).filter(Boolean)
  if (words.length < 2) return false
  let capitalizedCount = 0
  for (const w of words) {
    if (NAME_CONNECTORS.has(w.toLowerCase())) continue
    if (!/^[A-ZÀ-Ý][a-zà-ÿ'-]*$/.test(w)) return false
    capitalizedCount++
  }
  return capitalizedCount >= 2
}

const SPOUSE_PREFIX = /^(e\s+)?(sua\s+esposa|seu\s+esposo|c[oô]njuge|casado\(?a?\)?\s+com|casada\s+com|casado\s+com)\s+/i

function extractPersonNames(rawValue: string): string[] {
  return rawValue
    .split(',')
    .map((part) => part.trim().replace(SPOUSE_PREFIX, '').trim())
    .filter((part) => looksLikePersonName(part))
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

// ---------- Palavras-chave por tipo de garantia — AJUSTE AQUI depois de ver um export real ----------
const GUARANTEE_COLUMNS: { header: string; keywords: string[] }[] = [
  { header: 'Alienação Fiduciária', keywords: ['alienacao fiduciaria', 'fiduciaria'] },
  { header: 'Hipoteca', keywords: ['hipoteca'] },
  { header: 'Penhor', keywords: ['penhor', 'pignoraticia'] },
  { header: 'Nota Promissória', keywords: ['nota promissoria', 'promissoria'] },
  { header: 'Fidejussória', keywords: ['fidejussoria', 'fianca'] },
  { header: 'Devedor Solidário', keywords: ['devedor solidario', 'solidari'] },
]

export interface PortfolioRow {
  pessoa: string
  contrato: string
  observacoes: string
  tomador: string
  cnpj: string | null
  origem: string
  tipo: string
  dataOperacao: string
  dataFinal: string
  valorDeFace: number | null
  saldoDevedor: number | null
  parcelas: number | null
  parcela: number | string | null
  valorDaGarantia: number | string | null
  garantiasDiversas: string
  guaranteeCells: Record<string, string>
  avalistas: string[]
}

export async function buildPortfolioReportRows(accountId: string): Promise<PortfolioRow[]> {
  const allContracts = await db
    .select({
      id: contracts.id,
      contractType: contracts.contractType,
      profile: contracts.profile,
      companyName: companies.name,
      companyCnpj: companies.cnpj,
      documentType: companies.documentType,
    })
    .from(contracts)
    .innerJoin(companies, eq(contracts.companyId, companies.id))
    .where(eq(companies.accountId, accountId))

  const contractIds = allContracts.map((c) => c.id)
  if (contractIds.length === 0) return []

  const allTranches = await db.select().from(debtTranches).where(inArray(debtTranches.contractId, contractIds))
  const allInstallments = await db.select().from(installments).where(inArray(installments.contractId, contractIds))
  const allFields = await db.select().from(extractedFields).where(inArray(extractedFields.contractId, contractIds))

  const fieldsByContract: Record<string, typeof allFields> = {}
  for (const f of allFields) {
    if (!fieldsByContract[f.contractId]) fieldsByContract[f.contractId] = []
    fieldsByContract[f.contractId].push(f)
  }

  const installmentsByTranche: Record<string, typeof allInstallments> = {}
  for (const i of allInstallments) {
    const key = i.trancheId ?? 'sem_tranche'
    if (!installmentsByTranche[key]) installmentsByTranche[key] = []
    installmentsByTranche[key].push(i)
  }

  const rows: PortfolioRow[] = []

  for (const contract of allContracts) {
    const profile = contract.profile as { bank?: string | null; guaranteeTypes?: string[] } | null
    const fields = fieldsByContract[contract.id] ?? []
    const tranches = allTranches.filter((t) => t.contractId === contract.id)

    const numeroField = fields.find((f) => /n[uú]mero.*contrato|contrato\s*n[ºo°]/i.test(f.fieldLabel ?? ''))
    const contratoLabel = numeroField?.fieldValue || contract.id.slice(0, 8)

    const avalistaFields = fields.filter(
      (f) => f.fieldName === 'avalistas' || (f.fieldLabel ?? '').toLowerCase().includes('avalista')
    )
    const avalistas = Array.from(new Set(avalistaFields.flatMap((f) => extractPersonNames(f.fieldValue))))

    const guaranteeFields = fields.filter((f) => normalize(f.fieldGroup ?? '').includes('garantia'))
    const guaranteeCells: Record<string, string> = {}
    const leftover: string[] = []
    let valorDaGarantia: number | string | null = null

    for (const f of guaranteeFields) {
      const normLabel = normalize(f.fieldLabel ?? '')
      const normValue = normalize(f.fieldValue)

      if (/valor.*garantia/.test(normLabel)) {
        valorDaGarantia = f.fieldValue
        continue
      }

      const match = GUARANTEE_COLUMNS.find((col) => col.keywords.some((kw) => normLabel.includes(kw) || normValue.includes(kw)))
      if (match) {
        guaranteeCells[match.header] = guaranteeCells[match.header] ? `${guaranteeCells[match.header]}; ${f.fieldValue}` : f.fieldValue
      } else {
        leftover.push(f.fieldValue)
      }
    }

    if (tranches.length === 0) {
      rows.push({
        pessoa: contract.documentType === 'CPF' ? 'Pessoa Física' : 'Pessoa Jurídica',
        contrato: contratoLabel,
        observacoes: '',
        tomador: contract.companyName,
        cnpj: contract.companyCnpj,
        origem: profile?.bank || '',
        tipo: contract.contractType || '',
        dataOperacao: '',
        dataFinal: '',
        valorDeFace: null,
        saldoDevedor: null,
        parcelas: null,
        parcela: null,
        valorDaGarantia,
        garantiasDiversas: leftover.join('; '),
        guaranteeCells,
        avalistas,
      })
      continue
    }

    for (const tranche of tranches) {
      const spec = tranche.scheduleSpec as ScheduleSpec
      const trancheInstallments = installmentsByTranche[tranche.id] ?? []

      const valorDeFace = spec.disbursements?.reduce((sum, d) => sum + d.amount, 0) ?? null
      const dataOperacao = spec.disbursements?.[0]?.date ?? ''
      const dataFinal = spec.amortization?.finalMaturityDate ?? ''
      const parcelas = spec.amortization?.numberOfInstallments ?? (trancheInstallments.length || null)

      const pendentes = trancheInstallments.filter((i) => i.status !== 'PAID')
      const saldoDevedor = pendentes.length > 0 ? pendentes.reduce((sum, i) => sum + i.principalAmount, 0) : null

      let parcela: number | string | null = null
      if (pendentes.length > 0) {
        const amounts = pendentes.map((i) => i.totalAmount)
        const min = Math.min(...amounts)
        const max = Math.max(...amounts)
        parcela = max - min < 0.02 ? amounts[0] : '(Variáveis)'
      }

      rows.push({
        pessoa: contract.documentType === 'CPF' ? 'Pessoa Física' : 'Pessoa Jurídica',
        contrato: tranches.length > 1 ? `${contratoLabel} — ${tranche.label}` : contratoLabel,
        observacoes: spec.interpretationNotes || '',
        tomador: contract.companyName,
        cnpj: contract.companyCnpj,
        origem: profile?.bank || '',
        tipo: contract.contractType || '',
        dataOperacao,
        dataFinal,
        valorDeFace,
        saldoDevedor,
        parcelas,
        parcela,
        valorDaGarantia,
        garantiasDiversas: leftover.join('; '),
        guaranteeCells,
        avalistas,
      })
    }
  }

  return rows
}