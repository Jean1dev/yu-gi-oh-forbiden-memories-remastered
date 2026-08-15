# Forest Mage

> Fonte de dados: `packages/data/data/duelists/forest-mage.json` · Entrada no roster: `forest-mage`

| | |
|---|---|
| Id no jogo original | 23 (`Forest Mage`) |
| Mão no original | 14 cartas |
| Dificuldade | `medium` |
| Retrato | `duelists/forest-mage.png` (pixel art PS1 gerada para o projeto) |
| Estratégia da IA | `fm-basic` — ver [Perfil de IA](#perfil-de-ia) |
| Seed do deck | `20260805` |

## Quem é

Forest Mage é um dos Mage Soldiers de *Forbidden Memories*, o grupo de magos temáticos que guarda
os terrenos no meio da campanha. O tema não é decoração: o pool inteiro é construído em torno da
floresta — Beast, Insect e Plant respondem por 63 das 82 entradas de monstro, e o terreno `Forest`
é, sozinho, a entrada mais pesada de todo o pool (160/2048).

A dificuldade `medium` sai dos números do deck derivado, não de uma opinião. O maior ataque da
amostra é 2100 e a média dos monstros é 1228 — acima dos oponentes iniciais já portados (Teana
341, Jono 389, ambos com teto abaixo de 1300) e bem abaixo do chefe final (Nitemare, média 2434
com 40 monstros acima de 1800).

## Retrato

Gerado com `imagegen` em duas variantes e selecionado por identidade, leitura em miniatura e margem
de corte. Descrição específica: Mage Soldier egípcio adulto, rosto severo, barba curta, capuz verde
e manto cerimonial com motivos de folhas, diante do Forest Shrine. Direção comum: pixel art de PS1,
busto central 4:3, sem texto, logo, marca-d'água ou transparência. Referências visuais: Forest Mage,
o grupo dos Mages e o Forest Shrine em *Forbidden Memories*.

## Pool de deck

87 cartas, pesos somando 2048: 82 monstros, 3 mágicas e 2 armadilhas. A distribuição por classe é
Beast 31, Insect 21, Beast-Warrior 13, Plant 11, Pyro 5 e Reptile 1.

| Carta | Nome | Classe e atributos | Peso /2048 |
|---|---|---|---:|
| `003` | Hitotsu-me Giant | Beast-Warrior 1200/1000 | 16 |
| `014` | Battle Steer | Beast-Warrior 1800/1300 | 32 |
| `023` | The Wicked Worm Beast | Beast 1400/700 | 16 |
| `026` | Battle Ox | Beast-Warrior 1700/1000 | 24 |
| `027` | Beaver Warrior | Beast-Warrior 1200/1500 | 16 |
| `029` | Mountain Warrior | Beast-Warrior 600/1000 | 16 |
| `040` | Dragon Piper | Pyro 200/1800 | 2 |
| `046` | Griffore | Beast 1200/1500 | 16 |
| `047` | Torike | Beast 1200/600 | 24 |
| `049` | Big Insect | Insect 1200/1500 | 24 |
| `052` | Hercules Beetle | Insect 1500/2000 | 32 |
| `053` | Killer Needle | Insect 1200/1000 | 24 |
| `054` | Gokibore | Insect 1200/1400 | 24 |
| `055` | Giant Flea | Insect 1500/1200 | 24 |
| `061` | Wolf | Beast 1200/800 | 24 |
| `064` | Tiger Axe | Beast-Warrior 1300/1100 | 24 |
| `065` | Silver Fang | Beast 1200/800 | 24 |
| `068` | Garoozis | Beast-Warrior 1800/1500 | 32 |
| `072` | Cocoon of Evolution | Insect 0/2000 | 24 |
| `076` | Krokodilus | Reptile 1100/1200 | 2 |
| `091` | Mystic Horseman | Beast 1300/1550 | 24 |
| `092` | Rabid Horseman | Beast-Warrior 2000/1700 | 32 |
| `113` | Dark Gray | Beast 800/900 | 24 |
| `116` | Nightmare Scorpion | Insect 900/800 | 24 |
| `121` | Sleeping Lion | Beast 700/1700 | 24 |
| `133` | Charubin the Fire Knight | Pyro 1100/800 | 2 |
| `141` | Spiked Snail | Insect 700/1300 | 24 |
| `155` | Larvas | Beast 800/1000 | 24 |
| `163` | Lisark | Beast 1300/1300 | 24 |
| `180` | Arlownay | Plant 800/1000 | 2 |
| `188` | Synchar | Beast 800/900 | 24 |
| `189` | Fusionist | Beast 900/700 | 24 |
| `201` | Frenzied Panda | Beast 1200/1000 | 24 |
| `219` | Solitude | Beast-Warrior 1050/1000 | 24 |
| `221` | Kumootoko | Insect 700/1400 | 24 |
| `246` | One Who Hunts Souls | Beast-Warrior 1100/1000 | 24 |
| `248` | Master & Expert | Beast 1200/1000 | 24 |
| `252` | Nekogal #1 | Beast 1100/900 | 24 |
| `255` | Prevent Rat | Beast 500/2000 | 24 |
| `273` | Ancient Tree of Enlightenment | Plant 600/1500 | 2 |
| `274` | Green Phantom King | Plant 500/1600 | 2 |
| `282` | Mystical Sheep #2 | Beast 800/1000 | 24 |
| `287` | Ogre of the Black Shadow | Beast-Warrior 1200/1400 | 24 |
| `291` | Fireyarou | Pyro 1300/1000 | 2 |
| `330` | Forest | Mágica — terreno | 160 |
| `348` | Swords of Revealing Light | Mágica — trava de ataque | 48 |
| `367` | Jirai Gumo | Insect 2200/100 | 24 |
| `375` | Dungeon Worm | Insect 1800/1500 | 32 |
| `382` | Rude Kaiser | Beast-Warrior 1800/1600 | 32 |
| `384` | Dark Rabbit | Beast 1100/1500 | 24 |
| `403` | Leogun | Beast 1750/1550 | 32 |
| `404` | Tatsunootoshigo | Beast 1350/1600 | 24 |
| `473` | Vermillion Sparrow | Pyro 1900/1500 | 2 |
| `477` | Alinsection | Insect 950/700 | 24 |
| `478` | Insect Soldiers of the Sky | Insect 1000/800 | 24 |
| `479` | Cockroach Knight | Insect 800/900 | 24 |
| `480` | Kuwagata α | Insect 1250/1000 | 24 |
| `481` | Burglar | Beast 850/800 | 24 |
| `483` | Garvas | Beast 2000/1700 | 32 |
| `487` | Flower Wolf | Beast 1800/1400 | 32 |
| `489` | Barrel Lily | Plant 1100/600 | 2 |
| `496` | Wilmee | Beast 1000/1200 | 24 |
| `511` | Bean Soldier | Plant 1400/1300 | 2 |
| `528` | Togex | Beast 1600/1800 | 24 |
| `529` | Flame Cerebrus | Pyro 2100/1800 | 2 |
| `533` | Kwagar Hercules | Insect 1900/1700 | 24 |
| `534` | Minar | Insect 800/750 | 24 |
| `535` | Kamakiriman | Insect 1150/1400 | 24 |
| `567` | Darkworld Thorns | Plant 1200/900 | 2 |
| `575` | Ancient One of the Deep Forest | Beast 1800/1900 | 24 |
| `576` | Giant Scorpion of the Tundra | Insect 1100/1000 | 24 |
| `587` | Mon Larvas | Beast 1300/1400 | 24 |
| `588` | Living Vase | Plant 900/1100 | 2 |
| `594` | Rose Spectre of Dunn | Plant 2000/1800 | 2 |
| `597` | Pale Beast | Beast 1500/1200 | 24 |
| `607` | Great Bill | Beast 1250/1300 | 24 |
| `614` | Hunter Spider | Insect 1600/1400 | 24 |
| `620` | Snakeyashi | Plant 1000/1200 | 2 |
| `627` | Nekogal #2 | Beast-Warrior 1900/2000 | 24 |
| `629` | Armored Rat | Beast 950/1100 | 24 |
| `637` | Trent | Plant 1500/1800 | 2 |
| `638` | Queen of Autumn Leaves | Plant 1800/1500 | 2 |
| `640` | Acid Crawler | Insect 900/700 | 24 |
| `642` | Mystical Sheep #1 | Beast 1150/900 | 24 |
| `662` | Eradicating Aerosol | Mágica | 120 |
| `689` | Reverse Trap | Armadilha | 48 |
| `690` | Fake Trap | Armadilha | 46 |

## Deck canônico (40 cartas)

Seed `20260805`, a mesma seed inicial usada pelos duelistas já portados. A amostra tem 27 cartas
distintas, nenhuma acima de três cópias, e reparte-se em 30 monstros, 6 mágicas e 4 armadilhas —
o primeiro duelista do roster cujo deck derivado inclui armadilhas.

| Cópias | Carta | Nome | Classe e atributos |
|---:|---|---|---|
| 1 | `003` | Hitotsu-me Giant | Beast-Warrior 1200/1000 |
| 2 | `014` | Battle Steer | Beast-Warrior 1800/1300 |
| 1 | `026` | Battle Ox | Beast-Warrior 1700/1000 |
| 1 | `029` | Mountain Warrior | Beast-Warrior 600/1000 |
| 2 | `055` | Giant Flea | Insect 1500/1200 |
| 1 | `064` | Tiger Axe | Beast-Warrior 1300/1100 |
| 1 | `065` | Silver Fang | Beast 1200/800 |
| 1 | `113` | Dark Gray | Beast 800/900 |
| 1 | `116` | Nightmare Scorpion | Insect 900/800 |
| 1 | `163` | Lisark | Beast 1300/1300 |
| 1 | `201` | Frenzied Panda | Beast 1200/1000 |
| 1 | `219` | Solitude | Beast-Warrior 1050/1000 |
| 1 | `246` | One Who Hunts Souls | Beast-Warrior 1100/1000 |
| 2 | `248` | Master & Expert | Beast 1200/1000 |
| 2 | `287` | Ogre of the Black Shadow | Beast-Warrior 1200/1400 |
| 3 | `330` | Forest | Mágica — terreno |
| 2 | `404` | Tatsunootoshigo | Beast 1350/1600 |
| 1 | `479` | Cockroach Knight | Insect 800/900 |
| 1 | `511` | Bean Soldier | Plant 1400/1300 |
| 1 | `528` | Togex | Beast 1600/1800 |
| 1 | `529` | Flame Cerebrus | Pyro 2100/1800 |
| 2 | `534` | Minar | Insect 800/750 |
| 1 | `576` | Giant Scorpion of the Tundra | Insect 1100/1000 |
| 2 | `640` | Acid Crawler | Insect 900/700 |
| 3 | `662` | Eradicating Aerosol | Mágica |
| 2 | `689` | Reverse Trap | Armadilha |
| 2 | `690` | Fake Trap | Armadilha |

O maior ataque da amostra é **2100** (Flame Cerebrus), com média de 1228 entre os 30 monstros.
Jirai Gumo (2200) e Rose Spectre of Dunn (2000) continuam no pool original mas não saíram nesta
amostra determinística.

Duas observações sobre o suporte que saiu, porque afetam o que dá para observar em duelo:

- **`330` Forest** é terreno registrado em `packages/shared/src/duel/spell-effects/table.ts`, então
  a IA consegue jogá-lo de fato — é o que o [Perfil de IA](#perfil-de-ia) explora.
- **`662` Eradicating Aerosol** ainda **não** tem efeito registrado nessa tabela. As três cópias são
  cartas mortas na mão: `selectSpell` só considera cartas com efeito conhecido, então elas nunca são
  jogadas. Não é um defeito deste duelista, e sim o recorte atual das 25 mágicas documentadas em
  `docs/spells/`. Swords of Revealing Light (`348`) *é* registrada, mas não saiu nesta amostra.

## Pools de drop

| Tier | Origem no original | Cartas | Peso total | Destaques |
|---|---|---:|---:|---|
| `common` | BCD | 81 | 2048 | Man-eating Plant (117), Mushroom Man, Krokodilus, Firegrass |
| `sa-pow` | SAPow | 83 | 2048 | Man-eating Plant (120), Laughing Flower, Mushroom Man, Wings of Wicked Flame |
| `sa-tec` | SATec | 95 | 2048 | Man-eating Plant (105), Mushroom Man, Krokodilus, Man Eater |

Os três tiers mantêm o tema vegetal do duelista e têm Man-eating Plant como carta mais provável em
qualquer nota. Os pesos individuais e a ordem completa ficam preservados no JSON extraído. O Rating
Engine escolhe o tier conforme a nota do duelo; a carta dentro dele continua sendo sorteada com os
pesos originais.

## Como ele joga

Forest Mage é o primeiro duelista portado que faz algo além de invocar e atacar. O pool é de
monstros medianos — poucos passam de 1800 de ataque — e a identidade vem do terreno: quando não há
invocação disponível, ele baixa `Forest`.

Isso não exigiu política nova. O motor concede **uma jogada de mão por turno**
(`packages/engine/src/turn/hand-play.ts`) e `fm-basic` tenta invocar antes de jogar mágica
(`selectFmBasicAction`). A consequência é que o terreno só aparece quando a invocação não é
possível — mão sem monstro ou cinco zonas ocupadas. É um comportamento emergente das regras
existentes, não uma regra escrita para o personagem.

`handSize: 14` registra a mão usada pelo jogo original, mas não altera a mão fixa do motor
remasterizado.

### Partida observada

`apps/web/tests/free-duel-engine-match.integration.test.ts` roda um duelo real contra um deck
propositalmente fraco (os 14 monstros de menor ataque do catálogo, três cópias cada), seed `28`,
pausa zero, com o jogador apenas passando de fase. O motor produziu:

| Critério | Observado |
|---|---|
| Início válido | `in_progress` |
| Ações da CPU recusadas | nenhuma (`refusal` sempre indefinido) |
| Incidentes registrados | nenhum |
| Invocações | 5 (`onSummon`) |
| Ataques | 7 (`onAttackDeclared`) |
| Terreno em campo | `330` Forest, a partir da 20ª passagem de fase |
| Passos da CPU | 54, abaixo do limite de 100 |
| Desfecho | `decisive`, vencedor `P2`, motivo `lp_depleted` |

O desfecho vem exclusivamente do motor — nenhuma rendição foi submetida.

## Perfil de IA

```json
{ "strategy": "fm-basic", "parameters": { "aggression": 0.5, "playsSpells": true, "playsFieldSpells": true, "defensiveThreshold": 0 } }
```

`aggression: 0.5`, `playsSpells: true` e `defensiveThreshold: 0` são os defaults públicos de
`fm-basic`: atacar apenas trocas vantajosas e defender quando o monstro não supera o maior ataque
adversário visível.

A única diferença em relação a Nitemare é **`playsFieldSpells: true`**. Nitemare mantém `false`
porque o pool dele não tem terreno nenhum; aqui o terreno é a carta mais pesada do pool e a que dá
nome ao personagem, então desligá-la apagaria a identidade do duelista. O parâmetro já existe em
`normalizeFmBasicParameters` e é lido por `selectSpell` — nenhuma calibração fora do que a
estratégia já expõe, e nenhum bônus artificial: a classificação `medium` vem dos dados do deck, não
de informação oculta.

## Fontes

- [`sg4e/YGOFM-gamedata`](https://github.com/sg4e/YGOFM-gamedata) — fonte primária de identidade,
  mão e pools; dados extraídos de `sqlite/fm-sqlite3.db` pelo script do projeto.
- [Forest Mage — Yu-Gi-Oh! Forbidden Memories Wiki](https://yugioh-forbidden-memories.fandom.com/wiki/Forest_Mage)
  — contexto de Mage Soldier e confirmação do tema Beast/Insect/Plant em torno do terreno Forest.
