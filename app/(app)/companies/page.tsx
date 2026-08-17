'use client'

import { useEffect, useState } from 'react'

interface CompanyRow {
  id: string
  name: string
  documentType: string
  document: string | null
  contractCount: number
}

function formatDocument(doc: string | null, type: string): string {
  if (!doc) return `${type} não informado`
  return doc
}

export default function CompaniesPage() {
  const [companiesList, setCompaniesList] = useState<CompanyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [documentType, setDocumentType] = useState<'CNPJ' | 'CPF'>('CNPJ')
  const [document, setDocument] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const res = await fetch('/api/companies')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar empresas')
      setCompaniesList(data.companies ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setName('')
    setDocumentType('CNPJ')
    setDocument('')
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (c: CompanyRow) => {
    setEditingId(c.id)
    setName(c.name)
    setDocumentType(c.documentType === 'CPF' ? 'CPF' : 'CNPJ')
    setDocument(c.document ?? '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }
    setSaving(true)
    setError('')
    try {
      const url = editingId ? `/api/companies/${editingId}` : '/api/companies'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, documentType, document: document || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      await load()
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Apagar "${name}" do grupo? Só funciona se não houver contratos vinculados a ela.`)) return
    setDeletingId(id)
    setError('')
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao apagar')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="page-eyebrow mb-2">Grupo econômico</p>
          <h1 className="page-title">Empresas e Pessoas</h1>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Adicionar</button>
        )}
      </div>

      <p className="text-sm mb-6" style={{ color: 'var(--color-ink-soft)' }}>
        Cadastre aqui todos os CNPJs e CPFs do grupo (empresas, produtores rurais, avalistas com contrato próprio).
        Contratos podem ser vinculados a qualquer uma dessas entidades.
      </p>

      {error && (
        <div className="p-4 rounded-lg mb-4 text-sm" style={{ background: 'var(--color-clay-soft)', color: 'var(--color-clay)' }}>
          {error}
        </div>
      )}

      {showForm && (
        <div className="card glass-card p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3">{editingId ? 'Editar' : 'Nova'} empresa/pessoa</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Nome *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Fazenda Bolívia LTDA, ou Albino Agenor Ampessan"
                className="w-full border rounded px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-line)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Tipo</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as 'CNPJ' | 'CPF')}
                className="w-full border rounded px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-line)' }}
              >
                <option value="CNPJ">CNPJ (empresa)</option>
                <option value="CPF">CPF (pessoa física)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>{documentType}</label>
              <input
                type="text"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder={documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                className="w-full border rounded px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-line)' }}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={resetForm} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</p>
      ) : companiesList.length === 0 ? (
        <div className="card glass-cardp-10 text-center">
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            Nenhuma empresa ou pessoa cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {companiesList.map((c) => (
            <div key={c.id} className="card glass-card p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs mt-1 figure" style={{ color: 'var(--color-ink-soft)' }}>
                  {c.documentType}: {formatDocument(c.document, c.documentType)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="badge badge-neutral figure">
                  {c.contractCount} contrato{c.contractCount !== 1 ? 's' : ''}
                </span>
                <button onClick={() => startEdit(c)} className="text-xs" style={{ color: 'var(--color-moss-deep)' }}>✎ Editar</button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  disabled={deletingId === c.id}
                  className="text-xs"
                  style={{ color: 'var(--color-clay)', opacity: deletingId === c.id ? 0.5 : 1 }}
                >
                  {deletingId === c.id ? '...' : '🗑 Excluir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}