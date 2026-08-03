'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

interface ConsolidatedInstallment {
  id: string
  installmentNumber: number
  dueDate: string
  principalAmount: number
  interestAmount: number
  totalAmount: number
  status: string
  contractId: string
  trancheId: string | null
  companyName: string | null
  contractType: string | null
  trancheLabel: string | null
}

interface Summary {
  totalPending: number
  totalOverdue: number
  totalNext30: number
  totalPaid: number
}

interface ContractRemaining {
  contractId: string
  companyName: string | null
  contractType: string | null
  trancheLabel: string | null
  remainingPrincipal: number
  remainingInterest: number
  remainingTotal: number
  pendingCount: number
  totalCount: number
  hasOverdue: boolean
}

interface YearGroup {
  year: number
  totalPrincipal: number
  totalInterest: number
  totalAmount: number
  months: { monthIndex: number; label: string; installments: ConsolidatedInstallment[] }[]
}

type FilterKey = 'all' | 'overdue' | 'next30' | 'paid'
type ViewKey = 'timeline' | 'pmt' | 'byContract'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function monthLabel(dateStr: string) {
  const d = new Date(dateStr)
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function computeSummary(list: ConsolidatedInstallment[], now: Date, in30Days: Date): Summary {
  let totalPending = 0
  let totalOverdue = 0
  let totalNext30 = 0
  let totalPaid = 0

  for (const inst of list) {
    const due = new Date(inst.dueDate)
    if (inst.status === 'PAID') {
      totalPaid += inst.totalAmount
      continue
    }
    totalPending += inst.totalAmount
    if (due < now) totalOverdue += inst.totalAmount
    else if (due <= in30Days) totalNext30 += inst.totalAmount
  }

  return { totalPending, totalOverdue, totalNext30, totalPaid }
}

export default function ConsolidatedSchedulePage() {
  const [installmentsList, setInstallmentsList] = useState<ConsolidatedInstallment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<ViewKey>('timeline')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set())

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/schedule/consolidated')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar cronograma')
        setInstallmentsList(data.installments ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const now = useMemo(() => new Date(), [])
  const in30Days = useMemo(() => new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), [now])
  const summary = useMemo(() => computeSummary(installmentsList, now, in30Days), [installmentsList, now, in30Days])

  const handleTogglePaid = async (inst: ConsolidatedInstallment) => {
    if (!inst.trancheId) {
      setError('Essa parcela é de um contrato antigo (sem tranche associada) e não pode ser alterada por aqui.')
      return
    }
    const paid = inst.status !== 'PAID'
    setTogglingId(inst.id)
    try {
      const res = await fetch(`/api/contracts/${inst.contractId}/tranches/${inst.trancheId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId: inst.id, paid }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar parcela')
      setInstallmentsList((prev) =>
        prev.map((i) => (i.id === inst.id ? { ...i, status: paid ? 'PAID' : 'PENDING' } : i))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = useMemo(() => {
    return installmentsList.filter((inst) => {
      const due = new Date(inst.dueDate)
      switch (filter) {
        case 'overdue':
          return inst.status !== 'PAID' && due < now
        case 'next30':
          return inst.status !== 'PAID' && due >= now && due <= in30Days
        case 'paid':
          return inst.status === 'PAID'
        default:
          return true
      }
    })
  }, [installmentsList, filter, now, in30Days])

  const grouped = useMemo(() => {
    const groups: Record<string, ConsolidatedInstallment[]> = {}
    for (const inst of filtered) {
      const key = monthLabel(inst.dueDate)
      if (!groups[key]) groups[key] = []
      groups[key].push(inst)
    }
    return groups
  }, [filtered])

  const byContract = useMemo(() => {
    const map: Record<string, ContractRemaining> = {}

    for (const inst of installmentsList) {
      const key = `${inst.contractId}::${inst.trancheId ?? 'sem-tranche'}`
      if (!map[key]) {
        map[key] = {
          contractId: inst.contractId,
          companyName: inst.companyName,
          contractType: inst.contractType,
          trancheLabel: inst.trancheLabel,
          remainingPrincipal: 0,
          remainingInterest: 0,
          remainingTotal: 0,
          pendingCount: 0,
          totalCount: 0,
          hasOverdue: false,
        }
      }
      const row = map[key]
      row.totalCount += 1
      if (inst.status !== 'PAID') {
        row.remainingPrincipal += inst.principalAmount
        row.remainingInterest += inst.interestAmount
        row.remainingTotal += inst.totalAmount
        row.pendingCount += 1
        if (new Date(inst.dueDate) < now) row.hasOverdue = true
      }
    }

    return Object.values(map).sort((a, b) => b.remainingTotal - a.remainingTotal)
  }, [installmentsList, now])

  // Agrupamento PMT: ano -> mês -> parcelas daquele mês. Anos ordenados
  // cronologicamente, meses só aparecem se tiverem alguma parcela.
  const byYear = useMemo(() => {
    const yearsMap: Record<number, Record<number, ConsolidatedInstallment[]>> = {}

    for (const inst of installmentsList) {
      const due = new Date(inst.dueDate)
      const year = due.getFullYear()
      const month = due.getMonth()
      if (!yearsMap[year]) yearsMap[year] = {}
      if (!yearsMap[year][month]) yearsMap[year][month] = []
      yearsMap[year][month].push(inst)
    }

    const years: YearGroup[] = Object.entries(yearsMap)
      .map(([yearStr, monthsMap]) => {
        const year = Number(yearStr)
        let totalPrincipal = 0
        let totalInterest = 0
        let totalAmount = 0

        const months = Object.entries(monthsMap)
          .map(([monthStr, insts]) => {
            const monthIndex = Number(monthStr)
            insts.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            for (const inst of insts) {
              totalPrincipal += inst.principalAmount
              totalInterest += inst.interestAmount
              totalAmount += inst.totalAmount
            }
            return { monthIndex, label: MONTH_NAMES[monthIndex], installments: insts }
          })
          .sort((a, b) => a.monthIndex - b.monthIndex)

        return { year, totalPrincipal, totalInterest, totalAmount, months }
      })
      .sort((a, b) => a.year - b.year)

    return years
  }, [installmentsList])

  const toggleYear = (year: number) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  if (loading) return <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando cronograma...</p>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="page-eyebrow mb-1">Todos os contratos</p>
        <h1 className="page-title">Cronograma Consolidado</h1>
      </div>

      {error && (
        <div className="p-4 rounded-lg mb-4 text-sm" style={{ background: 'var(--color-clay-soft)', color: 'var(--color-clay)' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>Em aberto</p>
          <p className="text-lg font-bold figure">{formatCurrency(summary.totalPending)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--color-clay)' }}>Atrasado</p>
          <p className="text-lg font-bold figure" style={{ color: 'var(--color-clay)' }}>{formatCurrency(summary.totalOverdue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--color-wheat)' }}>Próximos 30 dias</p>
          <p className="text-lg font-bold figure" style={{ color: 'var(--color-wheat)' }}>{formatCurrency(summary.totalNext30)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--color-moss-deep)' }}>Já pago</p>
          <p className="text-lg font-bold figure" style={{ color: 'var(--color-moss-deep)' }}>{formatCurrency(summary.totalPaid)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setView('timeline')}
          className={`badge ${view === 'timeline' ? 'badge-moss' : 'badge-neutral'}`}
          style={{ cursor: 'pointer', border: 'none' }}
        >
          Linha do tempo
        </button>
        <button
          onClick={() => setView('pmt')}
          className={`badge ${view === 'pmt' ? 'badge-moss' : 'badge-neutral'}`}
          style={{ cursor: 'pointer', border: 'none' }}
        >
          PMT
        </button>
        <button
          onClick={() => setView('byContract')}
          className={`badge ${view === 'byContract' ? 'badge-moss' : 'badge-neutral'}`}
          style={{ cursor: 'pointer', border: 'none' }}
        >
          Por Contrato
        </button>
      </div>

      {view === 'timeline' && (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {(
              [
                ['all', 'Todas'],
                ['overdue', 'Atrasadas'],
                ['next30', 'Próximos 30 dias'],
                ['paid', 'Pagas'],
              ] as [FilterKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`badge ${filter === key ? 'badge-moss' : 'badge-neutral'}`}
                style={{ cursor: 'pointer', border: 'none' }}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                {installmentsList.length === 0
                  ? 'Nenhuma parcela gerada ainda. Vá em um contrato e gere o cronograma das tranches.'
                  : 'Nenhuma parcela nesse filtro.'}
              </p>
            </div>
          ) : (
            Object.entries(grouped).map(([month, insts]) => (
              <div key={month} className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink-soft)' }}>
                  {month}
                </h2>
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead style={{ background: 'var(--color-canvas)' }}>
                      <tr className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>
                        <th className="text-left px-4 py-2">Vencimento</th>
                        <th className="text-left px-4 py-2">Empresa</th>
                        <th className="text-left px-4 py-2">Contrato / Tranche</th>
                        <th className="text-left px-4 py-2">Valor</th>
                        <th className="text-left px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insts.map((inst) => {
                        const isOverdue = inst.status !== 'PAID' && new Date(inst.dueDate) < now
                        const isToggling = togglingId === inst.id
                        return (
                          <tr key={inst.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                            <td className="px-4 py-2 figure">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-2">
                              <Link href={`/contracts/${inst.contractId}/schedule`} style={{ color: 'var(--color-moss-deep)' }}>
                                {inst.companyName || '—'}
                              </Link>
                            </td>
                            <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                              {inst.contractType || '—'}{inst.trancheLabel ? ` • ${inst.trancheLabel}` : ''}
                            </td>
                            <td className="px-4 py-2 figure font-medium">{formatCurrency(inst.totalAmount)}</td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => handleTogglePaid(inst)}
                                disabled={isToggling}
                                className={`badge ${inst.status === 'PAID' ? 'badge-moss' : isOverdue ? 'badge-clay' : 'badge-wheat'}`}
                                style={{ cursor: 'pointer', border: 'none', opacity: isToggling ? 0.5 : 1 }}
                                title={inst.status === 'PAID' ? 'Clique para reverter' : 'Clique para marcar como pago'}
                              >
                                {isToggling ? '...' : inst.status === 'PAID' ? '✓ Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {view === 'pmt' && (
        <>
          {byYear.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                Nenhuma parcela gerada ainda.
              </p>
            </div>
          ) : (
            byYear.map((yg) => {
              const isCollapsed = collapsedYears.has(yg.year)
              return (
                <div key={yg.year} className="card mb-4 overflow-hidden">
                  <button
                    onClick={() => toggleYear(yg.year)}
                    className="w-full p-4 flex items-center justify-between"
                    style={{ cursor: 'pointer', background: 'var(--color-canvas)', border: 'none', textAlign: 'left' }}
                  >
                    <div className="flex items-center gap-3">
                      <span aria-hidden style={{ color: 'var(--color-ink-soft)' }}>{isCollapsed ? '▸' : '▾'}</span>
                      <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>{yg.year}</h2>
                    </div>
                    <div className="flex gap-4 text-xs figure" style={{ color: 'var(--color-ink-soft)' }}>
                      <span>Amortização: <strong>{formatCurrency(yg.totalPrincipal)}</strong></span>
                      <span>Juros: <strong>{formatCurrency(yg.totalInterest)}</strong></span>
                      <span style={{ color: 'var(--color-ink)' }}>Total: <strong>{formatCurrency(yg.totalAmount)}</strong></span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div style={{ borderTop: '1px solid var(--color-line)' }}>
                      {yg.months.map((mg) => (
                        <div key={mg.monthIndex} style={{ borderBottom: '1px solid var(--color-line)' }}>
                          <p className="text-xs font-semibold uppercase tracking-wide px-4 pt-3 pb-1" style={{ color: 'var(--color-moss-deep)' }}>
                            {mg.label}
                          </p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>
                                <th className="text-left px-4 py-1">Vencimento</th>
                                <th className="text-left px-4 py-1">Empresa</th>
                                <th className="text-left px-4 py-1">Contrato / Tranche</th>
                                <th className="text-left px-4 py-1">Amortização</th>
                                <th className="text-left px-4 py-1">Juros</th>
                                <th className="text-left px-4 py-1">Total</th>
                                <th className="text-left px-4 py-1">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mg.installments.map((inst) => {
                                const isOverdue = inst.status !== 'PAID' && new Date(inst.dueDate) < now
                                const isToggling = togglingId === inst.id
                                return (
                                  <tr key={inst.id}>
                                    <td className="px-4 py-1 figure">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-1">
                                      <Link href={`/contracts/${inst.contractId}/schedule`} style={{ color: 'var(--color-moss-deep)' }}>
                                        {inst.companyName || '—'}
                                      </Link>
                                    </td>
                                    <td className="px-4 py-1 text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                                      {inst.contractType || '—'}{inst.trancheLabel ? ` • ${inst.trancheLabel}` : ''}
                                    </td>
                                    <td className="px-4 py-1 figure">{formatCurrency(inst.principalAmount)}</td>
                                    <td className="px-4 py-1 figure">{formatCurrency(inst.interestAmount)}</td>
                                    <td className="px-4 py-1 figure font-medium">{formatCurrency(inst.totalAmount)}</td>
                                    <td className="px-4 py-1">
                                      <button
                                        onClick={() => handleTogglePaid(inst)}
                                        disabled={isToggling}
                                        className={`badge ${inst.status === 'PAID' ? 'badge-moss' : isOverdue ? 'badge-clay' : 'badge-wheat'}`}
                                        style={{ cursor: 'pointer', border: 'none', opacity: isToggling ? 0.5 : 1 }}
                                        title={inst.status === 'PAID' ? 'Clique para reverter' : 'Clique para marcar como pago'}
                                      >
                                        {isToggling ? '...' : inst.status === 'PAID' ? '✓ Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </>
      )}

      {view === 'byContract' && (
        <>
          {byContract.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                Nenhuma parcela gerada ainda.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--color-canvas)' }}>
                  <tr className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>
                    <th className="text-left px-4 py-2">Empresa</th>
                    <th className="text-left px-4 py-2">Contrato / Tranche</th>
                    <th className="text-left px-4 py-2">Saldo devedor</th>
                    <th className="text-left px-4 py-2">Juros restantes</th>
                    <th className="text-left px-4 py-2">Total restante</th>
                    <th className="text-left px-4 py-2">Parcelas</th>
                  </tr>
                </thead>
                <tbody>
                  {byContract.map((row) => (
                    <tr key={`${row.contractId}-${row.trancheLabel}`} style={{ borderTop: '1px solid var(--color-line)' }}>
                      <td className="px-4 py-2">
                        <Link href={`/contracts/${row.contractId}/schedule`} style={{ color: 'var(--color-moss-deep)' }}>
                          {row.companyName || '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                        {row.contractType || '—'}{row.trancheLabel ? ` • ${row.trancheLabel}` : ''}
                      </td>
                      <td className="px-4 py-2 figure">{formatCurrency(row.remainingPrincipal)}</td>
                      <td className="px-4 py-2 figure">{formatCurrency(row.remainingInterest)}</td>
                      <td className="px-4 py-2 figure font-medium">{formatCurrency(row.remainingTotal)}</td>
                      <td className="px-4 py-2">
                        <span className={`badge ${row.hasOverdue ? 'badge-clay' : row.pendingCount === 0 ? 'badge-moss' : 'badge-neutral'} figure`}>
                          {row.pendingCount === 0 ? 'quitado' : `${row.pendingCount}/${row.totalCount} pendentes`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}