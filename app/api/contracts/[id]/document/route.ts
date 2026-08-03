import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contractDocuments } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'
import { contractBelongsToAccount } from '@/lib/auth/ownership'
import { createSupabaseAdminClient, CONTRACT_DOCUMENTS_BUCKET } from '@/lib/supabase/admin'

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
    const owns = await contractBelongsToAccount(id, session.accountId)
    if (!owns) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    const [doc] = await db
      .select()
      .from(contractDocuments)
      .where(eq(contractDocuments.contractId, id))

    if (!doc) {
      return NextResponse.json({ error: 'Nenhum PDF encontrado para este contrato' }, { status: 404 })
    }

    const supabaseAdmin = createSupabaseAdminClient()
    const { data, error } = await supabaseAdmin.storage
      .from(CONTRACT_DOCUMENTS_BUCKET)
      .createSignedUrl(doc.storagePath, 60) // válido por 60s — só o suficiente pra abrir na hora

    if (error || !data) {
      console.error('Erro ao gerar signed URL:', error)
      return NextResponse.json({ error: 'Erro ao gerar link do PDF' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl, fileName: doc.fileName })
  } catch (err) {
    console.error('Erro ao buscar documento:', err)
    return NextResponse.json(
      { error: 'Erro ao buscar documento', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}