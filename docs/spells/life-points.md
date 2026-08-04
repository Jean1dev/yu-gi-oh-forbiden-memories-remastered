# Mudança de Life Points

> Cartas: 306, 342
> Efeito: `life_points` — ver [`README.md`](./README.md) §3

## 1. As cartas

| Nº | Nome | Lado | Delta | `tipo` no dataset |
| --- | --- | --- | --- | --- |
| 306 | Insect Armor with Laser Cannon | oponente | −500 | `equipamento` |
| 342 | Dian Keto the Cure Master | lançador | +1000 | `magica` |

**306 é uma divergência do FM** (lá é um equipamento de buff para Insect) e, apesar de ser
`tipo: "equipamento"`, é roteada por `activate_spell`. Ver [`README.md`](./README.md) §7.

## 2. Comportamento

**Ação:** `activate_spell { handIndex }`. Consome a jogada da mão; a carta resolve e sai de jogo.

**Dano (306):** `lp = Math.max(0, lp - 500)`. O piso em zero espelha exatamente o que
`resolveAttack` já faz, e `PlayerStateSchema` também impõe `min(0)`.

**Cura (342):** `lp = lp + 1000`, sem teto. Não há LP máximo em `DuelState` — 8000 é apenas o
valor inicial (`INITIAL_LP`), não um limite. Um jogador pode passar de 8000.

**Fim de duelo automático.** `stampOutcome` roda depois de toda transição bem-sucedida em `apply`,
então um 306 que zera o oponente encerra o duelo com `reason: "lp_depleted"` na mesma transição,
sem nenhuma fiação extra nesta feature. O estado devolvido carrega `outcome` **e** `pending` ao
mesmo tempo; isso é inerte, porque `apply` recusa toda ação com `outcome` presente. Vale um teste
explícito, para ninguém "consertar" isso depois suprimindo a janela.

## 3. Eventos

Os dois emitem `onDamage`, com `amount` sempre **positivo** e a direção em `kind`:

| Carta | Evento |
| --- | --- |
| 306 | `onDamage`, `context: { toPlayer: <oponente>, amount: 500, kind: "effect_damage" }` |
| 342 | `onDamage`, `context: { toPlayer: <lançador>, amount: 1000, kind: "effect_heal" }` |

`EVENT_TYPES` continua fechado em dez tipos — a justificativa para reusar `onDamage` em vez de
criar `onLifePointsChange` está em [`README.md`](./README.md) §6.

`duel-cues.ts` mapeia `effect_heal` para nenhuma cue: o número de LP simplesmente sobe, sem o
flash vermelho de dano. Uma cue verde dedicada de cura é trabalho de acompanhamento, fora desta
feature.

## 4. Recusas

Idênticas às de [`destruction.md`](./destruction.md) §3.
