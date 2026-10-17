# Fluxogramas Arquiteturais & Operacionais — InfoConcursos Desktop

Este documento reúne a especificação visual e os diagramas de fluxo do **InfoConcursos Desktop**, modelados segundo os padrões internacionais de arquitetura de software (**ISO/IEC/IEEE 42010** e **C4 Model** de Simon Brown).

Os diagramas cobrem desde as jornadas completas dos perfis de usuário até os fluxos internos de isolamento do Electron, higienização de termos de busca contra vazamentos de dados (LGPD), persistência criptográfica em repouso (`AES-256-GCM`) e detecção de novidades em certames públicos.

---

## 1. Visão de Contêineres e Fronteiras de Isolamento (C4 Model — Nível 2)

Mapeia a segregação de responsabilidades e as barreiras de privilégio entre os processos do **Electron 34**, a memória WebAssembly, o disco criptografado do usuário e a camada de transporte de rede:

```mermaid
flowchart TB
    User(["👤 Concurseiro / Estudante"])

    subgraph OSBoundary ["Ambiente do Sistema Operacional (Windows / macOS / Linux)"]
        
        subgraph RendererProcess ["Renderer Process (Privilégio Reduzido / Sandbox Ativo)"]
            UI["Interface Gráfica (React 19 + TailwindCSS)"]
            Store["Zustand Store (monitoringStore.ts)"]
            Pages["Páginas: NewsPage, Search/Dossier, Monitoring, Settings, PrivacyPolicy"]
            UI <--> Store
            Store <--> Pages
        end

        subgraph PreloadBoundary ["Fronteira de Isolamento Seguro (contextBridge)"]
            PreloadAPI["preload/index.ts: InfoConcursosApi (API Estrita e Tipada)"]
        end

        subgraph MainProcess ["Main Process (Node.js 24 Runtime / Alto Privilégio)"]
            IPCMain["IPC Handlers (src/main/ipc/handlers.ts)"]
            
            subgraph SearchDossierSubsys ["Módulo de Busca & Dossiês"]
                Anonymizer["anonymizer.ts (Higienização PII / LGPD)"]
                QuerySanitizer["query-sanitizer.ts (Âncoras 2026/2025)"]
                SearchCacheService["search-cache-service.ts"]
                DossierGen["dossier-generator.ts"]
            end

            subgraph ScrapersSubsys ["Motores de Coleta Resiliente"]
                NetPrivacy["network-privacy.ts (Proxy, Sec-GPC, UA Rotation)"]
                HttpClient["http-client.ts (AbortController 6s, Payload Limit 2MB)"]
                Scrapers["Concrete Scrapers (PCI, Ache, 11 Bancas, DDG Lite, News RSS)"]
                UrlResolver["url-resolver.ts (Decodificador Canônico e Anti-Tracking)"]
            end

            subgraph MonitoringSubsys ["Módulo de Monitoramento & News"]
                MonitorService["monitor-service.ts"]
                ChangeDetector["change-detector.ts"]
                NewsOrchestrator["news-orchestrator.ts"]
            end

            subgraph DatabaseSubsys ["Camada de Persistência Local-First"]
                DrizzleORM["Drizzle ORM (drizzle-orm/sql-js)"]
                SqlJsWasm["SQLite em Memória (sql.js WebAssembly)"]
                CryptoStorage["crypto-storage.ts (AES-256-GCM / INFOCENC)"]
            end
        end

        subgraph LocalDisk ["Armazenamento Não-Volátil no Disco Local (%APPDATA%)"]
            EncryptedDB[("infoconcursos.db (Criptografado AES-256-GCM)")]
            KeyFile[("infoconcursos.db.key (Chave Mestra)")]
            OSVault["Cofre Nativo do SO (safeStorage: DPAPI / Keychain / libsecret)"]
        end
    end

    subgraph ExternalWeb ["Internet Aberta (Custo Zero / Sem API Keys)"]
        Portais["Portais Oficiais (PCI Concursos, Ache Concursos, Concursos no Brasil)"]
        BancasWeb["Portais Oficiais das Bancas (Cebraspe, FGV, FCC, Vunesp, etc.)"]
        DDG["DuckDuckGo Lite HTML & Google News RSS"]
    end

    %% Ligações
    User <-->|"Interação visual e teclado"| UI
    Pages <-->|"Chamadas seguras"| PreloadAPI
    PreloadAPI <-->|"ipcRenderer.invoke / ipcMain.handle"| IPCMain

    IPCMain --> Anonymizer --> QuerySanitizer --> SearchCacheService
    SearchCacheService --> ScrapersSubsys
    ScrapersSubsys --> NetPrivacy --> HttpClient --> Scrapers --> Portais & BancasWeb & DDG
    Scrapers --> UrlResolver --> DossierGen

    IPCMain --> MonitorService --> ChangeDetector
    IPCMain --> NewsOrchestrator

    DossierGen & MonitorService & NewsOrchestrator <--> DrizzleORM <--> SqlJsWasm
    SqlJsWasm -->|"sqliteInstance.export()"| CryptoStorage
    CryptoStorage -->|"Gravação atômica (.tmp + fsync + rename)"| EncryptedDB
    CryptoStorage <--> KeyFile <--> OSVault
```

---

## 2. Jornada Completa do Usuário (5 Abas & Visualização de Dossiês)

Demonstra como o estudante navega pelas cinco abas editoriais e interage com os dossiês detalhados e ferramentas de privacidade:

```mermaid
flowchart TD
    AppStart(["Abertura do InfoConcursos Desktop"]) --> HeaderPin{"Estado do Header"}
    HeaderPin -->|"Fixado (Pinned)"| HeaderVis["Header Fixo no Topo com Navegação"]
    HeaderPin -->|"Retrátil (Unpinned)"| HeaderHover["Sensor de Hover no Topo revela a barra"]

    HeaderVis & HeaderHover --> NavTab{"Aba Selecionada"}

    %% ABA 1: FEED DE NOTÍCIAS
    subgraph TabNews ["1. Feed de Notícias (NewsPage)"]
        N1["Consome manchetes apuradas e atualizações do dia"]
        N2["Filtra por Área (ex: Tribunais) e/ou UF"]
        N3["Clica na matéria: abre link seguro no navegador padrão"]
        N4["Ou clica no concurso citado para gerar/abrir o Dossiê"]
    end

    %% ABA 2: BUSCA & DOSSIÊS
    subgraph TabDiscovery ["2. Busca & Dossiês (Search / Discovery)"]
        D1["Digita termo ou clica em Sugestão Rápida (ex: 'Banco do Brasil')"]
        D2["Aplica filtros combinados: Área, Região/UF e Fase (Abertos/Previstos)"]
        D3["Validação e higienização automática contra PII / dados sensíveis"]
        D4["Visualiza cards resumidos (DossierSummaryCard)"]
        D5["Clica no card: Transiciona para DossierPage completa"]
    end

    %% PÁGINA DEDICADA DE DOSSIÊ
    subgraph DossierPageView ["Visualizador Completo de Dossiê (DossierPage)"]
        DP1["Lê panorama executivo, status e previsão de edital (< 30s)"]
        DP2["Audita matérias-base de estudo (SubjectsGrid)"]
        DP3["Examina tabela de cargos, vagas e salários oficiais"]
        DP4["Acessa fontes e links canônicos com 1 clique (ReferenceLinks)"]
        DP5["Clica em 'Acompanhar este Concurso'"]
        DP6["Clica em 'Voltar': Retorna à pesquisa preservando o estado"]
    end

    %% ABA 3: ACOMPANHAMENTOS
    subgraph TabMonitoring ["3. Acompanhamentos (MonitoringPage)"]
        M1["Visualiza lista de certames monitorados salvos no SQLite"]
        M2["Badge 'Novidade Identificada' destaca mudanças recentes"]
        M3["Botão 'Verificar Atualizações Agora' checa novidades sob demanda"]
        M4["Clica no certame para reabrir seu dossiê atualizado"]
    end

    %% ABA 4: PRIVACIDADE & LGPD
    subgraph TabPrivacy ["4. Privacidade & Segurança (PrivacyPolicyPage)"]
        P1["Audita conformidade LGPD e status de Criptografia At-Rest (AES-256-GCM)"]
        P2["Configura Proxy de Rede (Undici ProxyAgent) e rotação de User-Agent"]
        P3["Ativa ou desativa cabeçalho Sec-GPC (Global Privacy Control)"]
        P4["Botão 'Eliminar Dados Locais': Expurgo com 1 clique (Art. 18, VI LGPD)"]
    end

    %% ABA 5: CONFIGURAÇÕES
    subgraph TabSettings ["5. Configurações (SettingsPage)"]
        S1["Consulta o Diretório Oficial de Bancas e Portais catalogados"]
        S2["Verifica status de conectividade e versão da aplicação"]
    end

    NavTab -->|"Feed de Notícias"| N1
    NavTab -->|"Busca & Dossiês"| D1
    NavTab -->|"Acompanhamentos"| M1
    NavTab -->|"Privacidade & LGPD"| P1
    NavTab -->|"Configurações"| S1

    N4 --> DP1
    D1 --> D2 --> D3 --> D4 --> D5 --> DP1
    DP5 --> M1
    DP6 --> D4
    M4 --> DP1
```

---

## 3. Pipeline Modernizado de Buscas e Proteção de Dados (LGPD + Anti-Retroatividade)

Mapeia a entrada da busca, a higienização de dados pessoais, o roteamento de cache e a execução concorrente de scrapers:

```mermaid
flowchart TD
    subgraph Entrada ["1. Entrada do Usuário"]
        InputTerm["Termo digitado (ex: 'TRT-3', 'Banco do Brasil') + Filtros"]
        IPCInv["ipcRenderer.invoke('discovery:search', filter, options)"]
    end

    subgraph ValidaPII ["2. Validação & Higienização LGPD (anonymizer.ts)"]
        CheckPII{"Contém CPF, RG, E-mail ou Nome de Candidato?"}
        BlockPII["Bloqueia busca imediata / Retorna warning sem persistir"]
        CleanTerm["Sanitiza e mascara dados sensíveis para persistência"]
    end

    subgraph CacheRoute ["3. Roteamento de Cache (Local-First)"]
        CheckForce{"options.forceRefresh == true?"}
        LookupCache["getCachedSearchResults(): Consulta busca_cache no SQLite"]
        CacheHit{"Resultados válidos em cache?"}
        ReturnCache["Retorna Dossiês do SQLite (< 10ms)"]
    end

    subgraph SanitizaQuery ["4. Sanitização & Injeção de Âncoras Temporais"]
        QuerySanitizer["query-sanitizer.ts"]
        InjectAnchors["Injeta âncoras temporais (2026 / 2025)"]
        InjectExclusions["Injeta exclusões estritas (-'resultado final 2021', -'2022', -'homologado')"]
    end

    subgraph TransporteSeguro ["5. Camada de Rede Segura (http-client.ts)"]
        NetPrivacyConfig["network-privacy.ts: Aplica Proxy (Undici), Sec-GPC e UA Hardened"]
        SafetyWrapper["fetchHtmlWithSafety(): AbortController 6000ms + Limite de 2MB"]
    end

    subgraph ScrapersExec ["6. Coleta Concorrente Resiliente (Promise.allSettled)"]
        P1["Portais: PCI Concursos, Ache Concursos, Concursos no Brasil"]
        P2["Bancas Diretas: FGV, Cebraspe, FCC, Vunesp, Idecan, etc."]
        P3["DuckDuckGo Lite HTML & Google News RSS"]
    end

    subgraph NormalizaFiltra ["7. Normalização & Filtro de Obsolescência"]
        UrlCleaner["url-resolver.ts: Decodifica URLs canônicas, limpa UTMs e trackers"]
        ObsolescenceFilter{"isResultCurrent(): O edital é recente (2025/2026/Previsto)?"}
        DiscardItem["Descarta resultado antigo/homologado"]
        AproveItem["Aprova item para síntese"]
    end

    subgraph SinteseDossier ["8. Extração de Entidades & Síntese (< 30s)"]
        ExtStatus["status-detector.ts: Normaliza Status (Previsto, Comissão, Edital)"]
        ExtDate["date-extractor.ts: Extrai Cronograma e Prazos"]
        ExtMat["syllabus-matcher.ts: Mapeia Matérias Recomendadas por Área"]
        GenDossier["dossier-generator.ts: Compila ConcursoDossier Estruturado"]
    end

    subgraph SalvaCache ["9. Persistência & Cache"]
        SaveCacheTable["Grava chaves e IDs em busca_cache e concursos"]
        SaveHistTable["Registra termo higienizado em historico_buscas"]
        ReturnUI["Entrega lista de ConcursoDossier à UI"]
    end

    InputTerm --> IPCInv --> CheckPII
    CheckPII -->|"Sim (Dados pessoais inválidos)"| BlockPII
    CheckPII -->|"Não (Termo público válido)"| CleanTerm --> CheckForce

    CheckForce -->|"Não"| LookupCache --> CacheHit
    CacheHit -->|"Sim"| ReturnCache
    CacheHit -->|"Não"| QuerySanitizer
    CheckForce -->|"Sim"| QuerySanitizer

    QuerySanitizer --> InjectAnchors --> InjectExclusions --> NetPrivacyConfig
    NetPrivacyConfig --> SafetyWrapper --> ScrapersExec
    ScrapersExec --> P1 & P2 & P3 --> UrlCleaner --> ObsolescenceFilter

    ObsolescenceFilter -->|"Antigo (2018-2023)"| DiscardItem
    ObsolescenceFilter -->|"Válido"| AproveItem --> ExtStatus & ExtDate & ExtMat --> GenDossier

    GenDossier --> SaveCacheTable --> SaveHistTable --> ReturnUI
```

---

## 4. Ciclo de Persistência em Repouso & Criptografia At-Rest

Apresenta o fluxo de gravação atômica, encriptação com `AES-256-GCM` e proteção da chave mestra via cofre de senhas do Sistema Operacional:

```mermaid
flowchart TD
    OperacaoBD["Operação de Escrita (Drizzle ORM: insert / update / delete)"] --> RunWasm["Execução em Memória WASM (SqlJsDatabase)"]
    RunWasm --> TriggerPersist["persistDatabaseToDisk() acionado"]

    subgraph ExportMemory ["1. Serialização da Memória WASM"]
        ExportBytes["sqliteInstance.export(): Gera Uint8Array binário puro"]
        PlainBuffer["Converte para Buffer Node.js"]
    end

    subgraph KeyResolution ["2. Resolução da Chave Mestra de 256 bits"]
        CheckSafeStorage{"safeStorage do Electron disponível? (DPAPI / Keychain)"}
        UseDPAPI["Lê ou gera chave protegida pelo cofre nativo do SO (.db.key)"]
        FallbackScrypt["Fallback: KDF scrypt memory-hard baseado em hash local do host"]
    end

    subgraph CriptografiaAEAD ["3. Criptografia Autenticada (crypto-storage.ts)"]
        GenIV["Gera IV criptográfico de 96 bits (12 bytes - NIST SP 800-38D)"]
        CipherAES["Cifra Buffer com AES-256-GCM"]
        AuthTag["Calcula Tag de Autenticação AEAD de 128 bits (16 bytes)"]
        PackPayload["Concatena: [Header Mágico 'INFOCENC' (8B)] + [IV (12B)] + [Tag (16B)] + [Ciphertext]"]
    end

    subgraph GravacaoAtomica ["4. Gravação Física Atômica (Resistente a Falhas de Energia)"]
        TempFile["Abre arquivo temporário '%APPDATA%/infoconcursos/infoconcursos.db.tmp'"]
        WriteTmp["fs.writeFileSync(fd, encryptedBuffer)"]
        FsyncSync["fs.fsyncSync(fd): Força descarga física para o hardware do disco"]
        CloseFd["fs.closeSync(fd)"]
        AtomicRename["fs.renameSync(tempPath, activeDbPath): Substituição atômica de namespace"]
    end

    subgraph DiscoFinal ["5. Arquivo Seguro em Repouso"]
        FinalDB[("%APPDATA%/infoconcursos/infoconcursos.db")]
    end

    TriggerPersist --> ExportBytes --> PlainBuffer
    PlainBuffer --> CheckSafeStorage
    CheckSafeStorage -->|"Sim"| UseDPAPI --> GenIV
    CheckSafeStorage -->|"Não"| FallbackScrypt --> GenIV

    GenIV --> CipherAES --> AuthTag --> PackPayload --> TempFile
    TempFile --> WriteTmp --> FsyncSync --> CloseFd --> AtomicRename --> FinalDB
```

---

## 5. Ciclo de Monitoramento Ativo e Detecção de Diffs

Detalhamento do monitoramento de certames favoritados e disparo de notificações no SO:

```mermaid
flowchart TD
    subgraph Favoritar ["1. Ação do Usuário"]
        ClickBtn["Clica em 'Acompanhar este Concurso' no Dossiê"]
        IPCAdd["ipcRenderer.invoke('monitor:toggle', dossier)"]
        SaveMonTable["Grava na tabela 'monitoramentos' com snapshot JSON do dossiê"]
        UpdateStore["monitoringStore atualiza estado e contador de badges"]
    end

    subgraph DisparoChecagem ["2. Disparo da Verificação"]
        TriggerType{"Origem do gatilho"}
        ManualClick["Clique manual em 'Verificar Atualizações Agora'"]
        AppWarmup["Inicialização em background da aplicação"]
    end

    subgraph ExecutaBusca ["3. Re-execução da Busca de Acompanhamento"]
        QuerySearch["Re-executa pipeline de busca com o termo monitorado"]
        FreshDossier["Gera a versão mais atualizada do ConcursoDossier"]
    end

    subgraph DetectorDiff ["4. Análise de Mudanças (change-detector.ts)"]
        Compare{"Houve divergência entre o Snapshot e o FreshDossier?"}
        DiffStatus["Status alterado (ex: 'Comissão Formada' -> 'Edital Publicado')"]
        DiffBanca["Banca examinadora definida ou alterada"]
        DiffDates["Novas datas de inscrição ou prova adicionadas"]
        DiffLinks["Novos editais, retificações ou comunicados oficiais encontrados"]
    end

    subgraph NotificacaoUI ["5. Atualização de Estado & Alertas"]
        FlagNovidade["Atualiza 'possui_novidade = true' e 'descricao_novidade' no SQLite"]
        PersistDisk["Persiste banco no disco local criptografado"]
        BadgeUI["Exibe badge visual dourado 'Novidade Identificada' no card"]
        NativeToast["Dispara Notification nativa do SO (Windows / macOS / Linux)"]
        NoChange["Atualiza 'ultima_verificacao' e mantém possui_novidade = false"]
    end

    ClickBtn --> IPCAdd --> SaveMonTable --> UpdateStore
    UpdateStore --> TriggerType

    TriggerType -->|"Manual"| ManualClick --> QuerySearch
    TriggerType -->|"Automático"| AppWarmup --> QuerySearch

    QuerySearch --> FreshDossier --> Compare
    Compare -->|"Sim (Status)"| DiffStatus --> FlagNovidade
    Compare -->|"Sim (Banca)"| DiffBanca --> FlagNovidade
    Compare -->|"Sim (Datas)"| DiffDates --> FlagNovidade
    Compare -->|"Sim (Links)"| DiffLinks --> FlagNovidade
    Compare -->|"Não"| NoChange

    FlagNovidade --> PersistDisk --> BadgeUI --> NativeToast
```

---

## 6. Ciclo de Vida da Aplicação, Poda de Cache & Expurgo LGPD

Mapeia a governança de dados na abertura e encerramento da aplicação:

```mermaid
flowchart TD
    AppLaunch(["Início do Processo Electron"]) --> InitDB["initDatabase(): Descriptografa e carrega banco para a memória WASM"]
    
    subgraph StartupWarmup ["1. Inicialização & Poda Automática (pruneExpiredCacheOnStartup)"]
        PruneTTL["1. Expira buscas com mais de 14 dias em busca_cache"]
        PruneDossiers["2. Remove da tabela 'concursos' dossiês > 14 dias NÃO monitorados (Local-First)"]
        RingHist["3. Aplica Ring-Buffer: Mantém no máximo 200 buscas recentes em historico_buscas"]
        RingNews["4. Aplica Ring-Buffer: Mantém no máximo 300 matérias em noticias"]
        CheckFreelist{"PRAGMA freelist_count > 16 páginas livres acumuladas?"}
        ExecVacuum["Executa VACUUM para compactar a memória WASM"]
        SkipVacuum["Ignora compactação"]
        WarmupQuery["Executa query de warm-up (garante queries subsequentes < 10ms)"]
    end

    subgraph AcoesUsuario ["2. Operação Normal ou Exercício de Direitos LGPD"]
        AppRunning["Aplicação em Execução"]
        BtnPurge["Usuário clica em 'Eliminar Todos os Dados Locais' (Art. 18 LGPD)"]
        ExecPurge["purgeLocalCacheAndHistory(): Limpa buscas, histórico, notícias e certames não monitorados + VACUUM"]
    end

    subgraph Encerramento ["3. Encerramento Gracioso"]
        WindowAllClosed["Evento 'window-all-closed'"]
        CloseDatabase["closeDatabase(): Salva última versão cifrada no disco e desaloca memória WASM"]
        AppQuit(["Aplicação Finalizada"])
    end

    InitDB --> PruneTTL --> PruneDossiers --> RingHist --> RingNews --> CheckFreelist
    CheckFreelist -->|"Sim"| ExecVacuum --> WarmupQuery
    CheckFreelist -->|"Não"| SkipVacuum --> WarmupQuery
    WarmupQuery --> AppRunning

    AppRunning --> BtnPurge --> ExecPurge --> AppRunning
    AppRunning --> WindowAllClosed --> CloseDatabase --> AppQuit
```
