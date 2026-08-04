import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { accounts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'
import { microsToUsd } from '@/lib/billing/aiCredits'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const [account] = await db
      .select({ aiCreditsMicros: accounts.aiCreditsMicros })
      .from(accounts)
      .where(eq(accounts.id, session.accountId))

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ balanceUsd: microsToUsd(account.aiCreditsMicros) })
  } catch (err) {
    console.error('Erro ao buscar créditos:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar créditos', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}