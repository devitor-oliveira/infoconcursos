/**
 * Extrai e limpa a URL canônica real a partir de URLs de redirecionamento
 * (ex: //duckduckgo.com/l/?uddg=https%3A%2F%2F...) e remove parâmetros de rastreio.
 */
export function resolveCanonicalUrl(rawUrl: string): string {
  if (!rawUrl) return ''

  let cleaned = rawUrl.trim()

  if (cleaned.startsWith('//')) {
    cleaned = `https:${cleaned}`
  }

  try {
    if (cleaned.includes('duckduckgo.com/l/') || cleaned.includes('uddg=')) {
      const urlObj = new URL(cleaned, 'https://duckduckgo.com')
      const uddg = urlObj.searchParams.get('uddg')
      if (uddg) {
        cleaned = decodeURIComponent(uddg)
      }
    }

    const finalUrl = new URL(cleaned)
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']
    for (const param of trackingParams) {
      finalUrl.searchParams.delete(param)
    }

    return finalUrl.toString()
  } catch {
    return cleaned.startsWith('http') ? cleaned : ''
  }
}

export function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return hostname
  } catch {
    return 'Fonte Oficial'
  }
}
