# Trilha Sonora (OST)

> Documento vivo. Cataloga a **trilha musical (BGM)** do *Yu-Gi-Oh! Forbidden Memories* original e
> define **qual faixa toca em cada módulo/estado** do **YuGiOh Forbidden Memories Remastered**. Os
> efeitos sonoros pontuais ficam em `docs/efeitos-sonoros.md`. Ancorado nos módulos do menu e nos
> terrenos descritos em `product.md`. Itens dependentes de asset/decisão ficam como **PENDÊNCIA**.

## 0. Ficha da OST (referência)

| Campo | Valor |
|-------|-------|
| Jogo | *Yu-Gi-Oh! Forbidden Memories* (PS1, Konami, 1999) |
| Compositores | **Naoko Ishii, Waichiro Ozaki, Hiroshi Tanabe** (1999) |
| Crédito adicional | Michiru Yamane (creditada em compilações do OST) |
| Estilo | Orquestral/ambiente egípcio nas telas de mundo; temas de duelo mais tensos/rítmicos; Kaiba com tema "techno" |

> **Nota factual:** uma primeira busca atribuiu erroneamente a trilha a "Harry Gregson-Williams" —
> **incorreto**. Os créditos confirmados (Internet Archive) são Ishii/Ozaki/Tanabe.

## 1. Catálogo da OST original (por categoria)

Lista consolidada a partir do OST (Internet Archive / gamerip KHInsider):

**Menus & interface**
Main Menu · Build Deck Menu · Library Menu · Free Duel Menu · Password Menu · Area Selection ·
Input Name Menu · Introduction Title Screen

**Duelos**
Free Duel · Egyptian Duel · 3D Duel Egypt · 3D Battle · Preliminary Match · Preliminary Face-Off ·
Final's Match · Final's Face-Off · Mage Duel · Seto Kaiba 3D Battle · DarkNite 3D Battle

**Terrenos / "Shrine" (ambiente de campo)**
Dark Shrine · Forest Shrine · Meadow Shrine · Mountain Shrine · Sea Shrine · Desert Shrine ·
Vast Shrine

**Personagens**
Seto Kaiba · Seto Kaiba Face-Off · Priest Seto Theme · Heishin Theme · DarkNite & Nitemare ·
Simon Muran · Sebek and Neku (High Mages Theme)

**História / atmosfera**
Egypt at Night · Egypt in Ruins · Valley of the Kings · Forbidden Ruins · Card Shop ·
Hiding Card Shop · Town Plaza Festival · Modern Times · Metropolis 1 & 2 · Inside the Puzzle

**Resultado / status**
You Win · You Lose · Game Over · Exodia · Millennium Item Found

**Narrativa (cutscenes)**
DarkNite's Arrival · Heishin Millennium Puzzle Confrontation · Seto's Betrayal · Shadi's Message ·
Heishin's Invasion · Tournament Announcement · Epilogue · Ending Credits Theme

## 2. Mapeamento OST → módulos deste jogo

Os nomes das faixas do original mapeiam quase 1:1 nos módulos definidos em `product.md`:

| Módulo (`product.md`) | Faixa do original |
|-----------------------|-------------------|
| Menu principal | **Main Menu** |
| Build Deck | **Build Deck Menu** |
| Library | **Library Menu** |
| Free Duel (menu) | **Free Duel Menu** |
| Password | **Password Menu** |
| Campanha (seleção de duelo/mapa) | **Area Selection** |
| Cadastro / entrada de nome (login/Save) | **Input Name Menu** |
| Tela de título / abertura | **Introduction Title Screen** |

## 3. Mapeamento OST → terrenos (BGM muda com o campo)

As faixas de "Shrine" correspondem aos **terrenos** de `product.md`. Diretriz: quando uma carta de
terreno altera o campo ativo, a **BGM do duelo faz cross-fade** para a faixa do terreno correspondente.

| Terreno (`product.md`) | Faixa de Shrine |
|------------------------|-----------------|
| **Yami** (campo negro) | Dark Shrine |
| **Forest** | Forest Shrine |
| **Sogen** (campo gramado) | Meadow Shrine |
| **Mountain** | Mountain Shrine |
| **Umi** (mar) | Sea Shrine |
| **Wasteland** | Desert Shrine (alt.: Vast Shrine) |

> A tabela classe↔terreno (bônus/penalidade) segue **PENDÊNCIA de dados** (`docs/arquitetura.md §4.3`);
> o mapeamento **musical** acima independe dela — depende só de qual terreno está ativo.

## 4. Diretriz de trilha do remake (o que toca onde)

| Estado / módulo | Faixa | Observações |
|-----------------|-------|-------------|
| Título/abertura | Introduction Title Screen | Loop na tela inicial |
| Menu principal e submenus | Faixa do módulo (§2) | Troca ao navegar entre módulos |
| **Free Duel** (em duelo) | **Free Duel** — **faixa única** | Fiel ao original: Free Duel usa uma só música para **todos** os oponentes |
| **Campanha** (em duelo) | Preliminary/Final/Egyptian/Mage Duel + temas de personagem (Kaiba, Heishin, DarkNite) | Variedade por adversário/fase |
| **Online Duel** | Reusar pool de duelo da Campanha/Free Duel | Definir seleção; sincronizar só o gatilho, não o áudio, entre clientes |
| Duelo com terreno ativo | Shrine correspondente (§3) | Cross-fade ao mudar o terreno |
| Vitória | **You Win** | Stinger curto de SFX pode antecipar (`docs/efeitos-sonoros.md §2`) |
| Derrota | **You Lose** / **Game Over** | Deck zerado ou LP=0 |
| Invocação de Exodia | **Exodia** | Gatilho especial de vitória |
| Liberar Millennium Item / recompensa especial | **Millennium Item Found** | Momento de recompensa |
| Cutscenes de Campanha | Faixas de narrativa (§1) | Conforme roteiro da Campanha |

**Regras gerais de reprodução**
- **Loop contínuo** por faixa; **cross-fade** curto (~0,5–1 s) nas transições de tela e de terreno.
- **Uma faixa de BGM por vez**; SFX (`docs/efeitos-sonoros.md`) tocam por cima sem cortar a BGM.
- **Continuidade:** navegar entre submenus que compartilham faixa não reinicia a música.

## 5. Estratégia de assets (decisão do projeto)

- **Reuso das faixas ripadas do original** (gamerip). Máxima fidelidade sonora ao Forbidden Memories.
- **PENDÊNCIA / risco legal:** a OST é **propriedade da Konami**; reuso em projeto público carrega
  risco de direitos autorais — registrar como decisão consciente a validar antes de distribuição
  pública. (Mesma observação em `docs/efeitos-sonoros.md §4`.)

## 6. Fidelidade vs. modernização

| Aspecto | Original (PS1) | Remake web | Decisão |
|---------|----------------|------------|---------|
| Faixas por módulo/terreno | 1:1 por tela/shrine | Mesmo mapeamento (§2/§3) | **Preservar** |
| Free Duel | Faixa única p/ todos | Idêntico | **Preservar** |
| Transição entre telas | Corte seco (limite de HW) | Cross-fade suave | **Modernizar** |
| BGM ao mudar terreno | Ambiente do campo | Cross-fade para o Shrine do terreno | **Modernizar/Preservar** |
| Streaming/offline | Mídia no disco | Cache no service worker (PWA) | **Modernizar** |
| Controle de volume | Limitado | Volume de música separado de SFX + mudo | **Modernizar** |

## 7. Pendências abertas (OST)
- [ ] Seleção exata de faixas por adversário/fase na Campanha e no Online Duel.
- [ ] Confirmar/creditar corretamente os compositores nos créditos do remake.
- [ ] Extração/organização do gamerip (nomes de arquivo → módulos/terrenos desta doc).
- [ ] Validação do risco de copyright do reuso (ver §5).
- [ ] Formato/tamanho das faixas para web (loop sem clique, ver §5 de `docs/efeitos-sonoros.md` p/ diretrizes técnicas de áudio).

## 8. Referências
- Internet Archive — OST (lista de faixas + créditos): https://archive.org/details/yu-gi-oh-forbidden-memories-ost
- KHInsider — gamerip (1999): https://downloads.khinsider.com/game-soundtracks/album/yu-gi-oh-forbidden-memories-1999-gamerip
- Last.fm — OST (crédito Michiru Yamane): https://www.last.fm/music/Michiru+Yamane/Yu-Gi-Oh!+Forbidden+Memories+Original+Soundtrack
- TV Tropes — Awesome Music (Free Duel faixa única, tema de Kaiba): https://tvtropes.org/pmwiki/pmwiki.php/AwesomeMusic/YuGiOhForbiddenMemories
- Yu-Gi-Oh! Forbidden Memories — Wikipedia: https://en.wikipedia.org/wiki/Yu-Gi-Oh!_Forbidden_Memories
- Documentos internos: `product.md`, `docs/arquitetura.md`, `docs/prds/*.md`, `docs/efeitos-sonoros.md`
