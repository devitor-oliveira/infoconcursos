import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchHtmlWithSafety } from '../main/modules/search/http-client'
import { parsePciHtml } from '../main/modules/search/portals-concrete.scraper'
import { parseConsulplanHtml } from '../main/modules/search/bancas-concrete.scraper'
import { parseGranCursosRssXml } from '../main/modules/news/sitemap-rss.scraper'

describe('Fase 6: Resiliência de Rede, Timeouts e Tratamento de Erros HTTP', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deve retornar null graciosamente quando receber HTTP 403 (Forbidden)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Access Denied', {
        status: 403,
        statusText: 'Forbidden'
      })
    )

    const res = await fetchHtmlWithSafety('https://example.com/concursos')
    expect(res).toBeNull()
  })

  it('deve retornar null graciosamente quando receber HTTP 429 (Too Many Requests / Rate Limiting)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Rate limit exceeded', {
        status: 429,
        statusText: 'Too Many Requests'
      })
    )

    const res = await fetchHtmlWithSafety('https://example.com/concursos')
    expect(res).toBeNull()
  })

  it('deve abortar e retornar null em caso de timeout de rede', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce((_url, init) => {
      return new Promise((_, reject) => {
        const signal = init?.signal as AbortSignal | undefined
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          })
        }
      })
    })

    // Timeout ultracurto (50ms) para execução rápida no teste
    const res = await fetchHtmlWithSafety('https://example.com/slow', { timeoutMs: 50 })
    expect(res).toBeNull()
  })

  it('deve rejeitar downloads binários pesados (ex.: application/pdf ou application/octet-stream)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('%PDF-1.4 binary content', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' }
      })
    )

    const res = await fetchHtmlWithSafety('https://example.com/edital.pdf')
    expect(res).toBeNull()
  })

  it('deve truncar payloads com tamanho superior a 2MB para proteger memória', async () => {
    const hugeHtml = '<html><body>' + 'A'.repeat(3 * 1024 * 1024) + '</body></html>'
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(hugeHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    )

    const res = await fetchHtmlWithSafety('https://example.com/huge')
    expect(res).not.toBeNull()
    expect(res?.html.length).toBe(2 * 1024 * 1024)
  })

  it('parsers devem lidar com HTML vazio ou corrompido sem lançar TypeError', () => {
    expect(() => parsePciHtml('')).not.toThrow()
    expect(parsePciHtml('')).toEqual([])

    expect(() => parseConsulplanHtml('<<<corrupted >> html ###')).not.toThrow()
    expect(parseConsulplanHtml('<<<corrupted >> html ###')).toEqual([])

    expect(() => parseGranCursosRssXml('not-xml')).not.toThrow()
    expect(parseGranCursosRssXml('not-xml')).toEqual([])
  })
})
