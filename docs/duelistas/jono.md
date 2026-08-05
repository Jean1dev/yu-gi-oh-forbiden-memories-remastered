# Jono

> Fonte de dados: `packages/data/data/duelists/jono.json` · Entrada no roster: `jono`

| | |
|---|---|
| Id no jogo original | 3 (`JONO_1`) |
| Mão no original | 5 cartas |
| Dificuldade | `easy` |
| Retrato | `cards-data/art/004.jpg` (Baby Dragon, a carta-assinatura dele) |
| Estratégia da IA | `fm-basic` — ver [Perfil de IA](#perfil-de-ia) |
| Seed do deck | `20261019` |

## Quem é

Contraparte egípcia do Joey Wheeler e o terceiro oponente inicial do Free Duel original. O pool
dele é mais variado que o da Teana — 23 cartas, com pesos bem distribuídos em vez de concentrados
em meia dúzia — mas igualmente fraco: o único monstro acima de 700 de ataque é o **Baby Dragon**
(1200/700), e ele tem 2 chances em 2048 de aparecer em cada sorteio.

O que faz Jono valer a pena não é o deck, é o **pool de drop**: 52 cartas no tier comum, incluindo
`Yamatano Dragon Scroll`, `Kunai with Chain`, `Left Arm of the Forbidden One`, `Time Wizard` e
`Man-eater Bug`. É o primeiro oponente do jogo que compensa farmar.

## Pool de deck

23 cartas, pesos somando 2048.

| Carta | Nome | Tipo | Peso /2048 |
|---|---|---|---|
| `004` | Baby Dragon | Dragon 1200/700 | 2 |
| `009` | Shadow Specter | Zombie 500/200 | 120 |
| `016` | Time Wizard | Spellcaster 500/400 | 2 |
| `029` | Mountain Warrior | Beast-Warrior 600/1000 | 2 |
| `100` | Battle Warrior | Warrior 700/1000 | 2 |
| `123` | Dark Plant | Plant 300/400 | 120 |
| `167` | Ancient Jar | Rock 400/200 | 72 |
| `192` | Key Mace | Fairy 400/300 | 120 |
| `289` | Change Slime | Aqua 400/300 | 120 |
| `339` | Red Medicine | Mágica | 72 |
| `344` | Hinotama | Mágica | 120 |
| `387` | Mystic Lamp | Spellcaster 400/300 | 120 |
| `397` | Leghul | Insect 300/350 | 120 |
| `402` | Monster Eye | Fiend 250/300 | 72 |
| `411` | Bat | Machine 300/350 | 120 |
| `428` | Magician of Faith | Spellcaster 300/400 | 120 |
| `469` | Armed Ninja | Warrior 300/300 | 72 |
| `484` | Ameba | Aqua 300/350 | 120 |
| `504` | Fungi of the Musk | Fiend 400/300 | 120 |
| `547` | Griggle | Plant 350/300 | 120 |
| `548` | Bone Mouse | Zombie 400/300 | 120 |
| `558` | Pot the Trick | Rock 400/400 | 72 |
| `635` | Queen's Double | Warrior 350/300 | 120 |

## Deck canônico (40 cartas)

Seed `20261019`, escolhida entre amostras legítimas por ser a primeira da vizinhança que traz
**Baby Dragon e Time Wizard** juntos. Os dois são as cartas com que o Jono é reconhecido, e cada um
tem 2/2048 de peso — sem escolher a seed, o deck canônico quase nunca os teria, e o oponente
perderia sua única carta memorável.

| Cópias | Carta | Nome | Tipo |
|---|---|---|---|
| 1 | `004` | Baby Dragon | Dragon 1200/700 |
| 1 | `009` | Shadow Specter | Zombie 500/200 |
| 1 | `016` | Time Wizard | Spellcaster 500/400 |
| 1 | `123` | Dark Plant | Plant 300/400 |
| 3 | `167` | Ancient Jar | Rock 400/200 |
| 3 | `289` | Change Slime | Aqua 400/300 |
| 2 | `339` | Red Medicine | Mágica |
| 2 | `344` | Hinotama | Mágica |
| 3 | `387` | Mystic Lamp | Spellcaster 400/300 |
| 2 | `397` | Leghul | Insect 300/350 |
| 3 | `411` | Bat | Machine 300/350 |
| 1 | `428` | Magician of Faith | Spellcaster 300/400 |
| 1 | `469` | Armed Ninja | Warrior 300/300 |
| 3 | `484` | Ameba | Aqua 300/350 |
| 2 | `504` | Fungi of the Musk | Fiend 400/300 |
| 3 | `547` | Griggle | Plant 350/300 |
| 3 | `548` | Bone Mouse | Zombie 400/300 |
| 2 | `558` | Pot the Trick | Rock 400/400 |
| 3 | `635` | Queen's Double | Warrior 350/300 |

36 monstros e 4 mágicas. Maior ataque do deck: **1200** (Baby Dragon, cópia única).

**As mágicas dele também são inertes aqui.** `Red Medicine` (+500 LP) e `Hinotama` (500 de dano)
não estão na `SPELL_EFFECTS` — o motor as aceita numa zona e elas não fazem nada
(`docs/spells/README.md`). São 4 das 40 cartas.

## Pools de drop

| Tier | Origem no original | Cartas | Destaques |
|---|---|---|---|
| `common` | BCD | 52 | Yamatano Dragon Scroll, Kunai with Chain, Left Arm of the Forbidden One, Time Wizard, Man-eater Bug, Cyber-Stein |
| `sa-pow` | SAPow | 56 | + Baby Dragon, Mountain Warrior, Battle Warrior, Great Bill, Takuhee |
| `sa-tec` | SATec | 58 | + Black Pendant, Salamandra, Dark Hole, Vile Germs, Bear Trap |

Como na Teana, só o tier `common` está em uso enquanto o Rating Engine não existir
(`apps/web/src/lib/free-duel/rating-policy.ts`).

## Como ele joga

Mesma IA genérica dos duelistas iniciais do original, sem personalidade própria:

- **Invoca o monstro de maior ataque da mão** e ataca quando o cálculo julga favorável. Com um
  único Baby Dragon no deck, na maioria dos turnos o melhor monstro dele fica na faixa de 400.
- **Não faz fusão relevante**; o pool não tem par que supere o que ele já tem em mão.
- **Não tem equipamento nem terreno** — nada altera o cálculo de combate do lado dele.
- Diferente da Teana, ele tem **monstros de defesa acima de 350** (`Pot the Trick` 400/400,
  `Magician of Faith` 300/400): defender é uma jogada real para ele, não só um último recurso.

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
- [Jono — Yugipedia](https://yugipedia.com/wiki/Jono) e o
  [guia de Jono no GameFAQs](https://gamefaqs.gamespot.com/ps/561010-yu-gi-oh-forbidden-memories/faqs/19146)
  — contexto de personagem e drops notáveis. Ambos bloqueiam fetch automatizado (403); leitura manual.
