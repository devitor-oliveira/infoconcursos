import { describe, it, expect } from 'vitest'
import { matchRecommendedSubjects } from '../main/modules/dossier/syllabus-matcher'
import { detectConcursoStatusAndBanca } from '../main/modules/dossier/status-detector'
import {
  parsePciHtml,
  parseAcheConcursosHtml,
  parseConcursosNoBrasilHtml,
  convertConcreteToDossier
} from '../main/modules/search/portals-concrete.scraper'

describe('Fase 3 - Inteligência do Dossiê, Matérias de Estudo & Extrator de Dados', () => {
  it('deve extrair dados concretos do HTML do PCI Concursos ignorando certames expirados (.ea)', () => {
    const htmlFixture = `
      <div>
        <!-- Concurso Ativo (.na) -->
        <div class="na">
          <div class="ca">
            <a href="/concursos/sudeste/prefeitura-de-belo-horizonte-mg" title="Prefeitura de Belo Horizonte - MG">Prefeitura de Belo Horizonte</a>
          </div>
          <div class="cc">MG</div>
          <div class="cd">
            50 vagas até R$ 8.500,00
            <span>Analista de Políticas Públicas</span>
            <span>Superior</span>
          </div>
          <div class="ce">Até 30/11/2026</div>
        </div>
        <!-- Concurso Expirado (.ea) que DEVE ser ignorado -->
        <div class="ea">
          <div class="ca">
            <a href="/concursos/sudeste/concurso-antigo-mg">Concurso Antigo Já Encerrado</a>
          </div>
          <div class="cc">MG</div>
          <div class="cd">10 vagas R$ 2.000,00</div>
        </div>
      </div>
    `

    const parsed = parsePciHtml(htmlFixture, 'MG')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].orgao).toBe('Prefeitura de Belo Horizonte')
    expect(parsed[0].uf).toBe('MG')
    expect(parsed[0].vagas).toBe('50 vagas')
    expect(parsed[0].remuneracao).toBe('até R$ 8.500,00')
    expect(parsed[0].escolaridade).toBe('Superior')
    expect(parsed[0].prazoInscricao).toBe('Até 30/11/2026')
    expect(parsed[0].fonte).toBe('PCI Concursos')
  })

  it('deve extrair dados concretos de tabela do Ache Concursos', () => {
    const htmlFixture = `
      <table class="tbl-conc">
        <tbody>
          <tr>
            <td>
              <a href="/concurso/tribunal-de-justica-mg">
                <span class="titulo">TJMG - Tribunal de Justiça de Minas Gerais</span>
              </a>
              <span class="vagas">Nível: Superior</span>
              <span class="numero_vagas">120</span>
              <span class="sal_max">R$ 11.250,00</span>
              <span class="inscricao_fim">15/12/2026</span>
            </td>
          </tr>
        </tbody>
      </table>
    `

    const parsed = parseAcheConcursosHtml(htmlFixture, 'MG')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].orgao).toContain('TJMG')
    expect(parsed[0].vagas).toBe('120 vaga(s)')
    expect(parsed[0].remuneracao).toBe('Até R$ 11.250,00')
    expect(parsed[0].escolaridade).toBe('Superior')
    expect(parsed[0].prazoInscricao).toBe('Inscrições até 15/12/2026')
  })

  it('deve extrair dados concretos de tabela do Concursos no Brasil', () => {
    const htmlFixture = `
      <table>
        <tbody>
          <tr>
            <td>
              <a class="post-title" href="https://concursosnobrasil.com/concurso-copasa-mg" title="Concurso COPASA MG">COPASA MG</a>
            </td>
            <td class="center">45</td>
          </tr>
        </tbody>
      </table>
    `

    const parsed = parseConcursosNoBrasilHtml(htmlFixture, 'MG')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].orgao).toBe('COPASA MG')
    expect(parsed[0].vagas).toBe('45 vaga(s)')
  })

  it('deve converter item concreto para ConcursoDossier auditável sem inventar salários', () => {
    const itemSemSalario = {
      id: 'test-item-1',
      orgao: 'Prefeitura de Contagem',
      titulo: 'Concurso Prefeitura de Contagem 2026',
      uf: 'MG',
      vagas: '15 vagas',
      url: 'https://www.ibgpconcursos.com.br/concurso.jsp?id=123',
      fonte: 'IBGP Concursos',
      bancaNome: 'IBGP'
    }

    const dossier = convertConcreteToDossier(itemSemSalario, 'ADMINISTRATIVA')
    expect(dossier.tipoRegistro).toBe('EDITAL_OFICIAL')
    expect(dossier.orgao).toBe('Prefeitura de Contagem')
    expect(dossier.salarioMaximo).toBe('Não especificado na publicação')
    expect(dossier.numeroVagas).toBe('15 vagas')
    expect(dossier.banca.nome).toBe('IBGP')
  })

  it('deve detectar status e múltiplas bancas nacionais e mineiras a partir de trechos de notícias', () => {
    const infoFGV = detectConcursoStatusAndBanca([
      'Novo concurso público tem comissão formada e FGV cotada para organização.'
    ])
    expect(infoFGV.status).toBe('COMISSAO_FORMADA')
    expect(infoFGV.bancaDetectada?.nome).toContain('FGV')

    const infoFundep = detectConcursoStatusAndBanca([
      'A Gestão de Concursos Fundep abriu as inscrições para o novo certame em Minas Gerais.'
    ])
    expect(infoFundep.status).toBe('INSCRICOES_ABERTAS')
    expect(infoFundep.bancaDetectada?.nome).toContain('Fundep')

    const infoFUMARC = detectConcursoStatusAndBanca([
      'A FUMARC foi oficializada como banca organizadora do concurso da Polícia Civil de Minas Gerais.'
    ])
    expect(infoFUMARC.status).toBe('BANCA_DEFINIDA')
    expect(infoFUMARC.bancaDetectada?.nome).toContain('FUMARC')

    const infoIBGP = detectConcursoStatusAndBanca([
      'Edital publicado pela banca IBGP para a prefeitura de Contagem.'
    ])
    expect(infoIBGP.status).toBe('EDITAL_PUBLICADO')
    expect(infoIBGP.bancaDetectada?.nome).toContain('IBGP')
  })

  it('deve recomendar disciplinas adequadas para diferentes carreiras', () => {
    const policial = matchRecommendedSubjects('POLICIAL', ['Polícia Federal criminologia'])
    expect(policial).toContain('Direito Penal')
    expect(policial).toContain('Noções de Criminologia')

    const bancaria = matchRecommendedSubjects('BANCARIA', ['Banco do Brasil Escriturário'])
    expect(bancaria.some((s) => s.includes('Bancários'))).toBe(true)

    const tribunais = matchRecommendedSubjects('TRIBUNAIS', ['TRT Direito do Trabalho'])
    expect(tribunais.some((s) => s.includes('Trabalho'))).toBe(true)
  })
})
