export type AmortizationSystem = 'SAC' | 'PRICE'

export interface AmortizationInput {
  principal: number
  annualRatePercent: number // ex: 12 para 12% a.a.
  numberOfInstallments: number
  firstDueDate: Date
  system: AmortizationSystem
}

export interface InstallmentCalculation {
  installmentNumber: number
  dueDate: Date
  principalAmount: number
  interestAmount: number
  totalAmount: number
  remainingBalance: number
}

// Converte taxa anual para taxa mensal equivalente (juros compostos)
function annualToMonthlyRate(annualRatePercent: number): number {
  const annualRate = annualRatePercent / 100
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateSchedule(input: AmortizationInput): InstallmentCalculation[] {
  const { principal, annualRatePercent, numberOfInstallments, firstDueDate, system } = input
  const monthlyRate = annualToMonthlyRate(annualRatePercent)

  const result: InstallmentCalculation[] = []
  let balance = principal

  if (system === 'SAC') {
    // Amortização constante: mesma fatia de principal em toda parcela, juros decrescem
    const fixedPrincipal = principal / numberOfInstallments
    for (let i = 1; i <= numberOfInstallments; i++) {
      const interest = balance * monthlyRate
      const total = fixedPrincipal + interest
      balance -= fixedPrincipal
      result.push({
        installmentNumber: i,
        dueDate: addMonths(firstDueDate, i - 1),
        principalAmount: round2(fixedPrincipal),
        interestAmount: round2(interest),
        totalAmount: round2(total),
        remainingBalance: round2(Math.max(balance, 0)),
      })
    }
  } else {
    // PRICE: prestação total constante, composição de juros/principal varia
    const fixedInstallment =
      monthlyRate === 0
        ? principal / numberOfInstallments
        : (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfInstallments))) /
          (Math.pow(1 + monthlyRate, numberOfInstallments) - 1)

    for (let i = 1; i <= numberOfInstallments; i++) {
      const interest = balance * monthlyRate
      const principalPortion = fixedInstallment - interest
      balance -= principalPortion
      result.push({
        installmentNumber: i,
        dueDate: addMonths(firstDueDate, i - 1),
        principalAmount: round2(principalPortion),
        interestAmount: round2(interest),
        totalAmount: round2(fixedInstallment),
        remainingBalance: round2(Math.max(balance, 0)),
      })
    }
  }

  return result
}