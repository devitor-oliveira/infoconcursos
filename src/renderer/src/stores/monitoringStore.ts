import { create } from 'zustand'
import { ConcursoDossier, ConcursoArea } from '../../../shared/types/concurso'
import { SearchFilter } from '../../../shared/types/search'
import { NewsItem, MonitoringItem } from '../../../shared/types/news'
import { validateAndSanitizeSearchFilter } from '../../../shared/utils/anonymizer'

export type AppTab =
  | 'DESCOBERTA'
  | 'NOTICIAS'
  | 'ACOMPANHAMENTOS'
  | 'DOSSIE'
  | 'CONFIGURACOES'
  | 'PRIVACIDADE'

interface AppState {
  activeTab: AppTab
  filter: SearchFilter
  dossiers: ConcursoDossier[]
  selectedDossierIndex: number
  activeDossier: ConcursoDossier | null
  previousTab: 'DESCOBERTA' | 'NOTICIAS' | 'ACOMPANHAMENTOS'
  news: NewsItem[]
  monitoredItems: MonitoringItem[]
  isLoadingSearch: boolean
  isLoadingNews: boolean
  isCheckingUpdates: boolean
  lastUpdateMessage: string | null
  searchValidationWarning: string | null

  // Metadados de Cache
  searchAtualizadoEm: string | null
  searchFromCache: boolean
  newsAtualizadoEm: string | null
  newsFromCache: boolean

  setActiveTab: (tab: AppTab) => void
  setFilter: (partial: Partial<SearchFilter>) => void
  setSearchValidationWarning: (msg: string | null) => void
  selectDossierIndex: (idx: number) => void
  openDossierPage: (dossier: ConcursoDossier) => void
  goBackFromDossier: () => void
  executeSearch: (customFilter?: SearchFilter, options?: { forceRefresh?: boolean }) => Promise<void>
  loadRecentNews: (area?: ConcursoArea, uf?: string, options?: { forceRefresh?: boolean }) => Promise<void>
  loadMonitoredItems: () => Promise<void>
  toggleMonitor: (dossier: ConcursoDossier) => Promise<void>
  removeMonitored: (id: string) => Promise<void>
  triggerCheckUpdatesNow: () => Promise<void>
  openDossierFromMonitor: (item: MonitoringItem) => void
  clearLocalCacheAndHistory: () => Promise<{ clearedAt: string } | null>
}

// Contadores monotônicos de geração e impressão digital em voo para evitar Stale Responses (Dan Abramov / TkDodo pattern)
let latestSearchRequestId = 0
let inFlightSearchSignature: string | null = null
let latestNewsRequestId = 0

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'NOTICIAS',
  filter: {
    termoLivre: '',
    area: 'TODOS',
    uf: 'TODOS',
    statusFiltro: 'TODOS'
  },
  dossiers: [],
  selectedDossierIndex: 0,
  activeDossier: null,
  previousTab: 'NOTICIAS',
  news: [],
  monitoredItems: [],
  isLoadingSearch: false,
  isLoadingNews: false,
  isCheckingUpdates: false,
  lastUpdateMessage: null,
  searchValidationWarning: null,

  searchAtualizadoEm: null,
  searchFromCache: false,
  newsAtualizadoEm: null,
  newsFromCache: false,

  setActiveTab: (tab) => {
    const currentTab = get().activeTab
    if (currentTab === 'NOTICIAS' || currentTab === 'DESCOBERTA' || currentTab === 'ACOMPANHAMENTOS') {
      set({ previousTab: currentTab, activeTab: tab })
    } else {
      set({ activeTab: tab })
    }
  },

  setFilter: (partial) =>
    set((state) => ({
      filter: { ...state.filter, ...partial },
      // Limpa erro de validação imediatamente ao editar (Validation Event Timing Matrix)
      searchValidationWarning: null
    })),

  setSearchValidationWarning: (msg) => set({ searchValidationWarning: msg }),

  selectDossierIndex: (idx) => set({ selectedDossierIndex: idx }),

  openDossierPage: (dossier) => {
    const currentTab = get().activeTab
    const prev =
      currentTab === 'DOSSIE' || currentTab === 'CONFIGURACOES' || currentTab === 'PRIVACIDADE'
        ? get().previousTab
        : currentTab
    set({
      activeDossier: dossier,
      previousTab: prev,
      activeTab: 'DOSSIE'
    })
  },

  goBackFromDossier: () => {
    set({ activeTab: get().previousTab || 'DESCOBERTA' })
  },

  executeSearch: async (customFilter, options) => {
    const rawFilter = customFilter || get().filter
    const validation = validateAndSanitizeSearchFilter(rawFilter)
    const activeFilter = validation.sanitizedFilter
    const querySignature = JSON.stringify({ activeFilter, forceRefresh: Boolean(options?.forceRefresh) })

    // 1. Deduplicação em voo (In-Flight Request Deduplication): bloqueia duplo-clique idêntico concorrente
    if (get().isLoadingSearch && inFlightSearchSignature === querySignature) {
      return
    }

    // 2. Controle monotônico de geração (Stale Response Eviction): se o usuário mudou o filtro, invalida respostas antigas
    const requestId = ++latestSearchRequestId
    inFlightSearchSignature = querySignature

    set({
      filter: activeFilter,
      searchValidationWarning: validation.validationMessage,
      activeTab: 'DESCOBERTA'
    })

    // Se o usuário tentou pesquisar apenas um dado pessoal (ex: CPF ou e-mail), bloqueia antes da chamada
    if (validation.blockedPersonalData && !activeFilter.termoLivre) {
      inFlightSearchSignature = null
      set({
        dossiers: [],
        isLoadingSearch: false
      })
      return
    }

    set({ isLoadingSearch: true })
    try {
      const res = await window.api.searchConcursos(activeFilter, options)
      // Descarta silenciosamente resposta obsoleta se uma busca mais recente já foi disparada
      if (requestId !== latestSearchRequestId) {
        return
      }
      inFlightSearchSignature = null
      set({
        dossiers: res.data,
        searchAtualizadoEm: res.atualizadoEm,
        searchFromCache: res.fromCache,
        searchValidationWarning: res.validationWarning || validation.validationMessage,
        selectedDossierIndex: 0,
        isLoadingSearch: false
      })
    } catch (error) {
      if (requestId !== latestSearchRequestId) {
        return
      }
      inFlightSearchSignature = null
      console.error('Erro na busca de concursos:', error)
      set({ isLoadingSearch: false })
    }
  },

  loadRecentNews: async (area, uf, options) => {
    const requestId = ++latestNewsRequestId
    set({ isLoadingNews: true })
    try {
      const res = await window.api.getRecentNews(area, uf, options)
      if (requestId !== latestNewsRequestId) {
        return
      }
      set({
        news: res.data,
        newsAtualizadoEm: res.atualizadoEm,
        newsFromCache: res.fromCache,
        isLoadingNews: false
      })
    } catch (error) {
      if (requestId !== latestNewsRequestId) {
        return
      }
      console.error('Erro ao carregar notícias recentes:', error)
      set({ isLoadingNews: false })
    }
  },

  loadMonitoredItems: async () => {
    try {
      const items = await window.api.getMonitoredConcursos()
      set({ monitoredItems: items })
    } catch (error) {
      console.error('Erro ao carregar acompanhamentos:', error)
    }
  },

  toggleMonitor: async (dossier) => {
    try {
      const res = await window.api.toggleMonitorConcurso(dossier)
      set({
        monitoredItems: res.items,
        lastUpdateMessage: res.monitored
          ? `O concurso "${dossier.orgao}" foi adicionado ao seu radar.`
          : `O concurso "${dossier.orgao}" foi removido do seu radar.`
      })
    } catch (error) {
      console.error('Erro ao alternar monitoramento:', error)
    }
  },

  removeMonitored: async (id) => {
    try {
      const updated = await window.api.removeMonitoredConcurso(id)
      set({
        monitoredItems: updated,
        lastUpdateMessage: 'Concurso removido dos acompanhamentos.'
      })
    } catch (error) {
      console.error('Erro ao remover monitoramento:', error)
    }
  },

  triggerCheckUpdatesNow: async () => {
    if (get().isCheckingUpdates) {
      return
    }
    set({ isCheckingUpdates: true })
    try {
      const res = await window.api.checkUpdatesNow()
      set({
        monitoredItems: res.items,
        isCheckingUpdates: false,
        lastUpdateMessage:
          res.updatedCount > 0
            ? `Identificamos ${res.updatedCount} novidade(s) nos seus certames monitorados.`
            : 'Todos os seus concursos monitorados continuam sem novas alterações detectadas.'
      })
    } catch (error) {
      console.error('Erro ao verificar atualizações de monitoramento:', error)
      set({ isCheckingUpdates: false })
    }
  },

  openDossierFromMonitor: (item) => {
    try {
      const snapshot = JSON.parse(item.dossierSnapshotJson) as ConcursoDossier
      set({
        activeDossier: snapshot,
        previousTab: 'ACOMPANHAMENTOS',
        activeTab: 'DOSSIE'
      })
    } catch (err) {
      console.error('Erro ao abrir dossiê pelo monitor:', err)
    }
  },

  clearLocalCacheAndHistory: async () => {
    try {
      const res = await window.api.clearLocalData()
      set({
        dossiers: [],
        searchAtualizadoEm: null,
        searchFromCache: false,
        newsFromCache: false,
        lastUpdateMessage:
          'Histórico de buscas e cache SQLite expurgados com sucesso (VACUUM + recriptografia AES-256-GCM).'
      })
      return { clearedAt: res.clearedAt }
    } catch (err) {
      console.error('Erro ao limpar dados locais:', err)
      return null
    }
  }
}))
