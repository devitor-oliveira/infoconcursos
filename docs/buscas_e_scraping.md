# Arquitetura de Buscas & Estratégia de Scraping — InfoConcursos Desktop

Esta documentação detalha a arquitetura, o fluxo de execução ponta a ponta, as técnicas de web scraping e a catalogação completa de bancas organizadoras e portais consultados pelo **InfoConcursos Desktop**.

---

## 1. Visão Geral do Motor de Buscas

O motor de buscas do InfoConcursos foi concebido sobre quatro pilares técnicos:

1. **Custo Zero & Zero API Keys**: não depende de serviços comerciais pagos (ex: Serper, SerpApi, Google Custom Search API). Toda a coleta é realizada diretamente pelo cliente Desktop via HTTP nativo e parsing de estruturas abertas.
2. **Arquitetura Cache-First**: antes de qualquer chamada externa à internet, o sistema consulta o banco local SQLite (`concursos` e `historico_buscas`). Consultas repetidas retornam instantaneamente (< 10ms).
3. **Filtro Temporal Ativo & Anti-Retroatividade**: injeção de âncoras temporais dinâmicas (ano corrente e anterior, ex: `2026` e `2025`) e descarte determinístico de editais antigos, homologações passadas e gabaritos de certames de 2018 a 2023.
4. **Política Zero Fake Data**: nenhum dado é alucinado ou inventado. Se o ato oficial ou a notícia não informar remuneração ou quantitativo de vagas, o sistema classifica explicitamente como *"Não especificado na publicação"* ou *"Conforme edital"*.

---

## 2. Fluxograma Arquitetural do Pipeline de Busca

O fluxograma a seguir mapeia a jornada desde o acionamento pelo usuário na interface gráfica (Electron Renderer) até a consolidação dos dossiês no banco local SQLite:

```mermaid
flowchart TD
    %% CAMADA DE ENTRADA
    subgraph UI ["1. Interface do Usuário (Renderer)"]
        A1["Usuário pesquisa por termo (ex: 'Banco do Brasil', 'TRT MG')"]
        A2["Ou seleciona filtros de Área (Bancária, Tribunais, Fiscal...) e UF"]
        A3["Ou define status (Abertos / Previstos)"]
        A1 --> IPC["ipcRenderer.invoke('discovery:search', filter, options)"]
        A2 --> IPC
        A3 --> IPC
    end

    %% HIGIENIZAÇÃO PII & LGPD
    subgraph SanitizaLGPD ["2. Validação & Anonimização PII (anonymizer.ts)"]
        IPC --> CheckPII{"Contém CPF, RG, E-mail ou Nome de Candidato?"}
        CheckPII -->|Sim (Inválido)| ReturnWarning["Retorna aviso de bloqueio LGPD (Sem persistir)"]
        CheckPII -->|Não (Público/Válido)| CleanFilter["Filtro higienizado e liberado"]
    end

    %% IPC E CACHE
    subgraph IPCMain ["3. Handler IPC & Cache Local (Main Process)"]
        CleanFilter --> CheckForce{"options.forceRefresh == true?"}
        CheckForce -->|Não| CheckCache["Consulta getCachedSearchResults(filter) em busca_cache"]
        CheckCache -->|Cache Hit| ReturnCache["Retorna Dossiês do SQLite (< 10ms)"]
        CheckForce -->|Sim| RunScrapers["Dispara Pipeline Online"]
        CheckCache -->|Cache Miss| RunScrapers
    end

    %% SANITIZAÇÃO E QUERY BUILDING
    subgraph Sanitizacao ["4. Sanitização e Construção de Queries"]
        RunScrapers --> QuerySanitizer["query-sanitizer.ts: buildSanitizedSearchQuery()"]
        QuerySanitizer --> InjetaAncoras["Injeta âncoras temporais (2026 / 2025)"]
        QuerySanitizer --> InjetaExclusoes["Injeta exclusões (-'resultado final 2021', -'2022', -'homologado em 2023')"]
        QuerySanitizer --> BuildDorks["Gera Dorks especializadas de Bancas e Portais"]
    end

    %% REDE SEGURA E PRIVACIDADE
    subgraph RedeSegura ["5. Transporte Seguro & Privacidade de Rede (http-client.ts)"]
        InjetaAncoras --> NetPrivacy["network-privacy.ts: Proxy (Undici), Sec-GPC e Rotação de UA"]
        NetPrivacy --> FetchSafety["fetchHtmlWithSafety()"]
        FetchSafety --> TimeoutGuard["Timeout estrito de 6000ms via AbortController"]
        FetchSafety --> SizeGuard["Rejeita binários e trunca payloads > 2MB"]
    end

    %% DISPARO CONCORRENTE DE SCRAPERS
    subgraph ColetaOnline ["6. Coleta Paralela Resiliente (Promise.allSettled)"]
        FetchSafety --> ParallelGroup

        subgraph ParallelGroup ["Execução Paralela"]
            P1["Agregador PCI Concursos (scrapePciConcrete)"]
            P2["Agregador Ache Concursos (scrapeAcheConcursosConcrete)"]
            P3["Agregador Concursos no Brasil (scrapeConcursosNoBrasilConcrete)"]
            P4["Scrapers Diretos de 11 Bancas (scrapeBancasConcreteAll)"]
            P5["Motor DuckDuckGo HTML/Lite (searchDuckDuckGoLite)"]
            P6["Google News RSS Search (searchGoogleNewsRss - se houver termo)"]
        end
    end

    %% PARSERS E NORMALIZAÇÃO
    subgraph Extracao ["7. Extração, Normalização e Decodificação"]
        ParallelGroup --> URLClean["url-resolver.ts: Decodifica Base64 de Google News, limpa UTMs/trackers e gera HTTPS"]
        URLClean --> FilterCurrent{"isResultCurrent(): É concurso atual/recente?"}
        FilterCurrent -->|Sim (2025/2026/Novo)| Extratores["Extratores de Domínio"]
        FilterCurrent -->|Não (Obsoleto 2018-2023)| Descarte["Descarta item retroativo"]
        
        Extratores --> DetStatus["status-detector.ts: Detecta Status e Banca"]
        Extratores --> DetDate["date-extractor.ts: Normaliza Prazos e Cronograma"]
        Extratores --> DetMat["syllabus-matcher.ts: Mapeia Matérias Recomendadas"]
        Extratores --> BuildDossier["dossier-generator.ts: Converte em ConcursoDossier estruturado"]
    end

    %% DEDUPLICAÇÃO E ORDENAÇÃO
    subgraph PosProcessamento ["7. Pós-Processamento e Ranqueamento"]
        BuildDossier --> FiltroUsuario["Aplica filtros finais do usuário (Área, UF, Status)"]
        FiltroUsuario --> Deduplicacao["Deduplicação estrita (chave canônica NFD + URL única)"]
        Deduplicacao --> Ordenacao["Ordenação: 1º EDITAL_OFICIAL | 2º AGREGADOR | 3º NOTICIA_APURACAO"]
    end

    %% PERSISTÊNCIA E RETORNO
    subgraph Persistencia ["8. Persistência & Retorno"]
        Ordenacao --> SaveCache["saveSearchResultsToCache(): Atualiza cache SQLite"]
        SaveCache --> LogHist["Registra busca em historico_buscas"]
        LogHist --> ReturnRenderer["Entrega Array de ConcursoDossier ao Renderer"]
    end

    ReturnCache --> ReturnRenderer
```

---

## 3. Estratégia de Scraping por Categoria de Fonte

A camada de scraping está dividida em 3 estratégias especializadas conforme a fonte:

### 3.1. Agregadores de Editais (Scraping Concreto Estruturado)
Módulos: [`src/main/modules/search/portals-concrete.scraper.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/portals-concrete.scraper.ts)

Os agregadores fornecem os editais já publicados e organizados por cargos e prazos.

| Portal | Estratégia de Requisição | Seletores & Heurística de Extração |
| :--- | :--- | :--- |
| **PCI Concursos** | Consulta direta por query em `pciconcursos.com.br/pesquisa/?p={query}&tipopesquisa=1` ou navegação regional (`/concursos/sudeste/` ou `/concursos/`). | Extrai blocos `.na` e `.da` (editais ativos). Descarta propositalmente blocos `.ea` (concursos encerrados). Extrai links de detalhes (`.ca a`), vagas/salários via regex em `.cd`, e prazos de encerramento em `.ce`. |
| **Ache Concursos** | Rotas regionais de alta precisão: `/concursos-minas-gerais` quando UF=MG, ou `/concursos-abertos` para nacional. | Itera sobre linhas da tabela `table.tbl-conc tbody tr`. Captura título (`span.titulo`), escolaridade (`span.vagas`), prazo final (`span.inscricao_fim`), vagas (`span.numero_vagas`) e remuneração máxima (`span.sal_max`). |
| **Concursos no Brasil** | Rotas segmentadas: `/concursos/mg/` e `/concursos/br/`. | Parsing da tabela `table tbody tr`, extraindo link canônico (`a.post-title`) e total de vagas (`td.center`). |

---

### 3.2. Bancas Organizadoras (Scrapers Diretos de Murais e Editais)
Módulos: [`src/main/modules/search/bancas-concrete.scraper.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/bancas-concrete.scraper.ts)

A aplicação possui parsers dedicados que interagem diretamente com os murais oficiais das bancas examinadoras:

| Plataforma / Banca | URL de Consulta | Mecanismo de Parsing |
| :--- | :--- | :--- |
| **Plataforma Selecao.net**<br>*(Fundep, Access, IBFC, Selecon)* | `{baseUrl}/index/abertos/` e fallback em `{baseUrl}` | Itera sobre links de informações `a[href*="/informacoes/"]`. Extrai containers pais (`li`, `.card`, `.item`), isola texto do órgão, vagas imediatas e formato Cadastro de Reserva (`\bCR\b`). Transforma caminhos relativos em URLs absolutas HTTPS. |
| **Plataforma Gestor Editais**<br>*(Idecan e Ibade)* | `{baseUrl}/edital/index/abertos` ou `{baseUrl}/edital` | Localiza links de visualização de edital `a[href*="/edital/ver/"]`. Extrai contêiner tabular (`tr`, `.card`), higieniza o título e valida temporalidade via `isResultCurrent`. |
| **Instituto Consulplan** | `institutoconsulplan.org.br/Concursos` | Localiza cartões `.card.custom-card` (evitando duplicações em `.card-body`), extrai link de inscrição e segrega nome do órgão removendo termos como *"Concurso"* ou *"Processo Seletivo"*. |
| **Fundação CEFETMINAS** | `concurso.fundacaocefetminas.org.br/site/processo_seletivo.aspx` | Localiza cartões `.col-flex-card`, identifica links de processo seletivo e regex de inscrição (`Inscrição: dd/mm a dd/mm`). |
| **FGV Conhecimento** | `conhecimento.fgv.br/concursos` | Localiza `.view-concursos-em-andamento .views-row a[href]`. Limpa prefixos redundantes como *"Concurso Público para"* e categoriza a UF. |
| **Fundação Carlos Chagas (FCC)** | `concursosfcc.com.br/concursoAndamento.html` | Extrai links `a[href*="/concursos/"]` apontando para `index.html`. Valida relevância temporal e padroniza títulos. |
| **Fundatec** | `fundatec.org.br/portal/concursos/concursos_abertos.php` | Itera sobre `a[href*="index_concursos.php"]`, extrai texto e link oficial com resolução de URLs relativas. |

---

### 3.3. Motores de Descoberta Web & Apuração Jornalística
Módulos: [`src/main/modules/search/duckduckgo.scraper.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/duckduckgo.scraper.ts), [`src/main/modules/news/sitemap-rss.scraper.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/news/sitemap-rss.scraper.ts)

Para certames em fases preliminares (Previstos, Comissões Formadas, Autorizados ou Estudos Técnicos), o motor utiliza inteligência de descoberta web:

1. **DuckDuckGo HTML & Lite Engine**:
   - Requisição direta via endpoints limpos `https://html.duckduckgo.com/html/` e fallback para `https://lite.duckduckgo.com/lite/`.
   - Utiliza parâmetros `kl=br-pt` e constrói consultas ricas com operadores dork booleanos.
   - Decodifica links através do parâmetro `uddg` para obter o endereço real do site de origem sem passar por redirecionamento rastreado.
2. **Google News RSS Search**:
   - Disparado exclusivamente quando o usuário pesquisa um órgão específico (ex: *"Receita Federal"*, *"TJMG"*).
   - Consulta `https://news.google.com/rss/search?q={query}+concurso&hl=pt-BR&gl=BR&ceid=BR:pt-419`.
   - **Decodificação de URL Real**: utiliza o extrator [`decodeGoogleNewsUrl`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/url-resolver.ts) para ler a string Base64 oculta no token `CBMi` dos links do Google News, evitando erros 404 e apontando diretamente para o portal da matéria.
3. **Sitemaps XML & Feeds RSS em Tempo Real**:
   - Sitemap de Notícias do Ache Concursos (`sm-news.xml` com filtros para descartar matérias de loterias ou benefícios sociais).
   - Feeds RSS do Gran Cursos Online (`/feed/`), Concursos no Brasil (`/feed/`) e Selecon (`/concursos/feed/`).

---

### 3.4. Camada de Proteção de Dados, Anonimização LGPD & Privacidade de Rede
Módulos: [`src/shared/utils/anonymizer.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/shared/utils/anonymizer.ts), [`src/main/modules/privacy/network-privacy.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/privacy/network-privacy.ts)

Para resguardar os direitos fundamentais de privacidade do usuário e cumprir a legislação de proteção de dados (Lei 13.709/2018 - LGPD):

1. **Higienização Pré-Consulta de PII (Art. 6º, III e Art. 46 LGPD):**
   - Antes de qualquer consulta externa a motores de busca ou agregadores, o método `validateAndSanitizeSearchFilter` audita o termo digitado.
   - Padrões de dados pessoais (CPFs formatados ou numéricos, RGs, endereços de e-mail e números de telefone) são interceptados. Se o usuário digitar exclusivamente um dado pessoal sensível, a consulta é bloqueada com aviso pedagógico amigável sem registrar qualquer vestígio no banco de dados.
   - Textos destinados ao histórico local ou logs do sistema passam pela função `anonymizeText()`, aplicando máscaras irreversíveis (`[CPF_OCULTO]`, `[EMAIL_OCULTO]`, etc.).
2. **Privacidade de Transporte de Rede (Network Privacy):**
   - **Túnel de Proxy Seguro:** Suporte opcional a proxies HTTP/HTTPS/SOCKS via `ProxyAgent` da biblioteca `undici`, mascarando o IP de origem do usuário em consultas de scraping.
   - **Cabeçalho Global Privacy Control (Sec-GPC):** Emissão ativa de `Sec-GPC: 1` e `DNT: 1` em todas as requisições HTTP enviadas aos portais e agregadores.
   - **Rotação de User-Agent:** Rotação controlada de cabeçalhos User-Agent entre versões recentes de navegadores desktop legítimos para prevenir fingerprinting e mitigar bloqueios de taxa (*rate limiting*).
3. **Indexação Determinística de Cache (`busca_cache`):**
   - Utiliza o módulo [`src/main/modules/search/search-cache-service.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/search-cache-service.ts) para gerar uma chave composta determinística (`search:hash(termo:area:uf:status)`), reaproveitando resultados idênticos em menos de 10ms sem sobrecarregar as redes das bancas examinadoras.

---

## 4. Técnicas de Resiliência de Rede & Anti-Alucinação

### 4.1. Transporte com `fetchHtmlWithSafety`
- **Timeout Garantido**: timeout padrão de 6.000ms gerenciado via `AbortController`. O timer é cancelado incondicionalmente no bloco `finally`.
- **Prevenção de Esgotamento de Memória (DoS/OOM)**: verifica o cabeçalho `Content-Type`. Se for binário (PDF, ZIP, EXE), rejeita o download. Limita payloads a 2 MB (`MAX_BYTES = 2 * 1024 * 1024`).
- **Resiliência por Falha Isolada**: todos os scrapers são combinados através de `Promise.allSettled`. A lentidão ou indisponibilidade pontual de um servidor não bloqueia os demais.

### 4.2. Normalização e Higienização de URLs
- **Remoção de Trackers**: exclusão sistemática de parâmetros de telemetria de marketing (`utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, `gclid`, `_ga`, etc.).
- **Forçagem de HTTPS**: todas as URLs com protocolo `http://` são promovidas para `https://` seguro.
- **IDs Canônicos Determinísticos**: IDs são gerados via hash determinístico SHA-256 (`generateCanonicalId(url, prefixo)`), evitando duplicatas no banco SQLite e na UI.

### 4.3. Filtro Temporal Estrito (`isResultCurrent`)
- Valida se a publicação ou o snippet cita explicitamente o ano vigente (`2026`), o ano base (`2025`) ou expressões indicativas de novos certames (`"novo concurso"`, `"previsto"`, `"comissão"`, `"autorizado"`).
- Se o texto coincidir com padrões de encerramento antigo (`"resultado final 2021"`, `"homologado em 2022"`, `"gabarito oficial 2023"`), o resultado é descartado sumariamente.

---

## 5. Lista Completa de Bancas Organizadoras Monitoradas

O InfoConcursos possui 19 bancas examinadoras catalogadas em seu registro oficial ([`src/shared/constants/sources-registry.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/shared/constants/sources-registry.ts)), com regex matchers e mapeamento de subdomínios de editais:

### 5.1. Minas Gerais & Regionais (Foco Principal em MG / RMBH / Sudeste)

| ID | Nome da Banca | Sigla | Domínio Base | Subdomínios de Editais / Inscrições | Tipo de Coleta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `fundep` | Fundep (Gestão de Concursos - UFMG) | Fundep | `gestaodeconcursos.com.br` | `https://fundep.selecao.net.br`<br>`https://www.gestaodeconcursos.com.br/site/site/default.aspx` | Scraper Direto (Selecao.net) + Dork |
| `fumarc` | FUMARC (Fundação Mariana Resende Costa) | FUMARC | `fumarc.com.br` | `https://www.fumarc.com.br/concursos`<br>`https://www.fumarc.com.br/SitePages/Home.aspx` | Dork Especializada + Sitemap |
| `consulplan` | Instituto Consulplan | Consulplan | `institutoconsulplan.org.br` | `https://www.institutoconsulplan.org.br/Concursos` | Scraper Direto HTML + Sitemap |
| `ibgp` | IBGP Concursos | IBGP | `ibgpconcursos.com.br` | `https://novo.ibgpconcursos.com.br/inscricoes_abertas.jsp`<br>`https://novo.ibgpconcursos.com.br/proximos.jsp` | Dork Especializada + Regex |
| `funcefet` | Fundação CEFETMINAS (FUNCEFET) | FUNCEFET | `fundacaocefetminas.org.br` | `https://concurso.fundacaocefetminas.org.br/site/processo_seletivo.aspx`<br>`https://fundacaocefetminas.org.br/concursos-e-processos-seletivos/` | Scraper Direto HTML + Sitemap |
| `jcm` | JCM Concursos | JCM | `jcmconcursos.com.br` | `http://www.jcmconcursos.com.br` | Dork Especializada + Regex |
| `ibam` | IBAM Concursos (Inst. Bras. Adm. Municipal) | IBAM | `ibamconcursos.org.br` | `https://www.ibamconcursos.org.br` | Dork Especializada + Regex |

---

### 5.2. Grandes Bancas Nacionais Tradicionais

| ID | Nome da Banca | Sigla | Domínio Base | Subdomínios de Editais / Inscrições | Tipo de Coleta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cebraspe` | Cebraspe (antigo Cespe / UnB) | Cebraspe | `cebraspe.org.br` | `https://www.cebraspe.org.br/concursos/inscricoes-abertas/`<br>`https://www.cebraspe.org.br/concursos/novos`<br>`https://www.cebraspe.org.br/concursos/em-andamento/` | Dork Especializada + Regex |
| `fgv` | FGV Conhecimento (Fundação Getulio Vargas) | FGV | `conhecimento.fgv.br` | `https://conhecimento.fgv.br/concursos` | Scraper Direto HTML + Sitemap |
| `fcc` | Fundação Carlos Chagas | FCC | `concursosfcc.com.br` | `https://www.concursosfcc.com.br/concursoAndamento.html` | Scraper Direto HTML |
| `cesgranrio` | Fundação Cesgranrio | Cesgranrio | `cesgranrio.org.br` | `https://www.cesgranrio.org.br/concursos/`<br>`https://concursos.cesgranrio.org.br` | Dork Especializada + Sitemap |
| `ibfc` | IBFC (Inst. Brasileiro de Formação e Capacitação) | IBFC | `ibfc.org.br` | `https://ibfc.selecao.net.br/index/abertos/`<br>`https://ibfc.selecao.net.br/index/1/` | Scraper Direto (Selecao.net) + Dork |
| `vunesp` | Fundação Vunesp | Vunesp | `vunesp.com.br` | `https://www.vunesp.com.br/busca/concurso/inscricoes%20abertas`<br>`https://www.vunesp.com.br/busca/concurso/proximo` | Dork Especializada + Sitemap |
| `selecon` | Instituto Selecon | Selecon | `selecon.org.br` | `https://selecon.org.br/concursos/`<br>`https://selecon.selecao.net.br`<br>`https://selecon-mt.selecao.net.br` | Scraper Direto (Selecao.net) + Feed RSS |

---

### 5.3. Outras Bancas Nacionais de Médio / Grande Porte

| ID | Nome da Banca | Sigla | Domínio Base | Subdomínios de Editais / Inscrições | Tipo de Coleta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `idecan` | Instituto Idecan | Idecan | `idecan.org.br` | `https://portal.concursos.idecan.org.br/edital/index/abertos`<br>`https://portal.concursos.idecan.org.br/edital/index/futuros` | Scraper Direto (Gestor Editais) + Dork |
| `ibade` | Instituto Ibade | Ibade | `ibade.org.br` | `https://portal.ibade.selecao.site/edital`<br>`https://portal.ibade.selecao.site` | Scraper Direto (Gestor Editais) + Sitemap |
| `access` | Instituto Access | Access | `access.org.br` | `https://concursos.access.org.br/index/abertos/`<br>`https://concursos.access.org.br/index/7/` | Scraper Direto (Selecao.net) + Dork |
| `fundatec` | Fundatec | Fundatec | `fundatec.org.br` | `https://www.fundatec.org.br/portal/concursos/concursos_abertos.php`<br>`https://www.fundatec.org.br/portal/concursos/concursos_proximos.php` | Scraper Direto HTML |
| `iades` | IADES (Instituto Americano de Desenvolvimento) | IADES | `iades.com.br` | `https://www.iades.com.br/inscricao/?v=novo`<br>`https://www.iades.com.br/inscricao/?v=andamento` | Dork Especializada + Regex |

---

## 6. Lista Completa de Portais e Fontes Buscadas

Além das bancas examinadoras, o InfoConcursos monitora agregadores de editais e portais jornalísticos para cobertura de certames em andamento e previstos:

### 6.1. Portais Agregadores de Editais (Scraping Estruturado Concreto)

| Portal | Domínio | URLs e Rotas Utilizadas | Dados Coletados |
| :--- | :--- | :--- | :--- |
| **PCI Concursos** | `pciconcursos.com.br` | `https://www.pciconcursos.com.br/pesquisa/?p={query}&tipopesquisa=1`<br>`https://www.pciconcursos.com.br/concursos/sudeste/`<br>`https://www.pciconcursos.com.br/concursos/` | Órgão, cargo, escolaridade, número de vagas, faixa salarial, prazo final de inscrições e link da publicação oficial. |
| **Ache Concursos** | `acheconcursos.com.br` | `https://www.acheconcursos.com.br/concursos-minas-gerais`<br>`https://www.acheconcursos.com.br/concursos-abertos` | Título do certame, nível de escolaridade, quantitativo de vagas, teto salarial e data limite de inscrição. |
| **Concursos no Brasil** | `concursosnobrasil.com` | `https://concursosnobrasil.com/concursos/mg/`<br>`https://concursosnobrasil.com/concursos/br/` | Órgão promotor, link da seleção, total de vagas ofertadas e indicação estadual/nacional. |

### 6.2. Portais Jornalísticos & Feeds de Atualizações

| Fonte | Domínio | Endpoint / Feed | Finalidade no Sistema |
| :--- | :--- | :--- | :--- |
| **Gran Cursos Online** | `blog.grancursosonline.com.br` | `https://blog.grancursosonline.com.br/feed/` (RSS XML) | Notícias imediatas sobre comissões formadas, portarias de autorização e contratação de bancas. |
| **Concursos no Brasil (Feed)** | `concursosnobrasil.com` | `https://concursosnobrasil.com/feed/` (RSS XML) | Feed em tempo real de publicações e editais estaduais/nacionais. |
| **Ache Concursos (Sitemap News)** | `acheconcursos.com.br` | `https://www.acheconcursos.com.br/sm-news.xml` (Google News XML) | Captura de notícias com carimbo ISO oficial para a aba de Notícias e Previstos. |
| **Folha Dirigida (Qconcursos)** | `folha.qconcursos.com` | `folha.qconcursos.com` via Dork e DuckDuckGo | Notícias especializadas e acompanhamento de órgãos da segurança pública e tribunais. |
| **Estratégia Concursos** | `estrategiaconcursos.com.br` | `estrategiaconcursos.com.br/blog` via Dork e DuckDuckGo | Apuração detalhada de salários reais, planos de cargos e comissões constituídas. |
| **Google News RSS Search** | `news.google.com` | `https://news.google.com/rss/search?q={query}+concurso&hl=pt-BR` | Cobertura jornalística instantânea para buscas específicas por nome de órgão público. |

### 6.3. Fontes Institucionais e Diários Oficiais

| Origem | Domínios Cobertos | Estratégia de Vinculação |
| :--- | :--- | :--- |
| **Portais Oficiais Governamentais** | `*.gov.br`, `*.jus.br`, `*.leg.br`, `*.mg.gov.br` | Construtor [`buildOfficialGovSearchUrl`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/url-resolver.ts) direciona o usuário para consultas no Diário Oficial e sítio do próprio órgão no dossiê de estudo. |

---

## 7. Referências de Código-Fonte

Para manutenção e auditoria do motor de buscas, consulte os arquivos no repositório:

- Orquestrador de Buscas e Dossiês: [`src/main/modules/dossier/dossier-generator.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/dossier/dossier-generator.ts)
- Higienização e Anonimização PII (LGPD): [`src/shared/utils/anonymizer.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/shared/utils/anonymizer.ts)
- Camada de Privacidade de Rede & Proxy: [`src/main/modules/privacy/network-privacy.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/privacy/network-privacy.ts)
- Sanitizador de Queries & Dorks: [`src/main/modules/search/query-sanitizer.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/query-sanitizer.ts)
- Scrapers Diretos de Bancas: [`src/main/modules/search/bancas-concrete.scraper.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/bancas-concrete.scraper.ts)
- Scrapers de Agregadores: [`src/main/modules/search/portals-concrete.scraper.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/portals-concrete.scraper.ts)
- Scraper DuckDuckGo: [`src/main/modules/search/duckduckgo.scraper.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/duckduckgo.scraper.ts)
- Feeds RSS e Google News: [`src/main/modules/news/sitemap-rss.scraper.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/news/sitemap-rss.scraper.ts)
- Resolução e Limpeza de URLs: [`src/main/modules/search/url-resolver.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/url-resolver.ts)
- Cliente HTTP Seguro: [`src/main/modules/search/http-client.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/http-client.ts)
- Registro de Fontes e Bancas: [`src/shared/constants/sources-registry.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/shared/constants/sources-registry.ts)
- Cache SQLite de Buscas: [`src/main/modules/search/search-cache-service.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/modules/search/search-cache-service.ts)
- Handlers IPC: [`src/main/ipc/handlers.ts`](file:///c:/Users/Dev/develop/infoconcursos/src/main/ipc/handlers.ts)
