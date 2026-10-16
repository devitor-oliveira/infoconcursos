import { ConcursoArea, ConcursoStatus } from './concurso'

export interface NewsItem {
  id: string
  titulo: string
  resumo: string
  url: string
  portalFonte: string
  dataPublicacao: string
  area: ConcursoArea
  uf: string
  statusRelacionado: ConcursoStatus
  orgaoRelacionado: string
  tipoConteudo?: 'EDITAL_CONCRETO' | 'AGREGADOR' | 'NOTICIA_APURACAO'
  vagas?: string
  remuneracao?: string
  prazoInscricao?: string
  banca?: string
  escolaridade?: string
}

export interface MonitoringItem {
  id: string
  concursoId: string
  orgao: string
  tituloConcurso: string
  termoMonitorado: string
  statusAtual: ConcursoStatus
  statusLabel: string
  ultimaVerificacao: string
  possuiNovidade: boolean
  descricaoNovidade?: string
  dossierSnapshotJson: string
}
