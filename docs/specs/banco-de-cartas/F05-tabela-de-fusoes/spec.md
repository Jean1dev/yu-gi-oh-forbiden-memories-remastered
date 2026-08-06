# Tabela de Fusões

> PRD: `docs/prds/banco-de-cartas.md` — F05
> Pacote-alvo: `packages/data`

## 1. Contexto e Escopo

Esta feature hospeda a **tabela de fusões** do Banco de Cartas: define o schema da receita de
fusão, um núcleo de validação que rejeita receitas cujo `numero` (material ou resultado) não
existe no catálogo, e um índice consultável por par de materiais, por par de classes e por
carta-resultado. É uma feature da **Wave 4** do PRD (§8, Parte 3), junto de F04/F06/F07/F08, e
corresponde à **Fase 4** do roadmap de `docs/arquitetura.md` §9 ("Effect System + tabelas
(guardião/terreno/fusão) conforme chegarem"). Depende apenas de **F03** (`CatalogoCartas`, já
especificada) para validar referências de `numero` e de classe.

Diferente de F01–F03, o dado de entrada aqui **não é derivado** de `cards-data/`: é um arquivo
pequeno, curado manualmente pelo mantenedor de dados, com a lista de receitas de fusão do jogo
original — que, conforme `arquitetura.md` §4.3 e ADR-003, **ainda não existe no repositório**.
Esta spec entrega **schema + loader + validação**; a lista de receitas em si é dado externo
pendente e **não é inventada aqui** (ver Decisões e Premissas, item 10). Enquanto o arquivo
permanecer vazio, a tabela carrega normalmente com zero receitas, e toda consulta devolve "sem
fusão conhecida" — o comportamento neutro que o Fusion System (cross-PRD, fora de escopo) deve
tratar como estado válido, nunca como erro.

O desenho segue o mesmo padrão de fronteira de I/O de F01–F03
(`TypeScript-development-guidelines.md` §3.3, §12, §19.2): núcleo puro de validação/indexação
sobre dados já lidos, com todo I/O confinado a um adaptador fino na borda.

### Incluído

- Schema (zod) da receita de fusão, em dois formatos: por **par de materiais** específicos
  (`numero + numero → numero`) e por **par de classes** (`classe + classe → numero`) — PRD
  Provides ("regras de fusão por classe, quando aplicável")
- Núcleo de validação que rejeita, receita a receita, qualquer `numero` de material ou de
  resultado inexistente no catálogo (F03) — PRD Capabilities
- Validação de que toda classe referenciada numa regra por-classe existe entre as classes
  observadas no catálogo (extensão documentada, Decisão 7)
- Índice consultável por par de materiais, por par de classes (ambos independentes da ordem dos
  dois lados) e por carta-resultado
- Detecção de par duplicado/conflitante entre receitas válidas
- Relatório de rejeições para o mantenedor de dados, com a posição no arquivo e o motivo
- Loader que carrega o arquivo de fusões do disco, exige um `CatalogoCartas` já carregado, e
  expõe a tabela consultável em memória
- Arquivo semente `fusoes.json` com lista vazia, versionado em git, pronto para receber os
  valores reais quando fornecidos

### Fronteiras

- **Lógica de resolução de fusão durante o duelo** (ordem de tentativa exata → por classe, custo,
  efeito de invocação por fusão) → **Fusion System** (cross-PRD); esta feature só hospeda a
  tabela. — PRD §7
- **Cálculo de compatibilidade de Guardiões e de bônus/penalidade de terreno** → **F06/F07**,
  ainda não especificadas nesta wave
- **Concessão/aquisição de cartas material pelo jogador** → Build Deck/coleção (cross-PRD)
- **Leitura, normalização e veredito do dataset de cartas** → **F01/F02**, já especificadas; F05
  apenas consome o catálogo já servido por F03
- **Empacotamento para distribuição offline/online e definição do formato do bundle** → **F09**,
  ainda não especificada — F05 apenas expõe a lista de receitas válidas para F09 consumir

### Contratos externos assumidos

Nenhum contrato cross-PRD é **consumido** por F05 — é fornecedor. Internamente, depende apenas de
F03 (`CatalogoCartas`), já especificada em `docs/specs/banco-de-cartas/F03-.../`. Fusion System e
Motor de Duelo 1x1 (cross-PRD) são consumidores **futuros** da API fornecida por esta feature, não
dependências de entrada — ver Seção 4, Contratos externos (cross-PRD).

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O arquivo de fusões vive em **`packages/data/rules-data/fusoes.json`**, **versionado em git** — diferente de `packages/data/generated/`, que é `.gitignore`d (F01 Decisão 5). Justificativa: este é um dado **curado manualmente** pelo mantenedor (não derivado de `cards-data/`), de baixo volume, que precisa de diff revisável em Pull Request — o oposto do dataset bruto de 821 arquivos. `rules-data/` é o diretório de entrada compartilhado que F06–F08 (matriz de Guardiões, terreno↔classe, drops) também usarão para suas próprias tabelas pendentes. | tarefa (decisão delegada ao spec-writer); `arquitetura.md` §4.3; ADR-003 | confirmada |
| 2 | O seed inicial de `fusoes.json` é um **array vazio (`[]`)**, commitado agora — não um arquivo ausente. Isso garante que o pipeline de build/validação e o futuro empacotamento de F09 nunca falhem por "arquivo não encontrado" antes dos valores reais chegarem; a ausência total do arquivo continua sendo tratada como erro de configuração (Seção 6), distinta de "tabela intencionalmente vazia". | PRD §6 F05 Capabilities ("a tabela é carregada vazia/parcial"); `arquitetura.md` §4.3 | confirmada |
| 3 | Os tipos e schemas de fusão (`ReceitaFusao`, `TabelaFusoes`, `RelatorioFusoes`, etc.) vivem em **`packages/data`**, não em `packages/shared`. F02 havia colocado seus tipos de relatório em `shared`; F03 (spec mais recente e com justificativa explícita) optou pelo oposto, com o critério "nenhum pacote acima de `data` na direção de dependências consome este tipo sem já depender de `data`". Aplicado aqui: Fusion System (futuro `packages/rules`) e Motor de Duelo 1x1 já dependem de `data` na direção `shared ← data ← rules ← engine`, então não há necessidade de promover estes tipos a `shared`. Escolhido o padrão mais recente entre os dois precedentes conflitantes, conforme a política de "padrões conflitantes → o mais recente". | F03 spec Decisão 5 (critério de posicionamento); guidelines §3.2/§3.3 | confirmada — resolve precedente conflitante F02 vs. F03 |
| 4 | Duas formas de receita, discriminadas por um campo `tipo`: **por par de materiais** (`numero + numero → numero`) e **por par de classes** (`classe + classe → numero`). Reflete os dois mecanismos de fusão do FM (fusão exata por carta e fusão por combinação de tipo) sem definir nenhum valor real — é estrutura, não dado. | PRD §6 F05 Provides ("regras de fusão por classe, quando aplicável"); `product.md` (fidelidade estrutural) | confirmada |
| 5 | Pares (de materiais ou de classes) são **não-ordenados**: `buscarPorParDeMateriais(A, B)` e `(B, A)` resolvem à mesma receita, via uma chave canônica ordenada. A escolha de dois materiais para fundir não tem ordem no jogo original. | auto-aceite: decisão técnica com recomendação clara | confirmada |
| 6 | A validação **rejeita receitas individualmente** e nunca aborta a tabela inteira — análogo ao tratamento de registro individual malformado em F01, e diferente do modelo tudo-ou-nada de F03. Justificativa: a tabela de fusões não é fundação crítica de runtime como o catálogo (F03); o próprio Fusion System já trata a ausência de uma fusão como estado neutro, então uma receita malformada isolada deve virar "essa fusão específica não existe", não derrubar a tabela inteira. O PRD **não define um bloco "Error Handling" próprio para F05** (diferente de F01–F04, F09, F10) — esta é a aplicação do padrão mais consistente já usado no módulo diante dessa lacuna. | PRD §6 F05 (sem bloco Error Handling — especificação parcial); ADR-003 ("comportamento neutro e rastreável até serem preenchidas"); F01 spec (tratamento de registro individual) | confirmada — extensão documentada |
| 7 | Além da checagem de `numero` (exigida literalmente pelo PRD), a validação também exige que toda **classe** referenciada numa regra por-classe exista entre as classes observadas no catálogo real (via `contagemPorClasse()` de F03). Extensão de boa prática não citada literalmente no PRD (que só menciona validação de `numero`), mas consistente com o padrão já estabelecido por F02 (`checarClasseConhecida`). | auto-aceite: decisão técnica com recomendação clara; F02 spec Decisões 2–3 (precedente de checagem de classe) | confirmada — extensão documentada |
| 8 | Duas receitas válidas que compartilham o **mesmo par canônico** (de materiais ou de classes) com resultados diferentes são tratadas como **conflito**: nenhuma das duas entra no índice, e ambas são reportadas com motivo `par_duplicado`. Preferido a uma resolução arbitrária (ex.: "a primeira ganha"), que esconderia um erro de autoria do mantenedor. | auto-aceite: decisão técnica com recomendação clara; ADR-003 (fail-safe) | confirmada |
| 9 | F05 **não implementa** a lógica de fallback de resolução de fusão (tentar par exato, depois regra por classe, aplicar custo/efeito de invocação). Expõe apenas as consultas primitivas separadas (`buscarPorParDeMateriais`, `buscarPorParDeClasses`); a composição do algoritmo de resolução — incluindo a ordem de prioridade entre os dois mecanismos — é do Fusion System (cross-PRD). | PRD §7 Fora de Escopo ("aqui só vive a tabela de fusões") | confirmada |
| 10 | **REVISÃO — PENDÊNCIA RESOLVIDA:** o Fusion System/F01 incorporou o snapshot upstream fixado com 50.242 orientações normais, compiladas em 25.146 pares canônicos e validadas contra o catálogo. Os 15 glitches permanecem excluídos. A fonte compacta e o artefato gerado são versionados; `[]` continua válido apenas para fixtures e indisponibilidade isolada. | `docs/fusoes.md`; `fusion-system` F01; upstream `be2a752bfa484a04c52b5b4bef6bed22d1a8fcf7` | confirmada — revisada pelo Fusion System/F01 |
| 11 | Um relatório de rejeições (`fusion-validation-report.json`) é gerado no build, mesmo não exigido literalmente pelo texto do PRD, para dar ao mantenedor visibilidade sobre quais receitas do arquivo hand-authored foram descartadas e por quê — mesmo padrão mantenedor-facing já usado por F01 (`ingestion-report.json`) e F02 (`validation-report.json`). | auto-aceite: especificação parcial no PRD (Experience não detalha saída); precedente F01/F02 | confirmada — extensão documentada |
| 12 | Nenhum contrato cross-PRD é consumido por F05. F05 depende apenas de F03, interno ao mesmo PRD e já especificado. Fusion System e Motor de Duelo 1x1 são consumidores futuros da API, não dependências de entrada desta feature. | PRD §8 (F05 depende só de F03); PRD §7 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/rules-data/fusoes.json` | data | novo (dado, versionado em git) | Arquivo de fusões mantido por curadoria manual do mantenedor; seed inicial `[]` |
| `packages/data/src/fusoes/tipos.ts` | data | novo | `ReceitaFusaoPorMateriais`, `ReceitaFusaoPorClasses`, `ReceitaFusao`, `TabelaFusoes`, `IndiceFusoes` (interno), `MotivoRejeicaoFusao`, `ReceitaFusaoRejeitada`, `RelatorioFusoes` |
| `packages/data/src/fusoes/schema.ts` | data | novo | `ReceitaFusaoSchema` (união discriminada por `tipo`, zod), `TabelaFusoesArquivoSchema` (array no topo do arquivo) |
| `packages/data/src/fusoes/canonicalizar-par.ts` | data | novo | `canonicalizarPar`: chave estável e independente da ordem para pares de `numero` ou de classe |
| `packages/data/src/fusoes/validar-receita-fusao.ts` | data | novo | Valida uma receita (já validada pelo schema) contra o catálogo: `numero` de materiais/resultado e classes conhecidas |
| `packages/data/src/fusoes/indexar-fusoes.ts` | data | novo | Constrói os três índices (por par de materiais, por par de classes, por resultado) e detecta pares conflitantes |
| `packages/data/src/fusoes/criar-tabela-fusoes.ts` | data | novo | Orquestrador puro: `receitasBruto` (unknown) + `CatalogoCartas` → `{ tabela, relatorio }` |
| `packages/data/src/fusoes/carregar-tabela-fusoes-do-disco.ts` | data | novo | Adaptador de I/O: lê `rules-data/fusoes.json`, exige um `CatalogoCartas` já carregado, delega ao núcleo puro, escreve o relatório |
| `packages/data/src/fusoes/index.ts` | data | novo | Export público do subsistema de fusões |
| `packages/data/scripts/validate-fusions.ts` | data | novo | Adaptador CLI: carrega o catálogo (via F03), carrega e valida a tabela de fusões, imprime resumo, define exit code |
| `packages/data/generated/fusion-validation-report.json` | data | gerado (não versionado) | Relatório de rejeições da execução mais recente |
| `packages/data/tests/fixtures/fusoes/` | data | novo | Fixtures sintéticas: vazio, mista (válidas + inválidas), numero de material/resultado inexistente, classe desconhecida, par duplicado, elemento fora do schema |
| `packages/data/src/fusoes/canonicalizar-par.test.ts` | data | novo | Unitários de canonicalização |
| `packages/data/src/fusoes/validar-receita-fusao.test.ts` | data | novo | Unitários de validação contra catálogo (table-driven) |
| `packages/data/src/fusoes/indexar-fusoes.test.ts` | data | novo | Unitários de indexação e detecção de conflito |
| `packages/data/src/fusoes/criar-tabela-fusoes.test.ts` | data | novo | Unitários do orquestrador + propriedades fast-check |
| `packages/data/tests/fusoes.integration.test.ts` | data | novo | Integração contra o catálogo real (F01+F02+F03) e o seed `fusoes.json` |
| `turbo.json` | raiz | alterado | Nova tarefa `data:validate-fusions`, `dependsOn: ["data:catalog"]` (ou equivalente já definido por F03), `inputs` incluindo `rules-data/fusoes.json` e os artefatos gerados por F01/F02, `outputs: ["packages/data/generated/fusion-validation-report.json"]` |

**Verificação da direção de dependências:** `packages/data` continua importando **apenas**
`packages/shared` (reaproveita `NumeroCarta`, `DomainError`, `Result` de F01, e `CatalogoCartas`
de F03, ambos internos ao mesmo pacote `data`). Nenhum import novo de `rules`, `engine`, `ai`,
`web` ou `server` — a direção `shared ← data` de `arquitetura.md` §2 é preservada. `rules`
(Fusion System, cross-PRD, ainda não implementado) é quem importará `packages/data` para consumir
esta feature, nunca o inverso.

Esta feature **não toca `packages/engine`** — as garantias de pureza/PRNG do motor não se
aplicam. A fronteira de I/O segue o padrão de F01–F03:

- `packages/data/src/fusoes/{tipos,schema,canonicalizar-par,validar-receita-fusao,indexar-fusoes,criar-tabela-fusoes}.ts`
  **não** importam `node:fs`, `node:path` nem `fetch` — recebem dados já lidos (o array bruto e um
  `CatalogoCartas` já construído) e devolvem estruturas em memória.
- `packages/data/src/fusoes/carregar-tabela-fusoes-do-disco.ts` é o único ponto deste subsistema
  com I/O de leitura e escrita.

## 3. Design Técnico

### Estruturas de dados

**`ReceitaFusaoPorMateriais`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `tipo` | literal `"materiais"` | Discriminante |
| `materiais` | `readonly [NumeroCarta, NumeroCarta]` | Os dois `numero` exigidos para a fusão |
| `resultado` | `NumeroCarta` | `numero` da carta produzida |

**`ReceitaFusaoPorClasses`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `tipo` | literal `"classes"` | Discriminante |
| `classes` | `readonly [string, string]` | As duas classes exigidas (fusão por combinação de tipo) |
| `resultado` | `NumeroCarta` | `numero` da carta produzida |

**`ReceitaFusao`** — união discriminada das duas anteriores por `tipo`.

**`MotivoRejeicaoFusao`** — union fechado: `schema_invalido`, `numero_material_inexistente`,
`numero_resultado_inexistente`, `classe_desconhecida`, `par_duplicado`.

**`ReceitaFusaoRejeitada`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `indice` | `number` | Posição da receita no array bruto do arquivo, para o mantenedor localizá-la |
| `motivo` | `MotivoRejeicaoFusao` | Categoria da rejeição |
| `detalhe` | `string` | Mensagem legível, segue os templates da Seção 6 |

**`RelatorioFusoes`** — evidência de processo consumida pelo mantenedor:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `totalNoArquivo` | `number` | Total de elementos no array bruto |
| `receitasValidas` | `number` | Receitas que entraram no índice (excluindo conflitos) |
| `receitasRejeitadas` | `ReceitaFusaoRejeitada[]` | Toda receita excluída, com motivo |
| `geradoEm` | `string` | ISO 8601, não entra em nenhuma garantia de determinismo byte-a-byte |

**`IndiceFusoes`** (interno, não exportado do pacote):

| Campo | Tipo | Semântica |
|---|---|---|
| `porParDeMateriais` | `ReadonlyMap<string, ReceitaFusaoPorMateriais>` | Chave = `canonicalizarPar` dos dois `numero` |
| `porParDeClasses` | `ReadonlyMap<string, ReceitaFusaoPorClasses>` | Chave = `canonicalizarPar` das duas classes |
| `porResultado` | `ReadonlyMap<NumeroCarta, readonly ReceitaFusao[]>` | Índice reverso, agrega receitas dos dois tipos |

**`TabelaFusoes`** (público, `Readonly<{...}>`, congelado por `criarTabelaFusoes`) — ver Seção 4.

### Fluxo

1. **Resolver o arquivo e o catálogo.** O adaptador de I/O recebe o caminho de
   `rules-data/fusoes.json` (padrão) e um `CatalogoCartas` **já carregado** (produzido por F03) —
   a tabela de fusões nunca carrega o catálogo por conta própria; é uma dependência injetada.
2. **Ler e parsear o arquivo.** JSON malformado ou arquivo ausente → aborta antes de qualquer
   validação (Seção 6). Conteúdo lido com sucesso mas que não é um array → aborta com
   `arquivo_fusoes_invalido` — esta é a **única** condição que aborta o carregamento inteiro.
3. **Validar cada elemento contra o schema.** `ReceitaFusaoSchema.safeParse` em cada posição do
   array. Falha de schema (tipo fora de `materiais`/`classes`, tamanho de par diferente de 2,
   `numero` fora do formato `^[0-9]{3}$`) → rejeitada com motivo `schema_invalido`, citando o
   `indice`; **não aborta as demais**.
4. **Validar contra o catálogo.** Para cada receita que passou no schema:
   `validarReceitaFusao` confere que `materiais[0]`, `materiais[1]` e `resultado` existem via
   `catalogo.getByNumero` (formato por materiais), ou que ambas as `classes` são chaves de
   `catalogo.contagemPorClasse()` e `resultado` existe (formato por classes). Falha → rejeitada
   com o motivo específico (`numero_material_inexistente`, `numero_resultado_inexistente` ou
   `classe_desconhecida`), citando o `indice`.
5. **Indexar as receitas aprovadas.** `indexarFusoes` calcula a chave canônica de cada par e monta
   os três índices. Duas receitas aprovadas que colidem na mesma chave canônica com `resultado`
   diferente → ambas viram conflito (`par_duplicado`) e são **excluídas** do índice, mesmo tendo
   passado nas etapas 3–4.
6. **Montar o relatório.** Agrega todas as rejeições das etapas 3–5 em `receitasRejeitadas`, com
   `totalNoArquivo` e `receitasValidas` derivados do array bruto e do índice final.
7. **Compor a tabela pública.** As funções de consulta (Seção 4) fecham sobre os índices já
   prontos — nenhuma delas recalcula nada.
8. **Escrever o relatório e imprimir o resumo** (adaptador): grava
   `generated/fusion-validation-report.json` e imprime no stdout o total de receitas no arquivo,
   quantas foram indexadas e quantas rejeitadas por motivo — mesmo padrão de Experience de
   F01/F02 (Decisão 11).

### Regras de negócio

- **Par não-ordenado:** `canonicalizarPar(a, b) === canonicalizarPar(b, a)` para qualquer par —
  regra central que sustenta a busca independente de ordem (Decisão 5).
- **Resultado é sempre um único `numero`:** nenhuma receita produz mais de uma carta possível nem
  carrega probabilidade — simplificação estrutural documentada (Decisão 4), sem inventar regras
  de jogo além da forma "materialA + materialB → resultado" já descrita no PRD.
- **Rejeição nunca aborta o lote** (Decisão 6): o único caminho de aborto total é a entrada bruta
  não ser um array (passo 2).
- **Conflito de par é bilateral:** ambas as receitas em conflito são excluídas, nenhuma "vence"
  arbitrariamente (Decisão 8).
- **Tabela vazia é um estado válido, não um erro:** `criarTabelaFusoes` com `receitasBruto: []`
  produz `{ tabela com 0 receitas, relatorio com totalNoArquivo: 0 }` sem nenhuma rejeição — é o
  estado esperado hoje, antes dos valores reais chegarem (Decisão 10).

### Determinismo e pureza

Não se aplica a `packages/engine` — esta feature não toca o motor, não usa PRNG e não produz
estado de duelo. As garantias de determinismo aqui são de **processamento**: mesma entrada
(`receitasBruto` + estado do catálogo) produz sempre o mesmo `relatorio.receitasRejeitadas` e os
mesmos índices, ignorando apenas o campo não determinístico `geradoEm` — mesmo tratamento dado a
`ingestion-report.json` (F01) e `validation-report.json` (F02).

## 4. Contratos

### Tipos e schemas (`packages/data`)

- **`ReceitaFusaoSchema`** — união discriminada por `tipo`: `materiais` exige um tupla de dois
  `NumeroCartaSchema` (reaproveitado de `packages/shared`, F01) e um `resultado` do mesmo tipo;
  `classes` exige uma tupla de duas strings não-vazias e um `resultado`.
- **`TabelaFusoesArquivoSchema`** — `z.array(z.unknown())` no nível superior, usado só para
  confirmar a forma de array antes do parse elemento a elemento (passo 2 do fluxo).
- **`TabelaFusoes`** (tipo público exportado):

```ts
type TabelaFusoes = Readonly<{
  buscarPorParDeMateriais(
    materialA: NumeroCarta,
    materialB: NumeroCarta,
  ): ReceitaFusaoPorMateriais | undefined;
  buscarPorParDeClasses(
    classeA: string,
    classeB: string,
  ): ReceitaFusaoPorClasses | undefined;
  listarPorResultado(numero: NumeroCarta): readonly ReceitaFusao[];
  listarTodasReceitas(): readonly ReceitaFusao[];
  contagemReceitas(): Readonly<{ porMateriais: number; porClasses: number }>;
}>;
```

Códigos de erro/rejeição usados: `arquivo_fusoes_ausente`, `arquivo_fusoes_invalido` (erros de
carregamento, abortam); `schema_invalido`, `numero_material_inexistente`,
`numero_resultado_inexistente`, `classe_desconhecida`, `par_duplicado` (motivos de rejeição de
receita individual, nunca abortam).

### Funções públicas

```
// packages/data/src/fusoes — núcleo puro, sem I/O

canonicalizarPar(a: string, b: string): string
  // pós: canonicalizarPar(a, b) === canonicalizarPar(b, a); chave estável para indexação

validarReceitaFusao(
  receita: ReceitaFusao,
  indice: number,
  catalogo: CatalogoCartas,
): { ok: true } | { ok: false; rejeicao: ReceitaFusaoRejeitada }
  // materiais/resultado exigem catalogo.getByNumero(...) !== undefined
  // classes exigem que cada classe seja chave de catalogo.contagemPorClasse()

indexarFusoes(
  receitasValidas: readonly ReceitaFusao[],
): { indice: IndiceFusoes; conflitos: readonly ReceitaFusaoRejeitada[] }
  // pós: par (materiais ou classes) repetido entre receitas distintas com resultado
  //      diferente ⇒ nenhuma das colidentes entra no índice, ambas viram conflito reportado

criarTabelaFusoes(entrada: {
  receitasBruto: unknown;
  catalogo: CatalogoCartas;
  agora: () => string;
}): Result<{ tabela: TabelaFusoes; relatorio: RelatorioFusoes }, DomainError>
  // receitasBruto não é um array          ⇒ erro arquivo_fusoes_invalido (único caminho que aborta)
  // cada elemento é validado (schema + catálogo) e indexado; falhas e conflitos são excluídos
  // e reportados, nunca abortam as demais — tabela com 0 receitas é um resultado de sucesso
```

```
// packages/data/src/fusoes/carregar-tabela-fusoes-do-disco.ts — adaptador de I/O

carregarTabelaFusoesDoDisco(opcoes: {
  caminhoArquivo: string; // padrão packages/data/rules-data/fusoes.json
  catalogo: CatalogoCartas; // já carregado por F03
  dirRelatorio: string; // padrão packages/data/generated
}): Promise<Result<TabelaFusoes, DomainError>>
  // arquivo ausente/ilegível  ⇒ erro arquivo_fusoes_ausente, antes de chamar criarTabelaFusoes
  // JSON malformado ou array-nível-topo inválido ⇒ erro arquivo_fusoes_invalido
  // sucesso ⇒ escreve fusion-validation-report.json e devolve a TabelaFusoes
```

### Exemplos de artefato

`rules-data/fusoes.json` — **estado atual (seed pendente, Decisão 2)**:

```json
[]
```

`rules-data/fusoes.json` — **forma esperada quando os valores reais forem fornecidos** (exemplo
puramente ilustrativo da estrutura; `numero`, classes e resultado abaixo **não correspondem a
receitas reais do Forbidden Memories** — são placeholders de schema, não dado de jogo):

```json
[
  {
    "tipo": "materiais",
    "materiais": ["001", "002"],
    "resultado": "099"
  },
  {
    "tipo": "classes",
    "classes": ["Aqua", "Aqua"],
    "resultado": "150"
  }
]
```

`generated/fusion-validation-report.json` — exemplo com rejeições, mostrando a forma do
relatório:

```json
{
  "totalNoArquivo": 3,
  "receitasValidas": 1,
  "receitasRejeitadas": [
    {
      "indice": 1,
      "motivo": "numero_resultado_inexistente",
      "detalhe": "Receita 1: resultado '999' não existe no catálogo."
    },
    {
      "indice": 2,
      "motivo": "classe_desconhecida",
      "detalhe": "Receita 2: classe 'Robot' não existe no catálogo."
    }
  ],
  "geradoEm": "2026-07-27T12:10:00.000Z"
}
```

`generated/fusion-validation-report.json` — **estado atual esperado**, rodando contra o seed
vazio:

```json
{
  "totalNoArquivo": 0,
  "receitasValidas": 0,
  "receitasRejeitadas": [],
  "geradoEm": "2026-07-27T12:10:00.000Z"
}
```

### Exemplos de uso

```ts
const resultado = await carregarTabelaFusoesDoDisco({
  caminhoArquivo: "packages/data/rules-data/fusoes.json",
  catalogo,
  dirRelatorio: "packages/data/generated",
});
if (!resultado.ok) {
  throw new Error("Tabela de fusões indisponível.", { cause: resultado.error });
}
const tabelaFusoes = resultado.value;

tabelaFusoes.buscarPorParDeMateriais("001", "002");
// undefined enquanto a tabela estiver vazia (pendência de dado externo) —
// o Fusion System (cross-PRD, fora de escopo) trata isso como "sem fusão conhecida",
// nunca como erro

tabelaFusoes.contagemReceitas();
// { porMateriais: 0, porClasses: 0 } — estado esperado hoje, antes dos valores reais
```

### Contratos externos (cross-PRD)

`TabelaFusoes` é o contrato que esta feature **fornece** a consumidores cross-PRD ainda sem spec:

- **Fusion System** (`packages/rules`, a ser especificado): consumirá
  `buscarPorParDeMateriais`/`buscarPorParDeClasses` para tentar resolver uma fusão (nesta ordem
  ou na ordem que sua própria spec definir), tratando `undefined` de ambas como "sem fusão
  conhecida" — nunca como erro de sistema.
- **Motor de Duelo 1x1** (`packages/engine`): consumirá `listarPorResultado`/
  `listarTodasReceitas` indiretamente, através do Fusion System, para validar uma invocação por
  fusão declarada por um jogador.

Nenhuma dessas dependências é de entrada para F05 — é dependência de saída, mesmo padrão já usado
por F03 para Library/Build Deck/Motor.

## 5. Modelo de Dados

Esta feature não cria tabelas Postgres nem estruturas IndexedDB — não há estado por jogador. A
persistência de `dataset_versions` (`arquitetura.md` §5.1) pertence a F10.

### Arquivo de dados versionado (entrada, curada manualmente)

| Arquivo | Formato | Versionado em git | Consumidor |
|---|---|---|---|
| `packages/data/rules-data/fusoes.json` | Array JSON de `ReceitaFusao` | **sim** (Decisão 1) | `carregarTabelaFusoesDoDisco`, futuramente F09 |

Diferente de `packages/data/generated/` (saída de build, `.gitignore`d), `rules-data/` é entrada
de build **versionada**: o mantenedor edita este arquivo diretamente, e a mudança aparece como
diff revisável em Pull Request. Não há um "F01 de fusões" que deriva este arquivo de uma origem
bruta — o próprio arquivo **é** a origem, análogo a uma tabela de configuração de regra.

### Arquivo gerado (saída de processo)

| Arquivo | Formato | Determinístico | Consumidor |
|---|---|---|---|
| `packages/data/generated/fusion-validation-report.json` | Objeto JSON `RelatorioFusoes` | não (contém `geradoEm`) | mantenedor de dados |

A tarefa Turborepo `data:validate-fusions` declara `inputs: ["packages/data/rules-data/fusoes.json", "packages/data/generated/cards.json", "packages/data/generated/arts-manifest.json", "packages/data/generated/dataset-seal.json"]`
e `outputs: ["packages/data/generated/fusion-validation-report.json"]`, com
`dependsOn` no equivalente à tarefa de catálogo/validação já definida por F02/F03.

### Empacotamento futuro (F09, fora de escopo)

`TabelaFusoes.listarTodasReceitas()` é a forma que F09 (ainda não especificada) deve serializar
para incluir no bundle de distribuição junto do catálogo, das artes e das demais tabelas
auxiliares (F06–F08) — conforme PRD §9 Cross-Feature Integration. F05 não define o formato do
bundle nem o processo de empacotamento; apenas garante que a lista de receitas válidas está
disponível para quem for empacotar.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem/Retorno |
|---|---|---|---|
| `rules-data/fusoes.json` ausente ou ilegível | `carregarTabelaFusoesDoDisco`, antes de qualquer validação | **Aborta.** Nenhum relatório escrito | `Result` erro `arquivo_fusoes_ausente`: "Arquivo de fusões não encontrado ou ilegível em {caminho}." |
| Conteúdo lido não é JSON válido, ou o nível superior não é um array | `criarTabelaFusoes`, passo 2 | **Aborta.** Nenhum relatório escrito | `Result` erro `arquivo_fusoes_invalido`: "Arquivo de fusões malformado — esperado um array de receitas." |
| `CatalogoCartas` não fornecido ou indisponível | `carregarTabelaFusoesDoDisco` | **Aborta.** Dependência obrigatória | `Result` erro `catalogo_indisponivel_para_fusoes`: "Tabela de fusões requer um catálogo de cartas já carregado." |
| Elemento do array falha `ReceitaFusaoSchema` (tipo inválido, par de tamanho errado, `numero` fora do formato) | `criarTabelaFusoes`, passo 3 | **Não aborta.** Rejeitada com `schema_invalido`, citando o `indice` | `Receita {indice}: formato inválido.` |
| `numero` de material inexistente no catálogo | `validarReceitaFusao` | **Não aborta.** Rejeitada com `numero_material_inexistente` | `Receita {indice}: material '{numero}' não existe no catálogo.` |
| `numero` de resultado inexistente no catálogo | `validarReceitaFusao` | **Não aborta.** Rejeitada com `numero_resultado_inexistente` | `Receita {indice}: resultado '{numero}' não existe no catálogo.` |
| Classe referenciada não existe no catálogo | `validarReceitaFusao` | **Não aborta.** Rejeitada com `classe_desconhecida` | `Receita {indice}: classe '{valor}' não existe no catálogo.` |
| Duas receitas válidas compartilham o mesmo par canônico com resultado diferente | `indexarFusoes` | **Não aborta.** Ambas rejeitadas com `par_duplicado`, excluídas do índice | `Receitas {indiceA} e {indiceB}: par duplicado com resultados divergentes.` |
| Arquivo com array vazio (`[]`) | `criarTabelaFusoes` | **Sucesso.** Tabela com 0 receitas, nenhuma rejeição | Estado neutro esperado (Decisão 10) — não é erro |
| Consulta `buscarPorParDeMateriais`/`buscarPorParDeClasses` sem receita correspondente | `TabelaFusoes` | Retorna `undefined` explícito | Consumidor (Fusion System) trata como "sem fusão conhecida" |
| Falha ao escrever `fusion-validation-report.json` | `catch` no adaptador | Propaga com `cause` preservada (guidelines §8.3) | `Falha ao escrever relatório de fusões em {dirRelatorio}.` |

Todo descarte é **registrado**, nunca silencioso (guidelines §8.3, ADR-003). Os únicos caminhos
que abortam o carregamento inteiro são a ausência/ilegibilidade do arquivo, a ausência do
catálogo, e o arquivo não ser estruturalmente um array — tudo o mais é rejeição individual que
convive com uma tabela parcialmente ou totalmente vazia.

## 7. Estratégia de Testes

### Unitários (Vitest)

`canonicalizarPar`:
- `canonicalizarPar gera a mesma chave independente da ordem dos dois valores`
- `canonicalizarPar gera chaves diferentes para pares distintos`

`validarReceitaFusao` — table-driven (guidelines §11.2):
- `validarReceitaFusao aprova receita por materiais quando ambos os numeros existem no catalogo`
- `validarReceitaFusao rejeita receita por materiais quando um numero de material nao existe`
- `validarReceitaFusao rejeita receita quando o numero de resultado nao existe`
- `validarReceitaFusao aprova receita por classes quando ambas as classes existem no catalogo`
- `validarReceitaFusao rejeita receita por classes quando uma classe nao existe no catalogo`

`indexarFusoes`:
- `indexarFusoes constroi o indice por par de materiais com chave canonica`
- `indexarFusoes constroi o indice por par de classes com chave canonica`
- `indexarFusoes constroi o indice reverso por resultado agregando receitas dos dois tipos`
- `indexarFusoes reporta conflito quando duas receitas validas compartilham o mesmo par com resultados diferentes`
- `indexarFusoes exclui do indice as duas receitas conflitantes`

`criarTabelaFusoes`:
- `criarTabelaFusoes falha com arquivo_fusoes_invalido quando a entrada bruta nao e um array`
- `criarTabelaFusoes constroi tabela vazia quando a entrada e um array vazio`
- `criarTabelaFusoes exclui receita individual invalida sem abortar as demais`
- `criarTabelaFusoes reporta cada receita rejeitada com indice e motivo`
- `criarTabelaFusoes conta receitasValidas e totalNoArquivo corretamente`

`TabelaFusoes` (via fixture construída em memória):
- `buscarPorParDeMateriais encontra a receita independente da ordem dos materiais informados`
- `buscarPorParDeMateriais retorna undefined quando o par nao tem receita`
- `buscarPorParDeClasses encontra a receita independente da ordem das classes informadas`
- `listarPorResultado agrega receitas por materiais e por classes que produzem o mesmo numero`
- `listarTodasReceitas retorna apenas as receitas validas e indexadas`
- `contagemReceitas reflete o total por tipo apos exclusao de invalidas e conflitantes`

### Property-based (fast-check)

- **Comutatividade de busca por par:** para qualquer par de `numero`/classe válido indexado,
  `buscarPorParDeMateriais(A, B) === buscarPorParDeMateriais(B, A)`; idem para
  `buscarPorParDeClasses`. 1.000 execuções.
- **Nenhuma receita rejeitada aparece no índice:** para qualquer conjunto arbitrário de receitas
  com `numero`/classe válidos e inválidos misturados, toda receita presente em
  `listarTodasReceitas()` passa individualmente por `validarReceitaFusao` com `ok: true`.
- **Idempotência do relatório:** rodar `criarTabelaFusoes` duas vezes com a mesma entrada produz
  o mesmo conjunto de `receitasRejeitadas` (ignorando `geradoEm`).

### Integração

`packages/data/tests/fusoes.integration.test.ts`, rodando sobre o catálogo real (F01 ingestão +
F02 validação + F03 catálogo) e o seed atual de `rules-data/fusoes.json`:

- `tabela de fusoes real carrega o seed vazio sem erro e sem nenhuma receita indexada` —
  **teste do caminho neutro** exigido enquanto a pendência de dado não é resolvida
- `tabela de fusoes real retorna undefined em buscarPorParDeMateriais quando a tabela esta vazia`
  — caminho neutro
- `tabela de fusoes real retorna undefined em buscarPorParDeClasses quando a tabela esta vazia` —
  caminho neutro
- `tabela de fusoes real rejeita receita sintetica com numero de material inexistente no catalogo real`
- `tabela de fusoes real rejeita receita sintetica com classe inexistente no catalogo real`
- `tabela de fusoes real aprova e indexa receita sintetica cujo numero e classe existem no catalogo real`
- `tabela de fusoes real escreve fusion-validation-report.json com as rejeicoes esperadas`

### Análise estática

- `packages/data/src/fusoes/{tipos,schema,canonicalizar-par,validar-receita-fusao,indexar-fusoes,criar-tabela-fusoes}.ts`
  não importam `node:fs`, `node:path` nem `fetch` — só `carregar-tabela-fusoes-do-disco.ts` tem
  I/O, mesmo padrão de F01/F02/F03.
- `packages/data` continua importando apenas `packages/shared`.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F05) | Teste |
|---|---|
| Schema da receita e loader definidos; tabela carrega e indexa por par de materiais e por resultado | `criarTabelaFusoes constroi tabela vazia quando a entrada e um array vazio` + `indexarFusoes constroi o indice por par de materiais...` + `indexarFusoes constroi o indice reverso por resultado...` |
| Toda receita com `numero` (material ou resultado) inexistente no catálogo é rejeitada na validação | `validarReceitaFusao rejeita receita por materiais quando um numero de material nao existe` + `validarReceitaFusao rejeita receita quando o numero de resultado nao existe` + `tabela de fusoes real rejeita receita sintetica com numero de material inexistente no catalogo real` |
| **(Pendente)** As fusões correspondem às do jogo original — bloqueado até os valores serem fornecidos | Não testável hoje sem inventar dado. Substituído pelo teste do caminho neutro: `tabela de fusoes real retorna undefined em buscarPorParDeMateriais quando a tabela esta vazia` — comportamento correto enquanto a pendência não é resolvida |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: o pacote de F09 contém exatamente o catálogo de F03, as artes de F04 e as tabelas de F05–F08, e F10 versiona esse pacote como uma unidade | Contrato: `listarTodasReceitas()` é a forma que F09 (spec futura) vai serializar para o bundle — verificado quando F09 for especificada, mesmo padrão já usado pela spec de F03 para seus consumidores cross-PRD |
| Cross-PRD (Pendente): Fusion System consome a tabela de F05 sem codificar as regras localmente | Contrato declarado nesta spec (`buscarPorParDeMateriais`, `buscarPorParDeClasses`, `listarPorResultado`); bloqueado até Fusion System ter spec própria e os valores de fusão chegarem. Verificável hoje via `tabela de fusoes real retorna undefined em buscarPorParDeMateriais quando a tabela esta vazia`, que garante que um consumidor futuro pode tratar a ausência sem erro |
