export interface CreditPackage {
  id: string
  label: string
  priceBrlCents: number
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', label: 'Starter', priceBrlCents: 2990 }, // R$ 29,90
  { id: 'standard', label: 'Padrão', priceBrlCents: 9990 }, // R$ 99,90
  { id: 'pro', label: 'Pro', priceBrlCents: 24990 }, // R$ 249,90
]

// Taxa da Stripe pra cartão nacional no Brasil — confirme no seu Dashboard Stripe
// se o valor negociado pra sua conta for diferente. Fonte: stripe.com/br/pricing
const STRIPE_FEE_PERCENT = 0.0399
const STRIPE_FEE_FIXED_CENTS = 39

// Margem própria do Raiz, separada da taxa da Stripe — ajuste como quiser
const MARGIN_PERCENT = 0.15

/**
 * Calcula quanto de crédito de IA (em micros de USD) um pacote gera, na cotação
 * do dólar do momento. Desconta a taxa da Stripe e aplica a margem ANTES de
 * converter pra dólar — assim o crédito sempre reflete o que sobra de verdade.
 */
export function calculateCreditsForPackage(priceBrlCents: number, usdBrlRate: number): number {
  const stripeFeeCents = priceBrlCents * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_CENTS
  const netAfterStripeCents = priceBrlCents - stripeFeeCents
  const netAfterMarginCents = netAfterStripeCents * (1 - MARGIN_PERCENT)
  const usd = netAfterMarginCents / 100 / usdBrlRate
  return Math.max(0, Math.round(usd * 1_000_000))
}