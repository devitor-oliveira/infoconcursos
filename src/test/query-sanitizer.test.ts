import { describe, it, expect } from 'vitest'
import { buildSanitizedSearchQuery, isResultCurrent } from '../main/modules/search/query-sanitizer'
import { resolveCanonicalUrl } from '../main/modules/search/url-resolver'
import { parseDuckDuckGoHtml } from '../main/modules/search/duckduckgo.scraper'

describe('Fase 2 - Sanitizador de Buscas com Filtro Temporal Estrito & Scrapers', () => {
  it('deve construir query para busca pontual ("Banco do Brasil") com âncoras temporais 2026/2025 e exclusão de editais antigos', () => {
    const result = buildSanitizedSearchQuery({ termoLivre: 'Banco do Brasil' }, 2026)

    expect(result.targetContext).toBe('SPECIFIC_CONCURSO')
    expect(result.appliedYearAnchors).toEqual([2026, 2025])
    expect(result.internalQuery).toContain('concurso "Banco do Brasil"')
    expect(result.internalQuery).toContain('(2026 OR 2025)')
    expect(result.internalQuery).toContain('-"edital 2021"')
  })

  it('deve construir query para descoberta ampla ("Tribunais" em "SP")', () => {
    const result = buildSanitizedSearchQuery(
      { area: 'TRIBUNAIS', uf: 'SP', statusFiltro: 'PREVISTOS_AUTORIZADOS' },
      2026
    )

    expect(result.targetContext).toBe('BROAD_DISCOVERY')
    expect(result.internalQuery).toContain('SP')
    expect(result.internalQuery).toContain('"previsto"')
    expect(result.internalQuery).toContain('(2026 OR 2025)')
  })

  it('deve descartar resultados retroativos de concursos de 2021/2022/2023 e aprovar notícias de 2025/2026', () => {
    const oldResult = isResultCurrent(
      'Edital Banco do Brasil 2021 - Resultado Final Homologado',
      'Confira a lista de aprovados do concurso de 2021 da Cesgranrio.',
      '2021-10-12',
      2026
    )
    expect(oldResult).toBe(false)

    const currentResult = isResultCurrent(
      'Concurso Banco do Brasil 2026: novo edital previsto em estudos',
      'Saiba tudo sobre a previsão de vagas para Escriturário no próximo edital.',
      '2026-03-10',
      2026
    )
    expect(currentResult).toBe(true)
  })

  it('deve resolver URLs redirecionadas do DuckDuckGo Lite para a URL canônica limpa', () => {
    const raw = '//duckduckgo.com/l/?uddg=https%3A%2F%2Fportal.trt3.jus.br%2Fconcursos%3Futm_source%3Dddg'
    const canonical = resolveCanonicalUrl(raw)
    expect(canonical).toBe('https://portal.trt3.jus.br/concursos')
  })

  it('deve fazer parsing de HTML do DuckDuckGo filtrando resultados antigos', () => {
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

    const parsed = parseDuckDuckGoHtml(sampleHtml)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].url).toBe('https://portal.trt3.jus.br/novo-concurso-2026')
    expect(parsed[0].sourceDomain).toBe('portal.trt3.jus.br')
  })
})
