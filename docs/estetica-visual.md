# Estética Visual & Direção de Arte

> Documento vivo. Define a **direção de arte** do **YuGiOh Forbidden Memories Remastered**
> tomando o jogo original de PS1 como referência e decidindo, item a item, o que é **fiel ao
> original** e o que é **modernizado** — o pilar de compatibilidade descrito em `product.md` e
> `docs/arquitetura.md §7`. Onde uma decisão depende de dado/asset ainda inexistente, o item fica
> marcado como **PENDÊNCIA**.

## 0. Ficha do original (referência)

| Campo | Valor |
|-------|-------|
| Título | *Yu-Gi-Oh! Forbidden Memories* (JP: *Shin Duel Monsters*) |
| Desenvolvedora | Konami Computer Entertainment Japan (KCEJ) |
| Plataforma | Sony PlayStation (PS1) |
| Lançamento | dez/1999 (JP), 2002 (NA/EU) |
| Ambientação | Setting duplo: **Egito antigo** (Príncipe Atem vs. Heishin) + **Domino City** atual |

A ambientação egípcia/millennium é a **âncora estética** do jogo: molduras douradas, hieróglifos,
pedra e areia, com um contraponto moderno urbano (Domino City) nas partes de "presente". O remake
mantém essa identidade como fio condutor visual de todas as telas.

## 1. Identidade visual do original (o que observamos)

- **Backgrounds pré-renderizados** típicos de RPG de PS1 — cenas 2D pré-renderizadas (templos,
  desertos, praças) usadas nas telas de navegação/história. As artes de fundo eram armazenadas como
  imagens embutidas na ROM (existem extratores de comunidade, ex.: *YGOFM-BGEx*).
- **Monstros em 3D:** o jogo traz **600+ modelos 3D** de monstros. Durante o duelo, o monstro
  invocado "pula" para um **campo de batalha 3D** para encenar o ataque, voltando em seguida à
  representação de carta.
- **Cartas como sprites/artes 2D:** cada carta é exibida por sua arte 2D + moldura, ATK/DEF e
  atributos. É essa camada — não os modelos 3D — que este repositório já possui (722 artes em
  `cards-data/*.jpg`).
- **Retratos de personagens** (duelistas) em diálogos/telas de duelo, no traço do anime clássico.
- **Menus com moldura egípcia/dourada**, navegação por lista, tipografia serifada/decorativa.
- **Campo muda conforme o terreno ativo:** a carta de terreno altera o tipo de campo
  (campo negro, gramado, montanha…), refletido visualmente no tabuleiro — ver terrenos em
  `product.md` (Forest, Wasteland, Mountain, Sogen, Yami, Umi).

## 2. Direção de arte do remake web

### 2.1 Fundação técnica (herdada da arquitetura)
- **Tabuleiro em DOM/CSS**, responsivo de **320 px a 1920 px**, grid/flex — **sem Phaser/canvas**
  para o card game (decisão de `docs/arquitetura.md §7`). O `EstadoDuelo` do motor é a fonte da
  verdade; a UI só reflete, não contém regra.
- **Reuso das 722 artes** de carta (`cards-data/*.jpg`), resolvidas por `numero`; quando `img` for
  nulo/faltante, usar **placeholder** de arte ausente (mesmo padrão de `docs/prds/library.md`).
- **PWA:** app shell + bundle de cartas + artes cacheados no service worker; artes com lazy-load.

### 2.2 Linguagem visual (tema)
- **Paleta base egípcia/millennium:** ouro/âmbar, pedra/areia, azul-profundo (noite egípcia) e
  preto para o "campo negro"/Yami; acentos por tipo de carta.
- **Molduras e iconografia:** moldura dourada nas telas principais e nas cartas; ícones de tipo
  (`monstro`, `magica`, `armadilha`, `equipamento`) e de Guardião Estelar (Sun, Moon, Mars…).
- **Tipografia:** um display decorativo/serifado para títulos (evocando o logo) + uma fonte legível
  sans-serif para dados densos (ATK/DEF, listas, biblioteca de 722 cartas).
- **Acessibilidade:** contraste mínimo AA, foco visível, alvos de toque ≥ 44 px, não depender só de
  cor para transmitir estado (posição/tipo/terreno também por ícone/rótulo).

### 2.3 Estados visuais por módulo (mapeados aos PRDs)

| Módulo | Direção visual | PRD/Referência |
|--------|----------------|----------------|
| **Menu principal** | Moldura egípcia, lista dos 7 módulos, arte de fundo temática | `product.md` |
| **Library** | Grade responsiva **virtualizada** (722 cartas), célula = arte+nome+`numero`; detalhe com todos os campos do schema; cartas não obtidas em silhueta/`???` | `docs/prds/library.md` |
| **Build Deck** | Coleção + deck de 40 cartas lado a lado; feedback de deck inválido (40 cartas, máx. 3 cópias) | `docs/prds/build-deck.md` |
| **Password** | Campo de senha (formato `NN NN NN NN`), feedback de senha válida/inválida/já usada | `docs/prds/password.md` |
| **Free Duel** | Seleção de oponente/deck, entrada no duelo | `docs/prds/free-duel.md` |
| **Tela de duelo** | Campo 5+5 por jogador, terreno ativo, LP, mão, fase do turno | `docs/prds/motor-duelo-1x1.md` |
| **Detalhe de carta** | Arte em destaque + identificação, combate, Guardiões, senha, estrelas | `docs/prds/library.md` |

### 2.4 Feedback visual do duelo
A tela de duelo precisa comunicar visualmente os estados de regra já definidos em `product.md`:
- **Campo 5+5:** 5 zonas de monstro + 5 de magia/armadilha por jogador.
- **Posição do monstro:** ataque/defesa × face-up/face-down (4 combinações) — orientação da carta +
  ícone de posição.
- **Terreno ativo:** moldura/fundo do campo muda conforme o terreno (Forest/Wasteland/Mountain/
  Sogen/Yami/Umi) e sinaliza bônus/penalidade de classe quando as tabelas existirem (**PENDÊNCIA de
  dados** — tabela classe↔terreno ainda não existe no repo, ver `docs/arquitetura.md §4.3`).
- **Guardião escolhido:** ao invocar, destacar qual dos dois Guardiões Estelares foi escolhido.
- **Pontos de vida (8000):** contador por jogador com animação de dano/cura.
- **Janela de reação:** indicar visualmente quando o duelo está no estado `pendente`
  (`docs/arquitetura.md §3.2`) aguardando resposta.

## 3. Fidelidade vs. modernização

| Aspecto | Original (PS1) | Remake web | Decisão |
|---------|----------------|------------|---------|
| Identidade egípcia/millennium | Molduras douradas, hieróglifos | Mesma linguagem visual | **Preservar** |
| Layout do campo | 5 monstros + 5 magia/armadilha | Idêntico | **Preservar** |
| Artes de carta | Sprites 2D + moldura | Reuso das 722 artes do repo | **Preservar** |
| Encenação de ataque | Monstro "pula" para campo 3D | Animação CSS/2D no lugar do 3D | **Modernizar** |
| Backgrounds | Pré-renderizados fixos | Backgrounds responsivos/adaptáveis por tela | **Modernizar** |
| Navegação | Lista por controle de PS1 | Responsivo, toque + teclado + mouse (320–1920px) | **Modernizar** |
| Acessibilidade | Inexistente | Contraste AA, foco, alvos de toque, rótulos | **Modernizar** |
| Progresso de coleção | Ausente | Indicador "X de 722" (Library) | **Modernizar** |

## 4. Pendências abertas (arte)
- [ ] **Backgrounds:** definir se serão recriados/adaptados ou extraídos do original (ver estratégia
      de assets em `docs/efeitos-sonoros.md §4` e `docs/trilha-sonora.md §5` — a decisão do projeto é
      **reusar assets ripados do original**, o que se estende às artes de fundo).
- [ ] **Feedback de terreno/Guardião** depende das tabelas classe↔terreno e Guardião×Guardião ainda
      inexistentes (`docs/arquitetura.md §4.3`).
- [ ] **Retratos de duelistas** (Campanha/Free Duel): fonte de arte a definir.
- [ ] **Placeholder de arte ausente:** definir o design do placeholder padrão.

## 5. Referências
- Yu-Gi-Oh! Forbidden Memories — Wikipedia: https://en.wikipedia.org/wiki/Yu-Gi-Oh!_Forbidden_Memories
- YGOFM-BGEx (extrator de backgrounds pré-renderizados): https://github.com/xan1242/YGOFM-BGEx
- The Cutting Room Floor (dados técnicos / debug): https://tcrf.net/Yu-Gi-Oh!_Forbidden_Memories
- Documentos internos: `product.md`, `docs/arquitetura.md`, `docs/prds/*.md`
