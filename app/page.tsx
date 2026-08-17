import Link from 'next/link'

const FEATURES = [
  {
    title: 'Upload, e a IA lê o contrato',
    text: 'Suba o PDF de qualquer CCB, CPR, FINAME ou financiamento bancário — a IA identifica modalidade, taxas, garantias e avalistas sozinha.',
  },
  {
    title: 'Cronograma calculado, não estimado',
    text: 'SAC, Price, carência, indexadores — o motor de cálculo é determinístico e auditável, parcela por parcela.',
  },
  {
    title: 'Visão consolidada do grupo',
    text: 'Todas as empresas e pessoas do grupo econômico numa dívida só, com exposição por avalista e exportação em Excel.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-canvas)' }}>
      <header className="flex items-center gap-3 px-8 py-6">
        <span className="sidebar-mark"><span className="sidebar-mark-core" /></span>
        <div>
          <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Raiz</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Gestão de Dívida</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          A dívida da sua empresa, organizada por IA
        </h1>
        <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: 'var(--color-ink-soft)' }}>
          Suba os contratos em PDF e o Raiz extrai os dados, monta o cronograma de pagamento e
          te dá uma visão consolidada de toda a dívida do grupo — pensado para o agronegócio brasileiro.
        </p>

        <div className="flex items-center justify-center gap-3 mb-16">
          <Link href="/login" className="btn-primary">Entrar</Link>
          <Link href="/login" className="btn-secondary">Criar conta</Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-left">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <p className="font-semibold mb-2">{f.title}</p>
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-8 text-xs" style={{ color: 'var(--color-ink-soft)' }}>
        Raiz — Gestão de Dívida Corporativa
      </footer>
    </div>
  )
}