import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { memberships } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface SessionContext {
  userId: string
  accountId: string
}

/**
 * Resolve o usuário autenticado e a conta (account) à qual ele pertence.
 * Retorna null se não houver sessão válida, ou se por algum motivo o
 * usuário não tiver membership (não deveria acontecer, já que
 * /api/auth/setup-account cria isso no cadastro).
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [membership] = await db
    .select({ accountId: memberships.accountId })
    .from(memberships)
    .where(eq(memberships.userId, user.id))

  if (!membership) return null

  return { userId: user.id, accountId: membership.accountId }
}