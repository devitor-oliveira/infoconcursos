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

describe('PortalsAndBancasScrapers (Parsers Síncronos com Fixtures Autênticas)', () => {
  it('deve extrair concursos com integridade de dados e lidar com pontuação complexa ao fazer parsing do HTML do PCI Concursos', () => {
    // 1. Arrange
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'pci-concursos.html'), 'utf-8')

    // 2. Act
    const results = parsePciHtml(html)

    // 3. Assert
    expect(results).toHaveLength(3)

    // TJ-SP
    const tjsp = results.find((r) => r.orgao.includes('TJ-SP'))
    expect(tjsp).toBeDefined()
    expect(tjsp!).toMatchObject({
      vagas: '500 vagas',
      prazoInscricao: 'Inscrições até 25/11/2025'
    })
    expect(tjsp!.remuneracao).toContain('R$ 7.200,00')
    expect(tjsp!.id).toMatch(/^pci-[0-9a-f]{16}$/)

    // Banco do Brasil (CR deve ser isolado por boundary regex)
    const bb = results.find((r) => r.orgao.includes('Banco do Brasil'))
    expect(bb).toBeDefined()
    expect(bb!.vagas).toBe('CR')

    // Prefeitura de Santa Bárbara d'Oeste (hífens, apóstrofos e acentos)
    const sb = results.find((r) => r.orgao.includes("Santa Bárbara d'Oeste"))
    expect(sb).toBeDefined()
    expect(sb!).toMatchObject({
      orgao: "Prefeitura de Santa Bárbara d'Oeste",
      vagas: '12 vagas'
    })
  })

  it('deve extrair títulos, salários e resolver URLs relativas ao fazer parsing do Ache Concursos', () => {
    // 1. Arrange
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'ache-concursos.html'), 'utf-8')

    // 2. Act
    const results = parseAcheConcursosHtml(html, 'MG')

    // 3. Assert
    expect(results).toHaveLength(2)

    const ibge = results.find((r) => r.orgao.includes('IBGE'))
    expect(ibge).toBeDefined()
    expect(ibge!.url).toMatch(/^https:\/\/www\.acheconcursos\.com\.br\//)
    expect(ibge!.remuneracao).toContain('R$ 9.350,00')
    expect(ibge!.vagas).toContain('895')
    expect(ibge!.id).toMatch(/^ache-[0-9a-f]{16}$/)

    const pc = results.find((r) => r.orgao.includes('Polícia Civil'))
    expect(pc).toBeDefined()
    expect(pc!.remuneracao).toContain('R$ 14.200,00')
  })

  it('deve extrair quantitativo de vagas e órgão estadual da tabela do Concursos no Brasil', () => {
    // 1. Arrange
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'concursos-no-brasil.html'), 'utf-8')

    // 2. Act
    const results = parseConcursosNoBrasilHtml(html, 'MG')

    // 3. Assert
    expect(results).toHaveLength(2)
    const uberlandia = results.find((r) => r.orgao.includes('Uberlândia'))
    expect(uberlandia).toBeDefined()
    expect(uberlandia!).toMatchObject({
      vagas: '150 vaga(s)',
      uf: 'MG',
      remuneracao: 'Não especificado na publicação'
    })
  })

  it('deve resolver links relativos e isolar vagas e Cadastro de Reserva ao processar Selecao.net Fundep', () => {
    // 1. Arrange
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'selecao-net-fundep.html'), 'utf-8')

    // 2. Act
    const results = parseSelecaoNetHtml(html, 'https://www.gestaodeconcursos.com.br', 'Fundep', 'MG')

    // 3. Assert
    expect(results).toHaveLength(2)
    const ufmg = results.find((r) => r.titulo.includes('UFMG'))
    expect(ufmg).toBeDefined()
    expect(ufmg!.url).toBe('https://www.gestaodeconcursos.com.br/informacoes/concurso-ufmg-tecnicos-2025')
    expect(ufmg!.vagas).toContain('35 vagas imediatas')

    const copasa = results.find((r) => r.titulo.includes('COPASA'))
    expect(copasa).toBeDefined()
    expect(copasa!.vagas).toBe('CR')
  })

  it('deve extrair editais com URLs absolutas a partir do Gestor de Editais Idecan', () => {
    // 1. Arrange
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'gestor-editais-idecan.html'), 'utf-8')

    // 2. Act
    const results = parseGestorEditaisHtml(html, 'https://idecan.org.br', 'Idecan', 'MG')

    // 3. Assert
    expect(results).toHaveLength(2)
    const cbmmg = results.find((r) => r.titulo.includes('CBM-MG'))
    expect(cbmmg).toBeDefined()
    expect(cbmmg!).toMatchObject({
      url: 'https://idecan.org.br/edital/ver/145',
      fonte: 'Idecan'
    })
  })

  it('deve extrair certames e remover prefixos redundantes ao processar portal FGV Conhecimento', () => {
    // 1. Arrange
    const html = fs.readFileSync(path.join(FIXTURES_DIR, 'fgv-conhecimento.html'), 'utf-8')

    // 2. Act
    const results = parseFgvHtml(html)

    // 3. Assert
    expect(results).toHaveLength(2)
    const tse = results.find((r) => r.titulo.includes('TSE'))
    expect(tse).toBeDefined()
    expect(tse!.url).toBe('https://conhecimento.fgv.br/concursos/tse-unificado-2025')
    expect(tse!.orgao).toContain('Tribunal Superior Eleitoral')
  })

  it('deve extrair notícias jornalísticas com data ISO válida do feed RSS Gran Cursos', () => {
    // 1. Arrange
    const xml = fs.readFileSync(path.join(FIXTURES_DIR, 'rss-grancursos.xml'), 'utf-8')

    // 2. Act
    const results = parseGranCursosRssXml(xml)

    // 3. Assert
    expect(results).toHaveLength(2)
    const correios = results.find((r) => r.titulo.includes('Correios'))
    expect(correios).toBeDefined()
    expect(correios!).toMatchObject({
      portalFonte: 'Gran Cursos Online',
      tipoConteudo: 'NOTICIA_APURACAO'
    })
    expect(isNaN(Date.parse(correios!.dataPublicacao))).toBe(false)
  })
})
