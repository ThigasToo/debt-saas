import { createClient } from '@supabase/supabase-js'

// Client com Service Role Key — bypassa RLS.
// Uso exclusivo em código server-side (rotas de API). NUNCA importar em
// componentes 'use client' ou expor essa key ao navegador.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}

export const CONTRACT_DOCUMENTS_BUCKET = 'contract-documents'