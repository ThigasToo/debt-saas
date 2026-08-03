import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractedFields } from '@/lib/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'
import { contractBelongsToAccount } from '@/lib/auth/ownership'

function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
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

    const fieldLabel: string = (body.fieldLabel ?? '').trim()
    const fieldValue: string = (body.fieldValue ?? '').trim()
    const fieldGroup: string = (body.fieldGroup ?? 'Outros').trim()
    const dataType: string = body.dataType ?? 'text'
    const sourcePage: number | null = body.sourcePage ? Number(body.sourcePage) : null
    const sourceClause: string | null = body.sourceClause?.trim() || null

    if (!fieldLabel || !fieldValue) {
      return NextResponse.json({ error: 'Rótulo e valor são obrigatórios' }, { status: 400 })
    }

    const [{ maxOrder }] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${extractedFields.displayOrder}), 0)` })
      .from(extractedFields)
      .where(eq(extractedFields.contractId, id))

    const [created] = await db
      .insert(extractedFields)
      .values({
        contractId: id,
        fieldName: slugify(fieldLabel) || `campo_${Date.now()}`,
        fieldLabel,
        fieldGroup,
        dataType,
        displayOrder: Number(maxOrder) + 1,
        fieldValue,
        sourcePage,
        sourceClause,
        sourceExcerpt: null,
        confidence: null,
        origin: 'MANUAL',
        status: 'CONFIRMED',
      })
      .returning()

    return NextResponse.json({ success: true, field: created })
  } catch (err) {
    console.error('Erro ao adicionar campo:', err)
    return NextResponse.json(
      { error: 'Erro ao adicionar campo', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    const fieldId: string = body.fieldId

    if (!fieldId) {
      return NextResponse.json({ error: 'fieldId é obrigatório' }, { status: 400 })
    }

    // Confirma que o campo é realmente deste contrato (não de outro, adivinhado por ID)
    await db
      .delete(extractedFields)
      .where(and(eq(extractedFields.id, fieldId), eq(extractedFields.contractId, id)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro ao remover campo:', err)
    return NextResponse.json(
      { error: 'Erro ao remover campo', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}