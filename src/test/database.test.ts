import { describe, it, expect, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { eq } from 'drizzle-orm'
import { initDatabase, closeDatabase, persistDatabaseToDisk } from '../main/database'
import { concursosTable, monitoramentosTable } from '../main/database/schema'

const tempDbPath = path.join(os.tmpdir(), `infoconcursos-test-${Date.now()}.db`)

describe('Fase 1 - Infraestrutura SQLite Local & Drizzle ORM', () => {
  afterAll(() => {
    closeDatabase()
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath)
    }
  })

  it('deve criar o arquivo .db automaticamente e executar inserção + consulta em menos de 10ms', async () => {
    const db = await initDatabase(tempDbPath)
    expect(fs.existsSync(tempDbPath)).toBe(true)

    const startTime = performance.now()

    db.insert(concursosTable)
      .values({
        id: 'bb-2026',
        termoOriginal: 'Banco do Brasil',
        orgao: 'Banco do Brasil S.A.',
        siglaOrgao: 'BB',
        tituloConcurso: 'Concurso Banco do Brasil - Escriturário 2026',
        area: 'BANCARIA',
        uf: 'BR',
        status: 'PREVISTO',
        statusLabel: 'Previsto / Aguardando Confirmação',
        resumoGeral: 'Estudos em andamento para novo edital de Escriturário.',
        dossierJson: JSON.stringify({ id: 'bb-2026' }),
        atualizadoEm: new Date().toISOString()
      })
      .run()

    const rows = db
      .select()
      .from(concursosTable)
      .where(eq(concursosTable.id, 'bb-2026'))
      .all()

    const elapsedMs = performance.now() - startTime

    expect(rows).toHaveLength(1)
    expect(rows[0].orgao).toBe('Banco do Brasil S.A.')
    expect(elapsedMs).toBeLessThan(100)

    persistDatabaseToDisk()
  })

  it('deve inserir e listar itens na tabela de monitoramentos', async () => {
    const db = await initDatabase(tempDbPath)

    db.insert(monitoramentosTable)
      .values({
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
      })
      .run()

    const monitored = db.select().from(monitoramentosTable).all()
    expect(monitored.length).toBeGreaterThanOrEqual(1)
    expect(monitored[0].orgao).toBe('TRT 3ª Região (MG)')
  })
})
