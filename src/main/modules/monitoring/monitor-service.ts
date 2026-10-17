import { eq } from 'drizzle-orm'
import { Notification } from 'electron'
import { getDb, persistDatabaseToDisk } from '../../database'
import { monitoramentosTable } from '../../database/schema'
import { ConcursoDossier } from '../../../shared/types/concurso'
import { MonitoringItem } from '../../../shared/types/news'
import { generateConcursoDossiers } from '../dossier/dossier-generator'
import { detectDossierChanges } from './change-detector'
import { anonymizeDossierForStorage, anonymizeText } from '../../../shared/utils/anonymizer'

export function listMonitoredConcursos(): MonitoringItem[] {
  const db = getDb()
  const rows = db.select().from(monitoramentosTable).all()
  return rows.map((r) => ({
    id: r.id,
    concursoId: r.concursoId,
    orgao: r.orgao,
    tituloConcurso: r.tituloConcurso,
    termoMonitorado: r.termoMonitorado,
    statusAtual: r.statusAtual as MonitoringItem['statusAtual'],
    statusLabel: r.statusLabel,
    ultimaVerificacao: r.ultimaVerificacao,
    possuiNovidade: Boolean(r.possuiNovidade),
    descricaoNovidade: r.descricaoNovidade || undefined,
    dossierSnapshotJson: r.dossierSnapshotJson
  }))
}

export function toggleMonitorConcurso(rawDossier: ConcursoDossier): {
  monitored: boolean
  items: MonitoringItem[]
} {
  const dossier = anonymizeDossierForStorage(rawDossier)
  const db = getDb()
  const existing = db
    .select()
    .from(monitoramentosTable)
    .where(eq(monitoramentosTable.concursoId, dossier.id))
    .all()

  if (existing.length > 0) {
    db.delete(monitoramentosTable).where(eq(monitoramentosTable.concursoId, dossier.id)).run()
    persistDatabaseToDisk()
    return { monitored: false, items: listMonitoredConcursos() }
  }

  db.insert(monitoramentosTable)
    .values({
      id: `mon-${dossier.id}`,
      concursoId: dossier.id,
      orgao: dossier.orgao,
      tituloConcurso: dossier.tituloConcurso,
      termoMonitorado: dossier.termoOriginal,
      statusAtual: dossier.status,
      statusLabel: dossier.statusLabel,
      ultimaVerificacao: new Date().toISOString(),
      possuiNovidade: false,
      descricaoNovidade: 'Monitoramento ativo iniciado — acompanhando movimentações recentes.',
      dossierSnapshotJson: JSON.stringify(dossier)
    })
    .run()

  persistDatabaseToDisk()
  return { monitored: true, items: listMonitoredConcursos() }
}

export function removeMonitoredById(id: string): MonitoringItem[] {
  const db = getDb()
  db.delete(monitoramentosTable).where(eq(monitoramentosTable.id, id)).run()
  persistDatabaseToDisk()
  return listMonitoredConcursos()
}

export async function checkMonitoredUpdatesNow(options: { skipNetwork?: boolean } = {}): Promise<{
  updatedCount: number
  items: MonitoringItem[]
}> {
  const db = getDb()
  const currentList = listMonitoredConcursos()
  let updatedCount = 0

  for (const item of currentList) {
    const dossiers = await generateConcursoDossiers(
      { termoLivre: item.termoMonitorado },
      { skipNetwork: options.skipNetwork }
    )
    if (dossiers.length === 0) continue

    const freshDossier = anonymizeDossierForStorage(dossiers[0])
    let prevSnapshot: ConcursoDossier | null = null
    try {
      prevSnapshot = JSON.parse(item.dossierSnapshotJson) as ConcursoDossier
    } catch {
      prevSnapshot = null
    }

    const change = prevSnapshot
      ? detectDossierChanges(prevSnapshot, freshDossier)
      : { hasChanged: false }

    if (change.hasChanged) {
      updatedCount++
      try {
        if (Notification.isSupported()) {
          new Notification({
            title: `Novidade: ${item.orgao}`,
            body: change.summary || 'Nova atualização detectada no concurso monitorado.'
          }).show()
        }
      } catch {
        // Ignorar em ambiente de teste sem servidor gráfico
      }
    }

    const rawDesc =
      change.summary ||
      item.descricaoNovidade ||
      `Verificado em ${new Date().toLocaleTimeString('pt-BR')} — Informações atualizadas.`

    db.update(monitoramentosTable)
      .set({
        statusAtual: freshDossier.status,
        statusLabel: freshDossier.statusLabel,
        ultimaVerificacao: new Date().toISOString(),
        possuiNovidade: change.hasChanged || item.possuiNovidade,
        descricaoNovidade: anonymizeText(rawDesc, 'DATABASE_PERSISTENCE'),
        dossierSnapshotJson: JSON.stringify(freshDossier)
      })
      .where(eq(monitoramentosTable.id, item.id))
      .run()
  }

  persistDatabaseToDisk()
  return { updatedCount, items: listMonitoredConcursos() }
}
