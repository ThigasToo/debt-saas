import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/auth/session'
import { getStripe } from '@/lib/stripe'
import { getUsdBrlRate } from '@/lib/billing/exchangeRate'
import { CREDIT_PACKAGES, calculateCreditsForPackage } from '@/lib/billing/creditPackages'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const pkg = CREDIT_PACKAGES.find((p) => p.id === body.packageId)
    if (!pkg) {
      return NextResponse.json({ error: 'Pacote de créditos inválido' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || new URL(req.url).origin
    const { rate } = await getUsdBrlRate()
    const creditsMicros = calculateCreditsForPackage(pkg.priceBrlCents, rate)
    const stripe = getStripe()

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: { name: `Créditos de IA — Raiz (${pkg.label})` },
            unit_amount: pkg.priceBrlCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing`,
      metadata: {
        accountId: session.accountId,
        packageId: pkg.id,
        creditsMicros: String(creditsMicros),
      },
    })

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'Erro ao criar sessão de pagamento' }, { status: 500 })
    }

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('Erro ao criar checkout:', err)
    return NextResponse.json(
      { error: 'Erro ao iniciar pagamento', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}