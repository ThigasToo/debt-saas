'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

export default function ForgotPasswordPage() {
  const supabase = createSupabaseBrowserClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar o link de recuperação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-backdrop">
      <div className="card glass-card p-10 w-full max-w-md" style={{ borderRadius: '28px' }}>
        <div className="flex items-center gap-3 mb-6">
          <Logo size={48} />
          <div>
            <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Raiz</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Gestão de Dívida</p>
          </div>
        </div>

        {sent ? (
          <>
            <h1 className="text-2xl font-semibold mb-1">Verifique seu e-mail</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--color-ink-soft)' }}>
              Se existir uma conta com o e-mail <strong>{email}</strong>, enviamos um link pra redefinir a senha.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-1">Esqueceu sua senha?</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--color-ink-soft)' }}>
              Digite seu e-mail e mandamos um link pra você redefinir a senha.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-line)' }}
                />
              </div>

              {error && (
                <p className="text-xs p-2 rounded" style={{ background: 'var(--color-clay-soft)', color: 'var(--color-clay)' }}>
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          </>
        )}

        <Link href="/login" className="text-xs mt-4 w-full text-center block" style={{ color: 'var(--color-moss-deep)' }}>
          ← Voltar pro login
        </Link>
      </div>
    </div>
  )
}