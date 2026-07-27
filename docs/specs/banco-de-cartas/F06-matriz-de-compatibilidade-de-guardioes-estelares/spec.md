# Matriz de Compatibilidade de Guardiões Estelares

> PRD: `docs/prds/banco-de-cartas.md` — F06
> Pacote-alvo: `packages/data`

## 1. Contexto e Escopo

Esta feature hospeda, de forma data-driven, a matriz 10×10 de compatibilidade entre Guardiões
Estelares (`arquitetura.md` §4.2: `Sun, Moon, Mars, Jupiter, Mercury, Neptune, Pluto, Saturn,
Uranus, Venus`) — a relação de vantagem/desvantagem/bônus de ataque que `product.md` (linhas
27–46) descreve como calculada "conforme a tabela clássica do jogo" a partir do guardião escolhido
na invocação. Onde F03 já expõe o catálogo de cartas e o conjunto de Guardiões efetivamente usados
por elas, F06 entrega o **schema**, o **loader** e a **validação de cobertura** dessa relação —
nunca o cálculo de vantagem em duelo em si, que pertence ao Guardian Star Engine (cross-PRD, ainda
sem PRD próprio) e ao Motor de Duelo 1x1.

**Pendência de dados, regra dura (Fase 0.4 do skill; `arquitetura.md` §4.3, §10; ADR-003
`[PRECISA DE ENTRADA]`):** a tabela clássica de vantagem/desvantagem/bônus entre os 10 Guardiões
**não existe no repositório e não está definida em `product.md`** além da menção de que ela existe
e é calculada automaticamente. Esta spec **não inventa nenhum valor de lore**. Ela entrega
schema + loader + validação de cobertura; a matriz viaja **vazia** (arquivo fonte seed `[]`) até
que os valores sejam fornecidos externamente. Enquanto isso, toda consulta devolve o comportamento
neutro documentado — "vantagem neutra / modificador 0" — que é exatamente o fallback que o motor
de duelo (cross-PRD) deve tratar como "sem bônus".

O desenho segue o mesmo padrão de F01/F02/F03 (`arquitetura.md` §4.1, ADR-003, ADR-008): núcleo
puro de normalização/validação sobre dados já lidos, com todo I/O confinado a um adaptador CLI
fino na borda (`TypeScript-development-guidelines.md` §3.3, §12, §19.2). Diferente de F01/F02, o
dado de entrada aqui **não** deriva de `cards-data/` — é um arquivo autoral, fornecido pelo
mantenedor de dados, que este mesmo módulo hospeda e versiona.

### Incluído

- Tipos e schema zod da entrada da matriz: par ordenado (guardião atacante × guardião defensor) →
  resultado categórico (`vantagem`/`desvantagem`/`neutro`) + magnitude de bônus de ataque (PRD F06
  Capabilities — "Define o schema da matriz... e o loader")
- Arquivo fonte autoral versionado em git, com seed vazio (`[]`), pronto para receber os valores
  reais numa PR futura
- Loader que reparsea a fonte, rejeita entradas malformadas e pares duplicados (tudo-ou-nada) e
  monta uma estrutura indexada e imutável
- Função de consulta guardião×guardião **total** — nunca lança, devolve o fallback neutro quando o
  par não está na matriz (PRD F06 Experience — "disponibiliza a consulta guardião×guardião")
- Derivação do conjunto **real** de Guardiões usados pelas 722 cartas, via `CatalogoCartas.listByGuardiao`
  de F03 — não uma lista hard-coded redundante (PRD F06 Consumes; instrução explícita desta tarefa)
- Relatório de cobertura da matriz contra esse conjunto real, listando pares faltantes sem nunca
  bloquear o build (PRD F06 Capabilities — "validar que todos os Guardiões usados... estão
  cobertos"; PRD F06 Capabilities — "a validação de cobertura fica pendente")
- Adaptador de I/O (script) que orquestra fonte → catálogo real → matriz + relatório de cobertura,
  com resumo no stdout (PRD F06 Experience)

### Fronteiras

- **Valores reais da matriz** (as próprias vantagens/desvantagens/bônus do jogo original) → dado
  externo pendente, fornecido pelo mantenedor de dados. Nunca inventados aqui. — Fase 0.4; PRD §6
  F06 Capabilities; PRD §7
- **Cálculo de vantagem em duelo** (aplicar o resultado da consulta ao ATK/DEF efetivo de um
  monstro em combate) → **Guardian Star Engine / Motor de Duelo 1x1** (cross-PRD, sem PRD ainda).
  F06 só hospeda o dado e a função de consulta pura; não decide como o motor a usa. — PRD §7
- **Escolha de qual dos dois guardiões de um monstro (`guardiao1`/`guardiao2`) entra no cálculo
  durante a invocação** (`product.md`: "o jogador escolhe um dos dois") → mecanismo de estado de
  duelo, já registrado como lacuna aberta por `motor-duelo-1x1` F04 (Decisões 1 e 10 daquela
  spec) e **não resolvido nem reaberto aqui**. F06 expõe a consulta para um par de guardiões já
  determinado; quem determina esse par é o motor.
- **Leitura, normalização e veredito do catálogo de cartas** → **F01/F02/F03**, já especificadas.
  F06 apenas consome o catálogo já validado e servido por F03. — PRD §6 F03
- **Empacotamento em bundle versionado para distribuição offline/online** → **F09**, ainda sem
  spec. F06 apenas garante que seus artefatos gerados existam e sejam schema-válidos para F09
  incluir. — PRD §6 F09
- **Matriz terreno↔classe, fusões, drops** → F05, F07, F08, features distintas do mesmo PRD, não
  tocadas aqui.

### Contratos externos assumidos

- **`CatalogoCartas` (F03, mesma PRD, já especificada em
  `docs/specs/banco-de-cartas/F03-servico-de-catalogo-de-cartas/spec.md`).** Consumido apenas para
  `listByGuardiao`, a fim de derivar o conjunto real de Guardiões usados. Não é uma dependência
  cross-PRD — é interna ao módulo `banco-de-cartas` e já tem spec e API estáveis.
- **Guardian Star Engine / Motor de Duelo 1x1 (cross-PRD, sem PRD próprio ainda).** F06 declara o
  contrato que esses módulos futuros vão consumir (`MatrizGuardioes.consultarCompatibilidade`) e
  que se encaixa na porta `ProvedorModificadorGuardiao` já declarada por
  `docs/specs/motor-duelo-1x1/F04-calculo-de-atk-def-efetivo/spec.md` (Seção 3, Contratos). *A ser
  implementado por esses módulos quando existirem* — F06 não os implementa nem os bloqueia.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | F06 não tem blocos "Core Scope"/"Full Scope additions" no PRD — a spec cobre o escopo completo da feature, sem divisão. | Política de Auto-Aceite (Escopo) | confirmada |
| 2 | **Regra dura de dado externo:** os valores da matriz de Guardiões não existem no repositório e não são inventados aqui. A feature entrega schema + loader + validação de cobertura; o arquivo fonte trafega com seed vazio (`[]`) até valores serem fornecidos externamente. Nenhum critério de aceite sobre "os valores batem com a tabela clássica" é satisfeito por esta spec — permanece bloqueado (PRD §9 F06, terceiro critério). | Fase 0.4 do skill; `arquitetura.md` §4.3, §10; ADR-003 `[PRECISA DE ENTRADA]`; Política de Auto-Aceite (tabela pendente) | confirmada — pendência registrada |
| 3 | **Forma da entrada da matriz:** par ordenado `(atacante, defensor)` → `resultado` categórico (`vantagem`/`desvantagem`/`neutro`) + `bonusAtaque` numérico (magnitude, ATK apenas). Casa com `product.md` linhas 40–46 ("vantagem, desvantagem, bônus de **ataque**... conforme a tabela clássica") e com o PRD F06 Capabilities ("guardião atacante × guardião defensor → vantagem/desvantagem/bônus"). O bônus é só de ATK (não DEF), deliberadamente distinto do delta `{atk, def}` genérico que a porta `ProvedorModificadorGuardiao` de `motor-duelo-1x1` F04 aceita — aquela spec já previu essa assimetria (F04 Decisão 3: "quando a tabela real existir, ela pode ser assimétrica, ex. só atk"). A futura implementação real da porta é quem mapeia `bonusAtaque` para `{atk: bonusAtaque, def: 0}` (com sinal conforme `resultado`). | `product.md` linhas 40–46; PRD §6 F06 Capabilities; `motor-duelo-1x1` F04 spec, Decisão 3 | confirmada |
| 4 | **Coerência interna resultado↔bônus:** `resultado === 'neutro'` exige `bonusAtaque === 0`; `resultado !== 'neutro'` (`vantagem` ou `desvantagem`) exige `bonusAtaque > 0`. `bonusAtaque` é sempre uma magnitude não-negativa — o sinal da aplicação (soma ou subtração ao ATK do atacante) é decidido pelo consumidor a partir de `resultado`, não armazenado como número negativo. Regra de coerência no mesmo espírito de `checarCoerenciaPorTipo` de F02. | Extensão análoga a F02 Decisão 4; consistência de schema | confirmada |
| 5 | **Reparse tudo-ou-nada, sem descarte silencioso.** Diferente de F01 (que descarta registro inválido e segue o lote), qualquer entrada malformada ou par `(atacante, defensor)` duplicado **aborta o build inteiro** da matriz. Um dado de balanceamento de jogo descartado silenciosamente seria pior do que abortar e forçar correção — mesmo espírito fail-safe do ADR-003, e mesmo padrão "tudo-ou-nada" já usado por F03 (`criarCatalogo`, Decisão 3) para o catálogo. | ADR-003 (fail-safe); F03 spec Decisão 3 (tudo-ou-nada) | confirmada |
| 6 | **Cobertura validada contra o conjunto real de uso, não contra uma lista hard-coded.** `obterGuardioesUsados` deriva os Guardiões efetivamente usados filtrando `GUARDIOES_ESTELARES` (constante de 10 valores, `packages/shared`, já definida por F01) por `catalogo.listByGuardiao(g).length > 0`. `GUARDIOES_ESTELARES` serve só como **universo de busca** (os únicos 10 valores que o schema aceita), nunca como "cobertura esperada" fixa — se um dataset futuro deixasse de usar algum guardião, a cobertura exigida encolheria junto, sem editar código. | Instrução explícita desta tarefa; PRD §6 F06 Consumes ("obter o conjunto de Guardiões usados pelas cartas") | confirmada |
| 7 | **Cobertura incompleta nunca bloqueia o build.** `validarCoberturaMatriz` é um relatório informativo (mesmo padrão do `RelatorioValidacao` de F02, mas sem selo de válido/inválido) — reflete o PRD F06 Capabilities: "a validação de cobertura fica pendente" enquanto os valores não existem. O script de build só aborta em **erro estrutural** (fonte ausente/ilegível, entrada malformada, par duplicado, catálogo indisponível) — nunca por a matriz estar vazia ou parcial. | PRD §6 F06 Capabilities; Política de Auto-Aceite (fallback neutro) | confirmada |
| 8 | **O arquivo fonte é versionado em git**, ao contrário de `packages/data/generated/` (gitignored por F01 Decisão 5). Diferente dos artefatos de F01/F02 — que são saída determinística de um pipeline sobre `cards-data/` e por isso não precisam de diff de PR — a matriz de Guardiões é **entrada manual do mantenedor**: os valores reais, quando chegarem, chegam como uma alteração revisável nesse arquivo fonte. Localização: `packages/data/src/guardioes/dados/guardian-star-matrix.source.json`, seed inicial `[]`. | Consequência de ser dado externo fornecido por humano, não gerado; nenhum precedente direto em F01–F03, mas consistente com o papel de "insumo pendente" da Fase 0.4 | confirmada |
| 9 | **Localização em `packages/data`, não `packages/rules`.** Esta feature entrega só o dado (schema + loader + consulta), nunca o cálculo de vantagem em duelo — que é papel do Guardian Star Engine (cross-PRD, futuro, em `packages/rules`). Mesma divisão já estabelecida por `arquitetura.md` §4.3 ("Fusões, drops... matriz de guardiões... schema+loader agora, valores depois" no pacote `data`) e reforçada por `motor-duelo-1x1` F04 (que já criou os placeholders neutros em `rules`, mas não a fonte do dado). | `arquitetura.md` §4.3; PRD §6 F06 Experience; PRD §7 | confirmada |
| 10 | **`EntradaMatrizGuardiao`/`MatrizGuardioes` ficam em `packages/data`, não em `packages/shared`.** Mesmo argumento já usado por F03 (Decisão, tipos novos de `CatalogoCartas`): nenhum pacote acima de `data` na direção de dependências (`shared ← data ← rules ← engine ← ai`) precisa desses tipos sem já depender de `data` — `rules` (futuro Guardian Star Engine) já depende de `data`. | F03 spec, raciocínio análogo (`CatalogoCartas` não precisa viver em `shared`) | confirmada |
| 11 | **`consultarCompatibilidade` é uma função total.** Para qualquer par de guardiões dentre os 10 conhecidos, nunca lança e sempre devolve uma `EntradaMatrizGuardiao` — a real, se cadastrada, ou o fallback sintético `{ atacante, defensor, resultado: 'neutro', bonusAtaque: 0 }`. É o ponto exato que a futura implementação real de `ProvedorModificadorGuardiao` (`motor-duelo-1x1` F04) vai envolver — nenhuma mudança de assinatura será necessária quando a tabela real chegar. | Política de Auto-Aceite (fallback neutro); PRD §6 F06 Capabilities | confirmada |
| 12 | **Nenhuma suposição de simetria ou "roda" entre pares.** O par `(A, B)` e o par `(B, A)` são entradas independentes na fonte — a spec não presume que "se A tem vantagem sobre B, então B tem desvantagem sobre A" nem qualquer estrutura cíclica. Impor essa regra seria inventar uma propriedade da tabela clássica antes dela existir. Quem fornecer os valores decide se e como essa simetria se aplica. | Regra dura de não inventar valores de lore (Fase 0.4) | confirmada |
| 13 | **Fixtures de teste usam valores fictícios**, nunca reais — bônus e resultados sintéticos (ex.: `Sun→Sun neutro bonusAtaque 0`, ou pares gerados por `fast-check`) servem só para exercitar a lógica pura de normalização/indexação/cobertura, e não representam nem se aproximam da tabela real do jogo original. | Regra dura de não inventar valores de lore (Fase 0.4); precedente F02 (fixtures sintéticos) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/src/guardioes/tipos.ts` | data | novo | `ResultadoCompatibilidadeGuardiao`, `EntradaMatrizGuardiao`, `MatrizGuardioes`, `ParGuardioesFaltante`, `RelatorioCoberturaGuardioes` |
| `packages/data/src/guardioes/schema.ts` | data | novo | `EntradaMatrizGuardiaoSchema` (zod) e `MatrizGuardioesFonteSchema` (`z.array(...)`) |
| `packages/data/src/guardioes/normalizar-entrada.ts` | data | novo | `normalizarEntradaMatriz`: valida uma entrada bruta e a coerência resultado↔bônus |
| `packages/data/src/guardioes/criar-matriz.ts` | data | novo | `criarMatrizGuardioes`: reparse tudo-ou-nada, rejeição de par duplicado, indexação, congelamento |
| `packages/data/src/guardioes/guardioes-usados.ts` | data | novo | `obterGuardioesUsados`: deriva o conjunto real a partir de `CatalogoCartas` (F03) |
| `packages/data/src/guardioes/validar-cobertura.ts` | data | novo | `validarCoberturaMatriz`: relatório de pares faltantes, nunca bloqueante |
| `packages/data/src/guardioes/index.ts` | data | novo | Export público do subsistema |
| `packages/data/scripts/build-guardian-matrix.ts` | data | novo | Adaptador de I/O: lê a fonte, carrega o catálogo real (via `carregarCatalogoDoDisco` de F03), chama o núcleo puro, escreve os artefatos gerados, imprime resumo, define exit code |
| `packages/data/src/guardioes/dados/guardian-star-matrix.source.json` | data | novo (versionado em git) | Fonte autoral do mantenedor. Seed inicial: `[]` |
| `packages/data/generated/guardian-star-matrix.json` | data | gerado (gitignored) | Matriz validada, consumida por F09 e pelo futuro Guardian Star Engine |
| `packages/data/generated/guardian-star-coverage-report.json` | data | gerado (gitignored) | Relatório de cobertura, consumido pelo mantenedor de dados |
| `packages/data/tests/fixtures/guardioes/` | data | novo | Fontes sintéticas: vazia, com entrada válida, com par duplicado, com entrada incoerente (resultado×bônus), com guardião desconhecido |
| `packages/data/src/guardioes/normalizar-entrada.test.ts` | data | novo | Unitários table-driven de normalização/coerência |
| `packages/data/src/guardioes/criar-matriz.test.ts` | data | novo | Unitários de indexação, par duplicado, tudo-ou-nada |
| `packages/data/src/guardioes/guardioes-usados.test.ts` | data | novo | Unitários de derivação do conjunto real |
| `packages/data/src/guardioes/validar-cobertura.test.ts` | data | novo | Unitários de relatório de cobertura |
| `packages/data/tests/build-guardian-matrix.integration.test.ts` | data | novo | Integração contra a fonte real (hoje vazia) + catálogo real de F01/F02/F03 |
| `turbo.json` | raiz | alterado | Nova tarefa `data:guardian-matrix`, `dependsOn: ["data:ingest", "data:validate"]` (precisa do catálogo real via F03), cacheada por `inputs`/`outputs` |

**Verificação da direção de dependências:** `packages/data` continua importando **apenas**
`packages/shared` (reaproveita `GuardiaoEstelar`, `GuardiaoEstelarSchema`, `GUARDIOES_ESTELARES`,
`Result`, `DomainError`, já definidos por F01) mais o subsistema `catalogo` do próprio `packages/data`
(F03, mesmo pacote). Nenhum import novo de `rules`, `engine`, `ai`, `web` ou `server` — a direção
`shared ← data` de `arquitetura.md` §2 é preservada.

Esta feature **não toca `packages/engine`**, portanto as garantias de pureza/PRNG do motor não se
aplicam diretamente. A fronteira de I/O segue o mesmo padrão de F01/F02/F03:

- `packages/data/src/guardioes/**` **não** importa `node:fs`, `node:path` nem `fetch` — recebe
  conteúdo já lido/parseado (o array bruto da fonte, o `CatalogoCartas` já construído) e devolve
  estruturas em memória. É testável sem filesystem.
- `packages/data/scripts/build-guardian-matrix.ts` é o único ponto com `node:fs`/`node:path` deste
  subsistema — lê a fonte do disco, chama `carregarCatalogoDoDisco` (F03, que também é um
  adaptador de I/O), e escreve os dois artefatos gerados.

## 3. Design Técnico

### Estruturas de dados

**`ResultadoCompatibilidadeGuardiao`** — union fechado: `vantagem`, `desvantagem`, `neutro`.

**`EntradaMatrizGuardiao`** (`packages/data`, objeto `Readonly`):

| Campo | Tipo | Semântica e regra |
|---|---|---|
| `atacante` | `GuardiaoEstelar` | Guardião do monstro que ataca; um dos 10 valores fechados de `shared` |
| `defensor` | `GuardiaoEstelar` | Guardião do monstro que defende |
| `resultado` | `ResultadoCompatibilidadeGuardiao` | Categoria da relação nesse sentido (`atacante` → `defensor`) |
| `bonusAtaque` | `number` | Inteiro ≥ 0. Magnitude do ajuste de ATK do atacante. `0` sse `resultado === 'neutro'` (Decisão 4) |

**`MatrizGuardioes`** (público, `Readonly<{...}>`, congelado por `criarMatrizGuardioes` — mesmo
estilo de factory imutável de F03):

```ts
type MatrizGuardioes = Readonly<{
  consultarCompatibilidade(
    atacante: GuardiaoEstelar,
    defensor: GuardiaoEstelar,
  ): EntradaMatrizGuardiao;
  listarEntradas(): readonly EntradaMatrizGuardiao[];
  tamanho(): number;
}>;
```

**`ParGuardioesFaltante`** — `{ atacante: GuardiaoEstelar; defensor: GuardiaoEstelar }`.

**`RelatorioCoberturaGuardioes`** — evidência de processo consumida pelo mantenedor:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `guardioesUsados` | `readonly GuardiaoEstelar[]` | Conjunto real derivado do catálogo (F03), na ordem de `GUARDIOES_ESTELARES` |
| `paresEsperados` | `number` | `guardioesUsados.length ** 2` (pares ordenados, incluindo `atacante === defensor`) |
| `paresCobertos` | `number` | Quantos desses pares têm entrada na matriz |
| `paresFaltantes` | `readonly ParGuardioesFaltante[]` | Pares esperados sem entrada correspondente |
| `completo` | `boolean` | `true` sse `paresFaltantes` está vazio |
| `geradoEm` | `string` | ISO 8601, não entra em garantia de determinismo byte-a-byte |

### Fluxo

1. **Ler a fonte autoral.** O adaptador CLI lê
   `packages/data/src/guardioes/dados/guardian-star-matrix.source.json` e faz `JSON.parse`.
2. **Verificar a origem.** Arquivo ausente ou JSON ilegível → aborta antes de qualquer escrita, com
   exit code ≠ 0 e nenhum artefato parcial (mesmo padrão de F01 para pasta de origem ausente).
3. **Normalizar cada entrada.** `normalizarEntradaMatriz` valida `atacante`/`defensor` contra o
   enum fechado de 10 guardiões, `resultado` contra o enum de 3 valores, `bonusAtaque` como
   inteiro ≥ 0, e a coerência resultado↔bônus (Decisão 4). Qualquer falha em qualquer entrada
   **aborta o build inteiro** (Decisão 5) — diferente de F01, não há descarte parcial.
4. **Detectar pares duplicados.** Duas entradas válidas com o mesmo `(atacante, defensor)` →
   aborta, citando os dois índices e o par repetido.
5. **Indexar e congelar.** `criarMatrizGuardioes` monta um índice interno por par ordenado
   (chave `${atacante}:${defensor}`), congela cada entrada e o objeto `MatrizGuardioes` final.
6. **Carregar o catálogo real.** O adaptador chama `carregarCatalogoDoDisco` (F03) sobre
   `packages/data/generated/`. Falha (selo inválido, artefato ausente) → aborta; sem catálogo não
   há como derivar o conjunto real de Guardiões usados.
7. **Derivar os Guardiões usados.** `obterGuardioesUsados(catalogo)` filtra
   `GUARDIOES_ESTELARES` por `catalogo.listByGuardiao(g).length > 0` (Decisão 6).
8. **Validar a cobertura.** `validarCoberturaMatriz` gera todo par ordenado `(a, b)` com
   `a, b ∈ guardioesUsados` (incluindo `a === b`) e verifica, via `matriz.consultarCompatibilidade`
   restrito a pares realmente cadastrados (não o fallback), se cada par tem entrada própria.
   Faltantes alimentam `paresFaltantes`; **nunca aborta** (Decisão 7).
9. **Serializar e escrever.** O adaptador grava `guardian-star-matrix.json` (as entradas validadas,
   na ordem da fonte) e `guardian-star-coverage-report.json` em `packages/data/generated/`.
10. **Imprimir o resumo** no stdout: guardiões usados, pares esperados/cobertos/faltantes, veredito
    de completude (PRD F06 Experience). Exit code sempre `0` quando não há erro estrutural — a
    incompletude da cobertura **não** afeta o exit code (Decisão 7).

### Regras de negócio

- **Coerência resultado↔bônus** (Decisão 4): `resultado === 'neutro' ⟺ bonusAtaque === 0`.
  Verificado nos dois sentidos por `normalizarEntradaMatriz`.
- **Tudo-ou-nada na normalização e na deduplicação** (Decisão 5): qualquer entrada inválida ou
  qualquer par duplicado impede a matriz de ser construída — não existe "matriz parcialmente
  válida" nesta feature (diferente de F01/F02, que toleram descarte parcial sobre 722 registros
  vindos de fontes externas não controladas pelo mantenedor).
- **Cobertura é sempre relativa ao uso real** (Decisão 6): `paresEsperados` nunca é fixado em 100
  (10×10) por hipótese — é sempre `guardioesUsados.length ** 2`, hoje 100 porque os 10 guardiões
  estão de fato em uso (`arquitetura.md` §4.2), mas a fórmula se ajusta caso o dataset mude.
- **Fallback neutro é o comportamento ativo, não um erro** (Decisão 11):
  `matriz.consultarCompatibilidade(a, b)` para um par sem entrada devolve
  `{ atacante: a, defensor: b, resultado: 'neutro', bonusAtaque: 0 }` — mesma forma de uma entrada
  real, para que o consumidor (futuro Guardian Star Engine) não precise distinguir "par
  desconhecido" de "par explicitamente neutro" na sua lógica de aplicação.

### Determinismo e pureza

Não se aplica a `packages/engine` — esta feature não toca o motor, não emite eventos e não
manipula `EstadoDuelo`. As funções em `packages/data/src/guardioes/**` são puras (mesma entrada →
mesma saída, sem I/O); `geradoEm` é o único campo não determinístico de
`RelatorioCoberturaGuardioes`, por isso o relatório de cobertura fica fora de qualquer garantia de
bytes idênticos, mesmo padrão de `ingestion-report.json` (F01) e `validation-report.json` (F02).
`guardian-star-matrix.json` (sem timestamp) é byte-determinístico para a mesma fonte.

## 4. Contratos

### Tipos e schemas (`packages/data`)

- **`ResultadoCompatibilidadeGuardiaoSchema`** — enum zod dos 3 valores. Tipo derivado
  `ResultadoCompatibilidadeGuardiao`.
- **`EntradaMatrizGuardiaoSchema`** — objeto estrito: `atacante`/`defensor` via
  `GuardiaoEstelarSchema` (reaproveitado de `packages/shared`, F01); `resultado` via
  `ResultadoCompatibilidadeGuardiaoSchema`; `bonusAtaque` inteiro ≥ 0. Tipo derivado
  `EntradaMatrizGuardiao`, envolvido em `Readonly` (guidelines §6.3).
- **`MatrizGuardioesFonteSchema`** — `z.array(EntradaMatrizGuardiaoSchema)`. A forma exata do
  arquivo `guardian-star-matrix.source.json` — array vazio é válido (schema-válido mesmo sem
  nenhum valor, satisfazendo a regra dura de dado pendente).
- **Reaproveitados sem alteração de `packages/shared` (F01):** `GuardiaoEstelar`,
  `GuardiaoEstelarSchema`, `GUARDIOES_ESTELARES`, `Result`, `DomainError`.
- Códigos de erro usados: `fonte_matriz_ausente`, `entrada_matriz_invalida`,
  `resultado_bonus_incoerente`, `par_guardiao_duplicado`, `catalogo_indisponivel` (reaproveitado de
  F03, propagado quando `carregarCatalogoDoDisco` falha).

### Funções públicas

```
// packages/data/src/guardioes — núcleo puro, sem I/O

normalizarEntradaMatriz(bruto: unknown): Result<EntradaMatrizGuardiao, DomainError>
  // pré: bruto é um elemento do array já parseado da fonte, tipo unknown
  // pós: ok ⇒ EntradaMatrizGuardiao válida contra EntradaMatrizGuardiaoSchema e coerente
  //          (Decisão 4); erro ⇒ code identifica a violação (guardião desconhecido, resultado
  //          fora do enum, bonusAtaque inválido, ou incoerência resultado×bônus)

criarMatrizGuardioes(entradasBruto: unknown): Result<MatrizGuardioes, DomainError>
  // pré: entradasBruto é o array já parseado de guardian-star-matrix.source.json
  // reparse tudo-ou-nada via normalizarEntradaMatriz em cada elemento (Decisão 5)
  // par (atacante, defensor) repetido entre duas entradas válidas ⇒ erro par_guardiao_duplicado
  // pós: ok ⇒ MatrizGuardioes indexado por par ordenado, congelado; array vazio ⇒ matriz de
  //          tamanho zero, igualmente válida

obterGuardioesUsados(catalogo: CatalogoCartas): readonly GuardiaoEstelar[]
  // deriva de GUARDIOES_ESTELARES filtrando catalogo.listByGuardiao(g).length > 0 (Decisão 6)
  // ordenado conforme a ordem de GUARDIOES_ESTELARES

validarCoberturaMatriz(
  matriz: MatrizGuardioes,
  guardioesUsados: readonly GuardiaoEstelar[],
  agora: () => string,
): RelatorioCoberturaGuardioes
  // gera todo par ordenado (a,b) com a,b em guardioesUsados (inclui a===b)
  // marca faltante quando a matriz não tem entrada própria para o par (não conta o fallback)
  // nunca lança, nunca bloqueia (Decisão 7); relatório é sempre produzido, mesmo com matriz vazia
```

```
// packages/data/scripts/build-guardian-matrix.ts — adaptador de I/O

executarBuildMatrizGuardioes(opcoes: {
  caminhoFonte: string;       // packages/data/src/guardioes/dados/guardian-star-matrix.source.json
  dirCatalogoGerado: string;  // packages/data/generated (para carregarCatalogoDoDisco, F03)
  dirSaida: string;           // packages/data/generated
}): Promise<number>
  // lê e parseia caminhoFonte; ausente/ilegível ⇒ aborta, exit code ≠ 0
  // chama criarMatrizGuardioes; erro estrutural ⇒ aborta, exit code ≠ 0
  // carrega o catálogo real via carregarCatalogoDoDisco; erro ⇒ aborta, exit code ≠ 0
  // chama obterGuardioesUsados + validarCoberturaMatriz
  // escreve guardian-star-matrix.json e guardian-star-coverage-report.json em dirSaida
  // imprime o resumo; retorna 0 mesmo com cobertura incompleta (Decisão 7)
```

### Exemplos de artefato

`guardian-star-matrix.source.json` — **estado real hoje** (nenhum valor fornecido ainda):

```json
[]
```

Exemplo **ilustrativo da forma do dado** (não é a tabela real — usa um par neutro e autorreferente
apenas para demonstrar o schema, sem nenhuma implicação de lore):

```json
[
  {
    "atacante": "Sun",
    "defensor": "Sun",
    "resultado": "neutro",
    "bonusAtaque": 0
  }
]
```

`generated/guardian-star-matrix.json` — espelha a fonte após validação (hoje, vazio):

```json
[]
```

`generated/guardian-star-coverage-report.json` — **estado real esperado hoje**, contra os 10
Guardiões efetivamente usados nas 722 cartas (`arquitetura.md` §4.2) e uma matriz vazia:

```json
{
  "guardioesUsados": [
    "Sun", "Moon", "Mars", "Jupiter", "Mercury",
    "Neptune", "Pluto", "Saturn", "Uranus", "Venus"
  ],
  "paresEsperados": 100,
  "paresCobertos": 0,
  "paresFaltantes": [
    { "atacante": "Sun", "defensor": "Sun" },
    { "atacante": "Sun", "defensor": "Moon" }
  ],
  "completo": false,
  "geradoEm": "2026-07-27T12:10:00.000Z"
}
```

> `paresFaltantes` acima mostra apenas as 2 primeiras de 100 entradas esperadas, só para
> ilustrar a forma — a saída real lista todos os pares ausentes.

### Contratos externos (cross-PRD)

**A ser consumido por Guardian Star Engine e Motor de Duelo 1x1 (PRDs futuros, sem spec ainda):**
quando esses módulos existirem, a implementação real da porta `ProvedorModificadorGuardiao`
(assinatura já fixada por `motor-duelo-1x1` F04, `packages/engine/src/combate` +
`packages/rules/src/guardian-star`) deve envolver `matriz.consultarCompatibilidade(monstroAtacante.guardiaoEscolhido,
monstroDefensor.guardiaoEscolhido)` e mapear `{ resultado, bonusAtaque }` para o delta `{ atk, def
}` que aquela porta espera (`def: 0` sempre, dado que esta matriz só define bônus de ATK — Decisão
3). F06 não implementa essa ponte; apenas garante que `MatrizGuardioes` e
`RelatorioCoberturaGuardioes` estejam prontos para ser consumidos sem mudança de assinatura quando
o Guardian Star Engine for especificado.

## 5. Modelo de Dados

Esta feature não cria tabelas Postgres nem estruturas IndexedDB — não há estado por jogador. Ela
introduz um novo **arquivo de dados versionado em git** (diferente de F01/F02, que só produzem
saída gerada) e dois artefatos gerados:

| Arquivo | Formato | Determinístico | Versionado em git | Consumidor |
|---|---|---|---|---|
| `packages/data/src/guardioes/dados/guardian-star-matrix.source.json` | Array JSON de `EntradaMatrizGuardiao` | não se aplica (entrada autoral, não gerada) | **sim** — é a entrada manual do mantenedor (Decisão 8) | `build-guardian-matrix` (esta feature) |
| `packages/data/generated/guardian-star-matrix.json` | Array JSON de `EntradaMatrizGuardiao`, validado, mesma ordem da fonte | sim (byte-a-byte, sem timestamp) | não (gitignored, mesmo `.gitignore` de F01) | F09 (bundle, spec futura), Guardian Star Engine (cross-PRD, futuro) |
| `packages/data/generated/guardian-star-coverage-report.json` | Objeto JSON `RelatorioCoberturaGuardioes` | não (contém `geradoEm`) | não (gitignored) | mantenedor de dados |

**Versionamento em git do arquivo fonte:** ao contrário de `packages/data/generated/`, o arquivo
`guardian-star-matrix.source.json` **é** versionado — é a única forma de o mantenedor de dados
propor os valores reais como uma alteração revisável em PR (Decisão 8). A tarefa Turborepo
`data:guardian-matrix` declara `inputs: ["packages/data/src/guardioes/dados/guardian-star-matrix.source.json",
"packages/data/generated/cards.json", "packages/data/generated/arts-manifest.json",
"packages/data/generated/dataset-seal.json"]` (a fonte autoral **e** os artefatos de F01/F02 que o
carregamento do catálogo real exige) e `outputs: ["packages/data/generated/guardian-star-matrix.json",
"packages/data/generated/guardian-star-coverage-report.json"]`, com
`dependsOn: ["data:ingest", "data:validate"]`.

**`version`/`hash` do bundle:** não atribuídos aqui — pertencem a F10, que versiona o pacote
completo (catálogo + artes + as 4 tabelas auxiliares, incluindo esta) como uma unidade
(`arquitetura.md` §4.1).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| Arquivo fonte ausente ou JSON ilegível | Adaptador CLI, antes de qualquer checagem | **Aborta.** Nenhum artefato escrito, exit code ≠ 0 | `Fonte da matriz de Guardiões não encontrada ou ilegível em {caminho} — build cancelado.` |
| Entrada com `atacante`/`defensor` fora dos 10 Guardiões conhecidos | `normalizarEntradaMatriz` | **Aborta o build inteiro** (Decisão 5) | `Entrada {indice}: guardião '{valor}' não reconhecido.` |
| Entrada com `resultado` fora do enum de 3 valores | `normalizarEntradaMatriz` | **Aborta** | `Entrada {indice}: resultado '{valor}' não permitido.` |
| `bonusAtaque` negativo ou não inteiro | `normalizarEntradaMatriz` | **Aborta** | `Entrada {indice}: bonusAtaque inválido.` |
| `resultado === 'neutro'` com `bonusAtaque !== 0`, ou `resultado !== 'neutro'` com `bonusAtaque === 0` | `normalizarEntradaMatriz` | **Aborta** (código `resultado_bonus_incoerente`) | `Entrada {indice}: resultado '{resultado}' incoerente com bonusAtaque {valor}.` |
| Duas entradas válidas com o mesmo par `(atacante, defensor)` | `criarMatrizGuardioes` | **Aborta** (código `par_guardiao_duplicado`), citando os dois índices | `Par duplicado: {atacante}→{defensor} aparece nas entradas {i} e {j}.` |
| Catálogo (F03) indisponível ao carregar (`selo` inválido ou artefato ausente) | Adaptador CLI, via `carregarCatalogoDoDisco` | **Aborta** — sem catálogo real não há como validar cobertura | `Catálogo indisponível: não é possível validar a cobertura da matriz de Guardiões.` |
| Guardião usado no catálogo real sem entrada cobrindo um dos pares esperados | `validarCoberturaMatriz` | **Não aborta.** Relatório marca `completo: false` e lista o(s) par(es) faltante(s); artefatos são escritos normalmente (Decisão 7) | Sem mensagem individual — agregado em `paresFaltantes` |
| `matriz.consultarCompatibilidade(a, b)` chamado para um par sem entrada, em runtime, pelo consumidor cross-PRD | `MatrizGuardioes.consultarCompatibilidade` | **Não lança.** Devolve `{ atacante: a, defensor: b, resultado: 'neutro', bonusAtaque: 0 }` | — (comportamento neutro esperado, não é erro) |
| Falha ao escrever os artefatos gerados | `catch` no adaptador | Propaga com `cause` preservada, exit code ≠ 0 | `Falha ao escrever artefatos da matriz de Guardiões em {dirSaida}.` |

Todo erro estrutural é **registrado e abortante**; toda incompletude de valores é **registrada e
não-bloqueante** — a distinção central desta feature (Decisões 5 e 7), reforçando ADR-003 ("dados
inválidos devem falhar explicitamente" vs. "tabelas ausentes precisam ter comportamento neutro e
rastreável").

## 7. Estratégia de Testes

### Unitários (Vitest)

`normalizarEntradaMatriz` — table-driven (guidelines §11.2):
- `normalizarEntradaMatriz aceita entrada neutra com bonusAtaque zero`
- `normalizarEntradaMatriz aceita entrada com resultado vantagem e bonusAtaque positivo`
- `normalizarEntradaMatriz aceita entrada com resultado desvantagem e bonusAtaque positivo`
- `normalizarEntradaMatriz rejeita guardião atacante fora dos dez conhecidos`
- `normalizarEntradaMatriz rejeita guardião defensor fora dos dez conhecidos`
- `normalizarEntradaMatriz rejeita resultado fora do enum de três valores`
- `normalizarEntradaMatriz rejeita bonusAtaque negativo`
- `normalizarEntradaMatriz rejeita bonusAtaque não inteiro`
- `normalizarEntradaMatriz rejeita resultado neutro com bonusAtaque diferente de zero`
- `normalizarEntradaMatriz rejeita resultado vantagem com bonusAtaque zero`
- `normalizarEntradaMatriz rejeita resultado desvantagem com bonusAtaque zero`

`criarMatrizGuardioes`:
- `criarMatrizGuardioes aceita array vazio e devolve matriz de tamanho zero`
- `criarMatrizGuardioes indexa entradas válidas por par ordenado atacante e defensor`
- `criarMatrizGuardioes rejeita duas entradas com o mesmo par atacante e defensor`
- `criarMatrizGuardioes aborta tudo-ou-nada quando qualquer entrada falha a normalização`
- `criarMatrizGuardioes congela a lista de entradas retornada por listarEntradas`
- `criarMatrizGuardioes reporta tamanho igual ao numero de entradas validas`

`MatrizGuardioes.consultarCompatibilidade` (via instância construída em fixture):
- `consultarCompatibilidade devolve a entrada exata quando o par existe`
- `consultarCompatibilidade devolve fallback neutro quando o par nao existe`
- `consultarCompatibilidade devolve fallback neutro para qualquer par em matriz vazia`
- `consultarCompatibilidade nunca lanca para nenhuma combinacao dos dez guardioes`

`obterGuardioesUsados`:
- `obterGuardioesUsados retorna apenas os guardioes com pelo menos uma carta no catalogo`
- `obterGuardioesUsados retorna lista vazia quando o catalogo nao usa nenhum guardiao`
- `obterGuardioesUsados preserva a ordem de GUARDIOES_ESTELARES`

`validarCoberturaMatriz`:
- `validarCoberturaMatriz marca completo true quando todos os pares esperados estao cobertos`
- `validarCoberturaMatriz marca completo false e lista os pares faltantes quando a matriz esta vazia`
- `validarCoberturaMatriz calcula paresEsperados como o quadrado do numero de guardioes usados`
- `validarCoberturaMatriz nao gera nenhum par faltante quando guardioesUsados esta vazio`

### Property-based (fast-check)

- **Cobertura completa sse todos os pares presentes:** para qualquer subconjunto arbitrário de
  pares ordenados sobre um conjunto arbitrário de guardiões usados, `validarCoberturaMatriz` marca
  `completo: true` sse esse subconjunto é exatamente o produto cartesiano completo dos guardiões
  usados. 1.000 execuções.
- **Fallback neutro é total:** para toda combinação arbitrária de dois guardiões dentre os dez
  conhecidos, `consultarCompatibilidade` nunca lança e devolve `resultado: 'neutro'` quando o par
  não foi inserido na matriz.
- **Coerência resultado↔bônus:** para qualquer `resultado` e `bonusAtaque` gerados
  aleatoriamente, `normalizarEntradaMatriz` aceita a entrada sse
  `(resultado === 'neutro') === (bonusAtaque === 0)`.
- **Nenhuma duplicata sobrevive:** injetar um número arbitrário de entradas com pares `(atacante,
  defensor)` repetidos em posições arbitrárias sempre faz `criarMatrizGuardioes` abortar.

### Integração

`packages/data/tests/build-guardian-matrix.integration.test.ts`, rodando após a ingestão (F01),
validação (F02) e catálogo (F03) reais:
- `build real da matriz de guardioes aceita a fonte vazia hoje e emite matriz de tamanho zero`
- `build real deriva os dez guardioes usados a partir do catalogo real`
- `build real reporta cobertura incompleta com cem pares faltantes sobre a fonte vazia atual`
- `build real aborta sem escrever artefatos quando o arquivo fonte esta ausente`
- `build real aborta quando o catalogo real nao pode ser carregado`

### Análise estática

- `packages/data/src/guardioes/**` não importa `node:fs`, `node:path` nem `fetch` — só
  `build-guardian-matrix.ts` tem I/O.
- `packages/data` continua importando apenas `packages/shared` (mais o subsistema `catalogo` do
  próprio pacote) — nenhum import de `rules`, `engine`, `ai`, `web` ou `server`
  (`arquitetura.md` §2).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F06) | Teste |
|---|---|
| O schema da matriz e o loader estão definidos; a matriz carrega e responde consultas guardião×guardião | `criarMatrizGuardioes aceita array vazio e devolve matriz de tamanho zero` + `consultarCompatibilidade devolve a entrada exata quando o par existe` + `consultarCompatibilidade devolve fallback neutro quando o par nao existe` |
| A validação aponta qualquer Guardião usado por cartas do catálogo que não esteja coberto pela matriz | `validarCoberturaMatriz marca completo false e lista os pares faltantes quando a matriz esta vazia` + `build real reporta cobertura incompleta com cem pares faltantes sobre a fonte vazia atual` |
| **(Pendente)** Os valores de vantagem/desvantagem/bônus batem com a tabela clássica | Não testável hoje — critério bloqueado (Decisão 2). A fonte trafega vazia; o fallback neutro é o comportamento ativo enquanto os valores não chegam; nenhum teste desta spec afirma fidelidade de valores |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "O pacote de F09 contém exatamente o catálogo de F03, as artes de F04 e as tabelas de F05–F08 (inclui F06), e F10 versiona esse pacote como uma unidade" | Contrato declarado nesta spec: `guardian-star-matrix.json` é o artefato schema-válido (possivelmente vazio) que F09 deve incluir no bundle — verificado quando F09 for especificada |
| Cross-PRD: "(Pendente) Quando os valores forem fornecidos, o Guardian Star Engine consome a matriz de F06... sem codificar essas regras localmente" | A porta `ProvedorModificadorGuardiao` (`motor-duelo-1x1` F04) já está pronta para envolver `matriz.consultarCompatibilidade`; nenhuma mudança de assinatura será necessária quando o Guardian Star Engine existir — pendência registrada explicitamente (Decisão 2, Contratos externos) |
