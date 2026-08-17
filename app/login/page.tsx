'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Logo from '@/components/Logo'

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseBrowserClient()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountName, setAccountName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(
    searchParams.get('error') === 'confirmation_failed'
      ? 'O link de confirmação é inválido ou expirou. Tente se cadastrar novamente.'
      : searchParams.get('error') === 'account_setup_failed'
      ? 'Seu e-mail foi confirmado, mas houve um erro ao configurar sua conta. Tente fazer login — se persistir, avise o suporte.'
      : ''
  )
  const [info, setInfo] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        router.push('/dashboard')
        router.refresh()
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (signUpError) throw signUpError

        if (!data.session) {
          // Confirmação de e-mail ativada: a conta só é criada quando o link for clicado
          setInfo('Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta e fazer login.')
          setLoading(false)
          return
        }

        // Confirmação desativada: sessão já vem pronta, cria a conta agora
        await fetch('/api/auth/setup-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountName }),
        })

        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center auth-backdrop overflow-hidden">
      <div className="card glass-card p-10 w-full max-w-md" style={{ borderRadius: '28px' }}>
        <Link href='/' className="flex items-center gap-3 mb-6">
          <Logo size={48} />
          <div>
            <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Raiz</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Gestão de Dívida</p>
          </div>
        </Link>

        <h1 className="text-2xl font-semibold mb-1">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-ink-soft)' }}>
          {mode === 'login' ? 'Acesse sua carteira de contratos.' : 'Comece a organizar a dívida da sua empresa.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>
                Nome da empresa / grupo
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="ex: Grupo Ampessan"
                className="w-full border rounded px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-line)' }}
              />
            </div>
          )}
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
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-soft)' }}>Senha</label>
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

          {mode === 'login' && (
            <Link href="/forgot-password" className="text-xs block text-right" style={{ color: 'var(--color-moss-deep)' }}>
              Esqueceu sua senha?
            </Link>
          )}

          {error && (
            <p className="text-xs p-2 rounded" style={{ background: 'var(--color-clay-soft)', color: 'var(--color-clay)' }}>
              {error}
            </p>
          )}
          {info && (
            <p className="text-xs p-2 rounded" style={{ background: 'var(--color-sprout)', color: 'var(--color-moss-deep)' }}>
              {info}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo('') }}
          className="text-xs mt-4 w-full text-center"
          style={{ color: 'var(--color-moss-deep)' }}
        >
          {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}