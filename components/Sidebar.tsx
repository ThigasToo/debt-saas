'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import Logo from './Logo'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '◧' },
  { href: '/contracts', label: 'Contratos', icon: '▤' },
  { href: '/schedule', label: 'Cronograma', icon: '▦' },
  { href: '/companies', label: 'Empresas', icon: '🏢' },
  { href: '/upload', label: 'Novo Upload', icon: '↑' },
]

const NO_SIDEBAR_PREFIXES = ['/login', '/forgot-password', '/reset-password']

function hideSidebar(pathname: string | null): boolean {
  if (!pathname) return false
  return pathname === '/' || NO_SIDEBAR_PREFIXES.some((p) => pathname.startsWith(p))
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [balanceUsd, setBalanceUsd] = useState<number | null>(null)

  useEffect(() => {
    if (hideSidebar(pathname)) return
    fetch('/api/account/credits')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.balanceUsd === 'number') setBalanceUsd(data.balanceUsd)
      })
      .catch(() => {})
  }, [pathname])

  if (hideSidebar(pathname)) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isLow = balanceUsd !== null && balanceUsd < 0.1

  return (
    <aside className="sidebar glass-panel sidebar-glass">
      <Link href="/dashboard" className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Logo size={38} />
        <span className="sidebar-brand-label">
          Raiz
          <span>Gestão de Dívida</span>
        </span>
      </Link>

      <nav className="sidebar-nav" style={{ marginTop: '1.5rem' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'nav-link-active glass-pill' : ''}`}
              style={isActive ? { background: 'rgba(34, 177, 76, 0.22)', borderColor: 'rgba(34, 177, 76, 0.25)' } : undefined}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        {balanceUsd !== null && (
          <div
            className="glass-card sidebar-credits"
            style={{
              padding: '0.6rem 0.75rem',
              marginBottom: '0.75rem',
              borderRadius: '14px',
              background: isLow ? 'rgba(196, 90, 60, 0.12)' : undefined,
            }}
          >
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Créditos de IA</p>
            <p className="figure text-sm font-semibold" style={{ color: isLow ? 'var(--color-clay)' : 'var(--color-ink)' }}>
              US$ {balanceUsd.toFixed(2)}
            </p>
            <Link href="/billing" className="text-xs font-semibold" style={{ color: 'var(--color-moss-deep)' }}>
              + Comprar créditos
            </Link>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="glass-pill"
          style={{
            width: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            color: 'var(--color-clay)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden style={{ fontSize: '1rem' }}>⏻</span>
          <span className="sidebar-logout-label">Sair</span>
        </button>
      </div>
    </aside>
  )
}