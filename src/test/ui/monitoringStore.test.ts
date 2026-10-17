// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '../../renderer/src/stores/monitoringStore'
import { ConcursoDossier } from '../../shared/types/concurso'

describe('useAppStore (Gerenciamento de Estado Zustand & Integração com IPC)', () => {
  const mockDossier: ConcursoDossier = {
    id: 'dossier-trt-mg',
    urlCanonica: 'https://trt3.jus.br',
    termoOriginal: 'TRT MG',
    orgao: 'Tribunal Regional do Trabalho 3ª Região',
    tituloConcurso: 'Concurso TRT-MG 2026',
    area: 'TRIBUNAIS',
    uf: 'MG',
    status: 'COMISSAO_FORMADA',
    statusLabel: 'Comissão Formada',
    resumoGeral: 'Comissão constituída.',
    tipoRegistro: 'EDITAL_OFICIAL',
    banca: { nome: 'A definir', situacao: 'A_DEFINIR', observacao: '' },
    cronograma: { previsaoEdital: 'Segundo semestre 2026', ultimaMovimentacao: '' },
    cargosPrevistos: [],
    materiasRecomendadas: ['Direito do Trabalho'],
    linksReferencia: [],
    atualizadoEm: new Date().toISOString()
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    window.api = {
      searchConcursos: vi.fn(),
      getRecentNews: vi.fn(),
      getMonitoredConcursos: vi.fn(),
      toggleMonitorConcurso: vi.fn(),
      removeMonitoredConcurso: vi.fn(),
      checkUpdatesNow: vi.fn(),
      clearLocalData: vi.fn(),
      getSecurityInfo: vi.fn(),
      setNetworkPrivacy: vi.fn(),
      getNetworkPrivacy: vi.fn()
    } as any

    useAppStore.setState({
      activeTab: 'NOTICIAS',
      previousTab: 'NOTICIAS',
      filter: {
        termoLivre: '',
        area: 'TODOS',
        uf: 'TODOS',
        statusFiltro: 'TODOS'
      },
      dossiers: [],
      selectedDossierIndex: 0,
      activeDossier: null,
      news: [],
      monitoredItems: [],
      isLoadingSearch: false,
      isLoadingNews: false,
      isCheckingUpdates: false,
      searchValidationWarning: null,
      searchFromCache: false,
      lastUpdateMessage: null
    })
  })

  it('deve alternar abas preservando a aba anterior para navegação reversa', () => {
    // 1. Arrange & Act
    useAppStore.getState().setActiveTab('DESCOBERTA')

    // 3. Assert
    expect(useAppStore.getState().activeTab).toBe('DESCOBERTA')
    expect(useAppStore.getState().previousTab).toBe('NOTICIAS')

    useAppStore.getState().openDossierPage(mockDossier)
    expect(useAppStore.getState().activeTab).toBe('DOSSIE')
    expect(useAppStore.getState().activeDossier).toEqual(mockDossier)

    useAppStore.getState().goBackFromDossier()
    expect(useAppStore.getState().activeTab).toBe('DESCOBERTA')
  })

  it('deve atualizar o filtro e limpar avisos de validação anteriores', () => {
    // 1. Arrange
    useAppStore.setState({ searchValidationWarning: 'Aviso anterior' })

    // 2. Act
    useAppStore.getState().setFilter({ termoLivre: 'Receita Federal', area: 'FISCAL_CONTROLE' })

    // 3. Assert
    const state = useAppStore.getState()
    expect(state.filter.termoLivre).toBe('Receita Federal')
    expect(state.filter.area).toBe('FISCAL_CONTROLE')
    expect(state.searchValidationWarning).toBeNull()
  })

  it('deve executar busca de concursos e atualizar os dossiês no estado', async () => {
    // 1. Arrange
    const mockApiResponse = {
      data: [mockDossier],
      atualizadoEm: '2026-10-17T10:00:00Z',
      fromCache: true,
      totalResultados: 1
    }
    vi.mocked(window.api.searchConcursos).mockResolvedValueOnce(mockApiResponse as any)

    // 2. Act
    await useAppStore.getState().executeSearch({
      termoLivre: 'TRT MG',
      area: 'TRIBUNAIS',
      uf: 'MG',
      statusFiltro: 'TODOS'
    })

    // 3. Assert
    const state = useAppStore.getState()
    expect(window.api.searchConcursos).toHaveBeenCalledTimes(1)
    expect(state.dossiers).toHaveLength(1)
    expect(state.dossiers[0].id).toBe('dossier-trt-mg')
    expect(state.searchFromCache).toBe(true)
    expect(state.activeTab).toBe('DESCOBERTA')
    expect(state.isLoadingSearch).toBe(false)
  })

  it('deve alternar status de monitoramento e atualizar mensagem de confirmação', async () => {
    // 1. Arrange
    const mockMonitorResponse = {
      monitored: true,
      items: [
        {
          id: 'mon-dossier-trt-mg',
          concursoId: 'dossier-trt-mg',
          orgao: 'Tribunal Regional do Trabalho 3ª Região',
          tituloConcurso: 'Concurso TRT-MG 2026',
          termoMonitorado: 'TRT MG',
          statusAtual: 'COMISSAO_FORMADA',
          statusLabel: 'Comissão Formada',
          ultimaVerificacao: new Date().toISOString(),
          possuiNovidade: false,
          dossierSnapshotJson: JSON.stringify(mockDossier)
        }
      ]
    }
    vi.mocked(window.api.toggleMonitorConcurso).mockResolvedValueOnce(mockMonitorResponse as any)

    // 2. Act
    await useAppStore.getState().toggleMonitor(mockDossier)

    // 3. Assert
    const state = useAppStore.getState()
    expect(window.api.toggleMonitorConcurso).toHaveBeenCalledWith(mockDossier)
    expect(state.monitoredItems).toHaveLength(1)
    expect(state.lastUpdateMessage).toContain('foi adicionado ao seu radar')
  })

  it('deve expurgar dados locais e resetar dossiês ao acionar clearLocalCacheAndHistory', async () => {
    // 1. Arrange
    useAppStore.setState({ dossiers: [mockDossier], searchFromCache: true })
    vi.mocked(window.api.clearLocalData).mockResolvedValueOnce({
      clearedHistory: true,
      clearedCache: true,
      clearedAt: '2026-10-17T11:00:00Z'
    })

    // 2. Act
    const res = await useAppStore.getState().clearLocalCacheAndHistory()

    // 3. Assert
    expect(res).toEqual({ clearedAt: '2026-10-17T11:00:00Z' })
    const state = useAppStore.getState()
    expect(state.dossiers).toHaveLength(0)
    expect(state.searchFromCache).toBe(false)
    expect(state.lastUpdateMessage).toContain('expurgados com sucesso')
  })
})
