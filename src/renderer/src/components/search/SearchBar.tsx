import React from 'react'
import { Search, Sparkles, MapPin, Filter, RotateCcw } from 'lucide-react'
import {
  AREAS_CONCURSO,
  ESTADOS_BRASIL,
  SUGESTOES_RAPIDAS
} from '../../../../shared/constants/areas'
import { SearchFilter } from '../../../../shared/types/search'
import { ConcursoArea } from '../../../../shared/types/concurso'
import { Button, TextInput, SelectInput, FilterChip } from '../ds'

interface SearchBarProps {
  filter: SearchFilter
  isLoading: boolean
  searchAtualizadoEm?: string | null
  searchFromCache?: boolean
  onUpdateFilter: (partial: Partial<SearchFilter>) => void
  onSubmitSearch: (customFilter?: SearchFilter, options?: { forceRefresh?: boolean }) => void
}

export function SearchBar({
  filter,
  isLoading,
  searchAtualizadoEm,
  searchFromCache,
  onUpdateFilter,
  onSubmitSearch
}: SearchBarProps): React.JSX.Element {
  const handleFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    onSubmitSearch(undefined, { forceRefresh: false })
  }

  const handleRefreshOnline = (): void => {
    onSubmitSearch(undefined, { forceRefresh: true })
  }

  const handleQuickSuggestion = (sugestao: string): void => {
    const nextFilter: SearchFilter = {
      ...filter,
      termoLivre: sugestao,
      area: 'TODOS',
      uf: 'TODOS'
    }
    onSubmitSearch(nextFilter)
  }

  const handleReset = (): void => {
    const cleanFilter: SearchFilter = {
      termoLivre: '',
      area: 'TODOS',
      uf: 'TODOS',
      statusFiltro: 'TODOS'
    }
    onSubmitSearch(cleanFilter)
  }

  return (
    <section className="rounded-xl border border-[#E5D5B3]/15 bg-[#1B1A1B] p-space-lg shadow-md space-y-space-md">
      {/* Cabeçalho Editorial da Busca */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-space-sm border-b border-[#E5D5B3]/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-[#607466]" />
          <h2 className="font-display text-subheading text-[#FFFCF2] font-medium">
            Diretório de Pesquisa & Dossiês Preparatórios
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {searchFromCache && (
            <span className="px-2 py-0.5 rounded bg-[#243028] border border-[#607466]/40 text-[#E5D5B3] text-label-sm font-label-sm">
              Base Local (Cache)
            </span>
          )}
          <span className="font-label-sm text-label-sm text-[#BDBAB5] uppercase tracking-widest">
            {searchAtualizadoEm
              ? `Atualizado: ${new Date(searchAtualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Apuração 2025/2026'}
          </span>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-3">
        {/* Nível 1: Barra Principal de Busca e Ações */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1">
            <TextInput
              type="text"
              value={filter.termoLivre || ''}
              onChange={(e) => onUpdateFilter({ termoLivre: e.target.value })}
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Pesquisar órgão ou certame (Ex: Banco do Brasil, TRT Minas Gerais, PF, INSS)..."
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              leftIcon={<Search className="w-4 h-4" />}
            >
              Consultar
            </Button>

            {searchFromCache && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                isLoading={isLoading}
                onClick={handleRefreshOnline}
                title="Forçar busca de novas informações online"
              >
                Atualizar na Rede
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleReset}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              title="Limpar filtros"
            >
              Redefinir
            </Button>
          </div>
        </div>

        {/* Nível 2: Filtros Estruturados (Grade Balanceada sem aperto) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 pt-1">
          {/* Seletor de Estado / Região */}
          <div className="lg:col-span-6">
            <SelectInput
              value={filter.uf || 'TODOS'}
              onChange={(e) => onUpdateFilter({ uf: e.target.value })}
              leftIcon={<MapPin className="w-4 h-4" />}
            >
              {ESTADOS_BRASIL.map((uf) => (
                <option
                  key={uf.sigla}
                  value={uf.sigla}
                  className="bg-[#121112] text-[#FFFCF2]"
                >
                  {uf.sigla === 'TODOS' ? 'Jurisdição: Nacional (Todas as UFs)' : `${uf.sigla} — ${uf.nome}`}
                </option>
              ))}
            </SelectInput>
          </div>

          {/* Seletor de Situação */}
          <div className="lg:col-span-6">
            <SelectInput
              value={filter.statusFiltro || 'TODOS'}
              onChange={(e) =>
                onUpdateFilter({ statusFiltro: e.target.value as SearchFilter['statusFiltro'] })
              }
              leftIcon={<Filter className="w-4 h-4" />}
            >
              <option value="TODOS" className="bg-[#121112]">
                Situação: Todos os Atos (Previstos e Abertos)
              </option>
              <option value="PREVISTOS_AUTORIZADOS" className="bg-[#121112]">
                Situação: Previstos / Autorizados
              </option>
              <option value="ABERTOS" className="bg-[#121112]">
                Situação: Inscrições Abertas / Edital Publicado
              </option>
            </SelectInput>
          </div>
        </div>

        {/* Nível 3: Sugestões Rápidas Diretas */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="font-label-sm text-label-sm text-[#E5D5B3] uppercase tracking-wider flex items-center gap-1 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-[#748B7B]" />
            Destaques:
          </span>
          {SUGESTOES_RAPIDAS.map((sugestao) => {
            const isSelected =
              (filter.termoLivre || '').toLowerCase() === sugestao.toLowerCase()
            return (
              <FilterChip
                key={sugestao}
                label={sugestao}
                active={isSelected}
                tone="beige"
                onClick={() => handleQuickSuggestion(sugestao)}
              />
            )
          })}
        </div>
      </form>

      {/* Minimalist Filter Bar por Carreira */}
      <div className="pt-space-sm border-t border-[#E5D5B3]/10 flex flex-wrap items-center gap-1.5">
        <span className="font-label-sm text-label-sm text-[#BDBAB5] uppercase tracking-wider mr-2">
          Cadernos por Carreira:
        </span>
        {AREAS_CONCURSO.map((areaItem) => {
          const active = (filter.area || 'TODOS') === areaItem.value
          return (
            <FilterChip
              key={areaItem.value}
              label={areaItem.label}
              title={areaItem.descricao}
              active={active}
              tone="teal"
              onClick={() => {
                const nextFilter: SearchFilter = {
                  ...filter,
                  area: areaItem.value as ConcursoArea,
                  termoLivre: areaItem.value === 'TODOS' ? filter.termoLivre : ''
                }
                onSubmitSearch(nextFilter)
              }}
            />
          )
        })}
      </div>
    </section>
  )
}
