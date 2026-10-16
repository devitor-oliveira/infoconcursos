export type ConcursoStatus =
  | 'EDITAL_PUBLICADO'
  | 'INSCRICOES_ABERTAS'
  | 'BANCA_DEFINIDA'
  | 'BANCA_EM_DEFINICAO'
  | 'COMISSAO_FORMADA'
  | 'AUTORIZADO'
  | 'PREVISTO'
  | 'EM_ANDAMENTO'
  | 'DESCONHECIDO'

export type ConcursoArea =
  | 'TODOS'
  | 'BANCARIA'
  | 'TRIBUNAIS'
  | 'POLICIAL'
  | 'FISCAL_CONTROLE'
  | 'ADMINISTRATIVA'
  | 'EDUCACAO'
  | 'SAUDE'
  | 'TI'

export type EscolaridadeNivel = 'MEDIO' | 'TECNICO' | 'SUPERIOR' | 'MEDIO_E_SUPERIOR'

export interface CargoPrevisto {
  titulo: string
  escolaridade: EscolaridadeNivel
  vagas: string
  remuneracao: string
  descricaoAtribuicoes: string
}

export interface CronogramaEstimado {
  previsaoEdital: string
  periodoInscricoes?: string
  dataProvaPrevista?: string
  ultimaMovimentacao: string
  validadeAnterior?: string
}

export interface ReferenceLink {
  id: string
  titulo: string
  url: string
  fonte: string
  tipo: 'NOTICIA' | 'PORTAL_OFICIAL' | 'EDITAL_PDF' | 'BANCA'
  dataPublicacao?: string
}

export interface ConcursoDossier {
  id: string
  urlCanonica?: string
  termoOriginal: string
  orgao: string
  siglaOrgao?: string
  tituloConcurso: string
  area: ConcursoArea
  uf: string
  status: ConcursoStatus
  statusLabel: string
  resumoGeral: string
  tipoRegistro?: 'EDITAL_OFICIAL' | 'AGREGADOR' | 'NOTICIA_APURACAO'
  prazoInscricao?: string
  escolaridade?: string
  numeroVagas?: string
  salarioMaximo?: string
  bancaUrl?: string
  editalPdfUrl?: string
  banca: {
    nome: string
    situacao: 'CONTRATADA' | 'COTADA_OU_HISTORICO' | 'A_DEFINIR'
    observacao: string
  }
  cronograma: CronogramaEstimado
  cargosPrevistos: CargoPrevisto[]
  materiasRecomendadas: string[]
  linksReferencia: ReferenceLink[]
  atualizadoEm: string
  capturadoEm?: string
  possuiNovidade?: boolean
}

