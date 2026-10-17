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
import {
  getDb,
  persistDatabaseToDisk,
  purgeLocalCacheAndHistory,
  getActiveDatabaseSecurityInfo
} from '../database'
import { historicoBuscasTable } from '../database/schema'
import { getCachedSearchResults } from '../modules/search/search-cache-service'
import {
  validateAndSanitizeSearchFilter,
  anonymizeText
} from '../../shared/utils/anonymizer'
import {
  configureNetworkPrivacy,
  getNetworkPrivacyStatus,
  NetworkPrivacyConfig
} from '../modules/privacy/network-privacy'

export function registerAllIpcHandlers(): void {
  ipcMain.handle(
    'discovery:search',
    async (_event, rawFilter: SearchFilter, options?: SearchExecutionOptions) => {
      const validation = validateAndSanitizeSearchFilter(rawFilter)
      const filter = validation.sanitizedFilter
      const forceRefresh = Boolean(options?.forceRefresh)

      // Se o input continha apenas dados pessoais bloqueados pela LGPD, retorna aviso imediato sem gravar no banco
      if (validation.blockedPersonalData && !filter.termoLivre) {
        return {
          data: [],
          atualizadoEm: new Date().toISOString(),
          fromCache: false,
          validationWarning: validation.validationMessage
        }
      }

      // Se não for forceRefresh, verifica se já estava em cache
      const wasCached = !forceRefresh && Boolean(getCachedSearchResults(filter)?.data.length)
      const dossiers = await generateConcursoDossiers(filter, { forceRefresh })

      // Registra no histórico local apenas termos públicos higienizados e se não houve bloqueio de PII
      if (!validation.blockedPersonalData) {
        try {
          const db = getDb()
          db.insert(historicoBuscasTable)
            .values({
              id: `hist-${Date.now()}`,
              termo: anonymizeText(filter.termoLivre, 'DATABASE_PERSISTENCE') || 'Exploração por Filtro',
              area: filter.area || 'TODOS',
              uf: filter.uf || 'TODOS',
              executadoEm: new Date().toISOString()
            })
            .run()
          persistDatabaseToDisk()
        } catch (err) {
          console.warn(
            '[IPC] Erro ao registrar histórico de busca:',
            anonymizeText(String(err), 'LOG_OUTPUT')
          )
        }
      }

      return {
        data: dossiers,
        atualizadoEm: new Date().toISOString(),
        fromCache: wasCached,
        validationWarning: validation.validationMessage
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

  // Handlers de Privacidade, Eliminação Efetiva (Art. 18, VI LGPD) e Proxy / Criptografia (Art. 46 LGPD)
  ipcMain.handle('privacy:clearLocalData', async () => {
    return purgeLocalCacheAndHistory()
  })

  ipcMain.handle('privacy:getStatus', async () => {
    return {
      database: getActiveDatabaseSecurityInfo(),
      network: getNetworkPrivacyStatus()
    }
  })

  ipcMain.handle(
    'privacy:configureNetwork',
    async (_event, partialConfig: Partial<NetworkPrivacyConfig>) => {
      return configureNetworkPrivacy(partialConfig)
    }
  )
}
