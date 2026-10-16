import { ConcursoStatus } from '../../../shared/types/concurso'
import { STATUS_DISPLAY_MAP } from '../../../shared/types/search'
import { BANCAS_REGISTRY } from '../../../shared/constants/sources-registry'

export interface DetectedStatusInfo {
  status: ConcursoStatus
  statusLabel: string
  bancaDetectada?: {
    nome: string
    situacao: 'CONTRATADA' | 'COTADA_OU_HISTORICO' | 'A_DEFINIR'
    observacao: string
  }
}

/**
 * Detecta o status fático e a banca organizadora a partir de textos.
 * Considera negações e não força "INSCRICOES_ABERTAS" se houver negativa.
 */
export function detectConcursoStatusAndBanca(texts: string[]): DetectedStatusInfo {
  const combined = texts.join(' ').toLowerCase()

  // 1. Checa suspensão ou cancelamento
  if (/\b(cancelad[oa]|anulad[oa]|suspenso|concurso revogado)\b/.test(combined)) {
    return {
      status: 'EM_ANDAMENTO',
      statusLabel: 'Suspenso / Em Reavaliação'
    }
  }

  let status: ConcursoStatus = 'DESCONHECIDO'

  // Checa negação antes de inscrições abertas (ex: "não abriu inscrições", "não estão abertas")
  const hasNegatedInscricoes = /(?:n[aã]o|sem)\s+(?:est[aá] com\s+|foram\s+)?inscri[cç][oõ]es/i.test(combined)

  if (
    !hasNegatedInscricoes &&
    /\b(inscri[cç][oõ]es abertas|inscri[cç][aã]o aberta|abre inscri[cç][oõ]es|abriu as inscri[cç][oõ]es|abre as inscri[cç][oõ]es|per[ií]odo de inscri[cç][aã]o aberto|est[aá] com inscri[cç][oõ]es abertas)\b/.test(
      combined
    )
  ) {
    status = 'INSCRICOES_ABERTAS'
  } else if (/\b(edital publicado|publica edital|saiu o edital|edital na pra[cç]a)\b/.test(combined)) {
    status = 'EDITAL_PUBLICADO'
  } else if (
    /\b(banca definida|contrato assinado com a banca|dispensa de licita[cç][aã]o publicada|oficializada como banca|banca oficializada|banca contratada|banca escolhida|banca anunciada|banca selecionada)\b/.test(
      combined
    )
  ) {
    status = 'BANCA_DEFINIDA'
  } else if (/\b(escolha da banca|cota[cç][aã]o de banca|banca em defini[cç][aã]o|termo de refer[eê]ncia)\b/.test(combined)) {
    status = 'BANCA_EM_DEFINICAO'
  } else if (/\b(comiss[aã]o formada|institui comiss[aã]o|grupo de trabalho|aprovado pelo pleno|avaliado e aprovado)\b/.test(combined)) {
    status = 'COMISSAO_FORMADA'
  } else if (/\b(autorizado|autoriza[cç][aã]o oficial|portaria autorizativa)\b/.test(combined)) {
    status = 'AUTORIZADO'
  } else if (/\b(previsto|estudos em andamento|solicitado|recomenda[cç][aã]o|previs[aã]o)\b/.test(combined)) {
    status = 'PREVISTO'
  }

  // Detecção de banca usando limites de palavra (\b) para evitar falso positivo
  let foundBanca = ''
  for (const banca of BANCAS_REGISTRY) {
    if (banca.regexMatcher.test(combined)) {
      foundBanca = banca.name
      break
    }
  }

  const situacaoBanca =
    status === 'INSCRICOES_ABERTAS' || status === 'EDITAL_PUBLICADO' || status === 'BANCA_DEFINIDA'
      ? 'CONTRATADA'
      : foundBanca
        ? 'COTADA_OU_HISTORICO'
        : 'A_DEFINIR'

  return {
    status,
    statusLabel: STATUS_DISPLAY_MAP[status]?.label || 'A Definir',
    bancaDetectada: foundBanca
      ? {
          nome: foundBanca,
          situacao: situacaoBanca,
          observacao:
            situacaoBanca === 'CONTRATADA'
              ? `Banca ${foundBanca} identificada nas publicações oficiais.`
              : `Banca ${foundBanca} citada nas movimentações recentes.`
        }
      : undefined
  }
}
