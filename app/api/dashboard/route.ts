import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contracts, extractedFields, companies, debtTranches, installments } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'
import { ScheduleSpec } from '@/lib/finance/scheduleSpec'

function describeRate(spec: ScheduleSpec): string {
  const { rate } = spec
  if (rate.kind === 'FIXED') return `${rate.fixedAnnualPercent ?? 0}% a.a.`
  if (rate.kind === 'INDEXED') {
    return `${rate.index ?? '—'}${rate.indexPercent ? ` ${rate.indexPercent}%` : ''} + ${rate.spreadAnnualPercent ?? 0}% a.a.`
  }
  return 'Sem juros'
}

// Conectores comuns em nomes brasileiros — não contam como "palavra capitalizada"
// mas também não invalidam o segmento (ex: "Maria da Silva", "João dos Santos")
const NAME_CONNECTORS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/**
 * O contrato costuma descrever avalistas num bloco corrido: nome, nacionalidade,
 * profissão, CPF, estado civil, nome do cônjuge, tudo separado por vírgula.
 * Em vez de tentar prever cada qualificador possível (frágil), reconhecemos o
 * FORMATO de um nome próprio: 2+ palavras capitalizadas, sem dígitos.
 */
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

// Remove prefixos comuns antes de checar o nome, ex: "casado com Fulano" → "Fulano"
const SPOUSE_PREFIX = /^(e\s+)?(sua\s+esposa|seu\s+esposo|c[oô]njuge|casado\(?a?\)?\s+com|casada\s+com|casado\s+com)\s+/i

function extractPersonNames(rawValue: string): string[] {
  return rawValue
    .split(',')
    .map((part) => part.trim().replace(SPOUSE_PREFIX, '').trim())
    .filter((part) => looksLikePersonName(part))
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const allContracts = await db
      .select({
        id: contracts.id,
        status: contracts.status,
        createdAt: contracts.createdAt,
        companyName: companies.name,
        profile: contracts.profile,
      })
      .from(contracts)
      .innerJoin(companies, eq(contracts.companyId, companies.id))
      .where(eq(companies.accountId, session.accountId))

    const statusCounts: Record<string, number> = {}
    for (const c of allContracts) {
      statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1
    }

    const activeContracts = allContracts.filter((c) => c.status === 'ACTIVE')
    const activeContractIds = activeContracts.map((c) => c.id)

    const tranchesByContract: Record<string, { label: string; scheduleSpec: ScheduleSpec }[]> = {}
    const maxDueDateByContract: Record<string, Date> = {}
    let allFields: (typeof extractedFields.$inferSelect)[] = []

    if (activeContractIds.length > 0) {
      const tranches = await db
        .select({ contractId: debtTranches.contractId, label: debtTranches.label, scheduleSpec: debtTranches.scheduleSpec })
        .from(debtTranches)
        .where(inArray(debtTranches.contractId, activeContractIds))

      for (const t of tranches) {
        if (!tranchesByContract[t.contractId]) tranchesByContract[t.contractId] = []
        tranchesByContract[t.contractId].push({ label: t.label, scheduleSpec: t.scheduleSpec as ScheduleSpec })
      }

      const installmentRows = await db
        .select({ contractId: installments.contractId, dueDate: installments.dueDate })
        .from(installments)
        .where(inArray(installments.contractId, activeContractIds))

      for (const row of installmentRows) {
        const due = new Date(row.dueDate)
        if (!maxDueDateByContract[row.contractId] || due > maxDueDateByContract[row.contractId]) {
          maxDueDateByContract[row.contractId] = due
        }
      }

      allFields = await db
        .select()
        .from(extractedFields)
        .where(inArray(extractedFields.contractId, activeContractIds))
    }

    const contractRows = activeContracts.map((c) => {
      const tranches = tranchesByContract[c.id] ?? []
      const totalValor = tranches.reduce(
        (sum, t) => sum + (t.scheduleSpec.disbursements?.reduce((s, d) => s + d.amount, 0) ?? 0),
        0
      )
      const rateDescriptions = tranches.map((t) =>
        tranches.length > 1 ? `${describeRate(t.scheduleSpec)} (${t.label})` : describeRate(t.scheduleSpec)
      )
      const indexadores = Array.from(
        new Set(
          tranches.map((t) => (t.scheduleSpec.rate.kind === 'INDEXED' ? t.scheduleSpec.rate.index : 'Taxa fixa (pré-fixada)'))
        )
      ).filter(Boolean)

      const specFinalDate = tranches.map((t) => t.scheduleSpec.amortization.finalMaturityDate).find(Boolean)
      const vencimento = specFinalDate ? new Date(specFinalDate as string) : maxDueDateByContract[c.id]

      const profile = c.profile as { bank?: string | null } | null

      return {
        id: c.id,
        companyName: c.companyName,
        createdAt: c.createdAt,
        credor: profile?.bank || '—',
        valor_original: totalValor > 0 ? totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—',
        indexador: indexadores.join(', ') || '—',
        spread_ou_taxa: rateDescriptions.join(' e ') || '—',
        vencimento_final: vencimento ? vencimento.toLocaleDateString('pt-BR') : '—',
      }
    })

    // Avalistas: extrai só nomes próprios reais de dentro do texto corrido
    const avalistaExposure: Record<string, { count: number; companies: Set<string> }> = {}
    for (const f of allFields) {
      const isAvalistaField = f.fieldName === 'avalistas' || (f.fieldLabel ?? '').toLowerCase().includes('avalista')
      if (!isAvalistaField) continue

      const names = extractPersonNames(f.fieldValue)
      const contract = activeContracts.find((c) => c.id === f.contractId)

      for (const name of names) {
        if (!avalistaExposure[name]) avalistaExposure[name] = { count: 0, companies: new Set() }
        avalistaExposure[name].count += 1
        if (contract?.companyName) avalistaExposure[name].companies.add(contract.companyName)
      }
    }

    const avalistas = Object.entries(avalistaExposure)
      .map(([name, data]) => ({ name, contractCount: data.count, companies: Array.from(data.companies) }))
      .sort((a, b) => b.contractCount - a.contractCount)

    return NextResponse.json({
      totalContracts: allContracts.length,
      statusCounts,
      contracts: contractRows,
      avalistas,
    })
  } catch (err) {
    console.error('Erro ao montar dashboard:', err)
    return NextResponse.json(
      { error: 'Erro ao montar dashboard', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}