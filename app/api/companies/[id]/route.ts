import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companies, contracts } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { id } = await params
    const [owned] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.accountId, session.accountId)))

    if (!owned) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const body = await req.json()
    const updates: { name?: string; documentType?: string; cnpj?: string | null } = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.documentType !== undefined) updates.documentType = body.documentType === 'CPF' ? 'CPF' : 'CNPJ'
    if (body.document !== undefined) updates.cnpj = body.document?.trim() || null

    const [updated] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning()

    return NextResponse.json({ success: true, company: updated })
  } catch (err) {
    console.error('Erro ao editar empresa:', err)
    return NextResponse.json(
      { error: 'Erro ao editar empresa', details: err instanceof Error ? err.message : String(err) },
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
    const [owned] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, id), eq(companies.accountId, session.accountId)))

    if (!owned) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const linkedContracts = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.companyId, id))
    if (linkedContracts.length > 0) {
      return NextResponse.json(
        { error: `Não é possível apagar: ${linkedContracts.length} contrato(s) ainda vinculado(s) a esta empresa.` },
        { status: 400 }
      )
    }

    await db.delete(companies).where(eq(companies.id, id))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro ao apagar empresa:', err)
    return NextResponse.json(
      { error: 'Erro ao apagar empresa', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}