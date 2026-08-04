'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function BillingSuccessInner() {
  useSearchParams() // mantém a rota reativa ao ?session_id=... vindo do Stripe
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null)

  useEffect(() => {
    // Pequeno atraso pra dar tempo do webhook do Stripe processar antes de conferir o saldo
    const timer = setTimeout(() => {
      fetch('/api/account/credits')
        .then((res) => res.json())
        .then((data) => {
          if (typeof data.balanceUsd === 'number') setBalanceUsd(data.balanceUsd)
        })
        .catch(() => {})
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="max-w-xl mx-auto text-center py-12">
      <h1 className="page-title mb-3">Pagamento confirmado 🎉</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--color-ink-soft)' }}>
        Seus créditos já devem estar disponíveis. Se o saldo abaixo ainda não refletir a compra, aguarde alguns minutos.
      </p>

      {balanceUsd !== null && (
        <div className="card p-4 mb-6 inline-block">
          <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Saldo atual</p>
          <p className="figure text-lg font-semibold">US$ {balanceUsd.toFixed(2)}</p>
        </div>
      )}

      <div>
        <Link href="/" className="btn-primary">Ir pro Dashboard</Link>
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<p className="text-sm">Carregando...</p>}>
      <BillingSuccessInner />
    </Suspense>
  )
}