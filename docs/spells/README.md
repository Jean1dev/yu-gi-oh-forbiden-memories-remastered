# Sistema de Efeitos de Cartas Mágicas

> Pacotes-alvo: `packages/shared` (vocabulário + tabela), `packages/engine` (interpretador),
> `apps/web` (roteamento de intenção)

Este diretório especifica o efeito concreto das **67 cartas `magica`/`equipamento`** do dataset —
34 equipamentos, 27 mágicas de efeito imediato e 6 terrenos. Cada família de efeito tem seu
próprio arquivo; este README contém o que é comum a todas: a decisão de arquitetura, o vocabulário
de efeitos, a tabela de roteamento de ações e as decisões transversais.

| Arquivo | Cartas |
| --- | --- |
| [`equip-buffs.md`](./equip-buffs.md) | os 34 equipamentos |
| [`destruction.md`](./destruction.md) | 329, 336, 337, 653, 656, 660, 661, 662, 663, 664 |
| [`spell-removal.md`](./spell-removal.md) | 672 |
| [`life-points.md`](./life-points.md) | 338, 339, 340, 341, 342, 343, 344, 345, 346, 347 |
| [`stat-curse.md`](./stat-curse.md) | 349, 655, 669 |
| [`reveal.md`](./reveal.md) | 350, e a primeira metade de 348 |
| [`position-control.md`](./position-control.md) | 320 |
| [`attack-lock.md`](./attack-lock.md) | 348 |
| [`terrains.md`](./terrains.md) | 330, 331, 332, 333, 334, 335 |

Fora de escopo, e ainda inertes: as **10 armadilhas** e as **24 cartas de ritual**, que não têm
mecânica de ativação nenhuma no motor.

---

## 1. Contexto

`spells/F01` especificou 25 cartas contra o texto do TCG, porque o dataset não ajudava: as 722
cartas são registros `nome + password + preço`, sem texto de efeito e sem identificador de efeito,
e a semântica parecia ter de ser autorada à mão.

**`spells/F02` descobriu que ela pode ser extraída.** `packages/data/scripts/extract-fm-duelist.ts`
já baixava `sg4e/YGOFM-gamedata` — um datamine do jogo original verificado contra dumps de memória
de emulador — para as pools de duelista. O mesmo repositório publica, no mesmo `cardId` que este
projeto usa como `numero`:

| Tabela | O que resolve |
| --- | --- |
| `cardinfo` | o texto **do jogo original** das 722 cartas, e o atributo/nível de cada monstro |
| `equipinfo` | 4041 pares: a compatibilidade exata de cada um dos 34 equipamentos |

Por isso o Forbidden Memories passou a ser a regra normativa, e as 25 cartas de F01 foram
realinhadas junto com as outras 42 (ver §7).

### Fronteiras

Incluído: as 67 cartas `magica`/`equipamento`, a ação de equipar, a ação de ativar uma mágica de
efeito imediato (com ou sem alvo), e o filtro que restringe `play_field_spell` aos seis terrenos
reais.

Fora de escopo: armadilhas (nenhuma das 10 tem efeito), as 24 cartas de ritual, fusões, Guardian
Stars, e a matriz terreno×classe (ver [`terrains.md`](./terrains.md)).

---

## 2. Decisão de arquitetura

### ADR-S1 — O interpretador de efeitos vive em `packages/engine`, não em `packages/rules`

`docs/arquitetura.md` §3.4 previa o Effect System em `packages/rules`, com um
`registry: Record<TipoEvento, EffectHandler[]>`. **Isso não é implementável hoje.**

- `packages/engine/package.json` declara uma única dependência: `@yugioh/shared`.
- A regra `engine-depends-only-on-shared` do `.dependency-cruiser.cjs` (severity `error`) proíbe
  `packages/engine → packages/rules`.
- `apply(state, action)` precisa continuar sendo uma função pura de **dois** parâmetros
  (`motor-duelo-1x1/F09` spec Decisão 2, determinismo entre o nó que constrói a ação e o nó que a
  revalida), então não há terceiro parâmetro por onde injetar provedores reais.

**Decisão:** o *vocabulário e a tabela* de efeitos ficam em
`packages/shared/src/duel/spell-effects/` — dado puro, um `Record` congelado, que é exatamente o
papel de `shared`, e que satisfaz a regra `duel-state-is-pure` porque não importa nada fora de
`shared`. O *interpretador* fica em `packages/engine/src/spells/effects/`.

### ADR-S2 — A tabela precisa estar em `shared`, não em `engine`

`apps/web/src/lib/free-duel/duel-interaction.ts` tem de saber se uma carta na mão é um equipamento
(pede alvo), um terreno ou um efeito imediato, para rotear a máquina de intenções. Essa máquina
**não pode importar `@yugioh/engine`**: `scripts/check-duel-engine-boundary.mjs` restringe esse
import a `duel-runtime.ts` e roda dentro de `pnpm lint`.

A alternativa seria enfiar uma porta `SpellEffectLookup` de `duel-runtime.ts` através de
`useDuelInteraction` até cada chamada de reducer puro — muita fiação para um dado estático.
Colocando a tabela em `shared`, `engine`, `rules`, `ai` e `apps/web` enxergam todos a mesma
verdade.

`packages/data` seria o lar natural da tabela (é onde vivem `fusions.json` e a matriz de terreno),
mas `engine` também não pode importar `data`.

---

## 3. O vocabulário de efeitos

Onze variantes atômicas cobrem as 67 cartas. **Nenhuma é específica de uma carta** — o que muda
entre Warrior Elimination e Stain Storm é o filtro de classe, não o código.

```ts
type EffectSide = "caster" | "opponent" | "both";

type CardClassFilter =
  | Readonly<{ kind: "any" }>
  | Readonly<{ kind: "classe"; classe: string }>;

type EffectTargets = Readonly<{ side: EffectSide; filter: CardClassFilter }>;

const POWER_PER_LEVEL = 500;

type AtomicSpellEffect =
  | Readonly<{ type: "equip_buff"; atk: number; def: number }>
  | Readonly<{ type: "destroy_monsters"; targets: EffectTargets }>
  | Readonly<{ type: "destroy_spells"; targets: EffectTargets }>
  | Readonly<{ type: "destroy_by_atk"; targets: EffectTargets; minAtk: number }>
  | Readonly<{ type: "force_attack_position"; targets: EffectTargets }>
  | Readonly<{ type: "reveal_face_down"; targets: EffectTargets }>
  | Readonly<{ type: "stat_curse"; targets: EffectTargets; levels: number }>
  | Readonly<{ type: "cleanse_curses"; side: EffectSide }>
  | Readonly<{ type: "life_points"; side: EffectSide; delta: number }>
  | Readonly<{ type: "attack_lock"; side: EffectSide; turns: number }>
  | Readonly<{ type: "terrain" }>;

type SpellEffect =
  | AtomicSpellEffect
  | Readonly<{ type: "sequence"; effects: readonly AtomicSpellEffect[] }>;
```

Quatro escolhas de forma que valem registro:

- **`equip_buff` não carrega restrição.** Quais monstros aceitam um equipamento é uma lista curada
  carta a carta pelo jogo original, e mora em `equip-compatibility.ts`, gerada a partir do
  `equipinfo` (ver [`equip-buffs.md`](./equip-buffs.md) §2).
- `life_points`, `attack_lock` e `cleanse_curses` recebem um `side` puro, **não** `EffectTargets`.
  Um filtro de classe não significa nada num efeito que alcança um jogador em vez de uma carta, e
  a disciplina do repositório é tornar estados ilegais irrepresentáveis (mesmo motivo do union de
  `MonsterZone`).
- **`sequence` carrega `AtomicSpellEffect`, não `SpellEffect`.** A união fica não recursiva e o
  `z.discriminatedUnion` continua direto, sem `z.lazy`; uma sequence de sequences não compraria
  nada. Só 348 precisa dela — "revela **e** trava".
- `terrain` não carrega payload. A matriz terreno×classe ainda é `[]` em `packages/data`, então
  `TerrainModifierProvider` continua neutro; a variante existe apenas para tornar uma carta
  reconhecível como alvo legal de `play_field_spell` (ver [`terrains.md`](./terrains.md)).

### `POWER_PER_LEVEL`, e como ele foi descoberto

O texto de **657 Megamorph** no jogo original é *"A card that increases the power of any selected
monster by 2 levels"*, e Megamorph é o único equipamento que dá +1000/+1000 em vez de +500/+500.
Isso fixa **1 level = 500 ATK/DEF**, e é essa conversão que decodifica sozinha as três cartas de
maldição: 669 Shadow Spell *"decreases an opponent's in-play monsters by two levels"* (−1000), 349
Spellbinding Circle (uma level, −500) e 655 Cursebreaker *"sets them at level 0"*.

### Consulta

`getSpellEffect(numero)` usa `Object.hasOwn`, nunca um índice cru. `resolve-art.test.ts` já é um
flake conhecido do repositório por fast-check sortear chaves de protótipo (`valueOf`, `toString`)
— o erro não se repete aqui.

---

## 4. Roteamento de ações

O motor ganha **duas** ações novas, e a classificação de uma carta vem da tabela, nunca do `tipo`
sozinho.

| Carta | Ação correta | Resultado | Ocupa zona? |
| --- | --- | --- | --- |
| `tipo: "armadilha"` ou `"ritual"` | `play_spell_or_trap` | face-baixo/face-cima, inerte | sim (inalterado) |
| `equip_buff` (34 cartas) | `equip_card` | empilhado em `MonsterZone.equips` do hospedeiro | **não** |
| `terrain` (6 cartas) | `play_field_spell` | substitui `activeField` | n/a |
| efeito imediato (27 cartas) | `activate_spell` | resolve e sai de jogo | **não** |

O fallback "sem entrada na tabela ⇒ posicionamento inerte" continua existindo, mas agora só
alcança as 10 armadilhas e as 24 cartas de ritual.

### Recusas de roteamento

| Ação errada | Carta | Código |
| --- | --- | --- |
| `play_spell_or_trap` | `equip_buff` | `equip_requires_target` |
| `play_spell_or_trap` | `terrain` | `terrain_requires_field_zone` |
| `play_spell_or_trap` | efeito imediato | `spell_requires_activation` |
| `equip_card` | qualquer coisa que não seja `equip_buff` | `invalid_equip_card_type` |
| `activate_spell` | qualquer coisa sem efeito imediato | `invalid_activation_card_type` |
| `play_field_spell` | qualquer coisa que não seja `terrain` | `invalid_field_spell_card_type` |

### Efeitos com alvo

`ActivateSpellAction` carrega um `targetZone` **opcional**, exigido exatamente quando
`requiresSpellTarget(effect)` diz que sim — hoje, só 320 Stop Defense. Opcional em vez de uma
ação separada porque todas as outras guardas, todos os eventos e todo o caminho de consumo são
idênticos; só a resolução lê a zona.

| Cenário | Código |
| --- | --- |
| Efeito com alvo, sem `targetZone` | `spell_requires_target` |
| Efeito sem alvo, com `targetZone` | `spell_target_not_allowed` |
| `targetZone` não é zona de monstro | `spell_target_not_monster_zone` |
| `targetZone` num lado que o efeito não alcança | `spell_target_out_of_reach` |
| `targetZone` vazia | `spell_target_zone_empty` |
| Alvo não está em defesa | `spell_target_not_defending` |

`apps/web` refaz essas mesmas condições em `isLegalSpellTarget` para nunca oferecer uma zona que
o motor recusaria, e o AI enumera uma jogada por zona legal — a duplicação existe porque
`apps/web` não pode importar `@yugioh/engine` (`scripts/check-duel-engine-boundary.mjs`).

### `activate_spell` separada de `play_spell_or_trap`

`PlaySpellOrTrapAction` exige `zoneIndex`, e um efeito imediato não ocupa zona nenhuma. Reusar
aquela ação significaria um campo permanentemente ignorado e checagens `zone_occupied` /
`no_space_for_card` falsas numa carta que nunca ocupa. Uma ação dedicada mantém a pós-condição de
cada ação com um único valor ("`play_spell_or_trap` sempre termina com a carta numa zona de
magia") e deixa o corpo já testado de `playSpellOrTrap` quase intacto.

---

## 5. Ordem de resolução e a janela de reação

O efeito resolve **antes** da janela de reação abrir:

```
1. guards (jogada da mão, carta presente, roteamento correto, alvo válido)
2. remove a carta da mão
3. resolve o efeito, coletando os eventos da resolução
4. marca a jogada da mão como usada
5. monta o evento onSet que descreve a jogada
6. abre a janela de reação sobre o oponente
7. devolve ok({ state, events: [onSet, ...eventosDaResolucao] })
```

Isso não é preferência de estilo. Quatro razões, todas verificáveis no repositório:

1. **Não existe ação de continuação, e o orquestrador entregue engoliria o efeito em silêncio.**
   `apply` conhece exatamente um consumidor de janela: `dispatch` testa
   `state.pending?.event.type !== "onAttackDeclared"` antes de `resolve_attack`
   (`packages/engine/src/turn/apply.ts`). E `settlePendingWindow`
   (`apps/web/src/lib/free-duel/duel-session.ts`) fecha **qualquer** janela que não seja
   `onAttackDeclared` com um `closeReactionWindow` cru e segue adiante. Se a resolução fosse
   adiada para um hipotético `resolve_spell`, toda magia seria descartada sem efeito na UI que
   está no ar.
2. **`openReactionWindow` recusa uma segunda janela**
   (`packages/engine/src/events/reaction-window.ts`), então "abrir e depois resolver" exigiria
   fechar antes — ou seja, a janela não estaria realmente aberta durante a resolução.
3. **Os eventos precisam viajar num único `ApplyResult.events`.** `submitPlayerAction` devolve
   `result.value.events` uma vez só, e a UI anima esse array; separar o `onSet` dos
   `onDestroy`/`onDamage` em duas chamadas de `apply` dessincronizaria a fila de cues.
4. **`stampOutcome` roda depois de toda transição bem-sucedida.** Resolver primeiro faz um efeito
   letal encerrar o duelo na mesma transição, sem fiação extra.

**Consequência a assumir:** a janela aberta por uma magia é **informativa** — publica "isto já
aconteceu", igual ao `onSet` de uma carta posicionada. Nenhuma das 67 cartas tem mecânica de
chain/counter, então nada se perde. Quando o efeito é letal, o estado devolvido carrega `outcome`
e `pending` ao mesmo tempo; isso é inerte, porque `apply` recusa tudo com `outcome` presente.

### Determinismo das varreduras

Todo efeito que varre o campo itera **`P1` e depois `P2`, zonas `0 → 4`**, independente de quem
lançou a carta. Fixo e independente do lançador, o que torna a ordem dos eventos trivialmente
verificável em teste. Todas as escritas passam por `replaceZone`.

---

## 6. Eventos

`EVENT_TYPES` continua **fechado em dez tipos**. A lista está fixada em três lugares (PRD
`motor-duelo-1x1` F02, `docs/arquitetura.md` §3.3 e `packages/shared/src/duel/constants.ts`);
estendê-la por causa de uma carta de cura seria desproporcional.

Em vez disso, `onDamage` ganha um discriminador no `context`:

```ts
const LP_CHANGE_KINDS = ["battle_damage", "effect_damage", "effect_heal"] as const;
```

`amount` é sempre uma **magnitude positiva**; a direção e a origem vivem em `kind`. O dano de
combate em `resolveAttack` passa a emitir `kind: "battle_damage"`. A alternativa — `amount` com
sinal — seria pior: `duel-cues.ts` dispararia um flash vermelho de dano numa cura, e o significado
de `amount` mudaria silenciosamente para todos os consumidores existentes.

| Efeito | Eventos |
| --- | --- |
| destruição de monstro/magia | um `onDestroy` **por zona**, com `context: { cause: "spell", by: <numero> }` |
| mudança de LP | `onDamage` com `{ toPlayer, amount, kind }` |
| troca forçada de posição | `onFlip` (se estava virado) + `onPositionChange`, no alvo escolhido |
| revelação | só `onFlip`, por monstro que estava virado — a postura não muda |
| equipar | `onSet` com `context: { target: "equip" }` |
| trava de ataque | nenhum evento — é estado lido por `declareAttack` |
| maldição e sua remoção | nenhum evento — é estado lido pelos provedores de combate |

Um `onDestroy` por zona, e não um em lote: `duel-cues.ts` monta a cue a partir de
`involvedZones[0]`, então um evento agregado animaria apenas uma destruição.

---

## 7. A fonte normativa: o jogo original

A regra de cada carta é o **texto do Forbidden Memories**, lido da tabela `cardinfo` de
`sg4e/YGOFM-gamedata` (ver §1). Onde o TCG discorda, o original vence, e
`cards-data/enriquecimento-ygoprodeck.json` carrega o texto correspondente para o quadro de carta
concordar com o que a carta faz.

Foi essa troca de fonte que reverteu as quatro divergências que `spells/F01` havia registrado como
intencionais, mais quatro números que estavam no valor do TCG:

| Carta | Em F01 (texto TCG) | Agora (jogo original) |
| --- | --- | --- |
| 302 Sword of Dark Destruction | destruía todos os Warrior do oponente | equipamento +500/+500 |
| 306 Insect Armor with Laser Cannon | tirava 500 LP do oponente | equipamento +500/+500 |
| 320 Stop Defense | todo monstro em defesa dos dois lados | **um** monstro do oponente, escolhido |
| 329 Dragon Capture Jar | destruía todo Dragon dos dois lados | destrói os Dragon **do oponente** |
| 304 Axe of Despair | +1000/+1000 | +500/+500 |
| 305 Laser Cannon Armor | +0/+500 | +500/+500 |
| 314 Horn of the Unicorn | +700/+700 | +500/+500 |
| 342 Dian Keto the Cure Master | +1000 LP | **+5000 LP** |

A linha de queima também é bem mais baixa que a do TCG: Sparks tira 50 (não 200), Hinotama 100,
Final Flame 200, Ookazi 500. E Soul of the Pure cura 2000 (não 800).

### O `tipo` do dataset nunca decide o roteamento

302 e 306 voltaram a ser equipamentos, mas isso é coincidência: o dataset não distingue 337
Raigeki de 330 Forest — as duas são `tipo: "magica"`, `classe: "Magic"` — então a tabela é o único
discriminador possível, e continua sendo ela quem decide.

### Regra de lado

Quando o texto do jogo nomeia o dono ("an opponent's Machine monsters", "all opponent Dragon
monsters"), o efeito é `opponent`. Quando não nomeia ("Sucks up every card in play", "Eliminates
all Zombie creatures", "reveals all monsters on the playing field"), alcança `both` — inclusive os
monstros do próprio lançador.

**Regra geral de escopo:** quando a descrição diz "todos os monstros" sem nomear o dono, o efeito
alcança **os dois jogadores** (320, 329, 336). Só 302 e 337 dizem explicitamente "do oponente".

### Ausência de atributo no dataset

O `Card` não tem campo de atributo — `classe` é o único eixo de tipo, e seus valores são
`Warrior`, `Dragon`, `Beast`, `Fiend`, `Spellcaster`, `Fairy`, … As descrições de 303 ("tipo Dark")
e 307 ("tipo Luz") foram mapeadas para a classe que a carta realmente afeta no FM. Ver
[`equip-buffs.md`](./equip-buffs.md).
