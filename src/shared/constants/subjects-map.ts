import { ConcursoArea } from '../types/concurso'

export const SUBJECTS_BY_AREA: Record<ConcursoArea, string[]> = {
  TODOS: [
    'Língua Portuguesa',
    'Raciocínio Lógico-Matemático',
    'Direito Constitucional',
    'Direito Administrativo',
    'Informática / Noções de TI',
    'Ética no Serviço Público'
  ],
  BANCARIA: [
    'Língua Portuguesa',
    'Conhecimentos Bancários',
    'Vendas e Negociação',
    'Matemática Financeira',
    'Atualidades do Mercado Financeiro',
    'Informática e Segurança Digital',
    'Língua Inglesa'
  ],
  TRIBUNAIS: [
    'Língua Portuguesa',
    'Direito Constitucional',
    'Direito Administrativo',
    'Direito Processual Civil',
    'Direito do Trabalho e Processual do Trabalho',
    'Regimento Interno do Tribunal',
    'Raciocínio Lógico-Matemático'
  ],
  POLICIAL: [
    'Língua Portuguesa',
    'Direito Penal',
    'Direito Processual Penal',
    'Legislação Penal Especial',
    'Direito Constitucional e Direitos Humanos',
    'Direito Administrativo',
    'Informática / Contabilidade Geral',
    'Raciocínio Lógico'
  ],
  FISCAL_CONTROLE: [
    'Direito Tributário e Legislação Tributária',
    'Contabilidade Geral e Avançada',
    'Auditoria Governamental / Fiscal',
    'Direito Constitucional e Administrativo',
    'Administração Financeira e Orçamentária (AFO)',
    'Estatística e Matemática Financeira',
    'Tecnologia da Informação / Análise de Dados'
  ],
  ADMINISTRATIVA: [
    'Língua Portuguesa e Redação Oficial',
    'Direito Administrativo (Lei 14.133/2021 e Lei 8.112/1990)',
    'Direito Constitucional',
    'Administração Geral e Pública',
    'Noções de AFO (Orçamento Público)',
    'Raciocínio Lógico e Informática'
  ],
  TI: [
    'Engenharia de Software e Metodologias Ágeis (Scrum/Kanban)',
    'Banco de Dados (SQL, NoSQL e Modelagem)',
    'Segurança da Informação (ISO 27001, LGPD)',
    'Desenvolvimento de Sistemas e Arquitetura',
    'Redes de Computadores e Cloud Computing',
    'Governança de TI (COBIT, ITIL)',
    'Língua Portuguesa e Inglês Técnico'
  ],
  EDUCACAO: [
    'Língua Portuguesa',
    'Legislação Educacional (LDB - Lei 9.394/1996 e ECA)',
    'Didática, Currículo e Avaliação',
    'Tendências Pedagógicas',
    'Direito Constitucional e Administrativo',
    'Conhecimentos Específicos da Licenciatura / Cargo'
  ],
  SAUDE: [
    'Legislação do SUS (Leis 8.080/1990 e 8.142/1990)',
    'Saúde Pública e Epidemiologia',
    'Língua Portuguesa',
    'Ética e Bioética Profissional',
    'Raciocínio Lógico',
    'Conhecimentos Específicos da Área de Saúde'
  ]
}
