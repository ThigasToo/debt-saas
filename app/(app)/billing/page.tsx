'use client'

import { useEffect, useState } from 'react'

interface QuotePackage {
  id: string
  label: string
  priceBrlCents: number
  creditsUsd: number
}

interface QuoteResponse {
  rate: number
  source: 'bcb' | 'fallback'
  packages: QuotePackage[]
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function BillingPage() {
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null)
  const [quote, setQuote] = useState<QuoteResponse | null>(null)
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/account/credits')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.balanceUsd === 'number') setBalanceUsd(data.balanceUsd)
      })
      .catch(() => {})

    fetch('/api/billing/quote')
      .then((res) => res.json())
      .then((data) => setQuote(data))
      .catch(() => setError('Não foi possível carregar os preços agora. Tenta recarregar a página.'))
  }, [])

  const handleBuy = async (packageId: string) => {
    setLoadingPackageId(packageId)
    setError('')
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao iniciar pagamento')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setLoadingPackageId(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <p className="page-eyebrow mb-1">Créditos de IA</p>
      <h1 className="page-title mb-6">Comprar créditos</h1>

      {balanceUsd !== null && (
        <div className="card p-4 mb-4">
          <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Saldo atual</p>
          <p className="figure text-lg font-semibold">US$ {balanceUsd.toFixed(2)}</p>
        </div>
      )}

      {quote && (
        <p className="text-xs mb-6" style={{ color: 'var(--color-ink-soft)' }}>
          Cotação do dólar usada agora: <span className="figure">R$ {quote.rate.toFixed(4)}</span>
          {quote.source === 'bcb'
            ? ' (PTAX oficial do Banco Central, atualizada a cada hora).'
            : ' (cotação de reserva — Banco Central indisponível no momento).'}{' '}
          O valor em crédito de cada pacote já desconta taxa de processamento de pagamento — sem cobrança extra além do preço mostrado.
        </p>
      )}

      {error && <p className="text-sm mb-4" style={{ color: 'var(--color-clay)' }}>{error}</p>}

      <div className="space-y-4">
        {(quote?.packages ?? []).map((pkg) => (
          <div key={pkg.id} className="card p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold">{pkg.label}</p>
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                {formatBRL(pkg.priceBrlCents)} → <span className="figure">US$ {pkg.creditsUsd.toFixed(2)}</span> de crédito de IA
              </p>
            </div>
            <button
              onClick={() => handleBuy(pkg.id)}
              disabled={loadingPackageId !== null}
              className="btn-primary"
            >
              {loadingPackageId === pkg.id ? 'Redirecionando...' : 'Comprar'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs mt-6" style={{ color: 'var(--color-ink-soft)' }}>
        Pagamento processado pelo Stripe. Você será redirecionado pra uma página segura do Stripe pra concluir a compra.
      </p>
    </div>
  )
}