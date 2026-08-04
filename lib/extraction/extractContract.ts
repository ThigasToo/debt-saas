import { anthropic, EXTRACTION_MODEL } from '@/lib/anthropic'
import type { ScheduleSpec, DebtTrancheSpec } from '@/lib/finance/scheduleSpec'

export interface ContractProfile {
  modality: string
  bank: string | null
  guaranteeTypes: string[]
  fieldGroups: string[]
}

export interface DynamicField {
  fieldName: string
  fieldLabel: string
  fieldGroup: string
  dataType: 'text' | 'currency' | 'date' | 'percent' | 'number' | 'list'
  fieldValue: string
  sourcePage: number | null
  sourceClause: string | null
  sourceExcerpt: string | null
  confidence: number
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface ExtractionResult {
  profile: ContractProfile
  fields: DynamicField[]
  tranches: DebtTrancheSpec[]
  usage: TokenUsage
}

// Erro que carrega o consumo real de tokens até o ponto da falha — permite debitar
// o custo correto mesmo quando a extração não dá certo (os tokens já foram gastos
// na Anthropic de qualquer forma).
export class ExtractionError extends Error {
  usage: TokenUsage
  constructor(message: string, usage: TokenUsage) {
    super(message)
    this.name = 'ExtractionError'
    this.usage = usage
  }
}

function buildDocumentContent(pdfBase64: string, promptText: string) {
  return [
    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
    { type: 'text', text: promptText },
  ] as any
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

function parseJsonStrict<T>(rawText: string, label: string): T {
  const cleaned = rawText.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch (err) {
    console.error(`Falha ao interpretar (${label}). Fim da resposta recebida:`, cleaned.slice(-500))
    throw new Error(
      `Falha ao interpretar JSON de "${label}" — resposta pode ter sido cortada por limite de tokens: ${err}`
    )
  }
}

function tryRepairTruncatedFieldsArray(raw: string): DynamicField[] | null {
  const arrayStart = raw.indexOf('[')
  if (arrayStart === -1) return null
  const body = raw.slice(arrayStart + 1)
  const objects: string[] = []
  let depth = 0, objStart = -1, inString = false, escaped = false

  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') { if (depth === 0) objStart = i; depth++ }
    if (ch === '}') {
      depth--
      if (depth === 0 && objStart !== -1) {
        objects.push(body.slice(objStart, i + 1))
        objStart = -1
      }
    }
  }
  if (objects.length === 0) return null

  const recovered: DynamicField[] = []
  for (const objStr of objects) {
    try {
      const parsed = JSON.parse(objStr)
      if (parsed.fieldName && parsed.fieldValue !== undefined) recovered.push(parsed)
    } catch {
      // ignora objeto malformado isolado
    }
  }
  return recovered.length > 0 ? recovered : null
}

function parseFieldsResponse(rawText: string, label: string): DynamicField[] {
  const cleaned = rawText.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned) as { fields: DynamicField[] }
    return parsed.fields ?? []
  } catch {
    const repaired = tryRepairTruncatedFieldsArray(cleaned)
    if (repaired) {
      console.warn(`  ⚠ Lote [${label}] veio cortado — recuperados ${repaired.length} campo(s) parciais`)
      return repaired
    }
    throw new Error(`Falha ao interpretar JSON do lote [${label}]`)
  }
}

// ---------- CHAMADA 1: perfil + tranches ----------

const PROFILE_AND_SPEC_PROMPT = `Você é um especialista em contratos financeiros brasileiros (CCB, CPR, FINAME, financiamentos bancários e afins).

Analise o PDF anexado e identifique a modalidade do contrato, o banco/credor, os tipos de garantia, e a(s) linha(s) de crédito (tranches) com suas especificações completas de cálculo.

IMPORTANTE: um contrato pode ter MAIS DE UMA linha de crédito com condições diferentes (ex: recursos equalizáveis vs recursos livres, múltiplas séries, sublimites, tranches). Cada linha de crédito é uma "tranche" e deve ter sua PRÓPRIA especificação de cálculo completa — NUNCA some valores de tranches diferentes nem escolha uma taxa "predominante" para representar todas.

Retorne APENAS um JSON válido (sem texto adicional, sem markdown) com exatamente esta estrutura:

{
  "profile": {
    "modality": "string — tipo do contrato",
    "bank": "string ou null",
    "guaranteeTypes": ["tipos de garantia encontrados"],
    "fieldGroups": ["grupos de campos que fazem sentido para ESTE contrato, ex: Identificação, Condições Financeiras, Garantias, Avalistas, Covenants"]
  },
  "tranches": [
    {
      "label": "nome da linha de crédito, ex: 'Recursos Equalizáveis', 'Recursos Livres', ou 'Principal' se houver só uma",
      "scheduleSpec": {
        "currency": "BRL",
        "disbursements": [{ "date": "AAAA-MM-DD", "amount": numero, "label": "opcional" }],
        "rate": {
          "kind": "FIXED | INDEXED | ZERO",
          "index": "CDI | IPCA | IGPM | SELIC | TR | TJLP | USD | OTHER | null",
          "indexPercent": numero_ou_null,
          "spreadAnnualPercent": numero_ou_null,
          "fixedAnnualPercent": numero_ou_null,
          "dayCount": "BUSINESS_252 | ACTUAL_360 | ACTUAL_365 | MONTHLY_30",
          "assumedIndexAnnualPercent": numero_ou_null
        },
        "amortization": {
          "kind": "SAC | PRICE | BULLET | CONTRACTUAL_TABLE | CUSTOM_PERCENT",
          "periodicity": "MONTHLY | QUARTERLY | SEMIANNUAL | ANNUAL | IRREGULAR",
          "numberOfInstallments": numero_ou_null,
          "firstPaymentDate": "AAAA-MM-DD ou null",
          "finalMaturityDate": "AAAA-MM-DD ou null",
          "grace": { "principalMonths": numero, "interestMonths": numero, "capitalizeInterest": true_ou_false },
          "contractualSchedule": [{ "date": "AAAA-MM-DD", "totalAmount": numero_ou_null, "principalAmount": numero_ou_null, "principalPercent": numero_ou_null }]
        },
        "fees": [{ "label": "nome", "kind": "ONE_OFF | PER_INSTALLMENT | ANNUAL_PERCENT_OF_BALANCE", "amount": numero_ou_null, "percent": numero_ou_null, "date": "AAAA-MM-DD ou null" }],
        "assumptions": [{ "topic": "assunto", "value": "o que foi assumido", "reason": "por que precisou assumir (1 frase)" }],
        "openQuestions": [{ "topic": "assunto", "question": "o que não está claro (1 frase)", "sourcePage": numero_ou_null }],
        "confidence": numero_de_0_a_1,
        "interpretationNotes": "resumo curto (máx 2 frases) de como esta tranche foi interpretada"
      }
    }
  ]
}

REGRAS:
- Se houver apenas uma linha de crédito, retorne um único item em "tranches" com label "Principal" (ou nome equivalente do contrato).
- Se houver múltiplas linhas com taxas, prazos ou formas de pagamento diferentes, crie um item por linha — cada uma com valores próprios, sem misturar.
- Use "contractualSchedule" apenas se o contrato já traz tabela explícita e CURTA de parcelas para aquela tranche. Se for longa, prefira parâmetros de SAC/PRICE.
- Se o indexador tiver projeção futura incerta, preencha "assumedIndexAnnualPercent" com uma estimativa e registre em "assumptions" (1 frase).
- Mantenha "assumptions" e "openQuestions" curtos (1 frase cada, no máx 5 itens por tranche).
- Nunca invente valores — o que não estiver claro vai em "openQuestions".
- Não inclua a lista de campos descritivos aqui, apenas profile e tranches.
- Mantenha "fieldGroups" enxuto (até 8 grupos).
- Seja OBJETIVO — isso é uma especificação técnica.
- NÃO infira carência a partir do intervalo entre a data de assinatura e a data da 1ª parcela. Para periodicidade ANUAL, SEMESTRAL ou TRIMESTRAL, esse intervalo é o tamanho natural do primeiro período (~1 ano, ~6 meses, ~3 meses) e NÃO é evidência de carência por si só. Só marque "grace.principalMonths" > 0 se o contrato afirmar explicitamente um prazo de carência (ex: "carência de X meses/anos para o principal") — não deduza a partir de datas.`

async function extractProfileAndTranches(
  pdfBase64: string
): Promise<{ profile: ContractProfile; tranches: DebtTrancheSpec[]; usage: TokenUsage }> {
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: buildDocumentContent(pdfBase64, PROFILE_AND_SPEC_PROMPT) }],
  })

  const usage: TokenUsage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new ExtractionError('Claude não retornou texto na extração de perfil/tranches', usage)
  }

  try {
    const parsed = parseJsonStrict<{ profile: ContractProfile; tranches: DebtTrancheSpec[] }>(
      textBlock.text,
      'profile + tranches'
    )
    return { ...parsed, usage }
  } catch (err) {
    throw new ExtractionError(err instanceof Error ? err.message : String(err), usage)
  }
}

// ---------- CHAMADA 2+: campos dinâmicos, em lotes de grupos ----------

const GROUPS_PER_BATCH = 3

function buildFieldsPrompt(profile: ContractProfile, groupsBatch: string[]): string {
  return `Você é um especialista em contratos financeiros brasileiros. Este contrato já foi classificado como:
- Modalidade: ${profile.modality}
- Banco/Credor: ${profile.bank ?? 'não identificado'}
- Garantias: ${profile.guaranteeTypes.join(', ') || 'nenhuma identificada'}

Extraia os campos relevantes APENAS destes grupos (ignore os demais, serão extraídos em outra etapa):
${groupsBatch.map((g) => `- ${g}`).join('\n')}

Retorne APENAS um JSON válido (sem texto adicional, sem markdown) neste formato:

{
  "fields": [
    {
      "fieldName": "chave_tecnica_snake_case",
      "fieldLabel": "Rótulo legível em português",
      "fieldGroup": "um dos grupos listados acima, EXATAMENTE como escrito",
      "dataType": "text | currency | date | percent | number | list",
      "fieldValue": "valor extraído como string",
      "sourcePage": numero_da_pagina_ou_null,
      "sourceClause": "cláusula ou null",
      "sourceExcerpt": "trecho curto, até 12 palavras, ou null",
      "confidence": numero_de_0_a_1
    }
  ]
}

REGRAS:
- Nunca invente valores. Se não encontrar, não inclua o campo.
- Se o mesmo tipo de dado aparecer mais de uma vez com valores diferentes (ex: taxas de tranches distintas), crie campos separados com nomes distintos.`
}

async function extractFieldsForBatch(
  pdfBase64: string,
  profile: ContractProfile,
  groupsBatch: string[]
): Promise<{ fields: DynamicField[]; usage: TokenUsage }> {
  const response = await anthropic.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildDocumentContent(pdfBase64, buildFieldsPrompt(profile, groupsBatch)) }],
  })

  const usage: TokenUsage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    console.error(`  ✗ Lote [${groupsBatch.join(', ')}] sem texto na resposta`)
    return { fields: [], usage }
  }

  try {
    return { fields: parseFieldsResponse(textBlock.text, groupsBatch.join(', ')), usage }
  } catch (err) {
    console.error(`  ✗ Lote [${groupsBatch.join(', ')}] falhou ao interpretar:`, err instanceof Error ? err.message : err)
    return { fields: [], usage }
  }
}

async function extractFields(
  pdfBase64: string,
  profile: ContractProfile
): Promise<{ fields: DynamicField[]; usage: TokenUsage }> {
  const batches = chunkArray(profile.fieldGroups, GROUPS_PER_BATCH)
  console.log(`  → ${batches.length} lote(s) de grupos, ${GROUPS_PER_BATCH} grupo(s) por lote`)

  const results = await Promise.all(
    batches.map((batch, idx) =>
      extractFieldsForBatch(pdfBase64, profile, batch).catch((err) => {
        // Só cai aqui se a chamada à API nem chegou a responder (ex: erro de rede) —
        // nesse caso não há uso real pra cobrar.
        console.error(`  ✗ Lote ${idx + 1} falhou [${batch.join(', ')}]:`, err.message)
        return { fields: [] as DynamicField[], usage: { inputTokens: 0, outputTokens: 0 } }
      })
    )
  )

  const fields = results.flatMap((r) => r.fields)
  const usage = results.reduce(
    (acc, r) => ({
      inputTokens: acc.inputTokens + r.usage.inputTokens,
      outputTokens: acc.outputTokens + r.usage.outputTokens,
    }),
    { inputTokens: 0, outputTokens: 0 }
  )
  return { fields, usage }
}

// ---------- Ponto de entrada público ----------

export async function extractContractData(pdfBase64: string): Promise<ExtractionResult> {
  console.log('  → Chamada 1: perfil + tranches...')
  const { profile, tranches, usage: profileUsage } = await extractProfileAndTranches(pdfBase64)

  console.log(`  → Perfil: ${profile.modality} • ${tranches.length} tranche(s): ${tranches.map((t) => t.label).join(', ')}`)
  const { fields, usage: fieldsUsage } = await extractFields(pdfBase64, profile)
  console.log(`  → ${fields.length} campos extraídos no total`)

  return {
    profile,
    fields,
    tranches,
    usage: {
      inputTokens: profileUsage.inputTokens + fieldsUsage.inputTokens,
      outputTokens: profileUsage.outputTokens + fieldsUsage.outputTokens,
    },
  }
}