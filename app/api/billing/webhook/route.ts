import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { accounts, creditPurchases } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { getStripe } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })
  }

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('❌ Assinatura do webhook inválida:', err)
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object as Stripe.Checkout.Session
    const accountId = checkoutSession.metadata?.accountId
    const creditsMicros = Number(checkoutSession.metadata?.creditsMicros || 0)

    if (accountId && creditsMicros > 0) {
      try {
        // stripeSessionId é UNIQUE — se o Stripe reenviar o mesmo webhook (retry por
        // timeout), esse insert falha e a gente não credita duas vezes.
        await db.insert(creditPurchases).values({
          accountId,
          stripeSessionId: checkoutSession.id,
          amountUsdCents: checkoutSession.amount_total ?? 0,
          creditsMicros,
        })

        await db
          .update(accounts)
          .set({ aiCreditsMicros: sql`${accounts.aiCreditsMicros} + ${creditsMicros}` })
          .where(eq(accounts.id, accountId))

        console.log(`✓ Créditos adicionados: conta ${accountId}, +${creditsMicros} micros`)
      } catch (err) {
        console.log('Webhook já processado antes (ou erro ao gravar):', err instanceof Error ? err.message : err)
      }
    }
  }

  return NextResponse.json({ received: true })
}