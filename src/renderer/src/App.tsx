import React, { useEffect, useState } from 'react'
import {
  CheckCircle2,
  Search,
  Sparkles,
  Settings,
  Pin,
  PinOff,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { useAppStore } from './stores/monitoringStore'
import { SearchBar } from './components/search/SearchBar'
import { DossierSummaryCard } from './components/dossier/DossierSummaryCard'
import { NewsPage } from './pages/NewsPage'
import { MonitoringPage } from './pages/MonitoringPage'
import { DossierPage } from './pages/DossierPage'
import { SettingsPage } from './pages/SettingsPage'
import { Button, Heading, Text } from './components/ds'
import { SUGESTOES_RAPIDAS } from '../../shared/constants/areas'

export function App(): React.JSX.Element {
  const {
    activeTab,
    filter,
    dossiers,
    activeDossier,
    news,
    monitoredItems,
    isLoadingSearch,
    isLoadingNews,
    isCheckingUpdates,
    lastUpdateMessage,
    searchAtualizadoEm,
    searchFromCache,
    newsAtualizadoEm,
    newsFromCache,
    setActiveTab,
    setFilter,
    openDossierPage,
    goBackFromDossier,
    executeSearch,
    loadRecentNews,
    loadMonitoredItems,
    toggleMonitor,
    removeMonitored,
    triggerCheckUpdatesNow,
    openDossierFromMonitor
  } = useAppStore()

  // Comportamento do Header Fixo & Retrátil
  const [isHeaderPinned, setIsHeaderPinned] = useState<boolean>(true)
  const [isHeaderHovered, setIsHeaderHovered] = useState<boolean>(false)

  useEffect(() => {
    // Inicialização da aplicação: carrega acompanhamentos e feed de notícias da página inicial
    loadMonitoredItems()
    loadRecentNews()
  }, [])

  // Visibilidade do Header: visível se fixado ou se o cursor estiver sobre a barra/sensor
  const isHeaderVisible = isHeaderPinned || isHeaderHovered

  return (
    <div className="bg-[#121112] font-body-md text-[#FFFCF2] min-h-screen selection:bg-[#607466]/40 selection:text-[#FFFCF2]">
      {/* Sensor Superior de Revelação por Hover quando desafixado */}
      {!isHeaderVisible && (
        <div
          onMouseEnter={() => setIsHeaderHovered(true)}
          className="fixed top-0 left-0 right-0 h-3.5 z-40 bg-gradient-to-b from-[#748B7B]/20 via-[#607466]/10 to-transparent cursor-pointer"
          title="Passe o cursor aqui para revelar a barra de navegação"
        />
      )}

      {/* Botão Discreto Superior Esquerdo para Reabrir/Fixar a Barra com 1 Clique */}
      {!isHeaderVisible && (
        <button
          type="button"
          onClick={() => {
            setIsHeaderPinned(true)
            setIsHeaderHovered(false)
          }}
          className="fixed top-0 left-4 sm:left-6 z-50 px-3 py-1 bg-[#1B1A1B]/95 hover:bg-[#262527] border-b border-x border-[#E5D5B3]/25 rounded-b-lg text-xs font-label-sm text-[#E5D5B3] hover:text-[#FFFCF2] flex items-center gap-2 shadow-2xl transition-all cursor-pointer group backdrop-blur-md"
          title="Clique para fixar a barra de navegação no topo"
        >
          <div className="w-2 h-2 rounded-full bg-[#748B7B] ring-2 ring-[#607466]/40 group-hover:scale-110 transition-transform" />
          <span className="font-display font-medium text-xs text-[#FFFCF2]">InfoConcursos</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#748B7B] group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* Header Fixo no Topo Absoluto (Fixed Top-0) */}
      <header
        onMouseEnter={() => {
          if (!isHeaderPinned) setIsHeaderHovered(true)
        }}
        onMouseLeave={() => {
          if (!isHeaderPinned) setIsHeaderHovered(false)
        }}
        className={`fixed top-0 left-0 right-0 z-50 w-full h-14 bg-[#1B1A1B]/95 backdrop-blur-xl border-b border-[#E5D5B3]/15 transition-transform duration-300 shadow-md ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-full flex items-center justify-between">
          {/* Lado Esquerdo: Identidade Editorial no Canto Superior Esquerdo + Abas de Navegação */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div
              onClick={() => setActiveTab('NOTICIAS')}
              className="flex items-center gap-2 cursor-pointer select-none group"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#748B7B] ring-2 ring-[#607466]/40 group-hover:scale-110 transition-transform" />
              <span className="font-display text-lg tracking-tight text-[#FFFCF2] font-normal">
                <span className="text-[#748B7B] font-semibold">Info</span>Concursos
              </span>
              <span className="hidden md:inline-block px-1.5 py-0.5 border border-[#E5D5B3]/25 rounded text-[10px] font-label-sm uppercase tracking-widest text-[#E5D5B3]/85 bg-[#171617]">
                Editorial
              </span>
            </div>

            {/* Navegação em Pílulas */}
            <nav className="flex items-center gap-1 sm:gap-1.5" aria-label="Navegação principal">
              <button
                type="button"
                onClick={() => setActiveTab('NOTICIAS')}
                className={
                  activeTab === 'NOTICIAS'
                    ? 'px-3 py-1 rounded-md font-label-sm text-xs bg-[#607466]/25 border border-[#607466]/50 text-[#FFFCF2] shadow-inner transition-all cursor-pointer font-medium'
                    : 'px-3 py-1 rounded-md font-label-sm text-xs text-[#BDBAB5] hover:text-[#FFFCF2] hover:bg-[#262527] transition-all cursor-pointer'
                }
              >
                Feed de Notícias
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('DESCOBERTA')}
                className={
                  activeTab === 'DESCOBERTA'
                    ? 'px-3 py-1 rounded-md font-label-sm text-xs bg-[#607466]/25 border border-[#607466]/50 text-[#FFFCF2] shadow-inner transition-all cursor-pointer font-medium'
                    : 'px-3 py-1 rounded-md font-label-sm text-xs text-[#BDBAB5] hover:text-[#FFFCF2] hover:bg-[#262527] transition-all cursor-pointer'
                }
              >
                Busca &amp; Dossiês
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ACOMPANHAMENTOS')}
                className={
                  activeTab === 'ACOMPANHAMENTOS'
                    ? 'px-3 py-1 rounded-md font-label-sm text-xs bg-[#607466]/25 border border-[#607466]/50 text-[#FFFCF2] shadow-inner transition-all flex items-center gap-1.5 cursor-pointer font-medium'
                    : 'px-3 py-1 rounded-md font-label-sm text-xs text-[#BDBAB5] hover:text-[#FFFCF2] hover:bg-[#262527] transition-all flex items-center gap-1.5 cursor-pointer'
                }
              >
                <span>Acompanhamentos</span>
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 bg-[#243028] text-[#E5D5B3] text-[10px] font-semibold rounded-full border border-[#748B7B]/40">
                  {monitoredItems.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Lado Direito: Fixar/Desafixar, Retração e Engrenagem de Configurações */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Botão de Fixar / Desafixar */}
            <button
              type="button"
              onClick={() => {
                const nextPinned = !isHeaderPinned
                setIsHeaderPinned(nextPinned)
                if (!nextPinned) {
                  setIsHeaderHovered(false)
                }
              }}
              title={
                isHeaderPinned
                  ? 'Barra Fixada no topo • Clique para alternar para modo retrátil'
                  : 'Barra Retrátil • Clique para manter fixada no topo'
              }
              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs font-label-sm ${
                isHeaderPinned
                  ? 'bg-[#243028] text-[#748B7B] border-[#607466]/40 hover:bg-[#2e3e34]'
                  : 'bg-[#171617] text-[#BDBAB5] border-[#E5D5B3]/15 hover:text-[#FFFCF2] hover:bg-[#262527]'
              }`}
            >
              {isHeaderPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
              <span className="hidden xl:inline text-[11px]">
                {isHeaderPinned ? 'Fixada' : 'Retrátil'}
              </span>
            </button>

            {/* Botão Discreto de Recolher quando fixado */}
            {isHeaderPinned && (
              <button
                type="button"
                onClick={() => {
                  setIsHeaderPinned(false)
                  setIsHeaderHovered(false)
                }}
                title="Recolher barra para modo retrátil (revela por hover ou botão discreto)"
                className="p-1.5 rounded-lg bg-[#171617] hover:bg-[#262527] border border-[#E5D5B3]/15 text-[#BDBAB5] hover:text-[#FFFCF2] transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}

            {/* Botão de Configurações (Engrenagem) */}
            <button
              type="button"
              onClick={() => setActiveTab('CONFIGURACOES')}
              title="Configurações & Diretório Oficial de Fontes"
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                activeTab === 'CONFIGURACOES'
                  ? 'bg-[#607466] text-[#FFFCF2] border-[#748B7B]'
                  : 'bg-[#171617] hover:bg-[#262527] border border-[#E5D5B3]/15 text-[#BDBAB5] hover:text-[#FFFCF2]'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal com Layout Expandido Edge-to-Edge */}
      <main
        className={`w-full min-h-screen bg-[#121112] transition-all ${
          isHeaderVisible ? 'pt-16' : 'pt-5'
        }`}
      >
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 pb-16">
          {/* Toast Semântico de Confirmação */}
          {lastUpdateMessage && (
            <div className="pt-2 pb-2">
              <div className="rounded-xl bg-[#1B1A1B] border border-[#607466]/50 px-4 py-2.5 font-label-md text-xs text-[#FFFCF2] flex items-center gap-2 shadow-md">
                <CheckCircle2 className="w-4 h-4 text-[#748B7B] shrink-0" />
                <span>{lastUpdateMessage}</span>
              </div>
            </div>
          )}

          {/* 1. PÁGINA INICIAL: FEED DE NOTÍCIAS */}
          {activeTab === 'NOTICIAS' && (
            <NewsPage
              news={news}
              isLoading={isLoadingNews}
              newsAtualizadoEm={newsAtualizadoEm}
              newsFromCache={newsFromCache}
              onRefreshNews={loadRecentNews}
              onGenerateDossierFromNews={(orgao) => {
                // Tenta encontrar dossiê correspondente nos resultados ou executa busca
                const match = dossiers.find((d) => d.orgao.toLowerCase().includes(orgao.toLowerCase()))
                if (match) {
                  openDossierPage(match)
                } else {
                  executeSearch({
                    termoLivre: orgao,
                    area: 'TODOS',
                    uf: 'TODOS',
                    statusFiltro: 'TODOS'
                  })
                }
              }}
            />
          )}

          {/* 2. PÁGINA DE BUSCA & DOSSIÊS (Inicia limpa e lista itens compactos escaneáveis) */}
          {activeTab === 'DESCOBERTA' && (
            <div className="space-y-6 py-4">
              <SearchBar
                filter={filter}
                isLoading={isLoadingSearch}
                searchAtualizadoEm={searchAtualizadoEm}
                searchFromCache={searchFromCache}
                onUpdateFilter={setFilter}
                onSubmitSearch={executeSearch}
              />

              {isLoadingSearch ? (
                <div className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-16 text-center space-y-4 animate-pulse">
                  <div className="w-8 h-8 border-2 border-[#607466] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-display text-xl text-[#FFFCF2] mx-auto">
                    Consultando movimentações oficiais (2025/2026) e estruturando dossiês analíticos...
                  </p>
                </div>
              ) : dossiers.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5D5B3]/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#607466]" />
                      <h3 className="font-display text-xl text-[#FFFCF2]">
                        Dossiês Encontrados ({dossiers.length})
                      </h3>
                    </div>
                    <span className="font-label-sm text-xs text-[#E5D5B3] uppercase tracking-wider">
                      Selecione um certame para ler o dossiê analítico na íntegra
                    </span>
                  </div>

                  {/* Lista Linear Resumida sem Accordion Explodido */}
                  <div className="w-full bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl divide-y divide-[#E5D5B3]/15 shadow-sm overflow-hidden">
                    {dossiers.map((dossier) => {
                      const isMonitored = monitoredItems.some((m) => m.concursoId === dossier.id)
                      return (
                        <DossierSummaryCard
                          key={dossier.id}
                          dossier={dossier}
                          isMonitored={isMonitored}
                          onToggleMonitor={toggleMonitor}
                          onOpenDossier={openDossierPage}
                        />
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Estado Inicial Limpo da Busca (Sem filtros pré-carregados) */
                <div className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-12 text-center space-y-5 shadow-sm">
                  <div className="w-11 h-11 rounded-full bg-[#243028] border border-[#607466]/40 flex items-center justify-center mx-auto text-[#748B7B]">
                    <Search className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 max-w-lg mx-auto">
                    <Heading level={3} className="justify-center">
                      Diretório de Consulta &amp; Dossiês de Estudo
                    </Heading>
                    <Text variant="secondary">
                      Pesquise pelo nome da instituição na barra superior ou selecione um dos cadernos de carreira para abrir o dossiê executivo com banca, remuneração, disciplinas nucleares e fontes primárias.
                    </Text>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <span className="font-label-sm text-xs text-[#E5D5B3] uppercase tracking-wider flex items-center gap-1 mr-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#748B7B]" />
                      Consultas rápidas:
                    </span>
                    {SUGESTOES_RAPIDAS.slice(0, 5).map((sugestao) => (
                      <Button
                        key={sugestao}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          executeSearch({
                            termoLivre: sugestao,
                            area: 'TODOS',
                            uf: 'TODOS',
                            statusFiltro: 'TODOS'
                          })
                        }
                      >
                        {sugestao}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. PÁGINA DE ACOMPANHAMENTOS */}
          {activeTab === 'ACOMPANHAMENTOS' && (
            <MonitoringPage
              items={monitoredItems}
              isChecking={isCheckingUpdates}
              onCheckUpdatesNow={triggerCheckUpdatesNow}
              onOpenDossier={openDossierFromMonitor}
              onRemoveMonitored={removeMonitored}
            />
          )}

          {/* 4. PÁGINA DINÂMICA DE LEITURA DO DOSSIÊ */}
          {activeTab === 'DOSSIE' && (
            <DossierPage
              dossier={activeDossier}
              isMonitored={activeDossier ? monitoredItems.some((m) => m.concursoId === activeDossier.id) : false}
              onBack={goBackFromDossier}
              onToggleMonitor={toggleMonitor}
            />
          )}

          {/* 5. PÁGINA DE CONFIGURAÇÕES & FONTES OFICIAIS */}
          {activeTab === 'CONFIGURACOES' && <SettingsPage />}
        </div>
      </main>
    </div>
  )
}

export default App
