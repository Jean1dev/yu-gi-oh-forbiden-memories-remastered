# Sistema de Efeitos de Cartas Mágicas

> Pacotes-alvo: `packages/shared` (vocabulário + tabela), `packages/engine` (interpretador),
> `apps/web` (roteamento de intenção)

Este diretório especifica o efeito concreto de **25 cartas** — 10 equipamentos de buff, 9 mágicas
de efeito imediato e 6 terrenos. Cada família de efeito tem seu próprio arquivo; este README
contém o que é comum a todas: a decisão de arquitetura, o vocabulário de efeitos, a tabela de
roteamento de ações e as decisões transversais.

| Arquivo | Cartas |
| --- | --- |
| [`equip-buffs.md`](./equip-buffs.md) | 301, 303, 304, 305, 307, 308, 311, 314, 315, 657 |
| [`destruction.md`](./destruction.md) | 302, 329, 336, 337 |
| [`spell-removal.md`](./spell-removal.md) | 672 |
| [`life-points.md`](./life-points.md) | 306, 342 |
| [`position-control.md`](./position-control.md) | 320 |
| [`attack-lock.md`](./attack-lock.md) | 348 |
| [`terrains.md`](./terrains.md) | 330, 331, 332, 333, 334, 335 |

---

## 1. Contexto

O motor de duelo está completo (`motor-duelo-1x1` F01–F12), mas nenhuma carta faz nada.
`playSpellOrTrap` apenas estaciona a carta numa zona de magia, `playFieldSpell` só troca
`activeField`, e os três provedores de modificador de combate (`guardian`, `terrain`, `equipment`)
são placeholders que retornam `{ atk: 0, def: 0 }`.

O dataset também não ajuda: as 722 cartas são registros `nome + password + preço`, sem texto de
efeito e sem identificador de efeito. **A semântica de cada carta precisa ser autorada**, e é isso
que este diretório faz.

### Fronteiras

Incluído: as 25 cartas listadas acima, a ação de equipar, a ação de ativar uma mágica de efeito
imediato, e o filtro que restringe `play_field_spell` aos seis terrenos reais.

Fora de escopo: armadilhas (nenhuma das 10 tem efeito aqui), as outras 42 cartas `magica`/
`equipamento` sem entrada na tabela (continuam inertes), fusões, Guardian Stars, e a matriz
terreno×classe (ver [`terrains.md`](./terrains.md)).

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

Sete variantes cobrem as 25 cartas. **Nenhuma é específica de uma carta** — o que muda entre
Legendary Sword e Dragon Treasure é o filtro de classe, não o código.

```ts
type EffectSide = "caster" | "opponent" | "both";

type CardClassFilter =
  | Readonly<{ kind: "any" }>
  | Readonly<{ kind: "classe"; classe: string }>;

type EffectTargets = Readonly<{ side: EffectSide; filter: CardClassFilter }>;

type SpellEffect =
  | Readonly<{ type: "equip_buff"; atk: number; def: number; requires: CardClassFilter }>
  | Readonly<{ type: "destroy_monsters"; targets: EffectTargets }>
  | Readonly<{ type: "destroy_spells"; targets: EffectTargets }>
  | Readonly<{ type: "force_attack_position"; targets: EffectTargets }>
  | Readonly<{ type: "life_points"; side: EffectSide; delta: number }>
  | Readonly<{ type: "attack_lock"; side: EffectSide; turns: number }>
  | Readonly<{ type: "terrain" }>;
```

Duas escolhas de forma que valem registro:

- `life_points` e `attack_lock` recebem um `side` puro, **não** `EffectTargets`. Um filtro de
  classe não significa nada num efeito de jogador, e a disciplina do repositório é tornar estados
  ilegais irrepresentáveis (mesmo motivo do union de `MonsterZone`).
- `terrain` não carrega payload. A matriz terreno×classe ainda é `[]` em `packages/data`, então
  `TerrainModifierProvider` continua neutro; a variante existe apenas para tornar uma carta
  reconhecível como alvo legal de `play_field_spell` (ver [`terrains.md`](./terrains.md)).

`equip_buff` reusa `CardClassFilter` no campo `requires`, para que `matchesClassFilter` seja
escrito uma vez e sirva tanto ao bônus de equipamento quanto às varreduras de destruição.

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
| `tipo: "armadilha"` | `play_spell_or_trap` | face-baixo na zona escolhida | sim (inalterado) |
| `magica`/`equipamento` **sem entrada na tabela** | `play_spell_or_trap` | face-cima, inerte | sim (inalterado) |
| `equip_buff` (10 cartas) | `equip_card` | empilhado em `MonsterZone.equips` do hospedeiro | **não** |
| `terrain` (6 cartas) | `play_field_spell` | substitui `activeField` | n/a |
| efeito imediato (9 cartas) | `activate_spell` | resolve e sai de jogo | **não** |

O fallback "sem entrada na tabela ⇒ posicionamento inerte" é deliberado: mantém as outras 42
cartas de magia/equipamento jogáveis exatamente como hoje, e é o que torna esta feature quase
livre de regressão.

### Recusas de roteamento

| Ação errada | Carta | Código |
| --- | --- | --- |
| `play_spell_or_trap` | `equip_buff` | `equip_requires_target` |
| `play_spell_or_trap` | `terrain` | `terrain_requires_field_zone` |
| `play_spell_or_trap` | efeito imediato | `spell_requires_activation` |
| `equip_card` | qualquer coisa que não seja `equip_buff` | `invalid_equip_card_type` |
| `activate_spell` | qualquer coisa sem efeito imediato | `invalid_activation_card_type` |
| `play_field_spell` | qualquer coisa que não seja `terrain` | `invalid_field_spell_card_type` |

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
aconteceu", igual ao `onSet` de uma carta posicionada. Nenhuma das 25 cartas tem mecânica de
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
| troca forçada de posição | `onFlip` (se estava virado) + `onPositionChange` por monstro |
| equipar | `onSet` com `context: { target: "equip" }` |
| trava de ataque | nenhum evento — é estado lido por `declareAttack` |

Um `onDestroy` por zona, e não um em lote: `duel-cues.ts` monta a cue a partir de
`involvedZones[0]`, então um evento agregado animaria apenas uma destruição.

---

## 7. Divergências do Forbidden Memories original

As descrições das 25 cartas foram fornecidas pelo autor do projeto e são a especificação
normativa. Quatro delas divergem do jogo original, e a divergência é intencional:

| Carta | Neste projeto | No FM original |
| --- | --- | --- |
| 302 Sword of Dark Destruction | destrói todos os Warrior do oponente | equipamento, +500 ATK / −500 DEF em Fiend/Zombie |
| 306 Insect Armor with Laser Cannon | tira 500 LP do oponente | equipamento, buff em Insect |
| 320 Stop Defense | todo monstro em defesa **dos dois lados** vira ataque | um monstro do oponente vira ataque |
| 329 Dragon Capture Jar | destrói todo Dragon **dos dois lados** | vira todos os dragões para defesa |

302 e 306 são `tipo: "equipamento"` no dataset mas têm efeito imediato aqui; por isso são roteadas
por `activate_spell`, não por `equip_card`. O `tipo` do dataset **não** decide o roteamento — a
tabela decide.

**Regra geral de escopo:** quando a descrição diz "todos os monstros" sem nomear o dono, o efeito
alcança **os dois jogadores** (320, 329, 336). Só 302 e 337 dizem explicitamente "do oponente".

### Ausência de atributo no dataset

O `Card` não tem campo de atributo — `classe` é o único eixo de tipo, e seus valores são
`Warrior`, `Dragon`, `Beast`, `Fiend`, `Spellcaster`, `Fairy`, … As descrições de 303 ("tipo Dark")
e 307 ("tipo Luz") foram mapeadas para a classe que a carta realmente afeta no FM. Ver
[`equip-buffs.md`](./equip-buffs.md).
