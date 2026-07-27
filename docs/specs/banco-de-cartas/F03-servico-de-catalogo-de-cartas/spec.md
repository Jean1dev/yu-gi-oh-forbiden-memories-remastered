# Serviço de Catálogo de Cartas

> PRD: `docs/prds/banco-de-cartas.md` — F03
> Pacote-alvo: `packages/data`

## 1. Contexto e Escopo

Esta feature é a **fundação de runtime** do módulo (PRD §8, Parte 2): a camada de acesso que todo
consumidor — interno (F04–F09) e cross-PRD (Library, Build Deck, Motor de Duelo 1x1, Password) —
usa para obter cartas. Onde F01 produz o dataset e F02 dá o veredito sobre ele, F03 é quem
efetivamente **carrega e serve** esse dataset em memória: monta índices sobre o `cards.json`
selado por F02, recusa subir se o selo não for válido, e responde consultas por identidade
(`numero`) e por critério (`tipo`, `classe`, `guardiao`, `password`) com latência de acesso em
memória. Nenhum consumidor cross-PRD lê `cards-data/` ou `packages/data/generated/` diretamente —
todos passam por este serviço.

O catálogo mestre é **somente-leitura em runtime**: quem muda é o estado de coleção do jogador
(cross-PRD, fora deste módulo). F03 corrige a divergência "821 vs 722" apontada no PRD §2 ao expor
722 como a única contagem canônica derivada do dataset selado.

### Incluído

- Construção dos índices em memória (primário por `numero`, secundários por `tipo`, `classe`,
  `guardiao1`/`guardiao2` e `password`) a partir do dataset já selado por F02 (PRD F03 Capabilities)
- Recusa de subir o serviço quando o selo não indica `valido: true`
- API de consulta: `getByNumero`, `listByTipo`, `listByClasse`, `listByGuardiao`, `findByPassword`
- Contagem canônica total e contagens por `tipo`/`classe`, pré-computadas na construção
- Imutabilidade estrutural do catálogo (nenhuma escrita possível em runtime)
- Um adaptador concreto de carregamento a partir do disco (`packages/data/generated/*.json`),
  reaproveitando o mesmo padrão de I/O fino de F01/F02, para uso imediato em Node.js (testes,
  scripts, `apps/server`)
- Acesso ao manifesto de artes através do catálogo (carregado junto no mesmo momento de I/O), para
  que F04 não precise repetir a leitura de disco — ver Decisão 5

### Fronteiras

- **Leitura, normalização e veredito do dataset** → **F01/F02**. F03 não valida nada — apenas
  confia no selo e recusa servir se ele não for válido. — PRD §6 F01, F02
- **Resolução de arte com fallback de placeholder** → **F04**. F03 apenas expõe o manifesto tal
  como F01 o produziu (mapa `numero → caminho`, só com artes existentes); a decisão de fallback
  para placeholder ausente é inteiramente de F04. — PRD §6 F04
- **Empacotamento para distribuição offline/online e o carregamento no navegador via bundle** →
  **F09**. F03 define o contrato de carregamento a partir de arquivos em disco (Node.js); *como*
  os bytes chegam ao navegador (fetch de um bundle versionado, cache do service worker) é decisão
  de F09/`apps/web`, ainda não especificada. F03 não bloqueia nisso — ver Decisão 2.
- **Estado de coleção do jogador** → Save/Build Deck/Campanha (cross-PRD). O catálogo mestre nunca
  reflete o que o jogador possui. — PRD §7

### Contratos externos assumidos

Nenhum contrato cross-PRD é consumido por F03 — é fornecedor. Internamente, depende de F01
(dataset) e F02 (selo), ambos já especificados. **Cross-PRD, F03 é dependência de saída**:
Library, Build Deck, Motor de Duelo 1x1 e Password (todos já com specs próprias que assumem esta
API como contrato externo) vão importar `packages/data` diretamente.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **Estilo de API: factory de funções puras, imutável.** `criarCatalogo(entrada)` devolve um objeto `Object.freeze`d cujos métodos fecham sobre os índices construídos uma vez — sem classe, sem estado de módulo mutável. Cada chamada de `criarCatalogo` é independente (útil em testes paralelos e, no futuro, em cenários com múltiplos datasets/versões). | entrevista (confirmado pelo usuário); guidelines §10.1 ("avoid classes for one implementation"), §19.4 ("avoid module-level mutable state") | confirmada |
| 2 | **F03 inclui um loader Node concreto** (`carregarCatalogoDoDisco`), lendo `packages/data/generated/{cards,arts-manifest,dataset-seal}.json` — mesmo padrão de adaptador fino de F01/F02, testável hoje. O carregamento no navegador (via bundle empacotado) fica **explicitamente fora desta feature**, dependência futura de F09/`apps/web`. `criarCatalogo` (núcleo puro) não depende de onde os bytes vieram, então o loader do navegador — quando existir — só precisa produzir as mesmas três estruturas em memória e chamá-lo. | entrevista (confirmado pelo usuário) | confirmada |
| 3 | **`criarCatalogo` é tudo-ou-nada, diferente de F02.** F02 tolera e acumula violações carta a carta; F03 não é um validador — se o selo diz válido mas uma carta individual falha o reparse contra `CartaSchema` (inconsistência tardia: arquivo mudou depois do selo, ou corrupção), o catálogo inteiro **recusa subir** com `DomainError` `dataset_incoerente_com_selo`, em vez de servir um subconjunto silenciosamente incompleto. Isso é coerente com "o serviço não sobe" do PRD F03 Error Handling. | PRD §6 F03 Error Handling; ADR-003 (fail-safe) | confirmada |
| 4 | **`getByNumero` retorna `Carta \| undefined`** (não `Result`), seguindo o padrão de lookup de guidelines §17.2 (`findCard`). `findByPassword` retorna um **resultado discriminado** (`ResultadoBuscaPorSenha`) porque o PRD distingue explicitamente dois casos de "não encontrada" — formato inválido (nunca varre o índice) vs. senha bem formada mas desconhecida — e um simples `undefined` não expressaria essa distinção para o consumidor (Password, cross-PRD) tratar cada caso com mensagem própria. | PRD §6 F03 Error Handling ("retorna vazio e sinaliza formato inválido"); guidelines §17.2, §7.2 | confirmada |
| 5 | **F03 carrega e expõe o manifesto de artes**, não só o dataset e o selo. O PRD tem uma inconsistência textual: a Seção 6 F01 Provides diz que o manifesto é "usado por F03, F04", mas a Seção 6 F03 Consumes só lista o dataset e o selo. Resolvido a favor do texto de F01: como o loader de F03 já lê os três artefatos gerados de uma vez no startup, expor o manifesto (`obterManifestoArtes()`, mapa somente-leitura `numero → caminho`, sem lógica de fallback) evita que F04 precise repetir a leitura de disco. A decisão de placeholder continua 100% de F04 — F03 só guarda e devolve o mapa. | F01 spec Provides ("usado por F03, F04"); PRD §6 F03 Consumes (lista incompleta); resolução de inconsistência interna do PRD | confirmada — reconcilia contradição interna do PRD |
| 6 | **Imutabilidade é estrutural, não só documentada.** Cada `Carta` já é `Readonly<Carta>` em tipo (F01); `criarCatalogo` adicionalmente `Object.freeze`s cada carta e cada array/Map exposto. Uma tentativa de mutação lança `TypeError` em runtime (Node ESM roda em modo estrito por padrão), satisfazendo "tentativa de escrita... rejeitada" do PRD como garantia de tempo de execução, não só como regra de código. | PRD §6 F03 Error Handling; guidelines §6.3 (`Readonly<T>`) | confirmada |
| 7 | Listas retornadas por `listByTipo`/`listByClasse`/`listByGuardiao` seguem a ordem de `numero` crescente — a mesma ordem determinística em que F01 emite o dataset — nunca ordem de inserção do índice. Consistente com o requisito de determinismo/paridade do PRD §3 ("mesma pergunta, mesma resposta"). | PRD §3 (determinismo e paridade); `arquitetura.md` §4.1 (dataset ordenado) | confirmada |
| 8 | Contagens por `tipo` e por `classe` são **pré-computadas na construção** (um único passe sobre as 722 cartas), não recalculadas a cada chamada — motivo de desempenho direto, já que o limite de 50ms do PRD vale para qualquer consulta repetida durante a sessão. | PRD §4 (métrica de latência ≤50ms) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/src/catalogo/tipos.ts` | data | novo | `CatalogoCartas`, `ResultadoBuscaPorSenha`, `IndicesCatalogo` |
| `packages/data/src/catalogo/indices.ts` | data | novo | `construirIndices`: monta os 5 índices a partir das cartas já reparseadas |
| `packages/data/src/catalogo/criar-catalogo.ts` | data | novo | `criarCatalogo`: núcleo puro — checa selo, reparse tudo-ou-nada, monta índices e contagens, congela e devolve `CatalogoCartas` |
| `packages/data/src/catalogo/carregar-catalogo-do-disco.ts` | data | novo | `carregarCatalogoDoDisco`: adaptador de I/O — lê os 3 artefatos gerados e chama `criarCatalogo` |
| `packages/data/src/catalogo/index.ts` | data | novo | Export público do subsistema de catálogo |
| `packages/data/src/catalogo/tipos.test.ts` | data | novo | Guard de tipo de `ResultadoBuscaPorSenha` (discriminação exaustiva) |
| `packages/data/src/catalogo/indices.test.ts` | data | novo | Unitários de construção dos 5 índices |
| `packages/data/src/catalogo/criar-catalogo.test.ts` | data | novo | Unitários de `criarCatalogo`: selo inválido, reparse tudo-ou-nada, imutabilidade |
| `packages/data/tests/fixtures/catalogo/` | data | novo | Datasets sintéticos pequenos: válido, selo inválido, carta com schema quebrado apesar de selo válido |
| `packages/data/tests/catalogo.integration.test.ts` | data | novo | Integração contra a saída real de F01+F02: consultas, contagens e latência |
| `turbo.json` | raiz | alterado | Nenhuma nova tarefa de build — F03 é biblioteca de runtime consumida por `web`/`server`, não uma etapa de geração de artefato. Anotado aqui só para registrar que **não há alteração** de grafo de tarefas nesta feature. |

**Verificação da direção de dependências:** `packages/data` continua importando **apenas**
`packages/shared` (reaproveita `Carta`, `CartaSchema`, `NumeroCarta`, `TipoCarta`,
`GuardiaoEstelar`, `ManifestoArtes`, `SeloDataset` já definidos por F01/F02). Nenhum import novo de
`rules`, `engine`, `ai`, `web` ou `server` — `shared ← data` de `arquitetura.md` §2 preservado.

Esta feature **não toca `packages/engine`**. A fronteira de I/O segue o padrão de F01/F02:

- `packages/data/src/catalogo/tipos.ts`, `indices.ts` e `criar-catalogo.ts` **não** importam
  `node:fs`, `node:path` nem `fetch` — recebem o conteúdo bruto já lido (via `JSON.parse` externo
  ou passado por quem chama) e devolvem estruturas em memória.
- `packages/data/src/catalogo/carregar-catalogo-do-disco.ts` é o único ponto com `node:fs`/
  `node:path` deste subsistema.

## 3. Design Técnico

### Estruturas de dados

**`IndicesCatalogo`** (interno, não exportado do pacote):

| Campo | Tipo | Semântica |
|---|---|---|
| `porNumero` | `ReadonlyMap<NumeroCarta, Carta>` | Índice primário — O(1) |
| `porTipo` | `ReadonlyMap<TipoCarta, readonly Carta[]>` | Uma entrada por um dos 5 tipos, arrays ordenados por `numero` |
| `porClasse` | `ReadonlyMap<string, readonly Carta[]>` | Uma entrada por classe observada no dataset (dinâmico, `classe` não é enum fechado — F01 Decisão 8) |
| `porGuardiao` | `ReadonlyMap<GuardiaoEstelar, readonly Carta[]>` | Uma carta aparece em até duas entradas (`guardiao1` e `guardiao2`) |
| `porPassword` | `ReadonlyMap<string, Carta>` | Só cartas com `password` não-nulo |

**`CatalogoCartas`** (público, `Readonly<{...}>`, congelado por `criarCatalogo`):

```ts
type CatalogoCartas = Readonly<{
  getByNumero(numero: NumeroCarta): Carta | undefined;
  listByTipo(tipo: TipoCarta): readonly Carta[];
  listByClasse(classe: string): readonly Carta[];
  listByGuardiao(guardiao: GuardiaoEstelar): readonly Carta[];
  findByPassword(password: string): ResultadoBuscaPorSenha;
  contagemTotal(): number;
  contagemPorTipo(): Readonly<Record<TipoCarta, number>>;
  contagemPorClasse(): Readonly<Record<string, number>>;
  obterManifestoArtes(): ManifestoArtes;
}>;
```

**`ResultadoBuscaPorSenha`** — união discriminada (Decisão 4):

```ts
type ResultadoBuscaPorSenha =
  | { encontrada: true; carta: Carta }
  | { encontrada: false; motivo: "nao_encontrada" }
  | { encontrada: false; motivo: "formato_invalido" };
```

### Fluxo

1. **Checar o selo.** `criarCatalogo` recebe `{ cartasBruto, manifesto, selo }`. Se
   `selo.valido !== true`, devolve `Result` de erro com `DomainError` código
   `catalogo_indisponivel` imediatamente — nenhum índice é construído.
2. **Reparsear tudo-ou-nada.** Cada elemento de `cartasBruto` passa por `CartaSchema.safeParse`.
   Qualquer falha (mesmo com selo válido — Decisão 3) aborta com `DomainError`
   `dataset_incoerente_com_selo`, citando os `numero`s que falharam. Diferente de F02, não há
   caminho parcial: ou todas as cartas parseiam, ou o catálogo não sobe.
3. **Construir os índices.** `construirIndices` percorre as cartas parseadas uma vez, populando os
   5 mapas da tabela de estruturas. `porTipo`/`porClasse`/`porGuardiao` preservam a ordem de
   `numero` crescente (Decisão 7) porque o array de entrada já vem ordenado por F01.
4. **Pré-computar as contagens.** No mesmo passe, acumula `contagemTotal`, `contagemPorTipo` e
   `contagemPorClasse` (Decisão 8).
5. **Congelar tudo.** Cada `Carta`, cada array de cada índice e o objeto `CatalogoCartas` final
   passam por `Object.freeze` (Decisão 6).
6. **Compor o objeto público.** As funções de consulta fecham sobre os índices e as contagens já
   prontos — nenhuma delas recalcula nada.
7. **Devolver `Result` de sucesso** com o `CatalogoCartas` congelado.

Consultas individuais, todas O(1) ou O(k) sobre um índice já pronto:

- `getByNumero(numero)` — `porNumero.get(numero)`, `undefined` se ausente.
- `listByTipo(tipo)` / `listByClasse(classe)` / `listByGuardiao(guardiao)` — retornam o array já
  congelado do índice correspondente, ou `[]` se a chave não existir (nunca `undefined` — listar é
  sempre uma coleção, mesmo vazia).
- `findByPassword(password)` — primeiro valida o formato (`^\d{2} \d{2} \d{2} \d{2}$`); formato
  inválido devolve `{ encontrada: false, motivo: "formato_invalido" }` **sem consultar
  `porPassword`** (PRD: "sem varredura desnecessária"). Formato válido consulta o índice; ausente
  devolve `{ encontrada: false, motivo: "nao_encontrada" }`; presente devolve
  `{ encontrada: true, carta }`.
- `obterManifestoArtes()` — devolve o `ManifestoArtes` recebido na construção, já congelado
  (Decisão 5).

### Determinismo e pureza

Não se aplica a `packages/engine`. `criarCatalogo` e `construirIndices` são puras (mesma entrada
→ mesmos índices); o "carregamento uma vez, imutável durante a sessão" do PRD é satisfeito porque
nada no núcleo depende de estado de módulo — cada `CatalogoCartas` é uma instância isolada fechada
sobre seus próprios índices congelados.

## 4. Contratos

### Tipos (`packages/data`, reaproveitando `packages/shared` de F01/F02)

Reaproveita sem alteração: `Carta`, `CartaSchema`, `NumeroCarta`, `TipoCarta`, `GuardiaoEstelar`,
`ManifestoArtes`, `SeloDataset`, `SeloDatasetSchema`, `DomainError`, `Result`.

Novos nesta feature (`packages/data`, não precisam viver em `shared` — nenhum pacote acima de
`data` na direção de dependências consome estes tipos sem já depender de `data`):

- **`CatalogoCartas`** e **`ResultadoBuscaPorSenha`** — ver Seção 3.
- Códigos de erro usados: `catalogo_indisponivel`, `dataset_incoerente_com_selo`.

### Funções públicas

```
// packages/data/src/catalogo — núcleo puro, sem I/O

construirIndices(cartas: readonly Carta[]): IndicesCatalogo

criarCatalogo(entrada: {
  cartasBruto: unknown;
  manifesto: ManifestoArtes;
  selo: SeloDataset;
}): Result<CatalogoCartas, DomainError>
  // selo.valido !== true            ⇒ erro catalogo_indisponivel
  // qualquer carta falha CartaSchema ⇒ erro dataset_incoerente_com_selo (tudo-ou-nada)
  // sucesso                          ⇒ CatalogoCartas congelado
```

```
// packages/data/src/catalogo/carregar-catalogo-do-disco.ts — adaptador de I/O

carregarCatalogoDoDisco(opcoes: {
  dirGerado: string; // padrão packages/data/generated
}): Promise<Result<CatalogoCartas, DomainError>>
  // lê cards.json, arts-manifest.json e dataset-seal.json de dirGerado
  // arquivo ausente/ilegível ⇒ erro artefato_ausente antes de chamar criarCatalogo
```

### Exemplos de uso

```ts
const resultado = await carregarCatalogoDoDisco({ dirGerado: "packages/data/generated" });
if (!resultado.ok) {
  throw new Error(`Catálogo indisponível: dataset inválido ou ausente.`, { cause: resultado.error });
}
const catalogo = resultado.value;

catalogo.getByNumero("001");
// { id: 1, numero: "001", nome: "Blue-eyes White Dragon", classe: "Dragon", atk: 3000, ... }

catalogo.getByNumero("999");
// undefined

catalogo.findByPassword("89 63 11 39");
// { encontrada: true, carta: { numero: "001", ... } }

catalogo.findByPassword("senha-invalida");
// { encontrada: false, motivo: "formato_invalido" }

catalogo.contagemTotal();
// 722
```

### Contratos externos (cross-PRD)

`CatalogoCartas` é o contrato **fornecido** aos módulos cross-PRD já especificados que o assumem
como dependência externa: Library (`docs/specs/library/F01-.../`), Build Deck
(`docs/specs/build-deck/F01-.../`) e Motor de Duelo 1x1. Nenhum deles é alterado por esta spec —
apenas confirma-se aqui que a API entregue casa com o formato assumido nessas specs (`Carta` no
schema canônico de F01).

## 5. Modelo de Dados

Esta feature não cria tabelas Postgres nem estruturas IndexedDB — não há estado por jogador. F03
**lê** (nunca escreve) os artefatos que F01 e F02 já produzem:

| Artefato | Origem | Uso em F03 |
|---|---|---|
| `packages/data/generated/cards.json` | F01 | Reparseado tudo-ou-nada para montar `porNumero`/demais índices |
| `packages/data/generated/arts-manifest.json` | F01 | Carregado e exposto via `obterManifestoArtes()`, sem alteração (Decisão 5) |
| `packages/data/generated/dataset-seal.json` | F02 | Checado antes de qualquer outra etapa — `valido !== true` aborta o carregamento |

Nenhum artefato novo é gerado por F03. As estruturas em memória (`IndicesCatalogo`) vivem apenas
durante a sessão do processo (browser ou servidor) e são recriadas a cada `carregarCatalogoDoDisco`
— não há cache persistente nesta feature (o cache do bundle offline é F09).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem/Retorno |
|---|---|---|---|
| `selo.valido !== true` | `criarCatalogo`, primeira checagem | Serviço não sobe, nenhum índice construído | `Result` erro `catalogo_indisponivel`: "Catálogo indisponível: dataset inválido ou ausente." |
| Carta individual falha `CartaSchema` apesar de selo válido | `criarCatalogo`, reparse tudo-ou-nada | Serviço não sobe (Decisão 3) | `Result` erro `dataset_incoerente_com_selo`, `details` com os `numero`s culpados |
| `cards.json`, `arts-manifest.json` ou `dataset-seal.json` ausente/ilegível no disco | `carregarCatalogoDoDisco` | Não chama `criarCatalogo`; falha antes | `Result` erro `artefato_ausente`: "Artefato de catálogo não encontrado ou ilegível em {caminho}." |
| `getByNumero` com `numero` inexistente | `porNumero.get` | `undefined` explícito — nunca objeto vazio | `undefined` |
| `listByTipo`/`listByClasse`/`listByGuardiao` com chave sem cartas | Índice sem entrada | Array vazio, nunca `undefined` | `[]` |
| `findByPassword` com formato inválido | Checagem de regex antes do índice | Nenhuma varredura do índice | `{ encontrada: false, motivo: "formato_invalido" }` |
| `findByPassword` com formato válido mas senha desconhecida | `porPassword.get` | — | `{ encontrada: false, motivo: "nao_encontrada" }` |
| Tentativa de mutar uma `Carta`, um array de índice ou o objeto `CatalogoCartas` | Runtime (modo estrito, `Object.freeze`) | Lança `TypeError` — rejeição estrutural (Decisão 6) | Erro nativo do motor JS, não uma mensagem de domínio |

Nenhum erro é silencioso: falhas de carregamento e de consistência tardia sempre produzem um
`Result` de erro explícito com `code` e `details` (guidelines §8.1, §8.3).

## 7. Estratégia de Testes

### Unitários (Vitest)

`construirIndices`:
- `construirIndices monta o indice primario por numero para todas as cartas`
- `construirIndices agrupa cartas por tipo preservando ordem de numero crescente`
- `construirIndices agrupa cartas por classe dinamicamente sem lista fixa`
- `construirIndices lista uma carta em ambos guardiao1 e guardiao2 quando distintos`
- `construirIndices indexa apenas cartas com password nao nulo`

`criarCatalogo`:
- `criarCatalogo recusa selo invalido sem construir indices`
- `criarCatalogo recusa carta que falha CartaSchema mesmo com selo valido`
- `criarCatalogo devolve catalogo funcional quando selo valido e todas as cartas parseiam`
- `criarCatalogo congela cada carta e cada array de indice retornado`
- `criarCatalogo expoe o manifesto de artes recebido sem alteracao`

`CatalogoCartas` (via instância construída em fixture):
- `getByNumero retorna a carta correspondente`
- `getByNumero retorna undefined para numero inexistente`
- `listByTipo retorna lista vazia para tipo sem cartas no fixture`
- `findByPassword rejeita formato invalido sem consultar o indice`
- `findByPassword retorna nao_encontrada para senha bem formada mas ausente`
- `findByPassword retorna a carta para senha valida e presente`
- `contagemTotal reflete o total de cartas do fixture`
- `tentativa de escrita em uma carta retornada lanca TypeError`

### Property-based (fast-check)

- **Cobertura total do índice primário:** para todo `numero` presente no dataset de entrada,
  `getByNumero` devolve exatamente a carta correspondente — nunca `undefined`, nunca outra carta.
- **Consistência de índice secundário:** para toda carta do dataset, ela aparece em
  `listByTipo(carta.tipo)` e, quando aplicável, em `listByGuardiao(carta.guardiao1)` e
  `listByGuardiao(carta.guardiao2)`.
- **Ordem determinística:** para qualquer permutação da ordem de entrada das cartas (mesmo
  conjunto, ordem diferente), `listByTipo`/`listByClasse`/`listByGuardiao` devolvem sempre a mesma
  ordem de saída (por `numero` crescente).

### Integração

`packages/data/tests/catalogo.integration.test.ts`, rodando após F01 (ingestão real) e F02
(validação real):
- `catalogo real carrega o dataset selado e responde getByNumero em ate 1ms`
- `catalogo real responde listByTipo listByClasse e listByGuardiao em ate 50ms sobre 722 cartas`
- `catalogo real carrega completo em ate 500ms`
- `catalogo real expoe contagem total 722, nunca 821`
- `catalogo real recusa carregar quando dataset-seal.json indica valido false`
- `catalogo real recusa carregar quando dataset-seal.json esta ausente`

### Análise estática

- `packages/data/src/catalogo/{tipos,indices,criar-catalogo}.ts` não importam `node:fs`,
  `node:path` nem `fetch` — só `carregar-catalogo-do-disco.ts` tem I/O.
- `packages/data` continua importando apenas `packages/shared`.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F03) | Teste |
|---|---|
| Só carrega dataset selado como válido; dataset inválido/ausente impede o serviço de subir | `criarCatalogo recusa selo invalido sem construir indices` + `catalogo real recusa carregar quando dataset-seal.json indica valido false` |
| `getByNumero` em ≤1ms; `numero` inexistente retorna "não encontrado" explícito | `catalogo real carrega o dataset selado e responde getByNumero em ate 1ms` + `getByNumero retorna undefined para numero inexistente` |
| `listByTipo`, `listByClasse`, `listByGuardiao`, `findByPassword` corretos em ≤50ms | `catalogo real responde listByTipo listByClasse e listByGuardiao em ate 50ms sobre 722 cartas` + `findByPassword retorna a carta para senha valida e presente` |
| Carrega completo em ≤500ms; permanece imutável; tentativa de escrita é rejeitada | `catalogo real carrega completo em ate 500ms` + `tentativa de escrita em uma carta retornada lanca TypeError` |
| Contagem canônica exposta é 722, fonte única para consumidores cross-PRD | `catalogo real expoe contagem total 722, nunca 821` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: o dataset produzido por F01 e selado por F02 é o único servido por F03 — nenhuma outra fonte de carta existe no módulo | Análise estática: nenhum arquivo fora de `packages/data/src/catalogo` e `.../ingestao`/`.../validacao` referencia `cards-data/` ou lê arquivos de `generated/` diretamente |
| Cross-Feature: contagem canônica de F03 (722) consistente em todos os índices e consultas, sem reaparecer 821 | `catalogo real expoe contagem total 722, nunca 821` |
| Cross-PRD: Library exibe a mesma contagem canônica (722) no indicador de progresso | Contrato: `contagemTotal()` é a fonte que a spec de Library já assume — nenhuma alteração necessária nesta feature, só confirmação de compatibilidade |
| Cross-PRD: Build Deck valida cada carta do deck contra o catálogo; `numero` desconhecido é recusado | Contrato: `getByNumero` retornando `undefined` é o sinal que Build Deck usa para recusar — verificado quando Build Deck consumir esta API |
| Cross-PRD: Password localiza cartas por `findByPassword`; senha inválida/desconhecida não libera nenhuma carta | `findByPassword rejeita formato invalido sem consultar o indice` + `findByPassword retorna nao_encontrada para senha bem formada mas ausente` |
