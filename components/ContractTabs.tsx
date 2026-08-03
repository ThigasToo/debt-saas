'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { key: 'review', label: 'Revisão', suffix: '' },
  { key: 'summary', label: 'Resumo', suffix: '/summary' },
  { key: 'schedule', label: 'Cronograma', suffix: '/schedule' },
]

export default function ContractTabs({ contractId }: { contractId: string }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-2 mb-6">
      {TABS.map((tab) => {
        const href = `/contracts/${contractId}${tab.suffix}`
        const isActive = pathname === href
        return (
          <Link
            key={tab.key}
            href={href}
            className={`badge ${isActive ? 'badge-moss' : 'badge-neutral'}`}
            style={{ textDecoration: 'none' }}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}