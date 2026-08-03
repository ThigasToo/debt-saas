'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ContractTabs from '@/components/ContractTabs'

interface ExtractedField {
  id: string
  fieldName: string
  fieldLabel: string | null
  fieldGroup: string | null
  dataType: string | null
  fieldValue: string
  sourcePage: number | null
  sourceClause: string | null
  sourceExcerpt: string | null
  confidence: number | null
  origin: string | null
  status: string
}

interface ContractProfile {
  modality: string
  bank: string | null
  guaranteeTypes: string[]
  fieldGroups: string[]
}

interface ScheduleSpecSummary {
  assumptions: { topic: string; value: string; reason: string }[]
  openQuestions: { topic: string; question: string; sourcePage: number | null }[]
}

interface ContractDetail {
  id: string
  status: string
  contractType: string | null
  profile: ContractProfile | null
  scheduleSpec: ScheduleSpecSummary | null
  companyId: string
  companyName: string | null
  companyCnpj: string | null
}

interface CompanyOption {
  id: string
  name: string
}

const DATA_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'currency', label: 'Valor (R$)' },
  { value: 'date', label: 'Data' },
  { value: 'percent', label: 'Percentual' },
  { value: 'number', label: 'Número' },
  { value: 'list', label: 'Lista' },
]

export default function ContractReviewPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [fields, setFields] = useState<ExtractedField[]>([])
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({})
  const [companiesOptions, setCompaniesOptions] = useState<CompanyOption[]>([])
  const [reassigning, setReassigning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [openingPdf, setOpeningPdf] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const [newType, setNewType] = useState('text')
  const [newPage, setNewPage] = useState('')
  const [newClause, setNewClause] = useState('')
  const [addingField, setAddingField] = useState(false)

  const loadContract = async () => {
    const res = await fetch(`/api/contracts/${id}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar contrato')
    setContract(data.contract)
    setFields(data.fields)
    const originals: Record<string, string> = {}
    data.fields.forEach((f: ExtractedField) => {
      originals[f.id] = f.fieldValue
    })
    setOriginalValues(originals)
    return data
  }

  const loadCompanies = async () => {
    try {
      const res = await fetch('/api/companies')
      const data = await res.json()
      if (res.ok) setCompaniesOptions(data.companies ?? [])
    } catch (err) {
      console.error('Erro ao carregar empresas:', err)
    }
  }

  useEffect(() => {
    if (!id) return
    Promise.all([
      loadContract().then((data) => {
        const groups = data.contract?.profile?.fieldGroups ?? []
        if (groups.length > 0) setNewGroup(groups[0])
      }),
      loadCompanies(),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro desconhecido'))
      .finally(() => setLoading(false))
  }, [id])

  const handleReassign = async (newCompanyId: string) => {
    setReassigning(true)
    setError('')
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: newCompanyId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao reatribuir contrato')
      await loadContract()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setReassigning(false)
    }
  }

  const handleFieldChange = (fieldId: string, value: string) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, fieldValue: value } : f)))
  }

  const handleAddField = async () => {
    if (!newLabel.trim() || !newValue.trim()) {
      setError('Preencha rótulo e valor do novo campo')
      return
    }
    setAddingField(true)
    setError('')
    try {
      const res = await fetch(`/api/contracts/${id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldLabel: newLabel,
          fieldValue: newValue,
          fieldGroup: newGroup || 'Outros',
          dataType: newType,
          sourcePage: newPage || null,
          sourceClause: newClause || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao adicionar campo')

      await loadContract()
      setNewLabel('')
      setNewValue('')
      setNewPage('')
      setNewClause('')
      setShowAddForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setAddingField(false)
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    try {
      await fetch(`/api/contracts/${id}/fields`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId }),
      })
      setFields((prev) => prev.filter((f) => f.id !== fieldId))
    } catch (err) {
      console.error('Erro ao remover campo:', err)
    }
  }

  const handleOpenPdf = async () => {
  setOpeningPdf(true)
  setError('')
  try {
    const res = await fetch(`/api/contracts/${id}/document`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao abrir o PDF')
    window.open(data.url, '_blank')
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Erro ao abrir o PDF')
  } finally {
    setOpeningPdf(false)
  }
}

  const handleConfirm = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const changed = fields
        .filter((f) => f.fieldValue !== originalValues[f.id])
        .map((f) => ({ id: f.id, fieldValue: f.fieldValue }))

      const res = await fetch(`/api/contracts/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: changed, confirm: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao confirmar')

      setSuccess('Contrato confirmado com sucesso!')
      setTimeout(() => router.push('/contracts'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</p>

  if (!contract) {
    return (
      <div>
        <Link href="/contracts" className="text-sm" style={{ color: 'var(--color-moss-deep)' }}>← Voltar</Link>
        <p className="mt-4 text-sm" style={{ color: 'var(--color-clay)' }}>{error || 'Contrato não encontrado'}</p>
      </div>
    )
  }

  const grouped: Record<string, ExtractedField[]> = {}
  for (const f of fields) {
    const key = f.fieldGroup || 'Outros'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(f)
  }
  const profileGroups = contract.profile?.fieldGroups ?? []
  const extraGroups = Object.keys(grouped).filter((g) => !profileGroups.includes(g))
  const groupOrder = [...profileGroups, ...extraGroups]
  const spec = contract.scheduleSpec

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/contracts" className="text-sm" style={{ color: 'var(--color-moss-deep)' }}>← Voltar para contratos</Link>

      <div className="card p-6 mt-4 mb-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="page-eyebrow mb-1">{contract.companyCnpj}</p>
            <h1 className="page-title">{contract.companyName || 'Empresa não identificada'}</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--color-ink-soft)' }}>
              Status: <span className="figure">{contract.status}</span>
            </p>
          </div>
          {contract.profile && <span className="badge badge-moss whitespace-nowrap">{contract.profile.modality}</span>}
        </div>
        {contract.profile?.bank && (
          <p className="text-sm mt-3" style={{ color: 'var(--color-ink-soft)' }}>🏦 {contract.profile.bank}</p>
        )}
        {contract.profile?.guaranteeTypes?.length ? (
          <p className="text-sm mt-1" style={{ color: 'var(--color-ink-soft)' }}>
            🔒 Garantias: {contract.profile.guaranteeTypes.join(', ')}
          </p>
        ) : null}
      </div>

      {companiesOptions.length > 0 && (
        <div className="card p-4 mb-6">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>
            Empresa/pessoa vinculada
          </label>
          <select
            value={contract.companyId ?? ''}
            onChange={(e) => handleReassign(e.target.value)}
            disabled={reassigning}
            className="w-full border rounded px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-line)' }}
          >
            {companiesOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <button onClick={handleOpenPdf} disabled={openingPdf} className="btn-secondary mb-6">
        {openingPdf ? 'Abrindo...' : '📄 Ver PDF original'}
      </button>

      <ContractTabs contractId={id} />

      {error && (
        <div className="p-4 rounded-lg mb-4 text-sm" style={{ background: 'var(--color-clay-soft)', color: 'var(--color-clay)' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg mb-4 text-sm" style={{ background: 'var(--color-sprout)', color: 'var(--color-moss-deep)' }}>
          {success}
        </div>
      )}

      {spec && (spec.assumptions?.length > 0 || spec.openQuestions?.length > 0) && (
        <div className="card p-4 mb-6 space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-wheat)' }}>
            A IA precisou fazer suposições ao interpretar o cronograma
          </p>
          {spec.assumptions?.map((a, i) => (
            <p key={`a-${i}`} className="text-xs" style={{ color: 'var(--color-wheat)' }}>
              <strong>{a.topic}:</strong> {a.value} — <em>{a.reason}</em>
            </p>
          ))}
          {spec.openQuestions?.map((q, i) => (
            <p key={`q-${i}`} className="text-xs" style={{ color: 'var(--color-clay)' }}>
              <strong>{q.topic}:</strong> {q.question}
              {q.sourcePage && ` (página ${q.sourcePage})`}
            </p>
          ))}
        </div>
      )}

      <div className="mb-6">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-secondary w-full"
            style={{ borderStyle: 'dashed' }}
          >
            + Adicionar campo que a IA não capturou
          </button>
        ) : (
          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Novo campo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Rótulo *</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="ex: Taxa de juros - Recursos Livres"
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-line)' }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Valor *</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="ex: 16,36"
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-line)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Grupo</label>
                <input
                  type="text"
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  list="group-options"
                  placeholder="Grupo existente ou novo"
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-line)' }}
                />
                <datalist id="group-options">
                  {groupOrder.map((g) => <option key={g} value={g} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Tipo</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-line)' }}
                >
                  {DATA_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Página (opcional)</label>
                <input
                  type="number"
                  value={newPage}
                  onChange={(e) => setNewPage(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-line)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Cláusula (opcional)</label>
                <input
                  type="text"
                  value={newClause}
                  onChange={(e) => setNewClause(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-line)' }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAddField} disabled={addingField} className="btn-primary flex-1">
                {addingField ? 'Salvando...' : 'Salvar campo'}
              </button>
              <button onClick={() => setShowAddForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {groupOrder.filter((g) => grouped[g]?.length).map((groupName) => (
          <div key={groupName}>
            <h2 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-ink-soft)' }}>
              {groupName}
            </h2>
            <div className="space-y-3">
              {grouped[groupName].map((field) => (
                <div key={field.id} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold" style={{ color: 'var(--color-moss-deep)' }}>
                      {field.fieldLabel || field.fieldName}
                    </label>
                    <div className="flex items-center gap-2">
                      {field.origin === 'MANUAL' && <span className="badge badge-neutral">manual</span>}
                      {field.status === 'CORRECTED' && <span className="badge badge-wheat">editado</span>}
                      {field.confidence !== null && (
                        <span className="text-xs figure" style={{ color: 'var(--color-ink-soft)' }}>
                          {(field.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      {field.origin === 'MANUAL' && (
                        <button onClick={() => handleDeleteField(field.id)} className="text-xs" style={{ color: 'var(--color-clay)' }}>✕</button>
                      )}
                    </div>
                  </div>
                  <input
                    type="text"
                    value={field.fieldValue}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-line)' }}
                  />
                  {(field.sourcePage || field.sourceExcerpt) && (
                    <p className="text-xs mt-2" style={{ color: 'var(--color-ink-soft)' }}>
                      {field.sourcePage && `📄 Página ${field.sourcePage}`}
                      {field.sourceClause && ` • ${field.sourceClause}`}
                      {field.sourceExcerpt && <span className="italic block mt-1">"{field.sourceExcerpt}"</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {fields.length > 0 && (
        <button onClick={handleConfirm} disabled={saving} className="btn-primary w-full mt-6">
          {saving ? 'Confirmando...' : 'Confirmar Contrato'}
        </button>
      )}
    </div>
  )
}