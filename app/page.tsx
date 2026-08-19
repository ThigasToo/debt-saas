import Link from 'next/link'
import Logo from '@/components/Logo'

const STEPS = [
  { n: '01', title: 'Envie o PDF', text: 'CCB, CPR, FINAME ou financiamento bancário — qualquer modalidade.' },
  { n: '02', title: 'A IA lê o contrato', text: 'Modalidade, taxas, garantias, avalistas e prazos, extraídos em segundos.' },
  { n: '03', title: 'Você revisa e confirma', text: 'Cada campo mostra a página e a cláusula de origem — nada é uma caixa-preta.' },
  { n: '04', title: 'O cronograma sai pronto', text: 'Parcela por parcela, calculado por um motor determinístico e auditável.' },
]

const FEATURES = [
  {
    title: 'Motor determinístico, não caixa-preta',
    text: 'SAC, Price, carência com capitalização de juros, indexadores — o cálculo é auditável linha a linha. A IA só lê o contrato; quem calcula a parcela é matemática pura, sempre reproduzível.',
  },
  {
    title: 'Visão consolidada do grupo',
    text: 'Todas as empresas e pessoas físicas do grupo econômico numa dívida só, com exposição por avalista visível de cara — sem precisar somar planilha por planilha.',
  },
  {
    title: 'Excel quando você precisar',
    text: 'Cronograma anual-mensal e base de dados completa exportados num clique, prontos pra levar pro seu contador, banco ou comitê de crédito.',
  },
]

const AUDIENCE = [
  {
    title: 'Empresas de médio porte no agronegócio',
    text: 'Que financiam safra, maquinário e capital de giro em vários bancos e linhas diferentes ao mesmo tempo.',
  },
  {
    title: 'Grupos econômicos com várias CNPJs',
    text: 'Onde a dívida de uma fazenda ou empresa do grupo precisa ser vista junto com as outras, não isolada.',
  },
  {
    title: 'Quem hoje controla tudo em planilha',
    text: 'E cansou de atualizar parcela manualmente toda vez que fecha um novo contrato.',
  },
]

const FAQ = [
  {
    q: 'Meus dados de contrato ficam seguros?',
    a: 'Sim. Os PDFs ficam num armazenamento privado, isolado por conta — nenhum outro cliente do Raiz tem acesso, e o acesso interno é restrito a quem você autoriza no seu time.',
  },
  {
    q: 'A IA calcula a parcela ou só lê o contrato?',
    a: 'Só lê. A extração por IA identifica taxa, prazo, garantias e condições — mas o cronograma em si é calculado por um motor de fórmulas determinístico, sempre auditável e reproduzível, nunca uma estimativa da IA.',
  },
  {
    q: 'Quais tipos de contrato o Raiz entende?',
    a: 'CCB, CPR, FINAME, financiamentos bancários tradicionais e a maioria das modalidades de crédito rural e capital de giro. Se aparecer algo fora do padrão, o sistema sinaliza o que não conseguiu interpretar com certeza, em vez de adivinhar.',
  },
  {
    q: 'Preciso saber programar ou mexer em planilha complexa?',
    a: 'Não. É subir o PDF, revisar o que a IA encontrou (com um clique) e pronto — o cronograma e os relatórios em Excel saem prontos.',
  },
  {
    q: 'Dá pra testar antes de decidir?',
    a: 'Sim — toda conta nova já nasce com créditos de cortesia pra processar contratos reais e ver o resultado antes de decidir se vale a pena.',
  },
]

export default function LandingPage() {
  return (
    <div>
      <header className="flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Logo size={38} />
          <div>
            <p className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>Raiz</p>
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>Gestão de Dívida</p>
          </div>
        </div>
        <Link href="/login" className="btn-secondary">Entrar</Link>
      </header>

      {/* HERO */}
      <section className="landing-hero-bg">
        <div className="max-w-6xl mx-auto px-8 py-16 md:py-24 relative" style={{ zIndex: 1 }}>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="page-eyebrow mb-4">Gestão de dívida corporativa · Agronegócio</p>
              <h1 className="text-4xl md:text-5xl font-bold mb-5" style={{ fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                Cada contrato, decifrado.
                <br />
                Cada parcela, exata.
              </h1>
              <p className="text-lg mb-8" style={{ color: 'var(--color-ink-soft)' }}>
                Suba o PDF do financiamento e o Raiz extrai as cláusulas, recalcula o cronograma
                parcela a parcela e consolida a dívida de todo o grupo — sem planilha, sem achismo.
              </p>
              <div className="flex items-center gap-3">
                <Link href="/login" className="btn-primary">Criar conta grátis</Link>
                <Link href="/login" className="btn-secondary">Entrar</Link>
              </div>
            </div>

            <div className="relative flex items-center justify-center" style={{ minHeight: '380px' }}>
              <div
                className="landing-chip px-4 py-2 absolute text-sm font-semibold"
                style={{ top: '0', left: '0', color: 'var(--color-moss-deep)', animationDelay: '0s' }}
              >
                <span className="figure">R$ 2,4M</span> consolidados
              </div>
              <div
                className="landing-chip px-4 py-2 absolute text-sm font-semibold"
                style={{ bottom: '10%', right: '0', color: 'var(--color-wheat)', animationDelay: '1.2s' }}
              >
                <span className="figure">12</span> contratos ativos
              </div>
              <div
                className="landing-chip px-4 py-2 absolute text-sm font-semibold"
                style={{ bottom: '-4%', left: '8%', color: 'var(--color-clay)', animationDelay: '2.4s' }}
              >
                <span className="figure">3</span> empresas do grupo
              </div>

              <div className="landing-mock-card p-6" style={{ width: '360px' }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-ink-soft)' }}>CCB · Banco do Brasil</p>
                    <p className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>Fazenda Santa Rita</p>
                  </div>
                  <div className="confidence-ring" style={{ '--pct': 94 } as React.CSSProperties}>
                    <div className="confidence-ring-core">94%</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { date: '15/03/2026', value: 'R$ 48.200', status: 'Pago', badge: 'badge-moss' },
                    { date: '15/04/2026', value: 'R$ 48.200', status: 'Pendente', badge: 'badge-wheat' },
                    { date: '15/05/2026', value: 'R$ 48.200', status: 'Pendente', badge: 'badge-wheat' },
                  ].map((row) => (
                    <div
                      key={row.date}
                      className="flex items-center justify-between text-sm p-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.6)' }}
                    >
                      <span className="figure" style={{ color: 'var(--color-ink-soft)' }}>{row.date}</span>
                      <span className="figure font-medium">{row.value}</span>
                      <span className={`badge ${row.badge}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <p className="page-eyebrow mb-2 text-center">Como funciona</p>
        <h2 className="text-3xl font-bold text-center mb-14" style={{ fontFamily: 'var(--font-display)' }}>
          Do PDF ao cronograma, em minutos
        </h2>
        <div className="grid md:grid-cols-4 gap-8">
          {STEPS.map((step) => (
            <div key={step.n}>
              <p className="landing-step-number mb-2">{step.n}</p>
              <p className="font-semibold mb-2">{step.title}</p>
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRA QUEM É */}
      <section className="max-w-6xl mx-auto px-8 py-16">
        <p className="page-eyebrow mb-2 text-center">Pra quem é</p>
        <h2 className="text-3xl font-bold text-center mb-14" style={{ fontFamily: 'var(--font-display)' }}>
          Feito pra quem gerencia dívida de verdade
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {AUDIENCE.map((a) => (
            <div key={a.title} className="glass-card p-6">
              <p className="font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{a.title}</p>
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-section-wheat py-20">
        <div className="max-w-6xl mx-auto px-8">
          <p className="page-eyebrow mb-2 text-center">Por que confiar no cálculo</p>
          <h2 className="text-3xl font-bold text-center mb-14" style={{ fontFamily: 'var(--font-display)' }}>
            Precisão que dá pra auditar
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="glass-card p-6">
                <p className="font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{f.title}</p>
                <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-8 py-20">
        <p className="page-eyebrow mb-2 text-center">Perguntas frequentes</p>
        <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-display)' }}>
          Antes de você perguntar
        </h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="glass-card p-5">
              <p className="font-semibold mb-2">{item.q}</p>
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTATO / COMERCIAL */}
      <section className="landing-section-clay py-20">
        <div className="max-w-2xl mx-auto px-8 text-center">
          <p className="page-eyebrow mb-2">Fale com a gente</p>
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Prefere conversar antes de começar?
          </h2>
          <p className="text-lg mb-8" style={{ color: 'var(--color-ink-soft)' }}>
            Se o grupo tem uma carteira grande de contratos ou uma necessidade específica,
            fala direto com a gente antes de criar a conta.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mb-10">
            {/* TROQUE pelo e-mail comercial real */}
            <a href="mailto:comercial@raiz.com.br?subject=Quero%20conhecer%20o%20Raiz" className="btn-primary">
              ✉ Falar com o comercial
            </a>
            <Link href="/login" className="btn-secondary">Prefiro testar sozinho</Link>
          </div>
        </div>
      </section>

      <footer className="text-center py-10 text-xs" style={{ color: 'var(--color-ink-soft)' }}>
        Raiz — Gestão de Dívida Corporativa
      </footer>
    </div>
  )
}