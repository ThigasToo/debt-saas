import { db } from '@/lib/db'
import { contracts, companies, debtTranches } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

/** Confirma que o contrato pertence à conta logada */
export async function contractBelongsToAccount(contractId: string, accountId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: contracts.id })
    .from(contracts)
    .innerJoin(companies, eq(contracts.companyId, companies.id))
    .where(and(eq(contracts.id, contractId), eq(companies.accountId, accountId)))
  return !!row
}

/** Confirma que a tranche pertence à conta logada; retorna o contractId dela se sim */
export async function trancheBelongsToAccount(
  trancheId: string,
  accountId: string
): Promise<{ contractId: string } | null> {
  const [row] = await db
    .select({ contractId: debtTranches.contractId })
    .from(debtTranches)
    .innerJoin(contracts, eq(debtTranches.contractId, contracts.id))
    .innerJoin(companies, eq(contracts.companyId, companies.id))
    .where(and(eq(debtTranches.id, trancheId), eq(companies.accountId, accountId)))
  return row ?? null
}