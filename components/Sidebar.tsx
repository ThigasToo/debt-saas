'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '◧' },
  { href: '/contracts', label: 'Contratos', icon: '▤' },
  { href: '/schedule', label: 'Cronograma', icon: '▦' },
  { href: '/companies', label: 'Empresas', icon: '🏢' },
  { href: '/upload', label: 'Novo Upload', icon: '↑' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  if (pathname === '/login') return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand">
        <span className="sidebar-mark">
          <span className="sidebar-mark-core" />
        </span>
        <span className="sidebar-brand-label">
          Raiz
          <span>Gestão de Dívida</span>
        </span>
      </Link>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-line)' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--color-clay)',
            background: 'var(--color-clay-soft)',
            color: 'var(--color-clay)',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          <span aria-hidden style={{ fontSize: '1rem' }}>⏻</span>
          Sair
        </button>
      </div>
    </aside>
  )
}