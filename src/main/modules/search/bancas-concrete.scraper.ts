import * as cheerio from 'cheerio'
import { ConcreteScrapedConcurso } from './portals-concrete.scraper'
import { isResultCurrent } from './query-sanitizer'
import { fetchHtmlWithSafety } from './http-client'
import { generateCanonicalId } from './id-generator'

/**
 * Parser síncrono para a plataforma Selecao.net.br (Fundep, Access, IBFC, Selecon)
 */
export function parseSelecaoNetHtml(
  html: string,
  baseUrl: string,
  bancaNome: string,
  defaultUf: string
): ConcreteScrapedConcurso[] {
  const $ = cheerio.load(html)
  const items: ConcreteScrapedConcurso[] = []

  $('a[href*="/informacoes/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    let fullHref = href
    try {
      fullHref = new URL(href, baseUrl).toString()
    } catch {
      fullHref = `${baseUrl.replace(/\/+$/, '')}/${href.replace(/^\/+/, '')}`
    }

    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (!text || text.length < 5) return

    const parentContainer = $(el).closest('li, .item, .card, div')
    const vagasText = parentContainer.find('.vagas, [class*="vaga"]').text().replace(/\s+/g, ' ').trim()

    let vagas = ''
    const vm = vagasText.match(/\b(\d+\s*(?:vagas?(?:\s+imediatas)?|imediatas)|\bCR\b)\b/i)
    if (vm) vagas = vm[1]

    const orgao = text.split(/[-–—]/)[0]?.trim() || text

    if (isResultCurrent(orgao, `${text} ${vagasText}`)) {
      items.push({
        id: generateCanonicalId(fullHref, 'selnet'),
        orgao,
        titulo: text,
        uf: defaultUf,
        vagas: vagas || (vagasText ? vagasText.slice(0, 40) : 'A definir no edital'),
        remuneracao: 'Não especificado na publicação',
        prazoInscricao: 'Inscrições abertas / em andamento',
        url: fullHref,
        fonte: bancaNome,
        bancaNome
      })
    }
  })

  return items.slice(0, 10)
}

export async function scrapeSelecaoNetPlatform(
  baseUrl: string,
  bancaNome: string,
  defaultUf: string
): Promise<ConcreteScrapedConcurso[]> {
  const abertosUrl = `${baseUrl.replace(/\/+$/, '')}/index/abertos/`
  let res = await fetchHtmlWithSafety(abertosUrl)
  if (!res) {
    res = await fetchHtmlWithSafety(baseUrl)
  }
  if (!res) return []
  return parseSelecaoNetHtml(res.html, baseUrl, bancaNome, defaultUf)
}

/**
 * Parser síncrono para a plataforma Gestor Editais (Idecan e Ibade)
 */
export function parseGestorEditaisHtml(
  html: string,
  baseUrl: string,
  bancaNome: string,
  defaultUf = 'BR'
): ConcreteScrapedConcurso[] {
  const $ = cheerio.load(html)
  const items: ConcreteScrapedConcurso[] = []

  $('a[href*="/edital/ver/"]').each((_, el) => {
    let href = $(el).attr('href') || ''
    try {
      href = new URL(href, baseUrl).toString()
    } catch {
      // url fallback
    }

    const container = $(el).closest('tr, .card, li')
    const titulo = container.text().replace(/\s+/g, ' ').trim().slice(0, 120)

    if (titulo.length > 8 && isResultCurrent(titulo, '')) {
      items.push({
        id: generateCanonicalId(href, 'gestor'),
        orgao: titulo.split(/[-–—]/)[0]?.trim() || titulo,
        titulo,
        uf: defaultUf,
        vagas: 'Consultar no portal da banca',
        remuneracao: 'Não especificado na publicação',
        url: href,
        fonte: bancaNome,
        bancaNome
      })
    }
  })

  return items.slice(0, 10)
}

export async function scrapeGestorEditaisPlatform(
  baseUrl: string,
  bancaNome: string,
  defaultUf = 'BR'
): Promise<ConcreteScrapedConcurso[]> {
  const url = baseUrl.includes('/edital') ? baseUrl : `${baseUrl.replace(/\/+$/, '')}/edital`
  const res = await fetchHtmlWithSafety(url)
  if (!res) return []
  return parseGestorEditaisHtml(res.html, url, bancaNome, defaultUf)
}

/**
 * Parser síncrono para o Instituto Consulplan
 */
export function parseConsulplanHtml(html: string): ConcreteScrapedConcurso[] {
  const $ = cheerio.load(html)
  const items: ConcreteScrapedConcurso[] = []

  // Seleciona apenas .card.custom-card para evitar duplicação interna por .card-body
  $('.card.custom-card').each((_, el) => {
    const linkEl = $(el).find('a[href]').first()
    let href = linkEl.attr('href') || ''
    if (!href || href === '#' || href.includes('Cadastro')) return
    try {
      href = new URL(href, 'https://www.institutoconsulplan.org.br').toString()
    } catch {
      // fallback
    }

    const text = $(el).text().replace(/\s+/g, ' ').trim()
    const orgao = text.split(/Concurso|Processo/i)[0]?.trim() || ''

    if (orgao.length > 4 && orgao !== 'Órgão' && isResultCurrent(orgao, text)) {
      items.push({
        id: generateCanonicalId(href, 'consulplan'),
        orgao,
        titulo: text.slice(0, 140),
        uf: orgao.includes('/MG') || text.includes('MG') ? 'MG' : 'BR',
        vagas: 'Ver publicação oficial',
        remuneracao: 'Não especificado na publicação',
        prazoInscricao: 'Inscrições abertas / em andamento',
        url: href,
        fonte: 'Instituto Consulplan',
        bancaNome: 'Instituto Consulplan'
      })
    }
  })

  return items.slice(0, 10)
}

export async function scrapeConsulplan(): Promise<ConcreteScrapedConcurso[]> {
  const res = await fetchHtmlWithSafety('https://www.institutoconsulplan.org.br/Concursos')
  if (!res) return []
  return parseConsulplanHtml(res.html)
}

/**
 * Parser síncrono para a Fundação CEFETMINAS
 */
export function parseCefetMinasHtml(html: string): ConcreteScrapedConcurso[] {
  const $ = cheerio.load(html)
  const items: ConcreteScrapedConcurso[] = []

  $('.col-flex-card').each((_, el) => {
    const link = $(el).find('a[href*="processo_seletivo_detalhes.aspx"]').first()
    let href = link.attr('href') || ''
    try {
      href = new URL(href, 'https://concurso.fundacaocefetminas.org.br/site/').toString()
    } catch {
      // fallback
    }
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    const prazoMatch = text.match(/Inscri[cç][aã]o:\s*([\d/]+\s*a\s*[\d/]+)/i)

    if (link.length > 0 && isResultCurrent(text, '')) {
      const orgao = text.split(/[-–—]/)[0]?.trim() || 'Fundação CEFETMINAS'
      items.push({
        id: generateCanonicalId(href || 'https://concurso.fundacaocefetminas.org.br', 'cefet'),
        orgao,
        titulo: text.slice(0, 140),
        uf: 'MG',
        vagas: 'Consultar edital',
        remuneracao: 'Não especificado na publicação',
        prazoInscricao: prazoMatch ? prazoMatch[1] : 'Consulte cronograma',
        url: href || 'https://concurso.fundacaocefetminas.org.br/site/processo_seletivo.aspx',
        fonte: 'Fundação CEFETMINAS',
        bancaNome: 'Fundação CEFETMINAS'
      })
    }
  })

  return items.slice(0, 8)
}

export async function scrapeCefetMinas(): Promise<ConcreteScrapedConcurso[]> {
  const res = await fetchHtmlWithSafety(
    'https://concurso.fundacaocefetminas.org.br/site/processo_seletivo.aspx'
  )
  if (!res) return []
  return parseCefetMinasHtml(res.html)
}

/**
 * Parser síncrono para a FGV Concursos
 */
export function parseFgvHtml(html: string): ConcreteScrapedConcurso[] {
  const $ = cheerio.load(html)
  const items: ConcreteScrapedConcurso[] = []

  $('.view-concursos-em-andamento .views-row a[href], .views-row a[href*="/concursos/"]').each((_, el) => {
    let href = $(el).attr('href') || ''
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (!href || !text || text.length < 8) return
    try {
      href = new URL(href, 'https://conhecimento.fgv.br').toString()
    } catch {
      // fallback
    }

    const orgao =
      text.replace(/^Concurso\s+P[úu]blico\s+(?:para\s+)?(?:a\s+|o\s+)?/i, '').split(/[-–—]/)[0]?.trim() || text

    if (isResultCurrent(orgao, text)) {
      items.push({
        id: generateCanonicalId(href, 'fgv'),
        orgao,
        titulo: text,
        uf: text.includes('MG') || text.includes('Minas Gerais') ? 'MG' : 'BR',
        vagas: 'Conforme edital FGV',
        remuneracao: 'Não especificado na publicação',
        url: href,
        fonte: 'FGV Concursos',
        bancaNome: 'FGV'
      })
    }
  })

  return items.slice(0, 10)
}

export async function scrapeFgvConcursos(): Promise<ConcreteScrapedConcurso[]> {
  const res = await fetchHtmlWithSafety('https://conhecimento.fgv.br/concursos')
  if (!res) return []
  return parseFgvHtml(res.html)
}

/**
 * Parser síncrono para a FCC (Fundação Carlos Chagas)
 */
export function parseFccHtml(html: string): ConcreteScrapedConcurso[] {
  const $ = cheerio.load(html)
  const items: ConcreteScrapedConcurso[] = []

  $('a[href*="/concursos/"]').each((_, el) => {
    let href = $(el).attr('href') || ''
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (!href.includes('/index.html') || text.length < 5) return
    try {
      href = new URL(href, 'https://www.concursosfcc.com.br/').toString()
    } catch {
      // fallback
    }

    if (isResultCurrent(text, '')) {
      items.push({
        id: generateCanonicalId(href, 'fcc'),
        orgao: text,
        titulo: `Concurso ${text} — Fundação Carlos Chagas`,
        uf: text.includes('MG') ? 'MG' : text.includes('SP') ? 'SP' : 'BR',
        vagas: 'Conforme edital FCC',
        remuneracao: 'Não especificado na publicação',
        url: href,
        fonte: 'Fundação Carlos Chagas (FCC)',
        bancaNome: 'FCC'
      })
    }
  })

  return items.slice(0, 10)
}

export async function scrapeFccConcursos(): Promise<ConcreteScrapedConcurso[]> {
  const res = await fetchHtmlWithSafety('https://www.concursosfcc.com.br/concursoAndamento.html')
  if (!res) return []
  return parseFccHtml(res.html)
}

/**
 * Parser síncrono para a Fundatec
 */
export function parseFundatecHtml(html: string): ConcreteScrapedConcurso[] {
  const $ = cheerio.load(html)
  const items: ConcreteScrapedConcurso[] = []

  $('a[href*="index_concursos.php"]').each((_, el) => {
    let href = $(el).attr('href') || ''
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (!text || text.length < 6) return
    try {
      href = new URL(href, 'https://www.fundatec.org.br/portal/concursos/').toString()
    } catch {
      // fallback
    }

    if (isResultCurrent(text, '')) {
      items.push({
        id: generateCanonicalId(href, 'fundatec'),
        orgao: text.split(/[-–—]/)[0]?.trim() || text,
        titulo: text,
        uf: text.includes('MG') ? 'MG' : 'BR',
        vagas: 'Conforme edital Fundatec',
        remuneracao: 'Não especificado na publicação',
        url: href,
        fonte: 'Fundatec',
        bancaNome: 'Fundatec'
      })
    }
  })

  return items.slice(0, 8)
}

export async function scrapeFundatec(): Promise<ConcreteScrapedConcurso[]> {
  const res = await fetchHtmlWithSafety(
    'https://www.fundatec.org.br/portal/concursos/concursos_abertos.php'
  )
  if (!res) return []
  return parseFundatecHtml(res.html)
}

/**
 * Orquestrador que consulta em paralelo as bancas organizadoras mais relevantes
 */
export async function scrapeBancasConcreteAll(targetUf?: string): Promise<ConcreteScrapedConcurso[]> {
  const tasks: Promise<ConcreteScrapedConcurso[]>[] = [
    // 1. Fundep (MG)
    scrapeSelecaoNetPlatform('https://fundep.selecao.net.br', 'Fundep (Gestão de Concursos)', 'MG'),
    // 2. Instituto Access (Forte em MG)
    scrapeSelecaoNetPlatform('https://concursos.access.org.br', 'Instituto Access', 'MG'),
    // 3. IBFC
    scrapeSelecaoNetPlatform('https://ibfc.selecao.net.br', 'IBFC', 'BR'),
    // 4. Selecon
    scrapeSelecaoNetPlatform('https://selecon.selecao.net.br', 'Instituto Selecon', 'BR'),
    // 5. Idecan
    scrapeGestorEditaisPlatform('https://portal.concursos.idecan.org.br', 'Idecan', 'BR'),
    // 6. Ibade
    scrapeGestorEditaisPlatform('https://portal.ibade.selecao.site', 'Ibade', 'BR'),
    // 7. Consulplan
    scrapeConsulplan(),
    // 8. FUNCEFET
    scrapeCefetMinas(),
    // 9. FGV
    scrapeFgvConcursos(),
    // 10. FCC
    scrapeFccConcursos(),
    // 11. Fundatec
    scrapeFundatec()
  ]

  const resultsByBanca = await Promise.allSettled(tasks)
  const aggregated: ConcreteScrapedConcurso[] = []

  for (const r of resultsByBanca) {
    if (r.status === 'fulfilled') {
      aggregated.push(...r.value)
    }
  }

  // Filtragem por UF se especificada
  if (targetUf && targetUf !== 'TODOS') {
    return aggregated.filter((item) => item.uf === targetUf || item.uf === 'BR')
  }

  return aggregated
}
