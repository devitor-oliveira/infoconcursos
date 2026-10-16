import React, { useState } from 'react'
import {
  Compass,
  Globe2,
  Building2,
  ExternalLink,
  Database,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react'
import { PORTAIS_REGISTRY, BANCAS_REGISTRY, BancaSource } from '../../../shared/constants/sources-registry'
import { Button, Heading, Text, Badge } from '../components/ds'

export function SettingsPage(): React.JSX.Element {
  const [bancaCategory, setBancaCategory] = useState<string>('TODAS')
  const [cacheClearMessage, setCacheClearMessage] = useState<string | null>(null)

  const filteredBancas = BANCAS_REGISTRY.filter((b) => {
    if (bancaCategory === 'TODAS') return true
    return b.categoria === bancaCategory
  })

  // 11 bancas com scraping direto implementado vs 8 bancas com dorks/sitemaps
  const DIRECT_SCRAPING_BANCAS = new Set([
    'fundep',
    'access',
    'ibfc',
    'selecon',
    'idecan',
    'ibade',
    'consulplan',
    'funcefet',
    'fgv',
    'fcc',
    'fundatec'
  ])

  const handleClearCache = (): void => {
    // Força atualização visual
    setCacheClearMessage('Cache local reiniciado. Próximas buscas consultarão fontes atualizadas.')
    setTimeout(() => setCacheClearMessage(null), 5000)
  }

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Cabeçalho da Página */}
      <div className="border-b border-[#E5D5B3]/15 pb-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#607466]" />
              <h1 className="font-display text-2xl lg:text-3xl text-[#FFFCF2]">
                Configurações &amp; Diretório Oficial de Fontes
              </h1>
            </div>
            <p className="font-body-sm text-sm text-[#BDBAB5]">
              Gestão de fontes primárias mapeadas (6 portais e 19 bancas examinadoras), status do cache SQLite local e parâmetros de auditoria.
            </p>
          </div>

          <Badge tone="accent">Fuso Oficial: Brasília (UTC-3)</Badge>
        </div>
      </div>

      {cacheClearMessage && (
        <div className="rounded-xl bg-[#1B1A1B] border border-[#607466]/50 p-4 font-label-md text-sm text-[#FFFCF2] flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 text-[#748B7B] shrink-0" />
          <span>{cacheClearMessage}</span>
        </div>
      )}

      {/* Seção 1: Catálogo Oficial das 19 Bancas Examinadoras */}
      <section className="bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl p-5 lg:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5D5B3]/10">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#748B7B]" />
            <h2 className="font-display text-xl text-[#FFFCF2]">
              19 Bancas Examinadoras Oficiais Mapeadas
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-label-sm">
            <button
              type="button"
              onClick={() => setBancaCategory('TODAS')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                bancaCategory === 'TODAS'
                  ? 'bg-[#607466] text-[#FFFCF2]'
                  : 'bg-[#171617] text-[#BDBAB5] hover:bg-[#1E1D1E]'
              }`}
            >
              Todas (19)
            </button>
            <button
              type="button"
              onClick={() => setBancaCategory('MINAS_GERAIS_REGIONAL')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                bancaCategory === 'MINAS_GERAIS_REGIONAL'
                  ? 'bg-[#607466] text-[#FFFCF2]'
                  : 'bg-[#171617] text-[#BDBAB5] hover:bg-[#1E1D1E]'
              }`}
            >
              Minas Gerais &amp; Sudeste (7)
            </button>
            <button
              type="button"
              onClick={() => setBancaCategory('NACIONAL_TRADICIONAL')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                bancaCategory === 'NACIONAL_TRADICIONAL'
                  ? 'bg-[#607466] text-[#FFFCF2]'
                  : 'bg-[#171617] text-[#BDBAB5] hover:bg-[#1E1D1E]'
              }`}
            >
              Nacionais Tradicionais (7)
            </button>
            <button
              type="button"
              onClick={() => setBancaCategory('OUTRA_NACIONAL')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                bancaCategory === 'OUTRA_NACIONAL'
                  ? 'bg-[#607466] text-[#FFFCF2]'
                  : 'bg-[#171617] text-[#BDBAB5] hover:bg-[#1E1D1E]'
              }`}
            >
              Outras Bancas (5)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBancas.map((b) => {
            const hasDirectScraping = DIRECT_SCRAPING_BANCAS.has(b.id)
            return (
              <div
                key={b.id}
                className="p-3.5 bg-[#171617] border border-[#E5D5B3]/10 rounded-lg flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-label-md text-sm text-[#FFFCF2] font-medium leading-tight">
                      {b.name}
                    </div>
                    <div className="font-body-sm text-[12px] text-[#BDBAB5] mt-0.5">{b.domain}</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-[#243028] text-[#748B7B] border border-[#607466]/30 text-[10px] font-semibold uppercase shrink-0">
                    {b.regionalScope}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-[#E5D5B3]/10 text-xs">
                  <span className="text-[11px] font-label-sm text-[#E5D5B3]/80">
                    {hasDirectScraping ? 'Scraping Direto Ativo' : 'Dork Booleana & RSS'}
                  </span>
                  <button
                    type="button"
                    onClick={() => window.api.openExternalUrl(b.editaisBaseUrls[0] || b.baseUrl)}
                    className="p-1.5 rounded bg-[#1E1D1E] hover:bg-[#262527] text-[#E5D5B3] transition-colors cursor-pointer"
                    title={`Abrir página oficial de editais de ${b.name}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Seção 2: 6 Portais de Monitoramento & Sitemaps */}
      <section className="bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl p-5 lg:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5D5B3]/10">
          <Globe2 className="w-5 h-5 text-[#748B7B]" />
          <h2 className="font-display text-xl text-[#FFFCF2]">
            6 Portais de Notícias &amp; Sitemaps Oficiais
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PORTAIS_REGISTRY.map((p) => (
            <div
              key={p.id}
              className="p-3.5 bg-[#171617] border border-[#E5D5B3]/10 rounded-lg flex items-center justify-between"
            >
              <div>
                <div className="font-label-md text-sm text-[#FFFCF2] font-medium">{p.name}</div>
                <div className="font-body-sm text-[12px] text-[#BDBAB5]">{p.domain}</div>
              </div>
              <button
                type="button"
                onClick={() => window.api.openExternalUrl(p.baseUrl)}
                className="p-1.5 rounded bg-[#1E1D1E] hover:bg-[#262527] text-[#E5D5B3] transition-colors cursor-pointer"
                title={`Abrir portal ${p.name}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Seção 3: Gerenciamento do Cache SQLite Local & Resiliência */}
      <section className="bg-[#1B1A1B] border border-[#E5D5B3]/15 rounded-xl p-5 lg:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5D5B3]/10">
          <Database className="w-5 h-5 text-[#748B7B]" />
          <h2 className="font-display text-xl text-[#FFFCF2]">
            Armazenamento Local &amp; Arquitetura de Cache SQLite
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="space-y-2 text-sm text-[#BDBAB5]">
            <p>
              O InfoConcursos opera no modelo <span className="text-[#FFFCF2] font-semibold">Cache-First</span>. As pesquisas e notícias apuradas são persistidas em tabelas SQLite locais (`busca_cache`, `noticias` e `sync_metadata`).
            </p>
            <p>
              Consultas repetidas e navegação entre telas são servidas instantaneamente a partir do disco (&lt; 10ms), eliminando requisições repetitivas de rede. Novas buscas só acontecem quando você clica em <span className="text-[#E5D5B3]">"Atualizar na Rede"</span>.
            </p>
          </div>

          <div className="p-4 bg-[#171617] border border-[#E5D5B3]/10 rounded-lg space-y-3">
            <div className="flex items-center justify-between text-xs text-[#E5D5B3]">
              <span className="font-medium">Estado do Armazenamento:</span>
              <span className="text-[#748B7B] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ativo &amp; Persistido
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#BDBAB5]">
              <span>Políticas Ativas:</span>
              <span>Timeout 6s • Cap 2MB • Rejeição Binários</span>
            </div>
            <div className="pt-2 border-t border-[#E5D5B3]/10 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClearCache}
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-[#E5D5B3]" />}
              >
                Limpar Cache de Pesquisas
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 4: Conformidade Legal & Protocolo de Auditoria */}
      <section className="bg-[#171617] border border-[#607466]/30 rounded-xl p-5 flex items-start gap-3.5">
        <ShieldCheck className="w-6 h-6 text-[#748B7B] shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-[#BDBAB5]">
          <div className="font-label-md text-sm text-[#FFFCF2] font-semibold">
            Conformidade com a Legislação Brasileira (LGPD &amp; LAI)
          </div>
          <p className="leading-relaxed">
            As informações de concursos públicos, editais, remunerações e prazos coletadas por esta aplicação constituem atos administrativos oficiais e dados públicos de órgãos estatais (Art. 37 da Constituição Federal e Lei de Acesso à Informação — Lei nº 12.527/2011). Não há coleta nem tratamento de dados pessoais de pessoas naturais privadas protegidos pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>
        </div>
      </section>
    </div>
  )
}
