import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureAccountForUser } from '@/lib/auth/setupAccount'

function resolveOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host')
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https'
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`
  // Fallback — só usado se o proxy não mandar esses headers por algum motivo
  return new URL(req.url).origin
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'
  const origin = resolveOrigin(req)

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
    console.error('Erro ao criar conta após confirmação de e-mail:', err)
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=account_setup_failed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}