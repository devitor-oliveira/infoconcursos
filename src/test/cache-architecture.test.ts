import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
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

describe('Fase 6: Arquitetura de Cache SQLite Local e Zero Requisições Desnecessárias', () => {
  const tempCacheDbPath = path.join(os.tmpdir(), `infoconcursos-cache-test-${Date.now()}.db`)

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

  beforeAll(async () => {
    await initDatabase(tempCacheDbPath)
  })

  afterAll(() => {
    closeDatabase()
    if (fs.existsSync(tempCacheDbPath)) {
      try {
        fs.unlinkSync(tempCacheDbPath)
      } catch {
        // ignora lock de exclusão no windows
      }
    }
  })

  it('buildCacheKey deve normalizar acentos, maiúsculas e gerar chave estável', () => {
    const key1 = buildCacheKey({ termoLivre: 'TRT Minas Gerais', area: 'TRIBUNAIS', uf: 'MG' })
    const key2 = buildCacheKey({ termoLivre: '  trt minas gerais  ', area: 'TRIBUNAIS', uf: 'MG' })
    expect(key1).toBe(key2)
    expect(key1).toBe('search:trt_minas_gerais:TRIBUNAIS:MG:TODOS')
  })

  it('1ª Busca (Cache Miss): deve retornar null quando o cache estiver vazio', () => {
    const cached = getCachedSearchResults(mockFilter)
    expect(cached).toBeNull()
  })

  it('Salva resultados de busca no SQLite com integridade referencial', () => {
    expect(() => saveSearchResultsToCache(mockFilter, mockDossiers)).not.toThrow()
  })

  it('2ª Busca (Cache Hit): deve retornar dados salvos instantaneamente sem acessar a rede', () => {
    const tStart = performance.now()
    const cached = getCachedSearchResults(mockFilter)
    const tElapsed = performance.now() - tStart

    expect(cached).not.toBeNull()
    expect(cached?.data).toHaveLength(1)
    expect(cached?.data[0].id).toBe('trt-mg-2025-01')
    expect(cached?.data[0].orgao).toBe('Tribunal Regional do Trabalho da 3ª Região')
    expect(cached?.data[0].tipoRegistro).toBe('EDITAL_OFICIAL')

    // Deve responder em menos de 100ms (típico sub-5ms em SQLite in-memory)
    expect(tElapsed).toBeLessThan(100)
  })

  it('Ciclo de Cache para Notícias: Miss -> Salvar -> Hit com metadados de sync', () => {
    // 1. Miss inicial
    const initialNews = getCachedNews('TRIBUNAIS', 'MG')
    expect(initialNews).toBeNull()

    // 2. Salva no cache
    saveNewsToCache(mockNews)

    // 3. Hit subsequente
    const cachedNews = getCachedNews('TRIBUNAIS', 'MG')
    expect(cachedNews).not.toBeNull()
    expect(cachedNews?.data).toHaveLength(1)
    expect(cachedNews?.data[0].id).toBe('news-trt-01')
    expect(cachedNews?.data[0].titulo).toContain('TRT-MG define comissão')
    expect(cachedNews?.atualizadoEm).toBeDefined()
  })
})
