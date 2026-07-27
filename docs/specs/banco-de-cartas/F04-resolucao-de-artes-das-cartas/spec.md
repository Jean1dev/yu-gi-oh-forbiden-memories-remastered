# Resolução de Artes das Cartas

> PRD: `docs/prds/banco-de-cartas.md` — F04
> Pacote-alvo: `packages/data`

## 1. Contexto e Escopo

Esta feature é a primeira da Wave 4 (PRD §8, Parte 3), logo após a fundação de runtime entregue
por F03. Enquanto F05–F08 hospedam tabelas de regra cujos **valores** ainda não existem no
repositório, F04 resolve um dado que já existe **integralmente hoje**: as 722 artes reais em
`cards-data/*.jpg`, já mapeadas 1:1 pelo manifesto que F01 produziu e que F03 expõe em memória via
`obterManifestoArtes()` (F03 Decisão 5). F04 é a última peça de resolução de dado antes de F09
empacotar catálogo, artes e tabelas auxiliares num único bundle versionado
(`arquitetura.md` §4, §9 Fase 0).

O papel de F04 é estritamente de **resolução**: dado um `numero` (ou a própria `Carta`), decide se
a arte real existe no manifesto e, se não existir, aplica o placeholder padrão único cujo caminho
F02 já registrou como contrato antecipado em `packages/shared`
(`CAMINHO_PLACEHOLDER_ARTE_PADRAO`, F02 Decisão 5) — sem jamais expor o consumidor ao caso de
imagem ausente. Como o manifesto já contém apenas artes que existem (F01 só inclui entradas
confirmadas) e a existência do próprio arquivo de placeholder já é auditada no build por F02
(`checarCoberturaDeArte`), o núcleo de F04 **não precisa de nenhum acesso a disco**: é uma função
pura sobre estruturas já carregadas em memória por F03 — o único subsistema do módulo, entre
F01–F04, que não introduz um adaptador de I/O próprio.

Nos dados reais verificados por F01 (722 cartas ↔ 722 artes, 0 ausências), o caminho de fallback
nunca dispara na prática hoje — mas o desenho cobre esse caminho da mesma forma, porque a garantia
"nenhuma tela quebre" (PRD F04 Experience) precisa valer também quando o dataset mudar no futuro.

### Incluído

- Convenção de resolução por `numero` (arquivo cujo nome é o `numero` de 3 dígitos) — reaproveitada
  do manifesto já montado por F01/exposto por F03; **nunca reconstruída por concatenação aqui**
  (PRD F04 Capabilities)
- Resolução da arte de uma carta a partir da própria `Carta` **ou** do seu `numero` isolado, como
  a Experience do PRD descreve ("passando a carta (ou seu numero)")
- Fallback transparente para o placeholder padrão quando a carta não está no manifesto — o
  consumidor recebe uma referência de imagem pronta para uso em qualquer um dos dois casos, sem
  precisar ramificar sobre "existe ou não existe"
- Uma fábrica de resolvedor (`criarResolvedorArtes` / `criarResolvedorArtesDoCatalogo`) que os
  consumidores (F09 e, cross-PRD, Library, Build Deck, Motor de Duelo 1x1) usam sem reimplementar
  a lógica de fallback

### Adiado

Nenhum item. O PRD não tem blocos `Core Scope`/`Full Scope additions` para F04 — toda a
Capabilities/Experience descrita é tratada como escopo único, sem divisão (Decisão 1).

### Fronteiras

- **Montagem do manifesto `numero → caminho` a partir do disco** → **F01**. F04 nunca varre
  `cards-data/`; consome o manifesto já pronto, exposto por F03. — PRD §6 F01
- **Verificação de que o arquivo de placeholder existe de fato no disco, e bloqueio do dataset se
  não existir** → **F02**. F04 não reverifica isso em runtime; confia que um dataset selado como
  válido já teve essa cobertura auditada no build. — PRD §6 F02; F02 Decisão 5
- **Carregamento do manifesto em memória e imutabilidade do catálogo** → **F03**. F04 só consome
  `obterManifestoArtes()`; não recarrega nada do disco. — PRD §6 F03; F03 Decisão 5
- **Redimensionamento, decodificação assíncrona, carregamento preguiçoso e escolha de asset visual
  de placeholder/silhueta na tela** → responsabilidade de cada módulo consumidor (ex.: Library).
  F04 "não redimensiona nem processa a imagem — apenas resolve a referência". — PRD §6 F04
  Capabilities
- **Empacotamento em bundle versionado, `version` e `hash`** → **F09/F10**. F04 não gera nenhum
  artefato de dado novo; o que F09 empacota é o próprio módulo de código desta feature junto do
  `arts-manifest.json` de F01. — PRD §6 F09, F10
- **Design final do arquivo de imagem do placeholder** → pendência de asset gráfico (ver Decisões
  e Premissas, item 2), fora do escopo de código desta feature

### Contratos externos assumidos

Nenhum contrato cross-PRD é **consumido** por F04 — sua única dependência interna é F03, já
especificada (`docs/specs/banco-de-cartas/F03-servico-de-catalogo-de-cartas/`). F04 é
**fornecedora** para F09 (interno) e, cross-PRD, para Library, Build Deck e Motor de Duelo 1x1
(PRD §6 F04 Provides).

Um caso particular merece registro: `docs/specs/library/F01-acesso-a-colecao-do-jogador/spec.md`
já foi gerada **antes** desta feature existir e, por isso, especificou sua própria interface
provisória `ResolucaoArte` (em `packages/shared/src/library/catalogo.ts`) com a assinatura
`resolver(numero): { tipo: 'arte'; caminho: string } | { tipo: 'placeholder' }`, marcada como "a
ser fornecida por `banco-de-cartas`/F04". O contrato real definido aqui (Seção 4) é
estruturalmente compatível com essa suposição — ver Decisão 5.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **Escopo completo, sem divisão Core/Full.** O PRD não tem blocos `Core Scope`/`Full Scope additions` para F04 — toda a Capabilities e Experience descritas entram nesta spec de uma vez. | Auto-aceite: política "Escopo (Core vs Full)" — PRD sem os dois blocos | confirmada |
| 2 | **Reaproveita `CAMINHO_PLACEHOLDER_ARTE_PADRAO`** (já registrada em `packages/shared` por F02 Decisão 5) como único caminho de fallback. Nenhum caminho alternativo é definido nesta feature. A pendência de asset associada (o arquivo de imagem do placeholder ainda não existe no repositório) permanece registrada e **herdada**, não reaberta — F04 depende desse asset ser fornecido antes que o fallback produza uma imagem real na tela, mas o contrato de código não muda quando ele chegar. | F02 spec Decisão 5; instrução explícita do lote | confirmada — pendência de asset herdada |
| 3 | **`resolverArte` aceita `Carta` inteira ou `NumeroCarta` isolado como entrada**, exatamente como a Experience do PRD descreve: "Um módulo de tela pede a arte de uma carta passando a carta (ou seu numero)". Evita que todo consumidor precise desestruturar `.numero` manualmente antes de chamar o resolvedor. | PRD §6 F04 Experience | confirmada |
| 4 | **O retorno sempre inclui um `caminho` utilizável**, tanto no ramo de arte real quanto no de placeholder — a resolução é transparente e não exige nenhum `if` obrigatório do consumidor antes de renderizar. É a leitura mais literal da frase do PRD "de forma transparente. O consumidor nunca lida com caminhos físicos nem com o caso de imagem faltante". O PRD não detalha a forma exata do valor de retorno (especificação parcial); esta é a decisão de boa prática adotada e documentada, aplicando o default de "sempre devolver algo pronto para uso". | Auto-aceite: especificação parcial do PRD, resolvida com o default mais consistente com a Experience descrita | confirmada |
| 5 | **Reconciliação com o contrato cross-PRD já assumido por `library/F01`.** Aquela spec, escrita antes de F04 existir, declarou uma interface provisória `ResolucaoArte.resolver(numero): { tipo: 'arte'; caminho } \| { tipo: 'placeholder' }` (sem `caminho` no ramo placeholder, porque a Library escolhe seu próprio asset de placeholder/silhueta — ver `library/F02` Decisão 8). O contrato real de F04 (`ResolvedorArtes.resolver`, Decisão 4) é um **superconjunto estrutural**: mesmo nome de campo `tipo`, mesmos dois valores, e `caminho` presente também no ramo placeholder. Um consumidor tipado pela interface mais estreita de `library/F01` continua funcionando ao receber o valor real em runtime — só não lê o campo extra. Esta spec **não edita** a spec de `library/F01` (fora do escopo deste lote); registra apenas a compatibilidade. | Achado ao inspecionar `docs/specs/library/F01-.../spec.md` (precedente cross-PRD); Auto-aceite: "padrões conflitantes" resolvido documentando ambos e adotando o desenho mais fiel ao texto do PRD desta feature | confirmada — compatibilidade documentada, nenhuma edição em `library/F01` |
| 6 | **F04 não introduz nenhum ponto de I/O próprio.** Consome exclusivamente o `ManifestoArtes` já carregado em memória por F03 (`obterManifestoArtes()`). Diferente de F01/F02/F03, esta feature não tem adaptador CLI, não gera nenhum artefato novo em `packages/data/generated/` e não altera `turbo.json` — não há nova tarefa de build a orquestrar. | Consequência de F03 Decisão 5; guidelines §3.3 ("I/O adapters call pure domain modules") | confirmada |
| 7 | **Função total, nunca lança exceção.** `numero` fora do manifesto — seja porque a arte realmente falta, seja porque o `numero` não corresponde a nenhuma carta conhecida do catálogo — recebe o mesmo tratamento uniforme de fallback ao placeholder. O PRD **não tem bloco "Error Handling"** para F04 (diferente de F01/F02/F03/F09/F10) — a ausência é tratada como especificação parcial: o default adotado é "a resolução nunca quebra", coerente com a Experience ("garante que nenhuma tela quebre") e com o princípio fail-safe do ADR-003. | Auto-aceite: bloco Error Handling ausente no PRD para esta feature; default de boa prática documentado | confirmada |
| 8 | **`ReferenciaArteResolvida` e `ResolvedorArtes` vivem em `packages/data/src/artes`, não em `packages/shared`.** Mesmo raciocínio da Decisão 1 de F03 sobre `CatalogoCartas`: nenhum consumidor acima de `data` na direção de dependências deixa de depender de `data` de qualquer forma (Library e demais já importam `packages/data` diretamente para o catálogo de F03), então não há necessidade de promover estes tipos a `shared`. | F03 spec Decisão 1 (precedente do mesmo PRD) | confirmada |
| 9 | **Nenhuma alteração em `packages/shared` nesta feature.** F04 reaproveita integralmente `Carta`, `NumeroCarta`, `ManifestoArtes` e `CAMINHO_PLACEHOLDER_ARTE_PADRAO`, todos já registrados por F01/F02. | Verificação direta das specs de F01/F02 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/src/artes/tipos.ts` | data | novo | `ReferenciaArteResolvida`, `ResolvedorArtes` |
| `packages/data/src/artes/resolver-arte.ts` | data | novo | `resolverArte` — núcleo puro de resolução, sem I/O |
| `packages/data/src/artes/criar-resolvedor-artes.ts` | data | novo | `criarResolvedorArtes`, `criarResolvedorArtesDoCatalogo` — fábricas imutáveis |
| `packages/data/src/artes/index.ts` | data | novo | Export público do subsistema de artes |
| `packages/data/src/artes/resolver-arte.test.ts` | data | novo | Unitários table-driven de `resolverArte` |
| `packages/data/src/artes/criar-resolvedor-artes.test.ts` | data | novo | Unitários das fábricas |
| `packages/data/tests/artes.integration.test.ts` | data | novo | Integração contra o catálogo real (F01+F02+F03) |

Nenhum arquivo de `packages/shared` é criado ou alterado (Decisão 9). Nenhuma alteração em
`turbo.json` (Decisão 6) — F04 não é uma etapa de geração de artefato, é biblioteca de runtime
consumida por `apps/web`/`apps/server`, mesmo status de F03.

**Verificação da direção de dependências:** `packages/data` continua importando **apenas**
`packages/shared` (reaproveita `Carta`, `NumeroCarta`, `ManifestoArtes`,
`CAMINHO_PLACEHOLDER_ARTE_PADRAO`). Internamente, `packages/data/src/artes/criar-resolvedor-artes.ts`
importa `CatalogoCartas` de `packages/data/src/catalogo` (F03) — import intra-pacote, unidirecional
(`artes` depende de `catalogo`, nunca o inverso), o que não viola `shared ← data` de
`arquitetura.md` §2. Nenhum import de `rules`, `engine`, `ai`, `web` ou `server`.

Esta feature **não toca `packages/engine`** — as garantias de pureza/PRNG do motor não se aplicam.
A fronteira de I/O aqui é a mais estrita do módulo até agora:

- `packages/data/src/artes/**` **não** importa `node:fs`, `node:path`, `fetch` nem `process` — e,
  ao contrário de F01/F02/F03, **não existe nenhum arquivo com I/O** neste subsistema, porque não
  há nada a ler do disco que F03 já não tenha carregado (Decisão 6).

## 3. Design Técnico

### Estruturas de dados

**`ReferenciaArteResolvida`** (público, `Readonly<{...}>`):

| Campo | Tipo | Semântica |
|---|---|---|
| `numero` | `NumeroCarta` | O `numero` que originou a resolução, para rastreabilidade |
| `tipo` | `'arte' \| 'placeholder'` | Qual caso ocorreu — informativo, não obrigatório de checar |
| `caminho` | `string` | Referência pronta para uso como fonte de imagem — **sempre presente**, seja a arte real (`cards-data/{numero}.jpg`) seja `CAMINHO_PLACEHOLDER_ARTE_PADRAO` (Decisão 4) |

**`ResolvedorArtes`** (interface pública, "capability" injetável, mesmo espírito de `Clock`/
`SnapshotStore` de guidelines §10.1):

```ts
interface ResolvedorArtes {
  resolver(entrada: Carta | NumeroCarta): ReferenciaArteResolvida;
}
```

### Fluxo

1. **Extrair o `numero` da entrada.** Se `entrada` é uma `Carta`, usa `entrada.numero`; se já é um
   `NumeroCarta`, usa diretamente. Nenhuma validação de formato é refeita aqui — isso já aconteceu
   em F01/F02/F03 antes de a carta ou o `numero` chegarem a F04.
2. **Consultar o manifesto** (o `ManifestoArtes` já construído por F01 e exposto por F03) pela
   chave `numero`.
3. **Presente** → `{ numero, tipo: 'arte', caminho: manifesto[numero] }`.
4. **Ausente** → `{ numero, tipo: 'placeholder', caminho: CAMINHO_PLACEHOLDER_ARTE_PADRAO }`. Não
   há terceiro caso: qualquer `numero` que não seja chave do manifesto — arte realmente ausente ou
   `numero` desconhecido/malformado — recebe o mesmo tratamento uniforme (Decisão 7).
5. **Fábrica `criarResolvedorArtes(manifesto)`** fecha sobre o manifesto recebido e devolve um
   objeto `Object.freeze`d cujo método `resolver` delega para `resolverArte` — mesmo estilo de
   fábrica de funções puras e imutável já usado por F03 (F03 Decisão 1).
6. **Conveniência `criarResolvedorArtesDoCatalogo(catalogo)`** chama
   `catalogo.obterManifestoArtes()` (F03) internamente e delega para `criarResolvedorArtes`,
   poupando o consumidor de extrair o manifesto manualmente.

### Regras de negócio

- A convenção de nome de arquivo (`numero` de 3 dígitos) já está embutida nas chaves do manifesto
  — F04 nunca monta `cards-data/{numero}.jpg` por concatenação própria; apenas lê o valor que já
  está lá (PRD F04 Capabilities; consistente com a decisão equivalente já registrada por
  `library/F01`: "a Library nunca monta o caminho... isso é convenção de F04").
- `resolverArte` e `ResolvedorArtes.resolver` são **funções totais**: para qualquer entrada válida
  no tipo (`Carta` ou `NumeroCarta`), sempre devolvem uma `ReferenciaArteResolvida` com `caminho`
  não vazio. Nunca lançam exceção, nunca devolvem `undefined` (Decisão 7).
- F04 nunca redimensiona, recodifica ou processa a imagem — devolve só a referência (PRD F04
  Capabilities). Lazy-load, decodificação assíncrona e proporção fixa são de cada tela consumidora
  (ex.: já decidido assim em `library/F02` Decisão 7).

### Determinismo e pureza

Não se aplica a `packages/engine`. `resolverArte` é pura: mesma entrada (numero/carta + manifesto)
→ mesma saída, sem I/O e sem estado module-level mutável. `criarResolvedorArtes` apenas fecha sobre
uma estrutura imutável já construída por F03 — nenhuma chamada de fábrica introduz efeito
colateral.

## 4. Contratos

### Tipos reaproveitados (`packages/shared`, sem alteração)

`Carta`, `NumeroCarta`, `ManifestoArtes`, `CAMINHO_PLACEHOLDER_ARTE_PADRAO` — todos já registrados
por F01/F02, reaproveitados sem redefinição (Decisão 9).

### Novos tipos (`packages/data/src/artes`, Decisão 8)

- **`ReferenciaArteResolvida`** — ver Seção 3.
- **`ResolvedorArtes`** — interface pública com o método `resolver`, ver Seção 3.

### Funções públicas

```
// packages/data/src/artes — núcleo puro, sem I/O

resolverArte(
  entrada: Carta | NumeroCarta,
  manifesto: ManifestoArtes,
): ReferenciaArteResolvida
  // pura, total, nunca lança
  // numero presente no manifesto ⇒ tipo 'arte', caminho = manifesto[numero]
  // numero ausente do manifesto  ⇒ tipo 'placeholder', caminho = CAMINHO_PLACEHOLDER_ARTE_PADRAO

criarResolvedorArtes(manifesto: ManifestoArtes): ResolvedorArtes
  // fecha sobre o manifesto recebido; devolve objeto congelado (Object.freeze)

criarResolvedorArtesDoCatalogo(catalogo: CatalogoCartas): ResolvedorArtes
  // usa catalogo.obterManifestoArtes() (F03) internamente; poupa o consumidor de extraí-lo
```

### Exemplos de uso

```ts
const catalogo = await carregarCatalogoDoDisco({ dirGerado: "packages/data/generated" });
const artes = criarResolvedorArtesDoCatalogo(catalogo.value);

artes.resolver("001");
// { numero: "001", tipo: "arte", caminho: "cards-data/001.jpg" }

artes.resolver(catalogo.value.getByNumero("001")!);
// mesmo resultado — aceita a Carta inteira (Decisão 3)

artes.resolver("999" as NumeroCarta); // numero fora do catálogo, cenário defensivo
// { numero: "999", tipo: "placeholder", caminho: "<CAMINHO_PLACEHOLDER_ARTE_PADRAO>" }
```

### Contratos externos (cross-PRD)

`ResolvedorArtes` é o contrato **fornecido** a Library, Build Deck e Motor de Duelo 1x1 (PRD §6 F04
Provides), e internamente a F09 (que empacota o módulo `packages/data`, incluindo este subsistema,
como parte do bundle do cliente).

**Compatibilidade com `library/F01`** (Decisão 5): a interface `ResolucaoArte.resolver(numero)` que
aquela spec já assumiu (`packages/shared/src/library/catalogo.ts`, forma
`{ tipo: 'arte'; caminho } | { tipo: 'placeholder' }`) é satisfeita estruturalmente por
`ResolvedorArtes.resolver` — mesmos nomes de campo e valores de `tipo`; a única diferença é que
esta feature também inclui `caminho` no ramo `placeholder`, que a Library pode ignorar sem quebra.

**Build Deck e Motor de Duelo 1x1** ainda não têm spec que consome F04 explicitamente — o contrato
acima fica disponível para quando essas specs endereçarem a exibição de arte de carta.

## 5. Modelo de Dados

Esta feature não cria tabelas Postgres, estruturas IndexedDB nem nenhum artefato novo em
`packages/data/generated/`. Não há estado por jogador envolvido.

| Artefato/constante | Origem | Uso em F04 |
|---|---|---|
| `packages/data/generated/arts-manifest.json` | F01 (gerado), exposto em memória por F03 | Único insumo de dado consultado por `resolverArte`, via `ManifestoArtes` já carregado — nenhuma leitura adicional de disco |
| `CAMINHO_PLACEHOLDER_ARTE_PADRAO` (`packages/shared`) | F02 (Decisão 5) | Único caminho de fallback; reaproveitado sem redefinição (Decisão 2) |

**Pendência de asset (herdada de F02 Decisão 5):** o arquivo de imagem do placeholder em si ainda
não existe no repositório. Isso não bloqueia esta spec nem sua implementação de código — o
contrato (`CAMINHO_PLACEHOLDER_ARTE_PADRAO` e o formato de `ReferenciaArteResolvida`) não muda
quando o asset for fornecido. Hoje, com 722 cartas ↔ 722 artes reais (0 ausências), o ramo
`placeholder` nunca é exercitado pelo dataset real — apenas por fixtures sintéticas nos testes
(Seção 7).

## 6. Tratamento de Erros e Casos de Borda

O PRD não declara um bloco "Error Handling" para F04 (diferente de F01/F02/F03/F09/F10) — a tabela
abaixo aplica o default de boa prática documentado na Decisão 7 ("função total, nunca lança").

| Cenário | Detecção | Comportamento | Retorno |
|---|---|---|---|
| `numero` presente no manifesto | lookup no `ManifestoArtes` | Resolve normalmente | `{ tipo: 'arte', caminho: <caminho real> }` |
| Carta emitida sem arte correspondente (arte realmente ausente) | lookup falha | Fallback ao placeholder, sem lançar | `{ tipo: 'placeholder', caminho: CAMINHO_PLACEHOLDER_ARTE_PADRAO }` |
| `numero` desconhecido/malformado passado diretamente (não originado de uma `Carta` validada por F03) | lookup falha pela mesma via | Mesmo fallback uniforme — F04 não distingue "arte ausente" de "carta inexistente" | `{ tipo: 'placeholder', ... }` |
| Manifesto vazio (cenário defensivo — impossível pós-F02 com dataset selado, mas coberto por teste) | toda consulta falha | Toda resolução cai em placeholder, nenhuma exceção | `{ tipo: 'placeholder', ... }` para qualquer entrada |
| Arquivo de imagem do placeholder ainda não existe fisicamente no repositório (pendência de asset) | fora do alcance de F04 em runtime — auditado por F02 no build | Enquanto o dataset real tiver paridade 722/722, este caminho nunca dispara; quando o asset for fornecido, nenhuma mudança de contrato é necessária aqui | — |
| Consumidor usa `.caminho` do ramo `placeholder` sem checar `.tipo` | não é erro de F04 | Funciona por design (Decisão 4) — a referência já é utilizável em ambos os ramos | — |
| Consumidor ignora `.caminho` no ramo `placeholder` (ex.: `library/F01`, que escolhe seu próprio asset de silhueta/placeholder) | não é erro de F04 | Compatível por design (Decisão 5) — campo extra sem uso não quebra o consumidor | — |

Nenhum caminho desta feature lança exceção ou propaga um erro técnico — a única forma de "falha" é
o consumidor receber `tipo: 'placeholder'`, que é o comportamento esperado e documentado, não uma
condição de erro (guidelines §8.1: "use domain errors for expected business failures" — aqui não há
nem falha de negócio, apenas um resultado alternativo previsto).

## 7. Estratégia de Testes

### Unitários (Vitest)

`resolverArte` — table-driven (guidelines §11.2):
- `resolverArte resolve tipo arte para numero presente no manifesto`
- `resolverArte resolve tipo placeholder para numero ausente do manifesto`
- `resolverArte aceita uma Carta como entrada e usa o numero da propria carta`
- `resolverArte aceita um numero isolado como entrada`
- `resolverArte devolve o caminho do placeholder padrao usando a constante compartilhada`
- `resolverArte nunca lanca excecao mesmo com manifesto vazio`
- `resolverArte inclui o numero de entrada no campo numero do resultado`
- `resolverArte trata numero desconhecido da mesma forma que arte realmente ausente`

`criarResolvedorArtes` / `criarResolvedorArtesDoCatalogo`:
- `criarResolvedorArtes fecha sobre o manifesto recebido e resolve consultas subsequentes`
- `criarResolvedorArtes devolve um objeto congelado`
- `criarResolvedorArtesDoCatalogo usa o manifesto exposto por obterManifestoArtes do catalogo`

### Property-based (fast-check)

- **Totalidade da função:** para qualquer string arbitrária usada como `numero` (dentro ou fora do
  formato de 3 dígitos) e qualquer manifesto arbitrário, `resolverArte` sempre devolve um objeto
  com `caminho` não vazio — nunca lança, nunca devolve `undefined`. 1.000 execuções.
- **Cobertura exaustiva do manifesto:** para todo `numero` presente em um manifesto gerado
  arbitrariamente, `resolverArte` devolve `tipo: 'arte'` com `caminho === manifesto[numero]`; para
  todo `numero` fora das chaves do manifesto, devolve `tipo: 'placeholder'` com
  `caminho === CAMINHO_PLACEHOLDER_ARTE_PADRAO`.
- **Idempotência:** chamar `resolverArte` duas vezes com os mesmos argumentos produz resultados
  estruturalmente iguais — não há estado escondido entre chamadas.

### Integração

`packages/data/tests/artes.integration.test.ts`, rodando após a ingestão real (F01), a validação
real (F02) e o catálogo real carregado do disco (F03):

- `resolucao real cobre as 722 cartas com tipo arte, nenhuma cai em placeholder` (paridade 1:1 do
  dataset real verificada por F01)
- `resolucao real usa o manifesto exposto por obterManifestoArtes do catalogo carregado do disco`
  (nenhuma leitura adicional de disco por F04)
- `resolucao real devolve placeholder quando uma carta e removida artificialmente do manifesto em
  memoria` (simula falta de arte, já que o dataset real não tem nenhuma ausência hoje)

### Análise estática

- `packages/data/src/artes/**` não importa `node:fs`, `node:path`, `node:process` nem `fetch` —
  zero I/O, mais estrito que F01/F02/F03 (cada um tem ao menos um adaptador).
- `packages/data` continua importando apenas `packages/shared` (mais o import intra-pacote de
  `packages/data/src/catalogo`, ver Seção 2).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F04) | Teste |
|---|---|
| A arte de uma carta é resolvida pelo seu `numero` para `cards-data/{numero}.jpg` | `resolverArte resolve tipo arte para numero presente no manifesto` + `resolucao real cobre as 722 cartas com tipo arte...` |
| Arte ausente retorna o placeholder padrão, sem quebrar o consumidor | `resolverArte resolve tipo placeholder para numero ausente do manifesto` + `resolverArte nunca lanca excecao mesmo com manifesto vazio` |
| O resolvedor não expõe caminhos físicos nem exige que o consumidor trate imagem faltante | Design da Seção 3/Decisão 4 (`caminho` sempre presente, nenhum branch obrigatório) + `resolverArte devolve o caminho do placeholder padrao usando a constante compartilhada` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: as artes resolvidas por F04 correspondem 1:1 às cartas servidas por F03 (722 cartas ↔ 722 artes, faltas caem no placeholder) | `resolucao real cobre as 722 cartas com tipo arte, nenhuma cai em placeholder` |
| Cross-Feature: o pacote de F09 contém exatamente o catálogo de F03, as artes de F04 e as tabelas de F05–F08, e F10 versiona esse pacote como uma unidade | Contrato declarado na Seção 4: `packages/data` (incluindo o subsistema `artes`) é o que F09 empacota; nenhum artefato de dado adicional é gerado por F04 — verificado quando F09 for especificada |
| Cross-PRD (do bloco Provides de F04, não um critério textual da Seção 9): Library, Build Deck e Motor de Duelo 1x1 consomem a resolução de arte de F04 | `criarResolvedorArtesDoCatalogo usa o manifesto exposto por obterManifestoArtes do catalogo` + compatibilidade estrutural documentada na Decisão 5 com a interface `ResolucaoArte` já assumida por `library/F01` |
