'use client'

import { useState } from 'react'
import type { CSSProperties, JSX } from 'react'

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: '◧', title: 'Toda a carteira, num painel só', text: 'Total de contratos, quantos aguardam revisão, quantos estão ativos, e a exposição de dívida por avalista — a primeira coisa que você vê ao entrar.' },
  { id: 'contratos', label: 'Contratos', icon: '▤', title: 'Cada contrato, com status claro', text: 'Lista de tudo que já foi enviado, com o status de processamento de cada um e acesso rápido ao detalhe.' },
  { id: 'cronograma', label: 'Cronograma', icon: '▦', title: 'O calendário de pagamento consolidado', text: 'Linha do tempo, visão mês a mês, ou por contrato individual — sempre calculado, nunca estimado.' },
  { id: 'empresas', label: 'Empresas', icon: '🏢', title: 'O grupo econômico inteiro, organizado', text: 'Cadastre cada CNPJ ou CPF do grupo — todo contrato fica vinculado à empresa ou pessoa certa.' },
  { id: 'upload', label: 'Novo Upload', icon: '↑', title: 'Só soltar o PDF', text: 'A IA lê o contrato, você revisa o que ela encontrou com um clique, e o cronograma sai pronto.' },
]

function DashboardVisual() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[['Total', '18'], ['Revisão', '2'], ['Ativos', '14']].map(([label, value]) => (
        <div key={label} className="card p-3 text-center">
          <p className="text-xs uppercase" style={{ color: 'var(--color-ink-soft)' }}>{label}</p>
          <p className="text-xl font-bold figure">{value}</p>
        </div>
      ))}
    </div>
  )
}

function ContratosVisual() {
  return (
    <div className="space-y-2">
      {[
        { name: 'Boa Esperança Ltda', badge: 'badge-moss', status: 'Ativo' },
        { name: 'Três Marias Agro', badge: 'badge-wheat', status: 'Aguardando revisão' },
      ].map((c) => (
        <div key={c.name} className="card p-3 flex items-center justify-between">
          <span className="text-sm font-medium">{c.name}</span>
          <span className={`badge ${c.badge}`}>{c.status}</span>
        </div>
      ))}
    </div>
  )
}

function CronogramaVisual() {
  return (
    <div className="space-y-2">
      {[
        { date: '15/03', value: 'R$ 48.200', badge: 'badge-moss', status: 'Pago' },
        { date: '15/04', value: 'R$ 48.200', badge: 'badge-wheat', status: 'Pendente' },
      ].map((row) => (
        <div key={row.date} className="landing-payment-row">
          <span className="figure landing-payment-date">{row.date}</span>
          <span className="figure landing-payment-value">{row.value}</span>
          <span className={`badge ${row.badge}`}>{row.status}</span>
        </div>
      ))}
    </div>
  )
}

function EmpresasVisual() {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold">Vale Verde Participações Ltda</p>
        <p className="text-xs figure" style={{ color: 'var(--color-ink-soft)' }}>CNPJ: 34.567.890/0001-12</p>
      </div>
      <span className="badge badge-neutral">3 contratos</span>
    </div>
  )
}

function UploadVisual() {
  return (
    <div className="flex items-center gap-4">
      <div className="dropzone p-6 flex-1 text-center">
        <p className="text-xs font-medium" style={{ color: 'var(--color-moss-deep)' }}>Solte o PDF aqui</p>
      </div>
      <div className="confidence-ring" style={{ '--pct': 91 } as CSSProperties}>
        <div className="confidence-ring-core">91%</div>
      </div>
    </div>
  )
}

const VISUALS: Record<string, () => JSX.Element> = {
  dashboard: DashboardVisual,
  contratos: ContratosVisual,
  cronograma: CronogramaVisual,
  empresas: EmpresasVisual,
  upload: UploadVisual,
}

export default function ProductTour() {
  const [active, setActive] = useState(0)
  const section = SECTIONS[active]
  const Visual = VISUALS[section.id]

  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-6">
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActive(i)}
            className="nav-link"
            style={{
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: i === active ? 'rgba(34, 177, 76, 0.2)' : 'transparent',
              color: i === active ? 'var(--color-moss-deep)' : 'var(--color-ink-soft)',
              fontWeight: i === active ? 600 : 500,
            }}
          >
            <span aria-hidden>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      <div className="glass-card p-8">
        <p className="font-semibold text-xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>{section.title}</p>
        <p className="text-sm mb-6" style={{ color: 'var(--color-ink-soft)' }}>{section.text}</p>
        <Visual />
      </div>
    </div>
  )
}