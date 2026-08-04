import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contracts, contractDocuments, extractedFields, debtTranches, companies } from '@/lib/db/schema'
import { extractContractData } from '@/lib/extraction/extractContract'
import { eq, and } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'
import { getOrCreateCompanyId } from '@/lib/auth/company'
import { createSupabaseAdminClient, CONTRACT_DOCUMENTS_BUCKET } from '@/lib/supabase/admin'

async function resolveCompanyId(accountId: string, requestedCompanyId: string | null): Promise<string> {
  if (requestedCompanyId) {
    const [owned] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, requestedCompanyId), eq(companies.accountId, accountId)))
    if (owned) return owned.id
  }
  return getOrCreateCompanyId(accountId)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const requestedCompanyId = (formData.get('companyId') as string | null) || null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
    }
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Apenas arquivos PDF' }, { status: 400 })
    }

    const companyId = await resolveCompanyId(session.accountId, requestedCompanyId)

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`📄 Processando: ${file.name} (${buffer.length} bytes)`)

    const [contract] = await db
      .insert(contracts)
      .values({ companyId, status: 'PROCESSING' })
      .returning()
    if (!contract) throw new Error('Falha ao criar contrato')
    console.log(`✓ Contrato criado: ${contract.id}`)

    // Sobe o PDF pro Storage antes de qualquer outra coisa
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${session.accountId}/${contract.id}/${safeFileName}`

    const supabaseAdmin = createSupabaseAdminClient()
    const { error: uploadError } = await supabaseAdmin.storage
      .from(CONTRACT_DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('❌ Erro ao subir PDF pro Storage:', uploadError)
      await db.delete(contracts).where(eq(contracts.id, contract.id))
      return NextResponse.json({ error: 'Erro ao salvar o arquivo PDF' }, { status: 500 })
    }
    console.log(`✓ PDF salvo no Storage: ${storagePath}`)

    await db.insert(contractDocuments).values({
      contractId: contract.id,
      fileName: file.name,
      storagePath,
      mimeType: file.type || 'application/pdf',
      sizeBytes: buffer.length,
    })

    // A partir daqui o contrato já existe e o PDF já está salvo — se a extração
    // falhar, marcamos FAILED em vez de deixar preso em PROCESSING pra sempre.
    try {
      console.log(`🤖 Extraindo perfil, tranches e campos...`)
      const pdfBase64 = buffer.toString('base64')
      const result = await extractContractData(pdfBase64)

      if (result.fields.length > 0) {
        await db.insert(extractedFields).values(
          result.fields.map((f, idx) => ({
            contractId: contract.id,
            fieldName: f.fieldName,
            fieldLabel: f.fieldLabel,
            fieldGroup: f.fieldGroup,
            dataType: f.dataType,
            displayOrder: idx,
            fieldValue: f.fieldValue,
            sourcePage: f.sourcePage,
            sourceClause: f.sourceClause,
            sourceExcerpt: f.sourceExcerpt,
            confidence: f.confidence,
            origin: 'AI' as const,
            status: 'PENDING_REVIEW' as const,
          }))
        )
      }

      if (result.tranches.length > 0) {
        await db.insert(debtTranches).values(
          result.tranches.map((t) => ({
            contractId: contract.id,
            label: t.label,
            scheduleSpec: t.scheduleSpec,
          }))
        )
      }

      await db
        .update(contracts)
        .set({
          status: 'PENDING_REVIEW',
          profile: result.profile,
          contractType: result.profile.modality,
        })
        .where(eq(contracts.id, contract.id))

      console.log(`✓ Pronto para revisão (${result.tranches.length} tranche(s))`)

      return NextResponse.json({
        success: true,
        contractId: contract.id,
        profile: result.profile,
        fieldsExtracted: result.fields.length,
        tranches: result.tranches.map((t) => ({ label: t.label, confidence: t.scheduleSpec.confidence })),
      })
    } catch (extractionErr) {
      const message = extractionErr instanceof Error ? extractionErr.message : String(extractionErr)
      console.error('❌ Erro na extração:', extractionErr)

      await db
        .update(contracts)
        .set({ status: 'FAILED', errorMessage: message.slice(0, 500), updatedAt: new Date() })
        .where(eq(contracts.id, contract.id))

      return NextResponse.json(
        { error: 'Não foi possível extrair os dados desse PDF', details: message, contractId: contract.id },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('❌ Erro:', err)
    return NextResponse.json(
      { error: 'Erro ao processar', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}