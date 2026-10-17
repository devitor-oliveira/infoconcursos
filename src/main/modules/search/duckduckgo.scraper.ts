import * as cheerio from 'cheerio'
import { RawSearchResult, SearchFilter } from '../../../shared/types/search'
import { buildSanitizedSearchQuery, isResultCurrent } from './query-sanitizer'
import { resolveCanonicalUrl, extractDomainName } from './url-resolver'
import { fetchHtmlWithSafety } from './http-client'
import { anonymizeText } from '../../../shared/utils/anonymizer'

/**
 * Realiza o parsing do HTML do DuckDuckGo HTML/Lite, filtra resultados obsoletos
 * e anonimiza eventuais dados pessoais presentes em snippets (LGPD).
 */
export function parseDuckDuckGoHtml(html: string): RawSearchResult[] {
  const $ = cheerio.load(html)
  const results: RawSearchResult[] = []
  const seenUrls = new Set<string>()

  // Seletores para html.duckduckgo.com/html/
  $('.result, .web-result').each((_, element) => {
    const titleEl = $(element).find('.result__a, a.result-link').first()
    const snippetEl = $(element).find('.result__snippet, .result-snippet').first()
    const rawHref = titleEl.attr('href') || ''

    const title = anonymizeText(titleEl.text().replace(/\s+/g, ' ').trim(), 'SCRAPED_TEXT')
    const snippet = anonymizeText(snippetEl.text().replace(/\s+/g, ' ').trim(), 'SCRAPED_TEXT')
    const url = resolveCanonicalUrl(rawHref)

    if (!title || !url || seenUrls.has(url)) return
    if (url.includes('duckduckgo.com')) return

    if (isResultCurrent(title, snippet)) {
      seenUrls.add(url)
      results.push({
        title,
        url,
        snippet,
        sourceDomain: extractDomainName(url)
      })
    }
  })

  // Fallback para tabela lite.duckduckgo.com/lite/ se necessário
  if (results.length === 0) {
    $('a.result-link').each((_, el) => {
      const title = anonymizeText($(el).text().replace(/\s+/g, ' ').trim(), 'SCRAPED_TEXT')
      const rawHref = $(el).attr('href') || ''
      const url = resolveCanonicalUrl(rawHref)
      const snippet = anonymizeText(
        $(el).closest('tr').next('tr').find('.result-snippet').text().replace(/\s+/g, ' ').trim(),
        'SCRAPED_TEXT'
      )

      if (title && url && !seenUrls.has(url) && isResultCurrent(title, snippet)) {
        seenUrls.add(url)
        results.push({
          title,
          url,
          snippet: snippet || title,
          sourceDomain: extractDomainName(url)
        })
      }
    })
  }

  return results
}

/**
 * Executa uma consulta individual contra os endpoints HTML e Lite do DuckDuckGo.
 */
async function executeDuckDuckGoRequest(query: string, timeoutMs = 6000): Promise<RawSearchResult[]> {
  const encodedQuery = new URLSearchParams({
    q: query,
    kl: 'br-pt'
  }).toString()

  const endpoints = [
    `https://html.duckduckgo.com/html/?${encodedQuery}`,
    `https://lite.duckduckgo.com/lite/?${encodedQuery}`
  ]

  for (let attempt = 0; attempt < endpoints.length; attempt++) {
    const res = await fetchHtmlWithSafety(endpoints[attempt], { timeoutMs })
    if (!res) continue

    const parsed = parseDuckDuckGoHtml(res.html)
    if (parsed.length > 0) {
      return parsed
    }
  }

  return []
}

/**
 * Executa a busca direta no DuckDuckGo HTML sem necessidade de chaves de API,
 * combinando a query principal com fallback estruturado em Dorks de Bancas/Gov e Portais.
 */
export async function searchDuckDuckGoLite(filter: SearchFilter): Promise<RawSearchResult[]> {
  const { internalQuery, bancasDorkQuery, portaisDorkQuery, targetContext } =
    buildSanitizedSearchQuery(filter)

  const aggregated: RawSearchResult[] = []
  const seenUrls = new Set<string>()

  const appendUnique = (items: RawSearchResult[]): void => {
    for (const item of items) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url)
        aggregated.push(item)
      }
    }
  }

  // 1. Consulta primária com âncoras temporais e filtros de exclusão
  const primaryResults = await executeDuckDuckGoRequest(internalQuery, 6000)
  appendUnique(primaryResults)

  // 2. Enriquecimento com Dork de Bancas e Diários Oficiais (.gov.br / .jus.br) quando busca for específica ou escassa
  if (bancasDorkQuery && (aggregated.length < 4 || targetContext === 'SPECIFIC_CONCURSO')) {
    const bancaResults = await executeDuckDuckGoRequest(bancasDorkQuery, 5000)
    appendUnique(bancaResults)
  }

  // 3. Contingência em Portais Especializados caso nenhuma das etapas anteriores retorne resultados
  if (portaisDorkQuery && aggregated.length === 0) {
    const portalResults = await executeDuckDuckGoRequest(portaisDorkQuery, 5000)
    appendUnique(portalResults)
  }

  return aggregated.slice(0, 12)
}
