import React from 'react'
import {
  BookOpen,
  BellPlus,
  BellRing,
  ArrowRight
} from 'lucide-react'
import { ConcursoDossier } from '../../../../shared/types/concurso'
import { STATUS_DISPLAY_MAP } from '../../../../shared/types/search'
import { Button, Badge, BadgeTone } from '../ds'

export interface DossierSummaryCardProps {
  dossier: ConcursoDossier
  isMonitored: boolean
  onToggleMonitor: (dossier: ConcursoDossier) => void
  onOpenDossier: (dossier: ConcursoDossier) => void
}

export function DossierSummaryCard({
  dossier,
  isMonitored,
  onToggleMonitor,
  onOpenDossier
}: DossierSummaryCardProps): React.JSX.Element {
  const statusInfo = STATUS_DISPLAY_MAP[dossier.status] || STATUS_DISPLAY_MAP.PREVISTO

  const badgeToneMap: Record<typeof statusInfo.semanticTone, BadgeTone> = {
    success: 'success',
    warning: 'gold',
    accent: 'accent',
    neutral: 'neutral'
  }

  return (
    <article className="p-4 sm:p-5 hover:bg-[#1E1D1E]/70 transition-colors group">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
        {/* Coluna 1 (3 cols): Selos de Classificação, Status e Jurisdição */}
        <div className="lg:col-span-3 flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {dossier.tipoRegistro === 'EDITAL_OFICIAL' ? (
              <span className="px-2 py-0.5 rounded bg-[#243028] text-[#748B7B] border border-[#607466]/40 font-label-sm text-[11px] font-semibold uppercase tracking-wider">
                Ato Oficial
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-[#1F1D1C] text-[#E5D5B3] border border-[#E5D5B3]/25 font-label-sm text-[11px] font-semibold uppercase tracking-wider">
                Apuração
              </span>
            )}
            <Badge tone={badgeToneMap[statusInfo.semanticTone]} pulseDot>
              {dossier.statusLabel}
            </Badge>
            <span className="font-label-sm text-label-sm text-[#BDBAB5]">
              {dossier.uf === 'BR' ? 'Nacional' : dossier.uf}
            </span>
          </div>

          <div className="text-label-sm font-label-sm text-[#E5D5B3] truncate">
            {dossier.orgao}
          </div>
          <div className="text-[11px] font-body-sm text-[#BDBAB5] truncate">
            Banca: {dossier.banca?.nome || 'A definir'}
          </div>
        </div>

        {/* Coluna 2 (6 cols): Título em Newsreader, Resumo & Micro-chips de Métricas */}
        <div className="lg:col-span-6 space-y-1.5">
          <h3
            onClick={() => onOpenDossier(dossier)}
            className="font-display text-lg sm:text-xl text-[#FFFCF2] group-hover:text-[#E5D5B3] transition-colors leading-snug cursor-pointer"
          >
            {dossier.tituloConcurso}
          </h3>

          <p className="font-body-sm text-body-sm text-[#BDBAB5] leading-relaxed line-clamp-2">
            {dossier.resumoGeral}
          </p>

          {/* Micro-chips essenciais inline */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="px-2 py-0.5 rounded bg-[#171617] border border-[#E5D5B3]/10 font-label-sm text-[11px] text-[#FFFCF2]">
              Vagas: {dossier.numeroVagas || 'A definir'}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#171617] border border-[#E5D5B3]/10 font-label-sm text-[11px] text-[#E5D5B3]">
              Salário: {dossier.salarioMaximo || 'Não especificado'}
            </span>
            {dossier.escolaridade && (
              <span className="px-2 py-0.5 rounded bg-[#171617] border border-[#E5D5B3]/10 font-label-sm text-[11px] text-[#BDBAB5]">
                {dossier.escolaridade.replace(/_/g, ' / ')}
              </span>
            )}
          </div>
        </div>

        {/* Coluna 3 (3 cols): Ações Claras */}
        <div className="lg:col-span-3 flex flex-wrap lg:justify-end items-center gap-2 pt-2 lg:pt-0">
          <Button
            type="button"
            variant={isMonitored ? 'success' : 'secondary'}
            size="sm"
            onClick={() => onToggleMonitor(dossier)}
            leftIcon={
              isMonitored ? (
                <BellRing className="w-3.5 h-3.5 text-[#748B7B]" />
              ) : (
                <BellPlus className="w-3.5 h-3.5 text-[#E5D5B3]" />
              )
            }
          >
            {isMonitored ? 'Salvo' : 'Acompanhar'}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => onOpenDossier(dossier)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Ver Dossiê Completo
          </Button>
        </div>
      </div>
    </article>
  )
}
