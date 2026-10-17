import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { initDatabase, closeDatabase } from '../main/database'
import {
  buildCacheKey,
  getCachedSearchResults,
  saveSearchResultsToCache,
  getCachedNews,
  saveNewsToCache
} from '../main/modules/search/search-cache-service'
import { ConcursoDossier } from '../shared/types/concurso'
import { SearchFilter } from '../shared/types/search'
import { NewsItem } from '../shared/types/news'

describe('SearchCacheService (SQLite In-Memory Hermético)', () => {
  beforeEach(async () => {
    closeDatabase()
    await initDatabase(':memory:')
  })

  afterEach(() => {
    closeDatabase()
  })

  const mockFilter: SearchFilter = {
    termoLivre: 'Tribunal Regional do Trabalho MG',
    area: 'TRIBUNAIS',
    uf: 'MG',
    statusFiltro: 'TODOS'
  }

  const mockDossiers: ConcursoDossier[] = [
    {
      id: 'trt-mg-2025-01',
      urlCanonica: 'https://trt3.jus.br/concursos/2025',
      termoOriginal: 'TRT MG',
      orgao: 'Tribunal Regional do Trabalho da 3ª Região',
      tituloConcurso: 'Concurso TRT-MG 2025',
      area: 'TRIBUNAIS',
      uf: 'MG',
      status: 'COMISSAO_FORMADA',
      statusLabel: 'Comissão Formada',
      resumoGeral: 'Comissão instituída para novo concurso de Analistas e Técnicos.',
      tipoRegistro: 'EDITAL_OFICIAL',
      banca: {
        nome: 'A definir',
        situacao: 'A_DEFINIR',
        observacao: 'Fase de elaboração do termo de referência.'
      },
      cronograma: {
        previsaoEdital: 'A definir pelo órgão',
        ultimaMovimentacao: 'Portaria de comissão publicada no DJE.'
      },
      cargosPrevistos: [],
      materiasRecomendadas: ['Direito do Trabalho', 'Direito Processual do Trabalho'],
      linksReferencia: [],
      atualizadoEm: new Date().toISOString()
    }
  ]

  const mockNews: NewsItem[] = [
    {
      id: 'news-trt-01',
      titulo: 'TRT-MG define comissão organizadora de novo concurso para servidores',
      resumo: 'Portaria foi divulgada nesta manhã autorizando o início dos trabalhos.',
      url: 'https://noticiasconcursos.com.br/trt-mg-comissao',
      portalFonte: 'Ache Concursos',
      dataPublicacao: new Date().toISOString(),
      area: 'TRIBUNAIS',
      uf: 'MG',
      statusRelacionado: 'COMISSAO_FORMADA',
      orgaoRelacionado: 'TRT-MG',
      tipoConteudo: 'NOTICIA_APURACAO'
    }
  ]

  it('deve gerar chave canônica normalizada quando receber termos com acentos ou espaços', () => {
    // 1. Arrange & Act
    const key1 = buildCacheKey({ termoLivre: 'TRT Minas Gerais', area: 'TRIBUNAIS', uf: 'MG' })
    const key2 = buildCacheKey({ termoLivre: '  trt minas gerais  ', area: 'TRIBUNAIS', uf: 'MG' })

    // 3. Assert
    expect(key1).toBe(key2)
    expect(key1).toBe('search:trt_minas_gerais:TRIBUNAIS:MG:TODOS')
  })

  it('deve retornar null quando a consulta não existir no cache (Cache Miss)', () => {
    // 1. Arrange & Act
    const cached = getCachedSearchResults(mockFilter)

    // 3. Assert
    expect(cached).toBeNull()
  })

  it('deve persistir e recuperar resultados do cache instantaneamente (< 100ms) quando houver Cache Hit', () => {
    // 1. Arrange
    saveSearchResultsToCache(mockFilter, mockDossiers)

    // 2. Act
    const tStart = performance.now()
    const cached = getCachedSearchResults(mockFilter)
    const tElapsed = performance.now() - tStart

    // 3. Assert
    expect(cached).not.toBeNull()
    expect(cached?.data).toHaveLength(1)
    expect(cached?.data[0].id).toBe('trt-mg-2025-01')
    expect(cached?.data[0].orgao).toBe('Tribunal Regional do Trabalho da 3ª Região')
    expect(cached?.data[0].tipoRegistro).toBe('EDITAL_OFICIAL')
    expect(tElapsed).toBeLessThan(100)
  })

  it('deve gerenciar o ciclo de vida do cache de notícias com metadados de sincronização', () => {
    // 1. Arrange: Miss inicial
    const initialNews = getCachedNews('TRIBUNAIS', 'MG')
    expect(initialNews).toBeNull()

    // 2. Act: Salvar no cache
    saveNewsToCache(mockNews)
    const cachedNews = getCachedNews('TRIBUNAIS', 'MG')

    // 3. Assert: Hit com metadados
    expect(cachedNews).not.toBeNull()
    expect(cachedNews?.data).toHaveLength(1)
    expect(cachedNews?.data[0].id).toBe('news-trt-01')
    expect(cachedNews?.data[0].titulo).toContain('TRT-MG define comissão')
    expect(cachedNews?.atualizadoEm).toBeDefined()
  })
})
