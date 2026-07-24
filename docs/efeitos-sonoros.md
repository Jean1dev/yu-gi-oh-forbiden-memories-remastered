# Efeitos Sonoros (SFX)

> Documento vivo. Define os **efeitos sonoros** do **YuGiOh Forbidden Memories Remastered**,
> ancorando cada som ao **contrato de eventos do motor de duelo** (`docs/arquitetura.md §3.3`) e às
> ações de UI dos módulos (`product.md`). A trilha musical (BGM) fica em `docs/trilha-sonora.md`;
> aqui tratamos apenas de **SFX pontuais** (feedback de ação). Itens dependentes de asset/decisão
> ficam marcados como **PENDÊNCIA**.

## 0. SFX no original (referência)

O jogo de PS1 possui um **sound test** no debug menu com três bancos: **sound effects**,
**soundtracks** e **sound bank** — evidência de que os SFX de duelo eram tratados como um conjunto
próprio, separado da música. O remake reusa esses SFX ripados do original (ver §4).

## 1. Princípios

- **Cada som confirma uma ação ou comunica um estado** — nunca decorativo a ponto de poluir. SFX de
  duelo derivam de **eventos do motor**; SFX de UI derivam de **interações de interface**.
- **O motor é a fonte da verdade:** o motor é puro/headless e **não toca som** — ele emite
  `Evento[]` (`docs/arquitetura.md §3.1/§3.3`). A camada de áudio da `apps/web` **observa** esse
  stream de eventos e dispara o SFX correspondente. Assim, som nunca vira regra de jogo.
- **Latência baixa:** feedback de ação deve soar em ≤ ~50 ms do gesto/evento.
- **Determinismo:** como a ordem de emissão de eventos é determinística, a sequência de SFX de um
  replay é reproduzível.

## 2. Catálogo de SFX de duelo (evento → som)

Eventos conforme `docs/arquitetura.md §3.3` (≥ 8 tipos) mais ações de regra de `product.md`. A
coluna "Som pretendido" descreve a intenção; o asset final vem do banco ripado do original.

| Evento do motor | Momento | Som pretendido |
|-----------------|---------|----------------|
| `onTurnStart` | Início do turno | Marcador curto de virada de turno |
| `onDraw` | Compra de carta (mão volta a 5) | "Deslizar" de carta comprada |
| `onSummon` | Invocação de monstro (face-up) | Impacto/"thud" de invocação |
| `onSet` | Colocar carta face-down (monstro/armadilha) | Pousar carta velada, mais abafado |
| `onFlip` | Virar carta face-down → face-up | "Revelar" (whoosh curto) |
| `onPositionChange` | Trocar ataque ⇄ defesa | Giro/rotação de carta |
| `onAttackDeclared` | Declaração de ataque | Investida/"swing" de ataque |
| `onDamage` | Aplicação de dano aos LP | Impacto + variação conforme magnitude |
| `onDestroy` | Carta destruída (vai ao cemitério) | Estilhaçar/desintegrar |
| `onTurnEnd` | Fim do turno | Marcador de encerramento |

### Ações de regra sem evento dedicado (SFX adicionais)
| Ação | Origem | Som pretendido |
|------|--------|----------------|
| **Fusão** de monstros | `product.md` (fusão de cartas) | Fusão/energia crescente + flash sonoro |
| **Ativar magia de efeito** (ex.: Raigeki) | `tipo: magica` | Ativação mágica (varia por efeito quando o Effect System existir) |
| **Ativar magia de terreno** | `tipo: magica`/terreno | Transformação de campo (grave, "ambiente muda") |
| **Ativar equipamento** | `tipo: equipamento` | Reforço/"power up" curto |
| **Disparar armadilha** | `tipo: armadilha` | Trap "snap"/ativação súbita |
| **Escolher Guardião Estelar** | invocação (`guardiao1`/`guardiao2`) | Selo/confirmação estelar |
| **Mudança de terreno ativo** | carta de campo | Ambiente transiciona (liga com o BGM do terreno — ver `docs/trilha-sonora.md §3`) |
| **Vitória / Derrota** | fim de duelo (LP=0 ou deck zerado) | Fanfarra de vitória / stinger de derrota (curto; a música cobre o resto) |

> **PENDÊNCIA (Effect System):** SFX específicos por efeito de carta só podem ser mapeados 1:1
> quando o **Effect System** (`packages/rules`, `docs/arquitetura.md §3.4`) existir. Por ora,
> mapeamos por **categoria de ação**, não por carta individual (evita 722 ramos).

## 3. Catálogo de SFX de UI (interface → som)

| Interação | Onde | Som pretendido |
|-----------|------|----------------|
| Navegar (mover seleção) | todos os menus | Clique/tick curto de navegação |
| Confirmar/selecionar | todos os menus | Confirmação "positiva" |
| Cancelar/voltar | todos os menus | Cancelamento "negativo" suave |
| Erro/ação inválida | Build Deck (deck inválido), Password (senha inválida) | Buzzer de erro |
| Abrir detalhe de carta | Library / Build Deck | "Folhear"/abrir carta |
| Liberar carta por senha | Password (`docs/prds/password.md`) | Desbloqueio/recompensa + débito de estrelas |
| Ganhar carta/estrelas (recompensa) | Free Duel / Campanha | Jingle de recompensa (curto) |
| Salvar | Save / Build Deck | Confirmação de gravação |

## 4. Estratégia de assets (decisão do projeto)

- **Reuso dos SFX ripados do original** (banco de SFX do sound test). É a opção de maior fidelidade
  sonora ao Forbidden Memories.
- **PENDÊNCIA / risco legal:** os SFX (como toda a mídia do jogo) são **propriedade da Konami**.
  Reusá-los em um projeto público carrega risco de direitos autorais — registrar como decisão
  consciente a validar antes de distribuição pública. (Mesma observação em `docs/trilha-sonora.md §5`.)

## 5. Diretrizes técnicas

- **Formato:** `.ogg` como principal + fallback `.mp3`/`.m4a` para navegadores sem Vorbis; SFX
  curtos (≤ ~2 s), mono, normalizados.
- **Reprodução:** **Web Audio API** (baixa latência, mixagem, sobreposição de instâncias) — não
  `<audio>` cru para SFX de gameplay. Pré-decodificar os buffers no boot do duelo.
- **Cache/offline:** todos os SFX no **service worker** (PWA) junto do app shell
  (`docs/arquitetura.md §7`), garantindo áudio idêntico offline e online.
- **Adaptador de áudio:** um módulo fino em `apps/web` assina os `Evento[]` do motor e a camada de
  UI, e despacha SFX. **Regra:** o motor (`packages/engine`) permanece sem qualquer import de
  áudio/DOM (pilar 1 da arquitetura).
- **Controle do jogador:** volume de SFX independente da música; opção de **mudo**; respeitar
  `prefers-reduced-motion`/preferências de acessibilidade para não sobrecarregar.
- **Anti-spam:** debounce/limite de vozes simultâneas para eventos em rajada (ex.: múltiplos
  `onDamage`), evitando clipping.

## 6. Pendências abertas (SFX)
- [ ] Mapeamento SFX ↔ efeito de carta individual (depende do Effect System, `docs/arquitetura.md §3.4`).
- [ ] Extração/organização do banco de SFX ripado (nomes → eventos desta tabela).
- [ ] Validação do risco de copyright do reuso (ver §4).
- [ ] Definição dos stingers de vitória/derrota (fronteira SFX × música com `docs/trilha-sonora.md`).

## 7. Referências
- The Cutting Room Floor (debug menu / sound test / sound bank): https://tcrf.net/Yu-Gi-Oh!_Forbidden_Memories
- KHInsider — gamerip (áudio extraído do jogo): https://downloads.khinsider.com/game-soundtracks/album/yu-gi-oh-forbidden-memories-1999-gamerip
- Yu-Gi-Oh! Forbidden Memories — Wikipedia: https://en.wikipedia.org/wiki/Yu-Gi-Oh!_Forbidden_Memories
- Documentos internos: `product.md`, `docs/arquitetura.md` (§3.1–§3.4, §7), `docs/prds/*.md`
