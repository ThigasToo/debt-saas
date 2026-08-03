import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { debtTranches, installments } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { runScheduleEngine } from '@/lib/finance/engine'
import { ScheduleSpec } from '@/lib/finance/scheduleSpec'
import { getSessionContext } from '@/lib/auth/session'
import { trancheBelongsToAccount } from '@/lib/auth/ownership'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; trancheId: string }> }
) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { trancheId } = await params
    const owned = await trancheBelongsToAccount(trancheId, session.accountId)
    if (!owned) {
      return NextResponse.json({ error: 'Tranche não encontrada' }, { status: 404 })
    }

    const rows = await db
      .select()
      .from(installments)
      .where(eq(installments.trancheId, trancheId))
      .orderBy(asc(installments.installmentNumber))

    return NextResponse.json({ installments: rows })
  } catch (err) {
    console.error('Erro ao buscar cronograma da tranche:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar cronograma', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; trancheId: string }> }
) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { trancheId } = await params
    const owned = await trancheBelongsToAccount(trancheId, session.accountId)
    if (!owned) {
      return NextResponse.json({ error: 'Tranche não encontrada' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    let spec: ScheduleSpec

    if (body.scheduleSpec) {
      spec = body.scheduleSpec
      await db.update(debtTranches).set({ scheduleSpec: spec }).where(eq(debtTranches.id, trancheId))
    } else {
      const [tranche] = await db.select().from(debtTranches).where(eq(debtTranches.id, trancheId))
      if (!tranche) {
        return NextResponse.json({ error: 'Tranche não encontrada' }, { status: 404 })
      }
      spec = tranche.scheduleSpec as ScheduleSpec
    }

    const schedule = runScheduleEngine(spec)

    await db.delete(installments).where(eq(installments.trancheId, trancheId))

    await db.insert(installments).values(
      schedule.map((s) => ({
        contractId: owned.contractId,
        trancheId,
        installmentNumber: s.installmentNumber,
        dueDate: s.dueDate,
        principalAmount: s.principalAmount,
        interestAmount: s.interestAmount,
        totalAmount: s.totalAmount,
        remainingBalance: s.remainingBalance,
        source: s.source,
        notes: s.notes ?? null,
        status: 'PENDING' as const,
      }))
    )

    const rows = await db
      .select()
      .from(installments)
      .where(eq(installments.trancheId, trancheId))
      .orderBy(asc(installments.installmentNumber))

    return NextResponse.json({ success: true, installments: rows })
  } catch (err) {
    console.error('Erro ao gerar cronograma da tranche:', err)
    return NextResponse.json(
      { error: 'Erro ao gerar cronograma', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; trancheId: string }> }
) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { trancheId } = await params
    const owned = await trancheBelongsToAccount(trancheId, session.accountId)
    if (!owned) {
      return NextResponse.json({ error: 'Tranche não encontrada' }, { status: 404 })
    }

    const body = await req.json()
    const installmentId: string = body.installmentId
    const paid: boolean = !!body.paid

    if (!installmentId) {
      return NextResponse.json({ error: 'installmentId é obrigatório' }, { status: 400 })
    }

    await db
      .update(installments)
      .set({ status: paid ? 'PAID' : 'PENDING', paidDate: paid ? new Date() : null })
      .where(eq(installments.id, installmentId))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro ao atualizar parcela:', err)
    return NextResponse.json(
      { error: 'Erro ao atualizar parcela', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}