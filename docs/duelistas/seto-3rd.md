# Seto 3rd

> Fonte de dados: `packages/data/data/duelists/seto-3rd.json` · Entrada no roster: `seto-3rd`

| Campo | Valor |
|---|---|
| Id no jogo original | 36 (`Seto 3rd`) |
| Mão no original | 20 cartas |
| Dificuldade | `hard` |
| Retrato | `duelists/seto-3rd.png` (pixel art PS1 gerada para o projeto) |
| Estratégia | `fm-basic`, parâmetros públicos padrão |
| Seed do deck | `20260805` |

## Quem é

Terceiro encontro com o sacerdote Seto, na sequência final da campanha, antes de DarkNite e
Nitemare. Esta entrada representa exclusivamente Seto 3rd; não substitui Seto ou Seto 2nd.
A dificuldade `hard` combina essa posição na progressão com a força do pool: Blue-eyes Ultimate
Dragon (4500 ATK), Gate Guardian (3750 ATK), Meteor B. Dragon (3500 ATK), Blue-eyes White Dragon
(3000 ATK), remoção de monstros, remoção de suporte e armadilhas.

## Retrato

Arte própria gerada com o skill `imagegen`, ferramenta built-in, após consultar o
[mugshot original de Seto 3rd](https://yugiohpro.com.br/assets/images/duelists/36.png), disponível
na [página do personagem](https://yugiohpro.com.br/duelist.php?id=36). Apenas o PNG escolhido é
versionado em `apps/web/public/duelists/seto-3rd.png`; a referência não integra o produto.

Foram geradas duas variantes com a mesma direção visual. A escolhida preserva rosto angular,
olhos azuis, franja castanha, adorno cerimonial roxo e dourado com joia azul e ornamentos laterais,
túnica roxa e colar dourado. Inspeção: identidade reconhecível, anatomia coerente, leitura em
miniatura, adorno inteiro dentro da imagem, fundo opaco e enquadramento 4:3; sem texto, marcas,
cartas ou personagens extras. A preferência explícita pelo skill atual substitui a orientação
de placeholder da issue #68. A seleção `/free-duel` foi carregada em Chrome headless:
o PNG respondeu com dimensões naturais 1448 × 1086, sem fallback, com os seis duelistas visíveis.

### Prompt final

```text
Create a standalone opponent portrait for Yu-Gi-Oh Forbidden Memories Remastered: Seto 3rd,
the ancient Egyptian priest Seto from the PS1 game, matching the attached original game
mugshot identity. Stylized pixel art PS1, deliberately visible crisp pixel clusters and
limited palette. Young adult male with angular face, blue eyes, brown fringe, purple and
gold tall ceremonial headpiece with central blue jewel and gold eye motif, long gold side
ornaments, purple priest robes and broad gold collar. Centered chest-up bust, full headdress
entirely inside frame with generous top and side margins safe for 4:3 crop. Stern confident
closed-mouth expression. Opaque dim Egyptian temple background in muted sandstone and
violet, subordinate to face. No text, logos, watermark, cards, monsters, staff, extra
characters or transparency. Landscape 4:3. Variant B: slight three-quarter pose, calm
confident expression, cool violet lighting with soft gold accents. CRITICAL wider medium
bust framing: headpiece must be fully visible, with at least 15 percent empty space above
it; entire character silhouette occupies central 65 percent width. Plain softly shaded
temple stones, no hieroglyphics or statues. Do not reproduce the tight crop of the reference.
```

## Pool de deck

63 entradas extraídas de `droppool`, `Duelist = 36`, `PoolType = 'Deck'`, ordenadas por
`CardId`. Soma: **2048**. Cartas e pesos foram comparados diretamente com o SQLite original.

| Carta | Nome | Classe e atributos | Peso /2048 |
|---|---|---|---:|
| `001` | Blue-eyes White Dragon | Dragon 3000/2500 | 120 |
| `022` | Summoned Skull | Fiend 2500/1200 | 16 |
| `035` | Dark Magician | Spellcaster 2500/2100 | 32 |
| `037` | Gaia the Dragon Champion | Dragon 2600/2100 | 32 |
| `038` | Gaia the Fierce Knight | Warrior 2300/2100 | 24 |
| `063` | Harpie Lady Sisters | Winged Beast 1950/2100 | 24 |
| `069` | Thousand Dragon | Dragon 2400/2000 | 24 |
| `079` | Megazowler | Dinosaur 1800/2000 | 16 |
| `082` | Red-eyes B. Dragon | Dragon 2400/2000 | 24 |
| `084` | Reaper of the Cards | Fiend 1380/1930 | 16 |
| `085` | King of Yamimakai | Fiend 2000/1530 | 16 |
| `087` | Dark Chimera | Fiend 1610/1460 | 16 |
| `088` | Metal Guardian | Fiend 1150/2150 | 16 |
| `090` | Gyakutenno Megami | Fairy 1800/2000 | 16 |
| `092` | Rabid Horseman | Beast-Warrior 2000/1700 | 16 |
| `099` | Pumpking the King of Ghosts | Zombie 1800/2000 | 16 |
| `204` | Mabarrel | Fiend 1700/1400 | 16 |
| `217` | B. Skull Dragon | Dragon 3200/2500 | 48 |
| `223` | Roaring Ocean Snake | Aqua 2100/1800 | 16 |
| `337` | Raigeki | Magic | 120 |
| `358` | Seiyaryu | Dragon 2500/2300 | 32 |
| `369` | Wall Shadow | Warrior 1600/3000 | 32 |
| `370` | Labyrinth Tank | Machine 2400/2400 | 32 |
| `371` | Sanga of the Thunder | Thunder 2600/2200 | 24 |
| `372` | Kazejin | Spellcaster 2400/2200 | 24 |
| `373` | Suijin | Aqua 2500/2400 | 24 |
| `374` | Gate Guardian | Warrior 3750/3400 | 64 |
| `378` | Swordstalker | Warrior 2000/1600 | 16 |
| `380` | Blue-eyes Ultimate Dragon | Dragon 4500/3800 | 80 |
| `385` | Bickuribox | Fiend 2300/2000 | 24 |
| `386` | Harpie's Pet Dragon | Dragon 2000/2500 | 24 |
| `390` | Launcher Spider | Machine 2200/2500 | 32 |
| `391` | Zoa | Fiend 2600/1900 | 24 |
| `392` | Metalzoa | Machine 3000/2300 | 48 |
| `401` | Ushi Oni | Fiend 2150/1950 | 24 |
| `407` | Machine King | Machine 2200/2000 | 24 |
| `426` | Stone D. | Rock 2000/2300 | 24 |
| `427` | Kaiser Dragon | Dragon 2300/2000 | 24 |
| `442` | Aqua Dragon | Sea Serpent 2250/1900 | 24 |
| `453` | Millennium Golem | Rock 2000/2200 | 24 |
| `465` | Punished Eagle | Winged Beast 2100/1800 | 16 |
| `467` | Crimson Sunbird | Winged Beast 2300/1800 | 16 |
| `471` | Soul Hunter | Fiend 2200/1800 | 24 |
| `472` | Air Eater | Fiend 2100/1600 | 16 |
| `500` | Dragon Seeker | Fiend 2100/2000 | 24 |
| `509` | Bracchio-raidus | Dinosaur 2200/2000 | 24 |
| `522` | Monstrous Bird | Winged Beast 2000/1900 | 16 |
| `526` | Neck Hunter | Fiend 1750/1900 | 16 |
| `529` | Flame Cerebrus | Pyro 2100/1800 | 16 |
| `531` | Mystical Sand | Rock 2100/1700 | 16 |
| `564` | Great Mammoth of Goldfine | Zombie 2200/1800 | 24 |
| `571` | B. Dragon Jungle King | Dragon 2100/1800 | 16 |
| `572` | Empress Judge | Warrior 2100/1700 | 16 |
| `594` | Rose Spectre of Dunn | Plant 2000/1800 | 16 |
| `613` | Twin-headed Thunder Dragon | Thunder 2800/2100 | 24 |
| `627` | Nekogal #2 | Beast-Warrior 1900/2000 | 16 |
| `645` | Royal Guard | Machine 1900/2200 | 24 |
| `650` | Whiptail Crow | Fiend 1650/1600 | 16 |
| `669` | Shadow Spell | Magic | 120 |
| `672` | Harpie's Feather Duster | Magic | 160 |
| `686` | Widespread Ruin | Trap | 120 |
| `712` | Meteor Dragon | Dragon 1800/2000 | 16 |
| `713` | Meteor B. Dragon | Dragon 3500/2000 | 48 |

## Deck canônico (40 cartas)

Seed **20260805**, a inicial recomendada, mantida sem ajustes: a amostra contém três Blue-eyes
White Dragon, três Blue-eyes Ultimate Dragon, três Meteor B. Dragon e suporte característico.
São **31 monstros, 6 mágicas e 3 armadilhas**, 25 cartas distintas, no máximo três cópias.
O algoritmo existente deriva o deck uma única vez; não há sorteio de composição em runtime.

| Cópias | Carta | Nome | Classe e atributos |
|---:|---|---|---|
| 3 | `001` | Blue-eyes White Dragon | Dragon 3000/2500 |
| 2 | `079` | Megazowler | Dinosaur 1800/2000 |
| 1 | `084` | Reaper of the Cards | Fiend 1380/1930 |
| 1 | `087` | Dark Chimera | Fiend 1610/1460 |
| 1 | `217` | B. Skull Dragon | Dragon 3200/2500 |
| 1 | `223` | Roaring Ocean Snake | Aqua 2100/1800 |
| 2 | `337` | Raigeki | Magic |
| 1 | `369` | Wall Shadow | Warrior 1600/3000 |
| 1 | `370` | Labyrinth Tank | Machine 2400/2400 |
| 1 | `372` | Kazejin | Spellcaster 2400/2200 |
| 2 | `373` | Suijin | Aqua 2500/2400 |
| 1 | `378` | Swordstalker | Warrior 2000/1600 |
| 3 | `380` | Blue-eyes Ultimate Dragon | Dragon 4500/3800 |
| 1 | `386` | Harpie's Pet Dragon | Dragon 2000/2500 |
| 1 | `390` | Launcher Spider | Machine 2200/2500 |
| 2 | `467` | Crimson Sunbird | Winged Beast 2300/1800 |
| 1 | `500` | Dragon Seeker | Fiend 2100/2000 |
| 1 | `572` | Empress Judge | Warrior 2100/1700 |
| 1 | `594` | Rose Spectre of Dunn | Plant 2000/1800 |
| 1 | `613` | Twin-headed Thunder Dragon | Thunder 2800/2100 |
| 2 | `627` | Nekogal #2 | Beast-Warrior 1900/2000 |
| 1 | `669` | Shadow Spell | Magic |
| 3 | `672` | Harpie's Feather Duster | Magic |
| 3 | `686` | Widespread Ruin | Trap |
| 3 | `713` | Meteor B. Dragon | Dragon 3500/2000 |

## Pools de drop

Os três pools são preservados integralmente, incluindo pesos individuais. Cada um soma 2048:
`common` corresponde a BCD (70 entradas), `sa-pow` a SAPow (83), `sa-tec` a SATec (99).
O Rating Engine determina o tier; a escolha da carta usa seus pesos originais.
As tabelas abaixo permitem revisar todos os drops sem abrir o JSON.

### common

| Carta | Nome | Classe e atributos | Peso /2048 |
|---|---|---|---:|
| `006` | Feral Imp | Fiend 1300/1400 | 32 |
| `020` | Left Arm of the Forbidden One | Spellcaster 200/300 | 6 |
| `025` | Horn Imp | Fiend 1300/1000 | 32 |
| `048` | Sangan | Fiend 1000/600 | 32 |
| `079` | Megazowler | Dinosaur 1800/2000 | 24 |
| `083` | Castle of Dark Illusions | Fiend 920/1930 | 32 |
| `084` | Reaper of the Cards | Fiend 1380/1930 | 32 |
| `085` | King of Yamimakai | Fiend 2000/1530 | 22 |
| `086` | Barox | Fiend 1380/1530 | 32 |
| `087` | Dark Chimera | Fiend 1610/1460 | 32 |
| `088` | Metal Guardian | Fiend 1150/2150 | 32 |
| `090` | Gyakutenno Megami | Fairy 1800/2000 | 22 |
| `095` | Crass Clown | Fiend 1350/1400 | 32 |
| `099` | Pumpking the King of Ghosts | Zombie 1800/2000 | 24 |
| `103` | Job-Change Mirror | Fiend 800/1300 | 32 |
| `119` | Trial of Nightmares | Fiend 1300/900 | 32 |
| `136` | Witty Phantom | Fiend 1400/1300 | 32 |
| `137` | Mystery Hand | Fiend 500/500 | 32 |
| `148` | The Shadow Who Controls the Dark | Fiend 800/700 | 32 |
| `149` | Lord of the Lamp | Fiend 1400/1200 | 32 |
| `162` | Tainted Wisdom | Fiend 1250/800 | 32 |
| `164` | Lord of Zemia | Fiend 1300/1000 | 32 |
| `169` | Dark King of the Abyss | Fiend 1200/800 | 32 |
| `171` | Big Eye | Fiend 1200/1000 | 32 |
| `173` | Dark Prisoner | Fiend 600/1000 | 32 |
| `175` | Ancient Brain | Fiend 1000/700 | 32 |
| `178` | Claw Reacher | Fiend 1000/800 | 32 |
| `181` | Dark Shade | Fiend 1000/1000 | 28 |
| `194` | Terra the Terrible | Fiend 1200/1300 | 28 |
| `204` | Mabarrel | Fiend 1700/1400 | 28 |
| `222` | Midnight Fiend | Fiend 800/600 | 28 |
| `223` | Roaring Ocean Snake | Aqua 2100/1800 | 24 |
| `232` | Madjinn Gunn | Fiend 600/800 | 28 |
| `233` | Dark Titan of Terror | Fiend 1300/1100 | 28 |
| `240` | The Drdek | Fiend 700/800 | 28 |
| `242` | Candle of Fate | Fiend 600/600 | 28 |
| `245` | Meda Bat | Fiend 800/400 | 28 |
| `254` | Embryonic Beast | Fiend 500/750 | 28 |
| `261` | Wicked Mirror | Fiend 700/600 | 28 |
| `269` | Versago the Destroyer | Fiend 1100/900 | 28 |
| `271` | Megirus Light | Fiend 900/600 | 28 |
| `277` | Gorgon Egg | Fiend 300/1300 | 28 |
| `279` | King Fog | Fiend 1000/900 | 28 |
| `295` | Bio Plant | Fiend 600/1300 | 28 |
| `379` | La Jinn the Mystical Genie | Fiend 1800/1000 | 28 |
| `424` | Sky Dragon | Dragon 1900/1800 | 12 |
| `449` | 30,000-Year White Turtle | Aqua 1250/2100 | 12 |
| `465` | Punished Eagle | Winged Beast 2100/1800 | 24 |
| `472` | Air Eater | Fiend 2100/1600 | 24 |
| `497` | Yado Karu | Aqua 900/1700 | 32 |
| `522` | Monstrous Bird | Winged Beast 2000/1900 | 24 |
| `523` | The Bistro Butcher | Fiend 1800/1000 | 32 |
| `526` | Neck Hunter | Fiend 1750/1900 | 24 |
| `531` | Mystical Sand | Rock 2100/1700 | 24 |
| `535` | Kamakiriman | Insect 1150/1400 | 32 |
| `539` | Corroding Shark | Zombie 110/700 | 54 |
| `551` | Dark Elf | Spellcaster 2000/800 | 32 |
| `553` | Mushroom Man #2 | Warrior 1250/800 | 54 |
| `560` | Invader from Another Dimension | Fiend 950/1400 | 54 |
| `571` | B. Dragon Jungle King | Dragon 2100/1800 | 24 |
| `572` | Empress Judge | Warrior 2100/1700 | 24 |
| `574` | Witch of the Black Forest | Spellcaster 1100/1200 | 54 |
| `594` | Rose Spectre of Dunn | Plant 2000/1800 | 24 |
| `600` | Key Mace #2 | Fiend 1050/1200 | 54 |
| `619` | Rock Spirit | Spellcaster 1650/1900 | 12 |
| `627` | Nekogal #2 | Beast-Warrior 1900/2000 | 24 |
| `639` | Amphibious Bugroth | Aqua 1850/1300 | 16 |
| `641` | Invader of the Throne | Warrior 1350/1700 | 16 |
| `647` | Hyosube | Aqua 1500/900 | 32 |
| `650` | Whiptail Crow | Fiend 1650/1600 | 32 |

### sa-pow

| Carta | Nome | Classe e atributos | Peso /2048 |
|---|---|---|---:|
| `001` | Blue-eyes White Dragon | Dragon 3000/2500 | 26 |
| `006` | Feral Imp | Fiend 1300/1400 | 24 |
| `020` | Left Arm of the Forbidden One | Spellcaster 200/300 | 6 |
| `025` | Horn Imp | Fiend 1300/1000 | 24 |
| `038` | Gaia the Fierce Knight | Warrior 2300/2100 | 26 |
| `048` | Sangan | Fiend 1000/600 | 22 |
| `079` | Megazowler | Dinosaur 1800/2000 | 24 |
| `083` | Castle of Dark Illusions | Fiend 920/1930 | 22 |
| `084` | Reaper of the Cards | Fiend 1380/1930 | 22 |
| `085` | King of Yamimakai | Fiend 2000/1530 | 22 |
| `086` | Barox | Fiend 1380/1530 | 22 |
| `087` | Dark Chimera | Fiend 1610/1460 | 22 |
| `088` | Metal Guardian | Fiend 1150/2150 | 22 |
| `090` | Gyakutenno Megami | Fairy 1800/2000 | 24 |
| `095` | Crass Clown | Fiend 1350/1400 | 22 |
| `099` | Pumpking the King of Ghosts | Zombie 1800/2000 | 24 |
| `103` | Job-Change Mirror | Fiend 800/1300 | 22 |
| `119` | Trial of Nightmares | Fiend 1300/900 | 22 |
| `136` | Witty Phantom | Fiend 1400/1300 | 22 |
| `137` | Mystery Hand | Fiend 500/500 | 22 |
| `148` | The Shadow Who Controls the Dark | Fiend 800/700 | 22 |
| `149` | Lord of the Lamp | Fiend 1400/1200 | 22 |
| `162` | Tainted Wisdom | Fiend 1250/800 | 22 |
| `164` | Lord of Zemia | Fiend 1300/1000 | 22 |
| `169` | Dark King of the Abyss | Fiend 1200/800 | 22 |
| `171` | Big Eye | Fiend 1200/1000 | 22 |
| `173` | Dark Prisoner | Fiend 600/1000 | 22 |
| `175` | Ancient Brain | Fiend 1000/700 | 22 |
| `178` | Claw Reacher | Fiend 1000/800 | 22 |
| `181` | Dark Shade | Fiend 1000/1000 | 22 |
| `194` | Terra the Terrible | Fiend 1200/1300 | 22 |
| `204` | Mabarrel | Fiend 1700/1400 | 22 |
| `222` | Midnight Fiend | Fiend 800/600 | 22 |
| `223` | Roaring Ocean Snake | Aqua 2100/1800 | 24 |
| `232` | Madjinn Gunn | Fiend 600/800 | 22 |
| `233` | Dark Titan of Terror | Fiend 1300/1100 | 22 |
| `240` | The Drdek | Fiend 700/800 | 22 |
| `242` | Candle of Fate | Fiend 600/600 | 22 |
| `245` | Meda Bat | Fiend 800/400 | 22 |
| `254` | Embryonic Beast | Fiend 500/750 | 22 |
| `261` | Wicked Mirror | Fiend 700/600 | 22 |
| `269` | Versago the Destroyer | Fiend 1100/900 | 22 |
| `271` | Megirus Light | Fiend 900/600 | 22 |
| `277` | Gorgon Egg | Fiend 300/1300 | 22 |
| `279` | King Fog | Fiend 1000/900 | 22 |
| `295` | Bio Plant | Fiend 600/1300 | 22 |
| `371` | Sanga of the Thunder | Thunder 2600/2200 | 2 |
| `379` | La Jinn the Mystical Genie | Fiend 1800/1000 | 22 |
| `391` | Zoa | Fiend 2600/1900 | 48 |
| `401` | Ushi Oni | Fiend 2150/1950 | 48 |
| `407` | Machine King | Machine 2200/2000 | 26 |
| `424` | Sky Dragon | Dragon 1900/1800 | 16 |
| `426` | Stone D. | Rock 2000/2300 | 26 |
| `449` | 30,000-Year White Turtle | Aqua 1250/2100 | 10 |
| `453` | Millennium Golem | Rock 2000/2200 | 26 |
| `465` | Punished Eagle | Winged Beast 2100/1800 | 24 |
| `467` | Crimson Sunbird | Winged Beast 2300/1800 | 26 |
| `471` | Soul Hunter | Fiend 2200/1800 | 48 |
| `472` | Air Eater | Fiend 2100/1600 | 24 |
| `497` | Yado Karu | Aqua 900/1700 | 26 |
| `500` | Dragon Seeker | Fiend 2100/2000 | 48 |
| `522` | Monstrous Bird | Winged Beast 2000/1900 | 24 |
| `523` | The Bistro Butcher | Fiend 1800/1000 | 26 |
| `526` | Neck Hunter | Fiend 1750/1900 | 24 |
| `531` | Mystical Sand | Rock 2100/1700 | 24 |
| `535` | Kamakiriman | Insect 1150/1400 | 26 |
| `539` | Corroding Shark | Zombie 110/700 | 44 |
| `551` | Dark Elf | Spellcaster 2000/800 | 26 |
| `553` | Mushroom Man #2 | Warrior 1250/800 | 44 |
| `560` | Invader from Another Dimension | Fiend 950/1400 | 44 |
| `564` | Great Mammoth of Goldfine | Zombie 2200/1800 | 26 |
| `571` | B. Dragon Jungle King | Dragon 2100/1800 | 24 |
| `572` | Empress Judge | Warrior 2100/1700 | 24 |
| `574` | Witch of the Black Forest | Spellcaster 1100/1200 | 44 |
| `594` | Rose Spectre of Dunn | Plant 2000/1800 | 24 |
| `600` | Key Mace #2 | Fiend 1050/1200 | 44 |
| `613` | Twin-headed Thunder Dragon | Thunder 2800/2100 | 26 |
| `619` | Rock Spirit | Spellcaster 1650/1900 | 16 |
| `627` | Nekogal #2 | Beast-Warrior 1900/2000 | 24 |
| `639` | Amphibious Bugroth | Aqua 1850/1300 | 14 |
| `641` | Invader of the Throne | Warrior 1350/1700 | 14 |
| `647` | Hyosube | Aqua 1500/900 | 26 |
| `650` | Whiptail Crow | Fiend 1650/1600 | 24 |

### sa-tec

| Carta | Nome | Classe e atributos | Peso /2048 |
|---|---|---|---:|
| `006` | Feral Imp | Fiend 1300/1400 | 16 |
| `020` | Left Arm of the Forbidden One | Spellcaster 200/300 | 2 |
| `025` | Horn Imp | Fiend 1300/1000 | 16 |
| `048` | Sangan | Fiend 1000/600 | 12 |
| `083` | Castle of Dark Illusions | Fiend 920/1930 | 20 |
| `084` | Reaper of the Cards | Fiend 1380/1930 | 20 |
| `086` | Barox | Fiend 1380/1530 | 20 |
| `087` | Dark Chimera | Fiend 1610/1460 | 20 |
| `088` | Metal Guardian | Fiend 1150/2150 | 20 |
| `095` | Crass Clown | Fiend 1350/1400 | 20 |
| `103` | Job-Change Mirror | Fiend 800/1300 | 16 |
| `119` | Trial of Nightmares | Fiend 1300/900 | 16 |
| `136` | Witty Phantom | Fiend 1400/1300 | 20 |
| `137` | Mystery Hand | Fiend 500/500 | 16 |
| `148` | The Shadow Who Controls the Dark | Fiend 800/700 | 16 |
| `149` | Lord of the Lamp | Fiend 1400/1200 | 20 |
| `162` | Tainted Wisdom | Fiend 1250/800 | 20 |
| `164` | Lord of Zemia | Fiend 1300/1000 | 20 |
| `169` | Dark King of the Abyss | Fiend 1200/800 | 20 |
| `171` | Big Eye | Fiend 1200/1000 | 20 |
| `173` | Dark Prisoner | Fiend 600/1000 | 16 |
| `175` | Ancient Brain | Fiend 1000/700 | 18 |
| `178` | Claw Reacher | Fiend 1000/800 | 20 |
| `181` | Dark Shade | Fiend 1000/1000 | 20 |
| `194` | Terra the Terrible | Fiend 1200/1300 | 20 |
| `204` | Mabarrel | Fiend 1700/1400 | 20 |
| `222` | Midnight Fiend | Fiend 800/600 | 20 |
| `232` | Madjinn Gunn | Fiend 600/800 | 20 |
| `233` | Dark Titan of Terror | Fiend 1300/1100 | 20 |
| `240` | The Drdek | Fiend 700/800 | 20 |
| `242` | Candle of Fate | Fiend 600/600 | 20 |
| `245` | Meda Bat | Fiend 800/400 | 20 |
| `254` | Embryonic Beast | Fiend 500/750 | 20 |
| `261` | Wicked Mirror | Fiend 700/600 | 20 |
| `269` | Versago the Destroyer | Fiend 1100/900 | 20 |
| `271` | Megirus Light | Fiend 900/600 | 20 |
| `277` | Gorgon Egg | Fiend 300/1300 | 20 |
| `279` | King Fog | Fiend 1000/900 | 20 |
| `295` | Bio Plant | Fiend 600/1300 | 20 |
| `302` | Sword of Dark Destruction | Equip | 25 |
| `303` | Dark Energy | Equip | 25 |
| `308` | Beast Fangs | Equip | 25 |
| `311` | Black Pendant | Equip | 25 |
| `314` | Horn of the Unicorn | Equip | 25 |
| `315` | Dragon Treasure | Equip | 25 |
| `324` | Invigoration | Equip | 25 |
| `328` | Power of Kaishin | Equip | 25 |
| `329` | Dragon Capture Jar | Magic | 25 |
| `336` | Dark Hole | Magic | 25 |
| `337` | Raigeki | Magic | 25 |
| `343` | Sparks | Magic | 25 |
| `344` | Hinotama | Magic | 25 |
| `345` | Final Flame | Magic | 25 |
| `349` | Spellbinding Circle | Magic | 25 |
| `379` | La Jinn the Mystical Genie | Fiend 1800/1000 | 20 |
| `449` | 30,000-Year White Turtle | Aqua 1250/2100 | 8 |
| `497` | Yado Karu | Aqua 900/1700 | 24 |
| `523` | The Bistro Butcher | Fiend 1800/1000 | 24 |
| `535` | Kamakiriman | Insect 1150/1400 | 24 |
| `539` | Corroding Shark | Zombie 110/700 | 40 |
| `551` | Dark Elf | Spellcaster 2000/800 | 24 |
| `553` | Mushroom Man #2 | Warrior 1250/800 | 40 |
| `560` | Invader from Another Dimension | Fiend 950/1400 | 40 |
| `574` | Witch of the Black Forest | Spellcaster 1100/1200 | 40 |
| `600` | Key Mace #2 | Fiend 1050/1200 | 40 |
| `639` | Amphibious Bugroth | Aqua 1850/1300 | 10 |
| `641` | Invader of the Throne | Warrior 1350/1700 | 10 |
| `647` | Hyosube | Aqua 1500/900 | 24 |
| `650` | Whiptail Crow | Fiend 1650/1600 | 20 |
| `653` | Warrior Elimination | Magic | 25 |
| `656` | Eternal Rest | Magic | 24 |
| `661` | Crush Card | Magic | 48 |
| `665` | Curse of Millennium Shield | Ritual None/None | 24 |
| `666` | Yamadron Ritual | Ritual None/None | 8 |
| `668` | Bright Castle | Equip | 24 |
| `671` | Zera Ritual | Ritual None/None | 8 |
| `672` | Harpie's Feather Duster | Magic | 24 |
| `673` | War-lion Ritual | Ritual None/None | 8 |
| `674` | Beastry Mirror Ritual | Ritual None/None | 8 |
| `675` | Ultimate Dragon | Ritual None/None | 16 |
| `676` | Commencement Dance | Ritual None/None | 8 |
| `677` | Hamburger Recipe | Ritual None/None | 8 |
| `678` | Revival of Sennen Genjin | Ritual None/None | 8 |
| `679` | Novox's Prayer | Ritual None/None | 24 |
| `680` | Curse of Tri-Horned Dragon | Ritual None/None | 8 |
| `684` | Invisible Wire | Trap | 24 |
| `685` | Acid Trap Hole | Trap | 48 |
| `686` | Widespread Ruin | Trap | 48 |
| `687` | Goblin Fan | Trap | 48 |
| `688` | Bad Reaction to Simochi | Trap | 48 |
| `691` | Revived of Serpent Night Dragon | Ritual None/None | 8 |
| `692` | Turtle Oath | Ritual None/None | 8 |
| `693` | Contruct of Mask | Ritual None/None | 8 |
| `694` | Resurrection of Chakra | Ritual None/None | 8 |
| `695` | Puppet Ritual | Ritual None/None | 8 |
| `697` | Garma Sword Oath | Ritual None/None | 8 |
| `698` | Cosmo Queen's Prayer | Ritual None/None | 8 |
| `699` | Revival of Skeleton Rider | Ritual None/None | 8 |
| `700` | Fortress Whale's Oath | Ritual None/None | 8 |

## Como ele joga

O pool original combina monstros fortes com Raigeki, Shadow Spell, Harpie's Feather Duster e
Widespread Ruin. Isso sustenta uma adaptação ofensiva pela estratégia genérica existente.
Não atribuímos ao dump uma prova da ordem de decisões da IA original: ele registra as cartas,
os pesos e a mão; os guias comportamentais consultados tiveram acesso automatizado bloqueado.

No Remastered, `fm-basic` prioriza invocar o monstro mais forte disponível, joga suporte legal
com efeito conhecido quando não invoca, muda posição e ataca trocas favoráveis. A ordem vem da
política atual, não de uma IA exclusiva de Seto. O motor limita a uma jogada de mão por turno;
portanto o suporte pode permanecer na mão enquanto houver invocações disponíveis. Não é prometida
reprodução exata das decisões do PS1, nem foi necessária uma política nova para este port.

`handSize: 20` é somente contexto histórico; a mão fixa do motor remasterizado permanece vigente.
A IA usa exclusivamente a visão pública permitida e as ações legais verificadas pelo motor.

## Perfil de IA

```json
{ "strategy": "fm-basic", "parameters": { "aggression": 0.5, "playsSpells": true, "playsFieldSpells": false, "defensiveThreshold": 0 } }
```

Todos são defaults públicos: `aggression: 0.5` conserva ataques com vantagem estrita;
`defensiveThreshold: 0` mantém o limiar defensivo padrão; `playsSpells: true` permite o suporte
implementado (inclusive armadilhas reconhecidas); `playsFieldSpells: false` é coerente com a
ausência de terrenos no pool. A dificuldade vem das cartas, sem bônus artificial ou informação
oculta adicional.

## Partida observada

Integração em `apps/web/tests/free-duel-engine-match.integration.test.ts`, motor real, seed de
partida **2**, pausa zero. O jogador usa os 14 monstros de menor ataque do catálogo (até três
cópias, total 40) e somente passa de fase. Não há rendição nem estado final fabricado.

| Critério | Observado |
|---|---|
| Início | `in_progress` |
| Ações recusadas pelo motor | nenhuma, incluindo todas as ações submetidas pela CPU |
| Incidentes | nenhum |
| Invocações da CPU | 3 (`onSummon`) |
| Ataques da CPU | 2 (`onAttackDeclared`) |
| Passos da CPU | 21 no duelo inteiro |
| Retorno ao jogador | `P1` após os avanços não terminais, sempre antes de 100 passos |
| Desfecho do motor | `decisive`, vencedor `P2`, motivo `lp_depleted` |

Esse cenário verifica invocação, ataque, progresso e término; não demonstra uso de todas as
cartas de suporte do pool.

## Reprodução e fontes

```sh
pnpm --filter @yugioh/data data:extract-fm-duelist -- --fm-id=36 --id=seto-3rd --difficulty=hard
pnpm --filter @yugioh/data data:build-roster
pnpm --filter @yugioh/data roster:validate
```

O teste de integração do roster fixa hashes SHA-256 das quatro listas originais de pares
`{cardNumber, weight}` ordenados por `CardId`, compara a derivação pela seed com a entrada
versionada e valida o deck contra o catálogo real. Reextrair preserva retrato, perfil e seed.
SHA-256 do SQLite consultado:
`98e016ee97c6d8f4ca7063d6ab8c1c0d1026d99f514ac18db6a97496eff38f70`.

### Validação da entrega

- `data:build-roster` e `roster:validate`: seis duelistas disponíveis, nenhum oculto; as cinco
  entradas anteriores do roster permaneceram idênticas. O aviso do pool da fixture
  `test-duelist` (peso 8) já existia e não se aplica aos pools originais.
- Lint, typecheck e build de produção passaram. `pnpm test -- --maxWorkers=2` passou em todos
  os pacotes após limitar a concorrência dos workers. A seleção foi verificada no navegador, e as
  integrações de roster (9 testes), partida real (5) e retratos (5) passaram.
- A suíte completa de integração foi executada novamente com `--maxWorkers=2` para eliminar
  timeouts de concorrência: 160 testes passaram, 52 foram ignorados e três falharam por problemas
  preexistentes de caminhos no Windows. Os arquivos abaixo foram conferidos contra `HEAD` e
  não foram alterados nesta entrega:
  - `packages/data/tests/ingest-cards.integration.test.ts:149`: compara URL com `/` a `path.join`
    com `\`.
  - `apps/web/tests/victory-star-credit.contract.test.ts:28`: usa `URL.pathname` como caminho
    local, produzindo `C:\C:\...`.
  - `apps/web/tests/wallet-single-source.test.ts:19`: filtra diretórios com `/`, deixando passar
    caminhos Windows com `\`.

### Fontes

- [sg4e/YGOFM-gamedata](https://github.com/sg4e/YGOFM-gamedata),
  [SQLite](https://raw.githubusercontent.com/sg4e/YGOFM-gamedata/master/sqlite/fm-sqlite3.db):
  fonte primária de identidade, mão, pools e pesos; extração pelo script do projeto.
- [Batalha final — YuGiOh PRO](https://yugiohpro.com.br/guide/batalha-final.php): contexto da
  sequência Seto 3rd → DarkNite → Nitemare, sem uso de listas de cartas como fonte de dados.
- [Seto — Yugipedia](https://yugipedia.com/wiki/Seto_(Forbidden_Memories)),
  [Seto 3 Guide — GameFAQs](https://gamefaqs.gamespot.com/ps/561010-yu-gi-oh-forbidden-memories/faqs/19448)
  e [espelho no Neoseeker](https://www.neoseeker.com/yugioh-forbidden/faqs/56597-yu-gi-oh-fm-seto-3.html):
  tentativas de contexto complementar; fetch automatizado indisponível/bloqueado, sem alegar
  leitura do conteúdo.
