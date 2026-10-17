import { BANCAS_REGISTRY, BancaSource } from '../../../shared/constants/sources-registry'
import { ReferenceLink } from '../../../shared/types/concurso'

/**
 * Utilitários de Resolução, Limpeza e Desambiguação de URLs de Fontes
 */

/**
 * Localiza a banca organizadora correspondente no cadastro oficial de 19 bancas
 */
export function findBancaByQueryOrName(queryOrName?: string): BancaSource | undefined {
  if (!queryOrName) return undefined
  const clean = queryOrName.trim().toLowerCase()

  // 1. Busca direta por id ou sigla exata
  for (const b of BANCAS_REGISTRY) {
    if (b.id.toLowerCase() === clean || b.sigla.toLowerCase() === clean) {
      return b
    }
  }

  // 2. Busca por substring no nome
  for (const b of BANCAS_REGISTRY) {
    if (b.name.toLowerCase().includes(clean) || clean.includes(b.sigla.toLowerCase())) {
      return b
    }
  }

  // 3. Busca por regexMatcher da banca
  for (const b of BANCAS_REGISTRY) {
    if (b.regexMatcher.test(queryOrName)) {
      return b
    }
  }

  return undefined
}

/**
 * Obtém a URL oficial prioritária de editais ou portal da banca
 */
export function getOfficialBancaUrl(banca: BancaSource): string {
  return banca.editaisBaseUrls[0] || banca.baseUrl
}

export interface OfficialDossierLinksResult {
  urlCanonica: string
  linksReferencia: ReferenceLink[]
  bancaIdentificada?: BancaSource
}

/**
 * Constrói a estrutura desacoplada de links oficiais e cobertura para o dossiê:
 * - urlCanonica aponta SEMPRE para uma fonte primária institucional (banca oficial ou portal gov).
 * - linksReferencia contém no mínimo 2 fontes válidas.
 * - Fontes de terceiros (agregadores/notícias) recebem tipo: 'NOTICIA' para separação na UI.
 */
export function resolveOfficialDossierLinks(params: {
  orgao: string
  rawTitle?: string
  bancaNameHint?: string
  sourceUrl?: string
  sourceFonte?: string
  isDirectBancaEdital?: boolean
}): OfficialDossierLinksResult {
  const { orgao, rawTitle = '', bancaNameHint = '', sourceUrl = '', sourceFonte = '', isDirectBancaEdital } = params

  // 1. Localiza a banca organizadora no registro oficial
  const matchedBanca =
    findBancaByQueryOrName(bancaNameHint) ||
    findBancaByQueryOrName(rawTitle) ||
    findBancaByQueryOrName(orgao) ||
    findBancaByQueryOrName(sourceFonte)

  const links: ReferenceLink[] = []
  const govSearchUrl = buildOfficialGovSearchUrl(orgao)

  let urlCanonica = ''

  if (isDirectBancaEdital && sourceUrl) {
    // Caso A: Coleta direta da página de editais da banca organizadora
    const bancaUrl = normalizeToAbsoluteHttps(sourceUrl)
    urlCanonica = bancaUrl
    const bancaNome = matchedBanca ? matchedBanca.name : sourceFonte || 'Banca Organizadora'

    links.push({
      id: `ref-banca-${Date.now()}-1`,
      titulo: `Página Oficial do Concurso — ${bancaNome}`,
      url: bancaUrl,
      fonte: bancaNome,
      tipo: 'BANCA'
    })

    links.push({
      id: `ref-gov-${Date.now()}-2`,
      titulo: `Diário Oficial / Portal Governamental — ${orgao}`,
      url: govSearchUrl,
      fonte: 'Governo / Diário Oficial',
      tipo: 'PORTAL_OFICIAL'
    })
  } else {
    // Caso B: Coleta via agregador (PCI, Ache, CNB) ou notícia de apuração
    if (matchedBanca) {
      const officialBancaUrl = getOfficialBancaUrl(matchedBanca)
      urlCanonica = officialBancaUrl

      links.push({
        id: `ref-banca-${Date.now()}-1`,
        titulo: `Portal Oficial da Organizadora — ${matchedBanca.name}`,
        url: officialBancaUrl,
        fonte: matchedBanca.name,
        tipo: 'BANCA'
      })
    } else {
      urlCanonica = govSearchUrl
    }

    // Link oficial institucional do órgão / Diário Oficial
    links.push({
      id: `ref-gov-${Date.now()}-2`,
      titulo: `Busca Oficial no Diário Oficial / Portal Governamental — ${orgao}`,
      url: govSearchUrl,
      fonte: 'Portal Governamental',
      tipo: 'PORTAL_OFICIAL'
    })

    // Link da cobertura jornalística / agregador como fonte secundária
    if (sourceUrl) {
      const cleanSourceUrl = normalizeToAbsoluteHttps(sourceUrl)
      if (cleanSourceUrl && cleanSourceUrl !== urlCanonica && cleanSourceUrl !== govSearchUrl) {
        links.push({
          id: `ref-news-${Date.now()}-3`,
          titulo: `${orgao} — Publicação no ${sourceFonte || 'Portal de Concursos'}`,
          url: cleanSourceUrl,
          fonte: sourceFonte || 'Cobertura Especializada',
          tipo: 'NOTICIA'
        })
      }
    }
  }

  return {
    urlCanonica,
    linksReferencia: links,
    bancaIdentificada: matchedBanca
  }
}

/**
 * Remove entidades HTML comuns que corrompem URLs extraídas de snippets
 */
export function unescapeHtmlEntities(url: string): string {
  if (!url) return ''
  return url
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/gi, '/')
}

/**
 * Tenta decodificar a URL original de um link opaco do Google News RSS
 * (ex: https://news.google.com/rss/articles/CBMi...)
 */
export function decodeGoogleNewsUrl(rawUrl: string, fallbackSourceUrl?: string): string {
  if (!rawUrl) return fallbackSourceUrl || ''

  // Se não for link do Google News, retorna a própria URL
  if (!rawUrl.includes('news.google.com')) {
    return rawUrl
  }

  try {
    // 1. Tenta extrair a URL original codificada em Base64 no token CBMi
    const match = rawUrl.match(/\/articles\/([A-Za-z0-9_-]+)/)
    if (match && match[1]) {
      const base64Str = match[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64Str.padEnd(base64Str.length + ((4 - (base64Str.length % 4)) % 4), '=')
      const decodedBuffer = Buffer.from(padded, 'base64').toString('latin1')

      // Busca padrão de URL http(s) dentro dos bytes decodificados
      const urlMatch = decodedBuffer.match(/(https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+)/)
      if (urlMatch && urlMatch[1]) {
        // Valida se formou uma URL correta
        const extracted = new URL(urlMatch[1]).toString()
        return unescapeHtmlEntities(extracted)
      }
    }
  } catch {
    // Se falhar a decodificação binária, usa fallback
  }

  // 2. Se a decodificação do artigo falhou, usa a URL do portal de notícias da tag <source>
  if (fallbackSourceUrl && fallbackSourceUrl.startsWith('http')) {
    return fallbackSourceUrl
  }

  // 3. Fallback seguro: se for link puro do Google News que 404, não envia link quebrado
  return fallbackSourceUrl || ''
}

/**
 * Normaliza qualquer URL relativa ou ambígua para uma URL absoluta com protocolo HTTPS
 */
export function normalizeToAbsoluteHttps(rawUrl: string, baseUrl?: string): string {
  if (!rawUrl) return ''

  let cleaned = unescapeHtmlEntities(rawUrl.trim())

  // Descarta links que não são páginas web reais
  if (
    cleaned === '#' ||
    cleaned.startsWith('javascript:') ||
    cleaned.startsWith('mailto:') ||
    cleaned.startsWith('tel:')
  ) {
    return ''
  }

  // Trata protocolo relativo //exemplo.com/path
  if (cleaned.startsWith('//')) {
    cleaned = `https:${cleaned}`
  }

  try {
    let finalUrl: URL
    if (baseUrl && !cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      finalUrl = new URL(cleaned, baseUrl)
    } else {
      finalUrl = new URL(cleaned)
    }

    // Força protocolo seguro HTTPS onde aplicável
    if (finalUrl.protocol === 'http:' && !finalUrl.hostname.includes('localhost')) {
      finalUrl.protocol = 'https:'
    }

    // Remove parâmetros de rastreamento de marketing
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'yclid',
      '_ga',
      'mc_cid'
    ]
    for (const param of trackingParams) {
      finalUrl.searchParams.delete(param)
    }

    return finalUrl.toString()
  } catch {
    // Se não for possível parsear como URL válida
    if (baseUrl && cleaned.length > 0) {
      const cleanBase = baseUrl.replace(/\/+$/, '')
      const cleanPath = cleaned.replace(/^\/+/, '')
      return `${cleanBase}/${cleanPath}`
    }
    return ''
  }
}

/**
 * Extrai e limpa a URL canônica real a partir de URLs de redirecionamento
 * (ex: //duckduckgo.com/l/?uddg=https%3A%2F%2F...) e remove parâmetros de rastreio.
 */
export function resolveCanonicalUrl(rawUrl: string, baseUrl?: string): string {
  if (!rawUrl) return ''

  let cleaned = unescapeHtmlEntities(rawUrl.trim())

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

    // Decodifica se for link do Google News
    if (cleaned.includes('news.google.com/rss/articles/')) {
      cleaned = decodeGoogleNewsUrl(cleaned)
    }

    return normalizeToAbsoluteHttps(cleaned, baseUrl)
  } catch {
    return normalizeToAbsoluteHttps(cleaned, baseUrl)
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

/**
 * Gera um link de busca oficial no portal governamental para o órgão
 */
export function buildOfficialGovSearchUrl(orgao: string): string {
  const cleanOrgao = orgao.trim()
  return `https://www.google.com/search?q=${encodeURIComponent(`site:gov.br OR site:jus.br OR site:leg.br concurso "${cleanOrgao}"`)}`
}

