# Revelação

> Cartas: 350 Dark-piercing Light, e a primeira metade de 348 Swords of Revealing Light
> Efeito: `reveal_face_down` — ver [`README.md`](./README.md) §3

## 1. As cartas

| Nº | Nome | Lado | Texto do jogo original |
| --- | --- | --- | --- |
| 350 | Dark-piercing Light | ambos | "A dazzling light reveals all monsters on the playing field." |
| 348 | Swords of Revealing Light | oponente | "**Enemy monsters are revealed** and your opponent cannot attack for three turns." |

350 não nomeia dono, então alcança os dois lados — inclusive os monstros virados do próprio
lançador ([`README.md`](./README.md) §7). 348 diz "enemy", então só o oponente.

## 2. Decisão — revelar não é mudar de posição

Um monstro `defense_face_down` vira `defense_face_up`. **Continua defendendo.** Um
`attack_face_down` vira `attack_face_up`.

Isso é o contrário do que `nextPosition` faz, e é por isso que existe um `revealPosition` ao lado
dele em `packages/engine/src/position/next-position.ts`:

| Posição | `nextPosition` | `revealPosition` |
| --- | --- | --- |
| `defense_face_down` | `attack_face_up` | `defense_face_up` |
| `attack_face_down` | `defense_face_up` | `attack_face_up` |
| `defense_face_up` | `attack_face_up` | `defense_face_up` |
| `attack_face_up` | `defense_face_up` | `attack_face_up` |

Duas tabelas e não um `if`, porque nos dois casos o mapeamento **é** a regra inteira. Reusar
`nextPosition` faria Dark-piercing Light jogar todo monstro em defesa para ataque, ou seja
transformaria uma carta de informação numa carta de controle de posição — que é o que 320 Stop
Defense faz, e por escolha do lançador ([`position-control.md`](./position-control.md)).

Monstros já virados para cima não são tocados, e nenhum evento é emitido por eles.

## 3. Eventos

Só **`onFlip`**, um por monstro que estava realmente virado, na ordem da varredura (`P1` e depois
`P2`, zonas `0 → 4`).

**Nenhum `onPositionChange`**, porque nenhuma posição de batalha mudou. É a diferença observável
entre esta família e `force_attack_position`, e está fixada em teste.

Um campo sem nada virado é jogada legal: gasta o turno e emite só o `onSet` da ativação.

## 4. 348 é uma `sequence`

O texto de Swords of Revealing Light é literalmente duas coisas ligadas por "and", então a entrada
na tabela é duas:

```ts
"348": {
  type: "sequence",
  effects: [
    { type: "reveal_face_down", targets: { side: "opponent", filter: { kind: "any" } } },
    { type: "attack_lock", side: "opponent", turns: 3 },
  ],
}
```

Na ordem da frase, e resolvidos nessa ordem: cada passo enxerga o estado que o anterior produziu e
os eventos são concatenados. Inventar uma variante `reveal_and_lock` para uma carta seria
exatamente o acoplamento a carta específica que este vocabulário evita
([`README.md`](./README.md) §3).

A trava em si está em [`attack-lock.md`](./attack-lock.md).

## 5. Recusas

Idênticas às de [`destruction.md`](./destruction.md) §4.
