import { db } from '@/lib/db'
import { companies, accounts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Hoje o modelo é 1 conta = 1 empresa. Se no futuro uma conta precisar
 * gerenciar dívida de mais de um CNPJ (holding com várias empresas),
 * isso vira uma lista com seletor — por enquanto criamos/reaproveitamos
 * a única empresa da conta automaticamente, sem pedir UUID pro usuário.
 */
export async function getOrCreateCompanyId(accountId: string): Promise<string> {
  const existing = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.accountId, accountId))

  if (existing.length > 0) return existing[0].id

  const [account] = await db.select().from(accounts).where(eq(accounts.id, accountId))

  const [company] = await db
    .insert(companies)
    .values({
      accountId,
      name: account?.name ?? 'Minha Empresa',
    })
    .returning()

  if (!company) throw new Error('Falha ao criar empresa para a conta')
  return company.id
}