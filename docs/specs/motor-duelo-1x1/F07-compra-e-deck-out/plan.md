# Plano de Implementação — Compra e Deck-out

> Spec: `./spec.md`

## Pré-requisitos

- **F06 (Ciclo de Turno e Fases) precisa estar implementada primeiro.** Hoje só existe a spec de
  F06 (`docs/specs/motor-duelo-1x1/F06-ciclo-de-turno-e-fases/spec.md`); `packages/engine/src/turn/`
  ainda não existe no código. Esta feature altera `advance-phase.ts`, um arquivo que F06 cria — sem
  ele, não há o que alterar. Rodar a implementação de F06 antes de iniciar a Fase 1 abaixo.
- União `Action` e `apply(state, action)` (`packages/shared`/`packages/engine`, ambos de F06) — F07
  não acrescenta nenhuma variante nova a `Action`; consome a que já existe (`advance_phase`).
- `hasOpenReactionWindow`, `createEvent` (F02, já implementadas) — reutilizados sem alteração.
- `INITIAL_HAND_SIZE`, `PlayerId`, `DuelState`, `PlayerState`, `Result`, `DomainError` (F01–F06,
  já implementados) — reutilizados sem alteração de forma, só a extensão de `DuelState` descrita
  abaixo.
- **Nenhum contrato externo cross-PRD.** A dependência de F07 na tabela do PRD §8 é só `F06`
  (interna ao mesmo PRD).
- **Pendência assumida sobre F12 (ainda não especificada):** esta feature marca o deck-out como um
  campo de estado (`deckOutPlayer`), mas não declara vencedor/perdedor nem congela o duelo — isso é
  contrato mínimo assumido para F12 consumir quando existir (spec, Decisão 4). Não é bloqueio para
  implementar F07, mas é uma decisão "a confirmar" que deve ser revisitada ao especificar F12.
- **Decisão "a confirmar" sobre onde vive o sinal de deck-out:** campo global em `DuelState`
  (`deckOutPlayer?: PlayerId`) em vez de uma flag por jogador em `PlayerState` (spec, Decisão 3).
  Revisitar se F12 preferir outro formato.

## Fase 1: Sinal de deck-out em `packages/shared`

**1. Campo `deckOutPlayer` em `DuelState`** — Acrescenta o campo opcional `deckOutPlayer?: PlayerId`
ao tipo `DuelState` (`packages/shared/src/duel/types.ts`), sem alterar nenhum campo existente.

**2. Schema correspondente** — Acrescenta `deckOutPlayer: PlayerIdSchema.optional()` a
`DuelStateSchema` (`packages/shared/src/duel/schema.ts`), mantendo o objeto `strict`.

## Fase 2: Lógica de compra em `packages/engine`

**3. Subsistema `draw`** — Cria a pasta `packages/engine/src/draw/` com a lógica pura de compra:
uma função total que completa a mão do jogador ativo até 5 cartas puxando do topo do deck, emite um
evento `onDraw` por carta, e marca `deckOutPlayer` se o deck esgotar antes de completar; e uma
função de fronteira que recusa a chamada quando o estado não está na fase de Compra. Referenciar a
spec (Seção 3 e 4) para o desenho exato das duas funções e sua divisão de responsabilidades.

**4. Predicados de leitura do deck-out** — Acrescenta as funções de consulta que expõem se e para
quem o deck-out ocorreu, no mesmo espírito dos predicados já existentes em `events` e `turn`
(spec, Decisão 7).

**5. Export público do subsistema** — Cria o `index.ts` de `draw` e reexporta o subsistema em
`packages/engine/src/index.ts`, ao lado dos demais (`events`, `prng`, `initialization`, `combat`,
`serialization`, `turn`).

## Fase 3: Integração com o ciclo de turno

**6. Alterar `advance-phase.ts`** — No `case "draw"` do switch interno de `advancePhase` (arquivo
criado por F06), substitui o salto vazio para `"main"` por uma chamada à lógica de compra desta
feature, mesclando os eventos de `onDraw` resultantes com a transição de fase já existente.
Nenhuma outra transição do arquivo é tocada.

**7. Atualizar a documentação do pacote** — Acrescenta o subsistema `draw` ao propósito e à lista
de exports públicos descritos em `packages/engine/README.md`.

## Fase 4: Testes

**8. Testes unitários da compra** — Cobre completar a mão até 5, compra 0 com mão cheia, ordem e
conteúdo dos eventos `onDraw`, deck-out parcial preservando as cartas já compradas, e a recusa de
fronteira fora da fase de Compra — conforme os nomes de caso listados na Seção 7 da spec.

**9. Testes unitários dos predicados de deck-out** — Cobre os dois predicados antes e depois do
campo ser marcado.

**10. Testes de integração com `advance_phase`** — Acrescenta ao arquivo de teste de F06 os três
casos que exercitam a compra através do ciclo de turno completo (mão incompleta, mão já cheia,
deck-out no meio da compra).

**11. Testes de propriedade** — Cobre determinismo e a invariante de que a mão nunca excede 5
nem perde/duplica cartas, para qualquer par mão/deck válido, conforme descrito na Seção 7 da spec.
