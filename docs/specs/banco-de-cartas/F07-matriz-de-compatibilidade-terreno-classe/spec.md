# Matriz de Compatibilidade Terreno↔Classe

> PRD: `docs/prds/banco-de-cartas.md` — F07
> Pacote-alvo: `packages/data`

## 1. Contexto e Escopo

Esta feature hospeda, de forma data-driven, o mapeamento de qual terreno fortalece/enfraquece
qual classe de monstro (com magnitude), na Wave 4 do módulo (junto de F04, F05, F06, F08),
depois que a fundação de runtime (F03) já está especificada. Onde F03 dá acesso ao catálogo de
cartas, F07 hospeda uma **tabela auxiliar de regra** sobre esse catálogo: um schema, um loader e
uma validação — nunca o cálculo de combate em si, que é responsabilidade do Motor de Duelo/Terrain
Engine (cross-PRD, `packages/rules` e `packages/engine`, PRD §7 Fora de Escopo).

O eixo central desta spec é uma **pendência de dado externo, regra dura do projeto**
(`arquitetura.md` §4.3, ADR-003, Fase 0.4 deste skill): os valores reais de fortalecimento/
enfraquecimento/magnitude por classe **não existem no repositório** e **não são inventados aqui**.
A feature entrega schema + loader + validação de cobertura; a tabela viaja vazia (ou parcial,
quando o mantenedor começar a preenchê-la) até que os valores sejam fornecidos externamente. O
comportamento neutro enquanto ausente é **bônus/penalidade zero**, embutido diretamente na função
de consulta (Seção 3), para que quem consumir (Terrain Engine, cross-PRD) nunca precise
tratar "tabela vazia" como caso especial.

Igualmente, os **nomes de terreno** citados no PRD (Forest, Wasteland, Mountain, Sogen, Yami, Umi,
"...") não são uma lista fechada nem verificada no repositório — o PRD usa reticências. O `tipo`
do terreno é `string` livre no schema, exatamente como `classe` já é `string` livre desde F01
(Decisão 8 daquela spec) — nenhuma das duas listas é um union type do TypeScript, e a "cobertura"
de classes é sempre verificada contra o **conjunto observado em runtime via F03**, nunca contra um
enum estático.

O desenho segue o mesmo padrão de F01–F03 (`arquitetura.md` §4.1/§4.3, ADR-003,
`TypeScript-development-guidelines.md` §3.3/§12/§19.2): núcleo de validação puro, sem I/O; todo
acesso a disco confinado a um adaptador fino na borda.

### Incluído

- Schema (zod) do mapeamento terreno→classe: por entrada, `terreno`, `classesFortalecidas`,
  `classesEnfraquecidas`, `magnitudeFortalecimento`, `magnitudeEnfraquecimento` (PRD F07
  Capabilities — "Define o schema do mapeamento... e o loader")
- Loader que lê o arquivo de dados hospedado no próprio pacote e o valida
- Validação estrutural de cada entrada (tipos, magnitude não-negativa, sem duplicidade interna)
- Validação de **referência**: toda classe citada em `classesFortalecidas`/`classesEnfraquecidas`
  deve existir no conjunto de classes de monstro observado no catálogo real (via F03) — proteção
  contra erro de digitação, bloqueante
- Validação de **duplicidade de terreno** e de **classe contraditória** (mesma classe fortalecida
  e enfraquecida no mesmo terreno) — bloqueante
- Validação de **cobertura**: toda classe de monstro do catálogo aparece em pelo menos uma entrada
  do mapeamento (fortalecida ou enfraquecida, em algum terreno) — **não bloqueante**, produz um
  relatório de classes sem cobertura (PRD F07 Capabilities — "sem classe órfã"; PRD F07 Capabilities
  — "a validação de cobertura fica pendente" enquanto os valores não existirem)
- Consulta por terreno ativo (`obterRegraPorTerreno`) e classificação de uma classe dentro de um
  terreno (`classificarClasseNoTerreno`), com fallback neutro (`neutra`, magnitude `0`) embutido
  para terreno desconhecido, classe não listada naquele terreno, ou tabela vazia
- Arquivo de dados versionado em git, hospedado dentro de `packages/data`, que hoje embarca vazio
  (`[]`) — schema-válido, aguardando fornecimento externo dos valores
- CLI de validação para uso em CI/local, análoga em espírito (mais leve) à de F02

### Fronteiras

- **Cálculo do bônus/penalidade de campo aplicado ao ATK/DEF efetivo de um monstro em duelo** →
  **Motor de Duelo 1x1 / Terrain Engine (cross-PRD)**. F07 só hospeda a matriz e a consulta
  passiva de classificação; a soma ao ATK/DEF base é de `ProvedorModificadorTerreno`
  (`motor-duelo-1x1` F04, já especificado), implementado por um subsistema `packages/rules/terrain`
  ainda não especificado (PRD banco-de-cartas §7 Fora de Escopo).
- **Definição do conjunto real de terrenos e dos valores de fortalecimento/enfraquecimento/
  magnitude** → dado externo pendente. Não fornecido nesta spec nem por nenhum PRD atual.
- **Obtenção do conjunto de classes de monstro do catálogo** → **F03**, já especificado
  (`CatalogoCartas.listByTipo`/`contagemPorClasse`). F07 não duplica nem hard-codeia essa lista.
- **Empacotamento no bundle offline/servidor** → **F09**, ainda não especificado. F07 só garante
  que o arquivo de dados e a tabela construída sejam serializáveis para esse empacotamento.

### Contratos externos assumidos

- **F03 (mesma PRD, já especificada):** `CatalogoCartas` com `listByTipo(tipo)` e
  `contagemPorClasse()`, usados para derivar o conjunto de classes de monstro conhecidas em tempo
  de execução (ver Decisão 3). Dependência interna satisfeita — não bloqueia.
- **Motor de Duelo 1x1 / Terrain Engine (cross-PRD, parcialmente especificado):** o tipo
  `ProvedorModificadorTerreno` já está declarado em `packages/shared/src/duelo/modificadores.ts`
  (spec `motor-duelo-1x1` F04) como `(monstro: Carta, terrenoAtivo: Carta | null) =>
  AtkDefEfetivo`. Aquela mesma spec já registra que a tabela real de terreno "não pertence a esta
  feature — pertence a um PRD futuro de Terrain Engine". F07 declara aqui o contrato que esse PRD
  futuro vai consumir (`TabelaTerrenoClasse.classificarClasseNoTerreno`), sem implementar
  `ProvedorModificadorTerreno` nem tocar `packages/rules/src/terrain/**` (que hoje só tem o
  placeholder neutro `modificadorTerrenoNeutro`, inalterado por esta feature).
- **F09 — Distribuição (mesma PRD, ainda não especificada):** consumirá o arquivo de dados desta
  feature como uma das quatro tabelas auxiliares do pacote. Tratado como contrato externo
  declarado, não implementado aqui.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | Escopo completo, sem divisão Core/Full — o PRD não tem os blocos `Core Scope`/`Full Scope additions` para F07. | Política de Auto-Aceite (Escopo) | confirmada |
| 2 | `terreno` é `string` não-vazia (após `trim`), **não** um union fechado. A lista real de terrenos não está verificada no repositório (o PRD usa "..." após citar alguns nomes) — nenhum `TERRENOS_CONHECIDOS` é criado, ao contrário do que F02 fez para `classe` (que é apenas uma lista de referência para drift, não usada aqui). | Instrução explícita do orquestrador; PRD §6 F07 Provides (lista com "...") | confirmada |
| 3 | **O conjunto de "classes de monstro conhecidas" usado na validação de referência/cobertura é derivado de `catalogo.listByTipo('monstro')`, coletando os valores distintos de `classe` — não de `catalogo.contagemPorClasse()` diretamente.** Motivo: o campo `classe` do schema canônico (F01) também carrega rótulos de **não-monstro** reaproveitados (`Equip`, `Magic`, `Trap`, `Ritual`) — confirmado no exemplo de `classesObservadas` da spec de F01, que lista essas 4 strings entre as 24 classes observadas. `contagemPorClasse()` misturaria essas 4 pseudo-classes com as classes reais de criatura (Warrior, Fiend, Aqua, Dragon, ...). Como cartas `ritual` também não têm `atk`/`def`/guardiões preenchidos (F01 spec, Decisão 13), não há estatística à qual um bônus de terreno se aplicaria — reforçando que a compatibilidade terreno↔classe só faz sentido para `tipo === 'monstro'`. Isso refina a sugestão inicial do orquestrador de usar `contagemPorClasse()` — o índice `porClasse`/`contagemPorClasse` de F03 continua sendo a fonte, mas filtrada por tipo antes de virar o conjunto de referência. | Análise de F01 spec (Decisão 8, Decisão 13, exemplo `classesObservadas`); F03 spec (`listByTipo`) | confirmada — refina a sugestão inicial |
| 4 | Magnitude é representada como **dois campos não-negativos** (`magnitudeFortalecimento`, `magnitudeEnfraquecimento`) por terreno, em vez de um único número aplicado nos dois sentidos. O PRD diz apenas "a magnitude" (singular, ambíguo quanto a simetria); separar os dois sentidos evita impor simetria não confirmada e mantém "estados inválidos difíceis de representar" (guidelines §1.1) sem exigir sinal negativo para expressar "enfraquecimento". | Especificação parcial no PRD (magnitude não detalhada); guidelines §1.1, §6.2 | confirmada — default de boa prática documentado |
| 5 | Uma classe **não pode** aparecer simultaneamente em `classesFortalecidas` e `classesEnfraquecidas` do mesmo terreno (contradição de regra) — bloqueia a construção da tabela. Nem o PRD nem a arquitetura tratam esse caso; é o default mais seguro (fail-safe, ADR-003) diante de uma regra logicamente incoerente. | Especificação parcial no PRD; ADR-003 (fail-safe) | confirmada — default documentado |
| 6 | **Validação de referência de classe (hard block) é distinta de validação de cobertura (soft/informativa).** Uma classe referenciada no mapeamento que **não existe** no conjunto de classes de monstro do catálogo é um erro de digitação/dado — bloqueia a construção da tabela inteira, análogo à validação de `numero` de F05/F06/F08. Já uma classe do catálogo que **não aparece em nenhuma entrada** do mapeamento é o estado esperado enquanto a tabela está vazia/parcial — não bloqueia, apenas entra em `relatorioCobertura.classesSemCobertura`. Essa distinção não está no texto do PRD (que só fala em "validação de cobertura"), mas é necessária para que "critério bloqueado até a tabela ser fornecida" (PRD §9 F07) seja tecnicamente possível sem impedir que a spec avance hoje. | Especificação parcial no PRD; ADR-003; PRD §9 F07 (critério pendente) | confirmada — decisão de projeto documentada |
| 7 | **Arquivo de dados é versionado em git**, ao contrário dos artefatos de `packages/data/generated/` (F01 Decisão 5). Diferente de `cards.json` (derivado por pipeline de `cards-data/`), a matriz terreno↔classe é **conteúdo hospedado diretamente**, fornecido externamente pelo mantenedor — mesma natureza de `cards-data/dados/*.json`, que também é committed. Vive em `packages/data/src/terreno/dados/terrain-class-matrix.json` e embarca hoje como `[]` (array vazio, schema-válido), tornando a pendência **rastreável no controle de versão** (ADR-003, "tabelas ausentes precisam ter comportamento neutro e rastreável"). | ADR-003; F01 spec Decisão 5 (contraste); Fase 0.4 deste skill | confirmada |
| 8 | **Fallback neutro embutido na função de consulta**, não deixado para o consumidor implementar: `classificarClasseNoTerreno` devolve `{ tipo: 'neutra', magnitude: 0 }` para terreno desconhecido, classe não listada naquele terreno, ou tabela vazia — nunca lança erro. Isso cumpre literalmente a Capability do PRD ("o Motor de Duelo consumidor aplica bônus/penalidade zero") sem exigir que o futuro Terrain Engine reimplemente essa checagem. | PRD §6 F07 Capabilities; Política de Auto-Aceite (fallback neutro) | confirmada |
| 9 | **PENDÊNCIA DE DADOS, regra dura:** os valores de fortalecimento/enfraquecimento/magnitude por classe/terreno não existem no repositório, não estão fechados em `product.md`, e **não são inventados nesta spec nem na implementação**. O critério de aceite "os valores batem com o original" (PRD §9 F07) permanece bloqueado até fornecimento externo. | PRD §6 F07 Capabilities; `arquitetura.md` §4.3 e §10; ADR-003 `[PRECISA DE ENTRADA]` | pendência registrada — não bloqueia esta spec |
| 10 | F07 **não tem** um estágio de validação em duas fases (ingestão → selo) como F01→F02 para o catálogo mestre. É um único loader que valida-e-serve, mesmo padrão descrito no PRD para F05/F06/F08 ("o loader carrega, valida... e disponibiliza"). Justificativa: é uma tabela auxiliar pequena e de baixo risco de coleta (não 722 registros de fonte externa desorganizada), sem necessidade do portão fail-safe dedicado que F02 justifica para o catálogo mestre. | PRD §6 F05/F06/F07/F08 Experience (padrão comum); contraste deliberado com F01/F02 | confirmada |
| 11 | Nenhuma alteração em `packages/shared`. Ao contrário de `Carta`/`SeloDataset` (F01/F02, consumidos por pacotes que talvez não dependam ainda de `data`), os tipos desta feature (`RegraTerrenoClasse`, `TabelaTerrenoClasse`, ...) só interessam a consumidores que já dependem de `packages/data` (`rules`, `engine`, `web`, `server`) — mesmo raciocínio da Decisão 5 de F03. | F03 spec Decisão 5 (raciocínio análogo); guidelines §3.2/§3.3 | confirmada |
| 12 | `packages/rules/src/terrain/**` (criado como placeholder neutro por `motor-duelo-1x1` F04) **não é alterado** por esta feature. A implementação real do provedor que consome os dados de F07 pertence a um PRD futuro de Terrain Engine, ainda não escrito. | `motor-duelo-1x1` F04 spec (placeholder neutro, decisão 5 daquela spec) | confirmada |
| 13 | O PRD não define um bloco "Error Handling" para F07 (ao contrário de F01/F02/F03/F09/F10). A Seção 6 desta spec deriva casos de erro por analogia com F01–F03 e com as guidelines, documentados explicitamente como premissa — não bloqueia a geração da spec. | Especificação parcial no PRD (bloco ausente); Política de Auto-Aceite | confirmada — default documentado |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/src/terreno/schema.ts` | data | novo | `RegraTerrenoClasseSchema` (zod): forma estrutural de uma entrada, incl. refinamentos internos (arrays sem duplicata) |
| `packages/data/src/terreno/tipos.ts` | data | novo | `RegraTerrenoClasse`, `TabelaTerrenoClasse`, `ClassificacaoTerreno`, `RelatorioCoberturaTerrenoClasse`, `ViolacaoTerrenoClasse`, `CategoriaViolacaoTerreno` |
| `packages/data/src/terreno/validar-estrutura-matriz.ts` | data | novo | `validarEstruturaMatriz`: `unknown` → `Result<RegraTerrenoClasse[], DomainError>` via `RegraTerrenoClasseSchema` |
| `packages/data/src/terreno/detectar-terreno-duplicado.ts` | data | novo | `detectarTerrenoDuplicado` |
| `packages/data/src/terreno/detectar-classe-contraditoria.ts` | data | novo | `detectarClasseContraditoria` |
| `packages/data/src/terreno/validar-referencias-de-classe.ts` | data | novo | `validarReferenciasDeClasse` (bloqueante) |
| `packages/data/src/terreno/calcular-cobertura-de-classes.ts` | data | novo | `calcularCoberturaDeClasses` (não bloqueante) |
| `packages/data/src/terreno/construir-indice-terreno.ts` | data | novo | `construirIndiceTerreno` |
| `packages/data/src/terreno/criar-tabela-terreno-classe.ts` | data | novo | `criarTabelaTerrenoClasse`: orquestrador puro |
| `packages/data/src/terreno/derivar-classes-de-monstro-conhecidas.ts` | data | novo | `derivarClassesDeMonstroConhecidas(catalogo)`: filtra `listByTipo('monstro')` e coleta `classe` distintas (Decisão 3) |
| `packages/data/src/terreno/carregar-tabela-terreno-classe-do-disco.ts` | data | novo | Adaptador de I/O: lê o arquivo de dados, deriva classes conhecidas via F03, chama o núcleo puro |
| `packages/data/src/terreno/index.ts` | data | novo | Export público do subsistema |
| `packages/data/src/terreno/dados/terrain-class-matrix.json` | data | novo (versionado) | Arquivo de dados hospedado — hoje `[]` (Decisão 7) |
| `packages/data/scripts/validate-terrain-class-matrix.ts` | data | novo | Adaptador CLI: carrega o catálogo real (F03), lê e valida a matriz, imprime resumo, define exit code |
| `packages/data/tests/fixtures/terreno/` | data | novo | Matrizes sintéticas: vazia, válida completa, terreno duplicado, classe contraditória, classe desconhecida, cobertura parcial |
| `packages/data/src/terreno/validar-estrutura-matriz.test.ts` | data | novo | Unitários de schema |
| `packages/data/src/terreno/detectar-terreno-duplicado.test.ts` | data | novo | Unitários |
| `packages/data/src/terreno/detectar-classe-contraditoria.test.ts` | data | novo | Unitários |
| `packages/data/src/terreno/validar-referencias-de-classe.test.ts` | data | novo | Unitários |
| `packages/data/src/terreno/calcular-cobertura-de-classes.test.ts` | data | novo | Unitários |
| `packages/data/src/terreno/construir-indice-terreno.test.ts` | data | novo | Unitários |
| `packages/data/src/terreno/criar-tabela-terreno-classe.test.ts` | data | novo | Unitários do orquestrador + fast-check |
| `packages/data/src/terreno/derivar-classes-de-monstro-conhecidas.test.ts` | data | novo | Unitários da filtragem por tipo |
| `packages/data/tests/terreno.integration.test.ts` | data | novo | Integração contra o catálogo real (F01+F02+F03) e o arquivo real (hoje vazio) |
| `turbo.json` | raiz | alterado | Nova tarefa `data:validate-terrain`, `dependsOn: ["data:validate"]` (precisa do selo de F02 para montar o catálogo de F03), cacheada por `inputs`/`outputs` |

**Verificação da direção de dependências:** todos os arquivos novos vivem em `packages/data`, que
continua importando **apenas** `packages/shared` (`Result`, `DomainError`, `Carta`, `NumeroCarta` —
reaproveitados sem alteração) mais o próprio `packages/data` (`CatalogoCartas` de F03). Nenhum
import novo de `rules`, `engine`, `ai`, `web` ou `server` — `shared ← data` de `arquitetura.md` §2
preservado. Nenhuma alteração em `packages/shared` (Decisão 11).

Esta feature **não toca `packages/engine`** nem `packages/rules`. A fronteira de I/O segue o
padrão de F01/F02/F03:

- `packages/data/src/terreno/**` (exceto o adaptador de carregamento) **não** importa `node:fs`,
  `node:path` nem `fetch` — recebe o conteúdo já lido (`unknown` vindo de `JSON.parse`) e a lista
  de classes conhecidas (já derivadas de um `CatalogoCartas` em memória) como argumentos.
- `packages/data/src/terreno/carregar-tabela-terreno-classe-do-disco.ts` é o único ponto com
  `node:fs`/`node:path` deste subsistema — lê `terrain-class-matrix.json` e delega a
  `derivarClassesDeMonstroConhecidas` sobre um `CatalogoCartas` já construído (recebido como
  parâmetro, não carregado internamente — quem compõe o carregamento do catálogo é o chamador,
  reaproveitando `carregarCatalogoDoDisco` de F03).
- `packages/data/scripts/validate-terrain-class-matrix.ts` é o adaptador CLI que compõe os dois
  carregamentos (catálogo de F03 + matriz desta feature) e imprime o resumo.

## 3. Design Técnico

### Estruturas de dados

**`RegraTerrenoClasse`** — uma entrada do mapeamento, uma por terreno:

| Campo | Tipo | Semântica e regra |
|---|---|---|
| `terreno` | `string` | Não-vazia após `trim`. Livre — sem enum fechado (Decisão 2) |
| `classesFortalecidas` | `readonly string[]` | Classes de monstro fortalecidas por este terreno. Sem duplicata interna |
| `classesEnfraquecidas` | `readonly string[]` | Classes de monstro enfraquecidas por este terreno. Sem duplicata interna |
| `magnitudeFortalecimento` | `number` | Inteiro ≥ 0. Delta positivo aplicado (pelo Terrain Engine, cross-PRD) às classes fortalecidas |
| `magnitudeEnfraquecimento` | `number` | Inteiro ≥ 0. Delta positivo cujo **sinal de aplicação** (subtração) é decidido pelo consumidor — aqui é sempre armazenado não-negativo (Decisão 4) |

Nenhuma classe pode aparecer simultaneamente em `classesFortalecidas` e `classesEnfraquecidas` da
mesma entrada (Decisão 5).

**`CategoriaViolacaoTerreno`** — union fechado: `estrutura`, `terreno_duplicado`,
`classe_contraditoria`, `classe_desconhecida`.

**`ViolacaoTerrenoClasse`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `categoria` | `CategoriaViolacaoTerreno` | Bucket da violação |
| `terreno` | `string \| undefined` | Terreno envolvido, quando aplicável |
| `classe` | `string \| undefined` | Classe envolvida, quando aplicável |
| `codigo` | `string` | Identificador estável, ver Contratos |
| `mensagem` | `string` | Texto legível |

**`RelatorioCoberturaTerrenoClasse`** — não bloqueante, sempre produzido:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `totalClassesConhecidas` | `number` | Classes de monstro distintas observadas via F03 (Decisão 3) |
| `totalClassesCobertas` | `number` | Subconjunto que aparece em ao menos uma entrada (fortalecida ou enfraquecida, em qualquer terreno) |
| `classesSemCobertura` | `readonly string[]` | Complemento, ordenado alfabeticamente — vazio só quando a matriz cobre 100% das classes conhecidas |

**`ClassificacaoTerreno`** — resultado de uma consulta pontual:

```ts
type ClassificacaoTerreno = Readonly<{
  tipo: "fortalecida" | "enfraquecida" | "neutra";
  magnitude: number; // 0 quando tipo === "neutra"
}>;
```

**`TabelaTerrenoClasse`** (público, congelado, mesma filosofia de `CatalogoCartas` em F03):

```ts
type TabelaTerrenoClasse = Readonly<{
  listarTerrenos(): readonly string[]; // ordem alfabética, determinística
  obterRegraPorTerreno(terreno: string): RegraTerrenoClasse | undefined;
  classificarClasseNoTerreno(terreno: string, classe: string): ClassificacaoTerreno;
  relatorioCobertura(): RelatorioCoberturaTerrenoClasse;
}>;
```

### Fluxo

1. **Ler o arquivo de dados.** O adaptador CLI/loader lê
   `packages/data/src/terreno/dados/terrain-class-matrix.json` e faz `JSON.parse`. Arquivo
   ausente ou JSON ilegível → aborta antes de qualquer checagem (Seção 6).
2. **Carregar o catálogo real (F03)** e derivar `classesConhecidas` via
   `derivarClassesDeMonstroConhecidas`: filtra `catalogo.listByTipo("monstro")`, coleta os valores
   distintos de `classe`, ordena alfabeticamente (Decisão 3). Catálogo indisponível → aborta
   (Seção 6), reaproveitando o erro já definido por F03.
3. **Validar a estrutura.** `validarEstruturaMatriz` aplica `RegraTerrenoClasseSchema` a cada
   elemento do array bruto: tipos corretos, `terreno` não-vazia, magnitudes inteiras ≥ 0, arrays
   sem duplicata interna. Qualquer falha estrutural → violação `estrutura`, **acumulada** (não
   para no primeiro erro), mesmo espírito de F01/F02.
4. **Detectar terreno duplicado.** Duas entradas com o mesmo `terreno` (comparação exata) →
   violação `terreno_duplicado` citando o nome repetido.
5. **Detectar classe contraditória.** Dentro de uma mesma entrada, classe presente em ambas as
   listas → violação `classe_contraditoria` citando terreno e classe.
6. **Validar referências de classe.** Toda classe citada em `classesFortalecidas`/
   `classesEnfraquecidas` de qualquer entrada deve pertencer a `classesConhecidas` (passo 2).
   Classe desconhecida → violação `classe_desconhecida`, citando terreno e classe.
7. **Decidir o veredito de construção.** Se qualquer violação das etapas 3–6 existir,
   `criarTabelaTerrenoClasse` devolve `Result` de erro com **todas** as violações acumuladas em
   `details.violacoes` — a tabela inteira não é construída (Decisão 6, hard block).
8. **Calcular a cobertura** (só quando a etapa 7 não bloqueou): `calcularCoberturaDeClasses`
   compara a união de todas as classes citadas em qualquer entrada contra `classesConhecidas` e
   monta `RelatorioCoberturaTerrenoClasse`. Esta etapa **nunca bloqueia** — é informativa, mesmo
   quando `classesSemCobertura` lista 100% das classes (matriz vazia).
9. **Construir o índice.** `construirIndiceTerreno` monta um `ReadonlyMap<string, RegraTerrenoClasse>`
   por `terreno`.
10. **Compor `TabelaTerrenoClasse` e congelar.** `listarTerrenos()` devolve as chaves do índice
    ordenadas alfabeticamente. `obterRegraPorTerreno(terreno)` consulta o índice, `undefined` se
    ausente. `classificarClasseNoTerreno(terreno, classe)`:
    - Terreno ausente do índice → `{ tipo: "neutra", magnitude: 0 }` (Decisão 8).
    - Terreno presente, classe em `classesFortalecidas` → `{ tipo: "fortalecida", magnitude:
      regra.magnitudeFortalecimento }`.
    - Terreno presente, classe em `classesEnfraquecidas` → `{ tipo: "enfraquecida", magnitude:
      regra.magnitudeEnfraquecimento }`.
    - Terreno presente, classe em nenhuma das duas listas → `{ tipo: "neutra", magnitude: 0 }`.
    - `relatorioCobertura()` devolve o relatório calculado na etapa 8, imutável.
11. **Devolver `Result` de sucesso** com `{ tabela, relatorioCobertura }`.
12. **Imprimir o resumo** (adaptador CLI): violações (se houver, e nesse caso o processo já
    terminou com erro antes daqui), total de terrenos carregados, cobertura (`totalClassesCobertas`
    / `totalClassesConhecidas`) e a lista de `classesSemCobertura`. Exit code `0` quando não há
    violação estrutural/de referência (cobertura incompleta **não** falha o exit code — é o estado
    esperado hoje); exit code ≠ 0 quando há violação bloqueante ou falha de carregamento.

### Regras de negócio

- **Terreno é identidade exata de string** (sem normalização de caixa/acento) — mesma filosofia de
  `numero` em F01/F02 quanto a não inventar normalização não pedida.
- **Magnitude nunca é usada para codificar direção** — sempre não-negativa; a direção
  (fortalece/enfraquece) vem exclusivamente de em qual lista a classe está.
- **A classificação nunca lança.** Todo par (terreno, classe) tem uma resposta definida —
  `fortalecida`, `enfraquecida` ou `neutra` — nunca `undefined`/exceção, cumprindo o fallback
  neutro como propriedade estrutural da API (Decisão 8), não como responsabilidade do chamador.
- **Nenhuma aplicação de ATK/DEF acontece aqui.** `ClassificacaoTerreno` é dado passivo; somar/
  subtrair de um monstro é do Terrain Engine (cross-PRD).

### Determinismo e pureza

Não se aplica a `packages/engine` — esta feature não o toca, não usa PRNG e não produz estado de
duelo. `validarEstruturaMatriz`, `detectarTerrenoDuplicado`, `detectarClasseContraditoria`,
`validarReferenciasDeClasse`, `calcularCoberturaDeClasses`, `construirIndiceTerreno` e
`criarTabelaTerrenoClasse` são todas puras (mesma entrada → mesma saída, sem I/O). O único ponto
não determinístico do subsistema seria um relógio (não há — este subsistema, ao contrário de F01/
F02, não produz um relatório com `geradoEm`, porque `relatorioCobertura()` é uma função pura sobre
o estado já congelado da tabela, recalculável a qualquer momento sem custo).

## 4. Contratos

### Tipos e schema (`packages/data`, não em `shared` — Decisão 11)

- **`RegraTerrenoClasseSchema`** (zod) — objeto estrito: `terreno` string não-vazia (`.trim().min(1)`);
  `classesFortalecidas`/`classesEnfraquecidas` arrays de string não-vazia, sem duplicata interna
  (`.refine`); `magnitudeFortalecimento`/`magnitudeEnfraquecimento` inteiros `.min(0)`. Tipo
  derivado `RegraTerrenoClasse`.
- **`CategoriaViolacaoTerrenoSchema`** — enum dos 4 valores da Seção 3.
- Códigos de violação usados: `estrutura_invalida`, `terreno_duplicado`, `classe_contraditoria`,
  `classe_desconhecida_referenciada`.
- Reaproveitados sem alteração de `packages/shared` (F01): `Result<T, E>`, `DomainError`.
- Reaproveitado sem alteração de `packages/data` (F03): `CatalogoCartas`.

### Funções públicas

```
// packages/data/src/terreno — núcleo puro, sem I/O

validarEstruturaMatriz(bruto: unknown): Result<readonly RegraTerrenoClasse[], DomainError>
  // erro ⇒ codigo 'estrutura_invalida', details.violacoes com uma entrada por elemento problemático

detectarTerrenoDuplicado(entradas: readonly RegraTerrenoClasse[]): readonly ViolacaoTerrenoClasse[]
detectarClasseContraditoria(entradas: readonly RegraTerrenoClasse[]): readonly ViolacaoTerrenoClasse[]

validarReferenciasDeClasse(
  entradas: readonly RegraTerrenoClasse[],
  classesConhecidas: readonly string[],
): readonly ViolacaoTerrenoClasse[]

calcularCoberturaDeClasses(
  entradas: readonly RegraTerrenoClasse[],
  classesConhecidas: readonly string[],
): RelatorioCoberturaTerrenoClasse
  // nunca bloqueia; pode devolver classesSemCobertura === classesConhecidas (matriz vazia)

construirIndiceTerreno(entradas: readonly RegraTerrenoClasse[]): ReadonlyMap<string, RegraTerrenoClasse>

derivarClassesDeMonstroConhecidas(catalogo: CatalogoCartas): readonly string[]
  // = distintos de catalogo.listByTipo('monstro').map(c => c.classe), ordenado (Decisão 3)

criarTabelaTerrenoClasse(entrada: {
  matrizBruta: unknown;
  classesConhecidas: readonly string[];
}): Result<{ tabela: TabelaTerrenoClasse; relatorioCobertura: RelatorioCoberturaTerrenoClasse }, DomainError>
  // valida estrutura + duplicidade + contradição + referência (etapas 3-6)
  // qualquer violação ⇒ erro 'matriz_terreno_classe_invalida', details.violacoes com TODAS
  // sucesso ⇒ tabela congelada + relatório de cobertura (nunca bloqueante)
```

```
// packages/data/src/terreno/carregar-tabela-terreno-classe-do-disco.ts — adaptador de I/O

carregarTabelaTerrenoClasseDoDisco(opcoes: {
  caminhoArquivo: string; // packages/data/src/terreno/dados/terrain-class-matrix.json
  catalogo: CatalogoCartas; // já carregado pelo chamador via F03
}): Promise<Result<{ tabela: TabelaTerrenoClasse; relatorioCobertura: RelatorioCoberturaTerrenoClasse }, DomainError>>
  // lê caminhoArquivo, deriva classesConhecidas de catalogo, chama criarTabelaTerrenoClasse
  // arquivo ausente/ilegível ⇒ erro matriz_ausente_ou_ilegivel antes de qualquer checagem
```

```
// packages/data/scripts/validate-terrain-class-matrix.ts — adaptador CLI

executarValidacaoTerrenoClasse(opcoes: {
  caminhoArquivo: string;
  dirGeradoCatalogo: string; // para carregarCatalogoDoDisco (F03)
}): Promise<number>
  // compõe carregarCatalogoDoDisco (F03) + carregarTabelaTerrenoClasseDoDisco
  // imprime resumo: violacoes (se houver), terrenos carregados, cobertura
  // exit code 0 sse nao ha violacao estrutural/duplicidade/contradicao/referencia
  //   (cobertura incompleta sozinha NAO falha o exit code)
```

### Exemplos de artefato

`packages/data/src/terreno/dados/terrain-class-matrix.json` — **estado real hoje**, committed,
schema-válido, aguardando fornecimento externo (Decisão 7, Decisão 9):

```json
[]
```

Exemplo **ilustrativo** da forma de uma entrada preenchida — nomes de terreno e classe
propositalmente fictícios (`TerrenoExemploA`, `ClasseExemploX/Y/Z`) e magnitude arbitrária, **não**
os valores reais do Forbidden Memories, que permanecem pendentes (Decisão 9). Serve apenas para
documentar o formato que o mantenedor deve seguir ao fornecer os dados reais:

```json
[
  {
    "terreno": "TerrenoExemploA",
    "classesFortalecidas": ["ClasseExemploX", "ClasseExemploY"],
    "classesEnfraquecidas": ["ClasseExemploZ"],
    "magnitudeFortalecimento": 500,
    "magnitudeEnfraquecimento": 500
  }
]
```

Exemplo de saída de `criarTabelaTerrenoClasse` com a matriz vazia acima, contra um conjunto
conhecido hipotético de 3 classes:

```json
{
  "relatorioCobertura": {
    "totalClassesConhecidas": 3,
    "totalClassesCobertas": 0,
    "classesSemCobertura": ["ClasseExemploX", "ClasseExemploY", "ClasseExemploZ"]
  }
}
```

Exemplo de uso da consulta, com a matriz vazia real (fallback neutro sempre ativo hoje):

```ts
const resultado = await carregarTabelaTerrenoClasseDoDisco({
  caminhoArquivo: "packages/data/src/terreno/dados/terrain-class-matrix.json",
  catalogo,
});
if (!resultado.ok) {
  throw new Error("Matriz terreno↔classe indisponível.", { cause: resultado.error });
}
const { tabela } = resultado.value;

tabela.classificarClasseNoTerreno("Forest", "Dragon");
// { tipo: "neutra", magnitude: 0 }  — nenhum terreno carregado hoje
```

### Contratos externos (cross-PRD)

`TabelaTerrenoClasse.classificarClasseNoTerreno` é o contrato **fornecido** a um futuro PRD de
Terrain Engine (cross-PRD, `packages/rules/src/terrain`), que o consumirá para implementar
`ProvedorModificadorTerreno` (já declarado por `motor-duelo-1x1` F04 em
`packages/shared/src/duelo/modificadores.ts`). Nenhum desses dois pontos é alterado por esta
feature — apenas se confirma aqui que a saída de F07 (classificação + magnitude por par
terreno/classe) é suficiente para aquele provedor calcular o delta de ATK/DEF quando a tabela real
existir.

## 5. Modelo de Dados

Esta feature não cria tabelas Postgres nem estruturas IndexedDB — não há estado por jogador. Não
gera artefato de build (ao contrário de F01/F02); o próprio arquivo de dados **é** a fonte.

### Arquivo de dados hospedado

| Arquivo | Formato | Versionado em git | Determinístico | Consumidor |
|---|---|---|---|---|
| `packages/data/src/terreno/dados/terrain-class-matrix.json` | Array JSON de `RegraTerrenoClasse` | **sim** (Decisão 7, contraste com F01/F02) | sim (nenhum campo de timestamp) | `criarTabelaTerrenoClasse`, F09 (empacotamento futuro) |

Não há `.gitignore` novo — este arquivo é o oposto do padrão de `packages/data/generated/`: é
insumo fornecido, não artefato derivado. Quando o mantenedor fornecer os valores reais, a mudança
aparece como diff normal de PR (ao contrário de `cards.json`, cuja mudança não aparece em diff —
F01 Decisão 5) — o que é desejável aqui, já que estes valores exigem revisão humana de fidelidade
ao jogo original antes de merge.

### Estrutura em memória

`TabelaTerrenoClasse` (via `ReadonlyMap<string, RegraTerrenoClasse>` interno) vive apenas durante a
sessão do processo que a construiu — recriada a cada `carregarTabelaTerrenoClasseDoDisco`, sem
cache persistente nesta feature (cache do bundle offline é F09).

## 6. Tratamento de Erros e Casos de Borda

O PRD não define um bloco Error Handling para F07 (Decisão 13) — os casos abaixo são derivados por
analogia com F01/F02/F03 e com as guidelines (fail-safe explícito, guidelines §8.1/§8.3).

| Cenário | Detecção | Comportamento | Mensagem/Retorno |
|---|---|---|---|
| `terrain-class-matrix.json` ausente ou JSON ilegível | `carregarTabelaTerrenoClasseDoDisco` | **Aborta.** Nenhuma tabela construída | `Result` erro `matriz_ausente_ou_ilegivel`: "Matriz terreno↔classe não encontrada ou ilegível em {caminho}." |
| Catálogo (F03) indisponível ao compor o carregamento | Adaptador CLI, antes de ler a matriz | **Aborta.** Reaproveita o erro de F03 | "Catálogo indisponível: dataset inválido ou ausente." (herdado de F03) |
| Entrada com campo de tipo errado, `terreno` vazia, ou magnitude negativa | `validarEstruturaMatriz` | **Bloqueia a tabela inteira.** Violação `estrutura` acumulada com as demais | `Entrada de terreno inválida: {motivo}.` |
| Array `classesFortalecidas`/`classesEnfraquecidas` com duplicata interna | `validarEstruturaMatriz` | **Bloqueia.** Violação `estrutura` | `Classe '{classe}' duplicada na lista de {fortalecidas\|enfraquecidas} do terreno '{terreno}'.` |
| Dois `terreno` idênticos no array | `detectarTerrenoDuplicado` | **Bloqueia.** Violação `terreno_duplicado` | `Terreno '{terreno}' duplicado no mapeamento.` |
| Classe presente em `classesFortalecidas` e `classesEnfraquecidas` do mesmo terreno | `detectarClasseContraditoria` | **Bloqueia.** Violação `classe_contraditoria` | `Classe '{classe}' fortalecida e enfraquecida simultaneamente no terreno '{terreno}'.` |
| Classe referenciada que não existe no conjunto de classes de monstro do catálogo | `validarReferenciasDeClasse` | **Bloqueia.** Violação `classe_desconhecida` | `Classe '{classe}' referenciada no terreno '{terreno}' não existe no catálogo.` |
| Classe conhecida do catálogo ausente de toda entrada do mapeamento | `calcularCoberturaDeClasses` | **Não bloqueia.** Entra em `classesSemCobertura` — estado esperado enquanto a matriz está vazia/parcial (Decisão 9) | — (reportado no resumo, não é erro) |
| Matriz totalmente vazia (`[]`) | `criarTabelaTerrenoClasse` | **Sucesso.** Tabela construída sem terrenos; `classesSemCobertura` lista 100% das classes conhecidas | — |
| `classificarClasseNoTerreno` com terreno não carregado | `TabelaTerrenoClasse` | Nunca lança | `{ tipo: "neutra", magnitude: 0 }` |
| `classificarClasseNoTerreno` com classe não listada naquele terreno (mas terreno existe) | `TabelaTerrenoClasse` | Nunca lança | `{ tipo: "neutra", magnitude: 0 }` |
| Tentativa de mutar `TabelaTerrenoClasse` ou uma `RegraTerrenoClasse` retornada | Runtime (`Object.freeze`) | Lança `TypeError` — mesma garantia estrutural de F03 | Erro nativo do motor JS |

Todo bloqueio acumula **todas** as violações antes de devolver o erro (guidelines §8.3,
ADR-003) — nunca para no primeiro problema, mesma filosofia de F01/F02.

## 7. Estratégia de Testes

### Unitários (Vitest)

`validarEstruturaMatriz` — table-driven (guidelines §11.2):
- `validarEstruturaMatriz aceita entrada valida com listas nao vazias`
- `validarEstruturaMatriz aceita entrada com listas vazias e magnitude zero`
- `validarEstruturaMatriz rejeita terreno vazio apos trim`
- `validarEstruturaMatriz rejeita magnitude negativa`
- `validarEstruturaMatriz rejeita classe duplicada dentro de classesFortalecidas`
- `validarEstruturaMatriz nao aborta no primeiro elemento invalido e processa o array inteiro`

`detectarTerrenoDuplicado`:
- `detectarTerrenoDuplicado nao gera violacao para terrenos distintos`
- `detectarTerrenoDuplicado gera violacao citando o terreno repetido`

`detectarClasseContraditoria`:
- `detectarClasseContraditoria nao gera violacao quando as listas nao se sobrepoem`
- `detectarClasseContraditoria gera violacao para classe presente nas duas listas do mesmo terreno`

`validarReferenciasDeClasse`:
- `validarReferenciasDeClasse aprova quando toda classe referenciada e conhecida`
- `validarReferenciasDeClasse reporta classe desconhecida em classesFortalecidas`
- `validarReferenciasDeClasse reporta classe desconhecida em classesEnfraquecidas`

`calcularCoberturaDeClasses`:
- `calcularCoberturaDeClasses retorna lista vazia quando toda classe aparece em algum terreno`
- `calcularCoberturaDeClasses retorna todas as classes quando a matriz esta vazia`
- `calcularCoberturaDeClasses nao conta classe duas vezes quando ela aparece em multiplos terrenos`

`derivarClassesDeMonstroConhecidas`:
- `derivarClassesDeMonstroConhecidas ignora classes de cartas nao monstro`
- `derivarClassesDeMonstroConhecidas remove duplicatas e ordena alfabeticamente`

`criarTabelaTerrenoClasse`:
- `criarTabelaTerrenoClasse aceita matriz vazia e reporta cobertura zero`
- `criarTabelaTerrenoClasse recusa e acumula violacoes de estrutura duplicidade contradicao e referencia juntas`
- `criarTabelaTerrenoClasse aceita matriz completa sem violacoes`

`TabelaTerrenoClasse` (via fixture construída):
- `obterRegraPorTerreno retorna undefined para terreno nao carregado`
- `classificarClasseNoTerreno retorna neutra e magnitude zero para terreno desconhecido`
- `classificarClasseNoTerreno retorna fortalecida com a magnitude configurada`
- `classificarClasseNoTerreno retorna enfraquecida com a magnitude configurada`
- `classificarClasseNoTerreno retorna neutra quando a classe nao esta listada naquele terreno`
- `listarTerrenos retorna em ordem alfabetica independente da ordem do arquivo`
- `tentativa de escrita em uma regra retornada lanca TypeError`

### Property-based (fast-check)

- **Cobertura é o complemento exato:** para qualquer subconjunto aleatório de classes conhecidas
  distribuído entre `classesFortalecidas`/`classesEnfraquecidas` de terrenos sintéticos,
  `classesSemCobertura` é exatamente o complemento do subconjunto coberto. 1.000 execuções.
- **Classificação é sempre definida:** para qualquer terreno e qualquer classe (presentes ou não na
  tabela), `classificarClasseNoTerreno` nunca lança e sempre devolve um `tipo` válido.
- **Neutralidade fora da tabela:** para qualquer terreno **não** presente no índice, a
  classificação é sempre `{ tipo: "neutra", magnitude: 0 }`, independentemente da classe.
- **Nenhuma classe simultaneamente fortalecida e enfraquecida sobrevive à construção:** para
  qualquer matriz sintética gerada aleatoriamente contendo ao menos uma sobreposição,
  `criarTabelaTerrenoClasse` sempre devolve erro com uma violação `classe_contraditoria`.

### Integração

`packages/data/tests/terreno.integration.test.ts`, rodando após F01/F02/F03 reais:
- `tabela real carrega o arquivo terrain-class-matrix.json vazio sem erro`
- `tabela real reporta 100% das classes de monstro do catalogo real como sem cobertura enquanto a matriz esta vazia`
- `tabela real deriva classesDeMonstroConhecidas excluindo Equip Magic Ritual e Trap`
- `tabela real nao bloqueia mesmo com cobertura zero`
- `script de validacao real termina com exit code zero mesmo com cobertura incompleta`
- `script de validacao real termina com exit code diferente de zero quando a matriz de teste referencia classe inexistente`

### Análise estática

- `packages/data/src/terreno/**` (exceto o adaptador de carregamento) não importa `node:fs`,
  `node:path` nem `fetch`.
- `packages/data` continua importando apenas `packages/shared` (mais os próprios subsistemas de
  `data`, como `catalogo` de F03) — nenhum import de `rules`, `engine`, `ai`, `web` ou `server`.
- `packages/rules/src/terrain/**` (placeholder de `motor-duelo-1x1` F04) permanece inalterado.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F07) | Teste |
|---|---|
| O schema do mapeamento e o loader estão definidos; a matriz responde por terreno ativo | `criarTabelaTerrenoClasse aceita matriz completa sem violacoes` + `obterRegraPorTerreno retorna undefined para terreno nao carregado` |
| A validação aponta qualquer classe de monstro do catálogo ausente no mapeamento | `calcularCoberturaDeClasses retorna todas as classes quando a matriz esta vazia` + `tabela real reporta 100% das classes de monstro do catalogo real como sem cobertura enquanto a matriz esta vazia` |
| **(Pendente)** Os valores de fortalecimento/enfraquecimento e magnitude batem com o original — bloqueado até fornecimento | Não testável hoje. `classificarClasseNoTerreno retorna neutra...` cobre o caminho neutro exigido enquanto a pendência persiste (Decisão 9) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: o pacote de F09 contém exatamente o catálogo de F03, as artes de F04 e as tabelas de F05–F08 (incl. F07), e F10 versiona esse pacote como uma unidade | Contrato declarado: `terrain-class-matrix.json` (arquivo hospedado) é o insumo que F09 deve incluir no empacotamento — verificado quando F09 for especificada |
| Cross-PRD **(Pendente)**: o módulo de Terrenos/Motor consome a matriz de F07 sem codificar a regra localmente | `TabelaTerrenoClasse.classificarClasseNoTerreno` é a porta que um futuro Terrain Engine (`packages/rules`) vai chamar para alimentar `ProvedorModificadorTerreno` (já declarado por `motor-duelo-1x1` F04) — contrato registrado nesta spec, pendente de implementação daquele lado |
