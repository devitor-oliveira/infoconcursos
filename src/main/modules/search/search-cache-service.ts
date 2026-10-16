import { eq, inArray } from 'drizzle-orm'
import { getDb, persistDatabaseToDisk } from '../../database'
import { concursosTable, buscaCacheTable, noticiasTable, syncMetadataTable } from '../../database/schema'
import { ConcursoDossier } from '../../../shared/types/concurso'
import { SearchFilter } from '../../../shared/types/search'
import { NewsItem } from '../../../shared/types/news'

export function buildCacheKey(filter: SearchFilter): string {
  const normTerm = (filter.termoLivre || 'all')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_')
  const area = filter.area || 'TODOS'
  const uf = filter.uf || 'TODOS'
  const status = filter.statusFiltro || 'TODOS'

  return `search:${normTerm}:${area}:${uf}:${status}`
}

/**
 * Consulta o cache de busca no SQLite. Retorna os dados em <10ms sem encostar na rede.
 */
export function getCachedSearchResults(
  filter: SearchFilter
): { data: ConcursoDossier[]; atualizadoEm: string } | null {
  try {
    const db = getDb()
    const key = buildCacheKey(filter)
    const cacheRows = db.select().from(buscaCacheTable).where(eq(buscaCacheTable.cacheKey, key)).all()

    if (!cacheRows || cacheRows.length === 0) {
      // Fallback seguro: se houver concursos já persistidos no banco (ex.: monitorados ou inseridos)
      const allRows = db.select().from(concursosTable).all()
      if (allRows && allRows.length > 0) {
        const matching: ConcursoDossier[] = []
        const normTerm = filter.termoLivre
          ? filter.termoLivre
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
          : ''
        for (const r of allRows) {
          try {
            const d = JSON.parse(r.dossierJson) as ConcursoDossier
            if (normTerm) {
              const text = `${d.orgao} ${d.tituloConcurso} ${d.termoOriginal}`
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
              if (!text.includes(normTerm)) continue
            }
            if (filter.area && filter.area !== 'TODOS' && d.area !== filter.area) continue
            if (filter.uf && filter.uf !== 'TODOS' && d.uf !== filter.uf) continue
            matching.push(d)
          } catch {
            // Ignora JSON corrompido
          }
        }
        if (matching.length > 0) {
          return { data: matching, atualizadoEm: allRows[0].atualizadoEm }
        }
      }
      return null
    }

    const cacheEntry = cacheRows[0]
    let ids: string[] = []
    try {
      ids = JSON.parse(cacheEntry.concursoIdsJson) as string[]
    } catch {
      return null
    }

    if (!ids || ids.length === 0) {
      return { data: [], atualizadoEm: cacheEntry.atualizadoEm }
    }

    const rows = db.select().from(concursosTable).where(inArray(concursosTable.id, ids)).all()
    const idMap = new Map<string, ConcursoDossier>()

    for (const r of rows) {
      try {
        const d = JSON.parse(r.dossierJson) as ConcursoDossier
        idMap.set(d.id, d)
      } catch {
        // Ignora JSON corrompido
      }
    }

    // Preserva a ordem original dos IDs salvos no cache
    const ordered: ConcursoDossier[] = []
    for (const id of ids) {
      const item = idMap.get(id)
      if (item) ordered.push(item)
    }

    return { data: ordered, atualizadoEm: cacheEntry.atualizadoEm }
  } catch (err) {
    console.warn('[Cache] Falha ao recuperar busca do cache:', err)
    return null
  }
}

/**
 * Persiste dossiês de busca no SQLite com vinculação à chave de pesquisa.
 */
export function saveSearchResultsToCache(filter: SearchFilter, dossiers: ConcursoDossier[]): void {
  try {
    const db = getDb()
    const key = buildCacheKey(filter)
    const nowIso = new Date().toISOString()
    const ids = dossiers.map((d) => d.id)

    // Insere ou atualiza cada dossiê na tabela global de concursos
    for (const d of dossiers) {
      db.insert(concursosTable)
        .values({
          id: d.id,
          termoOriginal: d.termoOriginal,
          orgao: d.orgao,
          siglaOrgao: d.siglaOrgao || null,
          tituloConcurso: d.tituloConcurso,
          area: d.area,
          uf: d.uf || 'BR',
          status: d.status,
          statusLabel: d.statusLabel,
          resumoGeral: d.resumoGeral || '',
          dossierJson: JSON.stringify(d),
          atualizadoEm: d.atualizadoEm || nowIso
        })
        .onConflictDoUpdate({
          target: concursosTable.id,
          set: {
            status: d.status,
            statusLabel: d.statusLabel,
            resumoGeral: d.resumoGeral || '',
            dossierJson: JSON.stringify(d),
            atualizadoEm: d.atualizadoEm || nowIso
          }
        })
        .run()
    }

    // Registra a chave de cache com a lista de IDs resultantes
    db.insert(buscaCacheTable)
      .values({
        cacheKey: key,
        termo: filter.termoLivre || null,
        area: filter.area || 'TODOS',
        uf: filter.uf || null,
        statusFiltro: filter.statusFiltro || 'TODOS',
        concursoIdsJson: JSON.stringify(ids),
        totalResultados: ids.length,
        atualizadoEm: nowIso
      })
      .onConflictDoUpdate({
        target: buscaCacheTable.cacheKey,
        set: {
          concursoIdsJson: JSON.stringify(ids),
          totalResultados: ids.length,
          atualizadoEm: nowIso
        }
      })
      .run()

    persistDatabaseToDisk()
  } catch (err) {
    console.error('[Cache] Erro ao persistir resultado da busca no cache:', err)
  }
}

/**
 * Recupera notícias do cache local do SQLite.
 */
export function getCachedNews(area?: string, uf?: string): { data: NewsItem[]; atualizadoEm: string } | null {
  try {
    const db = getDb()
    const allRows = db.select().from(noticiasTable).all()
    if (!allRows || allRows.length === 0) return null

    let filtered = allRows
    if (area && area !== 'TODOS') {
      filtered = filtered.filter((r) => r.area === area)
    }
    if (uf && uf !== 'TODOS') {
      filtered = filtered.filter((r) => r.uf === uf || r.uf === 'BR')
    }

    const syncMeta = db.select().from(syncMetadataTable).where(eq(syncMetadataTable.chave, 'news_last_sync')).all()
    const atualizadoEm = syncMeta[0]?.atualizadoEm || new Date().toISOString()

    const items: NewsItem[] = filtered.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      resumo: r.resumo,
      url: r.url,
      portalFonte: r.portalFonte,
      dataPublicacao: r.dataPublicacao,
      area: r.area as any,
      uf: r.uf,
      statusRelacionado: r.statusRelacionado as any,
      orgaoRelacionado: r.orgaoRelacionado
    }))

    return { data: items, atualizadoEm }
  } catch (err) {
    console.warn('[Cache] Falha ao recuperar notícias do cache:', err)
    return null
  }
}

/**
 * Salva notícias no cache SQLite e atualiza o timestamp de sincronização.
 */
export function saveNewsToCache(items: NewsItem[]): void {
  try {
    const db = getDb()
    const nowIso = new Date().toISOString()

    for (const item of items) {
      db.insert(noticiasTable)
        .values({
          id: item.id,
          titulo: item.titulo,
          resumo: item.resumo,
          url: item.url,
          portalFonte: item.portalFonte,
          dataPublicacao: item.dataPublicacao || nowIso,
          area: item.area,
          uf: item.uf || 'BR',
          statusRelacionado: item.statusRelacionado,
          orgaoRelacionado: item.orgaoRelacionado
        })
        .onConflictDoUpdate({
          target: noticiasTable.id,
          set: {
            titulo: item.titulo,
            resumo: item.resumo,
            statusRelacionado: item.statusRelacionado
          }
        })
        .run()
    }

    db.insert(syncMetadataTable)
      .values({
        chave: 'news_last_sync',
        atualizadoEm: nowIso,
        detalhesJson: JSON.stringify({ count: items.length })
      })
      .onConflictDoUpdate({
        target: syncMetadataTable.chave,
        set: {
          atualizadoEm: nowIso,
          detalhesJson: JSON.stringify({ count: items.length })
        }
      })
      .run()

    persistDatabaseToDisk()
  } catch (err) {
    console.error('[Cache] Erro ao persistir notícias no cache:', err)
  }
}
