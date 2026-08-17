import Link from 'next/link'
import type { CSSProperties } from 'react'

import Logo from '@/components/Logo'

const STEPS = [
  {
    n: '01',
    title: 'Envie o PDF',
    text: 'CCB, CPR, FINAME ou financiamento bancário — qualquer modalidade.',
  },
  {
    n: '02',
    title: 'A IA lê o contrato',
    text: 'Modalidade, taxas, garantias, avalistas e prazos, extraídos em segundos.',
  },
  {
    n: '03',
    title: 'Você revisa e confirma',
    text: 'Cada campo mostra a página e a cláusula de origem — nada é uma caixa-preta.',
  },
  {
    n: '04',
    title: 'O cronograma sai pronto',
    text: 'Parcela por parcela, calculado por um motor determinístico e auditável.',
  },
]

const FEATURES = [
  {
    title: 'Motor determinístico, não caixa-preta',
    text: 'SAC, Price, carência com capitalização de juros, indexadores — o cálculo é auditável linha a linha, nunca uma estimativa da IA.',
  },
  {
    title: 'Visão consolidada do grupo',
    text: 'Todas as empresas e pessoas físicas do grupo econômico numa dívida só, com exposição por avalista visível de cara.',
  },
  {
    title: 'Excel quando você precisar',
    text: 'Cronograma anual-mensal e base de dados completa exportados num clique, prontos pra qualquer análise fora do app.',
  },
]

const PAYMENT_ROWS = [
  {
    date: '15/03/2026',
    value: 'R$ 48.200',
    status: 'Pago',
    badge: 'badge-moss',
  },
  {
    date: '15/04/2026',
    value: 'R$ 48.200',
    status: 'Pendente',
    badge: 'badge-wheat',
  },
  {
    date: '15/05/2026',
    value: 'R$ 48.200',
    status: 'Pendente',
    badge: 'badge-wheat',
  },
]

export default function LandingPage() {
  return (
    <main className="landing-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="landing-header">
        <div className="landing-container landing-header-inner">

          <Link href="/" className="landing-brand">
            <Logo size={38} />

            <div>
              <p className="landing-brand-title">
                Raiz
              </p>

              <p className="landing-brand-subtitle">
                Gestão de Dívida
              </p>
            </div>
          </Link>

          <Link href="/login" className="btn-secondary">
            Entrar
          </Link>

        </div>
      </header>


      {/* =====================================
          HERO
      ===================================== */}

      <section className="landing-hero">

        <div className="landing-hero-glow" />

        <div className="landing-container landing-hero-content">

          <div className="landing-hero-grid">

            {/* TEXTO */}

            <div className="landing-hero-copy">

              <p className="page-eyebrow landing-hero-eyebrow">
                Gestão de dívida corporativa · Agronegócio
              </p>

              <h1 className="landing-hero-title">
                Cada contrato,
                <br />
                decifrado.
                <br />
                Cada parcela, calculada.
              </h1>

              <p className="landing-hero-description">
                Suba o PDF do contrato bancário e o Raiz extrai as cláusulas,
                recalcula o cronograma parcela a parcela e consolida a dívida
                de todo o grupo — sem planilha, sem achismo.
              </p>

              <div className="landing-hero-actions">

                <Link href="/login" className="btn-primary">
                  Criar conta grátis
                </Link>

                <Link href="/login" className="btn-secondary">
                  Entrar
                </Link>

              </div>

            </div>


            {/* MOCKUP */}

            <div className="landing-visual">

              <div
                className="landing-chip landing-chip-total"
                style={{ color: 'var(--color-moss-deep)' }}
              >
                <span className="figure">R$ 2,4M</span> consolidados
              </div>


              <div
                className="landing-chip landing-chip-contracts"
                style={{
                  color: 'var(--color-wheat)',
                  animationDelay: '1.2s',
                }}
              >
                <span className="figure">12</span> contratos ativos
              </div>


              <div
                className="landing-chip landing-chip-companies"
                style={{
                  color: 'var(--color-clay)',
                  animationDelay: '2.4s',
                }}
              >
                <span className="figure">3</span> empresas do grupo
              </div>


              <div className="landing-mock-card">

                <div className="landing-mock-header">

                  <div>
                    <p className="landing-mock-eyebrow">
                      CCB · Banco do Brasil
                    </p>

                    <p className="landing-mock-title">
                      Fazenda Santa Rita
                    </p>
                  </div>


                  <div
                    className="confidence-ring"
                    style={
                      {
                        '--pct': 94,
                      } as CSSProperties
                    }
                  >
                    <div className="confidence-ring-core">
                      94%
                    </div>
                  </div>

                </div>


                <div className="landing-payment-list">

                  {PAYMENT_ROWS.map((row) => (
                    <div
                      key={row.date}
                      className="landing-payment-row"
                    >

                      <span className="figure landing-payment-date">
                        {row.date}
                      </span>

                      <span className="figure landing-payment-value">
                        {row.value}
                      </span>

                      <span className={`badge ${row.badge}`}>
                        {row.status}
                      </span>

                    </div>
                  ))}

                </div>

              </div>

            </div>

          </div>

        </div>
      </section>


      {/* =====================================
          COMO FUNCIONA
      ===================================== */}

      <section className="landing-how">

        <div className="landing-container">

          <div className="landing-section-heading">

            <p className="page-eyebrow">
              Como funciona
            </p>

            <h2 className="landing-section-title">
              Do PDF ao cronograma, em minutos
            </h2>

          </div>


          <div className="landing-steps">

            {STEPS.map((step) => (
              <article
                key={step.n}
                className="landing-step"
              >

                <p className="landing-step-number">
                  {step.n}
                </p>

                <h3 className="landing-step-title">
                  {step.title}
                </h3>

                <p className="landing-step-text">
                  {step.text}
                </p>

              </article>
            ))}

          </div>

        </div>

      </section>


      {/* =====================================
          FEATURES
      ===================================== */}

      <section className="landing-features">

        <div className="landing-container">

          <div className="landing-feature-grid">

            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="glass-card landing-feature-card"
              >

                <h3 className="landing-feature-title">
                  {feature.title}
                </h3>

                <p className="landing-feature-text">
                  {feature.text}
                </p>

              </article>
            ))}

          </div>

        </div>

      </section>


      {/* =====================================
          CTA FINAL
      ===================================== */}

      <section className="landing-cta">

        <div className="landing-cta-inner">

          <h2 className="landing-cta-title">
            Pare de perseguir contrato em pasta de PDF
          </h2>

          <p className="landing-cta-description">
            Comece agora — o primeiro upload mostra em segundos
            como fica o cronograma da sua dívida.
          </p>

          <Link href="/login" className="btn-primary">
            Criar conta grátis
          </Link>

        </div>

      </section>


      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="landing-footer">
        Raiz — Gestão de Dívida Corporativa
      </footer>

    </main>
  )
}