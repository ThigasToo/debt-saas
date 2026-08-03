import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contracts, extractedFields } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'
import { contractBelongsToAccount } from '@/lib/auth/ownership'

interface FieldUpdate {
  id: string
  fieldValue: string
}

export async function POST(
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

    const body = await req.json()
    const fieldUpdates: FieldUpdate[] = body.fields ?? []
    const confirm: boolean = !!body.confirm

    for (const update of fieldUpdates) {
      await db
        .update(extractedFields)
        .set({ fieldValue: update.fieldValue, status: 'CORRECTED' })
        .where(and(eq(extractedFields.id, update.id), eq(extractedFields.contractId, id)))
    }

    if (confirm) {
      await db
        .update(extractedFields)
        .set({ status: 'CONFIRMED' })
        .where(and(eq(extractedFields.contractId, id), eq(extractedFields.status, 'PENDING_REVIEW')))

      await db
        .update(contracts)
        .set({ status: 'ACTIVE', updatedAt: new Date() })
        .where(eq(contracts.id, id))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro ao revisar contrato:', err)
    return NextResponse.json(
      { error: 'Erro ao revisar contrato', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}