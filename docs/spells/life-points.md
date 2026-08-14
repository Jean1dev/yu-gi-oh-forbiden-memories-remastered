# Mudança de Life Points

> Cartas: 338–347 (cinco de cura, cinco de queima)
> Efeito: `life_points` — ver [`README.md`](./README.md) §3

## 1. As cartas

| Nº | Nome | Lado | Delta |
| --- | --- | --- | --- |
| 338 | Mooyan Curry | lançador | +200 |
| 339 | Red Medicine | lançador | +500 |
| 340 | Goblin's Secret Remedy | lançador | +1000 |
| 341 | Soul of the Pure | lançador | +2000 |
| 342 | Dian Keto the Cure Master | lançador | **+5000** |
| 343 | Sparks | oponente | −50 |
| 344 | Hinotama | oponente | −100 |
| 345 | Final Flame | oponente | −200 |
| 346 | Ookazi | oponente | −500 |
| 347 | Tremendous Fire | oponente | −1000 |

**Estes são os números do jogo original, e quase nenhum bate com o TCG.** Sparks tira 50 e não
200; Goblin's Secret Remedy cura 1000 e não 600; Soul of the Pure cura 2000 e não 800; Dian Keto
cura 5000 e não 1000. E Tremendous Fire **não** cobra 500 do lançador aqui — no original ele só
queima o oponente, o que é o que o mantém um `life_points` simples em vez de uma `sequence`.

A escada de queima é deliberadamente baixa: cinco cartas de 50 a 1000 contra 8000 de LP inicial.
Nenhuma delas ganha um duelo sozinha, o que é o motivo de a maior cura valer cinco vezes a maior
queima.

## 2. Comportamento

**Ação:** `activate_spell { handIndex }`. Consome a jogada da mão; a carta resolve e sai de jogo.

**Dano:** `lp = Math.max(0, lp + delta)`. O piso em zero espelha exatamente o que `resolveAttack`
já faz, e `PlayerStateSchema` também impõe `min(0)`.

**Cura:** sem teto. Não há LP máximo em `DuelState` — 8000 é apenas o valor inicial (`INITIAL_LP`),
não um limite. Dian Keto leva um jogador intacto a 13000.

**Fim de duelo automático.** `stampOutcome` roda depois de toda transição bem-sucedida em `apply`,
então uma queima que zera o oponente encerra o duelo com `reason: "lp_depleted"` na mesma
transição, sem nenhuma fiação extra nesta feature. O estado devolvido carrega `outcome` **e**
`pending` ao mesmo tempo; isso é inerte, porque `apply` recusa toda ação com `outcome` presente.
Vale um teste explícito, para ninguém "consertar" isso depois suprimindo a janela.

## 3. Eventos

Todas emitem `onDamage`, com `amount` sempre **positivo** e a direção em `kind`:

| Carta | Evento |
| --- | --- |
| 346 Ookazi | `onDamage`, `context: { toPlayer: <oponente>, amount: 500, kind: "effect_damage" }` |
| 342 Dian Keto | `onDamage`, `context: { toPlayer: <lançador>, amount: 5000, kind: "effect_heal" }` |

`EVENT_TYPES` continua fechado em dez tipos — a justificativa para reusar `onDamage` em vez de
criar `onLifePointsChange` está em [`README.md`](./README.md) §6.

`duel-cues.ts` mapeia `effect_heal` para nenhuma cue: o número de LP simplesmente sobe, sem o
flash vermelho de dano. Uma cue verde dedicada de cura é trabalho de acompanhamento, fora desta
feature.

## 4. Recusas

Idênticas às de [`destruction.md`](./destruction.md) §4.
