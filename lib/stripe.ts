import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

// Client "preguiçoso" — só valida e instancia quando alguém de fato chama getStripe(),
// nunca no momento em que o módulo é importado. Isso evita quebrar o build (ou o boot
// do servidor) quando o Stripe simplesmente ainda não está configurado no ambiente.
export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY não configurada')
    }
    if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      throw new Error(
        `STRIPE_SECRET_KEY inválida — precisa começar com "sk_test_" ou "sk_live_". ` +
        `Valor atual começa com "${process.env.STRIPE_SECRET_KEY.slice(0, 4)}...". ` +
        `Copie a Secret key certa em Stripe Dashboard → Developers → API keys.`
      )
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return stripeInstance
}