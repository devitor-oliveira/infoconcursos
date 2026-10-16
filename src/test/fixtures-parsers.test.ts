import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  parsePciHtml,
  parseAcheConcursosHtml,
  parseConcursosNoBrasilHtml
} from '../main/modules/search/portals-concrete.scraper'
import {
  parseSelecaoNetHtml,
  parseGestorEditaisHtml,
  parseFgvHtml
} from '../main/modules/search/bancas-concrete.scraper'
import { parseGranCursosRssXml } from '../main/modules/news/sitemap-rss.scraper'

const FIXTURES_DIR = path.resolve(__dirname, 'fixtures')

describe('Fase 6: Testes Unitários de Parsers Síncronos com Fixtures Reais', () => {
  it('parsePciHtml deve extrair concursos sem inventar dados e lidar com nomes com acentos e aspas', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'pci-concursos.html'), 'utf-8')
    const results = parsePciHtml(html)

    expect(results.length).toBe(3)

    // 1. TJ-SP
    const tjsp = results.find((r) => r.orgao.includes('TJ-SP'))
    expect(tjsp).toBeDefined()
    expect(tjsp?.vagas).toBe('500 vagas')
    expect(tjsp?.remuneracao).toContain('R$ 7.200,00')
    expect(tjsp?.prazoInscricao).toBe('Inscrições até 25/11/2025')
    expect(tjsp?.id).toMatch(/^pci-[0-9a-f]{16}$/)

    // 2. Banco do Brasil (CR deve ser isolado por boundary)
    const bb = results.find((r) => r.orgao.includes('Banco do Brasil'))
    expect(bb).toBeDefined()
    expect(bb?.vagas).toBe('CR')

    // 3. Prefeitura de Santa Bárbara d'Oeste (hífens, apóstrofos e acentos)
    const sb = results.find((r) => r.orgao.includes("Santa Bárbara d'Oeste"))
    expect(sb).toBeDefined()
    expect(sb?.orgao).toBe("Prefeitura de Santa Bárbara d'Oeste")
    expect(sb?.vagas).toBe('12 vagas')
  })

  it('parseAcheConcursosHtml deve extrair títulos, salários e resolver links relativos', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'ache-concursos.html'), 'utf-8')
    const results = parseAcheConcursosHtml(html, 'MG')

    expect(results.length).toBe(2)

    const ibge = results.find((r) => r.orgao.includes('IBGE'))
    expect(ibge).toBeDefined()
    expect(ibge?.url).toMatch(/^https:\/\/www\.acheconcursos\.com\.br\//)
    expect(ibge?.remuneracao).toContain('R$ 9.350,00')
    expect(ibge?.vagas).toContain('895')
    expect(ibge?.id).toMatch(/^ache-[0-9a-f]{16}$/)

    const pc = results.find((r) => r.orgao.includes('Polícia Civil'))
    expect(pc).toBeDefined()
    expect(pc?.remuneracao).toContain('R$ 14.200,00')
  })

  it('parseConcursosNoBrasilHtml deve extrair vagas e órgão da tabela', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'concursos-no-brasil.html'), 'utf-8')
    const results = parseConcursosNoBrasilHtml(html, 'MG')

    expect(results.length).toBe(2)
    const uberlandia = results.find((r) => r.orgao.includes('Uberlândia'))
    expect(uberlandia).toBeDefined()
    expect(uberlandia?.vagas).toBe('150 vaga(s)')
    expect(uberlandia?.uf).toBe('MG')
    expect(uberlandia?.remuneracao).toBe('Não especificado na publicação')
  })

  it('parseSelecaoNetHtml deve resolver URLs relativas da Fundep e extrair CR e vagas imediatas', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'selecao-net-fundep.html'), 'utf-8')
    const results = parseSelecaoNetHtml(html, 'https://www.gestaodeconcursos.com.br', 'Fundep', 'MG')

    expect(results.length).toBe(2)
    const ufmg = results.find((r) => r.titulo.includes('UFMG'))
    expect(ufmg).toBeDefined()
    expect(ufmg?.url).toBe('https://www.gestaodeconcursos.com.br/informacoes/concurso-ufmg-tecnicos-2025')
    expect(ufmg?.vagas).toContain('35 vagas imediatas')

    const copasa = results.find((r) => r.titulo.includes('COPASA'))
    expect(copasa).toBeDefined()
    expect(copasa?.vagas).toBe('CR')
  })

  it('parseGestorEditaisHtml deve extrair editais com URL absoluta', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'gestor-editais-idecan.html'), 'utf-8')
    const results = parseGestorEditaisHtml(html, 'https://idecan.org.br', 'Idecan', 'MG')

    expect(results.length).toBe(2)
    const cbmmg = results.find((r) => r.titulo.includes('CBM-MG'))
    expect(cbmmg).toBeDefined()
    expect(cbmmg?.url).toBe('https://idecan.org.br/edital/ver/145')
    expect(cbmmg?.fonte).toBe('Idecan')
  })

  it('parseFgvHtml deve extrair certames e limpar prefixo "Concurso Público para"', () => {
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'fgv-conhecimento.html'), 'utf-8')
    const results = parseFgvHtml(html)

    expect(results.length).toBe(2)
    const tse = results.find((r) => r.titulo.includes('TSE'))
    expect(tse).toBeDefined()
    expect(tse?.url).toBe('https://conhecimento.fgv.br/concursos/tse-unificado-2025')
    expect(tse?.orgao).toContain('Tribunal Superior Eleitoral')
  })

  it('parseGranCursosRssXml deve extrair notícias com data ISO válida e sem erros', () => {
    const xml = fs.readFileSync(path.join(FIXTURES_DIR, 'rss-grancursos.xml'), 'utf-8')
    const results = parseGranCursosRssXml(xml)

    expect(results.length).toBe(2)
    const correios = results.find((r) => r.titulo.includes('Correios'))
    expect(correios).toBeDefined()
    expect(correios?.portalFonte).toBe('Gran Cursos Online')
    expect(correios?.tipoConteudo).toBe('NOTICIA_APURACAO')
    expect(isNaN(Date.parse(correios!.dataPublicacao))).toBe(false)
  })
})
