# Trava de Ataque

> Carta: 348 Swords of Revealing Light
> Efeito: `attack_lock` — ver [`README.md`](./README.md) §3

## 1. A carta

| Nº | Nome | Lado | Turnos |
| --- | --- | --- | --- |
| 348 | Swords of Revealing Light | oponente | 3 |

O oponente não pode declarar ataque durante os três turnos seguintes dele.

## 2. Novo campo de estado

```ts
type AttackLock = Readonly<{ player: PlayerId; untilTurn: number }>;

// em DuelState:
attackLocks?: readonly AttackLock[] | undefined;
```

Opcional e no topo do estado, seguindo o precedente de `pending`, `deckOutPlayer` e `outcome` no
mesmo tipo. Um array de no máximo duas entradas, e não um `Record<PlayerId, number>`, para manter
o estado JSON-limpo sem chaves opcionais dentro de um `strictObject`.

`untilTurn` é o primeiro `DuelState.turn` em que o jogador travado volta a poder atacar.

## 3. A aritmética dos três turnos

`advancePhase` incrementa `turn` **por turno de jogador**, não por rodada, e os jogadores
alternam. O lançador sempre joga 348 no próprio turno `T` (a ação roda na fase principal e sempre
como `activePlayer`), então os três turnos seguintes do oponente são `T+1`, `T+3` e `T+5`.

```
untilTurn = state.turn + turns * TURNS_PER_ROUND     // 3 * 2 = 6
```

`declareAttack` recusa enquanto `state.turn < untilTurn`. Isso bloqueia `T+1` até `T+5`, e o
primeiro ataque legal do oponente é em `T+7` — o turno dele depois de `T+6`, que é do lançador.
Exatamente três turnos dele pulados.

`TURNS_PER_ROUND = 2` vive em `packages/shared/src/duel/constants.ts`, com comentário explicando o
contador por turno de jogador, para que o `* 2` nunca seja um número mágico solto.

## 4. Expiração e relançamento

**Não há varredura de expiração.** Uma trava vencida é apenas um número obsoleto comparado contra
um `turn` monotonicamente crescente. Deixá-la é determinístico, não aloca nada e é limitado a duas
entradas — mais barato e mais simples que limpar em `advancePhase`.

**Relançar substitui a entrada** do mesmo jogador por `state.turn + 6`, que é sempre maior que a
anterior. Ou seja: um novo Swords reinicia a contagem dos três turnos a partir do momento em que
foi lançado, nunca a encurta.

## 5. Comportamento

**Ação:** `activate_spell { handIndex }`. Consome a jogada da mão; a carta resolve e sai de jogo.
A trava é estado, não uma carta permanente no campo — não há zona ocupada para o oponente destruir
com 672.

**Recusa de ataque:** `declareAttack` ganha um guard com o código `attack_locked_by_effect`,
posicionado **depois** de `first_turn_attack_forbidden` e **antes** de `attacker_zone_empty`. A
ordem importa: a recusa é sobre o jogador, não sobre a zona, então ela precisa vir antes de
qualquer validação de zona para que a mensagem faça sentido.

O lançador continua atacando normalmente nos próprios turnos — a trava é por jogador.

**Sem evento.** A trava é estado lido por `declareAttack`; nada assina uma mudança nela. O `onSet`
da ativação é o único evento emitido.

**Projeção pública:** `attackLocks` é repassado por `getPublicDuelState`, porque a UI precisa
desabilitar o botão "Atacar" enquanto a trava vale.

## 6. Recusas

| Cenário | Código |
| --- | --- |
| Declarar ataque com a trava ativa | `attack_locked_by_effect` |
| Demais | idênticas às de [`destruction.md`](./destruction.md) §3 |
