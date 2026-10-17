import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { registerAllIpcHandlers } from '../main/ipc/handlers'
import { initDatabase, closeDatabase } from '../main/database'
import { ipcMain } from 'electron'

// Mock solitário hermético do módulo ipcMain do Electron
vi.mock('electron', () => {
  const handlers = new Map<string, (...args: any[]) => any>()
  return {
    ipcMain: {
      handle: vi.fn((channel: string, listener: (...args: any[]) => any) => {
        handlers.set(channel, listener)
      }),
      _handlers: handlers,
      _invoke: async (channel: string, ...args: any[]) => {
        const fn = handlers.get(channel)
        if (!fn) throw new Error(`Handler IPC não registrado para o canal: ${channel}`)
        return fn({}, ...args)
      }
    }
  }
})

describe('Electron IPC Handlers (Ponte Solitária de Comunicação Main-Renderer)', () => {
  const getIpc = () => ipcMain as unknown as {
    handle: ReturnType<typeof vi.fn>
    _handlers: Map<string, (...args: any[]) => any>
    _invoke: (channel: string, ...args: any[]) => Promise<any>
  }

  beforeEach(async () => {
    closeDatabase()
    await initDatabase(':memory:')
    getIpc()._handlers.clear()
    registerAllIpcHandlers()
  })

  afterEach(() => {
    closeDatabase()
  })

  it('deve registrar todos os canais canônicos de IPC ao inicializar', () => {
    const registeredChannels = Array.from(getIpc()._handlers.keys())
    expect(registeredChannels).toContain('discovery:search')
    expect(registeredChannels).toContain('news:getRecent')
    expect(registeredChannels).toContain('monitor:list')
    expect(registeredChannels).toContain('monitor:toggle')
    expect(registeredChannels).toContain('monitor:remove')
    expect(registeredChannels).toContain('monitor:checkNow')
    expect(registeredChannels).toContain('privacy:clearLocalData')
    expect(registeredChannels).toContain('privacy:getStatus')
    expect(registeredChannels).toContain('privacy:configureNetwork')
  })

  it('deve bloquear busca e retornar aviso LGPD sem consultar rede quando termo for CPF', async () => {
    // 1. Arrange & Act
    const res = await getIpc()._invoke('discovery:search', {
      termoLivre: '123.456.789-00',
      area: 'TODOS',
      uf: 'TODOS',
      statusFiltro: 'TODOS'
    })

    // 3. Assert
    expect(res.data).toEqual([])
    expect(res.validationWarning).toContain('LGPD')
    expect(res.fromCache).toBe(false)
  })

  it('deve expurgar dados locais ao invocar o canal privacy:clearLocalData', async () => {
    // 1. Arrange & Act
    const res = await getIpc()._invoke('privacy:clearLocalData')

    // 3. Assert
    expect(res).toMatchObject({
      clearedHistory: true,
      clearedCache: true
    })
    expect(res.clearedAt).toBeDefined()
  })

  it('deve retornar status técnico de segurança do banco e da rede via privacy:getStatus', async () => {
    // 1. Arrange & Act
    const status = await getIpc()._invoke('privacy:getStatus')

    // 3. Assert
    expect(status).toHaveProperty('database')
    expect(status).toHaveProperty('network')
    expect(status.database.algorithm).toBe('AES-256-GCM')
    expect(status.network.sendGlobalPrivacyControl).toBe(true)
    expect(status.network.encryptionAlgorithm).toBe('AES-256-GCM')
  })

  it('deve gerenciar monitoramento através do canal monitor:list e monitor:toggle', async () => {
    // 1. Arrange
    const mockDossier = {
      id: 'dossier-ipc-test',
      orgao: 'Tribunal de Justiça de Minas Gerais',
      tituloConcurso: 'Concurso TJMG 2026',
      termoOriginal: 'TJMG',
      area: 'TRIBUNAIS' as const,
      uf: 'MG',
      status: 'AUTORIZADO' as const,
      statusLabel: 'Autorizado',
      resumoGeral: 'Autorizado.',
      dossierJson: '{}',
      tipoRegistro: 'EDITAL_OFICIAL' as const,
      banca: { nome: 'FGV', situacao: 'DEFINIDA' as const },
      cronograma: { previsaoEdital: '2026' },
      cargosPrevistos: [],
      materiasRecomendadas: [],
      linksReferencia: [],
      atualizadoEm: new Date().toISOString()
    }

    // 2. Act: Adiciona ao monitoramento
    const toggleRes = await getIpc()._invoke('monitor:toggle', mockDossier)
    expect(toggleRes.monitored).toBe(true)

    // Lista acompanhamentos
    const listRes = await getIpc()._invoke('monitor:list')

    // 3. Assert
    expect(listRes).toHaveLength(1)
    expect(listRes[0].concursoId).toBe('dossier-ipc-test')
  })
})
