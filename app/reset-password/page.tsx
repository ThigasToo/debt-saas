'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-backdrop">
      <div className="card glass-card p-10 w-full max-w-md" style={{ borderRadius: '28px' }}>
        <Link href="/" className="flex items-center gap-3 mb-6">
          <Logo size={48} />
          <div>
            <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Raiz</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Gestão de Dívida</p>
          </div>
        </Link>

        <h1 className="text-2xl font-semibold mb-1">Nova senha</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-ink-soft)' }}>
          Defina uma nova senha pra sua conta.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Nova senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-line)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Confirmar nova senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  )
}