import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contracts, companies } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const result = await db
      .select({
        id: contracts.id,
        status: contracts.status,
        contractType: contracts.contractType,
        createdAt: contracts.createdAt,
        companyName: companies.name,
      })
      .from(contracts)
      .innerJoin(companies, eq(contracts.companyId, companies.id))
      .where(eq(companies.accountId, session.accountId))
      .orderBy(desc(contracts.createdAt))

    return NextResponse.json({ contracts: result })
  } catch (err) {
    console.error('Erro ao listar contratos:', err)
    return NextResponse.json(
      { error: 'Erro ao listar contratos', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}