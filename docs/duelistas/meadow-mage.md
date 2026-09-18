# Meadow Mage

> Fonte de dados: `packages/data/data/duelists/meadow-mage.json` · Entrada no roster: `meadow-mage`

| Campo | Valor |
|---|---|
| Id no jogo original | 29 (`Meadow Mage`) |
| Mão no original | 14 cartas; contexto histórico, não altera a mão do motor |
| Dificuldade | `medium` |
| Retrato | `duelists/meadow-mage.png` (pixel art PS1 gerada) |
| Estratégia | `fm-basic` |
| Seed do deck | `20260805` |

## Quem é e dificuldade

Meadow Mage — o mago menor do Meadow Shrine, encontro intermediário da campanha anterior a
High Mage Kepura. Esta entrada representa exclusivamente o id 29, sem agrupar variantes.
O pool favorece Warrior e Beast-Warrior: 50 e 13 entradas, respectivamente, entre 65 monstros.
Sogen (`333`, peso 160/2048) é a entrada mais pesada; Warrior Elimination (`653`, 128/2048)
é a segunda. O teto de ataque do pool é 2200.

A classificação `medium` combina essa posição na progressão e os números: o deck derivado tem
média de 1404,69 ATK entre seus 32 monstros, teto 1900 e suporte de terreno/remoção. Fica acima
de Teana e Jono e próximo de Forest Mage (média 1228, teto 2100), abaixo de Nitemare e Seto 3rd.
A dificuldade é uma escolha do Remastered, não um campo extraído nem um bônus oculto.

## Retrato

Arte própria gerada pelo skill `imagegen`, ferramenta built-in, com duas variantes a partir do
[mugshot original](https://yugiohpro.com.br/assets/images/duelists/29.png), associado à
[página de Meadow Mage](https://yugiohpro.com.br/duelist.php?id=29). Somente o PNG selecionado
é versionado em `apps/web/public/duelists/meadow-mage.png`.

Escolhida a composição frontal por preservar a máscara dourada geométrica, capuz verde,
boca e queixo visíveis, barba angular e leitura em miniatura. Inspeção das duas variantes:
identidade e anatomia coerentes, capuz inteiro, margem para corte 4:3, fundo opaco, sem texto,
marcas, cartas ou personagens extras. A preferência explícita do usuário pelo skill atual
substitui a orientação de placeholder da issue #61.

A seleção `/free-duel` foi carregada no Chrome headless com os sete duelistas visíveis.
O retrato respondeu com dimensões naturais 1448 × 1086, sem fallback, e Meadow Mage
pôde ser selecionado para iniciar o duelo.

### Prompt final

```text
Create a standalone opponent portrait of Meadow Mage (the low Meadow Mage, FM duelist 29)
from Yu-Gi-Oh Forbidden Memories for a PS1-style game. Use the attached tiny original mugshot
as identity reference only. Adult human Egyptian mage, green hood and cloak with gold edging,
geometric golden mask covering the upper face and nose, dark narrow eye openings, tan visible
mouth and chin with a dark small angular goatee, gold brow ornament. Match the reference
silhouette and color placement. Centered chest-up bust with full hood visible and generous
margin for safe 4:3 crop. Opaque muted grassland and ancient stone shrine background. Crisp
visible pixel clusters, limited warm gold and deep green palette, restrained dithering,
authentic PS1 pixel portrait. Landscape 4:3. No text, letters, logo, watermark, card frame,
cards, weapons, additional people or transparency. Variant A: frontal symmetrical pose,
calm stern expression, warm daylight.
```

## Pool de deck

70 entradas, peso total 2048: 65 monstros, 4 mágicas e 1 ritual. Extração direta do SQLite,
ordenada por `CardId`; nenhum peso foi ajustado.

| Carta | Nome | Classe e atributos | Peso /2048 |
|---|---|---|---:|
| `003` | Hitotsu-me Giant | Beast-Warrior 1200/1000 | 24 |
| `012` | Swamp Battleguard | Warrior 1800/1500 | 32 |
| `014` | Battle Steer | Beast-Warrior 1800/1300 | 32 |
| `015` | Flame Swordsman | Warrior 1800/1600 | 32 |
| `026` | Battle Ox | Beast-Warrior 1700/1000 | 24 |
| `027` | Beaver Warrior | Beast-Warrior 1200/1500 | 24 |
| `029` | Mountain Warrior | Beast-Warrior 600/1000 | 16 |
| `033` | Judge Man | Warrior 2200/1500 | 32 |
| `041` | Celtic Guardian | Warrior 1400/1200 | 24 |
| `043` | Karbonala Warrior | Warrior 1500/1200 | 24 |
| `064` | Tiger Axe | Beast-Warrior 1300/1100 | 24 |
| `066` | Kojikocy | Warrior 1500/1200 | 24 |
| `068` | Garoozis | Beast-Warrior 1800/1500 | 32 |
| `078` | Axe Raider | Warrior 1700/1150 | 24 |
| `092` | Rabid Horseman | Beast-Warrior 2000/1700 | 32 |
| `093` | Zanki | Warrior 1500/1700 | 32 |
| `100` | Battle Warrior | Warrior 700/1000 | 16 |
| `110` | Hero of the East | Warrior 1100/1000 | 24 |
| `118` | Supporter in the Shadows | Warrior 1000/1000 | 24 |
| `120` | Dream Clown | Warrior 1200/900 | 24 |
| `127` | Ansatsu | Warrior 1700/1200 | 24 |
| `138` | Dragon Statue | Warrior 1100/900 | 24 |
| `151` | Rhaimundos of the Red Sword | Warrior 1200/1300 | 24 |
| `165` | The Judgement Hand | Warrior 1400/700 | 24 |
| `166` | Mysterious Puppeteer | Warrior 1000/1500 | 24 |
| `172` | Armaill | Warrior 700/1300 | 24 |
| `219` | Solitude | Beast-Warrior 1050/1000 | 24 |
| `225` | Fiend Sword | Warrior 1400/800 | 24 |
| `226` | Skull Stalker | Warrior 900/800 | 16 |
| `231` | Wood Clown | Warrior 800/1200 | 24 |
| `234` | Beautiful Headhuntress | Warrior 1600/800 | 24 |
| `235` | Wodan the Resident of the Forest | Warrior 900/1200 | 24 |
| `236` | Guardian of the Labyrinth | Warrior 1000/1200 | 24 |
| `239` | Vishwar Randi | Warrior 900/700 | 16 |
| `246` | One Who Hunts Souls | Beast-Warrior 1100/1000 | 24 |
| `250` | Hyo | Warrior 800/1200 | 24 |
| `256` | Dimensional Warrior | Warrior 1200/1000 | 24 |
| `262` | The Little Swordsman of Aile | Warrior 800/1300 | 24 |
| `266` | Princess of Tsurugi | Warrior 900/700 | 16 |
| `280` | Protector of the Throne | Warrior 800/1500 | 24 |
| `287` | Ogre of the Black Shadow | Beast-Warrior 1200/1400 | 24 |
| `290` | Moon Envoy | Warrior 1100/1000 | 24 |
| `293` | Masaki the Legendary Swordsman | Warrior 1100/1100 | 24 |
| `294` | Dragoness the Wicked Knight | Warrior 1200/900 | 24 |
| `295` | Bio Plant | Fiend 600/1300 | 16 |
| `299` | Sonic Maid | Warrior 1200/900 | 24 |
| `320` | Stop Defense | Mágica | 32 |
| `333` | Sogen | Mágica | 160 |
| `348` | Swords of Revealing Light | Mágica | 32 |
| `352` | Kanan the Swordmistress | Warrior 1400/1400 | 24 |
| `354` | Stuffed Animal | Warrior 1200/900 | 24 |
| `362` | Millennium Shield | Warrior 0/3000 | 32 |
| `376` | Monster Tamer | Warrior 1800/1600 | 32 |
| `378` | Swordstalker | Warrior 2000/1600 | 32 |
| `382` | Rude Kaiser | Beast-Warrior 1800/1600 | 32 |
| `389` | Giltia the D. Knight | Warrior 1850/1500 | 32 |
| `434` | Beautiful Beast Trainer | Warrior 1750/1500 | 32 |
| `502` | D. Human | Warrior 1300/1100 | 24 |
| `547` | Griggle | Plant 350/300 | 32 |
| `553` | Mushroom Man #2 | Warrior 1250/800 | 24 |
| `554` | Lava Battleguard | Warrior 1550/1800 | 32 |
| `559` | Oscillo Hero | Warrior 1250/700 | 16 |
| `572` | Empress Judge | Warrior 2100/1700 | 32 |
| `618` | Warrior of Tradition | Warrior 1900/1700 | 32 |
| `621` | Succubus Knight | Warrior 1650/1300 | 24 |
| `627` | Nekogal #2 | Beast-Warrior 1900/2000 | 32 |
| `641` | Invader of the Throne | Warrior 1350/1700 | 32 |
| `649` | Hibikime | Warrior 1450/1000 | 24 |
| `653` | Warrior Elimination | Mágica | 128 |
| `677` | Hamburger Recipe | Ritual | 40 |

## Deck canônico (40 cartas)

Seed `20260805`, mantida conforme a recomendação da issue. O algoritmo existente deriva
28 cartas distintas, no máximo três cópias: 32 monstros, 6 mágicas e 2 rituais. A amostra
inclui duas cópias de Sogen e três de Warrior Elimination, preservando o tema sem procurar
uma seed artificialmente mais forte. Não há sorteio de outro deck em runtime.

| Cópias | Carta | Nome | Classe e atributos |
|---:|---|---|---|
| 1 | `003` | Hitotsu-me Giant | Beast-Warrior 1200/1000 |
| 2 | `012` | Swamp Battleguard | Warrior 1800/1500 |
| 1 | `014` | Battle Steer | Beast-Warrior 1800/1300 |
| 1 | `015` | Flame Swordsman | Warrior 1800/1600 |
| 2 | `064` | Tiger Axe | Beast-Warrior 1300/1100 |
| 1 | `068` | Garoozis | Beast-Warrior 1800/1500 |
| 1 | `078` | Axe Raider | Warrior 1700/1150 |
| 2 | `120` | Dream Clown | Warrior 1200/900 |
| 1 | `165` | The Judgement Hand | Warrior 1400/700 |
| 1 | `219` | Solitude | Beast-Warrior 1050/1000 |
| 1 | `225` | Fiend Sword | Warrior 1400/800 |
| 1 | `231` | Wood Clown | Warrior 800/1200 |
| 1 | `234` | Beautiful Headhuntress | Warrior 1600/800 |
| 1 | `235` | Wodan the Resident of the Forest | Warrior 900/1200 |
| 1 | `250` | Hyo | Warrior 800/1200 |
| 2 | `256` | Dimensional Warrior | Warrior 1200/1000 |
| 1 | `262` | The Little Swordsman of Aile | Warrior 800/1300 |
| 1 | `287` | Ogre of the Black Shadow | Beast-Warrior 1200/1400 |
| 1 | `290` | Moon Envoy | Warrior 1100/1000 |
| 2 | `333` | Sogen | Mágica |
| 1 | `348` | Swords of Revealing Light | Mágica |
| 3 | `382` | Rude Kaiser | Beast-Warrior 1800/1600 |
| 2 | `389` | Giltia the D. Knight | Warrior 1850/1500 |
| 1 | `547` | Griggle | Plant 350/300 |
| 2 | `627` | Nekogal #2 | Beast-Warrior 1900/2000 |
| 1 | `641` | Invader of the Throne | Warrior 1350/1700 |
| 3 | `653` | Warrior Elimination | Mágica |
| 2 | `677` | Hamburger Recipe | Ritual |

## Pools de drop

Os três pools mantêm todos os pesos originais. O Rating Engine escolhe o tier pela nota;
a carta é sorteada com os pesos daquele tier, não uniformemente.

| Tier | Tabela original | Entradas | Peso total |
|---|---|---:|---:|
| `common` | BCD | 47 | 2048 |
| `sa-pow` | SAPow | 52 | 2048 |
| `sa-tec` | SATec | 37 | 2048 |

A tabela permite revisar os três pools sem abrir o JSON. `—` indica ausência naquele tier.

| Carta | Nome | BCD /2048 | SAPow /2048 | SATec /2048 |
|---|---|---:|---:|---:|
| `002` | Mystical Elf | 50 | 44 | 46 |
| `006` | Feral Imp | 50 | 44 | 46 |
| `009` | Shadow Specter | 178 | 150 | 150 |
| `010` | Blackland Fire Dragon | 50 | 44 | 46 |
| `019` | Right Arm of the Forbidden One | 12 | 10 | 4 |
| `025` | Horn Imp | 50 | 44 | 46 |
| `027` | Beaver Warrior | 50 | 44 | 46 |
| `030` | Zombie Warrior | 50 | 44 | 46 |
| `031` | Koumori Dragon | 50 | 46 | 46 |
| `035` | Dark Magician | — | 46 | — |
| `038` | Gaia the Fierce Knight | — | 46 | — |
| `039` | Curse of Dragon | — | 46 | — |
| `041` | Celtic Guardian | 50 | 46 | 46 |
| `046` | Griffore | 50 | 46 | 46 |
| `047` | Torike | 50 | 46 | 46 |
| `048` | Sangan | 50 | 46 | 46 |
| `059` | Mammoth Graveyard | 50 | 46 | 46 |
| `065` | Silver Fang | 50 | 46 | 46 |
| `074` | Giant Soldier of Stone | — | 46 | — |
| `089` | Catapult Turtle | 50 | 46 | — |
| `094` | Crawling Dragon | 22 | 20 | — |
| `102` | Mask of Darkness | 22 | — | 20 |
| `111` | Doma The Angel of Silence | 22 | 20 | — |
| `130` | Weather Control | 100 | 90 | 90 |
| `238` | Yashinoki | 22 | 20 | 20 |
| `301` | Legendary Sword | — | — | 64 |
| `313` | Horn of Light | — | — | 64 |
| `314` | Horn of the Unicorn | — | — | 64 |
| `333` | Sogen | 66 | 60 | 64 |
| `336` | Dark Hole | — | — | 64 |
| `345` | Final Flame | — | — | 64 |
| `349` | Spellbinding Circle | — | — | 64 |
| `381` | Toon Alligator | 2 | 2 | 2 |
| `396` | Ocubeam | 22 | 20 | — |
| `408` | Giant Mech-soldier | 22 | 20 | — |
| `409` | Metal Dragon | 22 | 20 | — |
| `422` | Jinzo #7 | 96 | 88 | 88 |
| `436` | White Dolphin | 96 | 88 | 80 |
| `437` | Deepsea Shark | 22 | 20 | — |
| `439` | Bottom Dweller | 22 | 20 | — |
| `444` | Turu-Purun | 96 | — | 84 |
| `458` | Kaminari Attack | 22 | 20 | — |
| `473` | Vermillion Sparrow | 22 | 20 | — |
| `482` | Pragtical | 22 | 20 | — |
| `485` | Korogashi | 96 | 88 | 80 |
| `487` | Flower Wolf | 22 | 20 | — |
| `509` | Bracchio-raidus | — | 20 | — |
| `516` | Muka Muka | 96 | 88 | 80 |
| `521` | Skullbird | 12 | 20 | — |
| `533` | Kwagar Hercules | 12 | 20 | — |
| `542` | Misairuzame | 22 | 20 | — |
| `557` | Steel Ogre Grotto #1 | 22 | 20 | — |
| `563` | Wretched Ghost of the Attic | 96 | 88 | 80 |
| `618` | Warrior of Tradition | 12 | 20 | — |
| `637` | Trent | 22 | 20 | — |
| `659` | Winged Trumpeter | 12 | 20 | — |
| `676` | Commencement Dance | — | — | 32 |
| `677` | Hamburger Recipe | — | — | 32 |
| `681` | House of Adhesive Tape | — | — | 64 |
| `682` | Eatgaboon | — | — | 64 |
| `690` | Fake Trap | — | — | 32 |
| `707` | Skull Knight | — | 20 | — |
| `712` | Meteor Dragon | 12 | 20 | — |
| `713` | Meteor B. Dragon | — | 20 | — |
| `714` | Firewing Pegasus | 2 | 20 | — |

## Como ele joga e limites de fidelidade

O tema de terreno é sustentado pelo dump: Sogen favorece as classes que dominam o pool.
As páginas complementares de Fandom, Yugipedia e GameFAQs bloquearam o fetch automatizado;
não houve observação direta de uma partida do PS1 nesta entrega. As observações abaixo
são do motor real do Remastered, sem alegar equivalência exata da política do original.

`fm-basic` prioriza invocar o monstro de maior ATK, defender em desvantagem visível e atacar
trocas favoráveis. Tenta mágicas depois da invocação. Como o motor permite uma jogada da mão
por turno, não há garantia de Sogen no primeiro turno: a IA só o usa quando a invocação não
é possível. Essa prioridade é a estratégia existente, sem regra especial para Meadow Mage.

Sogen, Warrior Elimination, Stop Defense e Swords of Revealing Light têm efeitos registrados.
Stop Defense está no pool, mas não saiu no deck canônico. As duas cópias de Hamburger Recipe
são preservadas; `fm-basic` não possui uma política de invocação ritual. Não se remove suporte
não aproveitado nem se inventam efeitos para tornar o deck mais forte.

## Perfil de IA

```json
{ "strategy": "fm-basic", "parameters": { "aggression": 0.5, "playsSpells": true, "playsFieldSpells": true, "defensiveThreshold": 0 } }
```

`aggression: 0.5`, `playsSpells: true` e `defensiveThreshold: 0` são os defaults públicos.
A única diferença é `playsFieldSpells: true` (default `false`), justificada por Sogen e pela
concentração em Warrior/Beast-Warrior. Usa apenas a própria mão e informação pública do
adversário; a legalidade continua a cargo do motor. Nenhuma política nova foi criada.

## Partida observada

Teste em `apps/web/tests/free-duel-engine-match.integration.test.ts`, motor real, seed `2`
(distinta da seed de derivação do deck), pausa zero. Jogador com os 14 monstros de menor ATK
do catálogo, até três cópias, truncados em 40 cartas; apenas passa fases, sem rendição.

| Critério | Observado |
|---|---|
| Início | `in_progress` |
| Recusas da CPU | nenhuma; cada chamada de `apply` é verificada |
| Incidentes | nenhum |
| Invocações | 5 (`onSummon`) |
| Ataques | 6 (`onAttackDeclared`) |
| Ações da CPU | 44 no total; menos de 100 por turno |
| Controle | retorna a P1 antes do desfecho |
| Desfecho | `decisive`, vencedor P2, `lp_depleted`, produzido pelo motor |

Essa partida termina antes de usar terreno; ela comprova invocação, ataque e conclusão legal,
não o uso de Sogen. Os testes existentes de `fm-basic` cobrem o parâmetro de terrenos.

## Validação

- `data:build-roster` e `roster:validate`: sete duelistas disponíveis, nenhum oculto.
  Todas as seis entradas anteriores e os metadados do roster permanecem idênticos a `HEAD`.
- Integrações específicas: 11 testes de roster, 6 de partidas reais e 6 de retratos passaram.
- `pnpm lint`, `pnpm typecheck` e `pnpm build` passaram.
- `pnpm test --concurrency=1 -- --maxWorkers=2`: 1.908 testes passaram nos seis pacotes.
  A execução sequencial dos pacotes resolveu o timeout de inicialização de worker observado
  durante as tentativas concorrentes; uma tentativa com threads também encerrou um processo
  Node com erro nativo. Não foi necessário alterar código ou ampliar timeouts dos testes.
- A integração completa foi executada com concorrência reduzida: 164 testes passaram,
  52 foram ignorados e três falharam por caminhos do Windows, já documentados na entrega
  de Seto 3rd. Os três arquivos foram conferidos contra `HEAD` e não foram alterados:
  - `packages/data/tests/ingest-cards.integration.test.ts:149`: compara uma URL com `/`
    a `path.join`, que produz `\` no Windows.
  - `apps/web/tests/victory-star-credit.contract.test.ts:28`: usa `URL.pathname` como
    caminho local e produz `C:\C:\...`.
  - `apps/web/tests/wallet-single-source.test.ts:19`: filtra diretórios com `/`, sem
    reconhecer os separadores `\` do Windows.
- Um timeout de varredura na primeira execução desapareceu ao reduzir a concorrência.
  Os 52 testes ignorados pertencem às suítes condicionadas à infraestrutura externa.

## Fontes

- [Issue #61](https://github.com/Jean1dev/yu-gi-oh-forbiden-memories-remastered/issues/61): identidade e escopo.
- [sg4e/YGOFM-gamedata](https://github.com/sg4e/YGOFM-gamedata) e
  [SQLite](https://raw.githubusercontent.com/sg4e/YGOFM-gamedata/master/sqlite/fm-sqlite3.db):
  identidade, mão, pools e pesos. Extração pelo script do projeto; hashes dos quatro pools
  verificados por consulta independente ao SQLite em modo somente leitura.
- [Meadow Mage — YuGiOh PRO](https://yugiohpro.com.br/duelist.php?id=29): referência visual
  do mugshot; não utilizado como fonte de listas de cartas.
- [Meadow Mage — Fandom](https://yugioh.fandom.com/wiki/Meadow_Mage),
  [Yugipedia](https://yugipedia.com/wiki/Meadow_Mage) e
  [Low Meadow Mage Guide — GameFAQs](https://gamefaqs.gamespot.com/ps/561010-yu-gi-oh-forbidden-memories/faqs/19228):
  tentativas de contexto complementar bloqueadas/indisponíveis, sem alegar leitura do conteúdo.
