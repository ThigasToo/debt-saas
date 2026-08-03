'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ContractTabs from '@/components/ContractTabs'


interface ContractProfile {
  modality: string
  bank: string | null
  guaranteeTypes: string[]
  fieldGroups: string[]
}

interface ExtractedField {
  id: string
  fieldLabel: string | null
  fieldGroup: string | null
  fieldValue: string
  dataType: string | null
}

interface ContractDetail {
  companyName: string | null
  profile: ContractProfile | null
}

interface ScheduleSpec {
  rate: {
    kind: string
    fixedAnnualPercent: number | null
    index: string | null
    spreadAnnualPercent: number | null
  }
  amortization: {
    kind: string
    periodicity: string
    numberOfInstallments: number | null
    grace: { principalMonths: number } | null
  }
  assumptions: { topic: string; value: string; reason: string }[]
  openQuestions: { topic: string; question: string }[]
  confidence: number
  interpretationNotes?: string
}

interface Tranche {
  id: string
  label: string
  scheduleSpec: ScheduleSpec
  totalPrincipal: number
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const AMORTIZATION_LABEL: Record<string, string> = {
  SAC: 'SAC', PRICE: 'Price', BULLET: 'pagamento único no vencimento', CONTRACTUAL_TABLE: 'tabela contratual', CUSTOM_PERCENT: 'percentuais customizados',
}

export default function ContractSummaryPage() {
  const params = useParams()
  const id = params?.id as string

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [fields, setFields] = useState<ExtractedField[]>([])
  const [tranches, setTranches] = useState<Tranche[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const [contractRes, tranchesRes] = await Promise.all([
          fetch(`/api/contracts/${id}`),
          fetch(`/api/contracts/${id}/tranches`),
        ])
        const contractData = await contractRes.json()
        const tranchesData = await tranchesRes.json()
        if (!contractRes.ok) throw new Error(contractData.error || 'Erro ao carregar contrato')

        setContract(contractData.contract)
        setFields(contractData.fields ?? [])
        setTranches(tranchesData.tranches ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando resumo...</p>

  if (!contract) {
    return (
      <div>
        <Link href="/contracts" className="text-sm" style={{ color: 'var(--color-moss-deep)' }}>← Voltar</Link>
        <p className="mt-4 text-sm" style={{ color: 'var(--color-clay)' }}>{error || 'Contrato não encontrado'}</p>
      </div>
    )
  }

  const totalPrincipal = tranches.reduce((sum, t) => sum + t.totalPrincipal, 0)
  const allAssumptions = tranches.flatMap((t) => t.scheduleSpec.assumptions ?? [])
  const allOpenQuestions = tranches.flatMap((t) => t.scheduleSpec.openQuestions ?? [])

  // Parágrafo de contexto, montado a partir do que já foi extraído — sem chamada nova à IA
  const introParts: string[] = []
  if (contract.profile) {
    introParts.push(
      `Contrato do tipo ${contract.profile.modality}${contract.profile.bank ? ` junto a ${contract.profile.bank}` : ''}, totalizando ${formatCurrency(totalPrincipal)}${tranches.length > 1 ? ` distribuídos em ${tranches.length} linhas de crédito` : ''}.`
    )
    if (contract.profile.guaranteeTypes?.length) {
      introParts.push(`Garantido por ${contract.profile.guaranteeTypes.join(', ')}.`)
    }
  }
  tranches.forEach((t) => {
    const rateDesc =
      t.scheduleSpec.rate.kind === 'FIXED'
        ? `${t.scheduleSpec.rate.fixedAnnualPercent}% a.a. fixos`
        : t.scheduleSpec.rate.kind === 'INDEXED'
        ? `${t.scheduleSpec.rate.index} + ${t.scheduleSpec.rate.spreadAnnualPercent ?? 0}% a.a.`
        : 'sem incidência de juros'
    introParts.push(
      `${tranches.length > 1 ? `A linha "${t.label}"` : 'A dívida'} amortiza por ${AMORTIZATION_LABEL[t.scheduleSpec.amortization.kind] || t.scheduleSpec.amortization.kind}, a ${rateDesc}${t.scheduleSpec.amortization.grace?.principalMonths ? `, com ${t.scheduleSpec.amortization.grace.principalMonths} meses de carência` : ''}.`
    )
  })

  const grouped: Record<string, ExtractedField[]> = {}
  for (const f of fields) {
    const key = f.fieldGroup || 'Outros'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(f)
  }
  const groupOrder = contract.profile?.fieldGroups?.filter((g) => grouped[g]?.length) ?? Object.keys(grouped)

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/contracts" className="text-sm" style={{ color: 'var(--color-moss-deep)' }}>← Voltar para contratos</Link>

      <div className="mt-4 mb-2">
        <p className="page-eyebrow mb-1">{contract.companyName}</p>
        <h1 className="page-title">Resumo do Contrato</h1>
      </div>

      <ContractTabs contractId={id} />

      {/* Contexto em prosa — só a leitura interpretativa, não os números soltos */}
      <div className="card p-6 mb-6">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          {introParts.join(' ')}
        </p>
      </div>

      {/* Fatos-chave em tópicos, agrupados como já vinham da extração */}
      <div className="space-y-6">
        {groupOrder.map((groupName) => (
          <div key={groupName}>
            <h2 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink-soft)' }}>
              {groupName}
            </h2>
            <div className="card p-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {grouped[groupName].map((f) => (
                  <div key={f.id}>
                    <dt className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{f.fieldLabel}</dt>
                    <dd className={`text-sm font-medium ${f.dataType === 'currency' || f.dataType === 'percent' || f.dataType === 'number' ? 'figure' : ''}`}>
                      {f.fieldValue}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        ))}
      </div>

      {(allAssumptions.length > 0 || allOpenQuestions.length > 0) && (
        <div className="mt-6 space-y-2">
          {allAssumptions.length > 0 && (
            <div className="card p-4" style={{ background: 'var(--color-wheat-soft)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-wheat)' }}>Premissas assumidas pela IA</p>
              {allAssumptions.map((a, i) => (
                <p key={i} className="text-xs mb-1" style={{ color: 'var(--color-wheat)' }}>
                  <strong>{a.topic}:</strong> {a.value} — <em>{a.reason}</em>
                </p>
              ))}
            </div>
          )}
          {allOpenQuestions.length > 0 && (
            <div className="card p-4" style={{ background: 'var(--color-clay-soft)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-clay)' }}>Pontos em aberto no contrato</p>
              {allOpenQuestions.map((q, i) => (
                <p key={i} className="text-xs mb-1" style={{ color: 'var(--color-clay)' }}>
                  <strong>{q.topic}:</strong> {q.question}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}