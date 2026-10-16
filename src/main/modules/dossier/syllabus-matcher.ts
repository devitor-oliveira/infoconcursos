import { ConcursoArea } from '../../../shared/types/concurso'
import { SUBJECTS_BY_AREA } from '../../../shared/constants/subjects-map'

const EXTRA_SUBJECT_KEYWORDS: Array<{ regex: RegExp; subject: string }> = [
  { regex: /\b(direito previdenci[aá]rio|seguridade social|inss)\b/i, subject: 'Direito Previdenciário e Seguridade Social' },
  { regex: /\b(direito do trabalho|clt|trt|trabalhista)\b/i, subject: 'Direito do Trabalho e Processual do Trabalho' },
  { regex: /\b(direito eleitoral|tre|tse)\b/i, subject: 'Direito Eleitoral e Regimento Eleitoral' },
  { regex: /\b(conhecimentos banc[aá]rios|sistema financeiro nacional|banco do brasil|caixa)\b/i, subject: 'Conhecimentos Bancários e SFN' },
  { regex: /\b(contabilidade p[uú]blica|afo|or[cç]amento)\b/i, subject: 'Administração Financeira e Orçamentária (AFO)' },
  { regex: /\b(arquivologia|gest[aã]o de documentos)\b/i, subject: 'Noções de Arquivologia' },
  { regex: /\b(direitos humanos|pol[ií]cia|seguran[cç]a p[uú]blica)\b/i, subject: 'Direitos Humanos e Legislação Penal Especial' },
  { regex: /\b(criminologia)\b/i, subject: 'Noções de Criminologia' }
]

/**
 * Retorna a grade de disciplinas recomendadas para estudo imediato,
 * combinando a matriz curricular da carreira com tópicos específicos detectados.
 */
export function matchRecommendedSubjects(area: ConcursoArea, contextTexts: string[] = []): string[] {
  const baseSubjects = [...(SUBJECTS_BY_AREA[area] || SUBJECTS_BY_AREA.TODOS)]
  const combined = contextTexts.join(' ')

  for (const item of EXTRA_SUBJECT_KEYWORDS) {
    if (item.regex.test(combined) && !baseSubjects.some((s) => s.toLowerCase().includes(item.subject.toLowerCase().slice(0, 15)))) {
      baseSubjects.push(item.subject)
    }
  }

  return Array.from(new Set(baseSubjects)).slice(0, 9)
}
