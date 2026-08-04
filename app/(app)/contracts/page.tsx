'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ContractListItem {
  id: string
  status: string
  contractType: string | null
  createdAt: string
  companyName: string | null
  errorMessage: string | null
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  PROCESSING: { label: 'Processando', badge: 'badge-wheat' },
  PENDING_REVIEW: { label: 'Aguardando revisão', badge: 'badge-wheat' },
  ACTIVE: { label: 'Ativo', badge: 'badge-moss' },
  ARCHIVED: { label: 'Arquivado', badge: 'badge-neutral' },
  FAILED: { label: 'Falhou', badge: 'badge-clay' },
}

export default function ContractsListPage() {
  const [contracts, setContracts] = useState<ContractListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await fetch('/api/contracts')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao buscar contratos')
        setContracts(data.contracts)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    fetchContracts()
  }, [])

  const handleDelete = async (e: React.MouseEvent, id: string, companyName: string | null) => {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = window.confirm(
      `Apagar o contrato de "${companyName || 'empresa não identificada'}"? Essa ação não pode ser desfeita.`
    )
    if (!confirmed) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao apagar contrato')
      setContracts((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow mb-2">Carteira de dívida</p>
          <h1 className="page-title">Contratos</h1>
        </div>
        <Link href="/upload" className="btn-primary">+ Novo Upload</Link>
      </div>

      {loading && <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</p>}
      {error && (
        <div className="card p-4 mb-4">
          <p className="text-sm" style={{ color: 'var(--color-clay)' }}>{error}</p>
        </div>
      )}
      {!loading && contracts.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            Nenhum contrato por aqui ainda. Suba o primeiro PDF pra começar.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {contracts.map((c) => {
          const meta = STATUS_META[c.status] || { label: c.status, badge: 'badge-neutral' }
          const isDeleting = deletingId === c.id
          return (
            <div key={c.id} className="card p-4 flex items-center gap-3">
              <Link
                href={`/contracts/${c.id}`}
                className="flex-1 flex items-center justify-between hover:opacity-90 transition"
              >
                <div>
                  <p className="font-semibold">{c.companyName || 'Empresa não identificada'}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-ink-soft)' }}>
                    {c.contractType || 'Tipo não identificado'} • {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                  {c.status === 'FAILED' && c.errorMessage && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-clay)' }}>
                      ⚠ {c.errorMessage}
                    </p>
                  )}
                </div>
              </Link>
              <span className={`badge ${meta.badge} whitespace-nowrap`}>{meta.label}</span>
              <button
                onClick={(e) => handleDelete(e, c.id, c.companyName)}
                disabled={isDeleting}
                title="Apagar contrato"
                className="text-sm px-2"
                style={{ color: 'var(--color-clay)', opacity: isDeleting ? 0.5 : 1 }}
              >
                {isDeleting ? '...' : '🗑'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}