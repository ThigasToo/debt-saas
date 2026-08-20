import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { companies, contracts } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        documentType: companies.documentType,
        document: companies.cnpj,
        contractCount: sql<number>`count(${contracts.id})`,
      })
      .from(companies)
      .leftJoin(contracts, eq(contracts.companyId, companies.id))
      .where(eq(companies.accountId, session.accountId))
      .groupBy(companies.id, companies.name, companies.documentType, companies.cnpj)
      .orderBy(companies.name)

    return NextResponse.json({ companies: rows })
  } catch (err) {
    console.error('Erro ao listar empresas:', err)
    return NextResponse.json(
      { error: 'Erro ao listar empresas', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const name: string = (body.name ?? '').trim()
    const documentType: string = body.documentType === 'CPF' ? 'CPF' : 'CNPJ'
    const document: string | null = body.document?.trim() || null

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const [created] = await db
      .insert(companies)
      .values({
        accountId: session.accountId,
        name,
        documentType,
        cnpj: document,
      })
      .returning()

    return NextResponse.json({ success: true, company: created })
  } catch (err) {
    console.error('Erro ao criar empresa:', err)
    return NextResponse.json(
      { error: 'Erro ao criar empresa', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}