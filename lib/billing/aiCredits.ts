// Pricing atual do Claude Sonnet 5 (verificar antes de cada revisão de custo):
// https://docs.claude.com/en/docs/about-claude/pricing
//
// ⚠️ PREÇO PROMOCIONAL — válido só até 31/08/2026.
// A partir de 01/09/2026, sobe para US$3/MTok entrada e US$15/MTok saída.
// ATUALIZAR ESSAS DUAS CONSTANTES NESSA DATA.
const INPUT_PRICE_PER_MILLION_USD = 2
const OUTPUT_PRICE_PER_MILLION_USD = 10

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

/** Converte tokens consumidos em custo, na unidade "micros de dólar" (1 micro = US$ 0,000001) */
export function tokensToMicros(inputTokens: number, outputTokens: number): number {
  const costUsd =
    (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION_USD +
    (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION_USD
  return Math.round(costUsd * 1_000_000)
}

export function microsToUsd(micros: number): number {
  return micros / 1_000_000
}

// Saldo de boas-vindas pra conta nova (mantido em sincronia com o DEFAULT da coluna no banco).
// Reduzido de propósito — dá pra testar, mas não sustenta abuso de contas descartáveis.
export const SIGNUP_BONUS_MICROS = 500_000 // US$ 0,50

// Piso mínimo pra sequer tentar um novo upload — protege contra começar uma extração
// cara com saldo já visivelmente insuficiente
export const MIN_BALANCE_TO_UPLOAD_MICROS = 50_000 // US$ 0,05