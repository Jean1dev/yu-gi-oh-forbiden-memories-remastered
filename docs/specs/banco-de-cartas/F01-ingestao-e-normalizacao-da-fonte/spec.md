# Ingestão e Normalização da Fonte

> PRD: `docs/prds/banco-de-cartas.md` — F01
> Pacote-alvo: `packages/data` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta feature é a raiz de dados do projeto: um **pipeline de build** que lê os 821 arquivos de
origem em `cards-data/dados/*.json`, descarta os 99 envelopes de erro, desembrulha e normaliza
cada registro para o schema canônico de carta, cruza o resultado com as artes em
`cards-data/*.jpg` e emite três artefatos determinísticos — o dataset canônico, o manifesto de
artes e o relatório de ingestão. É a **Foundation** do módulo (PRD §8, Parte 2) e a **Fase 0** do
roadmap (`docs/arquitetura.md` §9): sem ela, F02–F10 não têm entrada e nenhum módulo cross-PRD
(Library, Build Deck, Motor, Password) tem carta para consumir.

O desenho segue `arquitetura.md` §4.1 e ADR-003: a normalização acontece **uma vez, no build**,
e não em runtime por cada consumidor. O núcleo da ingestão é composto de funções puras sobre
dados já lidos; todo o I/O (varredura de diretório, escrita de arquivo, stdout) vive num
adaptador CLI fino na borda. Isso mantém `packages/data` testável sem filesystem
(`TypeScript-development-guidelines.md` §12, §24 regra 4) e preserva a fronteira de pacote
declarada em guidelines §3.2 — `data` é "build-time ingestion and runtime read-only catalog".

Esta spec **não** valida o dataset como conjunto (contagem canônica 722, contiguidade,
coerência por tipo, cobertura de arte, veredito válido/inválido): isso é F02, que consome os
artefatos produzidos aqui. F01 valida cada **registro isoladamente** contra o schema canônico e
relata o que descartou; F02 dá o veredito sobre o **conjunto**.

### Incluído

- Varredura da pasta de origem e leitura dos 821 arquivos JSON (PRD F01 Capabilities — Entrada)
- Descarte dos 99 envelopes `{"success":false}` sem entrarem no dataset
- Desembrulho do envelope `{success, card}` e emissão do objeto de carta puro
- Normalização de cada registro para o schema canônico de 12 campos, com coerção de tipo e
  resolução das sentinelas de ausência da origem
- Preservação dos 5 valores de `tipo`, incluindo `ritual` como tipo de primeira classe
- Preservação das classes exatamente como vêm da origem (nenhuma renomeação ou agrupamento)
- Desambiguação por `numero` normalizado a 3 dígitos, com aborto explícito em colisão entre
  dois registros válidos
- Cruzamento com a pasta de artes e emissão do manifesto `numero → arquivo`
- Detecção e relato de lacunas no intervalo esperado de `numero`
- Emissão determinística de `cards.json`, `arts-manifest.json` e `ingestion-report.json`
- Resumo legível no stdout ao final da execução (PRD F01 Experience)
- Contratos canônicos de carta (tipos + schema zod) em `packages/shared`, consumidos por todo o
  restante do monorepo

### Fronteiras

- **Veredito de integridade do dataset** (contagem 722, range contíguo, unicidade, coerência
  `atk`/`def`/guardiões por tipo, cobertura de arte, selo válido/inválido) → **F02**. F01 produz
  a evidência (relatório) e F02 decide. — PRD §6 F02
- **Carregamento em memória, índices e API de consulta** (`getByNumero`, `listByTipo`, …) →
  **F03**. F01 não expõe consulta, só emite arquivos. — PRD §6 F03
- **Placeholder de arte ausente e resolução em runtime** → **F04**. O manifesto de F01 lista
  apenas as artes que existem; quem decide o fallback é F04. — PRD §6 F04
- **Empacotamento, `version` e `hash`** → **F09/F10**. F01 garante saída byte-determinística
  para que o hash de F10 seja estável, mas não atribui versão nem hash. — PRD §6 F09, F10
- **Valores das tabelas auxiliares** (fusões, guardiões, terreno, drops) → F05–F08 e dado
  externo pendente. Nenhum deles é tocado aqui. — PRD §7
- **Editor ou correção manual de cartas via UI** → fora do escopo do módulo inteiro. — PRD §7

### Contratos externos assumidos

Nenhum. F01 tem `Dependências: None` na tabela do PRD §8 e não consome nenhum módulo cross-PRD.
As dependências do Banco de Cartas são de *saída* (outros módulos consomem este).

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | `atk`, `def` e `estrelas` são coagidos de string para `number \| null` no schema canônico. `null` significa "ausente por design" (não-monstro sem ATK, carta não comprável), semanticamente distinto de `0`. | entrevista; guidelines §6.2 (`attack?: number`) e §7.2 (`parseStars → Result<number>`) | confirmada |
| 2 | `guardiao1`/`guardiao2` vazios na origem viram `null` (não string vazia), mesmo critério do item 1. | entrevista (preview aceito) | confirmada |
| 3 | `password: "Indisponível"` (24 cartas) é sentinela textual de "sem senha" e vira `null`. Impede que F03 indexe a sentinela em `findByPassword` e que o módulo Password (cross-PRD) a trate como senha digitável. | entrevista; verificado nos dados reais | confirmada |
| 4 | `img` é `null` em 100% dos 722 registros. O campo é mantido no schema canônico por fidelidade ao schema declarado em `product.md` e no critério de aceite de F01, tipado como literal `null`. A resolução real de arte é por `numero` (PRD F04 Capabilities). | `product.md`; PRD §9 F01; verificado nos dados reais | confirmada |
| 5 | Os artefatos gerados vivem em `packages/data/generated/` e **não** entram no git (`.gitignore`). Consequência aceita: todo ambiente (CI, build do `web`, boot do `server`) roda a ingestão antes de qualquer outra tarefa, e mudanças de dataset não aparecem como diff em PR. Mitigado por (a) tarefa Turborepo com `outputs` cacheados e (b) F02 como portão obrigatório contra artefato adulterado ou desatualizado. | entrevista | confirmada |
| 6 | O veredito "dataset incompleto" trafega em `ingestion-report.json` (artefato legível por máquina) e não embutido no `cards.json`, mantendo o dataset de domínio livre de metadado de processo. O stdout carrega o resumo humano exigido pela Experience do PRD. | entrevista | confirmada |
| 7 | `tipo` é um union fechado de 5 valores e `guardiao` um union fechado de 10 valores no schema canônico. Os 5 tipos são invariante de `product.md`; os 10 guardiões estão verificados em `arquitetura.md` §4.2 e são o eixo da matriz 10×10 pendente. | `product.md`; `arquitetura.md` §4.2 | confirmada |
| 8 | `classe` é `string` não-vazia no schema canônico, **não** um enum fechado — o PRD atribui a F02 a decisão de bloquear ou avisar sobre classe desconhecida, e F01 Capabilities manda "preservar como vêm da origem". F01 apenas **relata** o conjunto de classes observadas para F02 consumir. Nenhuma lista de classes é hard-coded. | PRD §6 F01 e F02 Capabilities | confirmada |
| 9 | F01 **não** hard-coda 722 como contagem esperada. Deriva o intervalo de lacunas de `001` até `max(maiorNumeroEmitido, TOTAL_CARTAS_CANONICO)`, cobrindo tanto truncamento na cauda quanto crescimento futuro. A asserção de "exatamente 722" pertence a F02. | PRD §6 F02 Capabilities | confirmada |
| 10 | Registro que falha o schema canônico é descartado com motivo registrado (mesmo tratamento de JSON malformado, PRD F01 Error Handling) e **não** aborta o lote. A lacuna resultante é capturada pela detecção de `numero` ausente e marca o dataset incompleto para F02 decidir. | PRD §6 F01 Error Handling | confirmada |
| 11 | Colisão de `numero` entre dois registros **válidos** aborta a ingestão. Nos dados reais isso nunca ocorre: os 99 arquivos de 2 dígitos (`01.json`–`99.json`) são todos `success:false` e os 722 de 3 dígitos (`001.json`–`722.json`) são todos `success:true`. A regra permanece como guarda contra regressão da origem. | PRD §6 F01 Error Handling; verificado nos dados reais | confirmada |
| 12 | `cards.json` e `arts-manifest.json` são byte-determinísticos: ordenação estável, ordem de chaves fixa, sem timestamp. `ingestion-report.json` carrega `geradoEm` e por isso fica fora da garantia de determinismo byte-a-byte — ele não entra no bundle de F09 nem no hash de F10. | `arquitetura.md` §4.1 (hash de conteúdo, F10) | confirmada |
| 13 | Os 24 registros `ritual` têm `atk`, `def`, `guardiao1` e `guardiao2` **todos vazios** na origem — mais amplo que a pendência registrada em `arquitetura.md` §4.2, que citou apenas guardiões. F01 os normaliza para `null` sem bloquear. O critério de F02 que exige "`monstro` **e** `ritual` com `atk`/`def` numéricos e guardiões preenchidos" (PRD §6 F02) **reprovaria o dataset real** e precisa de correção antes de F02 ser especificada. | verificado nos dados reais; `arquitetura.md` §4.2 e §10; ADR-003 `[PRECISA DE ENTRADA]` | **a confirmar** — decisão de F02, não bloqueia F01 |
| 14 | O monorepo ainda não existe. F01 é o primeiro código do repositório e carrega o scaffolding mínimo: pnpm workspaces, Turborepo, `tsconfig` strict e fixação de Node.js 24 LTS via `engines` + `.nvmrc`. | `arquitetura.md` §0; ADR-001 §6 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `pnpm-workspace.yaml` | raiz | novo | Declara `packages/*` e `apps/*` como workspaces |
| `package.json` | raiz | novo | `engines.node` em 24 LTS, scripts de orquestração, devDependencies compartilhadas |
| `turbo.json` | raiz | novo | Tarefa `data:ingest` com `inputs` (`cards-data/**`) e `outputs` (`packages/data/generated/**`) cacheados; `build` e `test` dependem dela |
| `tsconfig.base.json` | raiz | novo | Baseline strict de guidelines §6.1 |
| `.nvmrc` | raiz | novo | Node.js 24 LTS (ADR-001 §6) |
| `.gitignore` | raiz | alterado | Acrescenta `packages/data/generated/` (Decisão 5) |
| `packages/shared/src/result.ts` | shared | novo | Primitivo `Result<T, E>` de guidelines §7.1, usado por toda normalização de fronteira |
| `packages/shared/src/erros.ts` | shared | novo | `DomainError` com `code` e `details` (guidelines §8.1) |
| `packages/shared/src/carta/tipos.ts` | shared | novo | `TipoCarta`, `GuardiaoEstelar`, `NumeroCarta`, `Carta` |
| `packages/shared/src/carta/schema.ts` | shared | novo | `CartaSchema` (zod) e `NumeroCartaSchema` |
| `packages/shared/src/carta/constantes.ts` | shared | novo | `TIPOS_CARTA`, `GUARDIOES_ESTELARES`, `TOTAL_CARTAS_CANONICO` |
| `packages/shared/src/index.ts` | shared | novo | Export público estável do pacote (guidelines §5.1) |
| `packages/data/src/ingestao/envelope.ts` | data | novo | `EnvelopeOrigemSchema` e `CartaOrigemSchema` — forma bruta da origem |
| `packages/data/src/ingestao/normalizar-carta.ts` | data | novo | Registro bruto → `Result<Carta, DomainError>`: coerção de tipo e sentinelas |
| `packages/data/src/ingestao/agregar-cartas.ts` | data | novo | Deduplicação por `numero`, detecção de colisão, ordenação e detecção de lacunas |
| `packages/data/src/ingestao/manifesto-artes.ts` | data | novo | Cruzamento `numero` × arquivos de arte |
| `packages/data/src/ingestao/relatorio.ts` | data | novo | Montagem do `RelatorioIngestao`, incluindo `classesObservadas` |
| `packages/data/src/ingestao/serializar.ts` | data | novo | Serialização byte-determinística dos artefatos |
| `packages/data/src/ingestao/ingerir-fonte.ts` | data | novo | Orquestrador puro: entradas já lidas → artefatos |
| `packages/data/src/ingestao/index.ts` | data | novo | Export público do subsistema de ingestão |
| `packages/data/scripts/ingest-cards.ts` | data | novo | Adaptador CLI: varre diretórios, chama o núcleo puro, escreve artefatos, imprime resumo, define exit code |
| `packages/data/generated/cards.json` | data | gerado | Dataset canônico (não versionado) |
| `packages/data/generated/arts-manifest.json` | data | gerado | Manifesto de artes (não versionado) |
| `packages/data/generated/ingestion-report.json` | data | gerado | Relatório de ingestão (não versionado) |
| `packages/data/tests/fixtures/` | data | novo | Envelopes sintéticos: erro, malformado, colisão, lacuna, tipo inválido |
| `packages/data/src/ingestao/normalizar-carta.test.ts` | data | novo | Unitários de normalização (table-driven, guidelines §11.2) |
| `packages/data/src/ingestao/agregar-cartas.test.ts` | data | novo | Unitários de agregação, colisão e lacuna |
| `packages/data/src/ingestao/manifesto-artes.test.ts` | data | novo | Unitários do manifesto |
| `packages/data/src/ingestao/ingerir-fonte.test.ts` | data | novo | Unitários do orquestrador + propriedades fast-check |
| `packages/data/tests/ingest-cards.integration.test.ts` | data | novo | Integração contra `cards-data/` real (guidelines §5.1, §13) |
| `.dependency-cruiser.cjs` | raiz | novo | Regras de fronteira de pacote (guidelines §3.3, `arquitetura.md` §2) |

**Verificação da direção de dependências:** `packages/shared` não importa nada do monorepo.
`packages/data` importa **apenas** `packages/shared`. Nenhum dos dois importa `rules`, `engine`,
`ai`, `web` ou `server` — a direção `shared ← data` de `arquitetura.md` §2 é respeitada.

Esta feature **não toca `packages/engine`**, portanto as garantias de pureza/PRNG do motor não se
aplicam aqui. Ainda assim, a fronteira de I/O é explícita e verificada por análise estática:

- `packages/data/src/**` (núcleo de ingestão) **não** importa `node:fs`, `node:path`, `fetch`,
  `process` nem qualquer API de I/O — recebe conteúdo já lido como argumento e devolve estruturas
  em memória. É testável sem filesystem.
- `packages/data/scripts/ingest-cards.ts` é o **único** ponto com `node:fs`/`node:path`/`process`,
  conforme guidelines §7.3 ("keep async functions at I/O boundaries") e §19.2.

## 3. Design Técnico

### Estruturas de dados

**`Carta` (canônica, `packages/shared`)** — 12 campos, ordem fixa, objeto `Readonly`:

| Campo | Tipo | Semântica e regra |
|---|---|---|
| `id` | `number` | Inteiro ≥ 1, como vem da origem. Verificado: `id === Number(numero)` nos 722 registros, mas F01 não impõe a relação |
| `numero` | `NumeroCarta` | String `^[0-9]{3}$`. Identidade da carta na coleção e chave de todos os índices |
| `nome` | `string` | Não-vazia |
| `img` | `null` | Literal. Sempre `null` na origem; a arte é resolvida por `numero` (F04) |
| `classe` | `string` | Não-vazia, preservada literalmente da origem. Sem enum fechado (Decisão 8) |
| `atk` | `number \| null` | Inteiro ≥ 0. `null` = sem ATK aplicável |
| `def` | `number \| null` | Inteiro ≥ 0. `null` = sem DEF aplicável |
| `guardiao1` | `GuardiaoEstelar \| null` | `null` = carta sem guardião estelar |
| `guardiao2` | `GuardiaoEstelar \| null` | Idem |
| `password` | `string \| null` | Formato `^\d{2} \d{2} \d{2} \d{2}$`. `null` = carta sem senha |
| `estrelas` | `number \| null` | Inteiro ≥ 0, preço de compra. `null` = carta não comprável |
| `tipo` | `TipoCarta` | Um de 5 valores |

**`TipoCarta`** — union fechado: `monstro`, `armadilha`, `equipamento`, `magica`, `ritual`.
Distribuição verificada na origem: 621 / 10 / 34 / 33 / 24 = 722, conforme `arquitetura.md` §4.2.

**`GuardiaoEstelar`** — union fechado de 10: `Sun`, `Moon`, `Mars`, `Jupiter`, `Mercury`,
`Neptune`, `Pluto`, `Saturn`, `Uranus`, `Venus`. É o eixo da matriz 10×10 pendente de F06.

**`TOTAL_CARTAS_CANONICO`** — constante `722` em `shared`, fonte única que corrige a divergência
"821 vs 722" apontada no PRD §2. F01 a usa apenas como limite superior da varredura de lacunas
(Decisão 9); quem a impõe como asserção é F02.

**`ManifestoArtes`** — mapa `numero → caminho relativo da arte`, com chaves ordenadas
crescentemente. Contém entrada **apenas** para artes que existem no disco; ausências vivem no
relatório e o fallback é responsabilidade de F04.

**`RelatorioIngestao`** — evidência de processo consumida por F02 e pelo mantenedor:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `arquivosLidos` | `number` | Total varrido na pasta de origem (esperado 821) |
| `descartadosPorErro` | `number` | Envelopes `success:false` (esperado 99) |
| `descartadosPorInvalidez` | `{ arquivo, motivo, codigo }[]` | JSON malformado, envelope sem `card`, falha de schema canônico, divergência `numero` × nome de arquivo |
| `cartasEmitidas` | `number` | Registros no dataset final (esperado 722) |
| `numerosAusentes` | `NumeroCarta[]` | Lacunas no intervalo varrido, ordenadas |
| `artesEncontradas` | `number` | Entradas no manifesto (esperado 722) |
| `artesAusentes` | `NumeroCarta[]` | Cartas emitidas sem arte correspondente |
| `artesOrfas` | `string[]` | Arquivos de arte sem carta correspondente |
| `classesObservadas` | `string[]` | Conjunto ordenado de classes distintas (esperado 24) — insumo de F02, não hard-coded |
| `tiposObservados` | `Record<TipoCarta, number>` | Contagem por tipo |
| `completo` | `boolean` | `true` sse `numerosAusentes` e `descartadosPorInvalidez` estão ambos vazios |
| `geradoEm` | `string` | ISO 8601 (único campo não determinístico, Decisão 12) |

### Fluxo

1. **Resolver diretórios.** O adaptador CLI recebe o diretório de origem (padrão
   `cards-data/dados`), o de artes (padrão `cards-data`) e o de saída (padrão
   `packages/data/generated`). Parametrizar em vez de fixar habilita os testes por fixture.
2. **Verificar a origem.** Diretório inexistente ou sem nenhum `.json` → aborta antes de qualquer
   escrita, com exit code diferente de zero e **nenhum artefato parcial emitido** (PRD F01
   Error Handling; critério de aceite 6).
3. **Ler os arquivos.** Varredura de `*.json`, ordenada por nome antes de qualquer processamento,
   para que a ordem de `readdir` — que o sistema de arquivos não garante — não influencie a saída.
4. **Desembrulhar o envelope.** Cada conteúdo passa por `EnvelopeOrigemSchema`. `success:false` →
   contabiliza em `descartadosPorErro` e segue. JSON malformado, envelope irreconhecível ou
   `success:true` sem objeto `card` → contabiliza em `descartadosPorInvalidez` com o nome do
   arquivo e o motivo, e **segue sem interromper o lote**.
5. **Normalizar cada registro.** Coerção e resolução de sentinelas, detalhadas em Regras de
   negócio. O resultado é validado contra `CartaSchema`. Falha → `descartadosPorInvalidez`, sem
   abortar (Decisão 10).
6. **Conferir `numero` contra o nome do arquivo.** O `numero` do registro, normalizado a 3
   dígitos, deve corresponder ao nome do arquivo normalizado da mesma forma. Divergência →
   descarte registrado, porque indica origem inconsistente.
7. **Agregar e desambiguar.** Agrupar os registros sobreviventes por `numero`. Dois registros
   **válidos** com o mesmo `numero` → **aborta** com `colisao_numero`, citando os dois arquivos
   (PRD F01 Error Handling; critério de aceite 3). Nenhum artefato é escrito.
8. **Ordenar.** Dataset ordenado por `numero` crescente. Como todos os `numero` são strings de 3
   dígitos com zero à esquerda, a ordem lexicográfica coincide com a numérica.
9. **Detectar lacunas.** Varre `001` até `max(maiorNumeroEmitido, TOTAL_CARTAS_CANONICO)` e
   registra cada `numero` ausente. Lacuna **não** aborta: alimenta `numerosAusentes` e zera
   `completo` para F02 decidir (critério de aceite 5).
10. **Montar o manifesto de artes.** Para cada carta emitida, verifica a existência de
    `{numero}.jpg` no diretório de artes. Presente → entrada no manifesto. Ausente →
    `artesAusentes`. Arte sem carta → `artesOrfas`.
11. **Montar o relatório**, incluindo `classesObservadas` e `tiposObservados` derivados do
    dataset emitido.
12. **Serializar deterministicamente** os três artefatos e escrevê-los no diretório de saída.
13. **Imprimir o resumo** no stdout: arquivos lidos, descartados por erro, descartados por
    invalidez, cartas emitidas, artes resolvidas, e alerta de cada `numero` ausente (PRD F01
    Experience). Exit code `0` quando `completo` é `true`, diferente de zero caso contrário.

### Regras de negócio

**Coerção de campos numéricos** (`atk`, `def`, `estrelas`):
- String de dígitos → inteiro correspondente. `"3000"` → `3000`, `"0"` → `0`.
- String vazia → `null`.
- Qualquer outro conteúdo → falha de normalização com código `campo_numerico_invalido`.
- Verificado na origem: 100% dos valores não-vazios de `atk`, `def` e `estrelas` casam
  `^[0-9]+$`. A regra é guarda contra regressão, não um caminho ativo.

**Resolução de sentinelas de ausência:**
- `guardiao1`/`guardiao2` iguais a `""` → `null` (101 registros: 77 não-monstro + 24 ritual).
- `password` igual a `"Indisponível"` → `null` (24 registros).
- `estrelas` igual a `""` → `null` (os **mesmos** 24 registros de `password: "Indisponível"` —
  são as cartas obtidas apenas por fusão ou ritual, sem senha e sem preço).
- `img` é `null` na origem e permanece `null`.

**Preservação obrigatória:**
- Os 5 valores de `tipo` sobrevivem literalmente, com `ritual` como quinto tipo de primeira
  classe (critério de aceite 4; PRD F01 Capabilities).
- `classe` é copiada literalmente, sem normalização de caixa, acento ou espaço — inclui valores
  compostos como `Beast-Warrior`, `Sea Serpent` e `Winged Beast`, e os rótulos de não-monstro
  `Equip`, `Magic`, `Trap`, `Ritual`.
- `nome` é copiado literalmente, preservando pontuação e maiúsculas da origem.

**Normalização de `numero`:** `padStart(3, "0")` aplicado ao campo `numero` do registro. É a
chave de desambiguação exigida por PRD F01 Capabilities.

**Determinismo da saída** (pré-requisito do hash de F10, `arquitetura.md` §4.1):
- Registros ordenados por `numero`; chaves do manifesto ordenadas.
- Ordem de chaves de cada objeto de carta fixa e idêntica à ordem da tabela de estruturas.
- Indentação de 2 espaços e newline final, sem timestamp em `cards.json` nem em
  `arts-manifest.json`.
- **Invariante:** a mesma origem produz bytes idênticos, independentemente da ordem em que o
  sistema de arquivos devolveu os nomes.

### Determinismo e pureza

Não se aplica a `packages/engine` — esta feature não toca o motor, não usa PRNG e não produz
estado de duelo. As garantias de determinismo aqui são de **saída de build** (bytes idênticos
para a mesma entrada), não de simulação semeada.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`NumeroCartaSchema`** — string, regex `^[0-9]{3}$`. Tipo derivado `NumeroCarta`.
- **`TipoCartaSchema`** — enum dos 5 valores. Tipo derivado `TipoCarta`.
- **`GuardiaoEstelarSchema`** — enum dos 10 valores. Tipo derivado `GuardiaoEstelar`.
- **`CartaSchema`** — objeto estrito (sem campos extras) com os 12 campos e as regras da tabela
  de estruturas: `id` inteiro positivo; `numero` via `NumeroCartaSchema`; `nome` string mínima 1;
  `img` literal `null`; `classe` string mínima 1; `atk`/`def`/`estrelas` inteiro ≥ 0 anulável;
  `guardiao1`/`guardiao2` guardião anulável; `password` regex `^\d{2} \d{2} \d{2} \d{2}$`
  anulável; `tipo` via `TipoCartaSchema`. Tipo derivado `Carta`, envolvido em `Readonly`
  (guidelines §6.3).
- **`Result<T, E extends Error = Error>`** — união discriminada `{ ok: true; value: T }` |
  `{ ok: false; error: E }`, conforme guidelines §7.1.
- **`DomainError`** — `Error` com `code: string` e `details: Record<string, unknown>`, conforme
  guidelines §8.1. Códigos usados por F01: `fonte_ausente`, `envelope_invalido`,
  `card_ausente`, `campo_numerico_invalido`, `schema_canonico_invalido`,
  `numero_divergente_do_arquivo`, `colisao_numero`.

### Schemas de origem (`packages/data`)

- **`CartaOrigemSchema`** — a forma **bruta**, com todos os campos como a origem os entrega:
  `id` number; `numero`, `nome`, `classe`, `atk`, `def`, `guardiao1`, `guardiao2`, `password`,
  `estrelas`, `tipo` como string; `img` nulo. Só existe para dar erro explícito na fronteira
  (guidelines §18.3) — nunca vaza para fora de `packages/data/src/ingestao`.
- **`EnvelopeOrigemSchema`** — união discriminada por `success`:
  `{ success: true, card: CartaOrigem }` | `{ success: false, error: string }`.

### Funções públicas

```
// packages/data/src/ingestao — núcleo puro, sem I/O

normalizarCarta(origem: CartaOrigem, arquivo: string): Result<Carta, DomainError>
  // pré: origem já validada por CartaOrigemSchema
  // pós: ok ⇒ Carta válida contra CartaSchema; erro ⇒ code identifica o campo culpado

agregarCartas(candidatas: readonly Carta[]): Result<AgregacaoCartas, DomainError>
  // pós: ok ⇒ cartas ordenadas por numero, sem duplicata, com numerosAusentes calculados
  //      erro ⇒ code 'colisao_numero' com details { numero, arquivoA, arquivoB }

montarManifestoArtes(
  cartas: readonly Carta[],
  artesDisponiveis: readonly string[],
): ManifestoArtesResultado
  // pós: manifesto só com artes existentes; ausentes e órfãs separadas

ingerirFonte(entrada: EntradaIngestao): Result<SaidaIngestao, DomainError>
  // entrada: { arquivos: { nome, conteudo }[], artesDisponiveis: string[] }
  // pós: ok ⇒ { cartas, manifesto, relatorio }; erro ⇒ fonte vazia ou colisão de numero
  // determinística: independe da ordem de `arquivos`

serializarArtefatos(saida: SaidaIngestao): ArtefatosSerializados
  // pós: três strings JSON; cards.json e arts-manifest.json byte-determinísticos
```

```
// packages/data/scripts/ingest-cards.ts — adaptador de I/O, única fronteira com o sistema

executarIngestao(opcoes: OpcoesIngestao): Promise<number>
  // opcoes: { dirOrigem, dirArtes, dirSaida }
  // retorna o exit code: 0 quando relatorio.completo, 1 caso contrário
  // aborta antes de escrever qualquer artefato se a origem estiver ausente ou vazia
```

### Exemplos de artefato

`generated/cards.json` — array ordenado, ordem de chaves fixa:

```json
[
  {
    "id": 1,
    "numero": "001",
    "nome": "Blue-eyes White Dragon",
    "img": null,
    "classe": "Dragon",
    "atk": 3000,
    "def": 2500,
    "guardiao1": "Sun",
    "guardiao2": "Mars",
    "password": "89 63 11 39",
    "estrelas": 999999,
    "tipo": "monstro"
  },
  {
    "id": 380,
    "numero": "380",
    "nome": "Blue-eyes Ultimate Dragon",
    "img": null,
    "classe": "Dragon",
    "atk": 4500,
    "def": 3800,
    "guardiao1": "Sun",
    "guardiao2": "Mars",
    "password": null,
    "estrelas": null,
    "tipo": "monstro"
  },
  {
    "id": 665,
    "numero": "665",
    "nome": "Curse of Millennium Shield",
    "img": null,
    "classe": "Ritual",
    "atk": null,
    "def": null,
    "guardiao1": null,
    "guardiao2": null,
    "password": "83 09 49 37",
    "estrelas": 10,
    "tipo": "ritual"
  },
  {
    "id": 681,
    "numero": "681",
    "nome": "House of Adhesive Tape",
    "img": null,
    "classe": "Trap",
    "atk": null,
    "def": null,
    "guardiao1": null,
    "guardiao2": null,
    "password": "15 08 37 28",
    "estrelas": 999999,
    "tipo": "armadilha"
  }
]
```

`generated/arts-manifest.json`:

```json
{
  "001": "cards-data/001.jpg",
  "002": "cards-data/002.jpg",
  "722": "cards-data/722.jpg"
}
```

`generated/ingestion-report.json` — execução esperada contra a origem atual:

```json
{
  "arquivosLidos": 821,
  "descartadosPorErro": 99,
  "descartadosPorInvalidez": [],
  "cartasEmitidas": 722,
  "numerosAusentes": [],
  "artesEncontradas": 722,
  "artesAusentes": [],
  "artesOrfas": [],
  "classesObservadas": [
    "Aqua", "Beast", "Beast-Warrior", "Dinosaur", "Dragon", "Equip", "Fairy",
    "Fiend", "Fish", "Insect", "Machine", "Magic", "Plant", "Pyro", "Reptile",
    "Ritual", "Rock", "Sea Serpent", "Spellcaster", "Thunder", "Trap", "Warrior",
    "Winged Beast", "Zombie"
  ],
  "tiposObservados": {
    "monstro": 621,
    "ritual": 24,
    "equipamento": 34,
    "magica": 33,
    "armadilha": 10
  },
  "completo": true,
  "geradoEm": "2026-07-27T12:00:00.000Z"
}
```

Exemplo de relatório com descarte, mostrando a forma de `descartadosPorInvalidez` e o efeito em
`completo`:

```json
{
  "descartadosPorInvalidez": [
    { "arquivo": "413.json", "motivo": "atk 'N/A' não é inteiro", "codigo": "campo_numerico_invalido" }
  ],
  "cartasEmitidas": 721,
  "numerosAusentes": ["413"],
  "completo": false
}
```

### Contratos externos (cross-PRD)

Nenhum consumido. Os artefatos acima são o contrato **fornecido** a F02 (dataset + manifesto +
relatório), a F03 (dataset selado) e a F04 (manifesto), e por transitividade aos módulos
cross-PRD listados no PRD §3.

## 5. Modelo de Dados

Esta feature não cria tabelas Postgres nem estruturas IndexedDB — não há estado por jogador, e a
persistência de `dataset_versions` (`arquitetura.md` §5.1) pertence a F10.

### Arquivos de dados gerados

| Arquivo | Formato | Determinístico | Consumidor |
|---|---|---|---|
| `packages/data/generated/cards.json` | Array JSON de `Carta`, ordenado por `numero`, chaves em ordem fixa, indentação 2, newline final | sim (byte-a-byte) | F02, F03, F09 |
| `packages/data/generated/arts-manifest.json` | Objeto JSON `numero → caminho`, chaves ordenadas | sim (byte-a-byte) | F02, F04, F09 |
| `packages/data/generated/ingestion-report.json` | Objeto JSON `RelatorioIngestao` | não (contém `geradoEm`) | F02, mantenedor |

**Versionamento em git:** os três artefatos ficam em `.gitignore` (Decisão 5). Isso implica:

- A tarefa Turborepo `data:ingest` declara `inputs: ["cards-data/**"]` e
  `outputs: ["packages/data/generated/**"]`; `build`, `test` e `typecheck` a listam em
  `dependsOn`. O cache do Turborepo evita reprocessar os 821 arquivos quando `cards-data/` não
  mudou, e garante que nenhum ambiente consuma um `generated/` inexistente.
- Não há revisão de mudança de dataset por diff de PR. O portão compensatório é **F02**, que
  revalida o conjunto inteiro antes de F03 servir — inclusive contra um `generated/cards.json`
  editado à mão localmente.

**`version` e `hash`:** não atribuídos aqui. F01 apenas garante a estabilidade byte-a-byte que
torna o hash de F10 significativo (`arquitetura.md` §4.1).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| Pasta de origem ausente ou sem nenhum `.json` | Verificação no adaptador CLI, antes de ler | **Aborta.** Nenhum artefato escrito, exit code ≠ 0 | `Fonte de cartas não encontrada em cards-data/dados — ingestão cancelada.` |
| Envelope `{"success":false}` | `EnvelopeOrigemSchema` | Descarta em silêncio, incrementa `descartadosPorErro`, segue o lote | — (agregado no resumo) |
| JSON malformado | Falha de `JSON.parse` | Descarta, registra em `descartadosPorInvalidez`, segue o lote | `Registro inválido ignorado: {arquivo}` |
| `success:true` sem objeto `card` | `EnvelopeOrigemSchema` | Idem acima, código `card_ausente` | `Registro inválido ignorado: {arquivo}` |
| `atk`/`def`/`estrelas` não-numérico e não-vazio | `normalizarCarta` | Descarta, código `campo_numerico_invalido`, segue | `Registro inválido ignorado: {arquivo}` |
| `tipo` fora dos 5 valores, ou guardião fora dos 10 | `CartaSchema` | Descarta, código `schema_canonico_invalido`, segue | `Registro inválido ignorado: {arquivo}` |
| `numero` do registro diverge do nome do arquivo | `normalizarCarta` | Descarta, código `numero_divergente_do_arquivo`, segue | `Registro inválido ignorado: {arquivo}` |
| Dois registros **válidos** com o mesmo `numero` | `agregarCartas` | **Aborta.** Nenhum artefato escrito, exige resolução manual | `Colisão de numero {N} entre {arquivoA} e {arquivoB}` |
| Lacuna no intervalo de `numero` | `agregarCartas` | **Não aborta.** Alimenta `numerosAusentes`, zera `completo`, artefatos são escritos, exit code ≠ 0 | `Numero ausente: {N}` |
| Carta emitida sem arte correspondente | `montarManifestoArtes` | Não entra no manifesto, entra em `artesAusentes`. O fallback é de F04 | `Arte ausente para a carta {N}` |
| Arquivo de arte sem carta correspondente | `montarManifestoArtes` | Registra em `artesOrfas`, não bloqueia | `Arte órfã: {arquivo}` |
| Diretório de saída inexistente | Adaptador CLI | Cria antes de escrever | — |
| Falha de escrita dos artefatos | `catch` no adaptador | Propaga com `cause` preservada (guidelines §8.3), exit code ≠ 0. Nenhum artefato parcial é considerado válido — F02 é quem os rejeita | `Falha ao escrever artefatos de ingestão em {dirSaida}` |
| Origem com `numero` fora de `001`–`999` (ex.: 4 dígitos) | `NumeroCartaSchema` | Descarta, código `schema_canonico_invalido` | `Registro inválido ignorado: {arquivo}` |

Todo descarte é **registrado**, nunca silencioso (guidelines §8.3, ADR-003 "dados inválidos
devem falhar explicitamente"). O único descarte agregado sem entrada individual é o envelope
`success:false`, que é o caminho esperado e ocorre 99 vezes.

## 7. Estratégia de Testes

### Unitários (Vitest)

`normalizarCarta` — table-driven (guidelines §11.2):
- `normalizarCarta converte atk numérico em inteiro` — `"3000"` → `3000`
- `normalizarCarta converte atk vazio em null` — `""` → `null`
- `normalizarCarta converte atk zero em zero e não em null` — `"0"` → `0`
- `normalizarCarta converte def e estrelas com a mesma regra de atk`
- `normalizarCarta converte password Indisponível em null`
- `normalizarCarta preserva password de quatro grupos numéricos`
- `normalizarCarta converte guardiões vazios em null`
- `normalizarCarta preserva os dois guardiões de um monstro`
- `normalizarCarta preserva tipo ritual como quinto tipo`
- `normalizarCarta preserva classe composta Sea Serpent sem alterar espaço`
- `normalizarCarta mantém img como null`
- `normalizarCarta rejeita tipo fora do enum de cinco valores`
- `normalizarCarta rejeita guardião fora dos dez conhecidos`
- `normalizarCarta rejeita atk não numérico com codigo campo_numerico_invalido`
- `normalizarCarta rejeita numero divergente do nome do arquivo`

`agregarCartas`:
- `agregarCartas ordena o dataset por numero crescente`
- `agregarCartas aborta com colisao_numero quando dois registros válidos compartilham numero`
- `agregarCartas reporta numero ausente quando há lacuna no intervalo`
- `agregarCartas varre até TOTAL_CARTAS_CANONICO quando o maior numero emitido é menor`
- `agregarCartas não reporta lacuna em dataset contíguo`

`montarManifestoArtes`:
- `montarManifestoArtes mapeia numero para o caminho da arte correspondente`
- `montarManifestoArtes omite do manifesto a carta sem arte e a lista em artesAusentes`
- `montarManifestoArtes lista arte sem carta correspondente em artesOrfas`

`ingerirFonte`:
- `ingerirFonte descarta envelope success false sem contá-lo como carta`
- `ingerirFonte descarta JSON malformado e continua o lote`
- `ingerirFonte descarta envelope sem objeto card e registra o arquivo`
- `ingerirFonte falha quando a lista de arquivos está vazia`
- `ingerirFonte marca completo false quando há descarte por invalidez`
- `ingerirFonte marca completo false quando há numero ausente`
- `ingerirFonte deriva classesObservadas do dataset emitido`

`serializarArtefatos`:
- `serializarArtefatos emite as chaves da carta na ordem canônica`
- `serializarArtefatos ordena as chaves do manifesto`
- `serializarArtefatos termina o arquivo com newline`

### Property-based (fast-check)

- **Determinismo por permutação:** para qualquer permutação da lista de arquivos de entrada,
  `serializarArtefatos(ingerirFonte(entrada))` produz **bytes idênticos** para `cards.json` e
  `arts-manifest.json`. É a propriedade central de F01 — protege contra a ordem não garantida de
  `readdir` contaminar o hash de F10. 1.000 execuções.
- **Coerção total sobre inteiros:** para todo inteiro `n` em `[0, 999999]`,
  `normalizarCarta` com `atk: String(n)` devolve `atk === n`.
- **Descarte não altera os sobreviventes:** injetar um número arbitrário de envelopes
  `success:false` e de arquivos malformados em posições arbitrárias não muda o conteúdo do
  `cards.json` emitido.
- **Idempotência do intervalo de lacunas:** para qualquer subconjunto de `001`–`722`,
  `numerosAusentes` é exatamente o complemento do subconjunto dentro do intervalo varrido.

### Integração

`packages/data/tests/ingest-cards.integration.test.ts`, rodando contra `cards-data/` real:
- `ingestão real lê 821 arquivos e descarta 99 envelopes de erro`
- `ingestão real emite exatamente 722 cartas`
- `ingestão real emite numero 001 a 722 contíguo e ordenado`
- `ingestão real não emite nenhum numero duplicado`
- `ingestão real observa exatamente 24 classes distintas`
- `ingestão real observa exatamente 10 guardiões distintos`
- `ingestão real distribui os tipos em 621 monstro, 24 ritual, 34 equipamento, 33 magica, 10 armadilha`
- `ingestão real resolve 722 artes sem ausência nem órfã`
- `ingestão real normaliza as 24 cartas sem senha para password null e estrelas null`
- `ingestão real normaliza os 24 rituais com atk, def e guardiões null`
- `ingestão real conclui com completo true e exit code zero`
- `ingestão real produz bytes idênticos em duas execuções consecutivas`

### Análise estática

- `packages/data/src/**` não importa `node:fs`, `node:path`, `node:process` nem `fetch` — o
  núcleo de ingestão é puro e testável sem filesystem (guidelines §3.3, §12).
- `packages/data` importa apenas `packages/shared`; nenhum import de `rules`, `engine`, `ai`,
  `web`, `server`, React, DOM ou Supabase (`arquitetura.md` §2, guidelines §3.3).
- `packages/shared` não importa nenhum outro pacote do monorepo.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F01) | Teste |
|---|---|
| Lê 821 arquivos, descarta exatamente os 99 `success:false`, emite 722 cartas | `ingestão real lê 821 arquivos e descarta 99 envelopes de erro` + `ingestão real emite exatamente 722 cartas` |
| Cada carta no schema canônico de 12 campos, sem o envelope | `serializarArtefatos emite as chaves da carta na ordem canônica` + validação de todo o dataset contra `CartaSchema` na integração |
| Colisão de nome de arquivo resolve em favor do registro válido, sem duplicar nem sobrescrever | `ingerirFonte descarta envelope success false sem contá-lo como carta` + `ingestão real não emite nenhum numero duplicado` |
| Tipo `ritual` preservado como quinto tipo | `normalizarCarta preserva tipo ritual como quinto tipo` + `ingestão real distribui os tipos em 621/24/34/33/10` |
| `numero` 001–722 contíguo e ordenado; faltante é reportado e marca o dataset incompleto | `ingestão real emite numero 001 a 722 contíguo e ordenado` + `agregarCartas reporta numero ausente quando há lacuna no intervalo` + `ingerirFonte marca completo false quando há numero ausente` |
| Pasta de origem ausente aborta sem emitir dataset parcial | `ingerirFonte falha quando a lista de arquivos está vazia` + caso de CLI com diretório inexistente verificando que nenhum arquivo foi escrito |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: o dataset produzido por F01 e selado por F02 é o único servido por F03 — nenhuma outra fonte de carta existe no módulo | Análise estática: nenhum arquivo fora de `packages/data/src/ingestao` e `packages/data/scripts` referencia `cards-data/`; F03 só lê `generated/cards.json` |
| Cross-Feature: as artes de F04 correspondem 1:1 às cartas de F03 (722 ↔ 722, faltas no placeholder) | `ingestão real resolve 722 artes sem ausência nem órfã` — estabelece a paridade que F04 consome |
| Cross-Feature: a contagem canônica é consistente sem reaparecer o número inflado 821 | `ingestão real emite exatamente 722 cartas`; `TOTAL_CARTAS_CANONICO` é a única constante de contagem em `shared` e `arquivosLidos: 821` fica confinado ao relatório de processo |
| Cross-PRD: Password localiza cartas por `findByPassword` usando o campo `password` do catálogo | `ingestão real normaliza as 24 cartas sem senha para password null e estrelas null` — garante que a sentinela `"Indisponível"` nunca chega ao índice de senha de F03 |
