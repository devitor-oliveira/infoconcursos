import * as cheerio from 'cheerio'
import { RawSearchResult, SearchFilter } from '../../../shared/types/search'
import { buildSanitizedSearchQuery, isResultCurrent } from './query-sanitizer'
import { resolveCanonicalUrl, extractDomainName } from './url-resolver'

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0'
]

/**
 * Realiza o parsing do HTML do DuckDuckGo HTML/Lite e filtra resultados obsoletos.
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

    const title = titleEl.text().replace(/\s+/g, ' ').trim()
    const snippet = snippetEl.text().replace(/\s+/g, ' ').trim()
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
      const title = $(el).text().replace(/\s+/g, ' ').trim()
      const rawHref = $(el).attr('href') || ''
      const url = resolveCanonicalUrl(rawHref)
      const snippet = $(el).closest('tr').next('tr').find('.result-snippet').text().replace(/\s+/g, ' ').trim()

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
 * Executa a busca direta no DuckDuckGo HTML sem necessidade de chaves de API,
 * com retentativa automática e timeout de 6 segundos.
 */
export async function searchDuckDuckGoLite(filter: SearchFilter): Promise<RawSearchResult[]> {
  const { internalQuery } = buildSanitizedSearchQuery(filter)
  const encodedQuery = new URLSearchParams({
    q: internalQuery,
    kl: 'br-pt'
  }).toString()

  const endpoints = [
    `https://html.duckduckgo.com/html/?${encodedQuery}`,
    `https://lite.duckduckgo.com/lite/?${encodedQuery}`
  ]

  for (let attempt = 0; attempt < endpoints.length; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    try {
      const response = await fetch(endpoints[attempt], {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENTS[attempt % USER_AGENTS.length],
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) continue

      const html = await response.text()
      const parsed = parseDuckDuckGoHtml(html)
      if (parsed.length > 0) {
        return parsed.slice(0, 12)
      }
    } catch {
      clearTimeout(timeoutId)
    }
  }

  return []
}
