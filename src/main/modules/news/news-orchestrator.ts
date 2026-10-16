import { NewsItem } from '../../../shared/types/news'
import { scrapePciRecentNews } from './pci.scraper'
import { aggregateLiveNewsFromFeeds } from './sitemap-rss.scraper'
import { scrapePciConcrete, inferArea } from '../search/portals-concrete.scraper'
import { getCachedNews, saveNewsToCache } from '../search/search-cache-service'

/**
 * Orquestrador de notícias com arquitetura Cache-First.
 * Consulta prioritariamente o SQLite e apenas acessa a rede quando forceRefresh for verdadeiro ou na inicialização.
 */
export async function getAggregatedRecentNews(
  areaFilter?: string,
  ufFilter?: string,
  options: { forceRefresh?: boolean } = {}
): Promise<NewsItem[]> {
  // 1. Se não for forceRefresh, consulta primeiro o cache SQLite
  if (!options.forceRefresh) {
    const cached = getCachedNews(areaFilter, ufFilter)
    if (cached && cached.data.length > 0) {
      return cached.data
    }
  }

  const liveNewsItems: NewsItem[] = []

  // 2. Coleta online das fontes configuradas
  try {
    const [feedResults, pciNewsResults, pciConcreteResults] = await Promise.allSettled([
      aggregateLiveNewsFromFeeds(),
      scrapePciRecentNews(),
      scrapePciConcrete('', ufFilter)
    ])

    if (feedResults.status === 'fulfilled') {
      liveNewsItems.push(...feedResults.value)
    }
    if (pciNewsResults.status === 'fulfilled') {
      liveNewsItems.push(...pciNewsResults.value)
    }

    // Converte os editais abertos mais recentes em notícias
    if (pciConcreteResults.status === 'fulfilled') {
      for (const item of pciConcreteResults.value.slice(0, 8)) {
        const area = inferArea(`${item.orgao} ${item.titulo}`)
        liveNewsItems.push({
          id: `edital-${item.id}`,
          titulo: `Edital Publicado: ${item.orgao} — ${item.vagas || 'Vagas informadas'} (${item.uf})`,
          resumo: `Ato de concurso publicado com remuneração de ${item.remuneracao || 'consultar edital'}. Período de inscrições: ${item.prazoInscricao || 'conforme cronograma'}. Escolaridade: ${item.escolaridade || 'ver requisitos'}.`,
          url: item.url,
          portalFonte: 'PCI Concursos',
          dataPublicacao: new Date().toISOString().split('T')[0], // data do dia sem inventar timestamp exato falso
          area,
          uf: item.uf || 'BR',
          statusRelacionado: 'INSCRICOES_ABERTAS',
          orgaoRelacionado: item.orgao,
          tipoConteudo: 'AGREGADOR',
          vagas: item.vagas,
          remuneracao: item.remuneracao,
          prazoInscricao: item.prazoInscricao,
          escolaridade: item.escolaridade
        })
      }
    }

    // Salva no SQLite
    if (liveNewsItems.length > 0) {
      saveNewsToCache(liveNewsItems)
    }
  } catch (err) {
    console.warn('[NewsOrchestrator] Falha na coleta de notícias online:', err)
  }

  // 3. Se a coleta online falhar, fallback gracioso para o que estiver no cache SQLite
  if (liveNewsItems.length === 0) {
    const cached = getCachedNews(areaFilter, ufFilter)
    if (cached) return cached.data
    return []
  }

  // Filtra por área e UF
  let filtered = liveNewsItems
  if (areaFilter && areaFilter !== 'TODOS') {
    filtered = filtered.filter((n) => n.area === areaFilter)
  }
  if (ufFilter && ufFilter !== 'TODOS') {
    filtered = filtered.filter((n) => n.uf === ufFilter || n.uf === 'BR')
  }

  // Deduplicação por URL
  const seenUrls = new Set<string>()
  const uniqueItems: NewsItem[] = []
  for (const item of filtered) {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url)
      uniqueItems.push(item)
    }
  }

  return uniqueItems.slice(0, 30)
}
