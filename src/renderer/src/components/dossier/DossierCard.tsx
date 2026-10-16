import React from 'react'
import {
  Building2,
  Calendar,
  Briefcase,
  Award,
  BellPlus,
  BellRing,
  MapPin,
  Clock,
  DollarSign,
  GraduationCap
} from 'lucide-react'
import { ConcursoDossier } from '../../../../shared/types/concurso'
import { STATUS_DISPLAY_MAP } from '../../../../shared/types/search'
import { Button, Badge, Heading, Text, BadgeTone } from '../ds'
import { SubjectsGrid } from './SubjectsGrid'
import { ReferenceLinks } from './ReferenceLinks'

interface DossierCardProps {
  dossier: ConcursoDossier
  isMonitored: boolean
  onToggleMonitor: (dossier: ConcursoDossier) => void
}

export function DossierCard({
  dossier,
  isMonitored,
  onToggleMonitor
}: DossierCardProps): React.JSX.Element {
  const statusInfo = STATUS_DISPLAY_MAP[dossier.status] || STATUS_DISPLAY_MAP.PREVISTO

  const badgeToneMap: Record<typeof statusInfo.semanticTone, BadgeTone> = {
    success: 'success',
    warning: 'gold',
    accent: 'accent',
    neutral: 'neutral'
  }

  return (
    <article className="rounded-lg border border-pearl-beige-800/80 bg-carbon-black-900/90 shadow-2xl overflow-hidden space-y-6 p-6">
      {/* Cabeçalho do Dossiê: Órgão, Status e Botão de Acompanhamento */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-6 border-b border-pearl-beige-800/60">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={badgeToneMap[statusInfo.semanticTone]} pulseDot>
              Situação: {dossier.statusLabel}
            </Badge>

            <Badge tone="neutral" icon={<MapPin className="w-3.5 h-3.5 text-pearl-beige-400" />}>
              Abrangência: {dossier.uf === 'BR' ? 'Nacional (Brasil)' : dossier.uf}
            </Badge>

            <span className="inline-flex items-center gap-1.5 text-caption text-pearl-beige-300 px-2 py-1">
              <Clock className="w-3.5 h-3.5 text-pearl-beige-400" />
              Dados atualizados (2025/2026)
            </span>
          </div>

          <Heading level={2} className="text-floral-white-50">{dossier.tituloConcurso}</Heading>
          <Text variant="secondary">{dossier.resumoGeral}</Text>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant={isMonitored ? 'success' : 'primary'}
            size="md"
            onClick={() => onToggleMonitor(dossier)}
            leftIcon={
              isMonitored ? <BellRing className="w-4 h-4" /> : <BellPlus className="w-4 h-4" />
            }
          >
            {isMonitored ? 'Acompanhando Atualizações' : 'Acompanhar este Concurso'}
          </Button>
        </div>
      </div>

      {/* Linha 1: Cronograma & Datas Previstas + Banca Organizadora */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco de Datas e Previsões */}
        <div className="rounded-md border border-pearl-beige-800/60 bg-carbon-black-950/80 p-6 space-y-4">
          <Heading level={4} icon={<Calendar className="w-4 h-4 text-spicy-paprika-400" />}>
            Datas, Prazos & Previsões
          </Heading>
          <div className="space-y-2 text-caption">
            <div className="flex justify-between gap-2 py-2 border-b border-charcoal-brown-800">
              <span className="text-pearl-beige-300">Previsão de Edital:</span>
              <span className="text-floral-white-100 font-semibold text-right">
                {dossier.cronograma.previsaoEdital}
              </span>
            </div>
            <div className="flex justify-between gap-2 py-2 border-b border-charcoal-brown-800">
              <span className="text-pearl-beige-300">Período de Inscrições:</span>
              <span className="text-pearl-beige-100 text-right">
                {dossier.cronograma.periodoInscricoes || 'A definir no edital'}
              </span>
            </div>
            <div className="flex justify-between gap-2 py-2 border-b border-charcoal-brown-800">
              <span className="text-pearl-beige-300">Aplicação das Provas:</span>
              <span className="text-pearl-beige-100 text-right">
                {dossier.cronograma.dataProvaPrevista || 'A definir'}
              </span>
            </div>
            <div className="pt-2 space-y-1">
              <span className="text-pearl-beige-300 block">Última Movimentação Recente:</span>
              <span className="text-floral-white-100 font-medium block">
                {dossier.cronograma.ultimaMovimentacao}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco da Banca Organizadora */}
        <div className="rounded-md border border-pearl-beige-800/60 bg-carbon-black-950/80 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Heading level={4} icon={<Building2 className="w-4 h-4 text-spicy-paprika-400" />}>
                Banca Organizadora
              </Heading>
              <Badge
                tone={
                  dossier.banca.situacao === 'CONTRATADA'
                    ? 'success'
                    : dossier.banca.situacao === 'COTADA_OU_HISTORICO'
                      ? 'gold'
                      : 'neutral'
                }
              >
                {dossier.banca.situacao === 'CONTRATADA'
                  ? 'Banca Contratada'
                  : dossier.banca.situacao === 'COTADA_OU_HISTORICO'
                    ? 'Cotada / Histórico Recente'
                    : 'Em Definição'}
              </Badge>
            </div>

            <div className="p-4 rounded-sm bg-carbon-black-900 border border-pearl-beige-800/60 space-y-1">
              <div className="text-body-lg font-bold text-floral-white-50">{dossier.banca.nome}</div>
              <Text variant="caption">{dossier.banca.observacao}</Text>
            </div>
          </div>

          {dossier.cronograma.validadeAnterior && (
            <div className="text-caption text-pearl-beige-300 flex items-center gap-2 pt-3 border-t border-charcoal-brown-800">
              <Award className="w-4 h-4 text-spicy-paprika-400 shrink-0" />
              <span>{dossier.cronograma.validadeAnterior}</span>
            </div>
          )}
        </div>
      </div>

      {/* Linha 2: Cargos Previstos com Descrição, Escolaridade e Remuneração */}
      <div className="rounded-md border border-pearl-beige-800/60 bg-carbon-black-950/80 p-6 space-y-4">
        <Heading level={4} icon={<Briefcase className="w-4 h-4 text-spicy-paprika-400" />}>
          Cargos Previstos, Remuneração & Descrição das Atribuições
        </Heading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dossier.cargosPrevistos.map((cargo, idx) => (
            <div
              key={`${cargo.titulo}-${idx}`}
              className="rounded-md border border-pearl-beige-800/60 bg-carbon-black-900 p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-body font-bold text-floral-white-50">{cargo.titulo}</h4>
                  <Badge
                    tone="gold"
                    icon={<GraduationCap className="w-3.5 h-3.5" />}
                  >
                    Nível {cargo.escolaridade.replace('_', ' / ')}
                  </Badge>
                </div>

                <Text variant="caption">{cargo.descricaoAtribuicoes}</Text>
              </div>

              <div className="pt-3 border-t border-pearl-beige-800/40 space-y-1 text-caption">
                <div className="flex items-center gap-1.5 text-floral-white-100 font-semibold">
                  <DollarSign className="w-4 h-4 text-pearl-beige-400 shrink-0" />
                  <span>{cargo.remuneracao}</span>
                </div>
                <div className="text-pearl-beige-300">
                  <strong className="text-floral-white-100">Vagas:</strong> {cargo.vagas}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Linha 3: Matérias Recomendadas para Estudo Imediato */}
      <SubjectsGrid subjects={dossier.materiasRecomendadas} />

      {/* Linha 4: Links de Referência Oficiais */}
      <ReferenceLinks links={dossier.linksReferencia} />
    </article>
  )
}
