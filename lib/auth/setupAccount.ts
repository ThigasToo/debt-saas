import { db } from '@/lib/db'
import { accounts, memberships, users, signupIpLog } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { SIGNUP_BONUS_MICROS } from '@/lib/billing/aiCredits'

const MAX_FREE_SIGNUPS_PER_IP = 3

/**
 * Garante que o usuário tenha uma Account + Membership OWNER. Idempotente.
 * Chamada em dois pontos possíveis: logo após o signUp (quando a confirmação
 * de e-mail está desativada e a sessão já vem pronta) ou no callback de
 * confirmação (quando está ativada e só existe sessão depois do clique no link).
 */
export async function ensureAccountForUser(
  userId: string,
  email: string,
  accountNameHint?: string,
  signupIp?: string | null
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

  // Limite VITALÍCIO por IP (sem janela de tempo) — a partir da 4ª conta criada
  // a partir do mesmo IP, para sempre, novas contas continuam sendo criadas
  // normalmente (nunca bloqueamos o login), só nascem sem o crédito de
  // boas-vindas. Isso tira a graça de farmar contas descartáveis, sem
  // trancar ninguém legítimo fora do produto.
  let bonusMicros = SIGNUP_BONUS_MICROS
  if (signupIp) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(signupIpLog)
      .where(eq(signupIpLog.ip, signupIp))

    if (Number(count) >= MAX_FREE_SIGNUPS_PER_IP) {
      bonusMicros = 0
    }

    await db.insert(signupIpLog).values({ ip: signupIp })
  }

  const accountName = accountNameHint?.trim() || email.split('@')[0] || 'Minha Empresa'
  const [account] = await db
    .insert(accounts)
    .values({ name: accountName, aiCreditsMicros: bonusMicros })
    .returning()
  if (!account) throw new Error('Falha ao criar conta')

  await db.insert(memberships).values({ accountId: account.id, userId, role: 'OWNER' })

  return { accountId: account.id, alreadyExisted: false }
}