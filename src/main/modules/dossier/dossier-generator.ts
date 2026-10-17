import { ConcursoDossier, ConcursoArea, ReferenceLink } from '../../../shared/types/concurso'
import { SearchFilter, RawSearchResult, STATUS_DISPLAY_MAP } from '../../../shared/types/search'
import { searchDuckDuckGoLite } from '../search/duckduckgo.scraper'
import { detectConcursoStatusAndBanca } from './status-detector'
import { extractEstimatedTimeline } from './date-extractor'
import { matchRecommendedSubjects } from './syllabus-matcher'
import {
  scrapePciConcrete,
  scrapeAcheConcursosConcrete,
  scrapeConcursosNoBrasilConcrete,
  convertConcreteToDossier,
  ConcreteScrapedConcurso
} from '../search/portals-concrete.scraper'
import { scrapeBancasConcreteAll } from '../search/bancas-concrete.scraper'
import { searchGoogleNewsRss } from '../news/sitemap-rss.scraper'
import { generateCanonicalId } from '../search/id-generator'
import { resolveOfficialDossierLinks } from '../search/url-resolver'
import {
  getCachedSearchResults,
  saveSearchResultsToCache
} from '../search/search-cache-service'
import {
  validateAndSanitizeSearchFilter,
  anonymizeDossierForStorage
} from '../../../shared/utils/anonymizer'

function normalizeSearchText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_./]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesSearchTerm(target: string, query: string): boolean {
  if (!query) return true
  const normQuery = normalizeSearchText(query)
  const normTarget = normalizeSearchText(target)
  if (normTarget.includes(normQuery)) return true
  const tokens = normQuery.split(/\s+/).filter(Boolean)
  return tokens.every((token) => normTarget.includes(token))
}

function inferAreaFromText(text: string): ConcursoArea {
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

/**
 * Converte um resultado de busca individual em um dossiê analítico próprio.
 */
function convertSingleSearchResultToDossier(
  r: RawSearchResult,
  filter: SearchFilter
): ConcursoDossier {
  const area = filter.area && filter.area !== 'TODOS' ? filter.area : inferAreaFromText(`${r.title} ${r.snippet}`)
  const detected = detectConcursoStatusAndBanca([r.title, r.snippet])
  const timeline = extractEstimatedTimeline([r.title, r.snippet], detected.status)

  const orgao = r.title.split(/[-–—:]/)[0]?.trim().slice(0, 50) || filter.termoLivre || 'Órgão em Apuração'
  const id = generateCanonicalId(r.url, 'apuracao')

  const isOfficialPortal = r.url.endsWith('.pdf') || r.sourceDomain.includes('gov.br') || r.sourceDomain.includes('jus.br')

  const officialResolution = resolveOfficialDossierLinks({
    orgao,
    rawTitle: r.title,
    bancaNameHint: detected.bancaDetectada?.nome,
    sourceUrl: r.url,
    sourceFonte: r.sourceDomain,
    isDirectBancaEdital: isOfficialPortal
  })

  const bancaFinal = officialResolution.bancaIdentificada
    ? {
        nome: officialResolution.bancaIdentificada.name,
        situacao: (detected.status === 'INSCRICOES_ABERTAS' ||
        detected.status === 'EDITAL_PUBLICADO' ||
        detected.status === 'BANCA_DEFINIDA'
          ? 'CONTRATADA'
          : 'COTADA_OU_HISTORICO') as 'CONTRATADA' | 'COTADA_OU_HISTORICO',
        observacao: `Banca organizadora ${officialResolution.bancaIdentificada.name} identificada nas fontes e cruzada com o cadastro oficial.`
      }
    : detected.bancaDetectada || {
        nome: 'A definir pelo órgão',
        situacao: 'A_DEFINIR' as const,
        observacao: 'Aguardando publicação de portaria ou processo de contratação da banca examinadora.'
      }

  return {
    id,
    urlCanonica: officialResolution.urlCanonica,
    termoOriginal: filter.termoLivre || orgao,
    orgao,
    tituloConcurso: r.title,
    area,
    uf: filter.uf && filter.uf !== 'TODOS' ? filter.uf : 'BR',
    status: detected.status,
    statusLabel: detected.statusLabel,
    resumoGeral: r.snippet,
    tipoRegistro: isOfficialPortal ? 'EDITAL_OFICIAL' : 'NOTICIA_APURACAO',
    prazoInscricao: timeline.periodoInscricoes || 'A definir no edital oficial',
    escolaridade: 'Consulte os requisitos específicos do cargo',
    numeroVagas: 'Conforme publicação oficial',
    salarioMaximo: 'Não especificado na publicação',
    banca: bancaFinal,
    cronograma: timeline,
    cargosPrevistos: [],
    materiasRecomendadas: matchRecommendedSubjects(area, [orgao, r.title]),
    linksReferencia: officialResolution.linksReferencia,
    atualizadoEm: new Date().toISOString()
  }
}

/**
 * Orquestrador de busca e geração de dossiês com arquitetura Cache-First.
 */
export async function generateConcursoDossiers(
  rawFilter: SearchFilter,
  options: { skipNetwork?: boolean; forceRefresh?: boolean } = {}
): Promise<ConcursoDossier[]> {
  const { sanitizedFilter: filter, blockedPersonalData } = validateAndSanitizeSearchFilter(rawFilter)

  // Se o usuário digitou apenas um dado pessoal (ex: CPF puro, e-mail), bloqueia imediatamente sem consultar rede/banco
  if (blockedPersonalData && !filter.termoLivre) {
    return []
  }

  // 1. Se NÃO for forceRefresh, consulta prioritariamente o cache SQLite
  if (!options.forceRefresh) {
    const cached = getCachedSearchResults(filter)
    if (cached && cached.data.length > 0) {
      return cached.data
    }
  }

  // 2. Se a rede estiver explicitamente desabilitada (skipNetwork) e cache falhar, retorna vazio
  if (options.skipNetwork) {
    const cached = getCachedSearchResults(filter)
    return cached ? cached.data : []
  }

  // 3. Execução das buscas online em paralelo
  const concreteTasks: Promise<ConcreteScrapedConcurso[]>[] = [
    scrapePciConcrete(filter.termoLivre, filter.uf),
    scrapeAcheConcursosConcrete(filter.uf),
    scrapeConcursosNoBrasilConcrete(filter.uf),
    scrapeBancasConcreteAll(filter.uf)
  ]

  const searchTasks = Promise.allSettled([
    searchDuckDuckGoLite(filter),
    filter.termoLivre ? searchGoogleNewsRss(filter.termoLivre) : Promise.resolve([])
  ])

  const [concreteResults, searchResults] = await Promise.all([
    Promise.allSettled(concreteTasks),
    searchTasks
  ])

  const allConcrete: ConcreteScrapedConcurso[] = []
  for (const r of concreteResults) {
    if (r.status === 'fulfilled') {
      allConcrete.push(...r.value)
    }
  }

  const concreteDossiers: ConcursoDossier[] = allConcrete.map((item) =>
    convertConcreteToDossier(item, filter.area)
  )

  const newsDossiers: ConcursoDossier[] = []
  const [ddgRes, gnewsRes] = searchResults
  const ddgList = ddgRes && ddgRes.status === 'fulfilled' ? ddgRes.value : []
  const gnewsList = gnewsRes && gnewsRes.status === 'fulfilled' ? gnewsRes.value : []

    for (const r of ddgList) {
      newsDossiers.push(convertSingleSearchResultToDossier(r, filter))
    }

    for (const gn of gnewsList.slice(0, 5)) {
      const gnewsId = generateCanonicalId(gn.url, 'gnews')
      const detected = detectConcursoStatusAndBanca([gn.titulo, gn.resumo, gn.orgaoRelacionado])
      const officialResolution = resolveOfficialDossierLinks({
        orgao: gn.orgaoRelacionado,
        rawTitle: gn.titulo,
        bancaNameHint: detected.bancaDetectada?.nome,
        sourceUrl: gn.url,
        sourceFonte: gn.portalFonte,
        isDirectBancaEdital: false
      })

      const bancaFinal = officialResolution.bancaIdentificada
        ? {
            nome: officialResolution.bancaIdentificada.name,
            situacao: 'COTADA_OU_HISTORICO' as const,
            observacao: `Banca organizadora ${officialResolution.bancaIdentificada.name} referenciada nas matérias e confirmada no cadastro oficial.`
          }
        : detected.bancaDetectada || {
            nome: 'Consultar publicação',
            situacao: 'A_DEFINIR' as const,
            observacao: `Notícia apurada e veiculada por ${gn.portalFonte}.`
          }

      newsDossiers.push({
        id: gnewsId,
        urlCanonica: officialResolution.urlCanonica,
        termoOriginal: gn.orgaoRelacionado,
        orgao: gn.orgaoRelacionado,
        tituloConcurso: gn.titulo,
        area: gn.area,
        uf: gn.uf,
        status: gn.statusRelacionado,
        statusLabel: STATUS_DISPLAY_MAP[gn.statusRelacionado]?.label || 'Em Apuração',
        resumoGeral: gn.resumo,
        tipoRegistro: 'NOTICIA_APURACAO',
        prazoInscricao: 'Consultar portal de notícias',
        numeroVagas: 'Consulte apuração',
        salarioMaximo: 'Não especificado na publicação',
        banca: bancaFinal,
        cronograma: {
          previsaoEdital: 'Acompanhamento jornalístico em andamento',
          ultimaMovimentacao: `Matéria veiculada em ${new Date(gn.dataPublicacao).toLocaleDateString('pt-BR')}.`
        },
        cargosPrevistos: [],
        materiasRecomendadas: matchRecommendedSubjects(gn.area, [gn.orgaoRelacionado, gn.titulo]),
        linksReferencia: officialResolution.linksReferencia,
        atualizadoEm: new Date().toISOString()
      })
    }

  // Agrega todos os resultados
  const combined = [...concreteDossiers, ...newsDossiers]

  // Filtra por termo e filtros selecionados
  const normTerm = filter.termoLivre ? normalizeSearchText(filter.termoLivre) : ''
  const filtered = combined.filter((d) => {
    if (normTerm) {
      const matchTarget = `${d.orgao} ${d.tituloConcurso} ${d.uf}`
      if (!matchesSearchTerm(matchTarget, filter.termoLivre || '')) return false
    }
    if (filter.area && filter.area !== 'TODOS' && d.area !== filter.area) return false
    if (filter.uf && filter.uf !== 'TODOS' && d.uf !== filter.uf && d.uf !== 'BR') return false
    if (filter.statusFiltro === 'ABERTOS') {
      return (
        d.status === 'INSCRICOES_ABERTAS' ||
        d.status === 'EDITAL_PUBLICADO' ||
        d.tipoRegistro === 'EDITAL_OFICIAL'
      )
    }
    if (filter.statusFiltro === 'PREVISTOS_AUTORIZADOS') {
      return d.status !== 'INSCRICOES_ABERTAS' && d.status !== 'EM_ANDAMENTO'
    }
    return true
  })

  // Deduplicação estrita por URL Canônica e Título
  const seenUrls = new Set<string>()
  const seenKeys = new Set<string>()
  const uniqueDossiers: ConcursoDossier[] = []

  for (const d of filtered) {
    const key = normalizeSearchText(`${d.orgao} ${d.tituloConcurso.slice(0, 30)}`)
    const urlKey = d.urlCanonica || d.id

    if (!seenKeys.has(key) && !seenUrls.has(urlKey)) {
      seenKeys.add(key)
      seenUrls.add(urlKey)
      uniqueDossiers.push(d)
    }
  }

  // Ordenação: Editais Oficiais primeiro, depois Agregadores, depois Notícias de Apuração
  uniqueDossiers.sort((a, b) => {
    const order = { EDITAL_OFICIAL: 1, AGREGADOR: 2, NOTICIA_APURACAO: 3 }
    const orderA = order[a.tipoRegistro || 'NOTICIA_APURACAO'] || 3
    const orderB = order[b.tipoRegistro || 'NOTICIA_APURACAO'] || 3
    return orderA - orderB
  })

  const finalDossiers = uniqueDossiers.slice(0, 35).map((d) => anonymizeDossierForStorage(d))

  // 4. Salva os resultados no SQLite para que buscas futuras venham do cache instantaneamente
  saveSearchResultsToCache(filter, finalDossiers)

  return finalDossiers
}
