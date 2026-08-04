import { NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/auth/session'
import { getUsdBrlRate } from '@/lib/billing/exchangeRate'
import { CREDIT_PACKAGES, calculateCreditsForPackage } from '@/lib/billing/creditPackages'

export async function GET() {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { rate, source } = await getUsdBrlRate()
    const packages = CREDIT_PACKAGES.map((pkg) => ({
      ...pkg,
      creditsUsd: calculateCreditsForPackage(pkg.priceBrlCents, rate) / 1_000_000,
    }))

    return NextResponse.json({ rate, source, packages })
  } catch (err) {
    console.error('Erro ao buscar cotação:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar cotação', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}