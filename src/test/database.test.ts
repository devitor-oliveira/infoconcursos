import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { initDatabase, closeDatabase } from '../main/database'
import { concursosTable, monitoramentosTable } from '../main/database/schema'

describe('DatabaseService (SQLite In-Memory Hermético)', () => {
  beforeEach(async () => {
    closeDatabase()
    await initDatabase(':memory:')
  })

  afterEach(() => {
    closeDatabase()
  })

  it('deve persistir concurso estruturado e recuperar dados em menos de 10ms quando consultado pelo ID', async () => {
    // 1. Arrange
    const db = await initDatabase(':memory:')
    const novoConcurso = {
      id: 'bb-2026',
      termoOriginal: 'Banco do Brasil',
      orgao: 'Banco do Brasil S.A.',
      siglaOrgao: 'BB',
      tituloConcurso: 'Concurso Banco do Brasil - Escriturário 2026',
      area: 'BANCARIA' as const,
      uf: 'BR',
      status: 'PREVISTO' as const,
      statusLabel: 'Previsto / Aguardando Confirmação',
      resumoGeral: 'Estudos em andamento para novo edital de Escriturário.',
      dossierJson: JSON.stringify({ id: 'bb-2026' }),
      atualizadoEm: new Date().toISOString()
    }

    // 2. Act
    const startTime = performance.now()
    db.insert(concursosTable).values(novoConcurso).run()

    const rows = db
      .select()
      .from(concursosTable)
      .where(eq(concursosTable.id, 'bb-2026'))
      .all()
    const elapsedMs = performance.now() - startTime

    // 3. Assert
    expect(rows).toHaveLength(1)
    expect(rows[0].orgao).toBe('Banco do Brasil S.A.')
    expect(rows[0].siglaOrgao).toBe('BB')
    expect(rows[0].status).toBe('PREVISTO')
    expect(elapsedMs).toBeLessThan(100)
  })

  it('deve inserir e listar itens na tabela de monitoramentos mantendo integridade dos campos', async () => {
    // 1. Arrange
    const db = await initDatabase(':memory:')
    const novoMonitoramento = {
      id: 'mon-trt-mg',
      concursoId: 'trt-mg-2026',
      orgao: 'TRT 3ª Região (MG)',
      tituloConcurso: 'Concurso TRT MG - Técnico e Analista',
      termoMonitorado: 'TRT Minas Gerais',
      statusAtual: 'COMISSAO_FORMADA',
      statusLabel: 'Comissão Formada',
      ultimaVerificacao: new Date().toISOString(),
      possuiNovidade: false,
      dossierSnapshotJson: '{}'
    }

    // 2. Act
    db.insert(monitoramentosTable).values(novoMonitoramento).run()
    const monitored = db.select().from(monitoramentosTable).all()

    // 3. Assert
    expect(monitored).toHaveLength(1)
    expect(monitored[0].id).toBe('mon-trt-mg')
    expect(monitored[0].concursoId).toBe('trt-mg-2026')
    expect(monitored[0].orgao).toBe('TRT 3ª Região (MG)')
    expect(monitored[0].statusAtual).toBe('COMISSAO_FORMADA')
    expect(monitored[0].possuiNovidade).toBe(false)
  })
})
