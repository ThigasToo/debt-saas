import { db } from '@/lib/db'
import { accounts, memberships, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Garante que o usuário tenha uma Account + Membership OWNER. Idempotente.
 * Chamada em dois pontos possíveis: logo após o signUp (quando a confirmação
 * de e-mail está desativada e a sessão já vem pronta) ou no callback de
 * confirmação (quando está ativada e só existe sessão depois do clique no link).
 */
export async function ensureAccountForUser(
  userId: string,
  email: string,
  accountNameHint?: string
): Promise<{ accountId: string; alreadyExisted: boolean }> {
  const existingMembership = await db
    .select({ accountId: memberships.accountId })
    .from(memberships)
    .where(eq(memberships.userId, userId))

  if (existingMembership.length > 0) {
    return { accountId: existingMembership[0].accountId, alreadyExisted: true }
  }

  const existingUser = await db.select().from(users).where(eq(users.id, userId))
  if (existingUser.length === 0) {
    await db.insert(users).values({ id: userId, email, name: null })
  }

  const accountName = accountNameHint?.trim() || email.split('@')[0] || 'Minha Empresa'
  const [account] = await db.insert(accounts).values({ name: accountName }).returning()
  if (!account) throw new Error('Falha ao criar conta')

  await db.insert(memberships).values({ accountId: account.id, userId, role: 'OWNER' })

  return { accountId: account.id, alreadyExisted: false }
}