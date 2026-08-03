import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureAccountForUser } from '@/lib/auth/setupAccount'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('Erro ao trocar código por sessão:', error)
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
  }

  try {
    await ensureAccountForUser(data.user.id, data.user.email ?? '')
  } catch (err) {
    // Antes: engolia o erro e mandava pro dashboard mesmo assim (sessão "solta", sem conta).
    // Agora: desloga e manda pro login com um erro explícito, em vez de deixar
    // o usuário preso vendo "não autenticado" em tudo sem entender por quê.
    console.error('Erro ao criar conta após confirmação de e-mail:', err)
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=account_setup_failed`)
  }

  return NextResponse.redirect(`${origin}/`)
}