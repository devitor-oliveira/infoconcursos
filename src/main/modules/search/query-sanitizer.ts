import { SearchFilter, SanitizedQueryResult } from '../../../shared/types/search'
import { ConcursoArea } from '../../../shared/types/concurso'
import { validateAndSanitizeSearchFilter } from '../../../shared/utils/anonymizer'
import { findBancaByQueryOrName } from './url-resolver'

/** Limite técnico seguro abaixo do teto de 500 caracteres do DuckDuckGo HTML/Lite */
const MAX_DDG_QUERY_LENGTH = 480

const AREA_KEYWORDS_MAP: Record<ConcursoArea, string[]> = {
  TODOS: ['concurso público', 'edital', 'previsto', 'autorizado'],
  BANCARIA: ['concurso bancário', 'Banco do Brasil', 'Caixa', 'BNDES', 'BACEN', 'escriturário'],
  TRIBUNAIS: ['concurso tribunal', 'TRT', 'TRE', 'TRF', 'TJ', 'MPU', 'técnico judiciário', 'analista judiciário'],
  POLICIAL: ['concurso policial', 'Polícia Federal', 'PRF', 'Polícia Civil', 'Polícia Militar', 'Polícia Penal'],
  FISCAL_CONTROLE: ['concurso fiscal', 'SEFAZ', 'Receita Federal', 'ISS', 'TCU', 'TCE', 'CGU', 'auditor fiscal'],
  ADMINISTRATIVA: ['concurso administrativo', 'INSS', 'IBGE', 'ministério', 'autarquia', 'analista administrativo'],
  TI: ['concurso TI', 'analista de tecnologia da informação', 'SERPRO', 'Dataprev', 'desenvolvimento de sistemas'],
  EDUCACAO: ['concurso educação', 'professor', 'instituto federal', 'secretaria de educação'],
  SAUDE: ['concurso saúde', 'EBSERH', 'ANVISA', 'enfermeiro', 'médico', 'secretaria de saúde']
}

const OBSOLETE_EXCLUSION_TERMS = [
  '-"resultado final 2021"',
  '-"edital 2021"',
  '-"gabarito 2021"',
  '-"concurso 2021"',
  '-"edital 2022"',
  '-"resultado final 2022"',
  '-"homologado em 2022"',
  '-"homologado em 2023"'
]

const OBSOLETE_YEAR_PATTERNS = [
  /\bconcurso\s+(?:de\s+)?(2018|2019|2020|2021|2022|2023)\b/i,
  /\bedital\s+(?:n[º°]?\s*\d+\/)?(2018|2019|2020|2021|2022|2023)\b/i,
  /\bresultado\s+final\s+(2018|2019|2020|2021|2022|2023|2024)\b/i,
  /\bgabarito\s+oficial\s+(2018|2019|2020|2021|2022|2023)\b/i
]

/**
 * Seleciona até 5 domínios prioritários para o operador booleano site:
 * respeitando o limite sintático de agrupamento OR do motor DuckDuckGo/Bing.
 */
function selectContextualBancaDomains(cleanTerm: string, area?: ConcursoArea, uf?: string): string[] {
  const matchedBanca = findBancaByQueryOrName(cleanTerm)
  if (matchedBanca) {
    return Array.from(new Set([matchedBanca.domain, 'gov.br', 'jus.br'])).slice(0, 5)
  }

  if (uf === 'MG' || /\b(mg|minas\s+gerais|bh|belo\s+horizonte)\b/i.test(cleanTerm)) {
    return [
      'gestaodeconcursos.com.br',
      'fumarc.com.br',
      'ibgpconcursos.com.br',
      'mg.gov.br',
      'jus.br'
    ]
  }

  if (area === 'TRIBUNAIS') {
    return [
      'jus.br',
      'conhecimento.fgv.br',
      'cebraspe.org.br',
      'concursosfcc.com.br',
      'vunesp.com.br'
    ]
  }

  if (area === 'BANCARIA') {
    return [
      'cesgranrio.org.br',
      'cebraspe.org.br',
      'concursosfcc.com.br',
      'gov.br'
    ]
  }

  return [
    'gov.br',
    'jus.br',
    'cebraspe.org.br',
    'conhecimento.fgv.br',
    'concursosfcc.com.br'
  ]
}

const CORE_PORTAL_DOMAINS = [
  'pciconcursos.com.br',
  'acheconcursos.com.br',
  'concursosnobrasil.com',
  'folha.qconcursos.com'
]

/**
 * Constrói silenciosamente a consulta otimizada com âncoras temporais (2025/2026),
 * validação de filtros, anonimização de dados pessoais (LGPD) e bloqueio de editais retroativos.
 */
export function buildSanitizedSearchQuery(
  rawFilter: SearchFilter,
  referenceYear: number = new Date().getFullYear()
): SanitizedQueryResult {
  const { sanitizedFilter: filter } = validateAndSanitizeSearchFilter(rawFilter)
  const currentYear = referenceYear >= 2025 ? referenceYear : 2026
  const previousYear = currentYear - 1
  const appliedYearAnchors = [currentYear, previousYear]

  const cleanTerm = (filter.termoLivre || '').trim()
  const isSpecific = cleanTerm.length >= 2

  const parts: string[] = []

  if (isSpecific) {
    parts.push(`concurso "${cleanTerm}"`)
  } else if (filter.area && filter.area !== 'TODOS') {
    const areaKeywords = AREA_KEYWORDS_MAP[filter.area]
    parts.push(`(${areaKeywords.slice(0, 3).join(' OR ')})`)
  } else {
    parts.push('concurso público')
  }

  if (filter.uf && filter.uf !== 'TODOS' && filter.uf !== 'BR') {
    parts.push(filter.uf)
  } else if (filter.uf === 'BR') {
    parts.push('nacional federal')
  }

  if (filter.statusFiltro === 'ABERTOS') {
    parts.push('("edital publicado" OR "inscrições abertas" OR "edital aberto")')
  } else if (filter.statusFiltro === 'PREVISTOS_AUTORIZADOS') {
    parts.push('("previsto" OR "autorizado" OR "comissão formada" OR "banca" OR "novo concurso")')
  } else {
    parts.push('("previsto" OR "autorizado" OR "comissão" OR "edital" OR "situação atual")')
  }

  parts.push(`(${currentYear} OR ${previousYear})`)
  parts.push(...OBSOLETE_EXCLUSION_TERMS.slice(0, 4))

  // Constrói Dork enxuta (máx 5 cláusulas site: e < 480 chars) para Bancas e Diários Oficiais
  const selectedBancaDomains = selectContextualBancaDomains(cleanTerm, filter.area, filter.uf)
  const bancaSiteClauses = selectedBancaDomains.map((d) => `site:${d}`).join(' OR ')
  const baseTerm = isSpecific
    ? `"${cleanTerm}"`
    : filter.area && filter.area !== 'TODOS'
      ? AREA_KEYWORDS_MAP[filter.area][0]
      : 'concurso público'
  const bancasDorkQuery = `concurso ${baseTerm} ("edital" OR "inscrições" OR "autorizado") (${bancaSiteClauses}) (${currentYear} OR ${previousYear})`.slice(
    0,
    MAX_DDG_QUERY_LENGTH
  )

  // Constrói Dork enxuta (4 portais primários) para cobertura especializada
  const portalSiteClauses = CORE_PORTAL_DOMAINS.map((d) => `site:${d}`).join(' OR ')
  const portaisDorkQuery = `concurso ${baseTerm} ("edital" OR "autorizado" OR "comissão" OR "vagas") (${portalSiteClauses}) (${currentYear} OR ${previousYear})`.slice(
    0,
    MAX_DDG_QUERY_LENGTH
  )

  return {
    internalQuery: parts.join(' ').slice(0, MAX_DDG_QUERY_LENGTH),
    bancasDorkQuery,
    portaisDorkQuery,
    appliedYearAnchors,
    excludedObsoleteTerms: [...OBSOLETE_EXCLUSION_TERMS],
    targetContext: isSpecific ? 'SPECIFIC_CONCURSO' : 'BROAD_DISCOVERY'
  }
}

/**
 * Verifica se uma notícia/resultado é atual e descarta conteúdos retroativos (ex: concursos de 2021/2022/2023).
 */
export function isResultCurrent(
  title: string,
  snippet: string,
  publishedAt?: string,
  referenceYear: number = new Date().getFullYear()
): boolean {
  const currentYear = referenceYear >= 2025 ? referenceYear : 2026
  const combined = `${title} ${snippet}`.toLowerCase()

  // Se o texto menciona explicitamente o ano atual ou imediatamente anterior, é relevante
  const mentionsRecentYear =
    combined.includes(String(currentYear)) ||
    combined.includes(String(currentYear - 1)) ||
    combined.includes('novo concurso') ||
    combined.includes('previsto') ||
    combined.includes('comissão') ||
    combined.includes('autorizado')

  // Se bate em padrão explícito de concurso antigo sem mencionar novo concurso atual
  for (const pattern of OBSOLETE_YEAR_PATTERNS) {
    if (pattern.test(combined) && !combined.includes(String(currentYear))) {
      return false
    }
  }

  // Se o título fala exclusivamente de 2021, 2022 ou 2023 sem referência ao ano atual
  if (
    /\b(2020|2021|2022|2023)\b/.test(title) &&
    !title.includes(String(currentYear)) &&
    !title.includes(String(currentYear - 1))
  ) {
    return false
  }

  if (publishedAt) {
    const parsedYearMatch = publishedAt.match(/\b(20\d{2})\b/)
    if (parsedYearMatch) {
      const pubYear = Number(parsedYearMatch[1])
      if (pubYear < currentYear - 1) {
        return false
      }
    }
  }

  return mentionsRecentYear || !/\b(2019|2020|2021|2022|2023)\b/.test(combined)
}
