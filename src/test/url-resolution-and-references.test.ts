import { describe, it, expect } from 'vitest'
import {
  unescapeHtmlEntities,
  normalizeToAbsoluteHttps,
  decodeGoogleNewsUrl,
  findBancaByQueryOrName,
  resolveOfficialDossierLinks
} from '../main/modules/search/url-resolver'
import { BANCAS_REGISTRY } from '../shared/constants/sources-registry'

describe('UrlResolver (Resolução de URLs Canônicas e Desacoplamento de Fontes Oficiais)', () => {
  describe('HTML Entities Unescaping & URL Normalization', () => {
    it('deve desescapar entidades HTML que corrompem URLs de links do DuckDuckGo ou RSS', () => {
      const corrupted = 'https://concursos.exemplo.com.br/ver?id=123&amp;origem=web&amp;ano=2026'
      const unescaped = unescapeHtmlEntities(corrupted)
      expect(unescaped).toBe('https://concursos.exemplo.com.br/ver?id=123&origem=web&ano=2026')
    })

    it('deve converter URLs relativas para absolutas com HTTPS e remover parâmetros de rastreamento', () => {
      const relative = '/noticias/concurso-tce-mg-2026?utm_source=feed&utm_campaign=tracker'
      const absolute = normalizeToAbsoluteHttps(relative, 'https://www.pciconcursos.com.br')
      expect(absolute).toBe('https://www.pciconcursos.com.br/noticias/concurso-tce-mg-2026')
      expect(absolute).not.toContain('utm_source')
    })

    it('deve descartar links javascript:, mailto: ou âncoras #', () => {
      expect(normalizeToAbsoluteHttps('#')).toBe('')
      expect(normalizeToAbsoluteHttps('javascript:void(0)')).toBe('')
      expect(normalizeToAbsoluteHttps('mailto:contato@banca.org.br')).toBe('')
    })
  })

  describe('Google News CBMi Decoder & Safe Fallbacks', () => {
    it('deve retornar a própria URL se não for do domínio news.google.com', () => {
      const regularUrl = 'https://g1.globo.com/economia/concursos-e-emprego/noticia/2026/02/concursos.ghtml'
      expect(decodeGoogleNewsUrl(regularUrl)).toBe(regularUrl)
    })

    it('deve recorrer ao fallback de sourceUrl seguro quando o token CBMi for opaco', () => {
      const opaqueGoogleUrl = 'https://news.google.com/rss/articles/CBMi_invalid_opaque_token'
      const fallback = 'https://www.folhadirigida.com.br'
      const resolved = decodeGoogleNewsUrl(opaqueGoogleUrl, fallback)
      expect(resolved).toBe(fallback)
    })
  })

  describe('Cadastro Oficial de 19 Bancas Organizadoras', () => {
    it('deve reconhecer todas as 19 bancas registradas pelo nome, sigla ou regex', () => {
      expect(BANCAS_REGISTRY.length).toBe(19)

      const testCases = [
        { query: 'Fundep Gestão de Concursos', expectedId: 'fundep' },
        { query: 'FUMARC', expectedId: 'fumarc' },
        { query: 'Instituto Consulplan', expectedId: 'consulplan' },
        { query: 'IBGP Concursos', expectedId: 'ibgp' },
        { query: 'Fundação CEFETMINAS', expectedId: 'funcefet' },
        { query: 'JCM Concursos', expectedId: 'jcm' },
        { query: 'IBAM', expectedId: 'ibam' },
        { query: 'Cebraspe', expectedId: 'cebraspe' },
        { query: 'FGV Conhecimento', expectedId: 'fgv' },
        { query: 'Fundação Carlos Chagas', expectedId: 'fcc' },
        { query: 'Fundação Cesgranrio', expectedId: 'cesgranrio' },
        { query: 'IBFC', expectedId: 'ibfc' },
        { query: 'Fundação Vunesp', expectedId: 'vunesp' },
        { query: 'Instituto Selecon', expectedId: 'selecon' },
        { query: 'Idecan', expectedId: 'idecan' },
        { query: 'Ibade', expectedId: 'ibade' },
        { query: 'Instituto Access', expectedId: 'access' },
        { query: 'Fundatec', expectedId: 'fundatec' },
        { query: 'IADES', expectedId: 'iades' }
      ]

      for (const tc of testCases) {
        const found = findBancaByQueryOrName(tc.query)
        expect(found, `Banca não encontrada para: ${tc.query}`).toBeDefined()
        expect(found?.id).toBe(tc.expectedId)
        expect(found?.baseUrl).toMatch(/^https?:\/\//)
      }
    })
  })

  describe('Desacoplamento e Resolução de Fontes Oficiais do Dossiê (Opção 1 + 3)', () => {
    it('deve definir urlCanonica estritamente para a banca oficial quando identificada', () => {
      const res = resolveOfficialDossierLinks({
        orgao: 'Tribunal de Justiça de Minas Gerais',
        rawTitle: 'Concurso TJMG 2026 - Edital Publicado pela FGV',
        bancaNameHint: 'FGV',
        sourceUrl: 'https://www.pciconcursos.com.br/noticias/tjmg-2026',
        sourceFonte: 'PCI Concursos',
        isDirectBancaEdital: false
      })

      // urlCanonica NUNCA deve ser o agregador PCI Concursos
      expect(res.urlCanonica).not.toContain('pciconcursos')
      expect(res.urlCanonica).toContain('fgv.br')

      // Deve possuir no mínimo 2 fontes válidas
      expect(res.linksReferencia.length).toBeGreaterThanOrEqual(2)

      // Deve conter link da banca e link oficial governamental
      const bancaLink = res.linksReferencia.find((l) => l.tipo === 'BANCA')
      expect(bancaLink).toBeDefined()
      expect(bancaLink?.url).toContain('fgv.br')

      const govLink = res.linksReferencia.find((l) => l.tipo === 'PORTAL_OFICIAL')
      expect(govLink).toBeDefined()

      // Agregador PCI deve ser rebaixado para cobertura jornalística secundária
      const newsLink = res.linksReferencia.find((l) => l.tipo === 'NOTICIA')
      expect(newsLink).toBeDefined()
      expect(newsLink?.url).toBe('https://www.pciconcursos.com.br/noticias/tjmg-2026')
    })

    it('deve gerar busca no Diário Oficial/Gov quando a banca ainda não foi definida', () => {
      const res = resolveOfficialDossierLinks({
        orgao: 'Secretaria de Fazenda de Minas Gerais',
        rawTitle: 'Concurso SEF MG com comissão formada',
        sourceUrl: 'https://www.acheconcursos.com.br/noticia/sef-mg-2026',
        sourceFonte: 'Ache Concursos',
        isDirectBancaEdital: false
      })

      expect(res.urlCanonica).toContain('google.com/search')
      expect(res.urlCanonica).toContain('site%3Agov.br')
      expect(res.linksReferencia.length).toBeGreaterThanOrEqual(2)
    })

    it('deve preservar urlCanonica da banca organizadora quando a coleta for direta', () => {
      const res = resolveOfficialDossierLinks({
        orgao: 'Prefeitura de Belo Horizonte',
        rawTitle: 'Processo Seletivo PBH Fundep',
        sourceUrl: 'https://fundep.selecao.net.br/informacoes/123/',
        sourceFonte: 'Fundep',
        isDirectBancaEdital: true
      })

      expect(res.urlCanonica).toBe('https://fundep.selecao.net.br/informacoes/123/')
      const bancaLink = res.linksReferencia.find((l) => l.tipo === 'BANCA')
      expect(bancaLink).toBeDefined()
      expect(bancaLink?.url).toBe('https://fundep.selecao.net.br/informacoes/123/')
    })
  })
})
