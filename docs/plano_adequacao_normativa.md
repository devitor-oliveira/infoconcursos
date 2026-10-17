# Plano de Adequação às Novas Normas de Engenharia — InfoConcursos Desktop

> **Documento:** `docs/plano_adequacao_normativa.md`  
> **Status:** Em Vigor e Vinculante para as Próximas Etapas  
> **Referência Normativa Primária:** [`dev-agent.md`](../dev-agent.md)  
> **Versão de Referência:** 1.0.0  
> **Data:** 17 de Outubro de 2026  

---

## 📌 Sumário Executivo

Este documento consolida as análises diagnósticas, auditorias de código e pesquisas bibliográficas realizadas sobre a base de código do **InfoConcursos Desktop**. 

O objetivo é traçar um **mapa detalhado de adequação técnica**, identificando cada dívida técnica (*technical debt*), violação de princípios seminais (SRP, DRY, Fail-Safe Defaults) e fragilidade arquitetural encontrada no estado atual, definindo planos de ação cirúrgicos com base nas fontes e normas estipuladas no manual normativo [`dev-agent.md`](../dev-agent.md).

---

## 🔍 1. Diagnóstico Geral de Maturidade e Gaps Identificados

A tabela abaixo resume a auditoria de conformidade do projeto atual frente aos 10 pilares normativos de engenharia:

| Pilar Normativo | Status Atual | Grau de Criticidade | Localização Principal no Código |
| :--- | :---: | :---: | :--- |
| **1. Invariante Zero Fake Data** | ✅ Conforme | Baixo (Auditoria Contínua) | [`src/test/zero-fake-data.test.ts`](../src/test/zero-fake-data.test.ts) |
| **2. Isolamento Electron & IPC** | ✅ Conforme | Baixo (A+) | [`src/main/index.ts`](../src/main/index.ts), [`src/preload/index.ts`](../src/preload/index.ts) |
| **3. Criptografia em Repouso (AES-GCM)**| ✅ Conforme | Baixo | [`src/main/database/crypto-storage.ts`](../src/main/database/crypto-storage.ts) |
| **4. Versionamento de Banco de Dados** | ⚠️ Não Conforme | **CRÍTICO** | [`src/main/database/index.ts`](../src/main/database/index.ts#L64-L100) |
| **5. Tratamento de Erros de Rede** | ❌ Não Conforme | **ALTO** | [`src/main/modules/search/http-client.ts`](../src/main/modules/search/http-client.ts#L61-L63) |
| **6. Error Boundary no React 19** | ❌ Não Conforme | **ALTO** | [`src/renderer/src/main.tsx`](../src/renderer/src/main.tsx#L6-L10) |
| **7. Manipuladores Globais no Main** | ⚠️ Parcial | **MÉDIO** | [`src/main/index.ts`](../src/main/index.ts) |
| **8. Duplicação de Regras de Domínio (DRY)**| ❌ Não Conforme | **MÉDIO** | [`src/main/modules/news/pci.scraper.ts`](../src/main/modules/news/pci.scraper.ts#L8-L33) vs [`src/main/modules/dossier/status-detector.ts`](../src/main/modules/dossier/status-detector.ts) |
| **9. Centralização do Design System** | ⚠️ Parcial | **MÉDIO** | [`src/renderer/src/App.tsx`](../src/renderer/src/App.tsx#L80-L94) |
| **10. Atalhos Nativos de Desktop UX** | ⚠️ Parcial | **MÉDIO** | [`src/renderer/src/components/search/SearchBar.tsx`](../src/renderer/src/components/search/SearchBar.tsx) |

---

## 🛠️ 2. Análise Minuciosa das Dívidas Técnicas & Planos de Ação

---

### GAP 01: Ausência de Migrações Incrementais Versionadas no SQLite
* **Norma Violada:** *Evolutionary Database Design* (Pramod Sadalage & Martin Fowler, 2006).
* **Diagnóstico no Código:**
  Em [`src/main/database/index.ts`](../src/main/database/index.ts#L64-L100), o método `initDatabase()` executa uma sequência de comandos estáticos `CREATE TABLE IF NOT EXISTS`:
  ```typescript
  sqliteInstance.run(`
    CREATE TABLE IF NOT EXISTS concursos ( ... );
    CREATE TABLE IF NOT EXISTS monitoramentos ( ... );
    ...
  `)
  ```
  **Impacto:** Se uma coluna for adicionada ou alterada em uma versão futura (`v1.1.0`), o comando `CREATE TABLE IF NOT EXISTS` é ignorado porque a tabela já existe no disco do usuário. O aplicativo falhará em runtime ao tentar ler ou gravar campos inexistentes, quebrando a base instalada.
* **Plano de Adequação:**
  1. Configurar migrações formais utilizando o Drizzle Migrator (`drizzle-orm/sql-js/migrator`).
  2. Criar a pasta de migrações estruturada `src/main/database/migrations/` contendo arquivos delta SQL sequenciais (`0000_initial_schema.sql`, `0001_add_metadata.sql`).
  3. No `initDatabase()`, consultar a versão atual armazenada na tabela `sync_metadata` e aplicar apenas os deltas pendentes de forma atômica.

---

### GAP 02: Silenciamento Cego de Exceções de Rede
* **Norma Violada:** *Release It!* (Michael Nygard, 2018) & *Railway Oriented Programming* (Scott Wlaschin).
* **Diagnóstico no Código:**
  Em [`src/main/modules/search/http-client.ts`](../src/main/modules/search/http-client.ts#L61-L63):
  ```typescript
  } catch {
    return null
  }
  ```
  **Impacto:** Qualquer falha — seja timeout de 6s (`AbortError`), bloqueio por Cloudflare/WAF (403), limite de requisições excedido (429), queda de DNS (`ENOTFOUND`) ou certificado inválido — é mascarada e tratada indistintamente como `null`. O motor de busca não consegue distinguir um site fora do ar de um bloqueio temporário, impossibilitando a operação de *Circuit Breakers*.
* **Plano de Adequação:**
  1. Substituir o retorno binário `FetchResult | null` pelo padrão `Result<FetchResult, NetworkError>`:
     ```typescript
     export type NetworkErrorReason =
       | 'TIMEOUT'
       | 'RATE_LIMITED'
       | 'BLOCKED_OR_FORBIDDEN'
       | 'DNS_RESOLUTION_FAILED'
       | 'INVALID_CONTENT_TYPE'
       | 'PAYLOAD_OVERFLOW'
       | 'UNEXPECTED_FAILURE'

     export interface NetworkError {
       reason: NetworkErrorReason
       url: string
       statusCode?: number
       message: string
     }
     ```
  2. Implementar módulo de *Circuit Breaker* em memória que desativa temporariamente scrapers que acumulam 3 falhas consecutivas de `RATE_LIMITED` ou `TIMEOUT`.

---

### GAP 03: Ausência de Error Boundary na Interface React 19
* **Norma Violada:** *React 19 Error Handling Best Practices* (react.dev) & *Fail-Safe Defaults* (Nygard).
* **Diagnóstico no Código:**
  Em [`src/renderer/src/main.tsx`](../src/renderer/src/main.tsx):
  ```tsx
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  ```
  **Impacto:** Se qualquer componente filho lançar uma exceção não tratada durante o ciclo de renderização (ex: parsing de data malformada de um edital ou falha de acesso a propriedade indefinida em dossiê), o React 19 desmonta toda a árvore de nós. O usuário é deixado diante de uma janela completamente preta/branca, sem qualquer indicação de erro ou botão de recuperação.
* **Plano de Adequação:**
  1. Criar o componente [`src/renderer/src/components/AppErrorBoundary.tsx`](../src/renderer/src/components/AppErrorBoundary.tsx).
  2. Renderizar uma tela de contingência no padrão editorial suíço (*Swiss Monocle*), contendo:
     - Notificação clara da anomalia interceptada.
     - Botão primário para "Restaurar Visualização Segura" (limpando o cache de renderização).
     - Botão secundário para "Copiar Relatório de Erro Anonimizado".
  3. Envolver `<App />` com `<AppErrorBoundary>` no `main.tsx`.

---

### GAP 04: Duplicação Flagrante de Lógica de Inferência de Negócio (Violação DRY)
* **Norma Violada:** *The Pragmatic Programmer* (Andrew Hunt & David Thomas) & *Refactoring* (Martin Fowler).
* **Diagnóstico no Código:**
  - Em [`src/main/modules/news/pci.scraper.ts`](../src/main/modules/news/pci.scraper.ts#L8-L33), existem as funções locais:
    - `inferAreaFromText(text: string): ConcursoArea`
    - `inferStatusFromText(text: string): ConcursoStatus`
    - `inferUfFromText(text: string): string`
  - Paralelamente, em [`src/main/modules/dossier/status-detector.ts`](../src/main/modules/dossier/status-detector.ts#L19-L58), existe a função madura e imune a falsas negações:
    - `detectConcursoStatusAndBanca(texts: string[]): DetectedStatusInfo`
  - E em [`src/shared/constants/areas.ts`](../src/shared/constants/areas.ts) existem as áreas canônicas.
  **Impacto:** Duplicação direta de lógica de domínio. Regras de regex e identificadores de status estão bifurcados. Uma melhoria feita na detecção de status de dossiês não se reflete nas notícias de concursos, criando divergências visuais para o usuário final.
* **Plano de Adequação:**
  1. Extrair e unificar as heurísticas de área, status e UF em um módulo compartilhado de autoridade única: [`src/shared/utils/domain-inferer.ts`](../src/shared/utils/domain-inferer.ts) ou centralizar em `status-detector.ts`.
  2. Refatorar `pci.scraper.ts` para importar e consumir estritamente as funções canônicas compartilhadas, eliminando o código duplicado.

---

### GAP 05: Falta de Captura Global de Falhas no Processo Main
* **Norma Violada:** *OSDI 2014 Crash-Consistent Applications* (Pillai et al.) & *Node.js Process Lifecycle*.
* **Diagnóstico no Código:**
  Em [`src/main/index.ts`](../src/main/index.ts), não há registro de *listeners* para `process.on('uncaughtException')` ou `process.on('unhandledRejection')`.
  **Impacto:** No Node.js moderno, uma rejeição de Promise não capturada ou erro assíncrono não interceptado encerra o processo Node. Se isso ocorrer enquanto o banco SQLite possui transações em memória não persistidas, o arquivo em repouso pode ficar desatualizado ou o descritor temporário `.tmp` pode permanecer órfão em disco.
* **Plano de Adequação:**
  1. Injetar manipuladores globais em `src/main/index.ts`:
     ```typescript
     process.on('uncaughtException', (error) => {
       console.error('[Main] Exceção crítica não tratada:', anonymizeText(error.stack || error.message, 'LOG_OUTPUT'))
       try { closeDatabase() } catch {}
       app.exit(1)
     })

     process.on('unhandledRejection', (reason) => {
       console.warn('[Main] Rejeição de Promise não capturada:', anonymizeText(String(reason), 'LOG_OUTPUT'))
     })
     ```

---

### GAP 06: Dispersão de Estilização Inline e Bypass do Design System
* **Norma Violada:** *Atomic Design* (Brad Frost) & *Single Source of Truth* (SSOT).
* **Diagnóstico no Código:**
  Em diversos trechos de telas, como no botão superior de fixação em [`src/renderer/src/App.tsx`](../src/renderer/src/App.tsx#L87-L93):
  ```tsx
  className="fixed top-0 left-4 sm:left-6 z-50 px-3 py-1 bg-[#1B1A1B]/95 hover:bg-[#262527] border-b border-x border-[#E5D5B3]/25 rounded-b-lg text-xs font-label-sm text-[#E5D5B3] hover:text-[#FFFCF2] flex items-center gap-2 shadow-2xl transition-all cursor-pointer group backdrop-blur-md"
  ```
  **Impacto:** Classes e tokens de cor definidos "no olho" inline no JSX em vez de instanciar os átomos `<Button>` ou tokens de [`colors.ts`](../src/renderer/src/components/ds/tokens/colors.ts). Dificulta refatorações visuais globais e quebra a consistência do Design System.
* **Plano de Adequação:**
  1. Revisar os arquivos de páginas (`App.tsx`, `NewsPage.tsx`, `DossierPage.tsx`, `MonitoringPage.tsx`, `SettingsPage.tsx`).
  2. Substituir todas as tags `<button>` e `<input>` nativas pelos componentes `<Button>` e `<Input>` do Design System em `src/renderer/src/components/ds/`.

---

### GAP 07: Ausência de Atalhos Nativos de Teclado (Desktop-First UX)
* **Norma Violada:** *Microsoft Fluent Design Guidelines* & *Apple HIG para Desktop*.
* **Diagnóstico no Código:**
  A navegação atual depende quase exclusivamente de cliques do mouse. O usuário que pesquisa múltiplos certames precisa mover o cursor repetidamente até o campo de pesquisa.
* **Plano de Adequação:**
  1. Implementar hook customizado `useDesktopShortcuts`:
     - `Ctrl + K` / `/`: Focar instantaneamente no campo de busca (`SearchBar`).
     - `Escape`: Desfocar input de busca / Voltar da tela de dossiê para a listagem.
     - `F5` / `Ctrl + R`: Disparar atualização forçada (`checkUpdatesNow` / `forceRefresh`).
  2. Adicionar indicador visual de atalho no input de busca: `<kbd className="text-xs bg-[#1B1A1B] border border-[#E5D5B3]/20 px-1.5 py-0.5 rounded">Ctrl K</kbd>`.

---

## 📅 3. Cronograma de Execução e Priorização (Roadmap de Adequação)

O plano de ação está dividido em 3 ondas de execução conforme o risco arquitetural:

```mermaid
gantt
    title Cronograma de Adequação às Normas dev-agent.md
    dateFormat  YYYY-MM-DD
    section Onda 1: Estabilidade & Erros (Alta Prioridade)
    GAP 03: AppErrorBoundary no React 19     :crit, active, 2026-10-18, 1d
    GAP 02: Result Pattern no http-client     :crit, 2026-10-18, 2d
    GAP 05: Manipuladores Globais no Main    :2026-10-19, 1d
    section Onda 2: Arquitetura & DRY (Média Prioridade)
    GAP 04: Unificação de Inferência (SSOT)  :2026-10-20, 2d
    GAP 01: Migrações Versionadas SQLite     :2026-10-21, 3d
    section Onda 3: UX & Design System (Polimento)
    GAP 06: Centralização Total no DS        :2026-10-24, 2d
    GAP 07: Atalhos Globais de Teclado       :2026-10-25, 1d
```

---

## 📋 4. Matriz de Critérios de Aceitação e Definition of Done (DoD)

Para que qualquer adequação deste plano seja homologada, ela deve comprovar o atendimento cumulativo aos 6 itens da **Definition of Done**:

1. **[ ] Teste de Regressão Criado:** Todo gap corrigido possui teste automatizado em `src/test/` validando o comportamento semântico.
2. **[ ] Zero Fake Data Verificado:** Nenhuma estimativa alucinada ou dado sintético foi introduzido.
3. **[ ] Conformidade com a LGPD:** Todos os logs e persistências de novos métodos passam por anonimização via `anonymizer.ts`.
4. **[ ] Sem Bypasses de Tipos:** Ausência absoluta de `any`, `@ts-ignore` ou `@ts-expect-error`.
5. **[ ] Verificação Estática de Tipos Impecável:**
   ```bash
   npm run typecheck:node && npm run typecheck:web # Retorna código 0
   ```
6. **[ ] Suíte 100% Aprovada:**
   ```bash
   npm test # Todos os 80+ testes passam com sucesso
   ```

---

## 📌 Conclusão

Este plano de adequação transforma as constatações teóricas do manual [`dev-agent.md`](../dev-agent.md) em um roteiro de engenharia prático, auditável e rastreável. A partir deste momento, qualquer nova implementação no **InfoConcursos Desktop** será executada em estrita conformidade com estas diretrizes.
