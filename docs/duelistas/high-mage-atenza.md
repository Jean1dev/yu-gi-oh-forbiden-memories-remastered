# High Mage Atenza

> Fonte de dados: `packages/data/data/duelists/high-mage-atenza.json` · Entrada no roster: `high-mage-atenza`

| Campo | Valor |
|---|---|
| Id no FM | 26 |
| Mão no original | 16 cartas (contexto histórico) |
| Dificuldade | `hard` |
| Seed do deck | `20260805` |
| Estratégia | `fm-basic` |
| Retrato | `duelists/high-mage-atenza.png` |

## Identidade e dificuldade

High Mage Atenza é o guardião do templo das montanhas. A dificuldade `hard` representa o encontro com um High Mage, acima do Mountain Mage, e seu pool com B. Skull Dragon (3200 ATK), Twin-headed Thunder Dragon (2800 ATK), Meteor B. Dragon (3500 ATK), equipamentos e Mountain. Não implica bônus ocultos ou aumento da mão do motor.

## Retrato

Arte própria gerada com `imagegen` integrado, em duas variantes. A segunda foi selecionada após inspeção: rosto e adereços reconhecíveis, anatomia consistente, elmo inteiro, silhueta legível, fundo opaco e corte 4:3. Sem texto, logo, cartas ou personagens extras. A primeira cortava a ponta do elmo. Somente a imagem selecionada foi versionada. Esta escolha substitui a orientação inicial de placeholder da issue #58, conforme decisão explícita do usuário no planejamento.

Referência visual: [capturas do jogo original, personagem no quadro inferior direito](https://files.peakd.com/file/peakd-hive/ekirmen/23tSKzAiTYZW9gX1meHwJ5W8sBgh1irevELmk233Ut8XQdHudbm13QD3fNDJhNu1yKHAR.jpg).

Prompt final:

```text
Create an original faithful High Mage Atenza portrait for Yu-Gi-Oh Forbidden Memories Remastered. Use the bottom-right character of the supplied original PS1 screenshot as identity reference ONLY; do not include other characters or screenshot UI. Adult male mountain high mage, dark bronze narrow stern face, black and gold angular helmet rising to a point around a round purple jewel, enormous circular silver-white collar behind head with dark green triangular radial segments and thin gold rays, long crimson fabric down both shoulders, gold collar with black triangles. PS1 pixel art, visibly pixelated and limited palette, centered chest-up bust with entire headdress safely within a 4:3 crop, mountain shrine stone interior background opaque, no text, logos, watermark, cards, extra people. Variant B. Pull camera back: entire helmet tip and all gold rays must be inside image, at least 12 percent blank margin above highest tip and around silhouette. Subject smaller, occupies 70 percent of height.
```

## Pool de deck

149 cartas; soma dos pesos: 2048. Extraído diretamente do SQLite, em ordem de CardId.

| Carta | Nome | Tipo | Peso /2048 |
|---|---|---|---|
| `002` | Mystical Elf | Spellcaster 800/2000 | 1 |
| `006` | Feral Imp | Fiend 1300/1400 | 6 |
| `007` | Winged Dragon #1 | Dragon 1400/1200 | 6 |
| `010` | Blackland Fire Dragon | Dragon 1500/800 | 12 |
| `013` | Tyhone | Winged Beast 1200/1400 | 6 |
| `026` | Battle Ox | Beast-Warrior 1700/1000 | 12 |
| `027` | Beaver Warrior | Beast-Warrior 1200/1500 | 6 |
| `031` | Koumori Dragon | Dragon 1500/1200 | 12 |
| `032` | Two-headed King Rex | Dinosaur 1600/1200 | 6 |
| `036` | The Snake Hair | Zombie 1500/1200 | 12 |
| `037` | Gaia the Dragon Champion | Dragon 2600/2100 | 32 |
| `039` | Curse of Dragon | Dragon 2000/1500 | 32 |
| `041` | Celtic Guardian | Warrior 1400/1200 | 6 |
| `043` | Karbonala Warrior | Warrior 1500/1200 | 12 |
| `044` | Rogue Doll | Spellcaster 1600/1000 | 12 |
| `046` | Griffore | Beast 1200/1500 | 6 |
| `047` | Torike | Beast 1200/600 | 12 |
| `049` | Big Insect | Insect 1200/1500 | 6 |
| `051` | Armored Lizard | Reptile 1500/1200 | 12 |
| `054` | Gokibore | Insect 1200/1400 | 6 |
| `055` | Giant Flea | Insect 1500/1200 | 12 |
| `060` | Great White | Fish 1600/800 | 6 |
| `062` | Harpie Lady | Winged Beast 1300/1400 | 6 |
| `063` | Harpie Lady Sisters | Winged Beast 1950/2100 | 32 |
| `064` | Tiger Axe | Beast-Warrior 1300/1100 | 6 |
| `066` | Kojikocy | Warrior 1500/1200 | 12 |
| `069` | Thousand Dragon | Dragon 2400/2000 | 32 |
| `070` | Fiend Kraken | Aqua 1200/1400 | 6 |
| `071` | Jellyfish | Aqua 1200/1500 | 6 |
| `077` | Grappler | Reptile 1300/1200 | 6 |
| `081` | Crawling Dragon #2 | Dinosaur 1600/1200 | 6 |
| `094` | Crawling Dragon | Dragon 1600/1400 | 32 |
| `095` | Crass Clown | Fiend 1350/1400 | 6 |
| `115` | Kamion Wizard | Spellcaster 1300/1100 | 6 |
| `117` | Spirit of the Books | Winged Beast 1400/1200 | 6 |
| `121` | Sleeping Lion | Beast 700/1700 | 1 |
| `125` | Faith Bird | Winged Beast 1500/1100 | 12 |
| `136` | Witty Phantom | Fiend 1400/1300 | 6 |
| `149` | Lord of the Lamp | Fiend 1400/1200 | 6 |
| `151` | Rhaimundos of the Red Sword | Warrior 1200/1300 | 6 |
| `163` | Lisark | Beast 1300/1300 | 6 |
| `166` | Mysterious Puppeteer | Warrior 1000/1500 | 6 |
| `168` | Darkfire Dragon | Dragon 1500/1250 | 12 |
| `170` | Spirit of the Harp | Fairy 800/2000 | 1 |
| `186` | Fiend Refrection #2 | Winged Beast 1100/1400 | 6 |
| `193` | Turtle Tiger | Aqua 1000/1500 | 6 |
| `194` | Terra the Terrible | Fiend 1200/1300 | 6 |
| `216` | Dryad | Spellcaster 1200/1400 | 6 |
| `217` | B. Skull Dragon | Dragon 3200/2500 | 32 |
| `230` | Rare Fish | Fish 1500/1200 | 12 |
| `233` | Dark Titan of Terror | Fiend 1300/1100 | 6 |
| `234` | Beautiful Headhuntress | Warrior 1600/800 | 6 |
| `241` | Dark Assailant | Zombie 1200/1200 | 6 |
| `249` | Water Omotics | Aqua 1400/1200 | 6 |
| `255` | Prevent Rat | Beast 500/2000 | 1 |
| `272` | Mavelus | Winged Beast 1300/900 | 2 |
| `275` | Ground Attacker Bugroth | Machine 1500/1000 | 6 |
| `281` | Mystic Clown | Fiend 1500/1000 | 6 |
| `287` | Ogre of the Black Shadow | Beast-Warrior 1200/1400 | 6 |
| `296` | One-eyed Shield Dragon | Dragon 700/1300 | 1 |
| `297` | Cyber Soldier of Darkworld | Machine 1400/1200 | 6 |
| `315` | Dragon Treasure | equipamento | 48 |
| `318` | Elegant Egotist | equipamento | 40 |
| `324` | Invigoration | equipamento | 48 |
| `327` | Follow Wind | equipamento | 72 |
| `332` | Mountain | magica | 72 |
| `337` | Raigeki | magica | 48 |
| `348` | Swords of Revealing Light | magica | 40 |
| `351` | Yaranzo | Zombie 1300/1500 | 6 |
| `352` | Kanan the Swordmistress | Warrior 1400/1400 | 6 |
| `353` | Takriminos | Sea Serpent 1500/1200 | 12 |
| `358` | Seiyaryu | Dragon 2500/2300 | 32 |
| `363` | Fairy's Gift | Spellcaster 1400/1000 | 6 |
| `371` | Sanga of the Thunder | Thunder 2600/2200 | 32 |
| `377` | Ryu-kishin Powered | Fiend 1600/1200 | 6 |
| `379` | La Jinn the Mystical Genie | Fiend 1800/1000 | 6 |
| `381` | Toon Alligator | Reptile 800/1600 | 1 |
| `383` | Parrot Dragon | Dragon 2000/1300 | 32 |
| `384` | Dark Rabbit | Beast 1100/1500 | 6 |
| `386` | Harpie's Pet Dragon | Dragon 2000/2500 | 32 |
| `412` | Giga-tech Wolf | Machine 1200/1400 | 6 |
| `415` | Mechanicalchacer | Machine 1850/800 | 12 |
| `416` | Blocker | Machine 850/1800 | 1 |
| `418` | Golgoil | Machine 900/1600 | 1 |
| `424` | Sky Dragon | Dragon 1900/1800 | 32 |
| `425` | Thunder Dragon | Thunder 1600/1500 | 32 |
| `427` | Kaiser Dragon | Dragon 2300/2000 | 32 |
| `430` | Water Magician | Spellcaster 1400/1000 | 6 |
| `433` | Ancient Elf | Spellcaster 1450/1200 | 6 |
| `440` | 7 Colored Fish | Fish 1800/800 | 12 |
| `447` | Giant Red Seasnake | Aqua 1800/800 | 12 |
| `454` | Destroyer Golem | Rock 1500/1000 | 6 |
| `456` | Minomushi Warrior | Warrior 1300/1200 | 6 |
| `458` | Kaminari Attack | Thunder 1900/1400 | 32 |
| `459` | Tripwire Beast | Thunder 1200/1300 | 6 |
| `460` | Bolt Escargot | Thunder 1400/1500 | 6 |
| `462` | The Immortal of Thunder | Thunder 1500/1300 | 6 |
| `464` | Wing Eagle | Winged Beast 1800/1500 | 32 |
| `465` | Punished Eagle | Winged Beast 2100/1800 | 32 |
| `466` | Skull Red Bird | Winged Beast 1550/1200 | 12 |
| `467` | Crimson Sunbird | Winged Beast 2300/1800 | 32 |
| `468` | Queen Bird | Winged Beast 1200/2000 | 32 |
| `470` | Magical Ghost | Zombie 1300/1400 | 6 |
| `474` | Sea Kamen | Aqua 1100/1300 | 6 |
| `491` | Peacock | Winged Beast 1700/1500 | 32 |
| `497` | Yado Karu | Aqua 900/1700 | 1 |
| `502` | D. Human | Warrior 1300/1100 | 6 |
| `507` | Crazy Fish | Fish 1600/1200 | 6 |
| `511` | Bean Soldier | Plant 1400/1300 | 6 |
| `512` | Cannon Soldier | Machine 1400/1300 | 6 |
| `515` | The Statue of Easter Island | Rock 1100/1400 | 6 |
| `521` | Skullbird | Winged Beast 1900/1700 | 32 |
| `522` | Monstrous Bird | Winged Beast 2000/1900 | 32 |
| `523` | The Bistro Butcher | Fiend 1800/1000 | 6 |
| `532` | Gemini Elf | Spellcaster 1900/900 | 6 |
| `535` | Kamakiriman | Insect 1150/1400 | 6 |
| `551` | Dark Elf | Spellcaster 2000/800 | 6 |
| `552` | Winged Dragon #2 | Winged Beast 1200/1000 | 4 |
| `555` | Tyhone #2 | Dragon 1700/1900 | 12 |
| `561` | Lesser Dragon | Dragon 1200/1000 | 6 |
| `571` | B. Dragon Jungle King | Dragon 2100/1800 | 32 |
| `577` | Crow Goblin | Winged Beast 1850/1600 | 32 |
| `578` | Leo Wizard | Spellcaster 1350/1200 | 6 |
| `581` | Takuhee | Winged Beast 1450/1000 | 6 |
| `583` | Weather Report | Aqua 950/1500 | 1 |
| `587` | Mon Larvas | Beast 1300/1400 | 6 |
| `595` | Fiend Refrection #1 | Winged Beast 1300/1400 | 6 |
| `596` | Ghoul with an Appetite | Zombie 1600/1200 | 6 |
| `597` | Pale Beast | Beast 1500/1200 | 12 |
| `603` | Fairy Dragon | Dragon 1100/1200 | 6 |
| `607` | Great Bill | Beast 1250/1300 | 6 |
| `608` | Shining Friendship | Fairy 1300/1100 | 6 |
| `613` | Twin-headed Thunder Dragon | Thunder 2800/2100 | 32 |
| `623` | The Thing That Hides In the Mud | Rock 1200/1300 | 6 |
| `625` | Fairy of the Fountain | Aqua 1600/1100 | 12 |
| `626` | Amazon of the Seas | Fish 1300/1400 | 6 |
| `630` | Ancient Lizard Warrior | Reptile 1400/1100 | 6 |
| `631` | Maiden of the Moonlight | Spellcaster 1500/1300 | 6 |
| `634` | Night Lizard | Aqua 1150/1300 | 6 |
| `636` | Blue-winged Crown | Winged Beast 1600/1200 | 12 |
| `647` | Hyosube | Aqua 1500/900 | 6 |
| `649` | Hibikime | Warrior 1450/1000 | 6 |
| `669` | Shadow Spell | magica | 48 |
| `672` | Harpie's Feather Duster | magica | 48 |
| `680` | Curse of Tri-Horned Dragon | ritual | 8 |
| `706` | Serpent Night Dragon | Dragon 2350/2400 | 32 |
| `711` | Mikazukinoyaiba | Dragon 2200/2350 | 32 |
| `712` | Meteor Dragon | Dragon 1800/2000 | 1 |
| `713` | Meteor B. Dragon | Dragon 3500/2000 | 1 |

## Deck canônico (40 cartas)

Seed `20260805`, mantida como recomendada. A amostra contém 31 cartas distintas, respeita o limite de três cópias e conserva monstros fortes, equipamento e terreno sem alterar os pesos para favorecer cartas específicas. É derivada pelo Mulberry32 e algoritmo canônico do projeto, não uma lista fixa atribuída ao jogo original.

| Cópias | Carta | Nome | Tipo |
|---|---|---|---|
| 1 | `007` | Winged Dragon #1 | Dragon 1400/1200 |
| 1 | `010` | Blackland Fire Dragon | Dragon 1500/800 |
| 1 | `013` | Tyhone | Winged Beast 1200/1400 |
| 1 | `037` | Gaia the Dragon Champion | Dragon 2600/2100 |
| 1 | `039` | Curse of Dragon | Dragon 2000/1500 |
| 2 | `066` | Kojikocy | Warrior 1500/1200 |
| 1 | `070` | Fiend Kraken | Aqua 1200/1400 |
| 1 | `094` | Crawling Dragon | Dragon 1600/1400 |
| 1 | `217` | B. Skull Dragon | Dragon 3200/2500 |
| 1 | `230` | Rare Fish | Fish 1500/1200 |
| 1 | `315` | Dragon Treasure | equipamento |
| 1 | `324` | Invigoration | equipamento |
| 3 | `327` | Follow Wind | equipamento |
| 1 | `332` | Mountain | magica |
| 1 | `337` | Raigeki | magica |
| 2 | `348` | Swords of Revealing Light | magica |
| 1 | `358` | Seiyaryu | Dragon 2500/2300 |
| 1 | `371` | Sanga of the Thunder | Thunder 2600/2200 |
| 1 | `447` | Giant Red Seasnake | Aqua 1800/800 |
| 1 | `454` | Destroyer Golem | Rock 1500/1000 |
| 1 | `460` | Bolt Escargot | Thunder 1400/1500 |
| 3 | `491` | Peacock | Winged Beast 1700/1500 |
| 1 | `512` | Cannon Soldier | Machine 1400/1300 |
| 1 | `515` | The Statue of Easter Island | Rock 1100/1400 |
| 1 | `551` | Dark Elf | Spellcaster 2000/800 |
| 2 | `613` | Twin-headed Thunder Dragon | Thunder 2800/2100 |
| 1 | `636` | Blue-winged Crown | Winged Beast 1600/1200 |
| 1 | `669` | Shadow Spell | magica |
| 2 | `672` | Harpie's Feather Duster | magica |
| 1 | `706` | Serpent Night Dragon | Dragon 2350/2400 |
| 2 | `711` | Mikazukinoyaiba | Dragon 2200/2350 |

28 monstros, 7 mágicas e 5 equipamentos, conforme os tipos do catálogo remasterizado.

## Pools de drop

Mapeamento: BCD → `common`, SAPow → `sa-pow`, SATec → `sa-tec`. Cada tabela preserva os pesos do dump, totalizando 2048. O rating atual usa `common`; os demais tiers ficam disponíveis nos dados.

### common (57 cartas)

| Carta | Nome | Peso /2048 |
|---|---|---|
| `002` | Mystical Elf | 30 |
| `006` | Feral Imp | 30 |
| `013` | Tyhone | 85 |
| `020` | Left Arm of the Forbidden One | 5 |
| `026` | Battle Ox | 30 |
| `027` | Beaver Warrior | 30 |
| `031` | Koumori Dragon | 30 |
| `032` | Two-headed King Rex | 30 |
| `036` | The Snake Hair | 30 |
| `041` | Celtic Guardian | 30 |
| `043` | Karbonala Warrior | 30 |
| `044` | Rogue Doll | 30 |
| `046` | Griffore | 30 |
| `049` | Big Insect | 30 |
| `054` | Gokibore | 30 |
| `055` | Giant Flea | 30 |
| `070` | Fiend Kraken | 30 |
| `071` | Jellyfish | 30 |
| `078` | Axe Raider | 30 |
| `081` | Crawling Dragon #2 | 27 |
| `083` | Castle of Dark Illusions | 27 |
| `086` | Barox | 27 |
| `089` | Catapult Turtle | 27 |
| `091` | Mystic Horseman | 27 |
| `095` | Crass Clown | 27 |
| `125` | Faith Bird | 84 |
| `127` | Ansatsu | 27 |
| `131` | Octoberser | 27 |
| `136` | Witty Phantom | 27 |
| `149` | Lord of the Lamp | 27 |
| `168` | Darkfire Dragon | 27 |
| `170` | Spirit of the Harp | 27 |
| `186` | Fiend Refrection #2 | 56 |
| `207` | Droll Bird | 56 |
| `230` | Rare Fish | 27 |
| `272` | Mavelus | 56 |
| `332` | Mountain | 40 |
| `366` | Labyrinth Wall | 27 |
| `368` | Shadow Ghoul | 27 |
| `379` | La Jinn the Mystical Genie | 27 |
| `405` | Saber Slasher | 27 |
| `412` | Giga-tech Wolf | 27 |
| `415` | Mechanicalchacer | 27 |
| `416` | Blocker | 27 |
| `460` | Bolt Escargot | 27 |
| `462` | The Immortal of Thunder | 27 |
| `464` | Wing Eagle | 58 |
| `466` | Skull Red Bird | 84 |
| `468` | Queen Bird | 56 |
| `491` | Peacock | 58 |
| `511` | Bean Soldier | 27 |
| `512` | Cannon Soldier | 27 |
| `538` | Niwatori | 56 |
| `552` | Winged Dragon #2 | 56 |
| `597` | Pale Beast | 27 |
| `636` | Blue-winged Crown | 86 |
| `648` | Machine Attacker | 27 |

### sa-pow (62 cartas)

| Carta | Nome | Peso /2048 |
|---|---|---|
| `002` | Mystical Elf | 25 |
| `006` | Feral Imp | 25 |
| `013` | Tyhone | 75 |
| `020` | Left Arm of the Forbidden One | 6 |
| `026` | Battle Ox | 25 |
| `027` | Beaver Warrior | 25 |
| `031` | Koumori Dragon | 25 |
| `032` | Two-headed King Rex | 25 |
| `036` | The Snake Hair | 25 |
| `041` | Celtic Guardian | 25 |
| `043` | Karbonala Warrior | 25 |
| `044` | Rogue Doll | 25 |
| `046` | Griffore | 25 |
| `049` | Big Insect | 25 |
| `054` | Gokibore | 25 |
| `055` | Giant Flea | 25 |
| `070` | Fiend Kraken | 25 |
| `071` | Jellyfish | 25 |
| `078` | Axe Raider | 25 |
| `081` | Crawling Dragon #2 | 25 |
| `083` | Castle of Dark Illusions | 25 |
| `086` | Barox | 25 |
| `089` | Catapult Turtle | 25 |
| `091` | Mystic Horseman | 25 |
| `095` | Crass Clown | 25 |
| `125` | Faith Bird | 75 |
| `127` | Ansatsu | 25 |
| `131` | Octoberser | 25 |
| `136` | Witty Phantom | 25 |
| `149` | Lord of the Lamp | 25 |
| `168` | Darkfire Dragon | 25 |
| `170` | Spirit of the Harp | 25 |
| `186` | Fiend Refrection #2 | 55 |
| `207` | Droll Bird | 55 |
| `230` | Rare Fish | 25 |
| `272` | Mavelus | 55 |
| `332` | Mountain | 30 |
| `366` | Labyrinth Wall | 25 |
| `368` | Shadow Ghoul | 25 |
| `379` | La Jinn the Mystical Genie | 25 |
| `386` | Harpie's Pet Dragon | 2 |
| `405` | Saber Slasher | 25 |
| `412` | Giga-tech Wolf | 25 |
| `415` | Mechanicalchacer | 25 |
| `416` | Blocker | 25 |
| `460` | Bolt Escargot | 25 |
| `462` | The Immortal of Thunder | 25 |
| `464` | Wing Eagle | 50 |
| `465` | Punished Eagle | 55 |
| `466` | Skull Red Bird | 75 |
| `467` | Crimson Sunbird | 55 |
| `468` | Queen Bird | 50 |
| `491` | Peacock | 55 |
| `511` | Bean Soldier | 25 |
| `512` | Cannon Soldier | 25 |
| `522` | Monstrous Bird | 50 |
| `538` | Niwatori | 50 |
| `552` | Winged Dragon #2 | 50 |
| `577` | Crow Goblin | 55 |
| `597` | Pale Beast | 25 |
| `636` | Blue-winged Crown | 75 |
| `648` | Machine Attacker | 25 |

### sa-tec (65 cartas)

| Carta | Nome | Peso /2048 |
|---|---|---|
| `002` | Mystical Elf | 28 |
| `006` | Feral Imp | 28 |
| `013` | Tyhone | 64 |
| `020` | Left Arm of the Forbidden One | 2 |
| `026` | Battle Ox | 28 |
| `027` | Beaver Warrior | 28 |
| `031` | Koumori Dragon | 28 |
| `032` | Two-headed King Rex | 28 |
| `036` | The Snake Hair | 28 |
| `041` | Celtic Guardian | 28 |
| `043` | Karbonala Warrior | 28 |
| `044` | Rogue Doll | 28 |
| `046` | Griffore | 28 |
| `049` | Big Insect | 28 |
| `054` | Gokibore | 28 |
| `055` | Giant Flea | 28 |
| `070` | Fiend Kraken | 28 |
| `071` | Jellyfish | 28 |
| `078` | Axe Raider | 28 |
| `081` | Crawling Dragon #2 | 30 |
| `083` | Castle of Dark Illusions | 30 |
| `086` | Barox | 30 |
| `091` | Mystic Horseman | 30 |
| `095` | Crass Clown | 30 |
| `125` | Faith Bird | 64 |
| `127` | Ansatsu | 30 |
| `136` | Witty Phantom | 30 |
| `149` | Lord of the Lamp | 30 |
| `168` | Darkfire Dragon | 30 |
| `170` | Spirit of the Harp | 30 |
| `186` | Fiend Refrection #2 | 40 |
| `207` | Droll Bird | 40 |
| `230` | Rare Fish | 24 |
| `272` | Mavelus | 40 |
| `307` | Elf's Light | 28 |
| `312` | Silver Bow and Arrow | 28 |
| `313` | Horn of Light | 28 |
| `316` | Electro-whip | 48 |
| `317` | Cyber Shield | 48 |
| `321` | Malevolent Nuzzler | 32 |
| `325` | Machine Conversion Factory | 28 |
| `327` | Follow Wind | 28 |
| `332` | Mountain | 40 |
| `368` | Shadow Ghoul | 24 |
| `379` | La Jinn the Mystical Genie | 24 |
| `405` | Saber Slasher | 24 |
| `412` | Giga-tech Wolf | 24 |
| `415` | Mechanicalchacer | 24 |
| `416` | Blocker | 24 |
| `460` | Bolt Escargot | 30 |
| `462` | The Immortal of Thunder | 30 |
| `466` | Skull Red Bird | 64 |
| `468` | Queen Bird | 40 |
| `511` | Bean Soldier | 24 |
| `512` | Cannon Soldier | 24 |
| `538` | Niwatori | 40 |
| `552` | Winged Dragon #2 | 40 |
| `597` | Pale Beast | 30 |
| `636` | Blue-winged Crown | 64 |
| `648` | Machine Attacker | 24 |
| `672` | Harpie's Feather Duster | 40 |
| `676` | Commencement Dance | 24 |
| `684` | Invisible Wire | 24 |
| `685` | Acid Trap Hole | 24 |
| `687` | Goblin Fan | 24 |

## Comportamento e perfil de IA

O contexto do original associa Atenza a dragões e ao templo das montanhas. O dump comprova a disponibilidade das cartas, mas não comprova uma sequência fixa de decisões. No remasterizado, `fm-basic` usa somente informação pública, candidatos legais e efeitos suportados pelo motor.

```json
{"strategy": "fm-basic", "parameters": {"aggression": 0.5, "playsSpells": true, "playsFieldSpells": true, "defensiveThreshold": 0}}
```

`aggression: 0.5`, `playsSpells: true` e `defensiveThreshold: 0` mantêm os defaults públicos. A única alteração é `playsFieldSpells: true`: Mountain (`332`) tem peso 72/2048 e integra a amostra canônica. A IA pode usá-lo quando as regras e a prioridade de ações existentes permitirem.

Limitações: invocar precede jogar magia em `fm-basic`; o consumo da jogada da mão pode adiar terrenos/equipamentos. Não há política exclusiva, fusão especial, acesso à mão oculta, terreno inicial automático nem reprodução da mão original de 16 cartas. A dificuldade não modifica essas regras.

### Partida observada

Teste de integração com motor real e catálogo selado: seed `2`, pausa zero, jogador com os 14 monstros de menor ataque (até três cópias, 40 cartas), passando fases.

| Critério | Resultado |
|---|---|
| Início | `in_progress` |
| Ações recusadas / incidentes | 0 / 0 |
| Ações da CPU | 31 |
| Invocações / ataques | 4 / 3 |
| Retorno ao jogador | Sim, antes de 100 ações |
| Desfecho do motor | `decisive`, `P2`, `lp_depleted` |

Nenhuma rendição ou resultado artificial foi usado. O teste não exige que Mountain seja jogado nessa partida.

### Validação da interface

O build de produção foi aberto no Chrome headless em `/free-duel`: oito duelistas visíveis, Atenza selecionável, PNG 1448×1086 carregado e nenhum fallback no seu retrato. A inspeção da tela confirmou a leitura em miniatura e o enquadramento completo do elmo.

### Verificações da entrega

- `data:build-roster` e `roster:validate`: oito entradas disponíveis, nenhuma oculta; os sete duelistas anteriores permanecem idênticos.
- `pnpm lint`, `pnpm typecheck` e `pnpm build`: passaram.
- `pnpm test -- --maxWorkers=2`: passou. A primeira execução concorrente apresentou timeouts ao iniciar workers; a repetição com concorrência limitada resolveu os erros.
- Integrações focadas: 13 testes de roster e 14 testes de retratos/partidas passaram.
- `pnpm test:integration -- --maxWorkers=2`: dados com 91 testes aprovados e uma falha preexistente de caminho Windows em `ingest-cards.integration.test.ts:149` (`/` versus `\\`). Dois timeouts da primeira execução desapareceram na repetição.
- Integração web executada separadamente com dois workers: 76 testes aprovados, 52 ignorados e duas falhas preexistentes de caminho Windows: `victory-star-credit.contract.test.ts:28` produz `C:\\C:\\...`; `wallet-single-source.test.ts:21` compara separadores incompatíveis. Esses testes e seus módulos de produção não foram alterados. A suíte completa não está verde neste ambiente.

## Fontes e reprodução

- [sg4e/YGOFM-gamedata](https://github.com/sg4e/YGOFM-gamedata), `sqlite/fm-sqlite3.db`: identidade, mão e quatro pools; `DuelistId = 26`.
- [Atenza — Forbidden Memories Wiki](https://yugioh-forbidden-memories.fandom.com/wiki/Atenza): contexto do templo e dos dragões.
- [Guia High Mountain Mage — GameFAQs](https://gamefaqs.gamespot.com/ps/561010-yu-gi-oh-forbidden-memories/faqs/20832): contexto do encontro; não utilizado como fonte dos pools.

```sh
pnpm --filter @yugioh/data data:extract-fm-duelist -- --fm-id=26 --id=high-mage-atenza --difficulty=hard
pnpm --filter @yugioh/data data:build-roster
pnpm --filter @yugioh/data roster:validate
```

O teste de roster compara quantidades, totais e SHA-256 das entradas ordenadas com uma consulta independente ao SQLite, além de reproduzir o deck a partir da seed.
