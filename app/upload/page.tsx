'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PDFDocument } from 'pdf-lib'
import { tokensToMicros, microsToUsd } from '@/lib/billing/aiCredits'

interface CompanyOption {
  id: string
  name: string
  documentType: string
  document: string | null
}

// Estimativa grosseira — ajuste conforme formos vendo custo real x nº de páginas
// na tabela ai_usage_events depois de mais contratos processados.
const LARGE_CONTRACT_PAGE_THRESHOLD = 20
const AVG_TOKENS_PER_PAGE = 1500
const AVG_API_CALLS_PER_CONTRACT = 3 // 1 chamada de perfil/tranches + ~2 lotes de campos, em média
const AVG_OUTPUT_TOKENS_PER_CALL = 1000

function estimateCostUsd(pageCount: number): number {
  const inputTokens = pageCount * AVG_TOKENS_PER_PAGE * AVG_API_CALLS_PER_CONTRACT
  const outputTokens = AVG_OUTPUT_TOKENS_PER_CALL * AVG_API_CALLS_PER_CONTRACT
  return microsToUsd(tokensToMicros(inputTokens, outputTokens))
}

export default function UploadPage() {
  const [companiesList, setCompaniesList] = useState<CompanyOption[]>([])
  const [companyId, setCompanyId] = useState('')
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const [pageCount, setPageCount] = useState<number | null>(null)
  const [confirmedLargeFile, setConfirmedLargeFile] = useState(false)

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setPageCount(null)
    setConfirmedLargeFile(false)

    if (!selectedFile || selectedFile.type !== 'application/pdf') {
      setError('Selecione um arquivo em PDF.')
      return
    }
    setFile(selectedFile)
    setError('')

    // Conta páginas no navegador — se falhar (PDF protegido, corrompido), não bloqueia
    // o upload, só deixa de mostrar o aviso. A validação real continua no servidor.
    try {
      const bytes = await selectedFile.arrayBuffer()
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
      setPageCount(pdf.getPageCount())
    } catch {
      setPageCount(null)
    }
  }

  const isLargeFile = pageCount !== null && pageCount > LARGE_CONTRACT_PAGE_THRESHOLD
  const needsConfirmation = isLargeFile && !confirmedLargeFile

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
      setPageCount(null)
      setConfirmedLargeFile(false)
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
                {(file.size / 1024 / 1024).toFixed(2)} MB{pageCount !== null ? ` • ${pageCount} página${pageCount === 1 ? '' : 's'}` : ''}
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

        {isLargeFile && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: 'var(--color-wheat-soft)', color: 'var(--color-ink)' }}>
            <p className="font-semibold mb-1">Contrato grande ({pageCount} páginas)</p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-ink-soft)' }}>
              Custo estimado de IA: <span className="figure">~US$ {estimateCostUsd(pageCount!).toFixed(2)}</span> em créditos
              (estimativa aproximada — o valor real depende da complexidade do contrato).
            </p>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={confirmedLargeFile} onChange={(e) => setConfirmedLargeFile(e.target.checked)} />
              Entendi, continuar mesmo assim
            </label>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: 'var(--color-clay-soft)', color: 'var(--color-clay)' }}>
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--color-sprout)' }}>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-moss-deep)' }}>Contrato processado</p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-ink-soft)' }}>
              {result.profile?.modality} • {result.fieldsExtracted} campos extraídos
            </p>
            {result.tranches?.length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-ink-soft)' }}>
                {result.tranches.length === 1 ? '1 linha de crédito identificada' : `${result.tranches.length} linhas de crédito identificadas`}
              </p>
            )}
          </div>
        )}

        <button onClick={handleUpload} disabled={!file || loading || needsConfirmation} className="btn-primary w-full mt-5">
          {loading ? 'Lendo o contrato...' : 'Extrair dados com IA'}
        </button>
      </div>
    </div>
  )
}