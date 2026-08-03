'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ContractTabs from '@/components/ContractTabs'

interface Installment {
  id: string
  installmentNumber: number
  dueDate: string
  principalAmount: number
  interestAmount: number
  totalAmount: number
  remainingBalance: number
  source: string
  status: string
}

interface ScheduleSpec {
  rate: {
    kind: string
    index: string | null
    indexPercent: number | null
    spreadAnnualPercent: number | null
    fixedAnnualPercent: number | null
  }
  amortization: {
    kind: string
    periodicity: string
    numberOfInstallments: number | null
    grace: { principalMonths: number; interestMonths: number; capitalizeInterest: boolean } | null
  }
  assumptions: { topic: string; value: string; reason: string }[]
  openQuestions: { topic: string; question: string; sourcePage: number | null }[]
  confidence: number
  interpretationNotes?: string
}

interface Tranche {
  id: string
  label: string
  scheduleSpec: ScheduleSpec
  totalPrincipal: number
  installmentCount: number
}

const AMORTIZATION_LABEL: Record<string, string> = {
  SAC: 'SAC (amortização constante)',
  PRICE: 'Price (parcela constante)',
  BULLET: 'Bullet (principal no vencimento)',
  CONTRACTUAL_TABLE: 'Tabela contratual',
  CUSTOM_PERCENT: 'Percentuais customizados',
}

const PERIODICITY_LABEL: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
  IRREGULAR: 'Irregular',
}

const RATE_KIND_OPTIONS = [
  { value: 'FIXED', label: 'Fixa' },
  { value: 'INDEXED', label: 'Indexada' },
  { value: 'ZERO', label: 'Sem juros' },
]

const AMORTIZATION_KIND_OPTIONS = [
  { value: 'SAC', label: 'SAC' },
  { value: 'PRICE', label: 'Price' },
  { value: 'BULLET', label: 'Bullet' },
]

const PERIODICITY_OPTIONS = [
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'SEMIANNUAL', label: 'Semestral' },
  { value: 'ANNUAL', label: 'Anual' },
]

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function inputStyle() {
  return { borderColor: 'var(--color-line)' } as React.CSSProperties
}

function TrancheCard({ contractId, tranche, onSpecUpdated }: { contractId: string; tranche: Tranche; onSpecUpdated: (t: Tranche) => void }) {
  const [installmentsList, setInstallmentsList] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ScheduleSpec>(tranche.scheduleSpec)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/contracts/${contractId}/tranches/${tranche.id}/schedule`)
        const data = await res.json()
        if (res.ok) setInstallmentsList(data.installments ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [contractId, tranche.id])

  const runGenerate = async (specOverride?: ScheduleSpec) => {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(`/api/contracts/${contractId}/tranches/${tranche.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specOverride ? { scheduleSpec: specOverride } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar cronograma')
      setInstallmentsList(data.installments)
      if (specOverride) {
        const totalPrincipal = specOverride.amortization
          ? tranche.totalPrincipal // principal não muda ao editar taxa/amortização
          : tranche.totalPrincipal
        onSpecUpdated({ ...tranche, scheduleSpec: specOverride, totalPrincipal })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setGenerating(false)
    }
  }

  const handleTogglePaid = async (installmentId: string, currentStatus: string) => {
    const paid = currentStatus !== 'PAID'
    try {
      await fetch(`/api/contracts/${contractId}/tranches/${tranche.id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId, paid }),
      })
      setInstallmentsList((prev) =>
        prev.map((inst) => (inst.id === installmentId ? { ...inst, status: paid ? 'PAID' : 'PENDING' } : inst))
      )
    } catch (err) {
      console.error('Erro ao atualizar parcela:', err)
    }
  }

  const startEditing = () => {
    setDraft(JSON.parse(JSON.stringify(tranche.scheduleSpec)))
    setEditing(true)
  }

  const handleSaveDraft = async () => {
    await runGenerate(draft)
    setEditing(false)
  }

  const updateDraftGrace = (field: 'principalMonths' | 'interestMonths' | 'capitalizeInterest', value: number | boolean) => {
    setDraft((prev) => ({
      ...prev,
      amortization: {
        ...prev.amortization,
        grace: {
          principalMonths: prev.amortization.grace?.principalMonths ?? 0,
          interestMonths: prev.amortization.grace?.interestMonths ?? 0,
          capitalizeInterest: prev.amortization.grace?.capitalizeInterest ?? false,
          [field]: value,
        },
      },
    }))
  }

  const spec = tranche.scheduleSpec
  const pct = Math.round(spec.confidence * 100)

  return (
    <div className="card mb-6 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>{tranche.label}</h2>
            <p className="text-sm figure" style={{ color: 'var(--color-ink-soft)' }}>{formatCurrency(tranche.totalPrincipal)}</p>
          </div>
          <div className="flex items-center gap-3">
            {!editing && (
              <button
                onClick={startEditing}
                className="text-xs"
                style={{ color: 'var(--color-moss-deep)' }}
              >
                ✎ Editar premissas
              </button>
            )}
            <div className="confidence-ring" style={{ '--pct': pct } as React.CSSProperties}>
              <div className="confidence-ring-core">{pct}%</div>
            </div>
          </div>
        </div>

        {spec.interpretationNotes && !editing && (
          <p className="text-sm mb-4 italic" style={{ color: 'var(--color-ink-soft)' }}>"{spec.interpretationNotes}"</p>
        )}

        {!editing ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>Sistema</p>
                <p className="font-medium">{AMORTIZATION_LABEL[spec.amortization.kind] || spec.amortization.kind}</p>
              </div>
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>Periodicidade</p>
                <p className="font-medium">{PERIODICITY_LABEL[spec.amortization.periodicity] || spec.amortization.periodicity}</p>
              </div>
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>Parcelas</p>
                <p className="font-medium figure">{spec.amortization.numberOfInstallments ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>Taxa</p>
                <p className="font-medium figure">
                  {spec.rate.kind === 'FIXED' && `${spec.rate.fixedAnnualPercent}% a.a. (fixa)`}
                  {spec.rate.kind === 'INDEXED' &&
                    `${spec.rate.index}${spec.rate.indexPercent ? ` ${spec.rate.indexPercent}%` : ''} + ${spec.rate.spreadAnnualPercent ?? 0}% a.a.`}
                  {spec.rate.kind === 'ZERO' && 'Sem juros'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>Carência</p>
                <p className="font-medium">
                  {spec.amortization.grace && spec.amortization.grace.principalMonths > 0
                    ? `${spec.amortization.grace.principalMonths} meses${spec.amortization.grace.capitalizeInterest ? ' (juros capitalizados)' : ''}`
                    : 'Nenhuma'}
                </p>
              </div>
            </div>

            {spec.assumptions?.length > 0 && (
              <div className="rounded-lg p-3 mb-2 space-y-1" style={{ background: 'var(--color-wheat-soft)' }}>
                {spec.assumptions.map((a, i) => (
                  <p key={i} className="text-xs" style={{ color: 'var(--color-wheat)' }}>
                    <strong>{a.topic}:</strong> {a.value} — <em>{a.reason}</em>
                  </p>
                ))}
              </div>
            )}
            {spec.openQuestions?.length > 0 && (
              <div className="rounded-lg p-3 space-y-1 mb-2" style={{ background: 'var(--color-clay-soft)' }}>
                {spec.openQuestions.map((q, i) => (
                  <p key={i} className="text-xs" style={{ color: 'var(--color-clay)' }}>
                    <strong>{q.topic}:</strong> {q.question}
                  </p>
                ))}
              </div>
            )}

            {error && <p className="text-xs mb-2" style={{ color: 'var(--color-clay)' }}>{error}</p>}

            <button onClick={() => runGenerate()} disabled={generating} className="btn-primary w-full">
              {generating ? 'Calculando...' : installmentsList.length > 0 ? 'Recalcular esta tranche' : 'Gerar cronograma desta tranche'}
            </button>
          </>
        ) : (
          <div className="rounded-lg p-4 mb-2" style={{ background: 'var(--color-canvas)', border: '1px solid var(--color-line)' }}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-ink-soft)' }}>
              Editando premissas — ajuste e recalcule. As parcelas atuais serão substituídas.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Sistema de amortização</label>
                <select
                  value={draft.amortization.kind}
                  onChange={(e) => setDraft((p) => ({ ...p, amortization: { ...p.amortization, kind: e.target.value } }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={inputStyle()}
                >
                  {AMORTIZATION_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Periodicidade</label>
                <select
                  value={draft.amortization.periodicity}
                  onChange={(e) => setDraft((p) => ({ ...p, amortization: { ...p.amortization, periodicity: e.target.value } }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={inputStyle()}
                >
                  {PERIODICITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Número de parcelas</label>
                <input
                  type="number"
                  value={draft.amortization.numberOfInstallments ?? ''}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      amortization: { ...p.amortization, numberOfInstallments: e.target.value ? Number(e.target.value) : null },
                    }))
                  }
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={inputStyle()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Tipo de taxa</label>
                <select
                  value={draft.rate.kind}
                  onChange={(e) => setDraft((p) => ({ ...p, rate: { ...p.rate, kind: e.target.value } }))}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={inputStyle()}
                >
                  {RATE_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {draft.rate.kind === 'FIXED' && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Taxa fixa (% a.a.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={draft.rate.fixedAnnualPercent ?? ''}
                    onChange={(e) => setDraft((p) => ({ ...p, rate: { ...p.rate, fixedAnnualPercent: e.target.value ? Number(e.target.value) : null } }))}
                    className="w-full border rounded px-3 py-2 text-sm"
                    style={inputStyle()}
                  />
                </div>
              )}

              {draft.rate.kind === 'INDEXED' && (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Índice</label>
                    <input
                      type="text"
                      value={draft.rate.index ?? ''}
                      onChange={(e) => setDraft((p) => ({ ...p, rate: { ...p.rate, index: e.target.value || null } }))}
                      className="w-full border rounded px-3 py-2 text-sm"
                      style={inputStyle()}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Spread (% a.a.)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={draft.rate.spreadAnnualPercent ?? ''}
                      onChange={(e) => setDraft((p) => ({ ...p, rate: { ...p.rate, spreadAnnualPercent: e.target.value ? Number(e.target.value) : null } }))}
                      className="w-full border rounded px-3 py-2 text-sm"
                      style={inputStyle()}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-ink-soft)' }}>Carência</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Meses de carência (principal)</label>
                  <input
                    type="number"
                    min={0}
                    value={draft.amortization.grace?.principalMonths ?? 0}
                    onChange={(e) => updateDraftGrace('principalMonths', Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 text-sm"
                    style={inputStyle()}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                    <input
                      type="checkbox"
                      checked={draft.amortization.grace?.capitalizeInterest ?? false}
                      onChange={(e) => updateDraftGrace('capitalizeInterest', e.target.checked)}
                    />
                    Capitalizar juros durante a carência
                  </label>
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--color-ink-soft)' }}>
                Zere "Meses de carência" pra remover uma carência assumida incorretamente pela IA.
              </p>
            </div>

            {error && <p className="text-xs mb-2" style={{ color: 'var(--color-clay)' }}>{error}</p>}

            <div className="flex gap-2">
              <button onClick={handleSaveDraft} disabled={generating} className="btn-primary flex-1">
                {generating ? 'Recalculando...' : 'Salvar e recalcular'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {!loading && installmentsList.length > 0 && (
        <div className="overflow-x-auto" style={{ borderTop: '1px solid var(--color-line)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-canvas)' }}>
              <tr className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Vencimento</th>
                <th className="text-left px-4 py-2">Amortização</th>
                <th className="text-left px-4 py-2">Juros</th>
                <th className="text-left px-4 py-2">Total</th>
                <th className="text-left px-4 py-2">Saldo</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {installmentsList.map((inst) => (
                <tr key={inst.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                  <td className="px-4 py-2 figure">{inst.installmentNumber}</td>
                  <td className="px-4 py-2 figure">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-2 figure">{formatCurrency(inst.principalAmount)}</td>
                  <td className="px-4 py-2 figure">{formatCurrency(inst.interestAmount)}</td>
                  <td className="px-4 py-2 figure font-medium">{formatCurrency(inst.totalAmount)}</td>
                  <td className="px-4 py-2 figure" style={{ color: 'var(--color-ink-soft)' }}>{formatCurrency(inst.remainingBalance)}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleTogglePaid(inst.id, inst.status)}
                      className={`badge ${inst.status === 'PAID' ? 'badge-moss' : 'badge-wheat'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title={inst.status === 'PAID' ? 'Clique para reverter' : 'Clique para marcar como pago'}
                    >
                      {inst.status === 'PAID' ? '✓ Pago' : 'Pendente'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function SchedulePage() {
  const params = useParams()
  const id = params?.id as string

  const [tranches, setTranches] = useState<Tranche[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const res = await fetch(`/api/contracts/${id}/tranches`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar tranches')
        setTranches(data.tranches ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSpecUpdated = (updated: Tranche) => {
    setTranches((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  const totalDebt = tranches.reduce((sum, t) => sum + t.totalPrincipal, 0)

  if (loading) return <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</p>

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/contracts/${id}`} className="text-sm" style={{ color: 'var(--color-moss-deep)' }}>← Voltar para o contrato</Link>

      <div className="mt-4 mb-2">
        <p className="page-eyebrow mb-1">Fluxo de pagamento</p>
        <h1 className="page-title">Cronograma</h1>
      </div>

      <ContractTabs contractId={id} />

      {tranches.length > 1 && (
        <span className="badge badge-neutral figure mb-6 block w-fit">{tranches.length} tranches • {formatCurrency(totalDebt)}</span>
      )}

      {error && (
        <div className="p-4 rounded-lg mb-4 text-sm" style={{ background: 'var(--color-clay-soft)', color: 'var(--color-clay)' }}>
          {error}
        </div>
      )}

      {tranches.length === 0 && !error && (
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            Este contrato não tem tranches cadastradas. Refaça o upload com a versão atual do sistema.
          </p>
        </div>
      )}

      {tranches.map((tranche) => (
        <TrancheCard key={tranche.id} contractId={id} tranche={tranche} onSpecUpdated={handleSpecUpdated} />
      ))}
    </div>
  )
}