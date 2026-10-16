export interface PortalSource {
  id: string
  name: string
  domain: string
  baseUrl: string
  sitemapUrls: string[]
  rssUrls: string[]
  searchUrlTemplate?: string
  regionalUfs: string[]
  tipo: 'PORTAL_NOTICIAS'
}

export interface BancaSource {
  id: string
  name: string
  sigla: string
  domain: string
  baseUrl: string
  /** Subdomínios onde os editais e inscrições realmente residem */
  editaisBaseUrls: string[]
  sitemapUrls: string[]
  rssUrls?: string[]
  categoria: 'NACIONAL_TRADICIONAL' | 'MINAS_GERAIS_REGIONAL' | 'OUTRA_NACIONAL'
  regionalScope: 'NACIONAL' | 'MG' | 'SUDESTE'
  regexMatcher: RegExp
}

export const PORTAIS_REGISTRY: PortalSource[] = [
  {
    id: 'pci-concursos',
    name: 'PCI Concursos',
    domain: 'pciconcursos.com.br',
    baseUrl: 'https://www.pciconcursos.com.br',
    sitemapUrls: ['https://www.pciconcursos.com.br/smap_noticias.xml'],
    rssUrls: [],
    searchUrlTemplate: 'https://www.pciconcursos.com.br/pesquisa/?p={query}&tipopesquisa=1',
    regionalUfs: ['BR', 'MG', 'SP', 'RJ', 'ES'],
    tipo: 'PORTAL_NOTICIAS'
  },
  {
    id: 'ache-concursos',
    name: 'Ache Concursos',
    domain: 'acheconcursos.com.br',
    baseUrl: 'https://www.acheconcursos.com.br',
    sitemapUrls: [
      'https://www.acheconcursos.com.br/sm-index.xml',
      'https://www.acheconcursos.com.br/sm-news.xml',
      'https://www.acheconcursos.com.br/sm-categoria-1.xml'
    ],
    rssUrls: [],
    regionalUfs: ['BR', 'MG'],
    tipo: 'PORTAL_NOTICIAS'
  },
  {
    id: 'concursos-no-brasil',
    name: 'Concursos no Brasil',
    domain: 'concursosnobrasil.com',
    baseUrl: 'https://concursosnobrasil.com',
    sitemapUrls: ['https://concursosnobrasil.com/sitemap_index.xml'],
    rssUrls: ['https://concursosnobrasil.com/feed/'],
    regionalUfs: ['BR', 'MG'],
    tipo: 'PORTAL_NOTICIAS'
  },
  {
    id: 'gran-cursos',
    name: 'Blog Gran Cursos Online',
    domain: 'blog.grancursosonline.com.br',
    baseUrl: 'https://blog.grancursosonline.com.br',
    sitemapUrls: [],
    rssUrls: ['https://blog.grancursosonline.com.br/feed/'],
    regionalUfs: ['BR', 'MG', 'SP', 'RJ', 'DF'],
    tipo: 'PORTAL_NOTICIAS'
  },
  {
    id: 'folha-dirigida',
    name: 'Folha Dirigida por Qconcursos',
    domain: 'folha.qconcursos.com',
    baseUrl: 'https://folha.qconcursos.com',
    sitemapUrls: [],
    rssUrls: [],
    regionalUfs: ['BR', 'RJ', 'SP', 'MG', 'DF'],
    tipo: 'PORTAL_NOTICIAS'
  },
  {
    id: 'estrategia-concursos',
    name: 'Blog Estratégia Concursos',
    domain: 'estrategiaconcursos.com.br',
    baseUrl: 'https://www.estrategiaconcursos.com.br/blog',
    sitemapUrls: [],
    rssUrls: [],
    regionalUfs: ['BR', 'MG', 'SP', 'RJ', 'DF'],
    tipo: 'PORTAL_NOTICIAS'
  }
]

export const BANCAS_REGISTRY: BancaSource[] = [
  // Lote 1: Minas Gerais & Regionais (Foco Principal em MG/RMBH)
  {
    id: 'fundep',
    name: 'Fundep (Gestão de Concursos - UFMG)',
    sigla: 'Fundep',
    domain: 'gestaodeconcursos.com.br',
    baseUrl: 'https://www.gestaodeconcursos.com.br',
    editaisBaseUrls: [
      'https://fundep.selecao.net.br',
      'https://www.gestaodeconcursos.com.br/site/site/default.aspx'
    ],
    sitemapUrls: [],
    categoria: 'MINAS_GERAIS_REGIONAL',
    regionalScope: 'MG',
    regexMatcher: /\b(fundep|gest[aã]o\s+de\s+concursos)\b/i
  },
  {
    id: 'fumarc',
    name: 'FUMARC',
    sigla: 'FUMARC',
    domain: 'fumarc.com.br',
    baseUrl: 'https://www.fumarc.com.br',
    editaisBaseUrls: [
      'https://www.fumarc.com.br/concursos',
      'https://www.fumarc.com.br/SitePages/Home.aspx'
    ],
    sitemapUrls: ['https://www.fumarc.com.br/sitemap0.xml'],
    categoria: 'MINAS_GERAIS_REGIONAL',
    regionalScope: 'MG',
    regexMatcher: /\b(fumarc|funda[cç][aã]o\s+mariana\s+resende)\b/i
  },
  {
    id: 'consulplan',
    name: 'Instituto Consulplan',
    sigla: 'Consulplan',
    domain: 'institutoconsulplan.org.br',
    baseUrl: 'https://www.institutoconsulplan.org.br',
    editaisBaseUrls: ['https://www.institutoconsulplan.org.br/Concursos'],
    sitemapUrls: ['https://www.institutoconsulplan.org.br/sitemap.xml'],
    categoria: 'MINAS_GERAIS_REGIONAL',
    regionalScope: 'MG',
    regexMatcher: /\b(consulplan|instituto\s+consulplan)\b/i
  },
  {
    id: 'ibgp',
    name: 'IBGP Concursos',
    sigla: 'IBGP',
    domain: 'ibgpconcursos.com.br',
    baseUrl: 'https://www.ibgpconcursos.com.br',
    editaisBaseUrls: [
      'https://novo.ibgpconcursos.com.br/inscricoes_abertas.jsp',
      'https://novo.ibgpconcursos.com.br/proximos.jsp'
    ],
    sitemapUrls: [],
    categoria: 'MINAS_GERAIS_REGIONAL',
    regionalScope: 'MG',
    regexMatcher: /\b(ibgp|instituto\s+brasileiro\s+de\s+gest[aã]o\s+e\s+pesquisa)\b/i
  },
  {
    id: 'funcefet',
    name: 'Fundação CEFETMINAS (FUNCEFET)',
    sigla: 'FUNCEFET',
    domain: 'fundacaocefetminas.org.br',
    baseUrl: 'https://fundacaocefetminas.org.br',
    editaisBaseUrls: [
      'https://concurso.fundacaocefetminas.org.br/site/processo_seletivo.aspx',
      'https://fundacaocefetminas.org.br/concursos-e-processos-seletivos/'
    ],
    sitemapUrls: ['https://fundacaocefetminas.org.br/wp-sitemap.xml'],
    categoria: 'MINAS_GERAIS_REGIONAL',
    regionalScope: 'MG',
    regexMatcher: /\b(funcefet|cefetminas|funda[cç][aã]o\s+cefetminas)\b/i
  },
  {
    id: 'jcm',
    name: 'JCM Concursos',
    sigla: 'JCM',
    domain: 'jcmconcursos.com.br',
    baseUrl: 'https://www.jcmconcursos.com.br',
    editaisBaseUrls: ['http://www.jcmconcursos.com.br'],
    sitemapUrls: [],
    categoria: 'MINAS_GERAIS_REGIONAL',
    regionalScope: 'MG',
    regexMatcher: /\b(jcm\s+concursos|jcm\s+consultoria)\b/i
  },
  {
    id: 'ibam',
    name: 'IBAM Concursos',
    sigla: 'IBAM',
    domain: 'ibamconcursos.org.br',
    baseUrl: 'https://www.ibamconcursos.org.br',
    editaisBaseUrls: ['https://www.ibamconcursos.org.br'],
    sitemapUrls: [],
    categoria: 'MINAS_GERAIS_REGIONAL',
    regionalScope: 'SUDESTE',
    regexMatcher: /\b(ibam|instituto\s+brasileiro\s+de\s+administra[cç][aã]o\s+municipal)\b/i
  },

  // Lote 2: Grandes Bancas Nacionais Tradicionais
  {
    id: 'cebraspe',
    name: 'Cebraspe (Cespe)',
    sigla: 'Cebraspe',
    domain: 'cebraspe.org.br',
    baseUrl: 'https://www.cebraspe.org.br',
    editaisBaseUrls: [
      'https://www.cebraspe.org.br/concursos/inscricoes-abertas/',
      'https://www.cebraspe.org.br/concursos/novos',
      'https://www.cebraspe.org.br/concursos/em-andamento/'
    ],
    sitemapUrls: [],
    categoria: 'NACIONAL_TRADICIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(cebraspe|cespe|unb)\b/i
  },
  {
    id: 'fgv',
    name: 'FGV Conhecimento (Fundação Getulio Vargas)',
    sigla: 'FGV',
    domain: 'conhecimento.fgv.br',
    baseUrl: 'https://conhecimento.fgv.br',
    editaisBaseUrls: ['https://conhecimento.fgv.br/concursos'],
    sitemapUrls: ['https://conhecimento.fgv.br/sitemap.xml'],
    categoria: 'NACIONAL_TRADICIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(fgv|funda[cç][aã]o\s+getulio\s+vargas|fgv\s+conhecimento)\b/i
  },
  {
    id: 'fcc',
    name: 'Fundação Carlos Chagas (FCC)',
    sigla: 'FCC',
    domain: 'concursosfcc.com.br',
    baseUrl: 'https://www.concursosfcc.com.br',
    editaisBaseUrls: ['https://www.concursosfcc.com.br/concursoAndamento.html'],
    sitemapUrls: [],
    categoria: 'NACIONAL_TRADICIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(fcc|carlos\s+chagas|funda[cç][aã]o\s+carlos\s+chagas)\b/i
  },
  {
    id: 'cesgranrio',
    name: 'Fundação Cesgranrio',
    sigla: 'Cesgranrio',
    domain: 'cesgranrio.org.br',
    baseUrl: 'https://www.cesgranrio.org.br',
    editaisBaseUrls: [
      'https://www.cesgranrio.org.br/concursos/',
      'https://concursos.cesgranrio.org.br'
    ],
    sitemapUrls: [
      'https://www.cesgranrio.org.br/wp-sitemap-posts-concurso-1.xml',
      'https://www.cesgranrio.org.br/sitemap.xml'
    ],
    categoria: 'NACIONAL_TRADICIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(cesgranrio|funda[cç][aã]o\s+cesgranrio)\b/i
  },
  {
    id: 'ibfc',
    name: 'IBFC (Instituto Brasileiro de Formação e Capacitação)',
    sigla: 'IBFC',
    domain: 'ibfc.org.br',
    baseUrl: 'https://www.ibfc.org.br',
    editaisBaseUrls: [
      'https://ibfc.selecao.net.br/index/abertos/',
      'https://ibfc.selecao.net.br/index/1/'
    ],
    sitemapUrls: [],
    categoria: 'NACIONAL_TRADICIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(ibfc)\b/i
  },
  {
    id: 'vunesp',
    name: 'Fundação Vunesp',
    sigla: 'Vunesp',
    domain: 'vunesp.com.br',
    baseUrl: 'https://www.vunesp.com.br',
    editaisBaseUrls: [
      'https://www.vunesp.com.br/busca/concurso/inscricoes%20abertas',
      'https://www.vunesp.com.br/busca/concurso/proximo'
    ],
    sitemapUrls: ['https://www.vunesp.com/sitemap.xml'],
    categoria: 'NACIONAL_TRADICIONAL',
    regionalScope: 'SUDESTE',
    regexMatcher: /\b(vunesp|funda[cç][aã]o\s+vunesp)\b/i
  },
  {
    id: 'selecon',
    name: 'Instituto Selecon',
    sigla: 'Selecon',
    domain: 'selecon.org.br',
    baseUrl: 'https://selecon.org.br',
    editaisBaseUrls: [
      'https://selecon.org.br/concursos/',
      'https://selecon.selecao.net.br',
      'https://selecon-mt.selecao.net.br'
    ],
    sitemapUrls: [
      'https://selecon.org.br/concursos-sitemap1.xml',
      'https://selecon.org.br/concursos-sitemap2.xml'
    ],
    rssUrls: ['https://selecon.org.br/concursos/feed/'],
    categoria: 'NACIONAL_TRADICIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(selecon|instituto\s+selecon)\b/i
  },

  // Lote 3: Outras Bancas Nacionais de Médio/Grande Porte
  {
    id: 'idecan',
    name: 'Instituto de Desenvolvimento Educacional, Cultural e Assistencial Nacional (Idecan)',
    sigla: 'Idecan',
    domain: 'idecan.org.br',
    baseUrl: 'https://www.idecan.org.br',
    editaisBaseUrls: [
      'https://portal.concursos.idecan.org.br/edital/index/abertos',
      'https://portal.concursos.idecan.org.br/edital/index/futuros',
      'https://portal.concursos.idecan.org.br/edital'
    ],
    sitemapUrls: [],
    categoria: 'OUTRA_NACIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(idecan)\b/i
  },
  {
    id: 'ibade',
    name: 'Instituto Brasileiro de Apoio e Desenvolvimento Executivo (Ibade)',
    sigla: 'Ibade',
    domain: 'ibade.org.br',
    baseUrl: 'https://www.ibade.org.br',
    editaisBaseUrls: [
      'https://portal.ibade.selecao.site/edital',
      'https://portal.ibade.selecao.site'
    ],
    sitemapUrls: ['https://ibade.org.br/sitemap_index.xml'],
    categoria: 'OUTRA_NACIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(ibade)\b/i
  },
  {
    id: 'access',
    name: 'Instituto Access',
    sigla: 'Access',
    domain: 'access.org.br',
    baseUrl: 'https://www.access.org.br',
    editaisBaseUrls: [
      'https://concursos.access.org.br/index/abertos/',
      'https://concursos.access.org.br/index/7/'
    ],
    sitemapUrls: [],
    categoria: 'OUTRA_NACIONAL',
    regionalScope: 'SUDESTE',
    regexMatcher: /\b(access|instituto\s+access)\b/i
  },
  {
    id: 'fundatec',
    name: 'Fundatec',
    sigla: 'Fundatec',
    domain: 'fundatec.org.br',
    baseUrl: 'https://www.fundatec.org.br',
    editaisBaseUrls: [
      'https://www.fundatec.org.br/portal/concursos/concursos_abertos.php',
      'https://www.fundatec.org.br/portal/concursos/concursos_proximos.php'
    ],
    sitemapUrls: [],
    categoria: 'OUTRA_NACIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(fundatec)\b/i
  },
  {
    id: 'iades',
    name: 'IADES (Instituto Americano de Desenvolvimento)',
    sigla: 'IADES',
    domain: 'iades.com.br',
    baseUrl: 'https://www.iades.com.br',
    editaisBaseUrls: [
      'https://www.iades.com.br/inscricao/?v=novo',
      'https://www.iades.com.br/inscricao/?v=andamento',
      'https://www.iades.com.br/inscricao/'
    ],
    sitemapUrls: [],
    categoria: 'OUTRA_NACIONAL',
    regionalScope: 'NACIONAL',
    regexMatcher: /\b(iades)\b/i
  }
]
