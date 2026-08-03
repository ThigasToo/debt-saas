import { ScheduleSpec } from './scheduleSpec'

export interface EngineInstallment {
  installmentNumber: number
  dueDate: Date
  principalAmount: number
  interestAmount: number
  totalAmount: number
  remainingBalance: number
  source: 'CALCULATED' | 'CONTRACTUAL'
  notes?: string
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

/**
 * Converte 'AAAA-MM-DD' em Date no fuso LOCAL.
 * new Date('2025-06-20') seria interpretado como UTC e exibido como 19/06 no Brasil.
 */
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function periodicityToMonths(p: string): number {
  switch (p) {
    case 'QUARTERLY': return 3
    case 'SEMIANNUAL': return 6
    case 'ANNUAL': return 12
    default: return 1
  }
}

function totalPrincipal(spec: ScheduleSpec): number {
  return spec.disbursements.reduce((sum, d) => sum + d.amount, 0)
}

function resolveAnnualRate(spec: ScheduleSpec): number {
  const { rate } = spec
  if (rate.kind === 'ZERO') return 0
  if (rate.kind === 'FIXED') return rate.fixedAnnualPercent ?? 0
  const indexRate = rate.assumedIndexAnnualPercent ?? 0
  const indexPortion = rate.indexPercent ? indexRate * (rate.indexPercent / 100) : indexRate
  return indexPortion + (rate.spreadAnnualPercent ?? 0)
}

function annualToMonthly(annualPercent: number): number {
  return Math.pow(1 + annualPercent / 100, 1 / 12) - 1
}

/** Caminho 1: contrato já traz a tabela — transcreve sem calcular */
function fromContractualTable(spec: ScheduleSpec): EngineInstallment[] {
  const table = spec.amortization.contractualSchedule ?? []
  const principal = totalPrincipal(spec)
  let balance = principal

  return table.map((item, idx) => {
    let principalAmount = 0
    if (item.principalAmount != null) principalAmount = item.principalAmount
    else if (item.principalPercent != null) principalAmount = round2(principal * (item.principalPercent / 100))

    let totalAmount = item.totalAmount ?? 0
    const interestAmount = totalAmount > 0 ? round2(totalAmount - principalAmount) : 0
    if (totalAmount === 0) totalAmount = round2(principalAmount + interestAmount)

    balance = round2(Math.max(balance - principalAmount, 0))

    return {
      installmentNumber: idx + 1,
      dueDate: parseLocalDate(item.date),
      principalAmount: round2(principalAmount),
      interestAmount,
      totalAmount,
      remainingBalance: balance,
      source: 'CONTRACTUAL' as const,
      notes: 'Valor extraído literalmente do contrato',
    }
  })
}

/** Caminho 2: calcula por fórmula (SAC, PRICE, BULLET) */
function fromFormula(spec: ScheduleSpec): EngineInstallment[] {
  const principal = totalPrincipal(spec)
  const annualRate = resolveAnnualRate(spec)
  const monthlyRate = annualToMonthly(annualRate)
  const monthsStep = periodicityToMonths(spec.amortization.periodicity)
  const periodRate = Math.pow(1 + monthlyRate, monthsStep) - 1
  const n = spec.amortization.numberOfInstallments ?? 0
  const firstDate = spec.amortization.firstPaymentDate
    ? parseLocalDate(spec.amortization.firstPaymentDate)
    : new Date()

  const grace = spec.amortization.grace
  const graceMonths = grace ? Math.max(grace.principalMonths, 0) : 0
  const capitalize = !!grace?.capitalizeInterest && graceMonths > 0

  // CORREÇÃO 1: se os juros da carência são capitalizados, a base de amortização
  // passa a ser o saldo JÁ capitalizado — senão a dívida nunca zera.
  let baseBalance = principal
  let capitalizationNote: string | undefined
  if (capitalize) {
    baseBalance = round2(principal * Math.pow(1 + monthlyRate, graceMonths))
    capitalizationNote = `Juros de ${graceMonths} meses de carência capitalizados (base: R$ ${baseBalance.toLocaleString('pt-BR')})`
  }

  // CORREÇÃO 2: carência sem capitalização é contada em MESES e convertida
  // para número de parcelas conforme a periodicidade real.
  const graceInstallments = !capitalize && graceMonths > 0 ? Math.floor(graceMonths / monthsStep) : 0
  const amortizingCount = Math.max(n - graceInstallments, 1)

  let balance = baseBalance
  const kind = spec.amortization.kind
  const result: EngineInstallment[] = []

  if (kind === 'BULLET') {
    for (let i = 1; i <= n; i++) {
      const isLast = i === n
      const interest = round2(balance * periodRate)
      const principalPortion = isLast ? balance : 0
      if (isLast) balance = 0
      result.push({
        installmentNumber: i,
        dueDate: addMonths(firstDate, (i - 1) * monthsStep),
        principalAmount: round2(principalPortion),
        interestAmount: interest,
        totalAmount: round2(principalPortion + interest),
        remainingBalance: round2(balance),
        source: 'CALCULATED',
        notes: i === 1 ? capitalizationNote : undefined,
      })
    }
    return result
  }

  if (kind === 'SAC') {
    const fixedPrincipal = round2(baseBalance / amortizingCount)
    for (let i = 1; i <= n; i++) {
      const interest = round2(balance * periodRate)
      const inGrace = i <= graceInstallments
      const isLast = i === n
      // CORREÇÃO 3: a última parcela absorve o resíduo de arredondamento,
      // garantindo saldo devedor final exatamente zero.
      const principalPortion = inGrace ? 0 : isLast ? balance : fixedPrincipal
      balance = round2(Math.max(balance - principalPortion, 0))
      result.push({
        installmentNumber: i,
        dueDate: addMonths(firstDate, (i - 1) * monthsStep),
        principalAmount: round2(principalPortion),
        interestAmount: interest,
        totalAmount: round2(principalPortion + interest),
        remainingBalance: balance,
        source: 'CALCULATED',
        notes: i === 1 ? capitalizationNote : inGrace ? 'Carência de principal' : undefined,
      })
    }
    return result
  }

  // PRICE
  const fixedInstallment =
    periodRate === 0
      ? baseBalance / amortizingCount
      : (baseBalance * (periodRate * Math.pow(1 + periodRate, amortizingCount))) /
        (Math.pow(1 + periodRate, amortizingCount) - 1)

  for (let i = 1; i <= n; i++) {
    const interest = round2(balance * periodRate)
    const inGrace = i <= graceInstallments
    const isLast = i === n
    let principalPortion = inGrace ? 0 : round2(fixedInstallment - interest)
    if (isLast) principalPortion = balance
    balance = round2(Math.max(balance - principalPortion, 0))
    result.push({
      installmentNumber: i,
      dueDate: addMonths(firstDate, (i - 1) * monthsStep),
      principalAmount: round2(principalPortion),
      interestAmount: interest,
      totalAmount: round2(principalPortion + interest),
      remainingBalance: balance,
      source: 'CALCULATED',
      notes: i === 1 ? capitalizationNote : inGrace ? 'Carência de principal' : undefined,
    })
  }
  return result
}

export function runScheduleEngine(spec: ScheduleSpec): EngineInstallment[] {
  const usesTable =
    spec.amortization.kind === 'CONTRACTUAL_TABLE' ||
    spec.amortization.kind === 'CUSTOM_PERCENT' ||
    spec.amortization.periodicity === 'IRREGULAR'

  if (usesTable && spec.amortization.contractualSchedule?.length) {
    return fromContractualTable(spec)
  }
  return fromFormula(spec)
}