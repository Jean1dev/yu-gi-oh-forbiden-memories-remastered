# Tabelas de Drop por Duelista

> PRD: `docs/prds/banco-de-cartas.md` — F08
> Pacote-alvo: `packages/data` (+ `packages/shared`, reaproveitado sem alteração)

## 1. Contexto e Escopo

Esta feature hospeda, de forma data-driven, as tabelas de drop de carta por duelista (NPC):
para cada duelista, um **pool** de cartas dropáveis, cada uma com uma **probabilidade** relativa
e uma **condição** opcional. Como as quatro tabelas auxiliares do módulo (`arquitetura.md` §4.3),
F08 entrega **schema + loader + validação de referências**, nunca os valores — os pools reais de
drop por duelista **não existem no repositório** e são dado externo pendente (PRD §6 F08
Capabilities; PRD §7 "Definição de valores das tabelas pendentes"; ADR-003 `[PRECISA DE ENTRADA]`).

A única regra ativa hoje é estrutural: todo `numero` referenciado num pool de drop precisa existir
no catálogo de cartas (F03, `packages/data/src/catalogo`, função `getByNumero`). Enquanto os
valores não chegarem, a tabela carrega **vazia** (zero pools) e qualquer consulta por duelista
devolve lista vazia — o mesmo comportamento neutro que F05/F06/F07 adotam para fusões, Guardiões e
terreno (`arquitetura.md` §4.3: "o motor trata ausência como neutro... lista vazia").

**Fronteira central desta feature:** F08 só **hospeda dados**. A concessão do drop ao vencer um
duelo (sortear uma carta do pool, aplicar a condição, creditar na coleção do jogador) é
responsabilidade de Campanha e Free Duel (cross-PRD, fora de escopo — PRD §6 F08 Capabilities:
"este módulo só hospeda os dados"; PRD §7). F08 não sorteia, não usa PRNG e não decide qual carta
o jogador recebe — apenas expõe o pool consultável.

**Identificador de duelista:** nenhum PRD ou spec já gerada define um roster de duelistas/NPCs —
Campanha e Free Duel, os únicos módulos que teriam esse conceito, ainda não têm spec para essa
parte. F08 trata o identificador de duelista como uma **string opaca** definida pelo próprio
schema desta feature, sem validar significado, existência de personagem ou qualquer outro
metadado — apenas formato (não-vazia) e unicidade dentro do arquivo de drops. O roster real de
duelistas é um **contrato cross-PRD ainda não materializado**, que Campanha/Free Duel vão
definir; quando existir, ele é quem decide *quais* strings de duelista usar ao consultar esta
tabela — F08 não impõe nem conhece esse conjunto.

O desenho segue o mesmo padrão de F01/F02/F03 (`arquitetura.md` §4.1, ADR-003,
`TypeScript-development-guidelines.md` §3.2/§3.3/§12): núcleo de validação/agregação puro, sem
I/O, com toda leitura de arquivo confinada a um adaptador fino na borda.

### Incluído

- Schema (zod) da tabela de drops: duelista → pool de entradas, cada entrada com `numero`,
  `probabilidade` e `condicao` opcional (PRD F08 Capabilities)
- Loader que lê o arquivo de configuração de drops do disco, tratando **ausência do arquivo** (ou
  arquivo com array vazio) como **fallback neutro** — tabela com zero pools, sem erro
- Validação estrutural de cada entrada contra o schema (tipos, formato de `numero`, `probabilidade`
  positiva)
- Agregação por duelista com detecção de **duelista duplicado** entre duas pools no mesmo arquivo
- Validação de que todo `numero` dropável referenciado existe no catálogo de cartas (F03,
  `CatalogoCartas.getByNumero`) — PRD F08 Capabilities, critério de aceite 2
- API de consulta por duelista (`obterPoolPorDuelista`), listagem de duelistas com pool definido e
  listagem de todos os pools (para F09 empacotar)
- Arquivo de configuração inicial vazio (`[]`), documentando a pendência de dado externo

### Fronteiras

- **Definição dos valores dos pools de drop** (quais cartas cada duelista dropa, com que
  probabilidade e sob que condição) → **dado externo pendente**, fornecido pelo mantenedor de
  dados. Nunca inventado nesta spec. — PRD §6 F08 Capabilities; PRD §7
- **Roster de duelistas/NPCs** (quem são os duelistas, seus nomes, decks, dificuldade) →
  **Campanha e Free Duel** (cross-PRD, ainda sem spec para essa parte). F08 só define o *tipo* do
  identificador (string opaca), não o conjunto de valores válidos.
- **Sorteio do drop e concessão da carta ao jogador** (rolar a probabilidade, aplicar a condição,
  creditar a carta na coleção) → **Campanha / Free Duel** (cross-PRD). F08 não usa PRNG nem toma
  essa decisão. — PRD §6 F08 Capabilities; PRD §7
- **Validação de `numero`, carregamento do catálogo** → **F03**, já especificada. F08 consome
  `CatalogoCartas.getByNumero`, não reimplementa nem revalida o catálogo em si.
- **Empacotamento da tabela no bundle offline/servidor autoritativo** → **F09**. F08 entrega a
  tabela carregável e consultável; empacotá-la junto do catálogo, artes e demais tabelas
  auxiliares é responsabilidade de F09. — PRD §6 F09 Consumes
- **Versão/hash da distribuição** → **F10**. Fora de escopo aqui.

### Contratos externos assumidos

- **F03 — Serviço de Catálogo de Cartas** (`docs/specs/banco-de-cartas/F03-servico-de-catalogo-de-cartas/`,
  já com spec): F08 assume `CatalogoCartas.getByNumero(numero: NumeroCarta): Carta | undefined`
  como contrato interno já disponível. Nenhuma outra função de F03 é usada.
- **Roster de duelistas (Campanha / Free Duel)** — **contrato cross-PRD ainda não
  materializado**. F08 não bloqueia por causa disso: define `DuelistaId` como `string` opaca e
  documenta que o conjunto real de valores válidos será definido por esses módulos quando
  ganharem spec própria. Nenhuma validação de "duelista existe/é válido" ocorre aqui.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **`DuelistaId` é `string` não-vazia, opaca, definida em `packages/data`** (não em `shared`): nenhum pacote abaixo de `data` na direção de dependências precisa deste tipo, e qualquer consumidor cross-PRD (Campanha, Free Duel, em `apps/web`) já vai depender de `packages/data` para o catálogo — mesmo raciocínio de `CatalogoCartas` em F03 (Decisão de alocação daquela spec). | Auto-Aceite — política de auto-aceite do lote (pendência de dado externo); F03 spec §2 (precedente de alocação) | confirmada |
| 2 | **Roster de duelistas não existe e não é validado aqui.** F08 não checa se um `duelista` referenciado no arquivo de drops corresponde a um NPC real de Campanha/Free Duel — isso exigiria um contrato que ainda não foi especificado por nenhum PRD. A única checagem sobre `duelista` é estrutural (string não-vazia) e de unicidade dentro do próprio arquivo. Quando Campanha/Free Duel ganharem spec com um roster concreto, a validação cruzada (duelista do arquivo de drops existe no roster) é um refinamento futuro, fora desta feature. | Instrução explícita do orquestrador do lote; ausência confirmada de roster em qualquer PRD/spec existente | confirmada — pendência registrada |
| 3 | **Pendência de dado externo (regra dura): os pools de drop e as probabilidades/condições não existem no repositório e não são inventados nesta spec.** F08 entrega schema + loader + validação de referências de `numero`; a tabela viaja **vazia** (zero pools) até os valores serem fornecidos externamente. A concessão do drop em duelo é responsabilidade de Campanha/Free Duel (cross-PRD), fora de escopo. | PRD §6 F08 Capabilities; PRD §9 F08 (critério "Pendente"); `arquitetura.md` §4.3, §10; ADR-003 `[PRECISA DE ENTRADA]`; Auto-Aceite do lote | confirmada — pendência de dado externo |
| 4 | **Arquivo de dados versionado em git, distinto de `packages/data/generated/`.** O arquivo de drops (`packages/data/config/drop-tables.json`) é **hand-authored** pelo mantenedor de dados (não é saída de um pipeline de build como `cards.json`), então fica em `packages/data/config/` e **é versionado normalmente** — ao contrário de `generated/`, que F01 marca como `.gitignore`d (F01 spec, Decisão 5). Isso dá visibilidade de diff em PR quando o mantenedor eventualmente fornecer os valores reais. | Extensão consistente de `arquitetura.md` §4.3 ("schema+loader agora, valores depois"); F01 spec Decisão 5 (contraste explícito) | confirmada |
| 5 | **`probabilidade` é modelada como peso relativo** (`number` finito `> 0`), não como percentual normalizado a somar 1 por pool. O PRD cita apenas "probabilidades" sem fixar o modelo (pesos vs. percentual exato); pesos relativos são mais tolerantes a preenchimento parcial de um pool (não exigem que a soma feche em 100% a cada edição incremental do mantenedor) e a semântica de **como sortear** com esses pesos é decisão de consumo de Campanha/Free Duel (cross-PRD), não desta feature. | PRD §6 F08 Capabilities (especificação parcial — "probabilidades" sem modelo fixado); default de boa prática, Auto-Aceite | confirmada — especificação parcial resolvida |
| 6 | **`condicao` é `string` livre opcional (não `null`), sem enum fechado.** Não existe, em `product.md` nem em nenhum PRD, um vocabulário fechado de condições de drop (ex.: "somente na primeira vitória", "somente em dificuldade alta"). Fixar um enum agora seria inventar valores de regra que não foram fornecidos. O campo é opcional e, quando ausente, significa "sem condição além de vencer o duelo". A interpretação do texto livre é de quem consome (Campanha/Free Duel). | PRD §6 F08 Capabilities ("pools de cartas + probabilidade/condição", sem detalhar o vocabulário); regra "nunca inventar valores" da Fase 0.4 do skill | confirmada |
| 7 | **Validação tudo-ou-nada por arquivo, exceto a ausência do arquivo.** Arquivo ausente **ou** presente com array vazio → sucesso imediato, tabela com zero pools (é o caminho neutro esperado hoje). Qualquer outro conteúdo com **pelo menos uma** violação (schema malformado, `duelista` duplicado, ou `numero` inexistente no catálogo) rejeita o **arquivo inteiro** com erro explícito — não há carregamento parcial silencioso de pools "quase corretos". Mesma filosofia fail-safe de `criarCatalogo` em F03 (Decisão 3 daquela spec) e do ADR-003 ("dados inválidos devem falhar explicitamente"). | F03 spec Decisão 3 (precedente direto); ADR-003 | confirmada |
| 8 | **Nenhum PRNG, nenhuma lógica de sorteio nesta feature.** F08 expõe o pool consultável (`obterPoolPorDuelista`); a escolha de qual carta dropa é decisão de Campanha/Free Duel, que devem usar o PRNG semeado do `packages/engine` (nunca `Math.random()`) se quiserem determinismo/replay — mas isso é cross-PRD e não é implementado, nem mesmo referenciado como dependência de código, por esta feature. | PRD §7 (Fora de Escopo: "Concessão de drops... este módulo só fornece os dados"); `arquitetura.md` §3.1 (PRNG semeado, nunca `Math.random()`) — citado como restrição ao futuro consumidor, não implementado aqui | confirmada |
| 9 | Esta feature **não cria tabela Postgres nem estrutura IndexedDB** — é dado de configuração de build/runtime, mesmo tratamento de F01/F02 (nenhum estado por jogador). | PRD §7 ("Estado por jogador" fora de escopo); F01/F02 spec §5 (precedente) | confirmada |
| 10 | O critério de aceite "(Pendente) Os pools e probabilidades por duelista batem com o original" (PRD §9 F08) permanece **bloqueado** até os valores serem fornecidos — nenhum teste desta spec tenta satisfazê-lo com dados inventados. Um teste de placeholder documenta o estado atual (tabela vazia, pendência ativa) para que a suíte sinalize quando os valores chegarem. | PRD §9 F08 (critério explicitamente marcado "Pendente") | confirmada |

> **Revisão — feature removida do repositório (rating-engine/F03).**
> O módulo que esta spec descreve (`packages/data/src/drops/**`, `scripts/load-drop-table-from-disk.ts`,
> `src/drops/data/drop-tables.json`) foi **excluído**. Ele nunca foi ligado: nenhum arquivo de
> `rules`, `engine` ou `apps/web` o importava, o arquivo de dados permaneceu `[]` do início ao fim,
> e seu tipo `DropPool` colidia de nome com o `DropPool` vivo de `packages/shared/src/duelist`.
>
> A pendência de dado externo que esta spec registrava foi resolvida por outro caminho: os pools de
> drop por duelista e suas probabilidades vieram junto com os duelistas portados do original e vivem
> em `packages/data/data/duelists/*.json`, chegando ao roster como `DropTier.weights` — chance de
> cada carta em 2048, exatamente o que a coluna `probabilidade` desta spec pretendia guardar.
> A validação de que todo `numero` dropável existe no catálogo passou a ser feita por
> `validate-duelist.ts`.
>
> O texto abaixo fica como registro histórico do desenho que não vingou.

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/src/drops/tipos.ts` | data | novo | `DuelistaId`, `EntradaDrop`, `PoolDrop`, `TabelaDropsPorDuelista`, `ViolacaoDrop` |
| `packages/data/src/drops/schema.ts` | data | novo | `EntradaDropSchema`, `PoolDropSchema`, `TabelaDropsArquivoSchema` (zod), reaproveitando `NumeroCartaSchema` de `packages/shared` |
| `packages/data/src/drops/validar-schema-tabela-drops.ts` | data | novo | Parse estrutural do array bruto contra `TabelaDropsArquivoSchema` |
| `packages/data/src/drops/agregar-pools.ts` | data | novo | Agrega pools por `duelista`, detecta duplicata, monta `ReadonlyMap<DuelistaId, PoolDrop>` |
| `packages/data/src/drops/validar-referencias-numero.ts` | data | novo | Para cada entrada de cada pool, confere `catalogo.getByNumero(entrada.numero)` |
| `packages/data/src/drops/criar-tabela-drops.ts` | data | novo | Orquestrador puro: `poolsBruto` + `CatalogoCartas` → `Result<TabelaDropsPorDuelista, DomainError>`, com o fallback neutro de arquivo ausente/vazio |
| `packages/data/src/drops/carregar-tabela-drops-do-disco.ts` | data | novo | Adaptador de I/O: lê o arquivo de configuração (ou trata ausência como `[]`), delega ao núcleo puro |
| `packages/data/src/drops/index.ts` | data | novo | Export público do subsistema de drops |
| `packages/data/config/drop-tables.json` | data | novo (versionado em git) | Arquivo de configuração hand-authored, hoje `[]` — pendência de dado externo (Decisão 4) |
| `packages/data/tests/fixtures/drops/` | data | novo | Pools sintéticos: válido, `numero` inexistente, `duelista` duplicado, entrada malformada, arquivo ausente |
| `packages/data/src/drops/schema.test.ts` | data | novo | Unitários de validação estrutural |
| `packages/data/src/drops/agregar-pools.test.ts` | data | novo | Unitários de agregação e duplicata |
| `packages/data/src/drops/validar-referencias-numero.test.ts` | data | novo | Unitários de referência de `numero` contra catálogo fake |
| `packages/data/src/drops/criar-tabela-drops.test.ts` | data | novo | Unitários do orquestrador, incl. fallback neutro |
| `packages/data/tests/drops.integration.test.ts` | data | novo | Integração contra o catálogo real (F01+F02+F03) e o arquivo de configuração atual (vazio) |

**Verificação da direção de dependências:** `packages/data` continua importando **apenas**
`packages/shared` (reaproveita `NumeroCarta`, `NumeroCartaSchema`, `Result`, `DomainError` já
definidos por F01) mais o próprio subsistema `packages/data/src/catalogo` de F03 (mesmo pacote,
import interno permitido). Nenhum import novo de `rules`, `engine`, `ai`, `web` ou `server` —
`shared ← data` de `arquitetura.md` §2 preservado.

Esta feature **não toca `packages/engine`** — não há PRNG, estado de duelo nem I/O de UI aqui
(Decisão 8). A fronteira de I/O segue o padrão de F01/F02/F03:

- `packages/data/src/drops/{tipos,schema,validar-schema-tabela-drops,agregar-pools,validar-referencias-numero,criar-tabela-drops}.ts`
  **não** importam `node:fs`, `node:path` nem `fetch` — recebem o conteúdo bruto já lido (ou `[]`
  quando ausente) e o `CatalogoCartas` já carregado, e devolvem estruturas em memória.
- `packages/data/src/drops/carregar-tabela-drops-do-disco.ts` é o **único** ponto com
  `node:fs`/`node:path` deste subsistema.

## 3. Design Técnico

### Estruturas de dados

**`DuelistaId`** — `type DuelistaId = string`, não-vazia. Opaca: nenhuma outra restrição de
formato além de "não-vazia" (Decisão 1, Decisão 2).

**`EntradaDrop`** (`packages/data`):

| Campo | Tipo | Semântica |
|---|---|---|
| `numero` | `NumeroCarta` | Carta dropável; deve existir no catálogo (F03) |
| `probabilidade` | `number` | Peso relativo, finito, `> 0` — não normalizado a somar 1 no pool (Decisão 5) |
| `condicao` | `string \| undefined` | Texto livre opcional; ausente = "sem condição além de vencer" (Decisão 6) |

**`PoolDrop`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `duelista` | `DuelistaId` | Chave de agregação; único dentro do arquivo (Decisão 7) |
| `entradas` | `readonly EntradaDrop[]` | Não-vazio quando o pool é declarado |

**`ViolacaoDrop`** — usada apenas para a checagem de referência de `numero`:

| Campo | Tipo | Semântica |
|---|---|---|
| `duelista` | `DuelistaId` | Pool onde a violação ocorreu |
| `numero` | `NumeroCarta` | `numero` referenciado que não existe no catálogo |
| `codigo` | `"numero_dropavel_inexistente"` | Único código desta checagem |
| `mensagem` | `string` | Texto legível, formato descrito na Seção 6 |

**`TabelaDropsPorDuelista`** (público, `Readonly<{...}>`, congelado por `criarTabelaDrops`):

```ts
type TabelaDropsPorDuelista = Readonly<{
  obterPoolPorDuelista(duelista: DuelistaId): readonly EntradaDrop[];
  listarDuelistasComPool(): readonly DuelistaId[];
  listarPools(): readonly PoolDrop[];
  contagemDePools(): number;
}>;
```

`obterPoolPorDuelista` devolve `[]` para duelista sem pool definido — **nunca** erro, nunca
`undefined` (mesmo padrão de `listByTipo` em F03: listar é sempre uma coleção, mesmo vazia). É o
comportamento neutro que sustenta a tabela vazia de hoje: Campanha/Free Duel podem chamar esta
função livremente antes mesmo de qualquer duelista ter pool definido, sem checagem de existência
prévia. `listarPools()` existe para F09 serializar a tabela inteira no bundle sem reimplementar a
iteração sobre o índice interno.

### Fluxo

1. **Resolver o arquivo de configuração.** O adaptador de I/O recebe o caminho (padrão
   `packages/data/config/drop-tables.json`). Arquivo **ausente** → `poolsBruto = []`,
   fallback neutro imediato, sem erro de leitura (Decisão 3, Decisão 7). Arquivo **presente** →
   lê e faz `JSON.parse`; falha de parse ou leitura → erro `arquivo_drops_ilegivel`, antes de
   chamar o núcleo puro.
2. **Validar o schema estrutural.** `validarSchemaTabelaDrops` aplica `TabelaDropsArquivoSchema`
   ao array bruto. Falha (campo ausente, tipo errado, `probabilidade <= 0`, `numero` fora do
   formato `NumeroCartaSchema`) → erro `schema_tabela_drops_invalido`, citando o primeiro problema
   estrutural. Array vazio `[]` não é uma falha — segue como tabela vazia (Decisão 7).
3. **Agregar por duelista.** `agregarPools` percorre as pools validadas e monta
   `ReadonlyMap<DuelistaId, PoolDrop>`. Dois pools com o mesmo `duelista` → erro
   `duelista_duplicado`, citando o identificador repetido — **aborta**, não mescla
   silenciosamente as duas listas de entradas.
4. **Validar referências de `numero`.** `validarReferenciasNumero` percorre cada entrada de cada
   pool e chama `catalogo.getByNumero(entrada.numero)`. Toda entrada cujo retorno é `undefined`
   gera uma `ViolacaoDrop`. Uma ou mais violações → erro `numero_dropavel_inexistente`, com
   `details.violacoes` listando todas (não só a primeira, para o mantenedor corrigir tudo de
   uma vez).
5. **Compor a tabela pública.** Sem nenhuma violação nas etapas 2–4: `criarTabelaDrops` congela
   cada `PoolDrop`/`EntradaDrop` e o `Map` de agregação, e compõe o objeto `TabelaDropsPorDuelista`
   cujas funções fecham sobre esse mapa já pronto — nenhuma delas recalcula nada em cada chamada.
6. **Consultar em runtime.** `obterPoolPorDuelista(duelista)` — `mapa.get(duelista)?.entradas ??
   []`. `listarDuelistasComPool()` — chaves do mapa, ordenadas alfabeticamente para saída
   determinística. `listarPools()` — valores do mapa, mesma ordem.

### Regras de negócio

- **`probabilidade`** é um peso relativo (`number` finito `> 0`); a spec não impõe que a soma das
  entradas de um pool feche em 1 ou 100 — essa é uma decisão de **consumo** (Decisão 5).
- **`condicao`** é texto livre opcional, sem enum fechado (Decisão 6); seu vocabulário e
  interpretação pertencem a Campanha/Free Duel.
- **`duelista`** é validado apenas estruturalmente (string não-vazia) e por unicidade dentro do
  arquivo — nenhuma checagem contra um roster externo, que não existe (Decisão 2).
- **Ausência de arquivo ou array vazio** é o único caminho que **não** é tratado como erro —
  é o estado ativo hoje, dado que os valores são pendência externa (Decisão 3, Decisão 7).
- **Qualquer outra violação** (schema, duplicata, referência de `numero`) rejeita o arquivo
  **inteiro** — não há tabela parcial servida silenciosamente (Decisão 7, ADR-003 fail-safe).

### Determinismo e pureza

Não se aplica a `packages/engine` — esta feature não toca o motor, não usa PRNG e não sorteia
nada (Decisão 8). As garantias de determinismo aqui são as mesmas de F01/F02/F03: as funções de
`packages/data/src/drops/**` (exceto o adaptador de disco) são puras — mesma entrada
(`poolsBruto` + `CatalogoCartas`) sempre produz o mesmo `Result`. `listarDuelistasComPool()` e
`listarPools()` devolvem sempre a mesma ordem (alfabética por `duelista`) para qualquer ordem de
entrada no arquivo bruto, sustentando o requisito de paridade/determinismo de `arquitetura.md` §3.

## 4. Contratos

### Tipos e schemas (`packages/data`)

- **`EntradaDropSchema`** (zod) — objeto estrito: `numero` via `NumeroCartaSchema` (reaproveitado
  de `packages/shared`); `probabilidade` número finito `> 0`; `condicao` string mínima 1,
  opcional.
- **`PoolDropSchema`** — objeto estrito: `duelista` string mínima 1; `entradas` array de
  `EntradaDropSchema`, mínimo 1 elemento.
- **`TabelaDropsArquivoSchema`** — array de `PoolDropSchema` (forma bruta do arquivo de
  configuração). Array vazio é uma instância válida.
- Tipos derivados: `DuelistaId`, `EntradaDrop`, `PoolDrop` (todos `Readonly`, guidelines §6.3).
- Códigos de erro usados: `schema_tabela_drops_invalido`, `duelista_duplicado`,
  `numero_dropavel_inexistente`, `arquivo_drops_ilegivel`.

### Funções públicas

```
// packages/data/src/drops — núcleo puro, sem I/O

validarSchemaTabelaDrops(bruto: unknown): Result<readonly PoolDrop[], DomainError>
  // pré: bruto é o conteúdo já parseado de JSON.parse do arquivo de configuração (ou [] quando ausente)
  // pós: ok ⇒ array de PoolDrop validado estruturalmente
  //      erro ⇒ code 'schema_tabela_drops_invalido', details com o(s) campo(s) culpado(s)

agregarPools(pools: readonly PoolDrop[]): Result<ReadonlyMap<DuelistaId, PoolDrop>, DomainError>
  // pós: ok ⇒ mapa duelista → pool, sem duplicata
  //      erro ⇒ code 'duelista_duplicado', details { duelista }

validarReferenciasNumero(
  pools: readonly PoolDrop[],
  catalogo: CatalogoCartas,
): readonly ViolacaoDrop[]
  // pós: uma ViolacaoDrop por entrada cujo numero não existe no catálogo (getByNumero undefined)

criarTabelaDrops(entrada: {
  poolsBruto: unknown;      // já é [] quando o arquivo de configuração está ausente
  catalogo: CatalogoCartas; // já carregado e válido (contrato de F03)
}): Result<TabelaDropsPorDuelista, DomainError>
  // 1. validarSchemaTabelaDrops       ⇒ erro schema_tabela_drops_invalido
  // 2. agregarPools                   ⇒ erro duelista_duplicado
  // 3. validarReferenciasNumero       ⇒ erro numero_dropavel_inexistente (details.violacoes)
  // poolsBruto === [] após (1)        ⇒ sucesso imediato, tabela vazia (fallback neutro)
  // sucesso                           ⇒ TabelaDropsPorDuelista congelada
```

```
// packages/data/src/drops/carregar-tabela-drops-do-disco.ts — adaptador de I/O

carregarTabelaDropsDoDisco(opcoes: {
  caminhoArquivo: string;   // padrão packages/data/config/drop-tables.json
  catalogo: CatalogoCartas;
}): Promise<Result<TabelaDropsPorDuelista, DomainError>>
  // arquivo ausente          ⇒ chama criarTabelaDrops({ poolsBruto: [], catalogo }) — sucesso, tabela vazia
  // arquivo ilegível/inválido ⇒ erro arquivo_drops_ilegivel, antes de chamar o núcleo puro
  // arquivo presente e parseável ⇒ delega o conteúdo bruto a criarTabelaDrops
```

### Exemplos de artefato

`packages/data/config/drop-tables.json` — estado **atual** (dado externo pendente, Decisão 3):

```json
[]
```

Exemplo **ilustrativo do formato do schema** — não são valores reais de drop do jogo original,
apenas demonstram a forma esperada quando o mantenedor fornecer os dados:

```json
[
  {
    "duelista": "duelista-exemplo-01",
    "entradas": [
      { "numero": "001", "probabilidade": 1 },
      { "numero": "002", "probabilidade": 4, "condicao": "vitoria_modo_dificil" }
    ]
  }
]
```

Exemplo de erro — `numero` dropável inexistente no catálogo:

```json
{
  "code": "numero_dropavel_inexistente",
  "message": "Um ou mais numeros referenciados na tabela de drops nao existem no catalogo.",
  "details": {
    "violacoes": [
      {
        "duelista": "duelista-exemplo-01",
        "numero": "999",
        "codigo": "numero_dropavel_inexistente",
        "mensagem": "Carta 999 referenciada no pool do duelista duelista-exemplo-01 nao existe no catalogo."
      }
    ]
  }
}
```

Exemplo de uso da consulta pública:

```ts
const resultado = await carregarTabelaDropsDoDisco({
  caminhoArquivo: "packages/data/config/drop-tables.json",
  catalogo,
});
if (!resultado.ok) {
  throw new Error("Tabela de drops indisponivel.", { cause: resultado.error });
}
const tabelaDrops = resultado.value;

tabelaDrops.obterPoolPorDuelista("duelista-inexistente-hoje");
// [] — nenhum erro; a tabela ainda esta vazia (pendencia de dado externo)

tabelaDrops.contagemDePools();
// 0, ate os valores serem fornecidos
```

### Contratos externos (cross-PRD)

- **Consumido:** `CatalogoCartas.getByNumero` de F03 (`docs/specs/banco-de-cartas/F03-servico-de-catalogo-de-cartas/`).
- **Fornecido, ainda não consumido por nenhuma spec existente:** `TabelaDropsPorDuelista` é o
  contrato que Campanha e Free Duel vão assumir quando ganharem spec para a parte de recompensa de
  duelo (`obterPoolPorDuelista`, com o `DuelistaId` que **eles** definirem). `listarPools()` é o
  contrato que F09 vai assumir para empacotar a tabela no bundle offline/servidor autoritativo.
  Nenhum desses dois consumidores existe ainda como código ou spec — são dependências de saída
  declaradas, não implementadas aqui.

## 5. Modelo de Dados

Esta feature não cria tabela Postgres nem estrutura IndexedDB — não há estado por jogador aqui
(Decisão 9). A "tabela" de drop é um arquivo de configuração de dados, não um registro de banco.

### Arquivo de dados

| Arquivo | Formato | Versionado em git | Determinístico | Consumidor |
|---|---|---|---|---|
| `packages/data/config/drop-tables.json` | Array JSON de `PoolDrop` (`TabelaDropsArquivoSchema`) | **sim** — hand-authored, distinto de `generated/` (Decisão 4) | não se aplica (conteúdo é dado, não gerado por pipeline) | `carregarTabelaDropsDoDisco` (F08), F09 (empacotamento futuro) |

**Diferença deliberada de F01/F02:** os artefatos daquelas features são **saída de build**
(`packages/data/generated/`, `.gitignore`d, regenerados a cada execução da ingestão/validação).
`drop-tables.json` é **entrada manual** do mantenedor de dados — não há pipeline que o gere a
partir de `cards-data/`. Por isso vive fora de `generated/` e permanece no controle de versão, dando
visibilidade de diff em PR quando os valores reais forem adicionados.

**Nenhuma migração Postgres** é necessária por esta feature. `dataset_versions`
(`arquitetura.md` §5.1) continua exclusivamente de F10, e nada em F08 grava linha de coleção,
carteira ou recompensa — isso é Campanha/Free Duel (cross-PRD, fora de escopo).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| Arquivo de configuração ausente | Adaptador de I/O, antes de qualquer parse | **Sucesso.** `poolsBruto = []`, tabela carrega com zero pools (fallback neutro — dado externo pendente) | — (nenhum erro; log informativo opcional) |
| Arquivo presente com array vazio `[]` | `validarSchemaTabelaDrops` | **Sucesso.** Tabela com zero pools, mesmo caminho do item acima | — |
| Arquivo presente mas JSON malformado / ilegível | Adaptador de I/O (`catch` no `JSON.parse`/leitura) | **Rejeita.** Nenhuma tabela é composta | `Tabela de drops ilegivel em {caminho} — verifique o formato JSON.` |
| Entrada com campo ausente, tipo errado ou `probabilidade <= 0` | `validarSchemaTabelaDrops` (zod) | **Rejeita o arquivo inteiro** (Decisão 7) | `Tabela de drops invalida: {detalhe do campo}.` |
| `duelista` duplicado entre dois pools do mesmo arquivo | `agregarPools` | **Rejeita o arquivo inteiro** | `Duelista {id} duplicado na tabela de drops.` |
| `numero` dropável inexistente no catálogo (F03) | `validarReferenciasNumero` | **Rejeita o arquivo inteiro**, lista todas as violações encontradas | `Carta {numero} referenciada no pool do duelista {duelista} nao existe no catalogo.` |
| Consulta a `duelista` sem pool definido (`obterPoolPorDuelista`) | Runtime, `Map.get` sem entrada | **Não é erro.** Devolve `[]` (comportamento neutro, esperado enquanto a tabela está vazia) | — |
| Falha ao ler o arquivo por permissão/I/O inesperado | `catch` no adaptador | Propaga com `cause` preservada (guidelines §8.3) | `Falha ao carregar a tabela de drops de {caminhoArquivo}.` |

Todo erro é explícito e carrega `code` + `details` (guidelines §8.1, §8.3; ADR-003 fail-safe). O
único caminho "silencioso" por design é a ausência do arquivo/array vazio — que não é uma falha,
é o estado neutro documentado (Decisão 3, Decisão 7).

## 7. Estratégia de Testes

### Unitários (Vitest)

`validarSchemaTabelaDrops` — table-driven (guidelines §11.2):
- `validarSchemaTabelaDrops aceita array vazio como tabela sem pools`
- `validarSchemaTabelaDrops aceita pool com uma entrada valida e probabilidade positiva`
- `validarSchemaTabelaDrops aceita entrada com condicao ausente`
- `validarSchemaTabelaDrops aceita entrada com condicao textual presente`
- `validarSchemaTabelaDrops rejeita probabilidade zero`
- `validarSchemaTabelaDrops rejeita probabilidade negativa`
- `validarSchemaTabelaDrops rejeita numero fora do formato de tres digitos`
- `validarSchemaTabelaDrops rejeita pool com entradas vazio`
- `validarSchemaTabelaDrops rejeita duelista vazio`

`agregarPools`:
- `agregarPools monta o mapa duelista para pool quando nao ha duplicata`
- `agregarPools rejeita quando dois pools compartilham o mesmo duelista`
- `agregarPools preserva todas as entradas do pool sem perder nenhuma`

`validarReferenciasNumero`:
- `validarReferenciasNumero nao gera violacao quando todo numero existe no catalogo`
- `validarReferenciasNumero gera uma violacao por numero inexistente`
- `validarReferenciasNumero gera violacoes para multiplas entradas invalidas no mesmo pool`
- `validarReferenciasNumero gera violacoes em pools de duelistas diferentes`

`criarTabelaDrops`:
- `criarTabelaDrops resulta em tabela vazia quando poolsBruto e um array vazio`
- `criarTabelaDrops rejeita quando o schema estrutural falha`
- `criarTabelaDrops rejeita quando ha duelista duplicado`
- `criarTabelaDrops rejeita quando ha numero inexistente no catalogo`
- `criarTabelaDrops resulta em tabela funcional quando todas as checagens passam`
- `criarTabelaDrops congela cada pool e cada entrada retornada`

`TabelaDropsPorDuelista` (via instância construída em fixture):
- `obterPoolPorDuelista retorna as entradas do pool correspondente`
- `obterPoolPorDuelista retorna lista vazia para duelista sem pool definido`
- `listarDuelistasComPool retorna os duelistas em ordem alfabetica`
- `listarPools retorna todos os pools agregados`
- `contagemDePools reflete o numero de pools da tabela`

### Property-based (fast-check)

- **Cobertura de violação de referência:** para qualquer subconjunto de `numero` gerado fora do
  catálogo fake usado no teste, `validarReferenciasNumero` reporta exatamente uma violação por
  entrada com `numero` naquele subconjunto — nunca mais, nunca menos. 1.000 execuções.
- **Ordem determinística de listagem:** para qualquer permutação da ordem dos pools no array de
  entrada, `listarDuelistasComPool()` e `listarPools()` devolvem sempre a mesma ordem de saída
  (alfabética por `duelista`).
- **Ausência de duplicata sob agregação:** para qualquer conjunto de pools com `duelista` únicos
  (gerado aleatoriamente), `agregarPools` nunca rejeita; para qualquer conjunto com pelo menos uma
  repetição forçada, `agregarPools` sempre rejeita.

### Integração

`packages/data/tests/drops.integration.test.ts`, rodando contra o catálogo real carregado via F01
(ingestão real) + F02 (validação real) + F03 (`carregarCatalogoDoDisco`):
- `tabela de drops real carrega vazia hoje a partir de drop-tables.json` — confirma o estado
  neutro atual (dado externo pendente) contra o arquivo real do repositório
- `tabela de drops real aceita numero existente no catalogo quando construida com fixture` — usa
  um `numero` real do catálogo (ex.: `"001"`) num pool de fixture para provar a integração real com
  `CatalogoCartas.getByNumero`, sem tocar o arquivo de configuração de produção
- `tabela de drops real rejeita numero inexistente no catalogo quando construida com fixture`
- `obterPoolPorDuelista da tabela real nao lanca erro para qualquer duelista consultado`

### Análise estática

- `packages/data/src/drops/{tipos,schema,validar-schema-tabela-drops,agregar-pools,validar-referencias-numero,criar-tabela-drops}.ts`
  não importam `node:fs`, `node:path` nem `fetch` — só `carregar-tabela-drops-do-disco.ts` toca
  I/O.
- `packages/data` continua importando apenas `packages/shared` (mais o próprio pacote `data` para
  `CatalogoCartas` de F03) — nenhum import de `rules`, `engine`, `ai`, `web` ou `server`.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F08) | Teste |
|---|---|
| O schema das tabelas de drop e o loader estão definidos; a consulta por duelista responde os pools corretos | `criarTabelaDrops resulta em tabela funcional quando todas as checagens passam` + `obterPoolPorDuelista retorna as entradas do pool correspondente` |
| Todo `numero` dropável inexistente no catálogo é rejeitado na validação | `validarReferenciasNumero gera uma violacao por numero inexistente` + `criarTabelaDrops rejeita quando ha numero inexistente no catalogo` + `tabela de drops real rejeita numero inexistente no catalogo quando construida com fixture` |
| **(Pendente)** Os pools e probabilidades por duelista batem com o original — bloqueado até os valores serem fornecidos | `tabela de drops real carrega vazia hoje a partir de drop-tables.json` — documenta o estado atual (pendência ativa); nenhum teste tenta satisfazer o critério com dados inventados (Decisão 10) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: o pacote de F09 contém exatamente o catálogo de F03, as artes de F04 e as tabelas de F05–F08, e F10 versiona esse pacote como uma unidade | Contrato declarado nesta spec: `listarPools()` é a superfície que F09 vai consumir para serializar a tabela no bundle — verificado quando F09 for especificada |
| Cross-PRD: **(Pendente)** Campanha/Free Duel consomem as tabelas de F08 sem codificar essas regras localmente | Contrato declarado: `obterPoolPorDuelista(duelista)` é a única forma de consulta exposta; nenhuma lógica de sorteio ou concessão de drop existe em `packages/data` — verificado quando Campanha/Free Duel ganharem spec para a parte de recompensa |
