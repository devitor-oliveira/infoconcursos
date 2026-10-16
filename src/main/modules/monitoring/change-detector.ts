import { ConcursoDossier } from '../../../shared/types/concurso'

export interface ChangeDetectionResult {
  hasChanged: boolean
  summary?: string
}

/**
 * Compara o snapshot anterior salvo no SQLite com o dossiê atualizado
 * para detectar mudanças de status ou novos links oficiais/notícias.
 */
export function detectDossierChanges(
  previousSnapshot: ConcursoDossier,
  latestDossier: ConcursoDossier
): ChangeDetectionResult {
  if (previousSnapshot.status !== latestDossier.status) {
    return {
      hasChanged: true,
      summary: `Mudança de situação detectada: de "${previousSnapshot.statusLabel}" para "${latestDossier.statusLabel}".`
    }
  }

  const prevUrls = new Set(previousSnapshot.linksReferencia.map((l) => l.url))
  const newLinks = latestDossier.linksReferencia.filter((l) => !prevUrls.has(l.url))

  if (newLinks.length > 0) {
    return {
      hasChanged: true,
      summary: `${newLinks.length} nova(s) fonte(s)/notícia(s) encontrada(s): "${newLinks[0].titulo}".`
    }
  }

  if (previousSnapshot.banca.nome !== latestDossier.banca.nome) {
    return {
      hasChanged: true,
      summary: `Atualização na banca organizadora: ${latestDossier.banca.nome}.`
    }
  }

  return { hasChanged: false }
}
