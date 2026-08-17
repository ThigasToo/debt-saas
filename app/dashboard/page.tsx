'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ContractRow {
  id: string
  companyName: string | null
  createdAt: string
  credor: string
  devedor: string
  valor_original: string
  vencimento_final: string
  indexador: string
  spread_ou_taxa: string
  avalistas: string
}

interface AvalistaExposure {
  name: string
  contractCount: number
  companies: string[]
}

interface DashboardData {
  totalContracts: number
  statusCounts: Record<string, number>
  contracts: ContractRow[]
  avalistas: AvalistaExposure[]
}

const STATUS_LABEL: Record<string, string> = {
  PROCESSING: 'Processando',
  PENDING_REVIEW: 'Aguardando revisão',
  ACTIVE: 'Ativos',
  ARCHIVED: 'Arquivados',
  FAILED: 'Falharam',
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Erro ao carregar dashboard')
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando dashboard...</p>

  if (error || !data) {
    return <p className="text-sm" style={{ color: 'var(--color-clay)' }}>{error || 'Erro ao carregar'}</p>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow mb-1">Visão consolidada</p>
          <h1 className="page-title">Dashboard da Dívida</h1>
        </div>
        <div className="flex gap-2">
          <a href="/api/reports/portfolio" className="btn-secondary">⬇ Exportar Base de Dados</a>
          <Link href="/upload" className="btn-secondary">+ Novo Upload</Link>
          <Link href="/contracts" className="btn-primary">Ver Contratos</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="card glass-card p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>Total</p>
          <p className="text-2xl font-bold figure">{data.totalContracts}</p>
        </div>
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <div key={key} className="card glass-card p-4">
            <p className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>{label}</p>
            <p className="text-2xl font-bold figure">{data.statusCounts[key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="card glass-card mb-8 overflow-x-auto">
        <div className="p-4" style={{ borderBottom: '1px solid var(--color-line)' }}>
          <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Contratos Ativos</h2>
        </div>
        {data.contracts.length === 0 ? (
          <p className="p-4 text-sm" style={{ color: 'var(--color-ink-soft)' }}>Nenhum contrato ativo ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--color-canvas)' }}>
              <tr className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>
                <th className="text-left px-4 py-2">Empresa</th>
                <th className="text-left px-4 py-2">Credor</th>
                <th className="text-left px-4 py-2">Valor</th>
                <th className="text-left px-4 py-2">Indexador</th>
                <th className="text-left px-4 py-2">Taxa</th>
                <th className="text-left px-4 py-2">Vencimento</th>
              </tr>
            </thead>
            <tbody>
              {data.contracts.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid var(--color-line)' }}>
                  <td className="px-4 py-2">
                    <Link href={`/contracts/${c.id}`} style={{ color: 'var(--color-moss-deep)' }}>{c.companyName || '—'}</Link>
                  </td>
                  <td className="px-4 py-2">{c.credor}</td>
                  <td className="px-4 py-2 figure">{c.valor_original}</td>
                  <td className="px-4 py-2">{c.indexador}</td>
                  <td className="px-4 py-2 figure">{c.spread_ou_taxa}</td>
                  <td className="px-4 py-2 figure">{c.vencimento_final}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card glass-card overflow-hidden">
        <div className="p-4" style={{ borderBottom: '1px solid var(--color-line)' }}>
          <h2 className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Exposição por Avalista</h2>
        </div>
        {data.avalistas.length === 0 ? (
          <p className="p-4 text-sm" style={{ color: 'var(--color-ink-soft)' }}>Nenhum avalista identificado ainda.</p>
        ) : (
          <div>
            {data.avalistas.map((a, i) => (
              <div
                key={a.name}
                className="p-4 flex items-center justify-between"
                style={{ borderTop: i > 0 ? '1px solid var(--color-line)' : 'none' }}
              >
                <div>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{a.companies.join(', ')}</p>
                </div>
                <span className="badge badge-moss">{a.contractCount} contrato{a.contractCount > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}