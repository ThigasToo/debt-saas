import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  contracts,
  extractedFields,
  companies,
  contractDocuments,
  debtTranches,
  installments,
} from '@/lib/db/schema'
import { eq, asc, and } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'

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
    if (!id) {
      return NextResponse.json({ error: 'ID do contrato não fornecido' }, { status: 400 })
    }

    const [contract] = await db
      .select({
        id: contracts.id,
        status: contracts.status,
        contractType: contracts.contractType,
        profile: contracts.profile,
        scheduleSpec: contracts.scheduleSpec,
        createdAt: contracts.createdAt,
        companyId: contracts.companyId,
        companyName: companies.name,
        companyCnpj: companies.cnpj,
        accountId: companies.accountId,
      })
      .from(contracts)
      .innerJoin(companies, eq(contracts.companyId, companies.id))
      .where(eq(contracts.id, id))

    if (!contract || contract.accountId !== session.accountId) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const fields = await db
      .select()
      .from(extractedFields)
      .where(eq(extractedFields.contractId, id))
      .orderBy(asc(extractedFields.displayOrder))

    const { accountId, ...contractResponse } = contract
    return NextResponse.json({ contract: contractResponse, fields })
  } catch (err) {
    console.error('Erro ao buscar contrato:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar contrato', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

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
    const body = await req.json()
    const newCompanyId: string | undefined = body.companyId

    if (!newCompanyId) {
      return NextResponse.json({ error: 'companyId é obrigatório' }, { status: 400 })
    }

    // Confirma que o contrato pertence à conta logada
    const [contractOwned] = await db
      .select({ id: contracts.id, accountId: companies.accountId })
      .from(contracts)
      .innerJoin(companies, eq(contracts.companyId, companies.id))
      .where(eq(contracts.id, id))

    if (!contractOwned || contractOwned.accountId !== session.accountId) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    // Confirma que a empresa de destino também pertence à mesma conta
    // (evita que alguém mova um contrato pra uma empresa de outra conta)
    const [targetCompany] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, newCompanyId), eq(companies.accountId, session.accountId)))

    if (!targetCompany) {
      return NextResponse.json({ error: 'Empresa de destino não encontrada' }, { status: 404 })
    }

    await db.update(contracts).set({ companyId: newCompanyId, updatedAt: new Date() }).where(eq(contracts.id, id))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro ao reatribuir contrato:', err)
    return NextResponse.json(
      { error: 'Erro ao reatribuir contrato', details: err instanceof Error ? err.message : String(err) },
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
    if (!id) {
      return NextResponse.json({ error: 'ID do contrato não fornecido' }, { status: 400 })
    }

    const [owned] = await db
      .select({ id: contracts.id, accountId: companies.accountId })
      .from(contracts)
      .innerJoin(companies, eq(contracts.companyId, companies.id))
      .where(and(eq(contracts.id, id), eq(companies.accountId, session.accountId)))

    if (!owned) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    await db.delete(installments).where(eq(installments.contractId, id))
    await db.delete(debtTranches).where(eq(debtTranches.contractId, id))
    await db.delete(extractedFields).where(eq(extractedFields.contractId, id))
    await db.delete(contractDocuments).where(eq(contractDocuments.contractId, id))
    await db.delete(contracts).where(eq(contracts.id, id))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro ao apagar contrato:', err)
    return NextResponse.json(
      { error: 'Erro ao apagar contrato', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}