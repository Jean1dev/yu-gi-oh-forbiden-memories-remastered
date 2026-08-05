# Fusões do Yu-Gi-Oh! Forbidden Memories original

> Escopo: versão norte-americana vanilla de PlayStation (NTSC-U, `SLUS-01411`), sem mods.  
> Última verificação das fontes: 4 de agosto de 2026.

Este documento descreve o conjunto completo de fusões normais por **regras compactas**. A
expansão validada pela fonte de referência contém **50.242 combinações válidas**. Como a rotina
da ROM coloca primeiro a carta de menor ID, `A + B` e `B + A` consultam o mesmo par canônico;
portanto, a notação abaixo escreve cada regra apenas uma vez.

O arquivo não é a tabela de runtime do remake. Ele é uma referência humana e não substitui
`packages/data/rules-data/fusions.json`, que continua vazio até uma ingestão própria transformar
as regras em pares explícitos e validar todos os IDs contra o catálogo.

## 1. Como ler as regras

- `[Tipo]` significa qualquer carta pertencente à categoria indicada. Categorias que não são
  tipos primários do jogo estão definidas na seção 5.
- `{Carta A, Carta B}` significa exatamente o conjunto enumerado.
- Uma linha `material A + material B = resultado` vale nos dois sentidos.
- Quando a mesma regra apresenta vários resultados `=`, ambos os materiais precisam ter ATK
  **estritamente menor** que o ATK do resultado. Escolhe-se o primeiro resultado forte o bastante
  na progressão indicada.
- Uma linha recuada com `< Resultado X` indica conflito: se o par também satisfizer a regra que
  produz X, X tem precedência.
- Resultados de ATK zero (magias, armadilhas, rituais e Cocoon of Evolution) e as receitas exatas
  excepcionais não obedecem necessariamente ao teste de ATK.
- Fusões com três ou mais cartas são sequenciais: resolve-se o primeiro par e o resultado passa a
  ser o material da próxima tentativa. Não existe receita primitiva com três materiais.

Exemplo: em `[Dragon] + [Thunder]`, materiais abaixo de 1600 ATK produzem Thunder Dragon;
materiais que já não cabem nesse primeiro limite, mas continuam abaixo de 2800, produzem
Twin-headed Thunder Dragon, salvo quando uma regra conflitante de maior prioridade se aplica.

## 2. Índice de cartas que podem ser resultado

O índice abaixo reúne resultados encontrados nas regras gerais e nas receitas exatas. O número é
mostrado quando a base explícita independente contém o mesmo nome.

- `#449` 30,000-Year White Turtle
- `#440` 7 Colored Fish
- `#685` Acid Trap Hole
- `#626` Amazon of the Seas
- `#639` Amphibious Bugroth
- `#433` Ancient Elf
- `#096` Armored Zombie
- `#304` Axe of Despair
- `#571` B. Dragon Jungle King
- `#217` B. Skull Dragon
- `#004` Baby Dragon
- `#688` Bad Reaction to Simochi
- `#100` Battle Warrior
- `#511` Bean Soldier
- `#683` Bear Trap
- `#308` Beast Fangs
- `#674` Beastry Mirror Ritual
- `#434` Beautiful Beast Trainer
- `#171` Big Eye
- `#670` Black Luster Ritual
- `#311` Black Pendant
- `#010` Blackland Fire Dragon
- `#460` Bolt Escargot
- `#323` Book of Secret Arts
- `#518` Boulder Tortoise
- `#663` Breath of Light
- `#668` Bright Castle
- `#041` Celtic Guardian
- `#133` Charubin the Fire Knight
- `#098` Clown Zombie
- `#479` Cockroach Knight
- `#072` Cocoon of Evolution
- `#676` Commencement Dance
- `#693` Contruct of Mask
- `#539` Corroding Shark
- `#698` Cosmo Queen's Prayer
- `#467` Crimson Sunbird
- `#661` Crush Card
- `#039` Curse of Dragon
- `#665` Curse of Millennium Shield
- `#680` Curse of Tri-Horned Dragon
- `#655` Cursebreaker
- `#508` Cyber Saurus
- `#413` Cyber Soldier
- `#502` D. Human
- `#551` Dark Elf
- `#303` Dark Energy
- `#336` Dark Hole
- `#582` Dark Witch
- `#168` Darkfire Dragon
- `#567` Darkworld Thorns
- `#342` Dian Keto the Cure Master
- `#423` Dice Armadillo
- `#643` Disk Magician
- `#244` Dissolverock
- `#329` Dragon Capture Jar
- `#138` Dragon Statue
- `#097` Dragon Zombie
- `#294` Dragoness the Wicked Knight
- `#375` Dungeon Worm
- `#682` Eatgaboon
- `#610` Electric Lizard
- `#316` Electro-whip
- `#318` Elegant Egotist
- `#307` Elf's Light
- `#251` Enchanting Mermaid
- `#662` Eradicating Aerosol
- `#664` Eternal Draught
- `#656` Eternal Rest
- `#690` Fake Trap
- `#595` Fiend Refrection #1
- `#345` Final Flame
- `#519` Fire Kraken
- `#154` Fire Reaper
- `#157` Firegrass
- `#529` Flame Cerebrus
- `#215` Flame Ghost
- `#015` Flame Swordsman
- `#487` Flower Wolf
- `#330` Forest
- `#700` Fortress Whale's Oath
- `#037` Gaia the Dragon Champion
- `#697` Garma Sword Oath
- `#483` Garvas
- `#667` Gate Guardian Ritual
- `#593` Giant Turtle Who Feeds on Flames
- `#412` Giga-tech Wolf
- `#687` Goblin Fan
- `#340` Goblin's Secret Remedy
- `#564` Great Mammoth of Goldfine
- `#677` Hamburger Recipe
- `#063` Harpie Lady Sisters
- `#672` Harpie's Feather Duster
- `#386` Harpie's Pet Dragon
- `#344` Hinotama
- `#314` Horn of the Unicorn
- `#681` House of Adhesive Tape
- `#647` Hyosube
- `#431` Ice Water
- `#306` Insect Armor with Laser Cannon
- `#641` Invader of the Throne
- `#324` Invigoration
- `#684` Invisible Wire
- `#696` Javelin Beetle Pact
- `#033` Judge Man
- Kairyu-shin
- `#458` Kaminari Attack
- `#450` Kappa Avenger
- `#485` Korogashi
- `#031` Koumori Dragon
- `#651` Kunai with Chain
- `#533` Kwagar Hercules
- `#305` Laser Cannon Armor
- `#390` Launcher Spider
- `#301` Legendary Sword
- `#149` Lord of the Lamp
- `#325` Machine Conversion Factory
- `#470` Magical Ghost
- `#617` Marine Beast
- `#272` Mavelus
- `#657` Megamorph
- `#409` Metal Dragon
- `#438` Metal Fish
- `#658` Metalmorph
- `#392` Metalzoa
- `#713` Meteor B. Dragon
- `#456` Minomushi Warrior
- `#542` Misairuzame
- `#587` Mon Larvas
- `#376` Monster Tamer
- `#495` Musician King
- `#002` Mystical Elf
- `#531` Mystical Sand
- `#642` Mystical Sheep #1
- `#627` Nekogal #2
- `#679` Novox's Prayer
- `#346` Ookazi
- `#328` Power of Kaishin
- `#099` Pumpking the King of Ghosts
- `#465` Punished Eagle
- `#695` Puppet Ritual
- `#638` Queen of Autumn Leaves
- `#092` Rabid Horseman
- `#337` Raigeki
- `#326` Raise Body Heat
- `#230` Rare Fish
- `#084` Reaper of the Cards
- `#082` Red-eyes B. Dragon
- `#694` Resurrection of Chakra
- `#689` Reverse Trap
- `#678` Revival of Sennen Genjin
- `#699` Revival of Skeleton Rider
- `#691` Revived of Serpent Night Dragon
- `#594` Rose Spectre of Dunn
- `#377` Ryu-kishin Powered
- `#654` Salamandra
- `#443` Sea King Dragon
- `#009` Shadow Specter
- `#669` Shadow Spell
- `#545` Skelgon
- `#620` Snakeyashi
- `#471` Soul Hunter
- `#341` Soul of the Pure
- `#448` Spike Seadra
- `#117` Spirit of the Books
- `#660` Stain Storm
- `#309` Steel Shell
- `#426` Stone D.
- `#457` Stone Ghost
- `#320` Stop Defense
- `#022` Summoned Skull
- `#011` Sword Arm of Dragon
- `#302` Sword of Dark Destruction
- `#348` Swords of Revealing Light
- `#162` Tainted Wisdom
- `#404` Tatsunootoshigo
- `#132` The 13th Grave
- `#462` The Immortal of Thunder
- `#036` The Snake Hair
- `#023` The Wicked Worm Beast
- `#069` Thousand Dragon
- `#425` Thunder Dragon
- `#064` Tiger Axe
- `#570` Trakadon
- `#347` Tremendous Fire
- `#459` Tripwire Beast
- `#520` Turtle Bird
- `#692` Turtle Oath
- `#193` Turtle Tiger
- `#613` Twin-headed Thunder Dragon
- `#675` Ultimate Dragon
- `#401` Ushi Oni
- `#473` Vermillion Sparrow
- `#310` Vile Germs
- `#322` Violet Crystal
- `#673` War-lion Ritual
- `#331` Wasteland
- `#430` Water Magician
- `#650` Whiptail Crow
- `#686` Widespread Ruin
- `#633` Winged Egg of New Life
- `#659` Winged Trumpeter
- `#136` Witty Phantom
- `#228` Wood Remains
- `#546` Wow Warrior
- `#357` Yamadron
- `#666` Yamadron Ritual
- `#671` Zera Ritual
- `#030` Zombie Warrior

## 3. Regras gerais e precedência

As linhas seguintes são dados de regra. Os nomes e categorias foram mantidos em inglês para
coincidir sem ambiguidade com o catálogo de 722 cartas e com as fontes técnicas.

```text
[AngelWinged] + [Egg]     = Winged Egg of New Life (1400/1700)
                              < Mystical Elf (800/2000),
                                Tiger Axe (1300/1100),
                                Celtic Guardian (1400/1200),
                                Dark Witch (1800/1700),
                                Dark Elf (2000/800)
[UsableBeast] + [Female]  = Nekogal #2 (1900/2000 Jupiter/Uranus)
[UsableBeast] + [Machine] = Giga-tech Wolf (1200/1400 Jupiter/Uranus)
                              < Flame Cerebrus (2100/1800)
                          = Dice Armadillo (1650/1800 Jupiter/Pluto)
                              < Flame Cerebrus (2100/1800)
[UsableBeast] + [Plant]   = Flower Wolf (1800/1400 Jupiter/Sun)
                              < Nekogal #2 (1900/2000),
                                Flame Cerebrus (2100/1800)
[UsableBeast] + [Pyro]    = Flame Cerebrus (2100/1800 Mars/Pluto)
[UsableBeast] + [Warrior] = Tiger Axe (1300/1100 Jupiter/Neptune)
                              < Nekogal #2 (1900/2000),
                                Flame Cerebrus (2100/1800),
                                

[Aqua] + [Dragon]         = Spike Seadra (1600/1300 Pluto/Mercury)
                          = Kairyu-shin (1800/1500 Neptune/Mars)
                              < Flame Swordsman (1800/1600)
[Turtle] + [Dragon]       = Sea King Dragon (2000/1700 Neptune/Mercury)
                              < Spike Seadra (1600/1300),
                                Kairyu-shin (1800/1500)
[Aqua] + {Kappa Avenger, Psychic Kappa}
                          = Hyosube (1500/900 Neptune/Venus)
[Aqua] + [Thunder]        = Bolt Escargot (1400/1500 Pluto/Jupiter)

[Beast] + [Fish]          = Tatsunootoshigo (1350/1600)
                              < Nekogal #2 (1900/2000)
                          = Rare Fish (1500/1200)
                          = Marine Beast (1700/1600)
                              < Nekogal #2 (1900/2000)
[Beast] + Larvas          = Mon Larvas (1300/1400)
[Beast] + [AngelWinged]   = Garvas (2000/1700 Jupiter/Pluto)
                              < Mystical Sheep #1 (1150/900),
                                Mon Larvas (1300/1400),
                                Winged Egg of New Life (1400/1700),
                                Dark Witch (1800/1700),
                                Nekogal #2 (1900/2000)
                                
[Beast] + [Thunder]       = Tripwire Beast (1200/1300)
[Beast] + [Turtle]        = Turtle Tiger (1000/1500)
[Beast] + [Zombie]        = Shadow Specter (500/200)

[MercuryMagicUser] + [Dragon]
                          = Blackland Fire Dragon (1500/800)
                              < Dragon Zombie (1600/0),
                                Dragon Statue (1100/900),
                                Dragoness the Wicked Knight (1200/900),
                                D. Human (1300/1100),
                                Sword Arm of Dragon (1750/2030)
[MercuryMagicUser] + [Elf]   = Dark Elf (2000/800 Mercury/Jupiter)

[MercurySpellcaster] + [Jar] = Ushi Oni (2150/1950 Jupiter/Venus)
                              < Mystical Sand (2100/1700)     
[MercurySpellcaster] + [Machine]
                          = Disk Magician (1350/1000)
[MercurySpellcaster] + Ryu-kishin 
                          = Ryu-kishin Powered (1600/1200)

[Dinosaur] + [Machine]    = Cyber Saurus (1800/1400 Uranus/Sun)

[Dragon] + Harpie Lady    = Harpie's Pet Dragon (2000/2500 Saturn/Moon)

[Dragon] + [Koumorian]    = Koumori Dragon (1500/1200)
                              < Dragoness the Wicked Knight (1200/900),
                                D. Human (1300/1100),
                                Tiger Axe (1300/1100)

[Dragon] + [Machine]      = Metal Dragon (1850/1700 Mars/Moon)
                              < Cyber Soldier (1500/1700),
                                Cyber Saurus (1800/1400),
                                Flame Swordsman (1800/1600)
[Dragon] + [Plant]        = B. Dragon Jungle King (2100/1800 Jupiter/Neptune)
                              < Bean Soldier (1400/1300),
                                Flame Swordsman (1800/1600),
                                Pumpking the King of Ghosts (1800/2000)
[Dragon] + [Rock]         = Stone D. (2000/2300 Uranus/Mars)
                             < Flame Swordsman (1800/1600)
[Dragon] + [Thunder]      = Thunder Dragon (1600/1500 Pluto/Jupiter)
                          = Twin-headed Thunder Dragon (2800/2100 Pluto/Moon)
                              < Skelgon (1700/1900),
                                Sword Arm of Dragon (1750/2030)
[Dragon] + Time Wizard
                          = Thousand Dragon (2400/2000 Mars/Mercury)
[Dragon] + [Warrior]      = Dragon Statue (1100/900)
                          = Dragoness the Wicked Knight (1200/900)
                              < Flame Swordsman (1800/1600)
                          = D. Human (1300/1100)
                          = Sword Arm of Dragon (1750/2030 Uranus/Moon)
                              < Skelgon (1700/1900),
                                Flame Swordsman (1800/1600),
                                Dark Elf (2000/800)
[Dragon] + [Zombie]       = Dragon Zombie (1600/0 Moon/Pluto)
                          = Skelgon (1700/1900 Moon/Pluto)
                          = Curse of Dragon (2000/1500 Saturn/Pluto)
                              < Sword Arm of Dragon (1750/2030),
                                Twin-headed Thunder Dragon (2800/2100)

[Elf] + [MystElfian]      = Mystical Elf (800/2000 Sun/Jupiter)

[Elf] + [Warrior]         = Celtic Guardian (1400/1200)
                              < Dark Elf (2000/800)

[Fairy] + [Female]        = Dark Witch (1800/1700 Sun/Neptune)
                              < Mystical Elf (800/2000),
                                Celtic Guardian (1400/1200),
                                Musician King (1750/1500),
                                Queen of Autumn Leaves (1800/1500),
                                Dark Elf (2000/800)

[FeatherFromBear] + Bear Trap
                          = Harpie's Feather Duster
[FeatherFromMachine] + Machine Conversion Factory
                          = Harpie's Feather Duster
[FeatherFromHarpie] + {Harpie Lady, Harpie Lady Sisters}
                          = Harpie's Feather Duster

[Bugrothian] + Ground Attacker Bugroth
                          = Amphibious Bugroth (1850/1300 Neptune/Sun)

[MusKingian] + {Hibikime, Sonic Maid}
                          = Musician King (1750/1500 Sun/Mars)

[Female] + [Fish]         = Ice Water (1150/900)
                              < Wow Warrior (1250/900),
                                Tatsunootoshigo (1350/1600)   
                          = Enchanting Mermaid (1200/900)
                          = Amazon of the Seas (1300/1400)
                              < Wow Warrior (1250/900),
                                Tatsunootoshigo (1350/1600),
                                Dark Witch (1800/1700),
                                Queen of Autumn Leaves (1800/1500)

[Female] + [Plant]        = Queen of Autumn Leaves (1800/1500 Jupiter/Moon)

[Female] + [Rock]         = Mystical Sand (2100/1700 Mercury/Saturn)
                              < Charubin the Fire Knight (1100/800),
                                Flame Swordsman (1800/1600),
                                B. Dragon Jungle King (2100/1800)

[Fiend] + Arlownay        = Rose Spectre of Dunn (2000/1800)
                              < Queen of Autumn Leaves (1800/1500)

[Fiend] + Fungi of the Musk
                          = Darkworld Thorns (1200/900)

[Fiend] + Job-change Mirror
                          = Summoned Skull (2500/1200 Moon/Pluto)
                              < Darkworld Thorns (1200/900)

[Fiend] + Psychic Kappa   = Kappa Avenger (1200/900)

[Sheepian] + Mystical Sheep #2 = Mystical Sheep #1 (1150/900)

[Thronian] + Protector of the Throne = Invader of the Throne (1350/1700)

[Fish] + [Machine]        = Misairuzame (1400/1600)
                          = Metal Fish (1600/1900 Neptune/Saturn)

[Fish] + [Rainbow]        = 7 Colored Fish (1800/800 Neptune/Sun)
                              < Queen of Autumn Leaves (1800/1500),
                                Dark Witch (1800/1700)

[Fish] + [Warrior]        = Wow Warrior (1250/900)

[Fish] + [Zombie]         = Corroding Shark (1100/700)

[Insect] + Kuwagata a     = Kwagar Hercules (1900/1700 Jupiter/Sun)

[Insect] + [Warrior]      = Cockroach Knight (800/900)

[Machine] + [Warrior]     = Cyber Soldier (1500/1700 Moon/Mars)
                              < Charubin the Fire Knight (1100/800),
                                Flame Swordsman (1800/1600)

[Plant] + [Pyro]          = Firegrass (700/600)

[Plant] + [Reptile]       = Snakeyashi (1000/1200)

[Plant] + [Warrior]       = Bean Soldier (1400/1300)
                              < Charubin the Fire Knight (1100/800),
                                Flame Swordsman (1800/1600),
                                Queen of Autumn Leaves (1800/1500)

[Plant] + [Zombie]        = Wood Remains (1000/900)
                          = Pumpking the King of Ghosts (1800/2000 Jup/Nep)

[Pyro] + Fiend Kraken     = Fire Kraken (1600/1500)
                              < Spike Seadra (1600/1300)

[Pyro] + [Rock]           = Dissolverock (900/1000)
                              < Stone Ghost (1200/1000),
                                Minomushi Warrior (1300/1200)

[Pyro] + [Turtle]         = Giant Turtle Who Feeds on Flames (1400/1800)
                              < 30,000-Year White Turtle (1250/2100),
                                Boulder Tortoise (1450/2200),
                                Turtle Bird (1900/1700)

[Pyro] + [Warrior]        = Charubin the Fire Knight (1100/800)
                              < Zombie Warrior (1200/900),
                                Queen of Autumn Leaves (1800/1500)
                          = Flame Swordsman (1800/1600 Mars/Sun)
                              < Zombie Warrior (1200/900),
                                Armored Zombie (1500/0),
                                Dragon Zombie (1600/0),
                                Queen of Autumn Leaves (1800/1500)
                          = Vermillion Sparrow (1900/1500 Mars/Venus)

[Pyro] + [Winged Beast]   = Mavelus (1300/900)
                          = Crimson Sunbird (2300/1800 Mars/Mercury)
                              < Flame Swordsman (1800/1600),
                                Vermillion Sparrow (1900/1500),
                                Queen of Autumn Leaves (1800/1500),
                                Harpie's Pet Dragon (2000/2500),
                                Mystical Sand (2100/1700)

[Pyro] + [Zombie]         = Fire Reaper (700/500)
                          = Flame Ghost (1000/800)
                              < Wood Remains (1000/900),
                                Zombie Warrior (1200/900),
                                Stone Ghost (1200/1000),
                                Magical Ghost (1300/1400),
                                The Snake Hair (1500/1200)

[Reptile] + {Clown Zombie, Crass Clown}
                          = Soul Hunter (2200/1800 Moon/Jupiter)
[Reptile] + [Thunder]     = Electric Lizard (850/800)

[Rock] + [Turtle]         = Boulder Tortoise (1450/2200)
[Rock] + [Warrior]        = Minomushi Warrior (1300/1200)
                              < Charubin the Fire Knight (1100/800),
                                Flame Swordsman (1800/1600),
                                Stone D. (2000/2300),
                                Mystical Sand (2100/1700)
                                
[Rock] + [Zombie]         = Stone Ghost (1200/1000)

[Spellcaster] + Mystic Lamp
                          = Lord of the Lamp (1400/1200)
                              < Dark Elf (2000/800)

[Spellcaster] + Spike Seadra
                          = Kaminari Attack (1900/1400 Pluto/Venus)
                              < Thousand Dragon (2400/2000)
[Spellcaster] + [Thunder] = The Immortal of Thunder (1500/1300 Pluto/Sun)
                          = Kaminari Attack (1900/1400)
                              < Thousand Dragon (2400/2000)

[Spellcaster] + [Turtle]  = 30,000-Year White Turtle (1250/2100)

[Spellcaster] + [Zombie]  = Magical Ghost (1300/1400)
                               < Dark Elf (2000/800)

[Turtle] + [Winged Beast] = Turtle Bird (1900/1700 Saturn/Mars)

[Warrior] + The Judgement Hand
                          = Judge Man (2200/1700 Sun/Saturn)
                              < Sword Arm of Dragon (1750/2030),
                                Musician King (1750/1500),
                                Flame Swordsman (1800/1600),
                                Vermillion Sparrow (1900/1500)
[Warrior] + [Zombie]      = Zombie Warrior (1200/900)
                              < Dragon Zombie (1600/0)
                          = Armored Zombie (1500/0 Moon/Pluto)
                              < Dragon Zombie (1600/0),
                                Dark Elf (2000/800)

[Winged Beast] + Boo Koo  = Spirit of the Books (1400/1200)
[Winged Beast] + [Mirror] = Fiend Refrection #1 (1300/1400)      
[Winged Beast] + Ryu-kishin
                          = Whiptail Crow (1650/1600 Moon/Mercury)
[Winged Beast] + The Judgement Hand
                          = Punished Eagle (2100/1800 Saturn/Pluto)
                              < Flame Swordsman (1800/1600)

[Zombie] + Graveyard and the Hand of Invitation
                          = The Snake Hair (1500/1200 Moon/Saturn)  
[Zombie] + Mammoth Graveyard 
                          = Great Mammoth of Goldfine (2200/1800 Moon/Pluto)
```

## 4. Receitas exatas

Estas receitas dependem das duas cartas indicadas, não apenas de suas categorias.

| Material A | Material B | Resultado |
| --- | --- | --- |
| Dark Hole | Stain Storm | Acid Trap Hole |
| Magician of Faith | Metalmorph | Ancient Elf |
| Zanki | Warrior Elimination | Armored Zombie |
| Bear Trap | Tiger Axe | Axe of Despair |
| Red-eyes B. Dragon | Summoned Skull | B. Skull Dragon |
| Battle Ox | Dragon Statue | Baby Dragon |
| Dragon Piper | Orion the Battle King | Baby Dragon |
| Monster Egg | The Wicked Worm Beast | Baby Dragon |
| Mooyan Curry | Mooyan Curry | Bad Reaction to Simochi |
| Key Mace | Shadow Specter | Battle Warrior |
| Beast Fangs | Megamorph | Bear Trap |
| Final Flame | Ooguchi | Beast Fangs |
| Dark Energy | Elegant Egotist | Beastry Mirror Ritual |
| Cyber Shield | Monster Tamer | Beautiful Beast Trainer |
| House of Adhesive Tape | Monster Eye | Big Eye |
| Dark Energy | Dark-piercing Light | Black Luster Ritual |
| Dark Energy | Machine Conversion Factory | Black Pendant |
| Boo Koo | Dark-piercing Light | Book of Secret Arts |
| Bad Reaction to Simochi | Goblin Fan | Breath of Light |
| Follow Wind | Wasteland | Breath of Light |
| Castle of Dark Illusions | Dark-piercing Light | Bright Castle |
| Crass Clown | Final Flame | Clown Zombie |
| Akihiron | Giant Soldier of Stone | Cocoon of Evolution |
| Ansatsu | LaMoon | Cocoon of Evolution |
| Darkfire Dragon | Tiger Axe | Cocoon of Evolution |
| Koumori Dragon | Summoned Skull | Cocoon of Evolution |
| Cyber Shield | Winged Trumpeter | Commencement Dance |
| Elf's Light | Malevolent Nuzzler | Contruct of Mask |
| Cyber Shield | Malevolent Nuzzler | Cosmo Queen's Prayer |
| Metalmorph | Vile Germs | Crush Card |
| Metalmorph | Metalmorph | Curse of Millennium Shield |
| Elegant Egotist | Horn of Light | Curse of Tri-Horned Dragon |
| Elegant Egotist | Horn of the Unicorn | Curse of Tri-Horned Dragon |
| Elegant Egotist | Key Mace | Cursebreaker |
| Yami | Yami | Dark Energy |
| Acid Trap Hole | Dark Energy | Dark Hole |
| Widespread Ruin | Zone Eater | Darkfire Dragon |
| Soul of the Pure | Soul of the Pure | Dian Keto the Cure Master |
| Dragon Treasure | Mooyan Curry | Dragon Capture Jar |
| Crawling Dragon | Dragon Capture Jar | Dragon Zombie |
| Twin Long Rods #2 | Graveyard and the Hand of Invitation | Dragon Zombie |
| Labyrinth Wall | Zone Eater | Dungeon Worm |
| Beast Fangs | Beast Fangs | Eatgaboon |
| Beautiful Beast Trainer | Warrior Elimination | Electro-whip |
| Monster Tamer | Warrior Elimination | Electro-whip |
| Electro-whip | Job-change Mirror | Elegant Egotist |
| Electro-whip | Wicked Mirror | Elegant Egotist |
| Electro-whip | Fiend's Mirror | Elegant Egotist |
| Ancient Elf | House of Adhesive Tape | Elf's Light |
| Follow Wind | Goblin's Secret Remedy | Eradicating Aerosol |
| Goblin's Secret Remedy | Machine Conversion Factory | Eradicating Aerosol |
| Dark Hole | Umi | Eternal Draught |
| Mystical Moon | Umi | Eternal Draught |
| Tremendous Fire | Umi | Eternal Draught |
| Elf's Light | Silver Bow and Arrow | Eternal Rest |
| Cursebreaker | Spellbinding Circle | Fake Trap |
| Reverse Trap | Widespread Ruin | Fake Trap |
| Hinotama | Hinotama | Final Flame |
| Megamorph | Vile Germs | Forest |
| Machine Conversion Factory | Umi | Fortress Whale's Oath |
| Curse of Dragon | Gaia the Fierce Knight | Gaia the Dragon Champion |
| Elegant Egotist | Legendary Sword | Garma Sword Oath |
| Magical Labyrinth | Metalmorph | Gate Guardian Ritual |
| Breath of Light | Follow Wind | Goblin Fan |
| Red Medicine | Red Medicine | Goblin's Secret Remedy |
| Book of Secret Arts | Mooyan Curry | Hamburger Recipe |
| Elegant Egotist | Harpie Lady | Harpie Lady Sisters |
| Flying Penguin | Invisible Wire | Harpie's Feather Duster |
| Sparks | Sparks | Hinotama |
| Raise Body Heat | Reverse Trap | Horn of the Unicorn |
| Eradicating Aerosol | Magical Labyrinth | House of Adhesive Tape |
| Machine Conversion Factory | Hinotama | Insect Armor with Laser Cannon |
| Elegant Egotist | Raigeki | Invigoration |
| Black Pendant | Yami | Invisible Wire |
| Forest | Power of Kaishin | Javelin Beetle Pact |
| Darkfire Dragon | Reverse Trap | Kairyu-shin |
| Final Flame | Waterdragon Fairy | Kairyu-shin |
| Armed Ninja | Sinister Serpent | Korogashi |
| Legendary Sword | Sword of Dark Destruction | Kunai with Chain |
| Machine Conversion Factory | Violet Crystal | Laser Cannon Armor |
| Jirai Gumo | Metalmorph | Launcher Spider |
| Flame Swordsman | Umi | Legendary Sword |
| House of Adhesive Tape | Metalmorph | Machine Conversion Factory |
| Dian Keto the Cure Master | Dian Keto the Cure Master | Megamorph |
| Electro-whip | Metal Guardian | Metalmorph |
| Machine Conversion Factory | Metal Guardian | Metalmorph |
| Baby Dragon | Metalmorph | Metal Dragon |
| Tongyo | Metalmorph | Metal Fish |
| Metalmorph | Zoa | Metalzoa |
| Meteor Dragon | Red-eyes B. Dragon | Meteor B. Dragon |
| Celtic Guardian | Sonic Maid | Musician King |
| Ancient Elf | Sonic Maid | Musician King |
| Blue-eyed Silver Zombie | Mystical Sheep #2 | Mystical Sheep #1 |
| Beautiful Beast Trainer | Mooyan Curry | Monster Tamer |
| Eternal Rest | Kunai with Chain | Novox's Prayer |
| Final Flame | Final Flame | Ookazi |
| Breath of Light | Umi | Power of Kaishin |
| Metalmorph | Stain Storm | Puppet Ritual |
| Battle Ox | Mystic Horseman | Rabid Horseman |
| Electro-whip | Metalmorph | Raigeki |
| Mooyan Curry | Sparks | Raise Body Heat |
| Koumori Dragon | Saggi the Dark Clown | Reaper of the Cards |
| B. Dragon Jungle King | Tyhone #2 | Red-eyes B. Dragon |
| Blackland Fire Dragon | Tyhone #2 | Red-eyes B. Dragon |
| Darkfire Dragon | Tyhone #2 | Red-eyes B. Dragon |
| Malevolent Nuzzler | Malevolent Nuzzler | Resurrection of Chakra |
| Cursebreaker | Megamorph | Reverse Trap |
| Fake Trap | Megamorph | Reverse Trap |
| Curse of Millennium Shield | Puppet Ritual | Revival of Sennen Genjin |
| Elegant Egotist | Mystical Moon | Revival of Sennen Genjin |
| Machine Conversion Factory | Wasteland | Revival of Skeleton Rider |
| Dark Energy | Dragon Treasure | Revived of Serpent Night Dragon |
| Legendary Sword | Sparks | Salamandra |
| Kuriboh | Skull Servant | Shadow Specter |
| Spellbinding Circle | Spellbinding Circle | Shadow Spell |
| Goblin's Secret Remedy | Goblin's Secret Remedy | Soul of the Pure |
| Winged Trumpeter | Winged Trumpeter | Soul of the Pure |
| Acid Trap Hole | Follow Wind | Stain Storm |
| Electro-whip | Umi | Stain Storm |
| Final Flame | Monsturtle | Steel Shell |
| Millennium Shield | Reverse Trap | Stop Defense |
| Time Wizard | Embryonic Beast | Summoned Skull |
| Armored Zombie | Eternal Rest | Sword of Dark Destruction |
| Dark-piercing Light | Shadow Spell | Swords of Revealing Light |
| Ancient Brain | Invisible Wire | Tainted Wisdom |
| Clown Zombie | Kojikocy | The 13th Grave |
| Dream Clown | Mysterious Puppeteer | The 13th Grave |
| Ancient Jar | Mystery Hand | The Wicked Worm Beast |
| Ancient Jar | Fiend Sword | Tiger Axe |
| Petit Dragon | Serpent Marauder | Trakadon |
| Ookazi | Ookazi | Tremendous Fire |
| Fake Trap | Steel Shell | Turtle Oath |
| Power of Kaishin | Umi | Turtle Oath |
| Dragon Treasure | Megamorph | Ultimate Dragon |
| Crush Card | Forest | Vile Germs |
| Elegant Egotist | Kuriboh | Vile Germs |
| Breath of Light | Prisman | Violet Crystal |
| Beast Fangs | Elegant Egotist | War-lion Ritual |
| Forest | Ookazi | Wasteland |
| Aqua Snake | Waterdragon Fairy | Water Magician |
| Dragon Capture Jar | Tremendous Fire | Widespread Ruin |
| Machine Conversion Factory | Silver Bow and Arrow | Winged Trumpeter |
| Armored Zombie | Wood Clown | Witty Phantom |
| Djinn the Watcher of the Wind | Wolf | Witty Phantom |
| Gyakutenno Megami | Weather Control | Witty Phantom |
| Oscillo Hero #2 | Spirit of the Harp | Witty Phantom |
| Elegant Egotist | Wicked Dragon with the Ersatz Head | Yamadron |
| Dragon Treasure | Elegant Egotist | Yamadron Ritual |
| Dark Energy | Malevolent Nuzzler | Zera Ritual |

## 5. Categorias secundárias

Forbidden Memories possui agrupamentos de fusão que não correspondem apenas ao tipo primário
impresso na carta. As definições abaixo tornam as regras da seção 3 fechadas e aplicáveis. Quando
uma definição usa Guardião Estelar ou um conjunto enumerado, todos os requisitos escritos fazem
parte da categoria.

```text
[Sheepian] + Mystical Sheep #2 = Mystical Sheep #1 (1150/900)

[FiendOrGS1Moon] + Mystical Sheep #2 
                          = Mystical Sheep #1 (1150/900)
                              < Nekogal #2 (1900/2000)
                                Flame Cerebrus (2100/1800)
                                Giga-tech Wolf (1200/1400)
                                Tiger Axe (1300/1100)
                                Flower Wolf (1800/1400)

Sheepians are monsters with strictly less than 1150 attack points that
- have primary type Fiend and are not Candle of Fate or Key Mace #2;
- have first guardian star Moon and primary type Aqua, Beast,
Beast-Warrior, Dinosaur, Dragon, Insect, Rock or Zombie or
- are Blue-eyed Silver Zombie.
-----------------------------------------------------------------
[Thronian] + Protector of the Throne = Invader of the Throne (1350/1700)

[FiendOrGS1MoonNotMoonEnvoy] + Protector of the Throne 
                                  = Invader of the Throne (1350/1700)
                                      < Charubin the Fire Knight (1100/800)
                                        Dragon Statue (1100/900)
                                        Zombie Warrior (1200/900)
                                        D. Human (1300/1100)
                                        Cyber Soldier (1500/1700)
                                        Armored Zombie (1500/0)
                                        Queen of Autumn Leaves (1800/1500)
                                        Dark Witch (1800/1700)
                                        Nekogal #2 (1900/2000)
                                        Mystical Sand (2100/1700)

Thronians are monsters with strictly less than 1350 attack points that
- have primary type Fiend and are not Candle of Fate;
- have first guardian star Moon and primary type Aqua, Beast, Beast-Warrior,
Dinosaur, Insect or Warrior and are not Air Marmot of Nefariousness, Obese 
Marmot of Nefariousness or Moon Envoy or
- are Mammoth Graveyard.
-----------------------------------------------------------------
[Dragon] + [Koumorian]    = Koumori Dragon (1500/1200)
                              < Dragoness the Wicked Knight (1200/900),
                                D. Human (1300/1100),
                                Tiger Axe (1300/1100)

[Dragon] + ([GS1MoonNotFairy] u {Kuriboh, Mammoth Graveyard})
                          = Koumori Dragon (1500/1200)
                              < Dragon Statue (1100/900),
                                Dragoness the Wicked Knight (1200/900),
                                D. Human (1300/1100),
                                Tiger Axe (1300/1100),
                                Bean Soldier (1400/1300),
                                Cyber Soldier (1500/1700),
                                Dragon Zombie (1600/0),
                                Spike Seadra  (1600/1300),
                                Sword Arm of Dragon (1750/2030),
                                Metal Dragon  (1850/1700),
                                Stone D. (2000/2300),
                                B. Dragon Jungle King (2100/1800)

Koumorians are monsters with strictly less than 1500 attack points that
- have first guardian star Moon and primary type Beast, Beast-Warrior, Dinosaur,
Dragon, Fiend or Insect or
- are Kuriboh or Mammoth Graveyard.
-----------------------------------------------------------------
[Bugrothian] + Ground Attacker Bugroth
                          = Amphibious Bugroth (1850/1300 Neptune/Sun)

[AquaOrGS1Neptune] + Ground Attacker Bugroth
                          = Amphibious Bugroth (1850/1300 Neptune/Sun)
                              < Metal Fish (1600/1900),
                                Metal Dragon (1850/1700)

Bugrothians are monsters with strictly less than 1850 attack points that have primary
type Aqua or first guardian star Neptune and that are not Fish with strictly
less than 1600 attack points nor Sea Serpents.
-----------------------------------------------------------------
[MercuryMagicUser] + [Dragon]
                          = Blackland Fire Dragon (1500/800)
                              < Dragon Zombie (1600/0),
                                Dragon Statue (1100/900),
                                Dragoness the Wicked Knight (1200/900),
                                D. Human (1300/1100),
                                Sword Arm of Dragon (1750/2030)
[MercuryMagicUser] + [Elf]   = Dark Elf (2000/800)

[MercurySpellcaster] + [Jar] = Ushi Oni (2150/1950)
                              < Mystical Sand (2100/1700)     
[MercurySpellcaster] + [Machine]
                          = Disk Magician (1350/1000)
[MercurySpellcaster] + Ryu-kishin 
                          = Ryu-kishin Powered (1600/1200)

MercuryMagicUsers are
- monsters that have Mercury as their first guardian star with attack strictly
less than 2000, except Mammoth Graveyard, Kuriboh, Dark Chimera and
Man-eating Plant
- Guardian of the Labyrinth
- optionally, monsters with Mercury as their first guardian star and attack
greater than or equal to 2000 can be included, namely Chakra, Dark Elf
Dark Magician, Gaia the Fierce Knight, Magician of Black Chaos,
Mystical Sand, Serpent Night Dragon and Skull Knight

MercurySpellcasters are monsters with Mercury as their first guardian star that have primary
type Spellcaster and strictly less than 2150 attack points. Optionally,
spellcasters with first guardian star Mercury and attack level greater than
or equal to 2150 may be included, namely Dark Elf, Dark Magician,
Kamion Wizard, Leo Wizard, Magician of Black Chaos and Skull Knight.
Note that dark spellcasters are spellcasters that are also dark magic users, if
we include Dark Elf as a dark magic user.

All MercurySpellcasters can be equipped with Black Pendant, except Nemuriko
There are 17 MercuryMagicUsers that can't be equipped with Black Pendant
There are 77 cards that can be equipped with Black Pendant that aren't MercuryMagicUsers and a significant number of them have low attack
-------------------------------------------------------------------------------------
Materials that don't fuse with Machine Conversion Factory to yield Harpie's Feather Duster:

**Bear Trap** (trap)
Magical Labyrinth (equip)
Eatgaboon (trap)
House of Adhesive Tape (trap)
Invisible Wire (trap)

(traps or magical Labyrinth or harpie lady or harpie lady sisters) + {harpie lady, harpie lady sisters} = Harpie's Feather Duster

invisible wire + flying penguin = duster

bear trap + [FeatherFromBear] = duster
machine conv factory + [FeatherFromMachine] = duster
[FeatherFromHarpie] + {harpie lady, harpie lady sisters} = duster


if something + bear trap = duster
then something + machine conv factory = duster
------------------------------------------------------------------------
MystElfians are
- monsters that have Sun as their first guardian star and strictly less
than 800 attack points
- Lunar Queen Elzaim
------------------------------------------------------------------------
MusKingians are monsters that fuse with Hibikime to become Musician King.
Equivalently, these are monsters that have strictly less than 1750 attack points
that
- are non-Elves with first guardian star Sun and primary type Fairy, Spellcaster
or Warrior that are not Ray & Temperature or
- are Faith Bird, Guardian of the Throne Room, Lunar Queen Elzaim or Moon Envoy
Note: don't forget about the two exact fusions that yield Musician King!
```

### Categorias secundárias por carta

Esta é a relação compacta fornecida junto das definições. Cartas ausentes não possuem categoria
secundária adicional além do tipo primário.

```text
PERGUNTA: como descrever soft secondary types no guia?

CARACTERIZAÇÃO + CONFLITOS + MATERIAIS

OPÇÃO 1: Vantagens e desvantagens de escrever [MusKingian] ou [Sheepian] e definir [Sheepian] = cartas que fundem com Mystical Sheep #2 para dar Mystical Sheep #1
- mais um tipo para listar
- difícil de entender numa primeira leitura
- a CARACTERIZAÇÃO pode ficar mais complicada


OPÇÃO 2: Vantagens e desvantagens de escrever [MusKingian] ou [Sheepian] e definir [Sheepian] = [FiendOrGS1Moon]:
- mais um tipo para listar
- difícil de entender numa primeira leitura
- mais CONFLITOS
- na seção que lista os tipos de cada monstro, não ficaria imediato se o monstro vai fundir em Mystical Sheep #1 ou não


OPÇÃO 3: Vantagens e desvantagens de escrever [GS1Sun] \ [Elf] \ [Dragon] \ {Ray & Temperature, Holograh} \ [Zombie] e [FiendOrGS1Moon]
- MATERIAIS mais complicados
- na seção que lista os tipos de cada monstro, não ficaria imediato se o monstro vai fundir em Mystical Sheep #1 ou não
- mais conflitos

col1: card name
col2: primary type
col3: secondary types

hard secondary types:
[AngelWinged] 
[FeatherFromBear] 
[FeatherFromHarpie]
[FeatherFromMachine]
[Female]
[Pyro]
[UsableBeast]

soft secondary types:
usar opção 1:

[MercuryMagicUser]  (usei opção 1, opção 2 inviável)
[MercurySpellcaster]  (usei opção 1, opção 2 viável)
[Dragon]  (usei opção 1)
[Elf]  (usei opção 1)
[Jar]  (usei opção 1)
[MusKingian]  (usei opção 1)
[MystElfian]  (usei opçAo 1)


[Koumorian]  (usei opção 3)
[Sheepian]  (usei opção 3)
[Thronian]  (usei opção 3)

usar opção 2:
[Bugrothian]  (usei opção 3)
[Egg]  (usei opção 2)
[Mirror]  (usei opção 2)
[Rainbow]  (usei opcao 2)
[Turtle]  (usei opcao 2)

usar opção 3:
```

## 6. Fusões de glitch

A implementação original compacta dois materiais e dois resultados em grupos de cinco bytes. A
rotina percorre as entradas de duas em duas; quando uma carta possui quantidade ímpar de fusões,
ela ainda lê uma entrada seguinte sem conferir o fim da lista. A análise do executável
`SLUS-01411` identifica **15 leituras extras possíveis**.

Essas leituras não são receitas intencionais e **não integram as 50.242 combinações normais**.
Também não devem ser misturadas à futura tabela de runtime. A fonte técnica disponível documenta
o algoritmo e a quantidade, mas não publica uma enumeração auditável dos 15 pares e resultados;
por isso eles são registrados aqui como comportamento separado, sem inventar uma lista. Uma
enumeração só deve ser adicionada após extração reproduzível do executável original.

## 7. Evidências e limites da verificação

- O guia de Marcelo Silvarolla declara 50.242 fusões e informa que as regras foram expandidas e
  comparadas por SQL com a base extraída do jogo.
- O arquivo factual `fusions.txt` do mesmo projeto fornece as regras gerais, conflitos e receitas
  exatas usadas neste documento; `secondaryTypeDefinitions.txt` e `secondaryTypes.txt` fecham
  as categorias secundárias.
- Uma base explícita independente foi usada como conferência de nomes e números. Ela contém
  **24.654 pares transformacionais**, portanto é tratada como
  verificação parcial e não como prova isolada das 50.242 combinações.
- A ROM map confirma que o par é canonicalizado pelo menor ID e descreve o defeito que causa as
  15 leituras extras.
- Este guia cobre fusões que produzem outra carta. Aplicação de equipamento que apenas aumenta
  ATK/DEF é mecânica de equipamento e está documentada separadamente em
  [`docs/spells/equip-buffs.md`](./spells/equip-buffs.md).

## 8. Fontes

1. [Fusion Guide, versão 1.20 — GameFAQs](https://gamefaqs.gamespot.com/ps/561010-yu-gi-oh-forbidden-memories/faqs/78677)
2. [YFM Database and Fusion Guide — regras e validadores](https://github.com/MarceloSilvarolla/YFM-Database-and-Fusion-Guide)
3. [ROM map de Forbidden Memories — rotina de fusão](https://datacrystal.tcrf.net/wiki/Yu-Gi-Oh%21_Forbidden_Memories/ROM_map#Fusion_checking_routine)
4. [Forbidden Memories Database — conferência consultável](https://yugioh-fm-db.pages.dev/fusions/)
5. [Dump público parcial de pares explícitos](https://gist.github.com/jimmcnulty41/36fbf0e46972fd6acabd105b8fc10ed2)
