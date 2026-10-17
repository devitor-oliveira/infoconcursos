# InfoConcursos 🏛️

> **Nota de Origem:** Este aplicativo é **vibecodado**! Desenvolvido com foco em auxiliar no acompanhamento e monitoramento estratégico de concursos públicos, reunindo editais concretos, movimentações oficiais e dossiês de estudo em uma experiência desktop fluida, moderna e sem ruído.

---

<p align="left">
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-34.x-47848F?style=flat&logo=electron&logoColor=white" height="20" alt="Electron" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.x-61DAFB?style=flat&logo=react&logoColor=black" height="20" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white" height="20" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat&logo=tailwindcss&logoColor=white" height="20" alt="Tailwind CSS" /></a>
  <a href="https://www.sqlite.org/"><img src="https://img.shields.io/badge/SQLite-Local_Cache-003B57?style=flat&logo=sqlite&logoColor=white" height="20" alt="SQLite" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Tests-42%20passed-6E9F18?style=flat&logo=vitest&logoColor=white" height="20" alt="Vitest" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat" height="20" alt="License: MIT" /></a>
</p>

---

## 📌 Sumário

1. [Sobre o Projeto](#-sobre-o-projeto)
2. [Principais Funcionalidades](#-principais-funcionalidades)
3. [Diretriz "Zero Fake Data" & Veracidade](#-diretriz-zero-fake-data--veracidade)
4. [Design System & Interface](#-design-system--interface)
5. [Tecnologias Utilizadas](#-tecnologias-utilizadas)
6. [Instalação e Execução Local](#-instalação-e-execução-local)
7. [Geração dos Binários de Produção (Windows)](#-geração-dos-binários-de-produção-windows)
8. [Suíte de Testes Automatizados](#-suíte-de-testes-automatizados)
9. [Estrutura de Diretórios](#-estrutura-de-diretórios)
10. [Licença](#-licença)

---

## 🎯 Sobre o Projeto

O **InfoConcursos** nasceu para resolver um problema recorrente de concurseiros e pesquisadores: a sobrecarga de páginas com anúncios invasivos, títulos sensacionalistas e desinformação sobre prazos e salários.

Com inspiração na estética editorial suíça (*Swiss Monocle*), o aplicativo atua como uma redação analítica e radar pessoal:
- Coleta atos oficiais diretamente de portais de editais, feeds RSS/Sitemaps e páginas de bancas organizadoras.
- Diferencia claramente **editais concretos publicados** de meras **apurações e previsões**.
- Opera em modo **Cache-First (SQLite Local)**: dados já consultados abrem instantaneamente e não consomem internet à toa.
- Fornece **dossiês analíticos dinâmicos** estruturados com remuneração real, cronograma factual, cargos e matriz de matérias nucleares.

---

## ✨ Principais Funcionalidades

### 1. 📰 Feed Editorial de Notícias & Atos Oficiais
- **Manchete Principal (Lead Story):** Destaque visual imponente para o concurso de maior relevância recente, com metadados estruturados (Órgão, Remuneração, Prazos e Vagas).
- **Radar de Atualizações Ao Vivo:** Linha do tempo vertical com as últimas movimentações apuradas.
- **Filtros por Carreira & Jurisdição:** Navegação rápida por Tribunais, Setor Bancário, Fiscal/Controle, Policial, Administrativo e Regional MG sem quebra de layout.
- **Pauta Linear de Editais:** Lista contínua categorizando cada ato como `Ato Oficial Concreto` ou `Notícia/Apuração`.

### 2. 🔍 Busca & Dossiês Analíticos
- Pesquisa livre por órgão, autarquia ou palavra-chave com sanitização estrita de operadores booleanos.
- Filtros por jurisdição (Nacional ou por UF) e situação (Todos, Previstos/Autorizados ou Inscrições Abertas).
- Resultados apresentados em formato resumido e escaneável, sem travamentos de acordeões gigantes.
- **Página Dinâmica de Leitura do Dossiê:** Ao clicar em *"Ver Dossiê Completo"*, uma página rica é aberta contendo:
  - Cabeçalho documental com status oficial.
  - Faixa com 4 métricas principais (Remuneração, Prazos, Vagas e Escolaridade).
  - Cronograma oficial com datas factuais.
  - Perfil da banca examinadora e cargos previstos.
  - Matriz de disciplinas nucleares do certame (`SubjectsGrid`).
  - Links primários para a publicação oficial (`ReferenceLinks`).

### 3. 📡 Radar Pessoal de Acompanhamentos
- Permite "favoritar" certames para acompanhamento contínuo no banco local SQLite.
- Botão *"Verificar Atualizações Agora"* para checar retificações e movimentações com um único clique.
- Abertura direta do dossiê detalhado a partir do acompanhamento.

### 4. ⚙️ Configurações & Diretório Oficial de Fontes
- **19 Bancas Mapeadas:** Acesso categorizado às bancas de grande porte nacional (Cebraspe, FGV, FCC, Vunesp, etc.), bancas mineiras (Fundep, Access, CEFET-MG) e bancas universitárias.
- **6 Portais de Editais:** Mapeamento de agregadores e portais de notícias de certames.
- **Gestão do Cache Local:** Status do banco SQLite e botão para reinicialização rápida do cache.
- **Declaração de Conformidade Legal:** Transparência nos moldes da LAI (Lei nº 12.527/2011) e LGPD (Lei nº 13.709/2018).

### 5. 🎛️ Header Fixo e Retrátil Inteligente
- Barra superior alinhada ao topo com opção de **fixamento permanente** ou **recolhimento automático**.
- Quando recolhida, o usuário pode reabri-la encostando o mouse no topo da tela (hover sensor) ou clicando no botão discreto `InfoConcursos ▼` fixado no canto superior esquerdo.

### 6. 🔒 Privacidade & Segurança de Dados (Conformidade LGPD & Criptografia At-Rest)
- **Criptografia em Repouso (AES-256-GCM):** O arquivo de banco SQLite é cifrado com chave de 256 bits protegida pelo cofre nativo do SO (`safeStorage` / DPAPI / Keychain), com fallback determinístico via KDF `scrypt` (RFC 7914).
- **Higienização Ativa de PII:** Interceptação automática de CPFs, RGs, e-mails ou nomes antes de buscas externas ou persistência local, evitando vazamentos.
- **Túnel de Rede Seguro & Anti-Fingerprinting:** Suporte opcional a proxies HTTP/HTTPS/SOCKS via Undici, emissão ativa de `Sec-GPC: 1` e rotação de User-Agent.
- **Direito de Eliminação Efetiva (Art. 18, VI LGPD):** Botão com 1 clique para expurgo total e definitivo de históricos, caches e termos de pesquisa locais.

---

## 🛡️ Diretriz "Zero Fake Data" & Veracidade

O InfoConcursos adota uma política inflexível de veracidade documental:
- ❌ **Proibido inventar dados:** Nada de estimativas sintéticas como *"Edital nos próximos 3 meses"* ou *"Salários de até R$ 20.000,00"* se isso não estiver explícito na fonte primária.
- ❌ **Sem presunção de inscrições abertas:** Um certame só é marcado como `Inscrições Abertas` se houver data factual comprovando o período ativo.
- ✔️ **Fallbacks Honestos:** Se uma data, vaga ou remuneração ainda não foi publicada, o sistema declara explicitamente: *"A definir pelo órgão"* ou *"Não especificado na publicação"*.
- ✔️ **Auditoria Contínua:** A suíte de testes inclui varredura automática (`zero-fake-data.test.ts`) para impedir a regressão de strings ou fallbacks enganosos.

---

## 🎨 Design System & Interface

O aplicativo é concebido com base no design editorial moderno (*Swiss Monocle Editorial Dark*):
- **Tipografia:** Serifada clássica e autoritária (*Newsreader Display*) para manchetes e títulos; sem serifa geométrica limpa (*Inter*) para corpos de texto e dados tabelados.
- **Paleta de Cores:**
  - Fundo principal: `#121112` / Painéis: `#1B1A1B` e `#171617`.
  - Tipografia primária: `#FFFCF2` / Textos de apoio: `#D4C8B5` e `#BDBAB5`.
  - Tons de destaque e confiabilidade: Sálvia e Verde Institucional (`#607466` / `#748B7B`).
- **Layout Fluido Edge-to-Edge:** Conteúdo expansivo aproveitando toda a largura da tela com margens perimetrais controladas.

---

## 💻 Tecnologias Utilizadas

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Framework Desktop** | [Electron 34](https://www.electronjs.org/) | Runtime desktop multiplataforma integrado ao ecossistema Node.js. |
| **Tooling & Build** | [Electron Vite](https://electron-vite.org/) | Compilador ultra-rápido baseado em Vite e Rollup para main, preload e renderer. |
| **Interface (UI)** | [React 19](https://react.dev/) | Construção declarativa de componentes e páginas dinâmicas. |
| **Estilização** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Utilitários de estilização atômica e tokens de design system. |
| **Ícones** | [Lucide React](https://lucide.dev/) | Ícones minimalistas consistentes em SVG. |
| **Gerenciamento de Estado** | [Zustand](https://github.com/pmndrs/zustand) | Gerenciador de estado leve e determinístico. |
| **Banco de Dados & ORM** | [SQLite (sql.js)](https://sql.js.org/) + [Drizzle ORM](https://orm.drizzle.team/) | Persistência local relacional em WASM com tipagem estática e criptografia AES-256-GCM em repouso. |
| **Criptografia & Privacidade** | Node.js Crypto + safeStorage + Undici | Cifra de repouso AES-256-GCM, proteção via DPAPI/Keychain e túnel proxy com cabeçalhos Sec-GPC. |
| **Scraping & Parsers** | [Cheerio](https://cheerio.js.org/) | Parser rápido de DOM HTML/XML com funções puras e determinísticas. |
| **Testes Automatizados** | [Vitest](https://vitest.dev/) | Framework de testes unitários e de integração com execução em milissegundos. |
| **Empacotador** | [Electron Builder](https://www.electron.build/) | Geração de instaladores assistidos (NSIS) e executáveis portáteis para Windows. |

---

## 🚀 Instalação e Execução Local

### Pré-requisitos
- **Node.js:** Versão 20.x ou 24.x instalada.
- **Gerenciador de Pacotes:** `npm` (incluso no Node).

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/infoconcursos.git
   cd infoconcursos
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o ambiente de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Verifique a tipagem TypeScript (Node & Web):**
   ```bash
   npm run typecheck
   ```

---

## 📦 Geração dos Binários de Produção (Windows)

Para compilar a aplicação e gerar os executáveis finais para compartilhamento, execute:

```bash
npm run build:win
```

Os arquivos serão gerados e segregados na pasta `dist/`:

1. **Instalador de Produção Oficial (`NSIS`):**  
   `dist/producao/InfoConcursos Setup 1.0.0.exe` (~96 MB)  
   *Instalador completo do Windows com assistente, criação de atalhos no Menu Iniciar/Desktop e desinstalador.*

2. **Artefatos de Testes e Validação Rápida (`Portable` e `Unpacked`):**  
   - `dist/testes/InfoConcursos 1.0.0.exe` (~96 MB)  
     *Executável portátil autônomo sem necessidade de instalação.*  
   - `dist/testes/win-unpacked/`  
     *Pasta descompactada para execução direta e testes em ambiente de desenvolvimento.*

---

## 🧪 Suíte de Testes Automatizados

O projeto conta com **42 testes automatizados** cobrindo todas as camadas críticas:
- Sanitização de termos de busca e queries dork (`query-sanitizer.test.ts`).
- Parsers com fixtures autênticas de HTML e XML (`fixtures-parsers.test.ts`).
- Auditoria do requisito "Zero Fake Data" (`zero-fake-data.test.ts`).
- Resiliência HTTP, timeouts e tratamento de erros de rede (`network-resilience.test.ts`).
- Ciclo de Cache-First e persistência em SQLite (`cache-architecture.test.ts`).
- Integração de monitoramento e ciclo de vida (`monitoring-and-e2e.test.ts`).

Para rodar todos os testes:
```bash
npm test
```

> 📖 **Diretrizes e Regras de Testes para Agentes de IA:** Consulte o documento normativo de regras, padrões seminais e boas práticas em [`docs/regras_testes_ia.md`](docs/regras_testes_ia.md).

---

## 📁 Estrutura de Diretórios

```text
infoconcursos/
├── src/
│   ├── main/                       # Processo Principal do Electron (Node.js)
│   │   ├── database/               # Esquema, migrações e conexão SQLite local
│   │   ├── modules/
│   │   │   ├── cache/              # Serviços de cache de busca e sincronização
│   │   │   ├── dossier/            # Motor gerador de dossiês analíticos
│   │   │   ├── news/               # Orquestrador de feeds e scraping de notícias
│   │   │   └── search/             # Parsers de bancas, portais, RSS e sanitizador
│   │   ├── handlers.ts             # Canais IPC (Inter-Process Communication)
│   │   └── index.ts                # Inicialização da janela e ciclo do Electron
│   ├── preload/                    # Script de pré-carregamento (Bridge seguro IPC)
│   ├── renderer/                   # Interface Gráfica (React + Tailwind)
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ds/             # Componentes atômicos do Design System (Button, Text, Badge)
│   │       │   ├── dossier/        # Cards de síntese, disciplinas e referências
│   │       │   └── search/         # Barra de pesquisa e seletores balanceados
│   │       ├── pages/
│   │       │   ├── NewsPage.tsx    # Feed principal e radar ao vivo
│   │       │   ├── DossierPage.tsx # Página dedicada de leitura do dossiê
│   │       │   ├── MonitoringPage.tsx # Radar pessoal de certames monitorados
│   │       │   └── SettingsPage.tsx   # Diretório oficial das 19 bancas e 6 portais
│   │       ├── stores/             # Estado global (Zustand)
│   │       ├── App.tsx             # Layout mestre, navegação e header retrátil
│   │       └── main.tsx            # Ponto de entrada do React
│   ├── shared/                     # Tipagens TypeScript e constantes compartilhadas
│   │   ├── constants/              # Catálogo oficial de fontes (19 bancas, 6 portais, áreas)
│   │   └── types/                  # Contratos de dados (Concurso, Dossiê, Busca, Notícias)
│   └── test/                       # Testes automatizados e fixtures HTML/XML
├── dist/                           # Executáveis empacotados para distribuição (.exe)
├── electron-builder.json5          # Configuração de empacotamento NSIS e Portable
├── package.json                    # Scripts e dependências do projeto
└── vite.config.ts                  # Configurações de compilação do Vite
```

---

## 📄 Licença

Este projeto é distribuído sob os termos da licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
