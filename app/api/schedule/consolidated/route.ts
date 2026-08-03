import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { installments, contracts, companies, debtTranches } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const rows = await db
      .select({
        id: installments.id,
        installmentNumber: installments.installmentNumber,
        dueDate: installments.dueDate,
        principalAmount: installments.principalAmount,
        interestAmount: installments.interestAmount,
        totalAmount: installments.totalAmount,
        status: installments.status,
        contractId: installments.contractId,
        trancheId: installments.trancheId,
        companyName: companies.name,
        contractType: contracts.contractType,
        trancheLabel: debtTranches.label,
      })
      .from(installments)
      .innerJoin(contracts, eq(installments.contractId, contracts.id))
      .innerJoin(companies, eq(contracts.companyId, companies.id))
      .leftJoin(debtTranches, eq(installments.trancheId, debtTranches.id))
      .where(eq(companies.accountId, session.accountId))
      .orderBy(asc(installments.dueDate))

    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    let totalPending = 0
    let totalOverdue = 0
    let totalNext30 = 0
    let totalPaid = 0

    for (const row of rows) {
      const due = new Date(row.dueDate)
      if (row.status === 'PAID') {
        totalPaid += row.totalAmount
        continue
      }
      totalPending += row.totalAmount
      if (due < now) totalOverdue += row.totalAmount
      else if (due <= in30Days) totalNext30 += row.totalAmount
    }

    return NextResponse.json({
      installments: rows,
      summary: { totalPending, totalOverdue, totalNext30, totalPaid },
    })
  } catch (err) {
    console.error('Erro ao montar cronograma consolidado:', err)
    return NextResponse.json(
      { error: 'Erro ao montar cronograma consolidado', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}