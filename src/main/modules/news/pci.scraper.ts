import * as cheerio from 'cheerio'
import { NewsItem } from '../../../shared/types/news'
import { ConcursoArea, ConcursoStatus } from '../../../shared/types/concurso'
import { isResultCurrent } from '../search/query-sanitizer'
import { fetchHtmlWithSafety } from '../search/http-client'
import { anonymizeText } from '../../../shared/utils/anonymizer'

function inferAreaFromText(text: string): ConcursoArea {
  const lower = text.toLowerCase()
  if (/\b(banco do brasil|caixa|bndes|bacen|banrisul|banese|brb|escritur[aá]rio)\b/.test(lower)) return 'BANCARIA'
  if (/\b(trt|tre|trf|tj|tribunal|mpu|mpf|defensoria|judici[aá]rio)\b/.test(lower)) return 'TRIBUNAIS'
  if (/\b(pol[ií]cia|pf|prf|pm|pc|guarda municipal|penal|delegado|agente)\b/.test(lower)) return 'POLICIAL'
  if (/\b(sefaz|receita federal|iss|tcu|tce|cgu|auditor fiscal|fisco)\b/.test(lower)) return 'FISCAL_CONTROLE'
  if (/\b(ti|tecnologia da informa|serpro|dataprev|analista de sistemas)\b/.test(lower)) return 'TI'
  if (/\b(educa[cç][aã]o|professor|if[a-z]{2}|universidade|pedagogo)\b/.test(lower)) return 'EDUCACAO'
  if (/\b(sa[uú]de|ebserh|anvisa|enfermeiro|m[eé]dico|hospital)\b/.test(lower)) return 'SAUDE'
  return 'ADMINISTRATIVA'
}

function inferStatusFromText(text: string): ConcursoStatus {
  const lower = text.toLowerCase()
  if (/\b(inscri[cç][oõ]es abertas|abre inscri[cç][oõ]es|prorroga inscri)\b/.test(lower)) return 'INSCRICOES_ABERTAS'
  if (/\b(publica edital|edital publicado|lan[cç]a edital)\b/.test(lower)) return 'EDITAL_PUBLICADO'
  if (/\b(define banca|banca definida|contrata banca)\b/.test(lower)) return 'BANCA_DEFINIDA'
  if (/\b(comiss[aã]o formada|forma comiss[aã]o)\b/.test(lower)) return 'COMISSAO_FORMADA'
  if (/\b(autoriza|autorizado|aprovado)\b/.test(lower)) return 'AUTORIZADO'
  return 'PREVISTO'
}

function inferUfFromText(text: string): string {
  const match = text.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/)
  return match ? match[1] : 'BR'
}

export function parsePciNewsHtml(html: string): NewsItem[] {
  const $ = cheerio.load(html)
  const items: NewsItem[] = []

  $('.ca, .noticia, li, article').each((idx, el) => {
    const linkEl = $(el).find('a').first()
    const rawTitulo = linkEl.text().replace(/\s+/g, ' ').trim()
    let href = linkEl.attr('href') || ''
    const rawResumo = $(el).text().replace(rawTitulo, '').replace(/\s+/g, ' ').trim()

    const titulo = anonymizeText(rawTitulo, 'SCRAPED_TEXT')
    const resumo = anonymizeText(rawResumo, 'SCRAPED_TEXT')

    if (!titulo || titulo.length < 18 || !href) return
    if (href.startsWith('/')) {
      href = `https://www.pciconcursos.com.br${href}`
    }
    if (!href.startsWith('http')) return

    if (!isResultCurrent(titulo, resumo)) return

    items.push({
      id: `pci-${idx}-${Buffer.from(href).toString('base64').slice(0, 10)}`,
      titulo,
      resumo: resumo.length > 15 ? resumo.slice(0, 220) : `${titulo} - Confira os detalhes, cargos previstos e movimentações recentes.`,
      url: href,
      portalFonte: 'PCI Concursos',
      dataPublicacao: new Date().toISOString(),
      area: inferAreaFromText(`${titulo} ${resumo}`),
      uf: inferUfFromText(titulo),
      statusRelacionado: inferStatusFromText(`${titulo} ${resumo}`),
      orgaoRelacionado: titulo.split('-')[0]?.trim().slice(0, 50) || 'Órgão Público'
    })
  })

  return items.slice(0, 20)
}

export async function scrapePciRecentNews(): Promise<NewsItem[]> {
  const res = await fetchHtmlWithSafety('https://www.pciconcursos.com.br/noticias/', {
    timeoutMs: 6000
  })
  if (!res) return []
  return parsePciNewsHtml(res.html)
}
