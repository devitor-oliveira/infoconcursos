import { CronogramaEstimado, ConcursoStatus } from '../../../shared/types/concurso'

/**
 * Extrai datas reais e cronograma factual a partir de textos oficiais ou notícias.
 * Não inventa estimativas de semanas ou dias futuros.
 */
export function extractEstimatedTimeline(
  texts: string[],
  status: ConcursoStatus
): CronogramaEstimado {
  const combined = texts.join(' ')

  // 1. Procura datas explícitas de prova
  let dataProvaPrevista: string | undefined = undefined
  const provaMatch = combined.match(
    /\b(?:prova(?:s)?\s*(?:prevista(?:s)?|marcada(?:s)?|em|no\s*dia)?\s*:?\s*)(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\b/i
  )
  if (provaMatch) {
    dataProvaPrevista = `Prova: ${provaMatch[1]}`
  }

  // 2. Procura períodos de inscrição explícitos
  let periodoInscricoes: string | undefined = undefined
  const inscricaoMatch = combined.match(
    /\b(?:inscri[cç][oõ]es\s*(?:at[eé]|de\s*\d{1,2}\/\d{1,2}\s*a)?\s*:?\s*)(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\b/i
  )
  if (inscricaoMatch) {
    periodoInscricoes = `Inscrições até ${inscricaoMatch[1]}`
  } else if (status === 'INSCRICOES_ABERTAS') {
    periodoInscricoes = 'Inscrições abertas (consulte prazo no edital)'
  }

  // 3. Previsão de edital
  let previsaoEdital = 'A definir pelo órgão'
  const semesterMatch = combined.match(/\b([12][º°]\s*semestre\s*(?:de\s*)?202[567])\b/i)
  if (semesterMatch) {
    previsaoEdital = `Publicação prevista para o ${semesterMatch[1]}`
  } else if (status === 'EDITAL_PUBLICADO' || status === 'INSCRICOES_ABERTAS') {
    previsaoEdital = 'Edital publicado'
  } else if (status === 'BANCA_DEFINIDA') {
    previsaoEdital = 'Banca definida (aguardando publicação do edital)'
  } else if (status === 'COMISSAO_FORMADA') {
    previsaoEdital = 'Comissão formada (elaboração do projeto básico)'
  } else if (status === 'AUTORIZADO') {
    previsaoEdital = 'Concurso autorizado formalmente'
  }

  // 4. Última movimentação factual
  let ultimaMovimentacao = 'Acompanhamento de atos oficiais em andamento.'
  if (texts.length > 0 && texts[0].length > 15) {
    ultimaMovimentacao = texts[0].slice(0, 150).trim() + (texts[0].length > 150 ? '...' : '')
  }

  return {
    previsaoEdital,
    periodoInscricoes,
    dataProvaPrevista,
    ultimaMovimentacao
  }
}

/**
 * Faz o parsing de datas de prazo no formato DD/MM/AAAA ou DD/MM.
 */
export function parseDeadlineDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const match = dateStr.match(/\b(\d{1,2})[\/\.-](\d{1,2})(?:[\/\.-](\d{2,4}))?\b/)
  if (!match) return null
  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10) - 1
  let year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear()
  if (year < 100) year += 2000
  const d = new Date(year, month, day, 23, 59, 59)
  return isNaN(d.getTime()) ? null : d
}

