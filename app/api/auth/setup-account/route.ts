import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureAccountForUser } from '@/lib/auth/setupAccount'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const result = await ensureAccountForUser(user.id, user.email ?? '', body.accountName)

    return NextResponse.json({
      success: true,
      accountId: result.accountId,
      alreadyExists: result.alreadyExisted,
    })
  } catch (err) {
    console.error('Erro ao configurar conta:', err)
    return NextResponse.json(
      { error: 'Erro ao configurar conta', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}