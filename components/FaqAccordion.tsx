'use client'

import { useState } from 'react'

interface FaqItem {
  q: string
  a: string
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={item.q} className="glass-card overflow-hidden">
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between text-left p-5"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <span className="font-semibold">{item.q}</span>
              <span
                aria-hidden
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  color: 'var(--color-moss-deep)',
                  transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                  marginLeft: '1rem',
                }}
              >
                +
              </span>
            </button>
            <div style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
              <div style={{ overflow: 'hidden' }}>
                <p className="text-sm px-5 pb-5" style={{ color: 'var(--color-ink-soft)' }}>{item.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}