import { ipcMain } from 'electron'
import { SearchFilter, SearchExecutionOptions } from '../../shared/types/search'
import { ConcursoDossier } from '../../shared/types/concurso'
import { generateConcursoDossiers } from '../modules/dossier/dossier-generator'
import { getAggregatedRecentNews } from '../modules/news/news-orchestrator'
import {
  listMonitoredConcursos,
  toggleMonitorConcurso,
  removeMonitoredById,
  checkMonitoredUpdatesNow
} from '../modules/monitoring/monitor-service'
import { getDb, persistDatabaseToDisk } from '../database'
import { historicoBuscasTable } from '../database/schema'
import { getCachedSearchResults } from '../modules/search/search-cache-service'

export function registerAllIpcHandlers(): void {
  ipcMain.handle(
    'discovery:search',
    async (_event, filter: SearchFilter, options?: SearchExecutionOptions) => {
      const forceRefresh = Boolean(options?.forceRefresh)

      // Se não for forceRefresh, verifica se já estava em cache
      const wasCached = !forceRefresh && Boolean(getCachedSearchResults(filter)?.data.length)
      const dossiers = await generateConcursoDossiers(filter, { forceRefresh })

      try {
        const db = getDb()
        db.insert(historicoBuscasTable)
          .values({
            id: `hist-${Date.now()}`,
            termo: filter.termoLivre || 'Exploração por Filtro',
            area: filter.area || 'TODOS',
            uf: filter.uf || 'TODOS',
            executadoEm: new Date().toISOString()
          })
          .run()
        persistDatabaseToDisk()
      } catch (err) {
        console.warn('[IPC] Erro ao registrar histórico de busca:', err)
      }

      return {
        data: dossiers,
        atualizadoEm: new Date().toISOString(),
        fromCache: wasCached
      }
    }
  )

  ipcMain.handle(
    'news:getRecent',
    async (_event, area?: string, uf?: string, options?: { forceRefresh?: boolean }) => {
      const forceRefresh = Boolean(options?.forceRefresh)
      const items = await getAggregatedRecentNews(area, uf, { forceRefresh })
      return {
        data: items,
        atualizadoEm: new Date().toISOString(),
        fromCache: !forceRefresh
      }
    }
  )

  ipcMain.handle('monitor:list', async () => {
    return listMonitoredConcursos()
  })

  ipcMain.handle('monitor:toggle', async (_event, dossier: ConcursoDossier) => {
    return toggleMonitorConcurso(dossier)
  })

  ipcMain.handle('monitor:remove', async (_event, id: string) => {
    return removeMonitoredById(id)
  })

  ipcMain.handle('monitor:checkNow', async () => {
    return await checkMonitoredUpdatesNow()
  })
}
