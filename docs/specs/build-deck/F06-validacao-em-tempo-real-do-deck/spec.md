# Validação em Tempo Real do Deck

> PRD: `docs/prds/build-deck.md` — F06
> Pacote-alvo: `packages/rules` (+ `packages/shared`, `apps/web`)

## 1. Contexto e Escopo

Esta feature é um cálculo puro e somente-leitura que olha para o rascunho de F05 e a coleção de
F01 e devolve um veredito — válido ou inválido — mais a lista específica do que falta corrigir.
Ela não move nenhuma carta e não decide quando salvar; é o "farol" que F07 vai consultar antes de
liberar o botão de salvar. É a penúltima peça da Wave que fecha o ciclo do módulo
(`arquitetura.md` §9, Fase 2): F02 → F04 → F05 → **F06** → F07.

### Incluído
- Avaliar continuamente as três regras: exatamente 40 cartas, no máximo 3 cópias por carta
  (invariante da Fase 0), e apenas cartas possuídas em quantidade suficiente (regra deste módulo)
  (PRD Capabilities).
- Produzir violações específicas e legíveis: `faltam K cartas para 40`, `excedem K cartas acima
  de 40`, `carta X com 4+ cópias`, `carta X além do que possui` (PRD Capabilities).
- Expor um booleano `válido` que só é `true` quando nenhuma violação existe, para F07 consumir ao
  habilitar o botão de salvar (PRD Provides).

### Fronteiras
- **Não** altera `rascunho` nem `colecaoJogador` — é puramente leitura (PRD Capabilities: "não
  altera o deck nem a coleção; apenas reporta o estado").
- **Não** decide quando salvar nem grava nada — isso é de **F07**.
- **Não** move cartas entre coleção e deck — isso é de **F05**; F06 só lê o resultado.
- O PRD não define bloco de Error Handling para esta feature ("não há tratamento de erro
  dedicado: é um validador de leitura, sem escrita nem rede") — a Seção 6 desta spec cobre só os
  casos técnicos de borda que o próprio PRD não previu (carregamento, carta desconhecida).

### Contratos externos assumidos
Nenhum novo. Os dois contratos consumidos são internos ao PRD e já têm spec:
- **`build-deck`/F05 — rascunho e total.** `RascunhoDeck` (`numero → quantidade no deck`) e
  `totalCartasRascunho`, expostos pelo hook `useRascunhoDeck`.
- **`build-deck`/F01 — coleção do jogador.** `Colecao` (`numero → quantidade possuída`) e
  `quantidadePossuida`/`limiteCopias`, expostos pelo hook `useColecao`.

### Decisões e Premissas
| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | F06 não tem blocos `Core Scope`/`Full Scope additions` no PRD — escopo completo, sem divisão. | PRD §6 F06 | confirmada |
| 2 | O estado de validação é recalculado **sob demanda a cada render**, via `useMemo` sobre o rascunho atual (F05) e a coleção atual (F01) — não é um campo derivado dentro do store Zustand de F05. Mantém F06 inteiramente desacoplada: nenhum arquivo de F05 é reaberto, e F07 consome os dois hooks (F05 e F06) lado a lado. | entrevista | confirmada |
| 3 | `validarDeck` é uma função **pura sem envelope `Result`** — ao contrário de F01/F02/F03/F05, ela não tem caminho de falha (não há I/O, não há entrada que possa ser "inválida" no sentido de erro de domínio): sempre devolve um `ResultadoValidacaoDeck`, mesmo para um rascunho vazio. Reflete literalmente o texto do PRD ("não há tratamento de erro dedicado"). | PRD §6 F06 Experience | confirmada |
| 4 | As quatro mensagens de violação do PRD viram quatro variantes de um tipo `ViolacaoDeck` discriminado por `tipo` (`total_insuficiente`, `total_excedente`, `copias_acima_do_maximo`, `alem_do_possuido`), cada uma carregando os dados numéricos necessários para a mensagem (K, `numero`, quantidades) — a UI formata o texto, a regra pura nunca devolve string livre. Mesma filosofia código+dados de `build-deck`/F05 Decisão 8. | PRD §6 F06 Capabilities; precedente `build-deck/F05` Decisão 8 | confirmada |
| 5 | Um card pode acumular **duas violações simultâneas** (`copias_acima_do_maximo` e `alem_do_possuido` para o mesmo `numero`, ex.: 5 cópias no deck com apenas 2 possuídas) — a regra deste módulo (posse) e o invariante de Fase 0 (teto de 3) são checados independentemente, sem se descartarem mutuamente. Cenário defensivo: como F05 já bloqueia ambos os casos na origem, só ocorreria se o rascunho tivesse sido hidratado de um estado externo inconsistente. | PRD §6 F06 Capabilities (lista as duas mensagens como independentes) | confirmada |
| 6 | Ordem determinística da lista de violações: violação de total (se houver) primeiro, depois violações por carta ordenadas por `numero` ascendente, e para o mesmo `numero`, `copias_acima_do_maximo` antes de `alem_do_possuido`. Só afeta a ordem de exibição/teste, nunca o veredito de `válido`. | decisão de projeto (determinismo e testabilidade) | confirmada |
| 7 | Enquanto `useColecao` (F01) ainda está carregando, `useValidacaoDeck` devolve um estado neutro (`válido: false`, `violacoes: []`, `carregando: true`) em vez de chamar `validarDeck` — evita um lampejo de violações falsas de "além do possuído" antes da coleção real chegar. `validarDeck` em si permanece pura e alheia a estado de carregamento; o gate fica só no hook. | decisão de projeto (evitar falso-positivo transitório) | confirmada |
| 8 | Mensagens de violação (com interpolação de números e nome de carta) ficam numa função dedicada `formatarViolacao` em `apps/web`, e não no `mensagens.ts` estático que `build-deck`/F04 introduziu — aquele arquivo mapeia código → string fixa, sem parâmetros; as mensagens desta feature exigem interpolar `K`, `numero`/nome e quantidades, o que um mapa estático não expressa bem. Divergência pontual do padrão de F04, documentada aqui em vez de silenciada. | precedente `build-deck/F04` Seção 2 (arquivo `mensagens.ts`); decisão de projeto | confirmada |
| 9 | Pacote-alvo: `validarDeck` pura em `packages/rules/src/deck`, ao lado das funções de F05; leitura reativa (`useValidacaoDeck`) e formatação de mensagem em `apps/web`. Mesma divisão de ADR-004 e do precedente de F01/F04/F05. | ADR-004; spec `build-deck/F05` Decisão 9 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/deck/tipos.ts` | shared | alterado | Acrescenta `ViolacaoDeck` (união discriminada por `tipo`) e `ResultadoValidacaoDeck` ao lado de `RascunhoDeck`/`MotivoBloqueioEdicaoDeck` já existentes (F05) |
| `packages/rules/src/deck/validacao.ts` | rules | novo | `validarDeck` — pura, sem I/O |
| `packages/rules/src/deck/index.ts` | rules | alterado | Reexporta `validarDeck` ao lado das funções de edição (F05) |
| `packages/rules/src/deck/validacao.test.ts` | rules | novo | Unitários table-driven das quatro categorias de violação + propriedades fast-check |
| `apps/web/src/hooks/use-validacao-deck.ts` | web | novo | Combina `useRascunhoDeck` (F05) e `useColecao` (F01) via `useMemo`; aplica o gate de carregamento (Decisão 7) |
| `apps/web/src/hooks/use-validacao-deck.test.ts` | web | novo | Unitários do hook, incluindo o estado neutro durante carregamento |
| `apps/web/src/lib/build-deck/formatar-violacao.ts` | web | novo | `formatarViolacao` — mapeia cada `ViolacaoDeck` para o texto do PRD, com busca de nome de carta |
| `apps/web/src/lib/build-deck/formatar-violacao.test.ts` | web | novo | Unitários de formatação, incluindo o fallback de carta sem nome conhecido |
| `apps/web/src/components/build-deck/contador-validacao.tsx` | web | novo | Exibe o contador `X/40` (verde quando válido, vermelho caso contrário) e a lista de violações formatadas |
| `apps/web/src/app/build-deck/page.tsx` | web | alterado | Monta `contador-validacao.tsx` ao lado do editor de F05, conectando `useValidacaoDeck` |
| `apps/web/tests/build-deck-validacao.integration.test.tsx` | web | novo | Fluxo de UI: contador reage a adicionar/remover cartas em F05, incluindo o caminho neutro de carregamento |

**Verificação da direção de dependências:** `packages/shared` continua sem importar nenhum outro
pacote do monorepo — `ViolacaoDeck`/`ResultadoValidacaoDeck` são tipos puros. `packages/rules/src/deck/validacao.ts` importa **apenas** `packages/shared` (para `RascunhoDeck`, `Colecao`,
`NumeroCarta`, `ViolacaoDeck`, `ResultadoValidacaoDeck`) e `packages/rules/src/colecao` (para
`quantidadePossuida`) e `packages/rules/src/deck/edicao` (para `totalCartasRascunho`) — todos já
existem à esquerda na cadeia `shared ← data ← rules`, sem inversão. `apps/web` importa `shared` e
`rules`; não importa `engine`, `ai` nem `server`. Esta feature **não toca `packages/engine`** —
PRNG semeado e estado de duelo serializável não se aplicam.

`packages/rules/src/deck/validacao.ts` não importa React, DOM, `fetch`, Supabase, `node:fs` nem
nenhuma API de I/O — recebe `rascunho` e `colecaoJogador` como argumentos e devolve uma estrutura
nova em memória, sem nunca mutar as entradas (mesma fronteira que F01/F05 já estabeleceram).

## 3. Design Técnico

### Estruturas de dados

**`ViolacaoDeck`** — união discriminada por `tipo`:

| Variante | Campos | Semântica |
|---|---|---|
| `total_insuficiente` | `faltam: number` | `total < 40`; `faltam = 40 - total` |
| `total_excedente` | `excedem: number` | `total > 40`; `excedem = total - 40` |
| `copias_acima_do_maximo` | `numero: NumeroCarta`, `quantidadeNoDeck: number` | `quantidadeNoDeck > 3` (invariante de Fase 0, independente da posse) |
| `alem_do_possuido` | `numero: NumeroCarta`, `quantidadeNoDeck: number`, `quantidadePossuida: number` | `quantidadeNoDeck > quantidadePossuida` (regra deste módulo, inclui o caso `quantidadePossuida === 0`) |

**`ResultadoValidacaoDeck`**:

| Campo | Tipo | Semântica |
|---|---|---|
| `valido` | `boolean` | `violacoes.length === 0` |
| `total` | `number` | `totalCartasRascunho(rascunho)` (F05), incluído para a UI exibir `X/40` sem recalcular |
| `violacoes` | `readonly ViolacaoDeck[]` | Ordem determinística (Decisão 6); vazia sse `valido` |

### Fluxo

1. O jogador adiciona ou remove uma carta em F05; o rascunho do store muda.
2. `useValidacaoDeck` (que já observa `useRascunhoDeck` e `useColecao` via `useMemo`) recalcula no
   mesmo ciclo de render — sem debounce, sem chamada de rede: o custo é O(número de cartas
   distintas no rascunho), tipicamente dezenas, folgadamente dentro do limite de 100 ms do PRD.
3. Se `useColecao` ainda está carregando, o hook devolve o estado neutro da Decisão 7 em vez de
   chamar `validarDeck` — nenhuma violação de "além do possuído" pisca na tela antes da coleção
   real chegar.
4. `contador-validacao.tsx` lê `valido`, `total` e `violacoes`; pinta o contador `X/40` de verde
   quando `valido` e vermelho caso contrário, e lista cada violação já formatada por
   `formatarViolacao` (usando a coleção enriquecida de F01 para resolver `numero → nome`).
5. F06 não expõe nenhum botão de salvar — apenas o veredito `valido`, que **F07** vai ler para
   habilitar/desabilitar o próprio botão quando essa feature existir.

### Regras de negócio

- **Regra do total** (invariante de Fase 0): `total === 40` é a única condição sem violação;
  `total < 40` produz `total_insuficiente`, `total > 40` produz `total_excedente` — nunca ambas ao
  mesmo tempo, já que são mutuamente exclusivas por construção aritmética.
- **Regra do teto de cópias** (invariante de Fase 0): para cada `numero` presente no rascunho,
  `quantidadeNoDeck > 3` produz `copias_acima_do_maximo`, independente de quantas o jogador possui
  — é o hard cap absoluto do jogo, nunca condicionado à posse.
- **Regra de posse** (regra deste módulo, PRD Capabilities): para cada `numero` presente no
  rascunho, `quantidadeNoDeck > quantidadePossuida(colecaoJogador, numero)` produz
  `alem_do_possuido` — cobre tanto "possui menos do que tem no deck" quanto "não possui nada desta
  carta" (`quantidadePossuida === 0`), sem precisar de uma variante separada para esse último caso.
- **Independência das duas regras por carta:** um mesmo `numero` pode produzir as duas violações
  simultaneamente (Decisão 5); `validarDeck` nunca decide "a pior" e descarta a outra.
- **Iteração determinística:** `validarDeck` percorre as chaves do rascunho ordenadas por `numero`
  ascendente para produzir a lista de violações por carta, garantindo saída estável para os mesmos
  dados de entrada (Decisão 6).

### Determinismo e pureza

Esta feature não toca `packages/engine`; PRNG semeado e round-trip de estado de duelo não se
aplicam. `validarDeck` é, ainda assim, **pura e determinística**: mesma combinação de `rascunho` e
`colecaoJogador` sempre produz o mesmo `ResultadoValidacaoDeck`, sem I/O, sem `Math.random()`, sem
mutar nenhuma das duas estruturas recebidas.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`ViolacaoDeck`**, **`ResultadoValidacaoDeck`** — descritos na Seção 3. Sem schema zod: não
  atravessam fronteira de rede nem de armazenamento, vivem só em memória do lado do cliente.
- **`RascunhoDeck`, `Colecao`, `NumeroCarta`** — reusados de `packages/shared` conforme as specs
  de `banco-de-cartas`/F01, `build-deck`/F01 e `build-deck`/F05. **Não são redefinidos aqui.**

Nenhum código de `DomainError` novo — `validarDeck` não tem caminho de erro (Decisão 3).

### Funções públicas

```
// packages/rules/src/deck/validacao.ts — puro, sem I/O

validarDeck(
  rascunho: RascunhoDeck,
  colecaoJogador: Colecao,
): ResultadoValidacaoDeck
  // pós: total = totalCartasRascunho(rascunho)
  //      violacoes contém total_insuficiente|total_excedente sse total !== 40
  //      violacoes contém copias_acima_do_maximo para todo numero com quantidadeNoDeck > 3
  //      violacoes contém alem_do_possuido para todo numero com quantidadeNoDeck > quantidadePossuida
  //      valido = violacoes.length === 0
  //      nunca lança; sempre devolve um resultado, mesmo para rascunho vazio (total=0, faltam=40)
```

```
// apps/web/src/hooks/use-validacao-deck.ts

useValidacaoDeck(): ResultadoValidacaoDeck & { carregando: boolean }
  // pós: carregando=true ⇒ valido=false, total=totalCartasRascunho(rascunho), violacoes=[]
  //      carregando=false ⇒ resultado real de validarDeck(rascunho, colecaoJogador)
```

```
// apps/web/src/lib/build-deck/formatar-violacao.ts

formatarViolacao(
  violacao: ViolacaoDeck,
  buscarNome: (numero: NumeroCarta) => string | undefined,
): string
  // pós: total_insuficiente ⇒ "Faltam {faltam} cartas para 40"
  //      total_excedente ⇒ "Excedem {excedem} cartas acima de 40"
  //      copias_acima_do_maximo ⇒ "{nome ou numero}: {quantidadeNoDeck} cópias (máx. 3)"
  //      alem_do_possuido ⇒ "{nome ou numero}: além do que possui ({quantidadePossuida})"
  //      buscarNome(numero) === undefined ⇒ usa o próprio numero no lugar do nome (mesmo
  //      fallback de "carta desconhecida" que build-deck/F01 já aplica)
```

### Exemplos

```json
{
  "valido": false,
  "total": 38,
  "violacoes": [
    { "tipo": "total_insuficiente", "faltam": 2 },
    { "tipo": "copias_acima_do_maximo", "numero": "045", "quantidadeNoDeck": 4 },
    { "tipo": "alem_do_possuido", "numero": "333", "quantidadeNoDeck": 3, "quantidadePossuida": 2 }
  ]
}
```

Deck exatamente válido:

```json
{ "valido": true, "total": 40, "violacoes": [] }
```

### Contratos externos (cross-PRD)

Nenhum — todos os contratos consumidos (F01, F05) são internos ao PRD `build-deck` e já têm spec.

## 5. Modelo de Dados

Esta feature **não cria nem altera** tabela Postgres, migração, store IndexedDB ou arquivo de
dados versionado. `ResultadoValidacaoDeck` é recalculado a cada render a partir de estado que já
existe em memória (o rascunho de F05, a coleção de F01) e nunca é persistido — se precisasse ser
recuperado após um reload, seria recalculado do zero a partir do rascunho reidratado, não lido de
um cache próprio.

## 6. Tratamento de Erros e Casos de Borda

O PRD não define bloco de Error Handling para esta feature ("validador de leitura, sem escrita
nem rede"). Os casos abaixo são de robustez técnica, não de erro de domínio:

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|----------------------|
| Rascunho vazio (jogador ainda não adicionou nenhuma carta) | `total === 0` | `validarDeck` devolve `total_insuficiente` com `faltam: 40`, sem lançar | "Faltam 40 cartas para 40" (mesma formatação de qualquer `total_insuficiente`) |
| `useColecao` (F01) ainda carregando ao entrar no editor | estado de carregamento propagado por `useColecao` | `useValidacaoDeck` devolve o estado neutro da Decisão 7 (`carregando: true`, sem violações) | Contador exibido em estado neutro (nem verde nem vermelho); nenhuma lista de violações ainda |
| Carta do rascunho com `numero` desconhecido do catálogo (não teria nome enriquecido) | `buscarNome(numero)` devolve `undefined` | `formatarViolacao` usa o próprio `numero` no texto em vez de falhar | "045: 4 cópias (máx. 3)" (numero no lugar do nome, mesmo fallback de F01 para carta desconhecida) |
| Duas violações simultâneas na mesma carta (`copias_acima_do_maximo` + `alem_do_possuido`) | ambas as condições verdadeiras para o mesmo `numero` | Ambas aparecem na lista, na ordem da Decisão 6; nenhuma suprime a outra | duas linhas de mensagem para a mesma carta |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `validarDeck devolve valido verdadeiro e nenhuma violacao para total quarenta sem excessos`
- `validarDeck devolve total_insuficiente com faltam correto quando total esta abaixo de quarenta`
- `validarDeck devolve total_excedente com excedem correto quando total esta acima de quarenta`
- `validarDeck devolve copias_acima_do_maximo para carta com mais de tres copias no deck`
- `validarDeck devolve alem_do_possuido para carta com quantidade no deck maior que a possuida`
- `validarDeck devolve alem_do_possuido quando a quantidade possuida e zero`
- `validarDeck devolve as duas violacoes simultaneamente quando a carta excede o maximo e a posse`
- `validarDeck ordena as violacoes com total primeiro e depois por numero ascendente`
- `validarDeck devolve resultado neutro coerente para rascunho vazio`
- `formatarViolacao formata cada uma das quatro variantes com os numeros interpolados corretamente`
- `formatarViolacao usa o numero da carta quando buscarNome nao encontra um nome`

### Property-based (fast-check)

- `validarDeck e valido se e somente se nenhuma das quatro condicoes de violacao se aplica a nenhuma entrada` — gera rascunhos e coleções arbitrários e verifica a equivalência lógica entre `valido` e a ausência de qualquer violação, para eliminar divergência entre o cálculo de `violacoes` e o de `valido`.
- `validarDeck nunca muta rascunho nem colecaoJogador recebidos` — compara os mapas de entrada antes/depois da chamada em 1.000 execuções com dados aleatórios.

### Integração

- `apps/web/src/hooks/use-validacao-deck.test.ts`: devolve o estado neutro de carregamento
  enquanto `useColecao` está carregando; devolve o resultado real assim que a coleção chega;
  recalcula quando o rascunho de F05 muda.
- `apps/web/tests/build-deck-validacao.integration.test.tsx`: adicionar cartas em F05 até 40 pinta
  o contador de verde e esvazia a lista de violações; adicionar uma 4ª cópia (bloqueada por F05)
  nunca chega a violar F06, mas um rascunho carregado já inconsistente (mock direto do hook) exibe
  as mensagens específicas.

### Análise estática

- `packages/rules/src/deck/validacao.ts` não importa React, DOM, `fetch`, Supabase nem `node:fs`
  (mesma regra de fronteira que F01/F05 já aplicam a `packages/rules/src/deck/**`).

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---|---|
| O estado válido/inválido reflete simultaneamente: exatamente 40 cartas, ≤3 cópias por carta e apenas cartas possuídas em quantidade suficiente | `validarDeck devolve valido verdadeiro...` + os testes de cada violação individual + `validarDeck e valido se e somente se...` |
| Cada ação de adicionar/remover recalcula o estado em até 100 ms e atualiza a lista de violações específicas | `use-validacao-deck.test.ts` (recalcula quando o rascunho muda) — custo O(n) com `useMemo` síncrono, sem chamada de rede |
| O botão de salvar permanece desabilitado enquanto houver qualquer violação | fora do escopo de teste desta feature — F06 só expõe `valido`; o teste do botão em si pertence a F07 |
| A validação não altera deck nem coleção (é somente leitura) | `validarDeck nunca muta rascunho nem colecaoJogador recebidos` |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Fluxo completo F02 → F04 → F05 → F06 → F07 sem estado inconsistente entre coleção e deck | `build-deck-validacao.integration.test.tsx` cobre o trecho F05↔F06; a ponta com F07 fica marcada como pré-requisito de integração para quando essa spec existir (Wave 5) |
| Somar/subtrair cartas em F05 nunca deixa "no deck + disponível na coleção" maior que a quantidade possuída em F01 | reforçado independentemente por `validarDeck devolve alem_do_possuido...`, como segunda camada de verificação além do bloqueio de F05 |
