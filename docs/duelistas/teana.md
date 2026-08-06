# Teana

> Fonte de dados: `packages/data/data/duelists/teana.json` · Entrada no roster: `teana`

| | |
|---|---|
| Id no jogo original | 2 (`TEANA_1`) |
| Mão no original | 5 cartas |
| Dificuldade | `easy` |
| Retrato | `cards-data/art/395.jpg` (Dancing Elf, uma das cartas dela) |
| Estratégia da IA | `fm-basic` — ver [Perfil de IA](#perfil-de-ia) |
| Seed do deck | `20260817` |

## Quem é

Contraparte egípcia da Téa Gardner e uma das três primeiras oponentes do Free Duel original,
ao lado de Simon Muran e Jono. É, junto com eles, **a duelista mais fraca do jogo**: o pool dela
não tem uma única carta acima de 500 de ataque, não tem equipamento e não tem nada que force uma
fusão. Existe para ensinar o jogo, e é assim que ela deve se comportar aqui.

## Pool de deck

21 cartas, pesos somando 2048. Sete entradas concentram 2020 dos 2048 pontos — é por isso que o
deck sai com muitas cópias repetidas e uma cauda longa de cartas raras de aparecer.

| Carta | Nome | Tipo | Peso /2048 |
|---|---|---|---|
| `009` | Shadow Specter | Zombie 500/200 | 2 |
| `024` | Skull Servant | Zombie 300/200 | **300** |
| `056` | Larvae Moth | Insect 500/400 | 2 |
| `058` | Kuriboh | Fiend 300/200 | **300** |
| `105` | Tomozaurus | Dinosaur 500/400 | 2 |
| `123` | Dark Plant | Plant 300/400 | 2 |
| `167` | Ancient Jar | Rock 400/200 | 2 |
| `192` | Key Mace | Fairy 400/300 | 2 |
| `197` | Mech Mole Zombie | Zombie 500/400 | 2 |
| `278` | Petit Moth | Insect 300/200 | 2 |
| `289` | Change Slime | Aqua 400/300 | 2 |
| `338` | Mooyan Curry | Mágica | **300** |
| `344` | Hinotama | Mágica | 120 |
| `387` | Mystic Lamp | Spellcaster 400/300 | 2 |
| `393` | Zone Eater | Aqua 250/200 | **400** |
| `394` | Steel Scorpion | Machine 250/300 | 2 |
| `395` | Dancing Elf | Fairy 300/200 | **300** |
| `397` | Leghul | Insect 300/350 | 2 |
| `398` | Ooguchi | Aqua 300/250 | 2 |
| `399` | Swordsman from a Foreign Land | Warrior 250/250 | **300** |
| `402` | Monster Eye | Fiend 250/300 | 2 |

## Deck canônico (40 cartas)

Seed `20260817`, escolhida entre amostras legítimas por cobrir 20 das 21 cartas do pool — a
amostra mais variada da vizinhança, para o duelo não virar sempre a mesma sequência de três
monstros.

| Cópias | Carta | Nome | Tipo |
|---|---|---|---|
| 2 | `009` | Shadow Specter | Zombie 500/200 |
| 3 | `024` | Skull Servant | Zombie 300/200 |
| 2 | `056` | Larvae Moth | Insect 500/400 |
| 3 | `058` | Kuriboh | Fiend 300/200 |
| 2 | `105` | Tomozaurus | Dinosaur 500/400 |
| 1 | `123` | Dark Plant | Plant 300/400 |
| 2 | `167` | Ancient Jar | Rock 400/200 |
| 2 | `192` | Key Mace | Fairy 400/300 |
| 1 | `278` | Petit Moth | Insect 300/200 |
| 1 | `289` | Change Slime | Aqua 400/300 |
| 3 | `338` | Mooyan Curry | Mágica |
| 3 | `344` | Hinotama | Mágica |
| 1 | `387` | Mystic Lamp | Spellcaster 400/300 |
| 3 | `393` | Zone Eater | Aqua 250/200 |
| 1 | `394` | Steel Scorpion | Machine 250/300 |
| 3 | `395` | Dancing Elf | Fairy 300/200 |
| 2 | `397` | Leghul | Insect 300/350 |
| 1 | `398` | Ooguchi | Aqua 300/250 |
| 3 | `399` | Swordsman from a Foreign Land | Warrior 250/250 |
| 1 | `402` | Monster Eye | Fiend 250/300 |

34 monstros e 6 mágicas. Maior ataque do deck: **500** (Shadow Specter, Larvae Moth, Tomozaurus).

**As duas mágicas dela são inertes neste projeto.** `Mooyan Curry` (+200 LP) e `Hinotama`
(500 de dano) não estão na `SPELL_EFFECTS` (`packages/shared/src/duel/spell-effects/table.ts`) —
o motor as aceita numa zona de magia e elas não fazem nada, que é o comportamento declarado para
carta sem efeito especificado (`docs/spells/README.md`). São 6 das 40 cartas dela: na prática o
deck joga como 34 monstros e 6 cartas mortas, o que reforça o papel de oponente inicial.

## Pools de drop

| Tier | Origem no original | Cartas | Destaques |
|---|---|---|---|
| `common` | BCD | 17 | Right Arm of the Forbidden One, Sword of Dark Destruction, Forest, Milus Radiant |
| `sa-pow` | SAPow | 19 | + Mask of Darkness, Yormungarde, Trakadon, Patrol Robo |
| `sa-tec` | SATec | 23 | + Dark Hole, Final Flame, Horn of Light, Silver Bow and Arrow, Eatgaboon |

Hoje o Rating Engine ainda não existe e a política de recompensa pede sempre o tier `common`
(`apps/web/src/lib/free-duel/rating-policy.ts`), então só a coluna BCD está em uso. `sa-pow` e
`sa-tec` já estão gravados para quando a nota do duelo passar a escalonar a raridade.

## Como ela joga

No original, Teana usa a IA genérica dos duelistas iniciais, sem nenhuma personalidade própria:

- **Invoca o monstro de maior ataque da mão**, um por turno, e ataca sempre que o cálculo do turno
  julga favorável. Com um teto de 500 de ataque, quase nada no deck dela vence um monstro comum do
  jogador.
- **Não faz fusão relevante** — o pool não tem par que resulte em algo mais forte que os 500 de
  ataque que ela já tem.
- **Não tem equipamento nem terreno** no deck: nada que altere o cálculo de combate.
- **Não protege LP**: sem carta de defesa jogável, ela depende só de pôr monstros em defesa.

Traduzindo para o nosso motor: ela deve invocar, virar para defesa quando estiver atrás, atacar
quando o ataque vencer o alvo, e **não** tentar jogar as duas mágicas inertes (gastariam zona sem
efeito).

## Perfil de IA

```json
{ "strategy": "fm-basic", "parameters": { "aggression": 0.5, "playsSpells": true, "playsFieldSpells": false, "defensiveThreshold": 0 } }
```

`fm-basic` escolhe a melhor jogada visível sem erro proposital: invoca o monstro mais forte,
defende quando não vence a troca e ataca apenas quando tem vantagem. Magias só são usadas quando
possuem efeito conhecido pelo motor.

## Fontes

- [`sg4e/YGOFM-gamedata`](https://github.com/sg4e/YGOFM-gamedata) — pools e algoritmo de geração de
  deck (`Pool.java`, `Duelist.java`), datamine verificado contra dumps de memória de emulador.
- [Teana — Yu-Gi-Oh! Forbidden Memories Wiki](https://yugioh-forbidden-memories.fandom.com/wiki/Teana)
  e [Teana — Yugipedia](https://yugipedia.com/wiki/Teana) — contexto de personagem. Ambos bloqueiam
  fetch automatizado (402/403); leitura manual.
