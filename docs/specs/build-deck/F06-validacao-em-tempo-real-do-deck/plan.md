# Plano de Implementação — Validação em Tempo Real do Deck

> Spec: `./spec.md`

## Pré-requisitos

- **`build-deck`/F01 — Coleção do Jogador (Baú).** Fornece `Colecao` e `quantidadePossuida` em
  `packages/rules/src/colecao`, reusados sem redefinição. Tem spec, ainda sem implementação.
- **`build-deck`/F05 — Edição do Deck Ativo.** Fornece `RascunhoDeck`, `totalCartasRascunho` e o
  hook `useRascunhoDeck`. F06 lê o rascunho dela sem reabrir nenhum arquivo já especificado por
  F05. Tem spec, ainda sem implementação.
- Nenhuma pendência de dado externo (guardião, terreno, fusão, drops, rating, balanceamento)
  bloqueia esta feature.

## Fase 1: Núcleo puro de validação

**1. Tipos de violação** — Acrescentar aos tipos de deck já existentes (F05) a união de violações
e o resultado de validação, em `packages/shared`.

**2. Função de validação** — Implementar a função pura que avalia as três regras do PRD (total,
teto de cópias, posse) e produz a lista de violações na ordem determinística definida na spec,
cobrindo o caso de uma mesma carta acumular duas violações.

## Fase 2: Leitura reativa e mensagens

**3. Hook de validação** — Criar o adaptador que combina o rascunho de F05 e a coleção de F01,
recalculando a cada mudança, com o estado neutro enquanto a coleção ainda carrega.

**4. Formatação das mensagens** — Criar a função que traduz cada variante de violação para o texto
correspondente do PRD, resolvendo o nome da carta a partir da coleção enriquecida e caindo de
volta ao número quando o nome não é conhecido.

## Fase 3: Integração de UI

**5. Contador e lista de violações** — Construir o componente que exibe o contador `X/40` colorido
conforme a validade e a lista de violações já formatadas.

**6. Fiação no editor do Build Deck** — Conectar o novo contador à página do Build Deck, ao lado
do editor de F05, sem alterar o comportamento de adicionar/remover cartas.
