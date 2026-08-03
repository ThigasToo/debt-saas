'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface CompanyOption {
  id: string
  name: string
  documentType: string
  document: string | null
}

export default function UploadPage() {
  const [companiesList, setCompaniesList] = useState<CompanyOption[]>([])
  const [companyId, setCompanyId] = useState('')
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await fetch('/api/companies')
        const data = await res.json()
        if (res.ok) {
          setCompaniesList(data.companies ?? [])
          if (data.companies?.length > 0) setCompanyId(data.companies[0].id)
        }
      } finally {
        setLoadingCompanies(false)
      }
    }
    loadCompanies()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
      setError('')
    } else {
      setError('Selecione um arquivo em PDF.')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Falta o arquivo.')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (companyId) formData.append('companyId', companyId)

      const response = await fetch('/api/contracts/upload', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível processar o contrato.')

      setResult(data)
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <p className="page-eyebrow mb-2">Novo contrato</p>
      <h1 className="page-title mb-1">Suba um contrato, deixe a leitura com a gente</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-ink-soft)' }}>
        A IA identifica o tipo de dívida, extrai os dados relevantes e monta o cronograma de pagamento — você só confirma.
      </p>

      <div className="card p-6">
        <div className="mb-5">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>
            Vincular a qual empresa/pessoa do grupo?
          </label>
          {loadingCompanies ? (
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Carregando...</p>
          ) : companiesList.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
              Nenhuma empresa cadastrada ainda —{' '}
              <Link href="/companies" style={{ color: 'var(--color-moss-deep)' }}>cadastre uma primeiro</Link>,
              ou continue e uma será criada automaticamente.
            </p>
          ) : (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-line)' }}
            >
              {companiesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.document ? `(${c.documentType}: ${c.document})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <label htmlFor="file-input" className="dropzone block p-10 text-center cursor-pointer">
          <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="file-input" />
          {file ? (
            <div>
              <p className="font-semibold" style={{ color: 'var(--color-moss-deep)' }}>{file.name}</p>
              <p className="text-xs mt-1 figure" style={{ color: 'var(--color-ink-soft)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="font-medium mb-1" style={{ color: 'var(--color-moss-deep)' }}>
                Arraste o PDF ou clique para escolher
              </p>
              <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                CCB, CPR, FINAME, capital de giro e outras modalidades
              </p>
            </div>
          )}
        </label>

        {error && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{ background: 'var(--color-clay-soft)', color: 'var(--color-clay)' }}
          >
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--color-sprout)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-moss-deep)' }}>
              Contrato processado
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-ink-soft)' }}>
              {result.profile?.modality} • {result.fieldsExtracted} campos extraídos
            </p>
            {result.tranches?.length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-ink-soft)' }}>
                {result.tranches.length === 1
                  ? '1 linha de crédito identificada'
                  : `${result.tranches.length} linhas de crédito identificadas`}
              </p>
            )}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="btn-primary w-full mt-5"
        >
          {loading ? 'Lendo o contrato...' : 'Extrair dados com IA'}
        </button>
      </div>
    </div>
  )
}