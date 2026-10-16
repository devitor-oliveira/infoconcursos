# Fluxogramas Arquiteturais & Operacionais — InfoConcursos Desktop

Este documento reúne a especificação visual e os diagramas de fluxo do **InfoConcursos Desktop**, detalhando a jornada dos perfis de usuário, o motor invisível de buscas, a persistência no banco local SQLite e o ciclo de acompanhamento/notificações.

---

## 1. Fluxo do Usuário por Perfil de Acesso

Demonstra como cada tipo de concurseiro navega pela aplicação para atingir seu objetivo sem atritos:

```mermaid
flowchart TD
    Inicio(["Início / Abertura do App"]) --> PerfilDecision{"Qual o perfil do usuário?"}

    %% PERFIL A
    subgraph PerfilA ["Perfil 1: O Navegador / Explorador (Ainda não sabe qual concurso prestar)"]
        A1["Clica em pílulas de Área (ex: Tribunais, Policial, Fiscal, Bancária)"]
        A2["Filtra por Região/Estado (ex: SP, MG, Nacional) e Fase (Previstos/Abertos)"]
        A3["Ou navega na aba 'Notícias & Previstos' para ver movimentações do dia"]
        A4["Visualiza carrossel de concursos encontrados e clica na oportunidade desejada"]
        A5["Analisa o Dossiê de Estudo: requisitos, salários e matérias recomendadas"]
    end

    %% PERFIL B
    subgraph PerfilB ["Perfil 2: O Estudante Focado (Já estuda para órgão/concurso específico)"]
        B1["Digita o nome do órgão/concurso na barra (ex: 'Banco do Brasil', 'TRT MG')"]
        B2["Ou clica nas sugestões rápidas em destaque na barra de pesquisa"]
        B3["Lê o Dossiê em menos de 30 segundos: status atual, banca cotada e previsão de edital"]
        B4["Audita as matérias-base para direcionar os estudos da semana"]
        B5["Clica no botão 'Acompanhar este Concurso' para monitorar novidades"]
    end

    PerfilDecision -->|"Não sabe qual concurso"| A1
    PerfilDecision -->|"Já estuda ou tem foco"| B1

    A1 --> A2 --> A4 --> A5
    A3 --> A4
    B1 --> B3 --> B4 --> B5
    B2 --> B3

    A5 --> B5
    B5 --> FimAcompanhado(["Concurso salvo no SQLite para receber alertas de edital"])
```

---

## 2. Fluxo Atual das Buscas (Motor Invisível & Filtro Temporal)

Mapeia como a consulta do usuário é traduzida nos bastidores com âncoras temporais recentes (`2026`/`2025`), descarte de concursos antigos/homologados e consolidação do Dossiê:

```mermaid
flowchart TD
    subgraph UI ["1. Camada de Apresentação (Renderer)"]
        Input["Entrada do Usuário (ex: 'Banco do Brasil' ou Filtro 'Tribunais SP')"]
        Preload["Preload API (ipcRenderer.invoke 'discovery:search')"]
    end

    subgraph Sanitizacao ["2. Sanitização & Filtro Temporal Anti-Retroatividade"]
        QuerySanitizer["query-sanitizer.ts"]
        InjetaAncoras["Injeta âncoras temporais recentes (2026 / 2025)"]
        InjetaExclusoes["Injeta exclusão de editais velhos (-'resultado final 2021', -'2022')"]
    end

    subgraph Motores ["3. Motores de Coleta Direta (Sem Chaves / Custo Zero)"]
        CuratedEngine["Base Curada de Alta Precisão (BB, TRT-MG, PF, INSS, TJ-SP, SEFAZ-SP)"]
        DDGScraper["Scraper DuckDuckGo HTML/Lite (HTTP/2 residencial via Node.js)"]
        UrlResolver["url-resolver.ts: Decodifica URLs canônicas reais e limpa trackers"]
    end

    subgraph Validador ["4. Filtro de Obsolescência (isResultCurrent)"]
        CheckObsoleto{"O resultado menciona apenas editais antigos de 2021 a 2023?"}
        Descarte["Descarta resultado obsoleto"]
        Aprova["Aprova resultado recente / atual"]
    end

    subgraph Extratores ["5. Extração de Entidades & Síntese"]
        StatusDetector["status-detector.ts: Detecta Previsto, Comissão Formada, Autorizado ou Edital"]
        DateExtractor["date-extractor.ts: Normaliza cronograma e última movimentação"]
        SyllabusMatcher["syllabus-matcher.ts: Mapeia matérias recomendadas para estudo"]
        DossierBuilder["dossier-generator.ts: Monta o Dossiê Estruturado (< 30s)"]
    end

    Input --> Preload --> QuerySanitizer
    QuerySanitizer --> InjetaAncoras --> DDGScraper
    QuerySanitizer --> InjetaExclusoes --> DDGScraper
    DDGScraper --> UrlResolver --> CheckObsoleto

    CheckObsoleto -->|"Sim"| Descarte
    CheckObsoleto -->|"Não"| Aprova

    QuerySanitizer -.-> CuratedEngine
    CuratedEngine --> DossierBuilder
    Aprova --> StatusDetector
    Aprova --> DateExtractor
    Aprova --> SyllabusMatcher

    StatusDetector --> DossierBuilder
    DateExtractor --> DossierBuilder
    SyllabusMatcher --> DossierBuilder

    DossierBuilder --> RetornoUI["DossierCard exibido na UI com Links de Referência Oficiais"]
```

---

## 3. Fluxo de Armazenamento dos Resultados no SQLite Local

Apresenta a arquitetura de persistência descentralizada em arquivo binário no disco do usuário:

```mermaid
flowchart TD
    DossierGerado["Dossiê Estruturado Gerado / Busca Executada"] --> IPCMain["Handler IPC (src/main/ipc/handlers.ts)"]

    subgraph DatabaseLayer ["Camada de Persistência Local (SQLite + Drizzle ORM)"]
        DB["Instância SQLite em Memória (sql.js / Drizzle ORM)"]
        
        subgraph Tabelas ["Estrutura de Tabelas"]
            T1["historico_buscas: termo, área, UF, executado_em"]
            T2["concursos: id, orgao, status, resumo, dossier_json, atualizado_em"]
            T3["noticias: id, titulo, resumo, url, data, status"]
        end

        Warmup["Query de Warm-up inicial (garante transações < 10ms)"]
        ExportBuffer["sqliteInstance.export(): Serializa banco para Buffer binário"]
    end

    subgraph Disco ["Persistência Física no Disco do Usuário"]
        ArquivoDB["%APPDATA%/infoconcursos/infoconcursos.db"]
    end

    IPCMain -->|"insert / onConflictDoUpdate"| T1
    IPCMain -->|"insert / onConflictDoUpdate"| T2
    T1 --> DB
    T2 --> DB
    T3 --> DB
    DB --> Warmup
    DB --> ExportBuffer
    ExportBuffer -->|"fs.writeFileSync()"| ArquivoDB

    ArquivoDB -.->|"Carregamento automático ao reabrir o app"| DB
```

---

## 4. Fluxo de Acompanhamento, Verificação e Notificação

Detalhamento do ciclo de monitoramento ativo de concursos favoritados e emissão de alertas nativos do sistema:

```mermaid
flowchart TD
    subgraph AcaoUsuario ["1. Ação do Usuário"]
        BtnAcompanhar["Usuário clica em 'Acompanhar este Concurso' no Dossiê"]
    end

    subgraph Gravacao ["2. Registro do Acompanhamento"]
        SnapshotJSON["Captura o snapshot atual do Dossiê em JSON"]
        InsertMonitor["Insere registro na tabela 'monitoramentos' do SQLite"]
        UpdateUIState["Zustand Store atualiza badge e lista de acompanhamentos"]
    end

    subgraph Verificacao ["3. Rotina de Verificação de Atualizações"]
        Gatilho{"Como a verificação é disparada?"}
        Manual["Clique em 'Verificar Atualizações Agora'"]
        Background["Inicialização periódica do sistema"]
        ReExecSearch["Re-executa a busca para o termo monitorado"]
        NovoDossier["Gera a versão mais recente do Dossiê"]
    end

    subgraph Deteccao ["4. Detector de Mudanças (change-detector.ts)"]
        Diff{"Houve mudança entre Snapshot e Versão Atual?"}
        DiffStatus["Mudança de status (ex: de 'Previsto' para 'Edital Publicado')"]
        DiffLinks["Novos links ou notícias oficiais encontrados"]
        DiffBanca["Nova banca organizadora oficializada"]
    end

    subgraph Notificacao ["5. Notificação & Feedback"]
        AtualizaMonitor["Atualiza registro no SQLite com 'possui_novidade = true'"]
        BadgeUI["Exibe badge 'Novidade Identificada' no cartão"]
        Toast["Apresenta feedback explicativo na barra de status"]
        DesktopNotif["Dispara Notification nativa do Windows/SO"]
        SemNovidade["Mantém status atualizado e registra data/hora da última checagem"]
    end

    BtnAcompanhar --> SnapshotJSON --> InsertMonitor --> UpdateUIState
    UpdateUIState --> Gatilho

    Gatilho -->|"Ação manual"| Manual --> ReExecSearch
    Gatilho -->|"Automático"| Background --> ReExecSearch

    ReExecSearch --> NovoDossier --> Diff
    Diff -->|"Sim (Status)"| DiffStatus --> AtualizaMonitor
    Diff -->|"Sim (Links/Notícias)"| DiffLinks --> AtualizaMonitor
    Diff -->|"Sim (Banca)"| DiffBanca --> AtualizaMonitor
    Diff -->|"Não"| SemNovidade

    AtualizaMonitor --> BadgeUI
    AtualizaMonitor --> Toast
    AtualizaMonitor --> DesktopNotif
```
