const POINTS = [
  {
    title: 'Não treina modelo nenhum',
    text: 'A IA que lê seus contratos roda sobre a API comercial da Anthropic. Por contrato comercial, esse conteúdo nunca é usado pra treinar modelos, sem precisar de nenhuma configuração extra da sua parte.',
  },
  {
    title: 'Apagado em até 30 dias',
    text: 'Pela política de retenção comercial da Anthropic, o conteúdo processado pela API é excluído automaticamente dos servidores dela em até 30 dias, exceto em casos raros de investigação de uso indevido da plataforma.',
  },
  {
    title: 'Seu PDF, isolado por conta',
    text: 'O arquivo que você sobe fica num armazenamento privado, segmentado pela sua conta. Nenhum outro cliente do Raiz tem acesso, e o link de visualização é temporário e assinado, nunca público.',
  },
]

export default function SecuritySection() {
  return (
    <section className="landing-section-moss py-20">
      <div className="max-w-5xl mx-auto px-8">
        <p className="page-eyebrow mb-2 text-center">Segurança e privacidade</p>
        <h2 className="text-3xl font-bold text-center mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          Seus contratos passam pela IA. Não ficam com ela.
        </h2>
        <p className="text-center text-sm mb-14 max-w-2xl mx-auto" style={{ color: 'var(--color-ink-soft)' }}>
          São dados financeiros sensíveis do seu grupo econômico. Vale ser explícito sobre o que acontece com eles.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {POINTS.map((p) => (
            <div key={p.title} className="card p-6">
              <p className="font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{p.title}</p>
              <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>{p.text}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--color-ink-soft)' }}>
          Baseado na política comercial de retenção de dados da Anthropic.{' '}
          <a href="https://platform.claude.com/docs/en/manage-claude/api-and-data-retention" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-moss-deep)', textDecoration: 'underline' }}>
            Ver a política oficial
          </a>
        </p>
      </div>
    </section>
  )
}