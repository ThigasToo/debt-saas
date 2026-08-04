interface CachedRate {
  rate: number
  fetchedAt: number
  source: 'bcb' | 'fallback'
}

let cache: CachedRate | null = null
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hora

// Cotação de reserva — só usada se a API do Banco Central estiver fora do ar.
// Atualize de vez em quando pra não ficar muito defasada.
const FALLBACK_RATE = 5.15

function formatBcbDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${mm}-${dd}-${yyyy}`
}

/** Busca a cotação oficial de venda do dólar (PTAX) do Banco Central, com cache e fallback. */
export async function getUsdBrlRate(): Promise<{ rate: number; source: 'bcb' | 'fallback' }> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return { rate: cache.rate, source: cache.source }
  }

  try {
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 dias cobre fim de semana/feriado
    const url =
      `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
      `?@dataInicial='${formatBcbDate(start)}'&@dataFinalCotacao='${formatBcbDate(end)}'&$top=1&$orderby=dataHoraCotacao%20desc&$format=json`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`BCB respondeu ${res.status}`)

    const data = await res.json()
    const latest = data?.value?.[0]
    if (!latest?.cotacaoVenda) throw new Error('Resposta do BCB sem cotação')

    cache = { rate: latest.cotacaoVenda, fetchedAt: Date.now(), source: 'bcb' }
    return { rate: cache.rate, source: 'bcb' }
  } catch (err) {
    console.error('⚠ Falha ao buscar cotação do BCB, usando valor de reserva:', err instanceof Error ? err.message : err)
    cache = { rate: FALLBACK_RATE, fetchedAt: Date.now(), source: 'fallback' }
    return { rate: FALLBACK_RATE, source: 'fallback' }
  }
}