import { ConcursoArea } from '../types/concurso'

export interface AreaOption {
  value: ConcursoArea
  label: string
  descricao: string
}

export const AREAS_CONCURSO: AreaOption[] = [
  { value: 'TODOS', label: 'Todas as Áreas', descricao: 'Panorama geral de todos os setores' },
  { value: 'BANCARIA', label: 'Bancária & Financeira', descricao: 'Banco do Brasil, Caixa, BNDES, BACEN' },
  { value: 'TRIBUNAIS', label: 'Tribunais & Judiciário', descricao: 'TRT, TRE, TRF, TJ, MPU, Defensorias' },
  { value: 'POLICIAL', label: 'Policial & Segurança', descricao: 'PF, PRF, Polícia Civil, PM, Penal' },
  { value: 'FISCAL_CONTROLE', label: 'Fiscal & Controle', descricao: 'Receita Federal, SEFAZ, ISS, TCU, TCE, CGU' },
  { value: 'ADMINISTRATIVA', label: 'Administrativa & Gestão', descricao: 'INSS, IBGE, Ministérios, Autarquias, Prefeituras' },
  { value: 'TI', label: 'Tecnologia da Informação', descricao: 'Analista de TI, SERPRO, Dataprev, Perito TI' },
  { value: 'EDUCACAO', label: 'Educação & Institutos', descricao: 'Secretarias de Educação, IFs, Universidades' },
  { value: 'SAUDE', label: 'Saúde & Hospitais', descricao: 'EBSERH, ANVISA, Secretarias de Saúde' }
]

export const ESTADOS_BRASIL = [
  { sigla: 'TODOS', nome: 'Brasil (Nacional + Todos Estados)' },
  { sigla: 'BR', nome: 'Nacional (Federal)' },
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
]

export const SUGESTOES_RAPIDAS = [
  'Banco do Brasil',
  'TRT Minas Gerais',
  'Polícia Federal',
  'INSS',
  'Caixa Econômica',
  'Receita Federal',
  'TJ SP',
  'Correios'
]
