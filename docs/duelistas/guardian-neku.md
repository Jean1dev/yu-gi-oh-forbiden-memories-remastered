# Guardian Neku

> Fonte de dados: `packages/data/data/duelists/guardian-neku.json` · Entrada no roster: `guardian-neku`

| Campo | Valor |
|---|---|
| Id no FM | 34 |
| Mão no original | 20 cartas (contexto histórico) |
| Dificuldade | `hard` |
| Seed do deck | `20260805` |
| Estratégia | `fm-basic` |
| Retrato | `duelists/guardian-neku.png` (arte temática, ver limitação) |

## Identidade e dificuldade

Guardian Neku é um dos dois guardiões do trecho final da campanha original: no `duelistinfo` do dump ele vem logo depois de Seto 2nd e de Guardian Sebek (33) e imediatamente antes de Heishin 2nd (35), Seto 3rd, DarkNite e Nitemare. É uma variante única — não há "Neku 2nd" — e não foi agrupada com Sebek.

A dificuldade `hard` segue três sinais objetivos: (1) a posição no fim da progressão, depois de todos os High Mages; (2) `HandSize = 20`, o mesmo de Heishin 2nd, Seto 3rd e Nitemare, contra 16 dos High Mages; (3) a força do pool — Skull Knight (2650 ATK, peso 64), Zoa (2600), Dark Magician (2500), Air Eater (2100), além de Yami como terreno temático e Stop Defense/Swords of Revealing Light como suporte. `hard` é apenas o rótulo exibido antes da escolha; não concede bônus ocultos nem aumenta a mão do motor.

## Retrato

**Limitação registrada.** Seguindo a instrução da issue #66 ("Não inventar retrato. Usar placeholder ou arte temática"), o retrato é **arte temática** e não uma reprodução do personagem: uma figura encapuzada com o rosto inteiramente na sombra (apenas dois pontos de luz no lugar dos olhos), manto escuro com gola e corrente dourada e um broche roxo, cajado com orbe violeta, diante de um halo púrpura entre colunas de um santuário de pedra, sob um céu noturno roxo que remete a Yami (`335`), o terreno do seu pool. Um glifo de olho dourado decora o lintel. Não há rosto, traje ou adereço atribuído ao Neku original.

O motivo: no ambiente desta entrega o gerador `imagegen` não estava disponível e as fontes de referência visual (Fandom, Yugipedia) estavam bloqueadas pela rede, então não houve como consultar a aparência do personagem no jogo. Em vez de inventar uma aparência, a arte evita identificar o personagem. Quando houver referência e gerador disponíveis, basta substituir `apps/web/public/duelists/guardian-neku.png` pelo fluxo normal do `duelist-builder` (duas variantes, inspeção, mesmo caminho).

Execução: desenhada em 160×120 com paleta limitada e dithering ordenado (Bayer 4×4) no céu, ampliada por vizinho mais próximo (×9) para 1440×1080 — 4:3, pixel art no estilo PS1, fundo opaco, sem texto, logo, marca-d'água, cartas ou personagens extras. Inspeção: busto central inteiro dentro do corte 4:3, capuz e cajado com margem, silhueta legível em miniatura.

## Pool de deck

87 cartas; soma dos pesos: 2048. Extraído diretamente do SQLite, em ordem de CardId.

| Carta | Nome | Tipo | Peso /2048 |
|---|---|---|---|
| `002` | Mystical Elf | Spellcaster 800/2000 | 8 |
| `006` | Feral Imp | Fiend 1300/1400 | 8 |
| `007` | Winged Dragon #1 | Dragon 1400/1200 | 8 |
| `013` | Tyhone | Winged Beast 1200/1400 | 8 |
| `022` | Summoned Skull | Fiend 2500/1200 | 32 |
| `035` | Dark Magician | Spellcaster 2500/2100 | 48 |
| `041` | Celtic Guardian | Warrior 1400/1200 | 8 |
| `042` | Illusionist Faceless Mage | Spellcaster 1200/2200 | 32 |
| `044` | Rogue Doll | Spellcaster 1600/1000 | 16 |
| `054` | Gokibore | Insect 1200/1400 | 8 |
| `070` | Fiend Kraken | Aqua 1200/1400 | 8 |
| `077` | Grappler | Reptile 1300/1200 | 8 |
| `083` | Castle of Dark Illusions | Fiend 920/1930 | 8 |
| `084` | Reaper of the Cards | Fiend 1380/1930 | 32 |
| `085` | King of Yamimakai | Fiend 2000/1530 | 32 |
| `086` | Barox | Fiend 1380/1530 | 8 |
| `087` | Dark Chimera | Fiend 1610/1460 | 32 |
| `088` | Metal Guardian | Fiend 1150/2150 | 32 |
| `095` | Crass Clown | Fiend 1350/1400 | 8 |
| `106` | Spirit of the Winds | Spellcaster 1700/1400 | 32 |
| `117` | Spirit of the Books | Winged Beast 1400/1200 | 8 |
| `125` | Faith Bird | Winged Beast 1500/1100 | 8 |
| `128` | LaMoon | Spellcaster 1200/1700 | 8 |
| `136` | Witty Phantom | Fiend 1400/1300 | 8 |
| `149` | Lord of the Lamp | Fiend 1400/1200 | 8 |
| `151` | Rhaimundos of the Red Sword | Warrior 1200/1300 | 8 |
| `163` | Lisark | Beast 1300/1300 | 8 |
| `166` | Mysterious Puppeteer | Warrior 1000/1500 | 8 |
| `178` | Claw Reacher | Fiend 1000/800 | 32 |
| `186` | Fiend Refrection #2 | Winged Beast 1100/1400 | 8 |
| `193` | Turtle Tiger | Aqua 1000/1500 | 8 |
| `194` | Terra the Terrible | Fiend 1200/1300 | 8 |
| `204` | Mabarrel | Fiend 1700/1400 | 32 |
| `213` | Aqua Madoor | Spellcaster 1200/2000 | 32 |
| `216` | Dryad | Spellcaster 1200/1400 | 8 |
| `249` | Water Omotics | Aqua 1400/1200 | 8 |
| `255` | Prevent Rat | Beast 500/2000 | 8 |
| `269` | Versago the Destroyer | Fiend 1100/900 | 32 |
| `275` | Ground Attacker Bugroth | Machine 1500/1000 | 8 |
| `281` | Mystic Clown | Fiend 1500/1000 | 8 |
| `287` | Ogre of the Black Shadow | Beast-Warrior 1200/1400 | 8 |
| `288` | Dark Artist | Fiend 600/1400 | 32 |
| `297` | Cyber Soldier of Darkworld | Machine 1400/1200 | 8 |
| `320` | Stop Defense | magica | 120 |
| `335` | Yami | magica | 160 |
| `348` | Swords of Revealing Light | magica | 64 |
| `365` | Fiend's Mirror | Fiend 2100/1800 | 64 |
| `372` | Kazejin | Spellcaster 2400/2200 | 48 |
| `377` | Ryu-kishin Powered | Fiend 1600/1200 | 16 |
| `379` | La Jinn the Mystical Genie | Fiend 1800/1000 | 16 |
| `384` | Dark Rabbit | Beast 1100/1500 | 8 |
| `385` | Bickuribox | Fiend 2300/2000 | 48 |
| `391` | Zoa | Fiend 2600/1900 | 48 |
| `401` | Ushi Oni | Fiend 2150/1950 | 48 |
| `412` | Giga-tech Wolf | Machine 1200/1400 | 8 |
| `418` | Golgoil | Machine 900/1600 | 8 |
| `433` | Ancient Elf | Spellcaster 1450/1200 | 8 |
| `440` | 7 Colored Fish | Fish 1800/800 | 16 |
| `447` | Giant Red Seasnake | Aqua 1800/800 | 16 |
| `454` | Destroyer Golem | Rock 1500/1000 | 16 |
| `456` | Minomushi Warrior | Warrior 1300/1200 | 8 |
| `459` | Tripwire Beast | Thunder 1200/1300 | 8 |
| `471` | Soul Hunter | Fiend 2200/1800 | 48 |
| `472` | Air Eater | Fiend 2100/1600 | 32 |
| `493` | Maha Vailo | Spellcaster 1550/1400 | 16 |
| `495` | Musician King | Spellcaster 1750/1500 | 32 |
| `497` | Yado Karu | Aqua 900/1700 | 8 |
| `498` | Morinphen | Fiend 1550/1300 | 16 |
| `500` | Dragon Seeker | Fiend 2100/2000 | 48 |
| `515` | The Statue of Easter Island | Rock 1100/1400 | 8 |
| `523` | The Bistro Butcher | Fiend 1800/1000 | 16 |
| `525` | Spirit of the Mountain | Spellcaster 1300/1800 | 32 |
| `526` | Neck Hunter | Fiend 1750/1900 | 32 |
| `532` | Gemini Elf | Spellcaster 1900/900 | 16 |
| `535` | Kamakiriman | Insect 1150/1400 | 8 |
| `551` | Dark Elf | Spellcaster 2000/800 | 16 |
| `578` | Leo Wizard | Spellcaster 1350/1200 | 8 |
| `607` | Great Bill | Beast 1250/1300 | 8 |
| `619` | Rock Spirit | Spellcaster 1650/1900 | 32 |
| `622` | Ill Witch | Spellcaster 1600/1500 | 32 |
| `623` | The Thing That Hides In the Mud | Rock 1200/1300 | 8 |
| `630` | Ancient Lizard Warrior | Reptile 1400/1100 | 8 |
| `631` | Maiden of the Moonlight | Spellcaster 1500/1300 | 8 |
| `650` | Whiptail Crow | Fiend 1650/1600 | 32 |
| `672` | Harpie's Feather Duster | magica | 80 |
| `694` | Resurrection of Chakra | ritual | 32 |
| `707` | Skull Knight | Spellcaster 2650/2250 | 64 |


## Deck canônico (40 cartas)

Seed `20260805`, mantida como recomendada. A amostra tem 26 cartas distintas, respeita o limite de três cópias e é representativa do pool: o topo do pool aparece (Skull Knight ×3, Zoa ×2, Dark Magician, Air Eater), o núcleo Fiend/Spellcaster de peso médio está presente, e Yami ×3 entra como terreno temático. Não houve motivo para trocar a seed. A amostra é derivada pelo Mulberry32 e pelo algoritmo canônico do projeto, não uma lista fixa atribuída ao jogo original.

| Cópias | Carta | Nome | Tipo |
|---|---|---|---|
| 1 | `006` | Feral Imp | Fiend 1300/1400 |
| 2 | `013` | Tyhone | Winged Beast 1200/1400 |
| 1 | `035` | Dark Magician | Spellcaster 2500/2100 |
| 1 | `041` | Celtic Guardian | Warrior 1400/1200 |
| 2 | `087` | Dark Chimera | Fiend 1610/1460 |
| 1 | `088` | Metal Guardian | Fiend 1150/2150 |
| 1 | `106` | Spirit of the Winds | Spellcaster 1700/1400 |
| 1 | `178` | Claw Reacher | Fiend 1000/800 |
| 2 | `204` | Mabarrel | Fiend 1700/1400 |
| 1 | `269` | Versago the Destroyer | Fiend 1100/900 |
| 1 | `297` | Cyber Soldier of Darkworld | Machine 1400/1200 |
| 3 | `320` | Stop Defense | magica |
| 3 | `335` | Yami | magica |
| 2 | `348` | Swords of Revealing Light | magica |
| 2 | `391` | Zoa | Fiend 2600/1900 |
| 1 | `412` | Giga-tech Wolf | Machine 1200/1400 |
| 1 | `472` | Air Eater | Fiend 2100/1600 |
| 1 | `493` | Maha Vailo | Spellcaster 1550/1400 |
| 1 | `495` | Musician King | Spellcaster 1750/1500 |
| 2 | `497` | Yado Karu | Aqua 900/1700 |
| 1 | `523` | The Bistro Butcher | Fiend 1800/1000 |
| 2 | `622` | Ill Witch | Spellcaster 1600/1500 |
| 1 | `650` | Whiptail Crow | Fiend 1650/1600 |
| 2 | `672` | Harpie's Feather Duster | magica |
| 1 | `694` | Resurrection of Chakra | ritual |
| 3 | `707` | Skull Knight | Spellcaster 2650/2250 |

29 monstros, 10 mágicas e 1 ritual (Resurrection of Chakra, inerte no motor atual), conforme os tipos do catálogo remasterizado.

## Pools de drop

Mapeamento: BCD → `common`, SAPow → `sa-pow`, SATec → `sa-tec`. Cada tabela preserva os pesos do dump, totalizando 2048. O rating sorteia do tier que a nota abre.

### common (72 cartas)

| Carta | Nome | Peso /2048 |
|---|---|---|
| `006` | Feral Imp | 46 |
| `013` | Tyhone | 26 |
| `020` | Left Arm of the Forbidden One | 6 |
| `025` | Horn Imp | 26 |
| `026` | Battle Ox | 26 |
| `027` | Beaver Warrior | 26 |
| `031` | Koumori Dragon | 26 |
| `032` | Two-headed King Rex | 26 |
| `036` | The Snake Hair | 26 |
| `041` | Celtic Guardian | 26 |
| `043` | Karbonala Warrior | 26 |
| `044` | Rogue Doll | 26 |
| `046` | Griffore | 26 |
| `048` | Sangan | 26 |
| `049` | Big Insect | 26 |
| `054` | Gokibore | 26 |
| `055` | Giant Flea | 26 |
| `070` | Fiend Kraken | 26 |
| `071` | Jellyfish | 26 |
| `077` | Grappler | 26 |
| `081` | Crawling Dragon #2 | 26 |
| `083` | Castle of Dark Illusions | 67 |
| `084` | Reaper of the Cards | 67 |
| `085` | King of Yamimakai | 67 |
| `086` | Barox | 67 |
| `087` | Dark Chimera | 67 |
| `088` | Metal Guardian | 67 |
| `095` | Crass Clown | 46 |
| `103` | Job-Change Mirror | 26 |
| `115` | Kamion Wizard | 26 |
| `119` | Trial of Nightmares | 26 |
| `121` | Sleeping Lion | 26 |
| `125` | Faith Bird | 26 |
| `136` | Witty Phantom | 42 |
| `149` | Lord of the Lamp | 42 |
| `162` | Tainted Wisdom | 21 |
| `164` | Lord of Zemia | 21 |
| `166` | Mysterious Puppeteer | 21 |
| `168` | Darkfire Dragon | 21 |
| `169` | Dark King of the Abyss | 21 |
| `170` | Spirit of the Harp | 21 |
| `171` | Big Eye | 21 |
| `173` | Dark Prisoner | 21 |
| `175` | Ancient Brain | 21 |
| `178` | Claw Reacher | 21 |
| `181` | Dark Shade | 21 |
| `186` | Fiend Refrection #2 | 21 |
| `193` | Turtle Tiger | 21 |
| `194` | Terra the Terrible | 42 |
| `204` | Mabarrel | 21 |
| `230` | Rare Fish | 21 |
| `233` | Dark Titan of Terror | 42 |
| `255` | Prevent Rat | 21 |
| `269` | Versago the Destroyer | 21 |
| `277` | Gorgon Egg | 21 |
| `279` | King Fog | 21 |
| `295` | Bio Plant | 21 |
| `379` | La Jinn the Mystical Genie | 42 |
| `412` | Giga-tech Wolf | 21 |
| `415` | Mechanicalchacer | 21 |
| `416` | Blocker | 21 |
| `459` | Tripwire Beast | 21 |
| `462` | The Immortal of Thunder | 21 |
| `466` | Skull Red Bird | 21 |
| `472` | Air Eater | 21 |
| `511` | Bean Soldier | 21 |
| `512` | Cannon Soldier | 21 |
| `526` | Neck Hunter | 21 |
| `597` | Pale Beast | 21 |
| `608` | Shining Friendship | 21 |
| `636` | Blue-winged Crown | 21 |
| `650` | Whiptail Crow | 21 |

### sa-pow (77 cartas)

| Carta | Nome | Peso /2048 |
|---|---|---|
| `006` | Feral Imp | 44 |
| `013` | Tyhone | 22 |
| `020` | Left Arm of the Forbidden One | 8 |
| `025` | Horn Imp | 21 |
| `026` | Battle Ox | 21 |
| `027` | Beaver Warrior | 21 |
| `031` | Koumori Dragon | 21 |
| `032` | Two-headed King Rex | 21 |
| `036` | The Snake Hair | 21 |
| `041` | Celtic Guardian | 21 |
| `043` | Karbonala Warrior | 21 |
| `044` | Rogue Doll | 21 |
| `046` | Griffore | 21 |
| `048` | Sangan | 21 |
| `049` | Big Insect | 21 |
| `054` | Gokibore | 21 |
| `055` | Giant Flea | 21 |
| `070` | Fiend Kraken | 21 |
| `071` | Jellyfish | 21 |
| `077` | Grappler | 21 |
| `081` | Crawling Dragon #2 | 21 |
| `083` | Castle of Dark Illusions | 67 |
| `084` | Reaper of the Cards | 67 |
| `085` | King of Yamimakai | 67 |
| `086` | Barox | 67 |
| `087` | Dark Chimera | 67 |
| `088` | Metal Guardian | 67 |
| `095` | Crass Clown | 43 |
| `103` | Job-Change Mirror | 21 |
| `115` | Kamion Wizard | 21 |
| `119` | Trial of Nightmares | 21 |
| `121` | Sleeping Lion | 21 |
| `125` | Faith Bird | 21 |
| `136` | Witty Phantom | 42 |
| `149` | Lord of the Lamp | 42 |
| `162` | Tainted Wisdom | 20 |
| `164` | Lord of Zemia | 20 |
| `166` | Mysterious Puppeteer | 20 |
| `168` | Darkfire Dragon | 20 |
| `169` | Dark King of the Abyss | 20 |
| `170` | Spirit of the Harp | 20 |
| `171` | Big Eye | 20 |
| `173` | Dark Prisoner | 20 |
| `175` | Ancient Brain | 20 |
| `178` | Claw Reacher | 20 |
| `181` | Dark Shade | 20 |
| `186` | Fiend Refrection #2 | 20 |
| `193` | Turtle Tiger | 20 |
| `194` | Terra the Terrible | 42 |
| `204` | Mabarrel | 20 |
| `230` | Rare Fish | 20 |
| `233` | Dark Titan of Terror | 42 |
| `255` | Prevent Rat | 20 |
| `269` | Versago the Destroyer | 20 |
| `277` | Gorgon Egg | 20 |
| `279` | King Fog | 20 |
| `295` | Bio Plant | 20 |
| `379` | La Jinn the Mystical Genie | 42 |
| `390` | Launcher Spider | 4 |
| `391` | Zoa | 36 |
| `401` | Ushi Oni | 36 |
| `412` | Giga-tech Wolf | 20 |
| `415` | Mechanicalchacer | 20 |
| `416` | Blocker | 20 |
| `459` | Tripwire Beast | 20 |
| `462` | The Immortal of Thunder | 20 |
| `466` | Skull Red Bird | 20 |
| `471` | Soul Hunter | 36 |
| `472` | Air Eater | 24 |
| `500` | Dragon Seeker | 36 |
| `511` | Bean Soldier | 20 |
| `512` | Cannon Soldier | 20 |
| `526` | Neck Hunter | 24 |
| `597` | Pale Beast | 20 |
| `608` | Shining Friendship | 20 |
| `636` | Blue-winged Crown | 20 |
| `650` | Whiptail Crow | 20 |

### sa-tec (81 cartas)

| Carta | Nome | Peso /2048 |
|---|---|---|
| `006` | Feral Imp | 42 |
| `013` | Tyhone | 21 |
| `020` | Left Arm of the Forbidden One | 4 |
| `025` | Horn Imp | 21 |
| `026` | Battle Ox | 21 |
| `027` | Beaver Warrior | 21 |
| `031` | Koumori Dragon | 21 |
| `032` | Two-headed King Rex | 21 |
| `036` | The Snake Hair | 21 |
| `041` | Celtic Guardian | 21 |
| `043` | Karbonala Warrior | 21 |
| `044` | Rogue Doll | 21 |
| `046` | Griffore | 21 |
| `048` | Sangan | 21 |
| `049` | Big Insect | 21 |
| `054` | Gokibore | 21 |
| `055` | Giant Flea | 21 |
| `070` | Fiend Kraken | 21 |
| `071` | Jellyfish | 21 |
| `077` | Grappler | 21 |
| `081` | Crawling Dragon #2 | 21 |
| `083` | Castle of Dark Illusions | 67 |
| `084` | Reaper of the Cards | 67 |
| `086` | Barox | 67 |
| `087` | Dark Chimera | 67 |
| `088` | Metal Guardian | 67 |
| `095` | Crass Clown | 43 |
| `103` | Job-Change Mirror | 21 |
| `115` | Kamion Wizard | 21 |
| `119` | Trial of Nightmares | 21 |
| `121` | Sleeping Lion | 21 |
| `125` | Faith Bird | 21 |
| `136` | Witty Phantom | 42 |
| `149` | Lord of the Lamp | 42 |
| `162` | Tainted Wisdom | 20 |
| `164` | Lord of Zemia | 20 |
| `166` | Mysterious Puppeteer | 20 |
| `168` | Darkfire Dragon | 20 |
| `169` | Dark King of the Abyss | 20 |
| `170` | Spirit of the Harp | 20 |
| `171` | Big Eye | 20 |
| `173` | Dark Prisoner | 20 |
| `175` | Ancient Brain | 20 |
| `178` | Claw Reacher | 20 |
| `181` | Dark Shade | 20 |
| `186` | Fiend Refrection #2 | 20 |
| `193` | Turtle Tiger | 20 |
| `194` | Terra the Terrible | 42 |
| `204` | Mabarrel | 20 |
| `230` | Rare Fish | 20 |
| `233` | Dark Titan of Terror | 42 |
| `255` | Prevent Rat | 20 |
| `269` | Versago the Destroyer | 20 |
| `277` | Gorgon Egg | 20 |
| `279` | King Fog | 20 |
| `295` | Bio Plant | 20 |
| `303` | Dark Energy | 20 |
| `304` | Axe of Despair | 20 |
| `321` | Malevolent Nuzzler | 20 |
| `325` | Machine Conversion Factory | 20 |
| `335` | Yami | 36 |
| `379` | La Jinn the Mystical Genie | 42 |
| `412` | Giga-tech Wolf | 20 |
| `415` | Mechanicalchacer | 20 |
| `416` | Blocker | 20 |
| `459` | Tripwire Beast | 20 |
| `462` | The Immortal of Thunder | 20 |
| `466` | Skull Red Bird | 20 |
| `511` | Bean Soldier | 20 |
| `512` | Cannon Soldier | 20 |
| `597` | Pale Beast | 20 |
| `608` | Shining Friendship | 20 |
| `636` | Blue-winged Crown | 20 |
| `650` | Whiptail Crow | 20 |
| `655` | Cursebreaker | 18 |
| `683` | Bear Trap | 20 |
| `684` | Invisible Wire | 20 |
| `685` | Acid Trap Hole | 20 |
| `686` | Widespread Ruin | 20 |
| `688` | Bad Reaction to Simochi | 36 |
| `690` | Fake Trap | 20 |

## Comportamento e perfil de IA

O pool é dominado por Fiends e Spellcasters de ATK médio-alto com Yami como terreno e quase nenhuma fusão especial; um guia comunitário (abaixo) observa que Neku raramente funde e que Skull Knight é sua carta mais forte. Esse é exatamente o perfil que `fm-basic` cobre: invocar o melhor monstro, defender em desvantagem e atacar trocas favoráveis. Não foi necessária política nova.

```json
{"strategy": "fm-basic", "parameters": {"aggression": 0.5, "playsSpells": true, "playsFieldSpells": true, "defensiveThreshold": 0}}
```

`aggression: 0.5`, `playsSpells: true` e `defensiveThreshold: 0` mantêm os defaults públicos. A única alteração é `playsFieldSpells: true`: Yami (`335`) tem o maior peso do pool (160/2048), aparece três vezes na amostra canônica e fortalece justamente as classes centrais do pool (Fiend e Spellcaster). A IA pode jogá-lo quando as regras e a prioridade de ações existentes permitirem.

Limitações: invocar precede jogar magia em `fm-basic`, então terrenos podem ser adiados. Não há acesso à mão oculta, terreno inicial automático, ritual (Resurrection of Chakra fica inerte) nem reprodução da mão original de 20 cartas. A dificuldade não modifica essas regras.

### Partida observada

Teste de integração com motor real e catálogo selado: seed `2`, pausa zero, jogador com os 14 monstros de menor ataque (até três cópias, 40 cartas), passando fases.

| Critério | Resultado |
|---|---|
| Início | `in_progress` |
| Ações recusadas / incidentes | 0 / 0 |
| Ações da CPU | 32 |
| Invocações / ataques | 4 / 4 |
| Retorno ao jogador | Sim, antes de 100 ações |
| Desfecho do motor | `decisive`, `P2`, `lp_depleted` |

Nenhuma rendição ou resultado artificial foi usado. O teste não exige que Yami seja jogado nessa partida (nesta seed não foi).

### Verificações da entrega

- `data:build-roster` e `roster:validate`: nove entradas declaradas, nove disponíveis, nenhuma oculta; o diff do `roster.json` só acrescenta `guardian-neku`.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build`: passaram.
- `pnpm test:integration`: data 94 aprovados, engine 1, web 80 aprovados e 52 ignorados (os testes que exigem Supabase, sem variáveis configuradas neste ambiente).

## Fontes e reprodução

- [sg4e/YGOFM-gamedata](https://github.com/sg4e/YGOFM-gamedata), `sqlite/fm-sqlite3.db`: identidade, mão e quatro pools; `Duelist = 34`.
- [Guía del Guardian Neku (Scribd, comunitário)](https://es.scribd.com/doc/39972088/Guia-del-Guardian-Neku): contexto de estilo (Skull Knight como carta mais forte, poucas fusões); não utilizado como fonte dos pools.
- Fandom/Yugipedia: fetch automatizado bloqueado neste ambiente; nenhum dado foi tirado deles.

```sh
pnpm --filter @yugioh/data data:extract-fm-duelist --fm-id=34 --id=guardian-neku --difficulty=hard
pnpm --filter @yugioh/data data:build-roster
pnpm --filter @yugioh/data roster:validate
```

O teste de roster compara quantidades, totais e SHA-256 das entradas ordenadas com uma consulta independente ao SQLite, além de reproduzir o deck a partir da seed.
