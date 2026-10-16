import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { initDatabase, closeDatabase } from '../main/database'
import { concursosTable } from '../main/database/schema'
import { ConcursoDossier } from '../shared/types/concurso'
import { generateConcursoDossiers } from '../main/modules/dossier/dossier-generator'
import { detectDossierChanges } from '../main/modules/monitoring/change-detector'
import {
  toggleMonitorConcurso,
  listMonitoredConcursos,
  checkMonitoredUpdatesNow
} from '../main/modules/monitoring/monitor-service'

const tempE2eDbPath = path.join(os.tmpdir(), `infoconcursos-e2e-${Date.now()}.db`)

const sampleBbDossier: ConcursoDossier = {
  id: 'apuracao-bb-test',
  termoOriginal: 'Banco do Brasil',
  orgao: 'Banco do Brasil (BB)',
  tituloConcurso: 'Concurso Banco do Brasil 2026',
  area: 'BANCARIA',
  uf: 'BR',
  status: 'PREVISTO',
  statusLabel: 'Previsto / Autorizado',
  resumoGeral: 'Apuração jornalística de estudos internos para reposição de quadros do Banco do Brasil em 2026.',
  tipoRegistro: 'NOTICIA_APURACAO',
  prazoInscricao: 'A definir no edital oficial',
  numeroVagas: 'Consulte apuração',
  salarioMaximo: 'Não especificado na publicação',
  banca: {
    nome: 'Fundação Cesgranrio',
    situacao: 'COTADA_OU_HISTORICO',
    observacao: 'Banca tradicional dos concursos bancários.'
  },
  cronograma: {
    previsaoEdital: 'Segundo semestre de 2026',
    ultimaMovimentacao: 'Estudos de reposição de pessoal'
  },
  cargosPrevistos: [
    {
      titulo: 'Escriturário - Agente Comercial',
      escolaridade: 'MEDIO',
      vagas: 'A definir',
      remuneracao: 'Não especificado na publicação',
      descricaoAtribuicoes: 'Atendimento aos clientes e operações financeiras.'
    }
  ],
  materiasRecomendadas: ['Língua Portuguesa', 'Matemática Financeira', 'Conhecimentos Bancários'],
  linksReferencia: [
    {
      id: 'ref-bb-1',
      titulo: 'Notícia apuração BB 2026',
      url: 'https://folha.qconcursos.com/concurso-bb-2026',
      fonte: 'Folha Dirigida',
      tipo: 'NOTICIA'
    }
  ],
  atualizadoEm: new Date().toISOString()
}

const sampleTrtMgDossier: ConcursoDossier = {
  id: 'edital-trt-mg-test',
  termoOriginal: 'TRT MG',
  orgao: 'TRT-MG (Tribunal Regional do Trabalho 3ª Região)',
  tituloConcurso: 'Concurso TRT 3ª Região Minas Gerais',
  area: 'TRIBUNAIS',
  uf: 'MG',
  status: 'COMISSAO_FORMADA',
  statusLabel: 'Comissão Formada',
  resumoGeral: 'Comissão instituída em portaria para novo concurso de servidores do TRT-MG.',
  tipoRegistro: 'EDITAL_OFICIAL',
  prazoInscricao: 'Aguardando publicação do edital',
  numeroVagas: 'Cargos vagos e CR',
  salarioMaximo: 'Não especificado na publicação',
  banca: {
    nome: 'Fundação Carlos Chagas (FCC)',
    situacao: 'COTADA_OU_HISTORICO',
    observacao: 'Banca tradicional do certame.'
  },
  cronograma: {
    previsaoEdital: 'Final de 2026',
    ultimaMovimentacao: 'Portaria de comissão'
  },
  cargosPrevistos: [
    {
      titulo: 'Técnico Judiciário - Área Administrativa',
      escolaridade: 'SUPERIOR',
      vagas: 'CR',
      remuneracao: 'Não especificado na publicação',
      descricaoAtribuicoes: 'Atividades judiciárias e administrativas.'
    }
  ],
  materiasRecomendadas: ['Direito Constitucional', 'Direito Administrativo', 'Direito do Trabalho', 'Direito Processual do Trabalho'],
  linksReferencia: [
    {
      id: 'ref-trt-1',
      titulo: 'Portaria de instituição de comissão TRT 3',
      url: 'https://www.trt3.jus.br/noticias',
      fonte: 'TRT 3',
      tipo: 'PORTAL_OFICIAL'
    }
  ],
  atualizadoEm: new Date().toISOString()
}

const sampleTjSpDossier: ConcursoDossier = {
  id: 'edital-tjsp-test',
  termoOriginal: 'TJ-SP',
  orgao: 'TJ-SP (Tribunal de Justiça de São Paulo)',
  tituloConcurso: 'Concurso Tribunal de Justiça do Estado de São Paulo',
  area: 'TRIBUNAIS',
  uf: 'SP',
  status: 'EDITAL_PUBLICADO',
  statusLabel: 'Edital Publicado',
  resumoGeral: 'Edital publicado para Escrevente Técnico Judiciário do TJ-SP.',
  tipoRegistro: 'EDITAL_OFICIAL',
  prazoInscricao: 'Inscrições abertas',
  numeroVagas: '572 vagas',
  salarioMaximo: 'R$ 6.046,56',
  banca: {
    nome: 'Fundação Vunesp',
    situacao: 'CONTRATADA',
    observacao: 'Banca oficial do certame.'
  },
  bancaUrl: 'https://www.vunesp.com.br',
  cronograma: {
    previsaoEdital: 'Publicado',
    ultimaMovimentacao: 'Edital de abertura'
  },
  cargosPrevistos: [],
  materiasRecomendadas: ['Língua Portuguesa', 'Direito Constitucional', 'Direito Administrativo'],
  linksReferencia: [],
  atualizadoEm: new Date().toISOString()
}

describe('Fases 5 & 6 - Sistema de Acompanhamento, Detector de Mudanças & Homologação E2E', () => {
  beforeAll(async () => {
    const db = await initDatabase(tempE2eDbPath)
    for (const d of [sampleBbDossier, sampleTrtMgDossier, sampleTjSpDossier]) {
      db.insert(concursosTable)
        .values({
          id: d.id,
          termoOriginal: d.termoOriginal,
          orgao: d.orgao,
          siglaOrgao: d.orgao.slice(0, 20),
          tituloConcurso: d.tituloConcurso,
          area: d.area,
          uf: d.uf,
          status: d.status,
          statusLabel: d.statusLabel,
          resumoGeral: d.resumoGeral,
          dossierJson: JSON.stringify(d),
          atualizadoEm: d.atualizadoEm
        })
        .run()
    }
  })

  afterAll(() => {
    closeDatabase()
    if (fs.existsSync(tempE2eDbPath)) {
      fs.unlinkSync(tempE2eDbPath)
    }
  })

  it('deve persistir concurso acompanhado no SQLite e manter os dados intactos', async () => {
    const dossiers = await generateConcursoDossiers({ termoLivre: 'Banco do Brasil' }, { skipNetwork: true })
    expect(dossiers.length).toBeGreaterThanOrEqual(1)

    const toggleRes = toggleMonitorConcurso(dossiers[0])
    expect(toggleRes.monitored).toBe(true)
    expect(toggleRes.items).toHaveLength(1)
    expect(toggleRes.items[0].orgao).toContain('Banco do Brasil')

    const listed = listMonitoredConcursos()
    expect(listed).toHaveLength(1)

    const checkRes = await checkMonitoredUpdatesNow({ skipNetwork: true })
    expect(checkRes.items).toHaveLength(1)
  })

  it('deve detectar mudança de status ou novo link de referência entre snapshots', async () => {
    const [baseDossier] = await generateConcursoDossiers({ termoLivre: 'TRT MG' }, { skipNetwork: true })
    expect(baseDossier).toBeDefined()

    const updatedDossier = {
      ...baseDossier,
      status: 'EDITAL_PUBLICADO' as const,
      statusLabel: 'Edital Publicado'
    }

    const diff = detectDossierChanges(baseDossier, updatedDossier)
    expect(diff.hasChanged).toBe(true)
    expect(diff.summary).toContain('Edital Publicado')
  })

  it('deve homologar os 3 cenários reais: Banco do Brasil, TRT MG e Descoberta por Área (Tribunais SP)', async () => {
    // Cenário 1: Banco do Brasil
    const bbDossiers = await generateConcursoDossiers({ termoLivre: 'Banco do Brasil' }, { skipNetwork: true })
    expect(bbDossiers[0].orgao).toContain('Banco do Brasil')
    expect(bbDossiers[0].resumoGeral).not.toMatch(/\b2021\b/)
    expect(bbDossiers[0].materiasRecomendadas.some((m) => m.includes('Conhecimentos Bancários'))).toBe(true)

    // Cenário 2: TRT MG
    const trtDossiers = await generateConcursoDossiers({ termoLivre: 'TRT MG' }, { skipNetwork: true })
    expect(trtDossiers[0].orgao).toContain('TRT-MG')
    expect(trtDossiers[0].status).toBe('COMISSAO_FORMADA')
    expect(trtDossiers[0].materiasRecomendadas.some((m) => m.includes('Direito do Trabalho'))).toBe(true)

    // Cenário 3: Descoberta Ampla (Tribunais em SP)
    const spTribunais = await generateConcursoDossiers(
      { area: 'TRIBUNAIS', uf: 'SP' },
      { skipNetwork: true }
    )
    expect(spTribunais.length).toBeGreaterThanOrEqual(1)
    expect(spTribunais[0].orgao).toContain('TJ-SP')
  })
})
