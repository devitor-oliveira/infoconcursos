import { SearchFilter, SanitizedQueryResult } from '../../../shared/types/search'
import { ConcursoArea } from '../../../shared/types/concurso'

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

const BANCA_DOMAINS = [
  'fundep.selecao.net.br',
  'gestaodeconcursos.com.br',
  'novo.ibgpconcursos.com.br',
  'ibgpconcursos.com.br',
  'concurso.fundacaocefetminas.org.br',
  'fundacaocefetminas.org.br',
  'institutoconsulplan.org.br',
  'fumarc.com.br',
  'ibfc.selecao.net.br',
  'ibfc.org.br',
  'concursos.access.org.br',
  'access.org.br',
  'portal.concursos.idecan.org.br',
  'idecan.org.br',
  'portal.ibade.selecao.site',
  'ibade.org.br',
  'conhecimento.fgv.br',
  'cebraspe.org.br',
  'concursosfcc.com.br',
  'cesgranrio.org.br',
  'vunesp.com.br',
  'selecon.org.br',
  'selecon.selecao.net.br',
  'fundatec.org.br',
  'iades.com.br',
  'jcmconcursos.com.br',
  'ibamconcursos.org.br'
]

const PORTAL_DOMAINS = [
  'pciconcursos.com.br',
  'acheconcursos.com.br',
  'concursosnobrasil.com',
  'folha.qconcursos.com',
  'estrategiaconcursos.com.br',
  'blog.grancursosonline.com.br'
]

/**
 * Constrói silenciosamente a consulta otimizada com âncoras temporais (2025/2026)
 * e bloqueio de editais retroativos/encerrados, sem jamais expor sintaxe técnica na UI.
 */
export function buildSanitizedSearchQuery(
  filter: SearchFilter,
  referenceYear: number = new Date().getFullYear()
): SanitizedQueryResult {
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

  // Constrói Dork especializada para as 19 Bancas Organizadoras e órgãos oficiais
  const bancaSiteClauses = BANCA_DOMAINS.map((d) => `site:${d}`).join(' OR ')
  const baseTerm = isSpecific ? `"${cleanTerm}"` : filter.area && filter.area !== 'TODOS' ? filter.area : 'concurso'
  const bancasDorkQuery = `(${baseTerm}) ("edital" OR "inscrições" OR "concurso") (${bancaSiteClauses} OR site:gov.br OR site:jus.br) (${currentYear} OR ${previousYear})`

  // Constrói Dork especializada para os 6 Portais de Monitoramento
  const portalSiteClauses = PORTAL_DOMAINS.map((d) => `site:${d}`).join(' OR ')
  const portaisDorkQuery = `concurso (${baseTerm}) ("edital" OR "autorizado" OR "comissão" OR "banca" OR "vagas") (${portalSiteClauses}) (${currentYear} OR ${previousYear})`

  return {
    internalQuery: parts.join(' '),
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
