import crypto from 'node:crypto'

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  '_ga',
  'ref',
  'origin'
])

/**
 * Normaliza uma URL removendo tracking params, hash e padronizando host/protocolo.
 */
export function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    parsed.protocol = parsed.protocol.toLowerCase()
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
    parsed.hash = ''

    // Remove tracking params
    const searchParams = new URLSearchParams(parsed.search)
    for (const key of Array.from(searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        searchParams.delete(key)
      }
    }
    const cleanSearch = searchParams.toString()
    parsed.search = cleanSearch ? `?${cleanSearch}` : ''

    // Remove trailing slash do pathname a menos que seja raiz
    let pathname = parsed.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    parsed.pathname = pathname

    return parsed.toString()
  } catch {
    return rawUrl.trim().toLowerCase()
  }
}

/**
 * Gera um identificador canônico e determinístico (SHA-1) para uma URL e órgão.
 */
export function generateCanonicalId(rawUrl: string, prefix = 'conc'): string {
  const cleanUrl = normalizeCanonicalUrl(rawUrl)
  const hash = crypto.createHash('sha1').update(cleanUrl).digest('hex').slice(0, 16)
  return `${prefix}-${hash}`
}
