import { ConcursoArea, ConcursoDossier } from '../types/concurso'
import { SearchFilter } from '../types/search'
import { NewsItem } from '../types/news'

export type AnonymizationContext =
  | 'SEARCH_INPUT'
  | 'SCRAPED_TEXT'
  | 'DATABASE_PERSISTENCE'
  | 'LOG_OUTPUT'

export type PiiType = 'CPF' | 'DOCUMENTO_REGISTRO' | 'EMAIL' | 'TELEFONE' | 'NOME_PESSOA_FISICA'

export interface PiiDetectionResult {
  hasPii: boolean
  detectedTypes: PiiType[]
}

export interface FilterValidationResult {
  isValid: boolean
  blockedPersonalData: boolean
  detectedPiiTypes: PiiType[]
  validationMessage: string | null
  sanitizedFilter: SearchFilter
}

const VALID_AREAS: Set<ConcursoArea> = new Set([
  'TODOS',
  'BANCARIA',
  'TRIBUNAIS',
  'POLICIAL',
  'FISCAL_CONTROLE',
  'ADMINISTRATIVA',
  'TI',
  'EDUCACAO',
  'SAUDE'
])

const VALID_UFS: Set<string> = new Set([
  'TODOS',
  'BR',
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO'
])

const VALID_STATUS_FILTERS: Set<NonNullable<SearchFilter['statusFiltro']>> = new Set([
  'TODOS',
  'PREVISTOS_AUTORIZADOS',
  'ABERTOS'
])

// Expressões regulares para detecção precisa de PII (sem falsos positivos em anos ou leis como 13.709/2018)
const CPF_FORMATTED_REGEX = /\b(?:\d{3}|\*{3})\.\d{3}\.\d{3}-(?:\d{2}|\*{2})\b/g
const CPF_RAW_ELEVEN_DIGITS_REGEX = /(?:^|\bcpf\s*[:.-]?\s*)(\d{11})\b/gi
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const PHONE_BR_REGEX = /(?:\+55\s*)?(?:\(\d{2}\)\s*|\b\d{2}\s+)9?\d{4}[-\s]\d{4}\b/g
const DOC_REGISTRATION_REGEX =
  /\b(?:rg|cpf|matr[ií]cula|inscri[cç][aã]o\s+do\s+candidato|n[º°]\s*de\s*inscri[cç][aã]o)\s*[:.-]?\s*[\d.-]{5,15}\b/gi

// Captura nomes próprios de pessoas físicas após marcadores explícitos de atos nominais
const NOMINAL_PERSON_MARKER_REGEX =
  /\b([Cc]andidat(?:o|a|o\(a\))(?:\s+(?:[Aa]provad(?:o|a|o\(a\))|[Cc]onvocad(?:o|a|o\(a\))|[Cc]lassificad(?:o|a|o\(a\))))?|[Ss]ervidor(?:a|\(a\))?(?:\s+(?:[Dd]esignad(?:o|a|o\(a\))|[Nn]omead(?:o|a|o\(a\))))?|[Nn]omeia\s+o(?:\(a\))?\s+servidor(?:a|\(a\))?|[Pp]ortaria\s+designa)\s*[:,-]\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+(?:da|de|do|dos|das|e|[A-ZÀ-Ÿ][a-zà-ÿ]+)){1,5})/g

/**
 * Detecta a presença de Dados Pessoais (PII) protegidos pela LGPD em uma string.
 */
export function detectPersonalData(text: string): PiiDetectionResult {
  if (!text || typeof text !== 'string') {
    return { hasPii: false, detectedTypes: [] }
  }

  const detected = new Set<PiiType>()

  if (
    CPF_FORMATTED_REGEX.test(text) ||
    CPF_RAW_ELEVEN_DIGITS_REGEX.test(text) ||
    /^\s*\d{11}\s*$/.test(text)
  ) {
    detected.add('CPF')
  }
  CPF_FORMATTED_REGEX.lastIndex = 0
  CPF_RAW_ELEVEN_DIGITS_REGEX.lastIndex = 0

  if (EMAIL_REGEX.test(text)) {
    detected.add('EMAIL')
  }
  EMAIL_REGEX.lastIndex = 0

  if (PHONE_BR_REGEX.test(text)) {
    detected.add('TELEFONE')
  }
  PHONE_BR_REGEX.lastIndex = 0

  if (DOC_REGISTRATION_REGEX.test(text)) {
    detected.add('DOCUMENTO_REGISTRO')
  }
  DOC_REGISTRATION_REGEX.lastIndex = 0

  if (NOMINAL_PERSON_MARKER_REGEX.test(text)) {
    detected.add('NOME_PESSOA_FISICA')
  }
  NOMINAL_PERSON_MARKER_REGEX.lastIndex = 0

  return {
    hasPii: detected.size > 0,
    detectedTypes: Array.from(detected)
  }
}

/**
 * Anonimiza textos de acordo com o contexto operacional do aplicativo.
 * Garante conformidade com o Princípio da Minimização (Art. 6º, III da LGPD).
 */
export function anonymizeText(
  input: string | null | undefined,
  context: AnonymizationContext = 'SCRAPED_TEXT'
): string {
  if (!input || typeof input !== 'string') return ''

  let output = input

  // Remove tags HTML / scripts residuais em qualquer contexto
  output = output.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
  output = output.replace(/<[^>]+>/g, ' ')
  // Remove caracteres de controle invisíveis
  output = output.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

  if (context === 'SEARCH_INPUT') {
    // Em inputs de busca, remove integralmente qualquer dado pessoal e metacaracteres perigosos
    output = output.replace(CPF_FORMATTED_REGEX, '')
    output = output.replace(/^\s*\d{11}\s*$/, '')
    output = output.replace(CPF_RAW_ELEVEN_DIGITS_REGEX, '')
    output = output.replace(EMAIL_REGEX, '')
    output = output.replace(PHONE_BR_REGEX, '')
    output = output.replace(DOC_REGISTRATION_REGEX, '')
    output = output.replace(NOMINAL_PERSON_MARKER_REGEX, '$1')
    output = output.replace(/[<>'"`;\\]/g, ' ')
    return output.replace(/\s+/g, ' ').trim().slice(0, 120)
  }

  if (context === 'LOG_OUTPUT') {
    // Em logs, mascara diretórios de usuário do SO, credenciais de proxy, IPs e PII
    output = output.replace(/(https?|socks5?):\/\/([^@\s]+)@/gi, '$1://[CREDENCIAIS_OCULTAS]@')
    output = output.replace(/[A-Za-z]:\\Users\\[^\\\s]+/gi, 'C:\\Users\\[USUARIO]')
    output = output.replace(/\/home\/[^/\s]+/gi, '/home/[USUARIO]')
    output = output.replace(/\/Users\/[^/\s]+/gi, '/Users/[USUARIO]')
    output = output.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_MASCARADO]')
  }

  // Para SCRAPED_TEXT, DATABASE_PERSISTENCE e LOG_OUTPUT: mascara dados pessoais
  output = output.replace(CPF_FORMATTED_REGEX, '[CPF PROTEGIDO - LGPD]')
  output = output.replace(CPF_RAW_ELEVEN_DIGITS_REGEX, 'CPF [PROTEGIDO - LGPD]')
  output = output.replace(EMAIL_REGEX, '[EMAIL PROTEGIDO - LGPD]')
  output = output.replace(PHONE_BR_REGEX, '[TELEFONE PROTEGIDO - LGPD]')
  output = output.replace(DOC_REGISTRATION_REGEX, '[REGISTRO PROTEGIDO - LGPD]')
  output = output.replace(NOMINAL_PERSON_MARKER_REGEX, '$1: [NOME PROTEGIDO - LGPD]')

  return output.replace(/\s+/g, ' ').trim()
}

/**
 * Valida e higieniza um objeto SearchFilter completo (inputs de texto, área, UF e situação).
 * Impede que dados pessoais sejam pesquisados ou gravados no banco de dados.
 */
export function validateAndSanitizeSearchFilter(rawFilter?: SearchFilter | null): FilterValidationResult {
  const safeFilter: SearchFilter = {
    termoLivre: '',
    area: 'TODOS',
    uf: 'TODOS',
    statusFiltro: 'TODOS'
  }

  if (!rawFilter || typeof rawFilter !== 'object') {
    return {
      isValid: true,
      blockedPersonalData: false,
      detectedPiiTypes: [],
      validationMessage: null,
      sanitizedFilter: safeFilter
    }
  }

  // 1. Validação estrita de Área
  const candidateArea = (rawFilter.area || 'TODOS') as ConcursoArea
  safeFilter.area = VALID_AREAS.has(candidateArea) ? candidateArea : 'TODOS'

  // 2. Validação estrita de UF
  const candidateUf = (rawFilter.uf || 'TODOS').toUpperCase().trim()
  safeFilter.uf = VALID_UFS.has(candidateUf) ? candidateUf : 'TODOS'

  // 3. Validação estrita de Status
  const candidateStatus = rawFilter.statusFiltro || 'TODOS'
  safeFilter.statusFiltro = VALID_STATUS_FILTERS.has(candidateStatus) ? candidateStatus : 'TODOS'

  // 4. Validação e Sanitização do Termo Livre
  const rawTerm = typeof rawFilter.termoLivre === 'string' ? rawFilter.termoLivre.trim() : ''
  const piiCheck = detectPersonalData(rawTerm)
  const cleanTerm = anonymizeText(rawTerm, 'SEARCH_INPUT')

  safeFilter.termoLivre = cleanTerm

  if (piiCheck.hasPii) {
    return {
      isValid: cleanTerm.length >= 2,
      blockedPersonalData: true,
      detectedPiiTypes: piiCheck.detectedTypes,
      validationMessage:
        'Por conformidade com a LGPD (Lei nº 13.709/2018), dados pessoais (como CPF, e-mail, telefone ou inscrição nominal) são bloqueados e nunca são armazenados. Pesquise apenas pelo nome do órgão ou carreira.',
      sanitizedFilter: safeFilter
    }
  }

  if (rawTerm.length > 120) {
    return {
      isValid: true,
      blockedPersonalData: false,
      detectedPiiTypes: [],
      validationMessage: 'O termo de pesquisa foi limitado a 120 caracteres por segurança.',
      sanitizedFilter: safeFilter
    }
  }

  return {
    isValid: true,
    blockedPersonalData: false,
    detectedPiiTypes: [],
    validationMessage: null,
    sanitizedFilter: safeFilter
  }
}

/**
 * Sanitiza profundamente um ConcursoDossier antes de persistir no SQLite,
 * garantindo que nenhuma informação pessoal seja guardada no banco de dados.
 */
export function anonymizeDossierForStorage(dossier: ConcursoDossier): ConcursoDossier {
  return {
    ...dossier,
    termoOriginal: anonymizeText(dossier.termoOriginal, 'DATABASE_PERSISTENCE') || dossier.orgao,
    orgao: anonymizeText(dossier.orgao, 'DATABASE_PERSISTENCE'),
    siglaOrgao: dossier.siglaOrgao
      ? anonymizeText(dossier.siglaOrgao, 'DATABASE_PERSISTENCE')
      : undefined,
    tituloConcurso: anonymizeText(dossier.tituloConcurso, 'DATABASE_PERSISTENCE'),
    resumoGeral: anonymizeText(dossier.resumoGeral, 'DATABASE_PERSISTENCE'),
    banca: {
      ...dossier.banca,
      nome: anonymizeText(dossier.banca.nome, 'DATABASE_PERSISTENCE'),
      observacao: anonymizeText(dossier.banca.observacao, 'DATABASE_PERSISTENCE')
    },
    cronograma: {
      ...dossier.cronograma,
      previsaoEdital: anonymizeText(dossier.cronograma.previsaoEdital, 'DATABASE_PERSISTENCE'),
      periodoInscricoes: dossier.cronograma.periodoInscricoes
        ? anonymizeText(dossier.cronograma.periodoInscricoes, 'DATABASE_PERSISTENCE')
        : undefined,
      ultimaMovimentacao: anonymizeText(dossier.cronograma.ultimaMovimentacao, 'DATABASE_PERSISTENCE')
    },
    cargosPrevistos: (dossier.cargosPrevistos || []).map((c) => ({
      ...c,
      titulo: anonymizeText(c.titulo, 'DATABASE_PERSISTENCE'),
      descricaoAtribuicoes: anonymizeText(c.descricaoAtribuicoes, 'DATABASE_PERSISTENCE')
    })),
    linksReferencia: (dossier.linksReferencia || []).map((l) => ({
      ...l,
      titulo: anonymizeText(l.titulo, 'DATABASE_PERSISTENCE')
    }))
  }
}

/**
 * Sanitiza profundamente um NewsItem antes de persistir no SQLite.
 */
export function anonymizeNewsItemForStorage(item: NewsItem): NewsItem {
  return {
    ...item,
    titulo: anonymizeText(item.titulo, 'DATABASE_PERSISTENCE'),
    resumo: anonymizeText(item.resumo, 'DATABASE_PERSISTENCE'),
    orgaoRelacionado: anonymizeText(item.orgaoRelacionado, 'DATABASE_PERSISTENCE')
  }
}
