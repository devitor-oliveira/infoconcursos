import * as cheerio from 'cheerio'
import { ConcursoArea, ConcursoDossier } from '../../../shared/types/concurso'
import { isResultCurrent } from './query-sanitizer'
import { detectConcursoStatusAndBanca } from '../dossier/status-detector'
import { matchRecommendedSubjects } from '../dossier/syllabus-matcher'
import { parseDeadlineDate } from '../dossier/date-extractor'
import { fetchHtmlWithSafety } from './http-client'
import { generateCanonicalId } from './id-generator'
import { normalizeToAbsoluteHttps, resolveOfficialDossierLinks } from './url-resolver'
import { anonymizeDossierForStorage } from '../../../shared/utils/anonymizer'

export interface ConcreteScrapedConcurso {
  id: string
  orgao: string
  titulo: string
  uf: string
  vagas?: string
  remuneracao?: string
  cargos?: string
  escolaridade?: string
  prazoInscricao?: string
  url: string
  fonte: string
  bancaNome?: string
  statusTexto?: string
}

export function inferArea(text: string): ConcursoArea {
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

export function parsePciHtml(html: string, targetUf?: string): ConcreteScrapedConcurso[] {
  const results: ConcreteScrapedConcurso[] = []
  const $ = cheerio.load(html)

  // Apenas .na e .da contêm concursos ATIVOS (ignora .ea que são encerrados)
  $('.na, .da').each((_, el) => {
    const ca = $(el).find('.ca').first()
    if (ca.length === 0) return

    const linkEl = ca.find('a').first()
    const orgao = linkEl.text().replace(/\s+/g, ' ').trim()
    let href = linkEl.attr('href') || ''
    const tituloCompleto = linkEl.attr('title') || orgao

    if (!orgao || !href) return
    href = normalizeToAbsoluteHttps(href, 'https://www.pciconcursos.com.br')
    if (!href) return

    const uf = $(el).find('.cc').text().trim() || targetUf || 'BR'
    const rawCd = $(el).find('.cd')
    const cdText = rawCd.text().replace(/\s+/g, ' ').trim()

    let vagas = ''
    let remuneracao = ''
    const vagasMatch = cdText.match(/(\d+\s*vagas?|\bCR\b|Cadastro\s+de\s+Reserva|vaga\s+única)/i)
    if (vagasMatch) vagas = vagasMatch[1].trim()

    const salMatch = cdText.match(/(até\s+R\$\s*[\d.,]+|R\$\s*[\d.,]+(?:\s*a\s*R\$\s*[\d.,]+)?)/i)
    if (salMatch) remuneracao = salMatch[1].trim()

    const spans = rawCd.find('span')
    const cargos = spans.first().text().replace(/\s+/g, ' ').trim() || 'Cargos descritos no edital'
    const escolaridade = spans.eq(1).text().replace(/\s+/g, ' ').trim() || ''

    const prazoInscricao = $(el).find('.ce').text().replace(/\s+/g, ' ').trim()

    if (isResultCurrent(orgao, `${tituloCompleto} ${cdText}`)) {
      results.push({
        id: generateCanonicalId(href, 'pci'),
        orgao,
        titulo: tituloCompleto,
        uf,
        vagas: vagas || 'Conforme publicação oficial',
        remuneracao: remuneracao || 'Não especificado na publicação',
        cargos,
        escolaridade: escolaridade || 'Consulte requisitos no ato',
        prazoInscricao: prazoInscricao || 'Verifique o cronograma oficial',
        url: href,
        fonte: 'PCI Concursos'
      })
    }
  })

  return results.slice(0, 25)
}

/**
 * 1. Extração Estruturada do PCI Concursos
 */
export async function scrapePciConcrete(
  searchTerm?: string,
  targetUf?: string
): Promise<ConcreteScrapedConcurso[]> {
  const cleanTerm = (searchTerm || '').trim()

  const url = cleanTerm
    ? `https://www.pciconcursos.com.br/pesquisa/?p=${encodeURIComponent(cleanTerm)}&tipopesquisa=1`
    : targetUf && targetUf === 'MG'
      ? 'https://www.pciconcursos.com.br/concursos/sudeste/'
      : 'https://www.pciconcursos.com.br/concursos/'

  const res = await fetchHtmlWithSafety(url)
  if (!res) return []
  return parsePciHtml(res.html, targetUf)
}

export function parseAcheConcursosHtml(html: string, targetUf?: string): ConcreteScrapedConcurso[] {
  const results: ConcreteScrapedConcurso[] = []
  const $ = cheerio.load(html)

  $('table.tbl-conc tbody tr').each((_, el) => {
    const linkEl = $(el).find('td a').first()
    let href = linkEl.attr('href') || ''
    const titulo = $(el).find('span.titulo').text().replace(/\s+/g, ' ').trim()
    if (!titulo || !href) return
    href = normalizeToAbsoluteHttps(href, 'https://www.acheconcursos.com.br')
    if (!href) return

    const escolaridade = $(el).find('span.vagas').text().replace(/^N[ií]vel:\s*/i, '').trim()
    const inscricaoFim = $(el).find('span.inscricao_fim').text().replace(/\s+/g, ' ').trim()
    const numeroVagas = $(el).find('span.numero_vagas').text().replace(/\s+/g, ' ').trim()
    const salMax = $(el).find('span.sal_max').text().replace(/\s+/g, ' ').trim()

    const orgao = titulo.split(/[-–—]/)[0]?.trim() || titulo

    if (isResultCurrent(titulo, `${escolaridade} ${numeroVagas} ${salMax}`)) {
      results.push({
        id: generateCanonicalId(href, 'ache'),
        orgao,
        titulo,
        uf: targetUf && targetUf !== 'TODOS' ? targetUf : 'BR',
        vagas: numeroVagas ? `${numeroVagas} vaga(s)` : 'A definir',
        remuneracao: salMax ? `Até ${salMax}` : 'Não especificado na publicação',
        escolaridade: escolaridade || 'Ver requisitos no edital',
        prazoInscricao: inscricaoFim ? `Inscrições até ${inscricaoFim}` : 'Consulte cronograma',
        url: href,
        fonte: 'Ache Concursos'
      })
    }
  })

  return results.slice(0, 20)
}

/**
 * 2. Extração Estruturada do Ache Concursos
 */
export async function scrapeAcheConcursosConcrete(targetUf?: string): Promise<ConcreteScrapedConcurso[]> {
  const ufRoute = targetUf && targetUf.toUpperCase() === 'MG'
    ? 'https://www.acheconcursos.com.br/concursos-minas-gerais'
    : 'https://www.acheconcursos.com.br/concursos-abertos'

  const res = await fetchHtmlWithSafety(ufRoute)
  if (!res) return []
  return parseAcheConcursosHtml(res.html, targetUf)
}

export function parseConcursosNoBrasilHtml(html: string, targetUf?: string): ConcreteScrapedConcurso[] {
  const results: ConcreteScrapedConcurso[] = []
  const $ = cheerio.load(html)

  $('table tbody tr').each((_, el) => {
    const linkEl = $(el).find('a.post-title').first()
    let href = linkEl.attr('href') || ''
    const orgao = linkEl.text().replace(/\s+/g, ' ').trim()
    const fullTitle = linkEl.attr('title') || orgao
    if (!orgao || !href) return
    href = normalizeToAbsoluteHttps(href, 'https://concursosnobrasil.com')
    if (!href) return

    const vagasText = $(el).find('td.center').text().replace(/\s+/g, ' ').trim()

    if (isResultCurrent(orgao, fullTitle)) {
      results.push({
        id: generateCanonicalId(href, 'cnb'),
        orgao,
        titulo: fullTitle,
        uf: targetUf && targetUf !== 'TODOS' ? targetUf : 'BR',
        vagas: vagasText ? `${vagasText} vaga(s)` : 'Consulte publicação',
        remuneracao: 'Não especificado na publicação',
        url: href,
        fonte: 'Concursos no Brasil'
      })
    }
  })

  return results.slice(0, 20)
}

/**
 * 3. Extração Estruturada do Concursos no Brasil
 */
export async function scrapeConcursosNoBrasilConcrete(targetUf?: string): Promise<ConcreteScrapedConcurso[]> {
  const route = targetUf && targetUf.toUpperCase() === 'MG'
    ? 'https://concursosnobrasil.com/concursos/mg/'
    : 'https://concursosnobrasil.com/concursos/br/'

  const res = await fetchHtmlWithSafety(route)
  if (!res) return []
  return parseConcursosNoBrasilHtml(res.html, targetUf)
}

/**
 * Converte um item concreto extraído em um ConcursoDossier individual e auditável.
 */
export function convertConcreteToDossier(
  item: ConcreteScrapedConcurso,
  detectedArea?: ConcursoArea
): ConcursoDossier {
  const area = detectedArea && detectedArea !== 'TODOS' ? detectedArea : inferArea(`${item.orgao} ${item.titulo}`)
  const detected = detectConcursoStatusAndBanca([item.orgao, item.titulo, item.statusTexto || ''])

  // Determina o status real baseando-se no prazo parseado em vez de suposição
  const deadline = parseDeadlineDate(item.prazoInscricao)
  let status = detected.status
  let statusLabel = detected.statusLabel

  if (deadline) {
    const now = new Date()
    if (deadline.getTime() >= now.getTime()) {
      status = 'INSCRICOES_ABERTAS'
      statusLabel = 'Inscrições Abertas'
    } else {
      status = 'EM_ANDAMENTO'
      statusLabel = 'Inscrições Encerradas'
    }
  }

  // Se o item veio de agregador (PCI, Ache, CNB), classifica honestamente como AGREGADOR
  const isAgregador = ['PCI Concursos', 'Ache Concursos', 'Concursos no Brasil'].includes(item.fonte)
  const tipoRegistro = isAgregador ? 'AGREGADOR' : 'EDITAL_OFICIAL'

  const officialResolution = resolveOfficialDossierLinks({
    orgao: item.orgao,
    rawTitle: item.titulo,
    bancaNameHint: item.bancaNome || detected.bancaDetectada?.nome,
    sourceUrl: item.url,
    sourceFonte: item.fonte,
    isDirectBancaEdital: !isAgregador
  })

  const bancaFinal = item.bancaNome
    ? {
        nome: item.bancaNome,
        situacao: 'CONTRATADA' as const,
        observacao: `Banca organizadora ${item.bancaNome} vinculada à publicação oficial.`
      }
    : officialResolution.bancaIdentificada
      ? {
          nome: officialResolution.bancaIdentificada.name,
          situacao: 'CONTRATADA' as const,
          observacao: `Banca organizadora ${officialResolution.bancaIdentificada.name} identificada e validada no cadastro de bancas.`
        }
      : detected.bancaDetectada || {
          nome: 'Consultar no documento oficial',
          situacao: 'A_DEFINIR' as const,
          observacao: 'Informações detalhadas sobre a banca organizadora constam no ato de publicação.'
        }

  return anonymizeDossierForStorage({
    id: `conc-${item.id}`,
    urlCanonica: officialResolution.urlCanonica,
    termoOriginal: item.orgao,
    orgao: item.orgao,
    tituloConcurso: item.titulo,
    area,
    uf: item.uf || 'BR',
    status,
    statusLabel,
    resumoGeral: `Ato de concurso público de ${item.orgao}: ${item.titulo}. Vagas informadas: ${item.vagas || 'Consultar edital'}. Remuneração: ${item.remuneracao || 'Não especificado na publicação'}.`,
    tipoRegistro,
    prazoInscricao: item.prazoInscricao || 'Consulte o cronograma oficial',
    escolaridade: item.escolaridade || 'Consulte os requisitos específicos do cargo',
    numeroVagas: item.vagas || 'Conforme publicação oficial',
    salarioMaximo: item.remuneracao || 'Não especificado na publicação',
    banca: bancaFinal,
    cronograma: {
      previsaoEdital: 'Publicado / Disponível no portal',
      periodoInscricoes: item.prazoInscricao || 'Consulte o cronograma no edital',
      ultimaMovimentacao: `Registro catalogado via ${item.fonte} com status auditado.`
    },
    cargosPrevistos: [
      {
        titulo: item.cargos || 'Cargos previstos no edital',
        escolaridade: item.escolaridade?.toLowerCase().includes('superior')
          ? 'SUPERIOR'
          : item.escolaridade?.toLowerCase().includes('médio')
            ? 'MEDIO'
            : 'MEDIO_E_SUPERIOR',
        vagas: item.vagas || 'Ver edital',
        remuneracao: item.remuneracao || 'Não especificado na publicação',
        descricaoAtribuicoes: 'Conforme quadro de vagas e atribuições legais constantes no ato normativo.'
      }
    ],
    materiasRecomendadas: matchRecommendedSubjects(area, [item.orgao, item.titulo]),
    linksReferencia: officialResolution.linksReferencia,
    atualizadoEm: new Date().toISOString()
  })
}
