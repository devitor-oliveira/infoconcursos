import { create } from 'zustand'
import { ConcursoDossier, ConcursoArea } from '../../../shared/types/concurso'
import { SearchFilter } from '../../../shared/types/search'
import { NewsItem, MonitoringItem } from '../../../shared/types/news'

interface AppState {
  activeTab: 'DESCOBERTA' | 'NOTICIAS' | 'ACOMPANHAMENTOS' | 'DOSSIE' | 'CONFIGURACOES'
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

  // Metadados de Cache
  searchAtualizadoEm: string | null
  searchFromCache: boolean
  newsAtualizadoEm: string | null
  newsFromCache: boolean

  setActiveTab: (tab: 'DESCOBERTA' | 'NOTICIAS' | 'ACOMPANHAMENTOS' | 'DOSSIE' | 'CONFIGURACOES') => void
  setFilter: (partial: Partial<SearchFilter>) => void
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
}

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
      filter: { ...state.filter, ...partial }
    })),

  selectDossierIndex: (idx) => set({ selectedDossierIndex: idx }),

  openDossierPage: (dossier) => {
    const currentTab = get().activeTab
    const prev = (currentTab === 'DOSSIE' || currentTab === 'CONFIGURACOES')
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
    const activeFilter = customFilter || get().filter
    if (customFilter) {
      set({ filter: activeFilter })
    }
    set({ isLoadingSearch: true, activeTab: 'DESCOBERTA' })
    try {
      const res = await window.api.searchConcursos(activeFilter, options)
      set({
        dossiers: res.data,
        searchAtualizadoEm: res.atualizadoEm,
        searchFromCache: res.fromCache,
        selectedDossierIndex: 0,
        isLoadingSearch: false
      })
    } catch (error) {
      console.error('Erro na busca de concursos:', error)
      set({ isLoadingSearch: false })
    }
  },

  loadRecentNews: async (area, uf, options) => {
    set({ isLoadingNews: true })
    try {
      const res = await window.api.getRecentNews(area, uf, options)
      set({
        news: res.data,
        newsAtualizadoEm: res.atualizadoEm,
        newsFromCache: res.fromCache,
        isLoadingNews: false
      })
    } catch (error) {
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
  }
}))
