import React from 'react'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Briefcase,
  Award,
  BellPlus,
  BellRing,
  ExternalLink,
  ShieldCheck,
  Clock,
  Landmark
} from 'lucide-react'
import { ConcursoDossier } from '../../../shared/types/concurso'
import { STATUS_DISPLAY_MAP } from '../../../shared/types/search'
import { Button, Badge, Heading, Text, BadgeTone } from '../components/ds'
import { SubjectsGrid } from '../components/dossier/SubjectsGrid'
import { ReferenceLinks } from '../components/dossier/ReferenceLinks'

export interface DossierPageProps {
  dossier: ConcursoDossier | null
  isMonitored: boolean
  onBack: () => void
  onToggleMonitor: (dossier: ConcursoDossier) => void
}

export function DossierPage({
  dossier,
  isMonitored,
  onBack,
  onToggleMonitor
}: DossierPageProps): React.JSX.Element {
  if (!dossier) {
    return (
      <div className="w-full py-20 text-center space-y-4">
        <h2 className="font-display text-2xl text-[#FFFCF2]">Nenhum dossiê selecionado</h2>
        <p className="font-body-md text-sm text-[#BDBAB5]">
          Retorne à página de busca ou de acompanhamentos para selecionar um concurso.
        </p>
        <Button type="button" variant="primary" onClick={onBack} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Voltar
        </Button>
      </div>
    )
  }

  const statusInfo = STATUS_DISPLAY_MAP[dossier.status] || STATUS_DISPLAY_MAP.PREVISTO
  const badgeToneMap: Record<typeof statusInfo.semanticTone, BadgeTone> = {
    success: 'success',
    warning: 'gold',
    accent: 'accent',
    neutral: 'neutral'
  }

  const firstRole = dossier.cargosPrevistos && dossier.cargosPrevistos.length > 0 ? dossier.cargosPrevistos[0] : null
  const officialLink = dossier.linksReferencia?.find(
    (l) => l.tipo === 'BANCA' || l.tipo === 'PORTAL_OFICIAL' || l.tipo === 'EDITAL_PDF'
  )
  const primaryUrl =
    dossier.urlCanonica &&
    !dossier.urlCanonica.includes('pciconcursos') &&
    !dossier.urlCanonica.includes('acheconcursos') &&
    !dossier.urlCanonica.includes('concursosnobrasil')
      ? dossier.urlCanonica
      : officialLink?.url || dossier.urlCanonica || (dossier.linksReferencia && dossier.linksReferencia.length > 0 ? dossier.linksReferencia[0].url : null)
  const bancaLink = dossier.linksReferencia?.find((l) => l.tipo === 'BANCA')

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Barra de Ações Superior & Navegação */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5D5B3]/15 pb-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-1.5 rounded-lg bg-[#1B1A1B] hover:bg-[#262527] border border-[#E5D5B3]/20 text-[#E5D5B3] font-label-sm text-label-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista</span>
        </button>

        <div className="flex items-center gap-2">
          {primaryUrl && (
            <button
              type="button"
              onClick={() => window.api.openExternalUrl(primaryUrl)}
              className="px-3 py-1.5 rounded-lg bg-[#1B1A1B] hover:bg-[#262527] border border-[#E5D5B3]/20 text-[#FFFCF2] font-label-sm text-label-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Acessar Publicação Oficial</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#748B7B]" />
            </button>
          )}

          <Button
            type="button"
            variant={isMonitored ? 'success' : 'secondary'}
            size="sm"
            onClick={() => onToggleMonitor(dossier)}
            leftIcon={
              isMonitored ? (
                <BellRing className="w-4 h-4 text-[#748B7B]" />
              ) : (
                <BellPlus className="w-4 h-4 text-[#E5D5B3]" />
              )
            }
          >
            {isMonitored ? 'Concurso Acompanhado' : 'Acompanhar no Radar'}
          </Button>
        </div>
      </div>

      {/* Cabeçalho Editorial do Dossiê */}
      <section className="bg-[#1B1A1B] border border-[#E5D5B3]/15 p-6 lg:p-8 rounded-xl shadow-md space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5D5B3]/10">
          <div className="flex flex-wrap items-center gap-2">
            {dossier.tipoRegistro === 'EDITAL_OFICIAL' ? (
              <span className="px-2.5 py-0.5 rounded bg-[#243028] text-[#748B7B] border border-[#607466]/40 font-label-sm text-xs font-semibold uppercase tracking-wider">
                Ato / Edital Oficial
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded bg-[#1F1D1C] text-[#E5D5B3] border border-[#E5D5B3]/25 font-label-sm text-xs font-semibold uppercase tracking-wider">
                Notícia / Apuração
              </span>
            )}
            <Badge tone={badgeToneMap[statusInfo.semanticTone]} pulseDot>
              {dossier.statusLabel}
            </Badge>
            <span className="font-label-sm text-xs text-[#BDBAB5] uppercase">
              Jurisdição: {dossier.uf === 'BR' ? 'Nacional (BR)' : dossier.uf}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-label-sm text-[#E5D5B3]">
            <Clock className="w-3.5 h-3.5 text-[#748B7B]" />
            <span>
              Atualizado: {dossier.atualizadoEm ? new Date(dossier.atualizadoEm).toLocaleDateString('pt-BR') : 'Hoje'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-label-md text-[#748B7B] font-semibold uppercase tracking-wider">
            {dossier.orgao}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl leading-tight text-[#FFFCF2]">
            {dossier.tituloConcurso}
          </h1>
        </div>

        {/* Pullquote Editorial */}
        <div className="py-4 px-5 border-l-2 border-[#748B7B] bg-[#171617]/80 rounded-r-lg">
          <blockquote className="font-display text-lg sm:text-xl text-[#E5D5B3] italic font-normal leading-snug">
            &ldquo;{dossier.resumoGeral}&rdquo;
          </blockquote>
          <div className="mt-2 font-label-sm text-xs text-[#BDBAB5] tracking-wide uppercase">
            — Última movimentação factual: {dossier.cronograma.ultimaMovimentacao}
          </div>
        </div>

        {/* Quadro de Métricas Nucleares */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#171617] border border-[#E5D5B3]/10 p-3.5 rounded-lg flex flex-col justify-between">
            <span className="font-label-sm text-[11px] text-[#BDBAB5] uppercase tracking-wider">
              Vagas Previstas
            </span>
            <div className="mt-1 font-display text-lg text-[#FFFCF2] font-medium leading-tight">
              {dossier.numeroVagas || (firstRole ? firstRole.vagas : 'Consulte publicação')}
            </div>
            <span className="mt-1 font-body-sm text-xs text-[#E5D5B3]">
              {dossier.escolaridade ? `Nível: ${dossier.escolaridade.replace(/_/g, ' / ')}` : 'Conforme edital'}
            </span>
          </div>

          <div className="bg-[#171617] border border-[#E5D5B3]/10 p-3.5 rounded-lg flex flex-col justify-between">
            <span className="font-label-sm text-[11px] text-[#BDBAB5] uppercase tracking-wider">
              Remuneração Teto
            </span>
            <div className="mt-1 font-display text-lg text-[#FFFCF2] font-medium leading-tight">
              {dossier.salarioMaximo || (firstRole ? firstRole.remuneracao : 'Não especificado na publicação')}
            </div>
            <span className="mt-1 font-body-sm text-xs text-[#E5D5B3]">
              Vencimento base informado
            </span>
          </div>

          <div className="bg-[#171617] border border-[#E5D5B3]/10 p-3.5 rounded-lg flex flex-col justify-between">
            <span className="font-label-sm text-[11px] text-[#BDBAB5] uppercase tracking-wider">
              Banca Examinadora
            </span>
            <div className="mt-1 font-display text-lg text-[#FFFCF2] font-medium leading-tight truncate">
              {dossier.banca.nome}
            </div>
            <span className="mt-1 font-body-sm text-xs text-[#E5D5B3]">
              {dossier.banca.situacao === 'CONTRATADA'
                ? 'Oficialmente Contratada'
                : dossier.banca.situacao === 'COTADA_OU_HISTORICO'
                  ? 'Mais Cotada / Histórico'
                  : 'Aguardando Contratação'}
            </span>
          </div>

          <div className="bg-[#171617] border border-[#E5D5B3]/10 p-3.5 rounded-lg flex flex-col justify-between">
            <span className="font-label-sm text-[11px] text-[#BDBAB5] uppercase tracking-wider">
              Prazos / Inscrição
            </span>
            <div className="mt-1 font-display text-lg text-[#FFFCF2] font-medium leading-tight truncate">
              {dossier.prazoInscricao || dossier.cronograma.previsaoEdital}
            </div>
            <span className="mt-1 font-body-sm text-xs text-[#E5D5B3]">
              {dossier.cronograma.dataProvaPrevista || 'Data da prova a definir'}
            </span>
          </div>
        </div>
      </section>

      {/* Grade em 2 Colunas Paralelas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Institucional, Cronograma e Cargos (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Cronograma Factual */}
          <section className="bg-[#1B1A1B] border border-[#E5D5B3]/15 p-5 lg:p-6 rounded-xl space-y-3">
            <Heading level={4} icon={<Calendar className="w-4 h-4 text-[#748B7B]" />}>
              Cronograma &amp; Marcos Fatuais
            </Heading>
            <div className="divide-y divide-[#E5D5B3]/10 font-body-sm text-sm">
              <div className="flex justify-between gap-4 py-2.5">
                <span className="text-[#BDBAB5]">Janela Estimada do Edital:</span>
                <span className="text-[#FFFCF2] font-medium text-right">
                  {dossier.cronograma.previsaoEdital}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <span className="text-[#BDBAB5]">Período de Inscrições:</span>
                <span className="text-[#E5D5B3] text-right">
                  {dossier.cronograma.periodoInscricoes || 'Aguardando publicação oficial'}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <span className="text-[#BDBAB5]">Aplicação das Provas:</span>
                <span className="text-[#E5D5B3] text-right">
                  {dossier.cronograma.dataProvaPrevista || 'A definir no edital de abertura'}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-2.5">
                <span className="text-[#BDBAB5]">Último Ato Verificado:</span>
                <span className="text-[#BDBAB5] text-right max-w-sm truncate">
                  {dossier.cronograma.ultimaMovimentacao}
                </span>
              </div>
            </div>
          </section>

          {/* Perfil e Análise da Banca */}
          <section className="bg-[#1B1A1B] border border-[#E5D5B3]/15 p-5 lg:p-6 rounded-xl space-y-3">
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
                {dossier.banca.situacao === 'CONTRATADA'
                  ? 'Contratada'
                  : dossier.banca.situacao === 'COTADA_OU_HISTORICO'
                    ? 'Mais Cotada'
                    : 'A Definir'}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="font-display text-lg text-[#FFFCF2] font-medium">
                {dossier.banca.nome}
              </div>
              <p className="font-body-sm text-sm text-[#BDBAB5] leading-relaxed">
                {dossier.banca.observacao}
              </p>
              {bancaLink && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => window.api.openExternalUrl(bancaLink.url)}
                    className="px-3 py-1.5 rounded-lg bg-[#171617] hover:bg-[#262527] border border-[#E5D5B3]/20 text-[#E5D5B3] hover:text-[#FFFCF2] font-label-sm text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#748B7B]" />
                    <span>Acessar Portal da Organizadora</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Cargos Previstos */}
          {dossier.cargosPrevistos && dossier.cargosPrevistos.length > 0 && (
            <section className="bg-[#1B1A1B] border border-[#E5D5B3]/15 p-5 lg:p-6 rounded-xl space-y-3">
              <Heading level={4} icon={<Briefcase className="w-4 h-4 text-[#748B7B]" />}>
                Cargos Mapeados &amp; Vencimentos
              </Heading>
              <div className="divide-y divide-[#E5D5B3]/10">
                {dossier.cargosPrevistos.map((c, idx) => (
                  <div key={idx} className="py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base text-[#FFFCF2]">{c.titulo}</span>
                      <span className="font-label-sm text-xs text-[#748B7B] font-semibold">{c.remuneracao}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#BDBAB5]">
                      <span>Escolaridade: {c.escolaridade}</span>
                      <span>•</span>
                      <span>Vagas: {c.vagas}</span>
                    </div>
                    {c.descricaoAtribuicoes && (
                      <p className="text-xs text-[#BDBAB5]/80 mt-1">{c.descricaoAtribuicoes}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Coluna Direita: Disciplinas Nucleares e Fontes Oficiais (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Disciplinas Nucleares */}
          {dossier.materiasRecomendadas && dossier.materiasRecomendadas.length > 0 && (
            <SubjectsGrid subjects={dossier.materiasRecomendadas} />
          )}

          {/* Links e Fontes Oficiais */}
          {dossier.linksReferencia && (
            <ReferenceLinks links={dossier.linksReferencia} />
          )}

          {/* Nota de Integridade */}
          <div className="p-4 rounded-xl bg-[#171617] border border-[#607466]/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#748B7B] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-[#BDBAB5]">
              <div className="font-medium text-[#FFFCF2]">Protocolo de Transparência InfoConcursos</div>
              <p>
                Este dossiê é gerado a partir de cruzamento de fontes primárias, diários oficiais e páginas de organizadoras.
                Valores de remuneração e prazos ausentes nas publicações oficiais recebem indicação transparente de pendência.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
