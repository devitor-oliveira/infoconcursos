import * as cheerio from 'cheerio'
import { NewsItem } from '../../../shared/types/news'
import { ConcursoArea, ConcursoStatus } from '../../../shared/types/concurso'
import { isResultCurrent } from '../search/query-sanitizer'
import { fetchHtmlWithSafety } from '../search/http-client'
import { generateCanonicalId } from '../search/id-generator'
import { decodeGoogleNewsUrl } from '../search/url-resolver'

export function parseSafeIsoDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString()
  try {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function inferArea(text: string): ConcursoArea {
  const lower = text.toLowerCase()
  if (/\b(banco|caixa|bndes|bacen|banrisul|banese|brb|escritur[aá]rio)\b/.test(lower)) return 'BANCARIA'
  if (/\b(trt|tre|trf|tj|tribunal|mpu|mpf|defensoria|judici[aá]rio|juiz)\b/.test(lower)) return 'TRIBUNAIS'
  if (/\b(pol[ií]cia|pf|prf|pm|pc|guarda municipal|penal|delegado|agente\s+de\s+pol)\b/.test(lower)) return 'POLICIAL'
  if (/\b(sefaz|receita\s+federal|iss|tcu|tce|cgu|auditor\s+fiscal|fisco)\b/.test(lower)) return 'FISCAL_CONTROLE'
  if (/\b(ti|tecnologia\s+da\s+informa|serpro|dataprev|desenvolvimento)\b/.test(lower)) return 'TI'
  if (/\b(educa[cç][aã]o|professor|if[a-z]{2}|universidade|uf[a-z]{2}|cefet)\b/.test(lower)) return 'EDUCACAO'
  if (/\b(sa[uú]de|ebserh|anvisa|enfermeiro|m[eé]dico|hospital|hob)\b/.test(lower)) return 'SAUDE'
  return 'ADMINISTRATIVA'
}

function inferUf(text: string): string {
  const match = text.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/)
  if (match) return match[1]
  if (/\b(minas\s+gerais|belo\s+horizonte|contagem|betim|uberl[aâ]ndia|juiz\s+de\s+fora)\b/i.test(text)) return 'MG'
  if (/\b(s[aã]o\s+paulo|campinas|guarulhos)\b/i.test(text)) return 'SP'
  if (/\b(rio\s+de\s+janeiro|niter[oó]i)\b/i.test(text)) return 'RJ'
  if (/\b(bras[ií]lia)\b/i.test(text)) return 'DF'
  return 'BR'
}

function inferStatus(text: string): ConcursoStatus {
  const lower = text.toLowerCase()
  if (/\b(inscri[cç][oõ]es abertas|abre inscri[cç][oõ]es|abriu inscri[cç][oõ]es)\b/.test(lower)) return 'INSCRICOES_ABERTAS'
  if (/\b(edital publicado|saiu edital|publica edital)\b/.test(lower)) return 'EDITAL_PUBLICADO'
  if (/\b(banca definida|contratada)\b/.test(lower)) return 'BANCA_DEFINIDA'
  if (/\b(comiss[aã]o formada|institui comiss[aã]o)\b/.test(lower)) return 'COMISSAO_FORMADA'
  if (/\b(autorizado|autoriza[cç][aã]o)\b/.test(lower)) return 'AUTORIZADO'
  return 'PREVISTO'
}

/**
 * 1. Parser do Sitemap de Notícias do Ache Concursos
 */
export function parseAcheConcursosNewsSitemapXml(xml: string): NewsItem[] {
  const $ = cheerio.load(xml, { xmlMode: true })
  const items: NewsItem[] = []

  $('url').each((_, el) => {
    const loc = $(el).find('loc').text().trim()
    const title = $(el).find('news\\:title, title').text().trim()
    const rawDate = $(el).find('news\\:publication_date').text().trim()
    const pubDate = parseSafeIsoDate(rawDate)
    const keywords = $(el).find('news\\:keywords').text().toLowerCase()

    if (keywords.includes('beneficios-sociais') || keywords.includes('loterias') || keywords.includes('bolsa-familia')) {
      return
    }

    if (!title || !loc || !isResultCurrent(title, keywords, pubDate)) return

    const combinedText = `${title} ${keywords}`
    items.push({
      id: generateCanonicalId(loc, 'sm-ache'),
      titulo: title,
      resumo: `Publicação apurada pelo Ache Concursos em ${new Date(pubDate).toLocaleDateString('pt-BR')}: ${title}`,
      url: loc,
      portalFonte: 'Ache Concursos',
      dataPublicacao: pubDate,
      area: inferArea(combinedText),
      uf: inferUf(combinedText),
      statusRelacionado: inferStatus(combinedText),
      orgaoRelacionado: title.split(/[-–—:]/)[0]?.trim().slice(0, 50) || 'Órgão Público',
      tipoConteudo: 'NOTICIA_APURACAO'
    })
  })

  return items.slice(0, 20)
}

export async function scrapeAcheConcursosNewsSitemap(): Promise<NewsItem[]> {
  const res = await fetchHtmlWithSafety('https://www.acheconcursos.com.br/sm-news.xml')
  if (!res) return []
  return parseAcheConcursosNewsSitemapXml(res.html)
}

/**
 * 2. Parser do Feed RSS do Blog Gran Cursos Online
 */
export function parseGranCursosRssXml(xml: string): NewsItem[] {
  const $ = cheerio.load(xml, { xmlMode: true })
  const items: NewsItem[] = []

  $('item').each((_, el) => {
    const title = $(el).find('title').first().text().replace(/\s+/g, ' ').trim()
    const link = $(el).find('link').first().text().trim()
    const pubDate = parseSafeIsoDate($(el).find('pubDate').first().text().trim())
    const descRaw = $(el).find('description').first().text().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    const categories: string[] = []
    $(el).find('category').each((__, cat) => {
      categories.push($(cat).text().trim())
    })
    const catStr = categories.join(' ')

    if (!title || !link || !isResultCurrent(title, `${descRaw} ${catStr}`, pubDate)) return

    const combined = `${title} ${descRaw} ${catStr}`
    items.push({
      id: generateCanonicalId(link, 'gran'),
      titulo: title,
      resumo: descRaw.length > 20 ? descRaw.slice(0, 240) : `Cobertura editorial do Gran Cursos: ${title}`,
      url: link,
      portalFonte: 'Gran Cursos Online',
      dataPublicacao: pubDate,
      area: inferArea(combined),
      uf: inferUf(combined),
      statusRelacionado: inferStatus(combined),
      orgaoRelacionado: title.split(/[-–—:]/)[0]?.trim().slice(0, 50) || 'Órgão Público',
      tipoConteudo: 'NOTICIA_APURACAO'
    })
  })

  return items.slice(0, 20)
}

export async function scrapeGranCursosRss(): Promise<NewsItem[]> {
  const res = await fetchHtmlWithSafety('https://blog.grancursosonline.com.br/feed/')
  if (!res) return []
  return parseGranCursosRssXml(res.html)
}

/**
 * 3. Parser do RSS do Concursos no Brasil
 */
export function parseConcursosNoBrasilRssXml(xml: string): NewsItem[] {
  const $ = cheerio.load(xml, { xmlMode: true })
  const items: NewsItem[] = []

  $('item').each((_, el) => {
    const title = $(el).find('title').first().text().replace(/\s+/g, ' ').trim()
    const link = $(el).find('link').first().text().trim()
    const pubDate = parseSafeIsoDate($(el).find('pubDate').first().text().trim())
    const desc = $(el).find('description').first().text().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    if (!title || !link || !isResultCurrent(title, desc, pubDate)) return

    const combined = `${title} ${desc}`
    items.push({
      id: generateCanonicalId(link, 'cnb-rss'),
      titulo: title,
      resumo: desc.length > 20 ? desc.slice(0, 240) : `Publicação de Concursos no Brasil: ${title}`,
      url: link,
      portalFonte: 'Concursos no Brasil',
      dataPublicacao: pubDate,
      area: inferArea(combined),
      uf: inferUf(combined),
      statusRelacionado: inferStatus(combined),
      orgaoRelacionado: title.split(/[-–—:]/)[0]?.trim().slice(0, 50) || 'Órgão Público',
      tipoConteudo: 'NOTICIA_APURACAO'
    })
  })

  return items.slice(0, 20)
}

export async function scrapeConcursosNoBrasilRss(): Promise<NewsItem[]> {
  const res = await fetchHtmlWithSafety('https://concursosnobrasil.com/feed/')
  if (!res) return []
  return parseConcursosNoBrasilRssXml(res.html)
}

/**
 * 4. Parser do Feed RSS Oficial do Instituto Selecon
 */
export function parseSeleconRssXml(xml: string): NewsItem[] {
  const $ = cheerio.load(xml, { xmlMode: true })
  const items: NewsItem[] = []

  $('item').each((_, el) => {
    const title = $(el).find('title').first().text().replace(/\s+/g, ' ').trim()
    const link = $(el).find('link').first().text().trim()
    const pubDate = parseSafeIsoDate($(el).find('pubDate').first().text().trim())

    if (!title || !link || !isResultCurrent(title, '', pubDate)) return

    items.push({
      id: generateCanonicalId(link, 'selecon-rss'),
      titulo: title,
      resumo: `Ato de concurso publicado no mural do Instituto Selecon: ${title}`,
      url: link,
      portalFonte: 'Instituto Selecon',
      dataPublicacao: pubDate,
      area: inferArea(title),
      uf: inferUf(title),
      statusRelacionado: inferStatus(title),
      orgaoRelacionado: title.split(/[-–—:]/)[0]?.trim().slice(0, 50) || 'Instituto Selecon',
      tipoConteudo: 'EDITAL_CONCRETO'
    })
  })

  return items.slice(0, 10)
}

export async function scrapeSeleconRss(): Promise<NewsItem[]> {
  const res = await fetchHtmlWithSafety('https://selecon.org.br/concursos/feed/')
  if (!res) return []
  return parseSeleconRssXml(res.html)
}

/**
 * 5. Agregador de Busca Jornalística via Google News RSS Search
 */
export function parseGoogleNewsRssXml(xml: string, defaultTerm?: string): NewsItem[] {
  const $ = cheerio.load(xml, { xmlMode: true })
  const items: NewsItem[] = []

  $('item').each((_, el) => {
    const title = $(el).find('title').first().text().replace(/\s+/g, ' ').trim()
    const rawLink = $(el).find('link').first().text().trim()
    const pubDate = parseSafeIsoDate($(el).find('pubDate').first().text().trim())
    const sourceEl = $(el).find('source').first()
    const source = sourceEl.text().trim() || 'Portal de Notícias'
    const sourceUrl = sourceEl.attr('url') || ''

    // Decodifica a URL real para evitar o token opaco do Google News que gera 404
    const link = decodeGoogleNewsUrl(rawLink, sourceUrl)

    if (!title || !link || !isResultCurrent(title, source, pubDate)) return

    const combined = `${title} ${source}`
    items.push({
      id: generateCanonicalId(link, 'gnews'),
      titulo: title,
      resumo: `Cobertura apurada por ${source} em ${new Date(pubDate).toLocaleDateString('pt-BR')}: ${title}`,
      url: link,
      portalFonte: source,
      dataPublicacao: pubDate,
      area: inferArea(combined),
      uf: inferUf(combined),
      statusRelacionado: inferStatus(combined),
      orgaoRelacionado: title.split(/[-–—:]/)[0]?.trim().slice(0, 50) || defaultTerm || 'Órgão Público',
      tipoConteudo: 'NOTICIA_APURACAO'
    })
  })

  return items.slice(0, 15)
}

export async function searchGoogleNewsRss(query: string): Promise<NewsItem[]> {
  const cleanTerm = query.trim()
  if (!cleanTerm) return []

  const targetUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanTerm + ' concurso')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
  const res = await fetchHtmlWithSafety(targetUrl)
  if (!res) return []
  return parseGoogleNewsRssXml(res.html, cleanTerm)
}

/**
 * Agregador geral de Feeds e Sitemaps de Notícias (Tempo Real)
 */
export async function aggregateLiveNewsFromFeeds(): Promise<NewsItem[]> {
  const [acheNews, granNews, cnbNews, seleconNews] = await Promise.allSettled([
    scrapeAcheConcursosNewsSitemap(),
    scrapeGranCursosRss(),
    scrapeConcursosNoBrasilRss(),
    scrapeSeleconRss()
  ])

  const allItems: NewsItem[] = []
  if (acheNews.status === 'fulfilled') allItems.push(...acheNews.value)
  if (granNews.status === 'fulfilled') allItems.push(...granNews.value)
  if (cnbNews.status === 'fulfilled') allItems.push(...cnbNews.value)
  if (seleconNews.status === 'fulfilled') allItems.push(...seleconNews.value)

  const seen = new Set<string>()
  const unique = allItems.filter((item) => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })

  return unique.sort((a, b) => new Date(b.dataPublicacao).getTime() - new Date(a.dataPublicacao).getTime())
}
