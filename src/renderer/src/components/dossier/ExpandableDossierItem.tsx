import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  Briefcase,
  Award,
  BellPlus,
  BellRing
} from 'lucide-react'
import { ConcursoDossier } from '../../../../shared/types/concurso'
import { STATUS_DISPLAY_MAP } from '../../../../shared/types/search'
import { Button, Badge, Heading, Text, BadgeTone } from '../ds'
import { SubjectsGrid } from './SubjectsGrid'
import { ReferenceLinks } from './ReferenceLinks'

export interface ExpandableDossierItemProps {
  dossier: ConcursoDossier
  isMonitored: boolean
  defaultExpanded?: boolean
  onToggleMonitor: (dossier: ConcursoDossier) => void
}

export function ExpandableDossierItem({
  dossier,
  isMonitored,
  defaultExpanded = false,
  onToggleMonitor
}: ExpandableDossierItemProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded)

  const statusInfo = STATUS_DISPLAY_MAP[dossier.status] || STATUS_DISPLAY_MAP.PREVISTO

  const badgeToneMap: Record<typeof statusInfo.semanticTone, BadgeTone> = {
    success: 'success',
    warning: 'gold',
    accent: 'accent',
    neutral: 'neutral'
  }

  const firstRole = dossier.cargosPrevistos[0]

  return (
    <article className="bg-[#1B1A1B] transition-colors">
      {/* Cabeçalho Linear Estilo Monocle (12 Colunas) */}
      <div className="p-space-lg hover:bg-[#1E1D1E]/70 transition-colors group">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-baseline">
          {/* Coluna 1 (3 cols): Selo de Classificação, Status e UF */}
          <div className="lg:col-span-3 flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {dossier.tipoRegistro === 'EDITAL_OFICIAL' ? (
                <span className="px-2 py-0.5 rounded bg-[#243028] text-[#748B7B] border border-[#607466]/40 font-label-sm text-[11px] font-semibold uppercase tracking-wider">
                  Ato / Edital Oficial
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-[#1F1D1C] text-[#E5D5B3] border border-[#E5D5B3]/25 font-label-sm text-[11px] font-semibold uppercase tracking-wider">
                  Notícia / Apuração
                </span>
              )}
              <Badge tone={badgeToneMap[statusInfo.semanticTone]} pulseDot>
                {dossier.statusLabel}
              </Badge>
              <span className="font-label-sm text-label-sm text-[#BDBAB5]">
                {dossier.uf === 'BR' ? 'Nacional' : dossier.uf}
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-[#E5D5B3] font-medium">
              {dossier.orgao} • Banca: {dossier.banca.nome}
            </span>
          </div>

          {/* Coluna 2 (6 cols): Título em Newsreader & Resumo Executivo */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:col-span-6 space-y-1 cursor-pointer"
          >
            <h3 className="font-display text-xl sm:text-2xl text-[#FFFCF2] group-hover:text-[#E5D5B3] transition-colors leading-snug">
              {dossier.tituloConcurso}
            </h3>
            <p className="font-body-sm text-body-sm text-[#BDBAB5] leading-relaxed line-clamp-2">
              {dossier.resumoGeral}
            </p>
          </div>

          {/* Coluna 3 (3 cols): Botões de Acompanhamento e Expansão */}
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
              variant={isExpanded ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              rightIcon={
                isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )
              }
            >
              {isExpanded ? 'Recolher' : 'Abrir Dossiê'}
            </Button>
          </div>
        </div>
      </div>

      {/* Corpo Expandido do Dossiê (Pure Swiss Editorial Layout) */}
      {isExpanded && (
        <div className="border-t border-[#E5D5B3]/15 bg-[#121112]/80 p-space-lg lg:p-8 space-y-space-lg">
          {/* Pullquote Editorial com Síntese do Concurso */}
          <div className="py-space-md px-space-lg border-l-2 border-[#748B7B] bg-[#171617]/80 rounded-r-lg">
            <blockquote className="font-display text-lg sm:text-xl text-[#E5D5B3] italic font-normal leading-snug">
              &ldquo;{dossier.resumoGeral}&rdquo;
            </blockquote>
            <div className="mt-2 font-label-sm text-label-sm text-[#BDBAB5] tracking-wide uppercase">
              — Última movimentação: {dossier.cronograma.ultimaMovimentacao}
            </div>
          </div>

          {/* Minimalist Compact Key Metrics Trio — Dados Reais Extraídos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
            <div className="bg-[#171617] border border-[#E5D5B3]/15 p-space-md rounded-lg flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-[#BDBAB5] uppercase tracking-wider">
                Prazo / Previsão
              </span>
              <div className="mt-space-xs font-display text-headline-sm text-[#FFFCF2] font-medium leading-tight">
                {dossier.prazoInscricao || dossier.cronograma.previsaoEdital}
              </div>
              <span className="mt-1 font-body-sm text-body-sm text-[#E5D5B3]">
                {dossier.escolaridade ? `Requisitos: ${dossier.escolaridade}` : 'Consulte documento oficial'}
              </span>
            </div>

            <div className="bg-[#171617] border border-[#E5D5B3]/15 p-space-md rounded-lg flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-[#BDBAB5] uppercase tracking-wider">
                Remuneração
              </span>
              <div className="mt-space-xs font-display text-headline-sm text-[#FFFCF2] font-medium leading-tight">
                {dossier.salarioMaximo || (firstRole ? firstRole.remuneracao : 'Não especificado na publicação')}
              </div>
              <span className="mt-1 font-body-sm text-body-sm text-[#E5D5B3]">
                Vagas: {dossier.numeroVagas || (firstRole ? firstRole.vagas : 'Consulte publicação')}
              </span>
            </div>

            <div className="bg-[#171617] border border-[#E5D5B3]/15 p-space-md rounded-lg flex flex-col justify-between">
              <span className="font-label-sm text-label-sm text-[#BDBAB5] uppercase tracking-wider">
                Banca Examinadora
              </span>
              <div className="mt-space-xs font-display text-headline-sm text-[#FFFCF2] font-medium leading-tight">
                {dossier.banca.nome}
              </div>
              <span className="mt-1 font-body-sm text-body-sm text-[#E5D5B3]">
                {dossier.banca.situacao === 'CONTRATADA'
                  ? 'Banca Oficialmente Contratada'
                  : dossier.banca.situacao === 'COTADA_OU_HISTORICO'
                    ? 'Histórico / Mais Cotada'
                    : 'Em fase de definição'}
              </span>
            </div>
          </div>

          {/* Cronograma Detalhado & Perfil da Banca */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
            <div className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-space-lg space-y-3">
              <Heading level={4} icon={<Calendar className="w-4 h-4 text-[#748B7B]" />}>
                Cronograma & Prazos Regulares
              </Heading>
              <div className="divide-y divide-[#E5D5B3]/10 font-body-sm text-body-sm">
                <div className="flex justify-between gap-2 py-2">
                  <span className="text-[#BDBAB5]">Janela Estimada do Edital:</span>
                  <span className="text-[#FFFCF2] font-medium text-right">
                    {dossier.cronograma.previsaoEdital}
                  </span>
                </div>
                <div className="flex justify-between gap-2 py-2">
                  <span className="text-[#BDBAB5]">Período de Inscrições:</span>
                  <span className="text-[#E5D5B3] text-right">
                    {dossier.cronograma.periodoInscricoes || 'Aguardando publicação'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 py-2">
                  <span className="text-[#BDBAB5]">Aplicação das Provas:</span>
                  <span className="text-[#E5D5B3] text-right">
                    {dossier.cronograma.dataProvaPrevista || 'A definir'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-space-lg space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Heading level={4} icon={<Building2 className="w-4 h-4 text-[#748B7B]" />}>
                    Análise da Banca Organizadora
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
                    {dossier.banca.nome}
                  </Badge>
                </div>
                <Text variant="secondary">{dossier.banca.observacao}</Text>
              </div>

              {dossier.cronograma.validadeAnterior && (
                <div className="font-label-sm text-label-sm text-[#E5D5B3] flex items-center gap-2 pt-3 border-t border-[#E5D5B3]/10">
                  <Award className="w-3.5 h-3.5 text-[#748B7B] shrink-0" />
                  <span>{dossier.cronograma.validadeAnterior}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cargos Previstos com Descrição, Escolaridade e Remuneração */}
          <div className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-space-lg space-y-4">
            <div className="pb-2 border-b border-[#E5D5B3]/10">
              <Heading level={4} icon={<Briefcase className="w-4 h-4 text-[#748B7B]" />}>
                Quadros de Pessoal, Atribuições & Remuneração
              </Heading>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {dossier.cargosPrevistos.map((cargo, idx) => (
                <div
                  key={`${cargo.titulo}-${idx}`}
                  className="rounded-lg border border-[#E5D5B3]/15 bg-[#171617] p-space-md space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-display text-xl text-[#FFFCF2]">{cargo.titulo}</h4>
                      <Badge tone="gold">
                        Nível {cargo.escolaridade.replace('_', ' / ')}
                      </Badge>
                    </div>
                    <Text variant="secondary">{cargo.descricaoAtribuicoes}</Text>
                  </div>

                  <div className="pt-2.5 border-t border-[#E5D5B3]/10 flex flex-wrap items-center justify-between gap-2 font-label-sm text-label-sm">
                    <span className="text-[#FFFCF2] font-semibold">{cargo.remuneracao}</span>
                    <span className="text-[#E5D5B3]">Vagas: {cargo.vagas}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Matérias Recomendadas para Estudo */}
          <SubjectsGrid subjects={dossier.materiasRecomendadas} />

          {/* Links de Referência Oficiais */}
          <ReferenceLinks links={dossier.linksReferencia} />

          {/* Rodapé de Fechamento do Accordion */}
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsExpanded(false)}
              rightIcon={<ChevronUp className="w-3.5 h-3.5" />}
            >
              Recolher Dossiê
            </Button>
          </div>
        </div>
      )}
    </article>
  )
}
