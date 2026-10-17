# Changelog — InfoConcursos Desktop

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico (SemVer 2.0.0)](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2026-10-17

### 🚀 Destaques do Lançamento
Primeira versão de produção estável (**v1.0.0**) da plataforma desktop de inteligência, descoberta editorial e monitoramento estratégico de certames públicos, concebida sob o prisma arquitetural *Local-First*, com custo zero de infraestrutura e integridade documental *Zero Fake Data*.

### ✨ Adicionado
- **Segurança em Repouso (AES-256-GCM):** Criptografia autenticada do banco local SQLite (`infoconcursos.db`) com chave mestra via cofre nativo do SO (`safeStorage` / DPAPI no Windows / Keychain no macOS) e fallback determinístico via KDF `scrypt` (RFC 7914).
- **Conformidade Estrita com a LGPD (Lei nº 13.709/2018):**
  - Sanitização ativa em 4 contextos (*Search Input*, *Scraped Text*, *Log Output*, *Database Persistence*) expurgando CPFs, e-mails, registros de candidatos e dados de usuários do Windows.
  - Canal IPC `privacy:clearLocalData` para direito à eliminação efetiva de dados (Art. 18, VI da LGPD).
  - Suporte a Proxy HTTP/HTTPS nativo via Chromium (`session.defaultSession.setProxy`) e envio de cabeçalhos `Sec-GPC: 1` e `DNT: 1`.
- **Feed Editorial & Radar de Concursos:**
  - Layout *Swiss Monocle Editorial Dark* (paleta 60-30-10 e tipografia dual *Newsreader* + *Inter*).
  - Manchete principal (*Lead Story*), linha do tempo de atualizações ao vivo e pauta linear segregando *Atos Oficiais Concretos* de *Apurações Jornalísticas*.
  - Header fixo e retrátil inteligente com sensor de aproximação (*Fitts's Law*).
- **Motor de Buscas & Dossiês Analíticos:**
  - Mapeamento e scraping concreto de 19 bancas examinadoras e 6 portais de editais (PCI Concursos, Ache Concursos, Concursos no Brasil, murais mineiros e plataformas Selecao.net/Gestor).
  - Injeção de âncoras temporais dinâmicas ($N$, $N-1$) e descarte determinístico de editais obsoletos de anos anteriores.
  - Página dedicada de dossiê estruturado com métricas centrais, cronograma factual, cargos e matriz de matérias curriculares (`SubjectsGrid`).
- **Radar Pessoal de Acompanhamento:**
  - Favoritamento e monitoramento contínuo de certames no SQLite com verificação de novidades em 1 clique (`monitor:checkNow`).
- **Suíte de Testes Automatizados (80 Testes Herméticos):**
  - Testes com fixtures autênticas de HTML/XML, sem chamadas à internet e banco SQLite 100% em memória (`:memory:`).
  - Auditoria contínua da política *Zero Fake Data* via `zero-fake-data.test.ts`.
- **Documentação Normativa e de Engenharia:**
  - [`dev-agent.md`](./dev-agent.md): Manual normativo e perpétuo para desenvolvimento e agentes de IA.
  - [`docs/plano_adequacao_normativa.md`](./docs/plano_adequacao_normativa.md): Mapeamento de dívidas técnicas e cronograma de adequação às normas.
  - [`docs/auditoria_seguranca.md`](./docs/auditoria_seguranca.md), [`docs/regras_testes_ia.md`](./docs/regras_testes_ia.md), [`docs/guia_criacao_testes.md`](./docs/guia_criacao_testes.md), [`docs/buscas_e_scraping.md`](./docs/buscas_e_scraping.md).
- **Pipeline de Distribuição Segregada:**
  - Script [`scripts/organize-dist.js`](./scripts/organize-dist.js) direcionando automaticamente o instalador NSIS para `dist/producao/` e executáveis portáteis para `dist/testes/`.

### 🔧 Alterado
- Refatoração do módulo de transporte de rede ([`network-privacy.ts`](./src/main/modules/privacy/network-privacy.ts)): remoção completa da biblioteca `undici` em favor do proxy nativo do Electron/Chromium, reduzindo o bundle compilado do processo principal de 1.150 kB para 130 kB e eliminando a dependência do `node:sqlite`.
- Endurecimento do comando de compilação em [`package.json`](./package.json): inclusão mandatória de `npm test` antes do empacotamento com `electron-builder`.

### 🛡️ Segurança
- Sandbox estrito e isolamento de contexto no Electron 34 (`sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webviewTag: false`).
- Negação explícita de requisições de permissões nativas de microfone, câmera e geolocalização.
- Restrição estrita de navegação externa: apenas links `https:` são delegados ao navegador padrão do sistema operacional via `shell.openExternal`.
