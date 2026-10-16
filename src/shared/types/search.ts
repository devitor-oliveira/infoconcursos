import { ConcursoArea, ConcursoDossier, ConcursoStatus, EscolaridadeNivel } from './concurso'

export interface SearchFilter {
  termoLivre?: string
  area?: ConcursoArea
  uf?: string
  statusFiltro?: 'TODOS' | 'PREVISTOS_AUTORIZADOS' | 'ABERTOS'
  escolaridade?: 'TODOS' | EscolaridadeNivel
}

export interface RawSearchResult {
  title: string
  url: string
  snippet: string
  sourceDomain: string
  publishedAt?: string
}

export interface SanitizedQueryResult {
  internalQuery: string
  bancasDorkQuery?: string
  portaisDorkQuery?: string
  appliedYearAnchors: number[]
  excludedObsoleteTerms: string[]
  targetContext: 'SPECIFIC_CONCURSO' | 'BROAD_DISCOVERY'
}

export interface SearchExecutionOptions {
  forceRefresh?: boolean
}

export interface SearchResultEnvelope {
  data: ConcursoDossier[]
  atualizadoEm: string
  fromCache: boolean
  totalResultados: number
  fontesConsultadas?: string[]
  errosFontes?: { fonte: string; mensagem: string }[]
}

export type FilterStatusGroup = 'TODOS' | 'PREVISTOS_AUTORIZADOS' | 'ABERTOS'

export const STATUS_DISPLAY_MAP: Record<
  ConcursoStatus,
  {
    label: string
    colorClass: string
    badgeBg: string
    semanticTone: 'success' | 'warning' | 'accent' | 'neutral'
  }
> = {
  INSCRICOES_ABERTAS: {
    label: 'Inscrições Abertas',
    colorClass: 'text-[#FFFCF2]',
    badgeBg: 'bg-[#607466] border-[#748B7B]/50 text-[#FFFCF2]',
    semanticTone: 'success'
  },
  EDITAL_PUBLICADO: {
    label: 'Edital Publicado',
    colorClass: 'text-[#E5D5B3]',
    badgeBg: 'bg-[#243028] border-[#607466]/40 text-[#E5D5B3]',
    semanticTone: 'success'
  },
  BANCA_DEFINIDA: {
    label: 'Banca Definida • Edital Iminente',
    colorClass: 'text-[#E5D5B3]',
    badgeBg: 'bg-[#243028] border-[#607466]/35 text-[#E5D5B3]',
    semanticTone: 'accent'
  },
  AUTORIZADO: {
    label: 'Autorizado Oficialmente',
    colorClass: 'text-[#E5D5B3]',
    badgeBg: 'bg-[#243028] border-[#607466]/30 text-[#E5D5B3]',
    semanticTone: 'warning'
  },
  COMISSAO_FORMADA: {
    label: 'Comissão Formada',
    colorClass: 'text-[#748B7B]',
    badgeBg: 'bg-[#243028] border-[#607466]/30 text-[#748B7B]',
    semanticTone: 'accent'
  },
  BANCA_EM_DEFINICAO: {
    label: 'Banca em Contratação',
    colorClass: 'text-[#E5D5B3]',
    badgeBg: 'bg-[#171617] border-[#E5D5B3]/20 text-[#E5D5B3]',
    semanticTone: 'warning'
  },
  PREVISTO: {
    label: 'Previsto • Em Dimensionamento',
    colorClass: 'text-[#BDBAB5]',
    badgeBg: 'bg-[#171617] border-[#E5D5B3]/15 text-[#BDBAB5]',
    semanticTone: 'neutral'
  },
  EM_ANDAMENTO: {
    label: 'Em Andamento',
    colorClass: 'text-[#BDBAB5]',
    badgeBg: 'bg-[#171617] border-[#E5D5B3]/15 text-[#BDBAB5]',
    semanticTone: 'neutral'
  },
  DESCONHECIDO: {
    label: 'Status a Definir',
    colorClass: 'text-[#BDBAB5]',
    badgeBg: 'bg-[#171617] border-[#E5D5B3]/15 text-[#BDBAB5]',
    semanticTone: 'neutral'
  }
}
