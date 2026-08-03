import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { debtTranches, installments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { ScheduleSpec } from '@/lib/finance/scheduleSpec'
import { getSessionContext } from '@/lib/auth/session'
import { contractBelongsToAccount } from '@/lib/auth/ownership'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await params
    const owns = await contractBelongsToAccount(id, session.accountId)
    if (!owns) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const tranches = await db.select().from(debtTranches).where(eq(debtTranches.contractId, id))

    const withStatus = await Promise.all(
      tranches.map(async (t) => {
        const rows = await db.select().from(installments).where(eq(installments.trancheId, t.id))
        const spec = t.scheduleSpec as ScheduleSpec
        const totalPrincipal = spec.disbursements?.reduce((sum, d) => sum + d.amount, 0) ?? 0

        return {
          id: t.id,
          label: t.label,
          scheduleSpec: spec,
          totalPrincipal,
          installmentCount: rows.length,
        }
      })
    )

    return NextResponse.json({ tranches: withStatus })
  } catch (err) {
    console.error('Erro ao buscar tranches:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar tranches', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}