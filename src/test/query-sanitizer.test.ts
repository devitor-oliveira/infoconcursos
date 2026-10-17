import { describe, it, expect } from 'vitest'
import { buildSanitizedSearchQuery, isResultCurrent } from '../main/modules/search/query-sanitizer'
import { resolveCanonicalUrl } from '../main/modules/search/url-resolver'
import { parseDuckDuckGoHtml } from '../main/modules/search/duckduckgo.scraper'

describe('QuerySanitizer (Sanitização e Filtro Temporal Anti-Retroatividade)', () => {
  describe('buildSanitizedSearchQuery()', () => {
    it('deve construir query pontual com âncoras temporais quando receber termo específico de concurso', () => {
      // Arrange
      const filtro = { termoLivre: 'Banco do Brasil' }
      const anoReferencia = 2026

      // Act
      const result = buildSanitizedSearchQuery(filtro, anoReferencia)

      // Assert
      expect(result.targetContext).toBe('SPECIFIC_CONCURSO')
      expect(result.appliedYearAnchors).toEqual([2026, 2025])
      expect(result.internalQuery).toContain('concurso "Banco do Brasil"')
      expect(result.internalQuery).toContain('(2026 OR 2025)')
      expect(result.internalQuery).toContain('-"edital 2021"')
    })

    it('deve construir query para descoberta ampla quando filtros de área e status forem informados', () => {
      // Arrange
      const filtro = { area: 'TRIBUNAIS' as const, uf: 'SP', statusFiltro: 'PREVISTOS_AUTORIZADOS' as const }
      const anoReferencia = 2026

      // Act
      const result = buildSanitizedSearchQuery(filtro, anoReferencia)

      // Assert
      expect(result.targetContext).toBe('BROAD_DISCOVERY')
      expect(result.internalQuery).toContain('SP')
      expect(result.internalQuery).toContain('"previsto"')
      expect(result.internalQuery).toContain('(2026 OR 2025)')
    })
  })

  describe('isResultCurrent() — Análise de Valores Limite (BVA ISO/IEC/IEEE 29119)', () => {
    const anoBase = 2026

    it('deve rejeitar resultado quando data de publicação for N-2 (ano 2024)', () => {
      // Arrange (N-2 = 2024)
      const titulo = 'Concurso Tribunal Regional 2024 - Resultado Homologado'
      const snippet = 'Lista de aprovados publicada em 2024.'
      const dataPublicacao = '2024-05-15'

      // Act
      const ehAtual = isResultCurrent(titulo, snippet, dataPublicacao, anoBase)

      // Assert
      expect(ehAtual).toBe(false)
    })

    it('deve aceitar resultado quando data de publicação for N-1 (ano base 2025)', () => {
      // Arrange (N-1 = 2025)
      const titulo = 'Concurso Tribunal Regional 2025: comissão formada'
      const snippet = 'Portaria constituída para novo certame.'
      const dataPublicacao = '2025-11-20'

      // Act
      const ehAtual = isResultCurrent(titulo, snippet, dataPublicacao, anoBase)

      // Assert
      expect(ehAtual).toBe(true)
    })

    it('deve aceitar resultado quando data de publicação for N (ano corrente 2026)', () => {
      // Arrange (N = 2026)
      const titulo = 'Concurso Banco do Brasil 2026: novo edital autorizado'
      const snippet = 'Previsão de vagas para Escriturário em 2026.'
      const dataPublicacao = '2026-02-10'

      // Act
      const ehAtual = isResultCurrent(titulo, snippet, dataPublicacao, anoBase)

      // Assert
      expect(ehAtual).toBe(true)
    })

    it('deve aceitar resultado quando certame for previsto para N+1 (ano 2027)', () => {
      // Arrange (N+1 = 2027)
      const titulo = 'Concurso Auditor Fiscal: edital previsto para 2027'
      const snippet = 'Planejamento orçamentário plurianual para realização em 2027.'
      const dataPublicacao = '2026-06-01'

      // Act
      const ehAtual = isResultCurrent(titulo, snippet, dataPublicacao, anoBase)

      // Assert
      expect(ehAtual).toBe(true)
    })

    it('deve descartar resultados obsoletos com padrões de editais e gabaritos de 2021 a 2023', () => {
      // Arrange
      const resultadoAntigo = isResultCurrent(
        'Edital Banco do Brasil 2021 - Resultado Final Homologado',
        'Confira a lista de aprovados do concurso de 2021 da Cesgranrio.',
        '2021-10-12',
        anoBase
      )

      // Assert
      expect(resultadoAntigo).toBe(false)
    })
  })

  describe('resolveCanonicalUrl()', () => {
    it('deve extrair URL de destino canônica e remover parâmetros de rastreamento de URLs do DuckDuckGo', () => {
      // Arrange
      const raw = '//duckduckgo.com/l/?uddg=https%3A%2F%2Fportal.trt3.jus.br%2Fconcursos%3Futm_source%3Dddg'

      // Act
      const canonical = resolveCanonicalUrl(raw)

      // Assert
      expect(canonical).toBe('https://portal.trt3.jus.br/concursos')
    })
  })

  describe('parseDuckDuckGoHtml()', () => {
    it('deve extrair resultados válidos e descartar links de certames obsoletos', () => {
      // Arrange
      const sampleHtml = `
        <div class="result">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fportal.trt3.jus.br%2Fnovo-concurso-2026">
            Concurso TRT MG 2026: comissão formada e edital previsto
          </a>
          <div class="result__snippet">Novo concurso aprovado para Técnico e Analista Judiciário em Minas Gerais.</div>
        </div>
        <div class="result">
          <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexemplo.com%2Fedital-2021">
            Resultado Final Concurso 2021 Homologado
          </a>
          <div class="result__snippet">Edital 2021 encerrado.</div>
        </div>
      `

      // Act
      const parsed = parseDuckDuckGoHtml(sampleHtml)

      // Assert
      expect(parsed).toHaveLength(1)
      expect(parsed[0].url).toBe('https://portal.trt3.jus.br/novo-concurso-2026')
      expect(parsed[0].sourceDomain).toBe('portal.trt3.jus.br')
    })
  })
})
