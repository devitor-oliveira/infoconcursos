import { contextBridge, ipcRenderer } from 'electron'
import { SearchFilter, SearchExecutionOptions } from '../shared/types/search'
import { ConcursoDossier } from '../shared/types/concurso'
import { NewsItem, MonitoringItem } from '../shared/types/news'

export interface SearchResultResponse {
  data: ConcursoDossier[]
  atualizadoEm: string
  fromCache: boolean
}

export interface NewsResultResponse {
  data: NewsItem[]
  atualizadoEm: string
  fromCache: boolean
}

export interface InfoConcursosApi {
  openExternalUrl: (url: string) => Promise<boolean>
  searchConcursos: (
    filter: SearchFilter,
    options?: SearchExecutionOptions
  ) => Promise<SearchResultResponse>
  getRecentNews: (
    area?: string,
    uf?: string,
    options?: { forceRefresh?: boolean }
  ) => Promise<NewsResultResponse>
  getMonitoredConcursos: () => Promise<MonitoringItem[]>
  toggleMonitorConcurso: (dossier: ConcursoDossier) => Promise<{ monitored: boolean; items: MonitoringItem[] }>
  removeMonitoredConcurso: (id: string) => Promise<MonitoringItem[]>
  checkUpdatesNow: () => Promise<{ updatedCount: number; items: MonitoringItem[] }>
}

const api: InfoConcursosApi = {
  openExternalUrl: (url: string) => ipcRenderer.invoke('system:openExternalUrl', url),
  searchConcursos: (filter: SearchFilter, options?: SearchExecutionOptions) =>
    ipcRenderer.invoke('discovery:search', filter, options),
  getRecentNews: (area?: string, uf?: string, options?: { forceRefresh?: boolean }) =>
    ipcRenderer.invoke('news:getRecent', area, uf, options),
  getMonitoredConcursos: () => ipcRenderer.invoke('monitor:list'),
  toggleMonitorConcurso: (dossier: ConcursoDossier) => ipcRenderer.invoke('monitor:toggle', dossier),
  removeMonitoredConcurso: (id: string) => ipcRenderer.invoke('monitor:remove', id),
  checkUpdatesNow: () => ipcRenderer.invoke('monitor:checkNow')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Erro ao expor API no contextBridge:', error)
  }
} else {
  ;(globalThis as unknown as { api: InfoConcursosApi }).api = api
}
