/**
 * ScheduleSpec: a "receita" da dívida.
 *
 * A IA interpreta o contrato e produz esta especificação — nunca números calculados.
 * O motor determinístico (lib/finance/engine.ts) executa a especificação e gera as parcelas.
 * Assim ganhamos flexibilidade para contratos heterogêneos sem perder auditabilidade.
 */

export type RateKind = 'FIXED' | 'INDEXED' | 'ZERO'
export type FinancialIndex = 'CDI' | 'IPCA' | 'IGPM' | 'SELIC' | 'TR' | 'TJLP' | 'USD' | 'OTHER'
export type DayCountConvention = 'BUSINESS_252' | 'ACTUAL_360' | 'ACTUAL_365' | 'MONTHLY_30'

export type AmortizationKind =
  | 'SAC'              // amortização constante
  | 'PRICE'            // parcela constante
  | 'BULLET'           // principal todo no vencimento
  | 'CONTRACTUAL_TABLE' // contrato traz a tabela de parcelas explícita
  | 'CUSTOM_PERCENT'   // percentuais definidos por data

export type Periodicity =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'
  | 'IRREGULAR'

export interface Disbursement {
  date: string          // ISO: '2024-05-06'
  amount: number
  label?: string        // ex: '1ª liberação'
}

export interface RateSpec {
  kind: RateKind
  index?: FinancialIndex | null
  indexPercent?: number | null       // ex: 110 para "110% do CDI"
  spreadAnnualPercent?: number | null
  fixedAnnualPercent?: number | null
  dayCount: DayCountConvention
  // Projeção usada quando o indexador é futuro e desconhecido
  assumedIndexAnnualPercent?: number | null
}

export interface GracePeriod {
  principalMonths: number
  interestMonths: number
  // Se true, juros do período de carência são incorporados ao saldo devedor
  capitalizeInterest: boolean
}

export interface ContractualInstallment {
  date: string
  // Preencher ao menos um destes:
  totalAmount?: number | null
  principalAmount?: number | null
  principalPercent?: number | null
}

export interface AmortizationSpec {
  kind: AmortizationKind
  periodicity: Periodicity
  numberOfInstallments?: number | null
  firstPaymentDate?: string | null
  finalMaturityDate?: string | null
  grace?: GracePeriod | null
  // Usado quando kind = 'CONTRACTUAL_TABLE' ou 'CUSTOM_PERCENT', ou periodicity = 'IRREGULAR'
  contractualSchedule?: ContractualInstallment[] | null
}

export interface FeeSpec {
  label: string
  kind: 'ONE_OFF' | 'PER_INSTALLMENT' | 'ANNUAL_PERCENT_OF_BALANCE'
  amount?: number | null
  percent?: number | null
  date?: string | null
}

/** Premissa que a IA teve que adotar porque o contrato não é explícito */
export interface Assumption {
  topic: string        // ex: 'Projeção do CDI'
  value: string        // ex: '10,5% a.a.'
  reason: string       // por que foi necessário assumir
}

/** Ponto que o contrato não resolve e precisa de decisão humana */
export interface OpenQuestion {
  topic: string
  question: string
  sourcePage?: number | null
}

export interface ScheduleSpec {
  currency: string                  // 'BRL', 'USD'
  disbursements: Disbursement[]
  rate: RateSpec
  amortization: AmortizationSpec
  fees: FeeSpec[]
  assumptions: Assumption[]
  openQuestions: OpenQuestion[]
  confidence: number                // 0 a 1 — confiança da IA na interpretação
  interpretationNotes?: string      // resumo em português de como a IA leu o contrato
}

/**
 * Uma tranche = uma linha de crédito dentro do contrato, com sua própria
 * regra de cálculo. Um contrato simples tem 1 tranche; um contrato com
 * recursos equalizáveis + livres (ou múltiplas séries) tem N tranches,
 * cada uma calculada independentemente.
 */
export interface DebtTrancheSpec {
  label: string
  scheduleSpec: ScheduleSpec
}