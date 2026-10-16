import React, { useEffect, useState } from 'react'
import {
  ArrowRight,
  ExternalLink,
  Landmark,
  Radio,
  BookOpen,
  ShieldCheck,
  SlidersHorizontal,
  Clock,
  RefreshCw,
  FileCheck
} from 'lucide-react'
import { NewsItem } from '../../../shared/types/news'
import { ConcursoArea } from '../../../shared/types/concurso'
import { STATUS_DISPLAY_MAP } from '../../../shared/types/search'

interface NewsPageProps {
  news: NewsItem[]
  isLoading: boolean
  newsAtualizadoEm?: string | null
  newsFromCache?: boolean
  onRefreshNews: (area?: ConcursoArea, uf?: string, options?: { forceRefresh?: boolean }) => void
  onGenerateDossierFromNews: (orgao: string) => void
}

const EDITORIAL_FILTERS: { label: string; area: ConcursoArea; uf?: string }[] = [
  { label: 'Todos os Atos', area: 'TODOS', uf: 'TODOS' },
  { label: 'Minas Gerais (MG)', area: 'TODOS', uf: 'MG' },
  { label: 'Tribunais & Judiciário', area: 'TRIBUNAIS' },
  { label: 'Setor Bancário', area: 'BANCARIA' },
  { label: 'Fiscal & Controle', area: 'FISCAL_CONTROLE' },
  { label: 'Segurança Pública', area: 'POLICIAL' },
  { label: 'Administrativa & Federal', area: 'ADMINISTRATIVA' }
]

export function NewsPage({
  news,
  isLoading,
  newsAtualizadoEm,
  newsFromCache,
  onRefreshNews,
  onGenerateDossierFromNews
}: NewsPageProps): React.JSX.Element {
  const [selectedFilterIdx, setSelectedFilterIdx] = useState<number>(0)
  const [clockText, setClockText] = useState<string>('')

  useEffect(() => {
    if (news.length === 0) {
      onRefreshNews('TODOS', 'TODOS', { forceRefresh: false })
    }
  }, [])

  useEffect(() => {
    const updateClock = (): void => {
      try {
        const now = new Date()
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
        setClockText(`Brasília, ${formatter.format(now)} UTC-3`)
      } catch {
        const now = new Date()
        setClockText(`Brasília, ${now.toLocaleTimeString('pt-BR')} UTC-3`)
      }
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSelectFilter = (idx: number): void => {
    setSelectedFilterIdx(idx)
    const f = EDITORIAL_FILTERS[idx]
    onRefreshNews(f.area, f.uf || 'TODOS', { forceRefresh: false })
  }

  const leadItem: NewsItem | undefined = news[0]
  const radarItems: NewsItem[] = news.slice(0, 4)

  const leadStatusLabel = leadItem
    ? STATUS_DISPLAY_MAP[leadItem.statusRelacionado]?.label || 'Publicação Ativa'
    : 'Monitoramento Oficial'

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Minimalist Filter Bar (Wrap fluído sem scroll horizontal) */}
      <nav
        aria-label="Filtros editoriais"
        className="w-full my-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5D5B3]/15 pb-3"
      >
        <div className="flex flex-wrap items-center gap-1.5 text-label-sm font-label-sm">
          {EDITORIAL_FILTERS.map((f, idx) => {
            const isActive = selectedFilterIdx === idx
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => handleSelectFilter(idx)}
                className={
                  isActive
                    ? 'px-3 py-1.5 rounded-lg bg-[#607466] text-[#FFFCF2] font-medium shadow-sm transition-all hover:bg-[#748B7B] cursor-pointer'
                    : 'px-3 py-1.5 rounded-lg text-[#BDBAB5] hover:text-[#FFFCF2] hover:bg-[#1E1D1E] transition-all border border-transparent hover:border-[#E5D5B3]/15 cursor-pointer'
                }
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3 text-[#E5D5B3] font-label-sm text-label-sm">
          <span className="text-[#BDBAB5]">{clockText}</span>
          <span className="text-[#BDBAB5]/40">•</span>
          <span className="hidden sm:flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#748B7B]" />
            <span>Filtro Ativo</span>
          </span>
          <button
            type="button"
            onClick={() => {
              const current = EDITORIAL_FILTERS[selectedFilterIdx]
              onRefreshNews(current.area, current.uf || 'TODOS', { forceRefresh: true })
            }}
            disabled={isLoading}
            title={newsFromCache ? 'Base Local (Offline) • Clique para atualizar via rede' : 'Atualizado via rede'}
            className="px-2.5 py-1 rounded bg-[#1E1D1E] hover:bg-[#262527] border border-[#E5D5B3]/20 text-[#FFFCF2] inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 text-[#748B7B] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
            {newsFromCache && (
              <span className="text-[10px] text-[#E5D5B3]/60 hidden sm:inline">(Cache)</span>
            )}
          </button>
        </div>
      </nav>

      {/* Lead Story & Real-time Radar (Asymmetric Desktop Split - Editorial Balance) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Primary Column: Authoritative Swiss Editorial Hero (8 cols) */}
        <article className="lg:col-span-8 flex flex-col justify-between bg-[#1B1A1B] border border-[#E5D5B3]/15 p-6 lg:p-7 rounded-xl shadow-md transition-all">
          <div>
            {/* Header Meta Tagging */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#E5D5B3]/10 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-[#243028] text-[#E5D5B3] border border-[#607466]/40 font-label-sm text-xs uppercase tracking-wider font-semibold">
                  {leadStatusLabel}
                </span>
                <span className="px-2.5 py-1 border border-[#E5D5B3]/20 text-[#BDBAB5] text-xs font-label-sm rounded uppercase">
                  {leadItem ? `${leadItem.orgaoRelacionado} • ${leadItem.uf === 'BR' ? 'Nacional' : leadItem.uf}` : 'Publicação Primária'}
                </span>
                {leadItem?.tipoConteudo === 'EDITAL_CONCRETO' && (
                  <span className="px-2.5 py-1 rounded bg-[#607466]/25 text-[#FFFCF2] border border-[#748B7B]/50 font-label-sm text-xs uppercase flex items-center gap-1.5 font-medium">
                    <FileCheck className="w-3.5 h-3.5 text-[#748B7B]" />
                    Edital Concreto
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-label-sm text-[#E5D5B3]">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#748B7B]" />
                  {leadItem?.dataPublicacao ? new Date(leadItem.dataPublicacao).toLocaleDateString('pt-BR') : 'Hoje'}
                </span>
                <span className="text-[#BDBAB5]/50">•</span>
                <span className="text-[#BDBAB5]">
                  {leadItem ? leadItem.portalFonte : 'Diário / Portal'}
                </span>
              </div>
            </div>

            {/* Dramatic Serif Headline - Tipografia com Autoridade */}
            <h1 className="font-display text-2xl sm:text-3xl xl:text-[32px] leading-tight text-[#FFFCF2] tracking-tight">
              {leadItem
                ? leadItem.titulo
                : 'Monitorando movimentações em portais de editais, feeds RSS e páginas oficiais de bancas.'}
            </h1>

            {/* Síntese Direta e Elegante */}
            <p className="mt-3 font-body-md text-sm sm:text-base text-[#D4C8B5] leading-relaxed line-clamp-3">
              {leadItem
                ? leadItem.resumo
                : 'Acompanhe as publicações extraídas diretamente dos canais oficiais dos órgãos públicos e organizadoras.'}
            </p>
          </div>

          <div>
            {/* Faixa Horizontal de Métricas Estruturadas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-[#E5D5B3]/15">
              <div className="bg-[#171617] border border-[#E5D5B3]/15 p-3 sm:p-3.5 rounded-lg">
                <span className="font-label-sm text-xs text-[#BDBAB5] uppercase tracking-wider block">
                  Órgão / Ente
                </span>
                <div className="font-display text-base text-[#FFFCF2] font-medium truncate mt-1">
                  {leadItem ? leadItem.orgaoRelacionado : 'Ato Público'}
                </div>
              </div>

              <div className="bg-[#171617] border border-[#E5D5B3]/15 p-3 sm:p-3.5 rounded-lg">
                <span className="font-label-sm text-xs text-[#BDBAB5] uppercase tracking-wider block">
                  Remuneração
                </span>
                <div className="font-display text-base text-[#FFFCF2] font-medium truncate mt-1">
                  {leadItem?.remuneracao || 'Não especificado'}
                </div>
              </div>

              <div className="bg-[#171617] border border-[#E5D5B3]/15 p-3 sm:p-3.5 rounded-lg">
                <span className="font-label-sm text-xs text-[#BDBAB5] uppercase tracking-wider block">
                  Prazos
                </span>
                <div className="font-display text-base text-[#FFFCF2] font-medium truncate mt-1">
                  {leadItem?.prazoInscricao || 'Consulte publicação'}
                </div>
              </div>

              <div className="bg-[#171617] border border-[#E5D5B3]/15 p-3 sm:p-3.5 rounded-lg">
                <span className="font-label-sm text-xs text-[#BDBAB5] uppercase tracking-wider block">
                  Vagas &amp; Nível
                </span>
                <div className="font-display text-base text-[#FFFCF2] font-medium truncate mt-1">
                  {leadItem?.vagas || (leadItem?.escolaridade ? `${leadItem.escolaridade}` : 'A definir')}
                </div>
              </div>
            </div>

            {/* Rodapé da Hero com Botões de Ação */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-[#E5D5B3]/15">
              <div className="flex items-center gap-2 text-xs font-label-sm text-[#BDBAB5]">
                <ShieldCheck className="w-4 h-4 text-[#748B7B] shrink-0" />
                <span>Atos apurados com verificação documental oficial</span>
              </div>

              <div className="flex items-center gap-2.5">
                {leadItem && (
                  <button
                    type="button"
                    onClick={() => window.api.openExternalUrl(leadItem.url)}
                    className="px-3.5 py-2 rounded-lg bg-[#1E1D1E] hover:bg-[#262527] border border-[#E5D5B3]/20 text-[#E5D5B3] font-label-sm text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Fonte Oficial</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onGenerateDossierFromNews(
                      leadItem ? leadItem.orgaoRelacionado : 'Concursos Públicos'
                    )
                  }
                  className="px-4 sm:px-5 py-2 rounded-lg bg-[#607466] text-[#FFFCF2] font-label-sm text-xs sm:text-sm font-semibold hover:bg-[#748B7B] transition-all shadow-sm cursor-pointer"
                >
                  Abrir Dossiê Completo
                </button>
              </div>
            </div>
          </div>
        </article>

        {/* Secondary Column: Radar em Tempo Real (4 cols) */}
        <aside className="lg:col-span-4 flex flex-col justify-between space-y-4">
          {/* Radar Section Container */}
          <div className="bg-[#1B1A1B] border border-[#E5D5B3]/15 p-5 lg:p-6 rounded-xl shadow-md flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E5D5B3]/10">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#748B7B]" />
                <h3 className="font-display text-lg text-[#FFFCF2] font-medium">
                  Radar de Atualizações
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#243028] text-[#E5D5B3] border border-[#607466]/30 font-label-sm text-xs">
                Ao Vivo
              </span>
            </div>

            {/* Vertical Timeline Feed */}
            <div className="relative pl-5 space-y-3.5 flex-1">
              <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-[#313032]" />

              {radarItems.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => onGenerateDossierFromNews(item.orgaoRelacionado)}
                  className="relative group cursor-pointer"
                >
                  <div
                    className={`absolute -left-[1.65rem] top-1.5 w-3 h-3 rounded-full transition-colors ring-4 ring-[#1B1A1B] ${
                      idx === 0
                        ? 'bg-[#748B7B]'
                        : 'bg-[#313032] group-hover:bg-[#748B7B]'
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs font-label-sm text-[#E5D5B3] mb-0.5">
                    <span className="font-medium truncate max-w-[180px]">
                      {item.orgaoRelacionado} • {item.uf === 'BR' ? 'BR' : item.uf}
                    </span>
                    <span className="text-[#BDBAB5] text-[11px] shrink-0">{item.portalFonte}</span>
                  </div>
                  <h4 className="font-headline-sm text-sm text-[#FFFCF2] group-hover:text-[#E5D5B3] transition-colors leading-snug line-clamp-2">
                    {item.titulo}
                  </h4>
                  <p className="font-body-sm text-xs text-[#BDBAB5] mt-0.5 line-clamp-1">
                    {item.resumo}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Data Widget */}
          <div className="bg-[#171617] border border-[#E5D5B3]/15 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#243028] border border-[#607466]/30 flex items-center justify-center text-[#748B7B] shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <div className="font-label-md text-xs sm:text-sm text-[#FFFCF2] font-medium">
                  Publicações Monitoradas
                </div>
                <div className="font-body-sm text-xs text-[#BDBAB5]">
                  {news.length} atos e matérias catalogados
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const current = EDITORIAL_FILTERS[selectedFilterIdx]
                onRefreshNews(current.area, current.uf || 'TODOS')
              }}
              className="px-3 py-1 bg-[#1E1D1E] hover:bg-[#262527] border border-[#E5D5B3]/20 rounded text-xs font-label-sm text-[#FFFCF2] transition-colors cursor-pointer"
            >
              Sincronizar
            </button>
          </div>
        </aside>
      </div>

      {/* Editorial Section Divider */}
      <div className="w-full flex items-center justify-between my-6 pt-4 border-t border-[#E5D5B3]/10">
        <div className="flex items-center gap-space-sm">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#607466]" />
          <h3 className="font-display text-headline-md text-[#FFFCF2] tracking-tight">
            Pauta Linear de Editais & Notícias Apuradas
          </h3>
        </div>
        <span className="font-label-sm text-label-sm text-[#E5D5B3] uppercase tracking-widest hidden sm:inline-block">
          Classificação Estrita: Editais Concretos vs. Apurações
        </span>
      </div>

      {/* Minimalist Monocle-Style Linear Editorial List with Hairline Dividers */}
      <div className="w-full bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl divide-y divide-[#E5D5B3]/20 shadow-sm overflow-hidden">
        {news.map((item) => {
          const statusStyle =
            STATUS_DISPLAY_MAP[item.statusRelacionado] || STATUS_DISPLAY_MAP.PREVISTO

          return (
            <article
              key={`linear-${item.id}`}
              className="p-space-lg hover:bg-[#1E1D1E]/80 transition-colors group"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-baseline">
                {/* Coluna 1 (3 cols): Metadados, Instituição e Selo de Tipo */}
                <div className="lg:col-span-3 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#243028] text-[#748B7B] border border-[#607466]/30 font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                      {statusStyle.label}
                    </span>
                    <span className="text-label-sm font-label-sm text-[#BDBAB5]">
                      {item.uf === 'BR' ? 'Nacional' : item.uf}
                    </span>
                  </div>
                  <span className="text-label-sm font-label-sm text-[#E5D5B3] font-medium mt-1">
                    {item.orgaoRelacionado} • {item.portalFonte}
                  </span>
                  {item.tipoConteudo === 'EDITAL_CONCRETO' && (
                    <span className="font-label-sm text-[10px] text-[#748B7B] uppercase tracking-wider font-semibold">
                      ✓ Ato Oficial Concreto
                    </span>
                  )}
                </div>

                {/* Coluna 2 (7 cols): Manchete em Newsreader e Resumo em Inter */}
                <div
                  onClick={() => onGenerateDossierFromNews(item.orgaoRelacionado)}
                  className="lg:col-span-7 space-y-1 cursor-pointer"
                >
                  <h4 className="font-display text-xl sm:text-2xl text-[#FFFCF2] group-hover:text-[#E5D5B3] transition-colors leading-snug">
                    {item.titulo}
                  </h4>
                  <p className="font-body-sm text-body-sm text-[#BDBAB5] leading-relaxed">
                    {item.resumo}
                  </p>
                  {(item.remuneracao || item.vagas || item.prazoInscricao) && (
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-label-sm font-label-sm text-[#E5D5B3]">
                      {item.vagas && <span>Vagas: {item.vagas}</span>}
                      {item.remuneracao && <span>• {item.remuneracao}</span>}
                      {item.prazoInscricao && <span>• {item.prazoInscricao}</span>}
                    </div>
                  )}
                </div>

                {/* Coluna 3 (2 cols): Ações de Leitura e Fonte */}
                <div className="lg:col-span-2 flex lg:flex-col lg:items-end justify-between items-center text-label-sm font-label-sm pt-2 lg:pt-0 gap-2">
                  <button
                    type="button"
                    onClick={() => window.api.openExternalUrl(item.url)}
                    className="text-[#BDBAB5]/80 hover:text-[#FFFCF2] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Fonte Oficial</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onGenerateDossierFromNews(item.orgaoRelacionado)}
                    className="text-[#748B7B] group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold mt-1 cursor-pointer"
                  >
                    <span>Ver Dossiê</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Subtle Quote Banner */}
      <aside className="mt-space-xl p-space-lg bg-[#171617] border border-[#E5D5B3]/15 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
        <div className="flex items-start gap-space-md">
          <ShieldCheck className="w-7 h-7 text-[#748B7B] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-display text-subheading text-[#FFFCF2] italic">
              &ldquo;A exatidão da apuração documental precede qualquer prognóstico preparatório.&rdquo;
            </div>
            <div className="font-label-sm text-label-sm text-[#BDBAB5]">
              Protocolo de Redação • Verificação com Sitemaps, Feeds Oficiais e Portais de Concursos
            </div>
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          <button
            type="button"
            onClick={() => handleSelectFilter(0)}
            className="px-space-md py-1.5 rounded-lg bg-[#1E1D1E] hover:bg-[#262527] border border-[#E5D5B3]/20 text-[#E5D5B3] font-label-md text-label-md transition-colors cursor-pointer"
          >
            Todos os Atos
          </button>
        </div>
      </aside>
    </div>
  )
}
