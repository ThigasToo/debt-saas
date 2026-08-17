'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import Link from 'next/link'

function ConfirmResetInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const handleConfirm = async () => {
    if (!tokenHash || type !== 'recovery') {
      setError('Link inválido.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      })
      if (verifyError) throw verifyError
      router.push('/reset-password')
    } catch (err) {
      setError('Este link expirou ou já foi usado. Solicite um novo link de recuperação.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-canvas)' }}>
      <div className="card p-8 w-full max-w-sm text-center">
        <Link href="/" className="flex items-center gap-3 mb-6">
          <Logo size={40} />
          <div>
            <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Raiz</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Gestão de Dívida</p>
          </div>
        </Link>

        <h1 className="text-lg font-semibold mb-2">Redefinir senha</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-ink-soft)' }}>
          Clique no botão abaixo para confirmar e escolher uma nova senha.
        </p>

        {error && (
          <p className="text-xs p-2 rounded mb-4" style={{ background: 'var(--color-clay-soft)', color: 'var(--color-clay)' }}>
            {error}
          </p>
        )}

        <button onClick={handleConfirm} disabled={loading} className="btn-primary w-full">
          {loading ? 'Confirmando...' : 'Confirmar e continuar'}
        </button>
      </div>
    </div>
  )
}

export default function ConfirmResetPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmResetInner />
    </Suspense>
  )
}