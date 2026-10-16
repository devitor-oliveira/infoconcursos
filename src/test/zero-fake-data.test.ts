import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { detectConcursoStatusAndBanca } from '../main/modules/dossier/status-detector'
import { extractEstimatedTimeline, parseDeadlineDate } from '../main/modules/dossier/date-extractor'
import { parseSafeIsoDate } from '../main/modules/news/sitemap-rss.scraper'
import { convertConcreteToDossier } from '../main/modules/search/portals-concrete.scraper'
import { ConcreteScrapedConcurso } from '../main/modules/search/portals-concrete.scraper'

describe('Fase 6: Suite "Zero Fake Data" e Validação Estrita de Integridade Editorial', () => {
  it('não deve inferir INSCRICOES_ABERTAS quando houver frases negativas', () => {
    const textNegativa = 'O órgão informou que ainda não abriu inscrições para o concurso de 2025.'
    const result = detectConcursoStatusAndBanca([textNegativa])
    expect(result.status).not.toBe('INSCRICOES_ABERTAS')
  })

  it('deve detectar cancelamento ou suspensão em vez de status ativo', () => {
    const textCancelado = 'Concurso da Prefeitura foi suspenso e cancelado temporariamente pelo tribunal de contas.'
    const result = detectConcursoStatusAndBanca([textCancelado])
    expect(result.statusLabel).toContain('Suspenso')
  })

  it('deve retornar DESCONHECIDO quando não houver evidências de status em vez de forçar INSCRICOES_ABERTAS', () => {
    const textNeutro = 'Informações gerais e histórico sobre a carreira tributária no Brasil.'
    const result = detectConcursoStatusAndBanca([textNeutro])
    expect(result.status).toBe('DESCONHECIDO')
  })

  it('date extractor não deve inventar prazos futuros fictícios', () => {
    const textSemDatas = 'Discussões em andamento na assembleia legislativa para nova carreira.'
    const timeline = extractEstimatedTimeline([textSemDatas], 'DESCONHECIDO')

    expect(timeline.previsaoEdital).toBe('A definir pelo órgão')
    expect(timeline.previsaoEdital).not.toContain('próximas semanas')
    expect(timeline.previsaoEdital).not.toContain('60 e 90 dias')
    expect(timeline.previsaoEdital).not.toContain('próximos 3 meses')
  })

  it('parseDeadlineDate deve extrair data válida ou retornar null sem inventar datas', () => {
    const textComData = 'As inscrições encerram no dia 25/11/2025 às 23h59.'
    const dataExtraida = parseDeadlineDate(textComData)
    expect(dataExtraida).not.toBeNull()
    expect(dataExtraida?.getDate()).toBe(25)
    expect(dataExtraida?.getMonth()).toBe(10) // Novembro = mês 10 (0-indexed)
    expect(dataExtraida?.getFullYear()).toBe(2025)

    const textSemData = 'Período de inscrições ainda não divulgado pela organizadora.'
    const dataNull = parseDeadlineDate(textSemData)
    expect(dataNull).toBeNull()
  })

  it('parseSafeIsoDate deve retornar ISO válido e evitar RangeError para strings inválidas', () => {
    const valid = parseSafeIsoDate('2025-10-16T14:30:00Z')
    expect(valid).toBe('2025-10-16T14:30:00.000Z')

    const rfc = parseSafeIsoDate('Thu, 16 Oct 2025 14:00:00 +0000')
    expect(isNaN(Date.parse(rfc))).toBe(false)

    // Entrada inválida não deve explodir RangeError
    const invalid = parseSafeIsoDate('Data_Invalida_Qualquer_XYZ')
    expect(isNaN(Date.parse(invalid))).toBe(false)
  })

  it('convertConcreteToDossier deve preservar tipoRegistro AGREGADOR quando a fonte for agregador', () => {
    const mockItem: ConcreteScrapedConcurso = {
      id: 'pci-123',
      orgao: 'Tribunal Regional',
      titulo: 'Concurso TRT 2025',
      uf: 'MG',
      vagas: '10 vagas',
      remuneracao: 'R$ 8.000,00',
      url: 'https://pciconcursos.com.br/teste',
      fonte: 'PCI Concursos'
    }

    const dossier = convertConcreteToDossier(mockItem)
    expect(dossier.tipoRegistro).toBe('AGREGADOR')
    expect(dossier.banca.situacao).toBe('A_DEFINIR')
  })

  it('auditoria estática: varredura do codebase assegura ausência total de strings artificiais proibidas', () => {
    const modulesDir = path.resolve(__dirname, '../main/modules')

    function scanDir(dir: string): string[] {
      const files: string[] = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) {
          files.push(...scanDir(full))
        } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
          files.push(full)
        }
      }
      return files
    }

    const forbiddenPhrases = [
      'Edital iminente nas próximas semanas',
      'entre 60 e 90 dias',
      'Edital previsto para os próximos 3 meses'
    ]

    const allCodeFiles = scanDir(modulesDir)
    for (const file of allCodeFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const phrase of forbiddenPhrases) {
        expect(content, `Arquivo ${file} contém frase artificial proibida: "${phrase}"`).not.toContain(phrase)
      }
    }
  })
})
