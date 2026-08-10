# Tela de Duelo Jogável

> PRD: `docs/prds/free-duel.md` — F10
> Pacote-alvo: `apps/web`

## 1. Contexto e Escopo

F09 entregou uma **sessão de duelo real** — o motor instanciado por `duel-runtime.ts`, a porta `apply`
em `Result`, a janela de reação liquidada no despacho, o agente passivo publicando por passo — mas
manteve a **casca visual** herdada de F03: `DuelBoard`, `PlayerHand` e `LpIndicator` são `div`s sem
estilo, em inglês, que leem o `DuelState` cru e cujo único controle é um botão temporário "Passar
Fase". F10 substitui essa casca pelo **tabuleiro jogável**: o chrome fiel ao protótipo `Duel Screen`
(barra superior, quatro fileiras de cinco zonas, barra da mão, overlay de prévia), a **máquina de
interação** que traduz cliques em `DuelAction`, as **afordâncias** que espelham a legalidade do motor
para que a recusa seja exceção, e as **animações curtas** derivadas dos eventos. Fecha o marco jogável
mínimo da Fase 3 do roadmap (`docs/arquitetura.md` §9) na dimensão que faltava: a experiência.

A feature vive **inteiramente em `apps/web`**. Nenhuma regra é acrescentada: a camada de afordância é
um **pré-gate de conveniência** que reduz recusas, nunca uma segunda autoridade — quem decide
continua sendo `apply` (`docs/arquitetura.md` §1, pilar 1; ADR-002; ADR-004 §6, "a UI apresenta
eventos e aceita intenções do jogador"). O tabuleiro DOM/CSS sem canvas é decisão travada de ADR-004
e de `docs/estetica-visual.md` §2.1.

### Incluído

- **Chrome do duelo em PT-BR**, fiel ao protótipo: barra superior com terreno, fase, turno e saída;
  campo do oponente e do jogador com 5 zonas de monstro + 5 de magia/armadilha cada; indicadores de
  LP; barra da mão com prévia — tudo **sem rolagem** (PRD F10 Capabilities/critério 1).
- **Renderização a partir da projeção pública** (`getPublicDuelState(state, "P1")`): carta virada do
  oponente não tem nome, ATK nem DEF no DOM; a mão do oponente é contagem (PRD F10 critério 2;
  MotorDuelo/F01 cross-PRD).
- **Invocação nas quatro posições**, escolhendo carta → posição (a zona de monstro livre de menor
  índice é calculada automaticamente, sem etapa de escolha — correção 2026-08-02), mais o atalho
  clássico do FM direto para defesa virada para baixo (PRD F10 Capabilities).
- **Colocação de magia/armadilha** em zona livre da fileira de trás, sem efeito, consumindo a jogada
  da mão do turno.
- **Ataque** por seleção atacante → alvo, e ataque direto quando o oponente não tem monstros.
- **Mudança de posição** de monstro em campo na fase de batalha.
- **Afordâncias por fase, vez e legalidade**, em **três slots de ação fixos** que desabilitam em vez
  de sumir (PRD F10 critério 7).
- **Animações curtas** de compra, entrada em campo, ataque, dano e destruição, derivadas dos eventos
  do motor, honrando `prefers-reduced-motion`.
- **Linha de recusa** traduzida do `DomainError.code` em região `aria-live`, sem alterar o tabuleiro.
- **Overlay de fim de duelo** emoldurando `DuelResult` + `PostDuelActions` (F05/F08) com o tabuleiro
  congelado atrás.

### Adiado

O PRD **não divide F10 em Core/Full Scope** — esta spec cobre o escopo completo da feature. Os itens
abaixo são fronteiras declaradas, não escolha de recorte:

- **`play_field_spell`** (terreno jogado da mão): o motor a suporta, mas nenhuma afordância a expõe.
  Documentada e não implementada (herdado de F09, Decisão 14 daquela spec).
- **Escolha de Guardião Estelar na invocação** (`docs/estetica-visual.md` §2.4): o motor não modela
  escolha de guardião em `SummonMonsterAction`; não há o que a tela ofereça.
- **Bônus/penalidade visual de terreno e de guardião**: dependem das matrizes terreno↔classe e
  guardião×guardião, que **não existem no repositório** (`arquitetura.md` §4.3, §10).
- **Indicador visual da janela de reação** (`estetica-visual.md` §2.4): F09 liquida toda janela dentro
  do mesmo despacho, então `state.pending` nunca é observável pela tela.
- **Som** — nenhuma feature deste módulo emite áudio (PRD §7).
- **Recompensa de vitória ligada** (F06/F07) — permanece desligada, lacuna declarada em F09.

### Fronteiras

- **Regras de duelo** (legalidade, combate, turno, desfecho) → **Motor de Duelo 1x1**. A tela
  **espelha** condições para habilitar botões, mas nunca substitui `apply` (PRD §7).
- **Contrato de sessão, laço da CPU, liquidação da janela, composição do motor** → **F09**. F10
  consome `PlayerActionOutcome`, `DuelRuntime`, `ApplyAction` em `Result` e o `onStep` da CPU **sem
  redefini-los**.
- **Rendição e confirmação de abandono** → **F04**, reusada intacta (`surrender-button.tsx`,
  `surrender-confirmation-dialog.tsx`, `use-surrender.ts`, `duel-exit-guard.ts`).
- **Resultado consolidado, nota e navegação pós-duelo** → **F05/F08**, reusados intactos
  (`duel-result.tsx`, `post-duel-actions.tsx`, `card-drop-reward.tsx`, `stars-reward-badge.tsx`).
  F10 apenas os **emoldura**.
- **Telas vizinhas do módulo** (`opponent-selection`, `prepare`) permanecem **em inglês e intocadas**;
  só a tela de duelo é PT-BR (PRD F10 critério 10 fala da tela de duelo).
- **Retomar duelo após refresh** → fora desta versão (PRD §7): recarregar `/duel` perde o handoff e
  redireciona, comportamento já especificado por F03.

### Contratos externos assumidos

- **`packages/ai` (IA de NPCs)** — não existe. A tela é indiferente a quem decide por P2: consome o
  `onStep` de F09. Trocar o agente passivo pelo real **não toca em nenhum arquivo desta feature**
  (critério Cross-PRD do PRD §9). *A ser fornecido por `packages/ai`.*
- **Rating Engine** — sem escala de notas nem tabela nota→recompensa (`arquitetura.md` §10). O overlay
  de resultado renderiza o que F05 apurar, incluindo o `minimum_fallback`. *A ser fornecido pelo
  Rating Engine (cross-PRD).*
- **Matrizes de terreno e de Guardião Estelar** — vazias (`arquitetura.md` §4.3). A barra superior
  mostra o **nome** do terreno ativo (ou "Nenhum") e nada mais; nenhum modificador é exibido nem
  calculado. *A ser fornecido pelo usuário (dado externo).*
- **Placeholder oficial de arte ausente** — pendência de direção de arte
  (`docs/estetica-visual.md` §4). A tela usa o mesmo marcador neutro de `components/library/card-art.tsx`.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **O tabuleiro renderiza a partir de `getPublicDuelState(state, "P1")`** (`@yugioh/rules`), não do `DuelState` cru — senão as cartas viradas do oponente ficam legíveis no DOM mesmo "escondidas" visualmente. `PublicPlayerState` traz `hand: PublicHand` (contagem para o oponente), `remainingDeck: number` e zonas cujo `card: PublicCard` é `{visible:true, card}` ou `{visible:false}`. | plano aprovado; `packages/rules/src/visibility/public-state.ts`; PRD F10 critério 2 | confirmada |
| 2 | **A camada de legalidade continua lendo o `DuelState` cru.** `PublicPlayerState` **não carrega `handPlayUsed`**, que é insumo obrigatório de `canSummon`/`canPlaceSpell`. As duas leituras convivem na `duel-screen.tsx`: a projeção pública desce para os componentes, o estado cru alimenta `describeAffordances`/`reduceIntent`. | plano aprovado; `packages/shared/src/duel/types.ts` | confirmada |
| 3 | **Máquina de interação pura, sem React**, em `apps/web/src/lib/free-duel/duel-interaction.ts`: `reduceIntent`, `describeAffordances`, `describeActionSlots`, `zoneAffordance`. Testável em ambiente **node**, sem jsdom. O hook `use-duel-interaction.ts` é uma casca fina de `useState` sobre ela. | plano aprovado; `arquitetura.md` §7 ("UI não contém regra") | confirmada |
| 4 | **Invocação nas 4 posições reconciliada com os dois botões do protótipo:** **Invocar** abre um seletor com `Ataque`, `Ataque (virada)`, `Defesa`, `Defesa (virada)`; **Definir** é o atalho clássico do FM direto para `defense_face_down`. O protótipo é mock estático e seus botões não refletem o conjunto real de ações. | plano aprovado; PRD F10 Capabilities | confirmada |
| 5 | **Magia/armadilha pode ser colocada** na fileira de trás (sem efeito), consumindo a jogada da mão do turno — é o que o motor já faz. **`play_field_spell` fica fora de escopo**, documentado e não implementado. | plano aprovado; F09 Decisão 14 | confirmada |
| 6 | **Slots de ação sempre três**, para o chrome não pular de tamanho entre estados; slots indisponíveis ficam **desabilitados, não ausentes**. **Revisada 2026-08-07:** os três slots continuam existindo e `describeActionSlots` não muda, mas o terceiro (`advance_phase`) é renderizado como o botão de fim de turno no trilho direito, e `DuelActions` recebe os outros dois. Renderizar `advance_phase` nos dois lugares duplicaria o nome acessível `Passar Fase`. | plano aprovado; PRD F10 critério 7 | revisada |
| 7 | **Animações: o estado é aplicado na hora; as cues são overlays decorativos indexados por zona.** Nada fica enfileirado *atrás* de uma animação, então o estado do React e a fila de cues **não podem dessincronizar**. A fila é derivada dos eventos do motor por uma função pura (`toCues`) e drenada por uma cadeia de `setTimeout`. | plano aprovado; PRD F10 Capabilities | confirmada |
| 8 | **`prefers-reduced-motion` zera as durações**: a fila drena em um tick, `busy` **nunca** fica verdadeiro e nenhum `@keyframes` roda (ficam dentro de `@media (prefers-reduced-motion: no-preference)`). | plano aprovado; PRD F10 Error Handling; `estetica-visual.md` §2.2 | confirmada |
| 9 | **`window.matchMedia` não existe no jsdom desta versão** — todo uso é guardado por `typeof window.matchMedia === "function"`, com o caminho sem `matchMedia` equivalendo a "movimento não reduzido". | código existente (jsdom 30); convenções de teste do repo | confirmada |
| 10 | **Sem biblioteca de animação.** O repositório não tem nenhuma e a stack travada não prevê uma: as transições são `@keyframes` declarados nos CSS Modules dos próprios componentes. | inventário de dependências de `apps/web`; auto-aceite: tecnologia nova fora da stack | confirmada |
| 11 | **Estilo por CSS Modules ao lado de cada componente + custom properties de `apps/web/src/app/globals.css`.** Não há Tailwind, `clsx` nem `cn()` neste repositório; o componente representativo a imitar é `components/library/card-cell.tsx` + `card-cell.module.css`. **Revisada 2026-08-07:** o protótipo aprovado usa uma escala *display* que o repositório não tinha, então `--text-display-xl/lg/md` foram acrescentados a `globals.css`. Nenhum outro token novo. | inventário do repositório; auto-aceite: padrão existente | revisada |
| 12 | **Mapeamento dos tokens do protótipo para os do repositório:** `--color-bg-sunken`→`--color-night-sunken`, `--color-green`→`--color-success`, `--color-red-dark`→`--color-danger-dark`, `--color-cream`→`--color-sand`. Superfícies e relevos vêm de `--surface-sunken`/`--surface-frame` + `--shadow-bevel-pressed`/`--shadow-bevel-raised`. | protótipo `Duel Screen.html`; `globals.css` | confirmada |
| 13 | **Nada de `overflow: hidden` no `body`.** O protótipo faz isso, mas a regra vazaria para todas as rotas do app. A tela usa `.screen { height: 100dvh; overflow: hidden }` + `min-height: 0` nos filhos flex, que dá o mesmo resultado sem efeito global. | plano aprovado; `globals.css` (o `body` é compartilhado) | confirmada |
| 14 | **Cada zona é um `<li>` contendo um `<button type="button">` com `all: unset; box-sizing: border-box`** — visual idêntico ao `.duel-zone` do protótipo, mas com alvo real de teclado; `disabled` tira do tab order. Como `all: unset` também apaga o `outline`, cada módulo **redeclara `:focus-visible`** com o outline branco obrigatório. | plano aprovado; `globals.css` (`:focus-visible`); `estetica-visual.md` §2.2 | confirmada |
| 15 | **Textos da tela de duelo em PT-BR**, centralizados em `duel-screen-messages.ts` e `duel-action-messages.ts`, no padrão dos `messages.ts` já existentes. As telas vizinhas de free-duel (`opponent-selection`, `prepare`) **continuam em inglês e não são tocadas**. | plano aprovado; CLAUDE.md (UI em PT-BR); PRD F10 critério 10 | confirmada |
| 16 | **`duel-action-messages.ts` mapeia os códigos de `DomainError` do motor para PT-BR com fallback genérico.** Os códigos alcançáveis pela tela são ~24 (`wrong_phase`, `not_active_player`, `reaction_window_open`, `duel_already_ended`, `hand_play_already_used`, `card_not_in_hand`, `card_unavailable`, `monster_zone_occupied`, `no_free_monster_zone`, `unsummonable_card_type`, `invalid_spell_trap_card_type`, `zone_occupied`, `no_space_for_card`, `zone_empty`, `zone_not_monster`, `zone_not_owned_by_active_player`, `already_changed_position`, `attacker_zone_empty`, `attacker_not_in_attack_position`, `attacker_already_attacked`, `first_turn_attack_forbidden`, `direct_attack_blocked_by_monsters`, `target_zone_empty`, `no_pending_attack_to_resolve`, `not_your_turn`). O mapa é **aberto por construção**: código desconhecido cai numa frase genérica em vez de vazar texto do motor (que é bilíngue). | leitura de `packages/engine/src/**`; auto-aceite: especificação parcial no PRD | confirmada |
| 17 | **O pré-gate de afordância espelha o motor mas nunca o substitui.** Toda ação continua passando por `apply`; a recusa segue sendo tratada como valor (F09). O espelhamento existe para que "a recusa do motor seja exceção e não o caminho comum" (PRD F10 Capabilities), não para validar. | PRD F10 Capabilities; `arquitetura.md` §1 pilar 1 | confirmada |
| 18 | **`declare_attack` encadeia `resolve_attack` no mesmo despacho** (F09, Decisão 2): uma intenção do jogador = um dispatch, e a tela recebe declaração + revelação + dano + destruição como **um lote ordenado** de eventos, que vira uma sequência ordenada de cues. | spec F09 Decisão 2 | confirmada |
| 19 | **`SurrenderButton`, `SurrenderConfirmationDialog`, `DuelResult`, `PostDuelActions`, `CardDropReward`, `StarsRewardBadge` e `OrchestrationFailureNotice` ficam intactos.** São estilizados **por descendência** a partir dos CSS Modules dos contêineres que F10 cria, sem alterar seus arquivos — o que preserva as suítes de F04/F05/F06/F07/F08 que os consultam por nome acessível. | plano aprovado; suítes existentes | confirmada |
| 20 | **Dois nomes acessíveis são preservados de propósito** ao reescrever os componentes: cartas da mão expõem `aria-label={card.nome}` e o `LpIndicator` mantém o nó de texto `{lp} LP`. São as duas asserções de `duel-screen.test.tsx` e de `surrender.integration.test.tsx` que sobrevivem à troca do inglês pelo português; as que afirmam `heading "Duel"`, `/Monster zone/` e `/Spell zone/` **quebram por desenho** e são reescritas. | plano aprovado; `duel-screen.test.tsx` atual | confirmada |
| 21 | **A saída pelo chrome (`◀ Sair do Duelo`) é um botão que aciona a confirmação de rendição de F04**, não uma navegação. `SurrenderButton` continua montado (é o alvo `name: "Render-se"` da integração de F04) e o guarda de saída de F04 segue cobrindo links e histórico. **Revisada 2026-08-07:** o protótipo aprovado não tem barra superior, e os dois controles chamavam a mesma função — `◀ Sair do Duelo` deixou de existir e o `SurrenderButton` do trilho esquerdo virou a única porta para a confirmação. `duel-exit-guard.ts` fica intacto. | plano aprovado; `use-surrender.ts`; `duel-exit-guard.ts` | revisada |
| 22 | **Contagem da mão e do deck do oponente são exibidas** ao lado do LP, em uma linha discreta. É uma **extensão deliberada** do protótipo (que é mock estático e não mostra nenhuma das duas), exigida pelo critério "a mão como contagem" e útil porque deck zerado é condição de derrota. **Revisada 2026-08-07:** as duas continuam expostas, em lugares melhores — as contagens de deck viraram as pilhas `Deck Op.`/`Meu Deck` do trilho direito, e a mão do oponente virou a faixa de cartas viradas no topo do tabuleiro, cujo `aria-label` carrega a contagem. | PRD F10 critério 2; Fase 0.3 (deck zerado = derrota) | revisada |
| 23 | **A cue de destruição pisca numa zona já vazia.** O motor **não modela cemitério** — cartas destruídas simplesmente somem da zona. Isso é correto por construção, não é bug a contornar. | plano aprovado; `packages/engine/src/combat/resolve-attack.ts`; PRD F10 Nota de fidelidade | confirmada |
| 24 | **Nenhuma tabela Postgres, migração, RPC, IndexedDB ou fila offline** é criada ou alterada. A sessão vive em memória (F03 Decisão 15) e nenhuma economia é tocada (F06/F07 desligadas por F09). | precedente F03/F09; PRD §9 F10 | confirmada |
| 25 | **O plano tem 6 fases**, acima do teto de 5 do skill para complexidade "complexa". Divergência **autorizada e aprovada pelo usuário**, espelhando o fatiamento de F09: cada fase é verificável isoladamente e corresponde a um commit (puro → chrome → controles → integração → animação → fim de duelo). | plano aprovado; divergência explícita do SKILL Passo 4 | confirmada |
| 26 | **F10 não tem divisão Core/Full Scope no PRD** — a spec cobre o escopo completo da feature. | PRD §6 F10; auto-aceite: escopo | confirmada |

## 2. Alocação no Monorepo

Todos os arquivos vivem em **`apps/web`**. `packages/shared`, `data`, `rules` e `engine` **não são
alterados**.

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `apps/web/src/lib/free-duel/duel-interaction.ts` | web | novo | Máquina de interação pura: `DuelIntent`, `reduceIntent`, `describeAffordances`, `describeActionSlots`, `zoneAffordance` |
| `apps/web/src/lib/free-duel/duel-interaction.test.ts` | web | novo | Uma transição por linha da máquina; uma regra por afordância (node) |
| `apps/web/src/lib/free-duel/duel-cues.ts` | web | novo | `DuelCue`, `toCues(events)`, durações por tipo, teto da fila |
| `apps/web/src/lib/free-duel/duel-cues.test.ts` | web | novo | Mapeamento evento→cue e totalidade (fast-check) |
| `apps/web/src/lib/free-duel/duel-action-messages.ts` | web | novo | `DomainError.code` → mensagem PT-BR, com fallback genérico |
| `apps/web/src/lib/free-duel/duel-action-messages.test.ts` | web | novo | Códigos conhecidos, fallback, ausência de vazamento do texto do motor |
| `apps/web/src/lib/free-duel/duel-screen-messages.ts` | web | novo | Rótulos PT-BR da tela: fases, posições, zonas, slots, banners |
| `apps/web/src/hooks/use-duel-interaction.ts` | web | novo | Casca React da máquina: intenção corrente + despacho da ação produzida |
| `apps/web/src/hooks/use-duel-interaction.test.ts` | web | novo | Seleção → zona → posição produz a ação esperada (jsdom) |
| `apps/web/src/hooks/use-duel-cues.ts` | web | novo | Fila de cues, cue ativa, `busy`, respeito a movimento reduzido |
| `apps/web/src/hooks/use-duel-cues.test.ts` | web | novo | Temporização com timers falsos; caminho de movimento reduzido (jsdom) |
| `apps/web/src/hooks/use-auto-advance-phase.ts` | web | **novo (correção 2026-08-02)** | Dispara `advance_phase` sozinho nas fases Compra/Fim após 1000ms (configurável), cancelando o timer se a fase mudar ou o jogador deixar de ser o decisor antes disso |
| `apps/web/src/hooks/use-auto-advance-phase.test.ts` | web | **novo (correção 2026-08-02)** | Timers falsos: dispara em draw/end após o delay, nunca em main/battle, cancela quando fica inativo |
| ~~`apps/web/src/components/free-duel/duel-top-bar.tsx`~~ (+ `.module.css`, `.test.tsx`) | web | **removido 2026-08-07** | O protótipo aprovado não tem barra superior: Terreno → `field-slot.tsx`, Fase/Turno → `turn-chip.tsx`, saída → `SurrenderButton` no trilho |
| `apps/web/src/components/free-duel/duel-rail.tsx` (+ `.module.css`) | web | **novo 2026-08-07** | Casca dos dois trilhos; estiliza os botões que hospeda por descendência |
| `apps/web/src/components/free-duel/turn-chip.tsx` (+ `.module.css`, `.test.tsx`) | web | **novo 2026-08-07** | `Turno: {n}` / `Fase: {rótulo}` no trilho esquerdo |
| `apps/web/src/components/free-duel/deck-pile.tsx` (+ `.module.css`) | web | **novo 2026-08-07** | Contador de deck restante (`Deck Op.` / `Meu Deck`) no trilho direito |
| `apps/web/src/components/free-duel/duel-lp-bar.tsx` (+ `.module.css`, `.test.tsx`) | web | **novo 2026-08-07** | A faixa entre as duas metades: LP / terreno / LP |
| `apps/web/src/components/free-duel/field-slot.tsx` (+ `.module.css`, `.test.tsx`) | web | **novo 2026-08-07** | Slot de terreno no centro da barra de LP; inspecionável |
| `apps/web/public/card-back.jpg` | web | **novo 2026-08-07** | O verso real das cartas; `public/` porque a rota `cards-data/[file]` só responde a `NNN.jpg` |
| `apps/web/src/components/free-duel/duel-card-art.tsx` (+ `.module.css`) | web | novo | Arte por `numero` com fallback em erro, no molde de `library/card-art.tsx` |
| `apps/web/src/components/free-duel/duel-zone.tsx` (+ `.module.css`, `.test.tsx`) | web | novo | Uma zona: arte, faixa `{atk}/{def}`, `Vazio`/`—`, afordância, cue |
| `apps/web/src/components/free-duel/duel-side.tsx` (+ `.module.css`) | web | novo | Um lado do campo: LP + contagens + fileira de monstros + backrow (espelhado) |
| `apps/web/src/components/free-duel/duel-board.tsx` (+ `.module.css`, `.test.tsx`) | web | **reescrito** | Os dois lados; consome `PublicDuelState` (hoje: `div`s em inglês sobre `DuelState`) |
| `apps/web/src/components/free-duel/lp-indicator.tsx` (+ `.module.css`) | web | **reescrito** | Indicador de LP no estilo do design system; preserva o nó `{lp} LP` |
| `apps/web/src/components/free-duel/player-hand.tsx` (+ `.module.css`, `.test.tsx`) | web | **reescrito** | Botão por carta, 64px, anel de seleção; preserva `aria-label={card.nome}` |
| `apps/web/src/components/free-duel/duel-hand-bar.tsx` (+ `.module.css`) | web | novo | Rodapé: mão + três slots de ação |
| `apps/web/src/components/free-duel/duel-actions.tsx` (+ `.module.css`, `.test.tsx`) | web | novo | Os três slots fixos, com variante e estado desabilitado |
| `apps/web/src/components/free-duel/duel-card-preview.tsx` (+ `.module.css`) | web | novo | Overlay fixo de prévia: arte 120px + nome |
| `apps/web/src/components/free-duel/duel-prompt.tsx` (+ `.module.css`, `.test.tsx`) | web | novo | Dica do passo corrente + seletor das 4 posições |
| `apps/web/src/components/free-duel/duel-message.tsx` (+ `.module.css`) | web | novo | Linha de recusa e banner de vez do oponente (`role="status"`, `aria-live="polite"`) |
| `apps/web/src/components/free-duel/duel-result-overlay.tsx` (+ `.module.css`) | web | novo | Emoldura `DuelResult` + `PostDuelActions` sobre o tabuleiro congelado |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.tsx` (+ `.module.css`) | web | **reescrito** | Composição: projeção pública, afordâncias, despacho, cues, overlay |
| `apps/web/src/app/free-duel/[duelistId]/duel/duel-screen.test.tsx` | web | **reescrito** | Suíte da tela em PT-BR (a atual afirma `heading "Duel"`, `/Monster zone/`, `/Spell zone/`) |
| `apps/web/tests/free-duel-playable-duel.integration.test.tsx` | web | novo | Partida completa em jsdom **contra o motor real** |

**Verificação da direção de dependências:**

- `apps/web` está no topo do grafo; importar `@yugioh/shared` e `@yugioh/rules` é direção válida.
- **Nenhum arquivo desta feature importa `@yugioh/engine`.** O confinamento a `duel-runtime.ts`
  estabelecido por F09 permanece intacto, e o portão `scripts/check-duel-engine-boundary.mjs` continua
  sendo a evidência (o dependency-cruiser não resolve imports de workspace — CLAUDE.md).
- `getPublicDuelState` vem de **`@yugioh/rules`**, pacote puro sem I/O, já em `transpilePackages`.
  A tela é a única a chamá-lo para si; o laço da CPU usa a instância injetada por F09.
- **Nenhum módulo `"use client"` alcança `lib/catalog/sealed-catalog.ts` nem `lib/server/**`.** O
  catálogo continua descendo por prop serializável do Server Component (F09, Decisão 11).
- `duel-interaction.ts`, `duel-cues.ts` e os módulos de mensagem importam **apenas
  `@yugioh/shared`** — nada de React, DOM ou `@yugioh/rules`. É o que os mantém testáveis em ambiente
  node.
- `packages/ai` continua não sendo importado; a regra `free-duel-does-not-import-ai` segue válida.

## 3. Design Técnico

### Estruturas de dados

**Intenção corrente** (`duel-interaction.ts`) — a máquina de interação, uma união fechada:

| Variante | Campos | Significado |
|---|---|---|
| `idle` | — | Nada selecionado; slots de fase/batalha disponíveis |
| `card_selected` | `handIndex` | Carta da mão em foco; a prévia está aberta |
| `choosing_zone` | `handIndex` | Aguarda o clique numa zona livre de magia/armadilha (correção 2026-08-02: monstro não passa mais por aqui, vai direto a `choosing_position` com a zona já calculada) |
| `choosing_position` | `handIndex`, `zoneIndex` | Aguarda uma das 4 posições no seletor |
| `choosing_attacker` | — | Aguarda o clique num monstro próprio apto a atacar |
| `choosing_target` | `attackerZoneIndex` | Aguarda o clique num monstro do oponente |
| `choosing_flip` | — | Aguarda o clique num monstro próprio para mudar de posição |

**Eventos de interação** aceitos por `reduceIntent`: `select_hand_card` (índice), `activate_zone`
(`ZoneReference`), `choose_position` (`MonsterPosition`), `invoke_slot` (`ActionSlotId`) e `cancel`.

**Afordâncias** (`DuelAffordances`) — booleanos derivados do `DuelState` cru e da intenção:
`canAct`, `canSummon`, `canPlaceSpell`, `canAttack`, `canDirectAttack`, `canChangePosition`,
`canAdvancePhase`.

**Slot de ação** (`ActionSlot`): `id: ActionSlotId` (`"summon" | "set" | "place" | "attack" |
"change_position" | "direct_attack" | "cancel" | "advance_phase" | "none"`), `label` (PT-BR),
`variant` (`"primary" | "secondary"`), `disabled`. `describeActionSlots` devolve **sempre uma tupla de
três**.

**Afordância de zona** (`ZoneAffordance`): `"idle" | "selectable" | "selected" | "target"`. Vira
`data-affordance` no botão da zona e escolhe o realce em CSS.

**Cue** (`duel-cues.ts`): união de `draw` (jogador), `place` (zona), `attack` (zona + alvo opcional),
`damage` (jogador + quantia) e `destroy` (zona). Cada tipo tem uma **duração fixa**: draw 250 ms,
place 300 ms, attack 450 ms, damage 400 ms, destroy 300 ms. A fila tem **teto de 24 entradas** — o
excedente é descartado, nunca acumulado.

**Projeção de renderização**: `PublicDuelState` de `@yugioh/shared`, produzido por
`getPublicDuelState`. Os componentes recebem `PublicMonsterZone`/`PublicSpellZone`, cujo `card` é
`{visible:true, card}` ou `{visible:false}` — **é o tipo que impede o vazamento**, não a disciplina do
componente.

### Fluxo

**Montagem e projeção**

1. `duel-screen.tsx` obtém a sessão de F09 (`useDuelSession`), com `session`, `busy`, `lastRefusal` e
   o fluxo de eventos.
2. Com a sessão `in_progress`/`ended`, projeta `view = getPublicDuelState(state, "P1")`, memoizada
   pela identidade do estado. `view` é o **único** insumo dos componentes de tabuleiro.
3. `describeAffordances({ state, session, busy, intent })` lê o **estado cru** e produz os booleanos;
   `describeActionSlots` produz os três slots; `zoneAffordance` classifica cada uma das 20 zonas.

**Invocar um monstro** (PRD F10 Capabilities)

4. Clique na carta da mão → `card_selected`; a prévia abre com arte 120px e nome.
5. Slot **Invocar** → a máquina calcula sozinha a zona de monstro livre de **menor índice** e vai
   direto a `choosing_position`, sem etapa de escolha de zona. **Correção (2026-08-02, pedido do
   usuário):** a etapa `choosing_zone` para monstros foi removida — o jogador nunca escolhia nada
   de verdade ali (a única decisão real é a posição), então o clique numa zona virou apenas um
   passo redundante. `choosing_zone` continua existindo, só que restrita à colocação de
   magia/armadilha (passo 10), que de fato tem 5 zonas equivalentes entre as quais escolher.
6. `duel-prompt` mostra as quatro opções de posição.
7. Escolha da posição → a máquina produz `{ type: "summon_monster", player: "P1", handIndex,
   zoneIndex: <zona calculada no passo 5>, position }` e volta a `idle`.
8. O slot **Definir** encurta 5–7: com a zona já calculada, dispara direto `defense_face_down`
   assim que o slot é acionado, sem passar por `choosing_position`.

**Colocar magia/armadilha**

9. Carta de `tipo ∈ {magica, armadilha, equipamento}` selecionada → o slot A vira **Colocar**, o slot
   B fica desabilitado (não há "definir" para a backrow: o motor decide `faceUp` pelo tipo — armadilha
   entra virada, magia/equipamento entram viradas para cima).
10. Clique numa zona livre da fileira de trás → `{ type: "play_spell_or_trap", handIndex, zoneIndex }`.
    A jogada da mão do turno é consumida pelo motor.

**Atacar**

11. Na fase de batalha, sem carta selecionada, slot A é **Atacar** → `choosing_attacker`; monstros
    próprios em posição de ataque e com `!hasAttacked` ficam `selectable`.
12. Clique no atacante → `choosing_target`; os monstros do oponente ficam `target`. Se o oponente não
    tem monstro nenhum, o slot B vira **Ataque Direto** e dispara `{ type: "declare_attack",
    attackerZoneIndex }` sem `targetZoneIndex`.
13. Clique no alvo → `{ type: "declare_attack", attackerZoneIndex, targetZoneIndex }`. **F09 encadeia
    `resolve_attack`**, então um único despacho devolve declaração, eventual revelação, dano e
    destruição em ordem.

**Mudar posição**

14. Na fase de batalha, slot B é **Mudar Posição** → `choosing_flip`; monstros próprios com
    `!hasChangedPosition` ficam `selectable`; o clique dispara `{ type: "change_position", zone }`.

**Passar fase**

15. O slot C é **sempre** `Passar Fase` (`advance_phase`), presente em todo estado. **Correção
    (2026-08-02, pedido do usuário):** nas fases de Compra e Fim, o próprio hook
    `use-auto-advance-phase.ts` dispara `advance_phase` sozinho depois de um delay fixo de 1000ms —
    o jogador não precisa (e não consegue: `canAdvancePhase` fica `false`) clicar em **Passar
    Fase** nessas duas fases. O slot volta a ficar habilitado assim que a fase muda para Principal
    ou Batalha, onde há jogadas reais a fazer. A compra da fase de compra continua embutida no
    próprio `advance_phase` (motor-duelo-1x1/F07); passar da fase de Fim entrega a vez e a CPU
    começa a agir. Motivo da correção: antes, exigir um clique manual para uma fase sem nenhuma
    decisão do jogador (Compra) ou já concluída (Fim) era atrito sem propósito.

**Turno da CPU**

16. Enquanto `currentDecider === "P2"`, a mão e as zonas ficam desabilitadas e o banner
    `Vez do oponente…` aparece em `aria-live="polite"`.
17. Cada `onStep` de F09 atualiza a sessão **e** enfileira as cues daquele passo; o rótulo de fase da
    barra superior avança visivelmente a cada passo.

**Recusa**

18. `PlayerActionOutcome.refusal` presente → `duel-message` exibe a tradução do `code` em região
    assertiva, a intenção volta a `idle` e **o tabuleiro não muda**. A partida segue `in_progress`.

**Fim do duelo**

19. `session.status === "ended"` → o tabuleiro congela (todas as zonas e a mão desabilitadas, slots
    desabilitados) e `duel-result-overlay` cobre a tela com `DuelResult` + `PostDuelActions`.

### Regras de negócio

**Afordâncias — espelhos exatos das guardas do motor** (Decisão 17; nenhuma inventa condição nova):

| Afordância | Condição espelhada | Guarda correspondente no motor |
|---|---|---|
| `canAct` | `session.status === "in_progress"` ∧ `currentDecider === "P1"` ∧ `!busy` ∧ `state.outcome === undefined` | `duel_already_ended`, `not_your_turn` (F09) |
| `canSummon` | `canAct` ∧ `phase === "main"` ∧ `activePlayer === "P1"` ∧ `!P1.handPlayUsed` ∧ `carta.tipo ∈ {monstro, ritual}` ∧ ∃ zona de monstro livre | `wrong_phase`, `not_active_player`, `hand_play_already_used`, `unsummonable_card_type`, `no_free_monster_zone` |
| `canPlaceSpell` | `canAct` ∧ `phase === "main"` ∧ `activePlayer === "P1"` ∧ `!P1.handPlayUsed` ∧ `carta.tipo ∈ {magica, armadilha, equipamento}` ∧ ∃ zona de magia livre | `wrong_phase`, `hand_play_already_used`, `invalid_spell_trap_card_type`, `no_space_for_card` |
| `canAttack` | `canAct` ∧ `phase === "battle"` ∧ `activePlayer === "P1"` ∧ `turn > 1` ∧ ∃ monstro próprio em `attack_face_up`/`attack_face_down` com `!hasAttacked` | `wrong_phase`, `first_turn_attack_forbidden`, `attacker_not_in_attack_position`, `attacker_already_attacked` |
| `canDirectAttack` | `canAttack` ∧ nenhuma zona de monstro do oponente ocupada | `direct_attack_blocked_by_monsters` |
| `canChangePosition` | `canAct` ∧ `phase === "battle"` ∧ `activePlayer === "P1"` ∧ ∃ monstro próprio com `!hasChangedPosition` ∧ `!hasAttacked` (correção 2026-08-02 — motor-duelo-1x1/F10 Decisão 6, revisada) | `wrong_phase`, `already_changed_position`, `already_attacked`, `zone_not_owned_by_active_player` |
| `canAdvancePhase` | `canAct` ∧ `phase !== "draw"` ∧ `phase !== "end"` (correção 2026-08-02 — essas duas fases avançam sozinhas, ver passo 15) | `duel_already_ended` |

> `attack_face_down` **conta como posição de ataque** no motor (`ATTACK_POSITIONS` inclui as duas
> variantes), e `turn > 1` é a forma de `isFirstDuelTurn`. Espelhar errado qualquer um dos dois
> produziria botões mortos.

**Layout dos três slots** (sempre presentes; ausência de afordância vira `disabled`):

| Situação | Slot A | Slot B | Slot C (primary) |
|---|---|---|---|
| Carta de monstro selecionada, fase principal | Invocar | Definir | Passar Fase |
| Magia/armadilha selecionada, fase principal | Colocar | *(desabilitado)* | Passar Fase |
| Nada selecionado, fase de batalha | Atacar | Mudar Posição | Passar Fase |
| Meio de uma seleção (zona/posição/atacante/alvo) | Cancelar | Ataque Direto *(quando legal)* | Passar Fase |
| Demais casos | *(desabilitado)* | *(desabilitado)* | Passar Fase |

**Invariantes da Fase 0.3 refletidos, nunca recalculados:** 5+5 zonas por jogador, 4 posições de
monstro, 1 jogada da mão por turno, 1 ataque por monstro por turno, quem joga o primeiro turno não
ataca, 8000 LP, deck zerado = derrota. A tela **exibe** o efeito de cada um; nenhum é verificado como
autoridade.

**Regras próprias desta feature:**

- **O DOM do lado do oponente nunca contém dado oculto.** Zona com `card.visible === false` renderiza
  verso de carta, sem nome, sem `{atk}/{def}`, sem `title`, sem `alt` identificador.
- **A recusa nunca altera o tabuleiro.** A view é derivada do estado da sessão; se o estado não mudou,
  nada re-renderiza além da linha de mensagem.
- **O chrome não muda de tamanho.** Três slots fixos, barra superior de altura fixa, quatro fileiras
  de altura proporcional (`flex: 1`, backrow `flex: .7`).
- **Nenhum controle do jogador fica ativo** quando `busy` (despacho em voo ou cue rodando),
  `currentDecider === "P2"` ou a sessão terminou.
- **Sem `overflow` na página.** Conteúdo largo (a mão) rola dentro do próprio contêiner
  (`overflow-x: auto`), nunca o `body`.

### Layout e fidelidade visual

> **Revisão 2026-08-07.** Esta seção descrevia o protótipo `Duel Screen v1` (barra superior + dois
> lados espelhados + rodapé de mão). O protótipo aprovado passou a ser o `Duel Screen` de quatro
> colunas, e o layout abaixo é o que está implementado. O texto anterior fica registrado no
> histórico do arquivo.

Estrutura fiel ao protótipo `Duel Screen`, com os tokens do repositório (Decisão 12):

- **`main` (`duel-screen.module.css` `.screen`)** — `height: 100dvh; overflow: hidden;
  padding: var(--space-3); display: grid; gap: var(--space-3);
  grid-template-columns: 300px 84px minmax(0, 1fr) 128px;
  grid-template-areas: "inspector rail-l board rail-r"`. **Não há barra superior**: Terreno migrou
  para o slot central da barra de LP, Fase/Turno para o chip do trilho esquerdo, e `◀ Sair do Duelo`
  foi absorvido pelo `SurrenderButton` do trilho (Decisão 21, revisada).
- **`aside.inspector`** — coluna de 300px, `background: var(--surface-sunken)`,
  `box-shadow: var(--shadow-bevel-pressed)`, `padding: var(--space-4)`, `overflow: auto`. Contém o
  `CardFrame` completo (`max-width: 190px`, centralizado) e, abaixo, nome (`<h2>`, `--font-display`,
  `--text-display-md`, `overflow-wrap: anywhere`), `{atk} / {def}` (`--text-display-md`),
  `{atributo} / {classe}` (ou só a classe quando a carta não foi enriquecida), a linha de Guardian
  Stars e `Efeito: {descricao}` — esta última ausente, não vazia, quando `descricao` é nula.
- **`DuelRail`** — os dois trilhos compartilham `.rail` (flex coluna) e estilizam **por
  descendência** todo `button` descendente: `all: unset`, `min-height: 44px`,
  `background: var(--surface-frame)`, `box-shadow: var(--shadow-bevel-raised)`, `--font-display` a
  9px, maiúsculas, com `[data-variant="primary"]` em `var(--color-gold)`. Esquerdo: `SurrenderButton`
  → alternância de fusão → `TurnChip` (`Turno: {n}` / `Fase: {rótulo}`). Direito: `DeckPile` do
  oponente → botão de fim de turno → `DeckPile` do jogador. **Sem pilhas de cemitério e sem C-POW**:
  o motor não modela nem um nem outro (Decisão 23), e nenhum número é inventado na tela.
- **`section.board`** — `flex: 1; display: flex; flex-direction: column; gap: 10px;
  padding: var(--space-3); background: var(--surface-sunken);
  box-shadow: var(--shadow-bevel-pressed)`. Filhos, nesta ordem: faixa da mão do oponente (40px de
  cartas viradas) → lado do oponente → `DuelLpBar` → lado do jogador → `DuelMessage` + `DuelPrompt` →
  faixa da mão do jogador com `DuelActions`. Só os dois lados crescem (`flex: 1`); todo o resto é
  `flex-shrink: 0`.
- **`section.side`** — `flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0`,
  **igual para os dois jogadores**: fileira de monstros em cima, backrow embaixo. O espelhamento
  anterior colocava as magias do jogador acima dos próprios monstros.
- **`.row`** — `display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; flex: 1;
  min-height: 0`. As duas fileiras de um lado têm a mesma altura (o antigo `.backrow { flex: .7 }`
  foi aposentado).
- **Zona** — o `<li>` é o slot (`background: var(--color-night-sunken)`,
  `box-shadow: var(--shadow-bevel-pressed)`, `overflow: hidden`) e o `<button>` interno é
  transparente e ocupa 100%×100%. Vazia: a estrela decorativa (`width: 38%; aspect-ratio: 1;
  clip-path` de 10 pontos; `opacity: .35`), `aria-hidden` — os rótulos `Vazio`/`-` vivem no
  `aria-label` do botão. Ocupada: `DuelCardArt crop fill` (a arte recortada preenchendo o slot) com
  `box-shadow: 0 0 0 2px var(--color-gold)` no botão, e `.stats` como faixa absoluta no rodapé
  (`--font-body`, `--text-body-xs`) mostrando `{atk} / {def}`. **A zona não mostra o nome da carta**
  — ele está no `aria-label` e no inspetor; uma segunda faixa deixaria o slot com mais moldura do
  que figura. **`CardFrame` não entra em zona nem na mão**: é uma pilha vertical de altura fixa que
  não comprime; ele é o conteúdo do inspetor.
- **Posição de defesa** — a rotação fica num invólucro `.card` interno, não no botão: em ataque ele
  preenche o slot, em defesa vira `width: auto; aspect-ratio: 3/4; transform: rotate(-90deg)`, ou
  seja, uma carta em pé deitada de lado. Com isso a faixa `{atk}/{def}` continua na horizontal e as
  animações `data-cue` (que usam `transform: scale`) não brigam com a rotação.
- **`DuelLpBar`** — `display: grid; grid-template-columns: minmax(0,1fr) 78px minmax(0,1fr);
  gap: 10px; height: 84px` (altura fixa: a arte do terreno cresceria e comeria as fileiras). Nas
  pontas o `LpIndicator`, no meio o `FieldSlot`.
- **`LpIndicator`** — painel `background: var(--surface-frame)`,
  `box-shadow: var(--shadow-bevel-raised)`, com nome do duelista (`--font-display`, 9px, maiúsculas),
  o valor em `--text-display-md`/`var(--color-gold)` e uma barra de vida
  (`lp / INITIAL_LP`, limitada a 100%). Mantém `aria-label="{papel} pontos de vida"` e o nó de texto
  `{lp} LP` (Decisão 20); o nome visível é uma prop separada justamente para não colidir com esse
  rótulo. Os dois painéis se espelham em torno do slot de terreno.
- **`FieldSlot`** — `background: var(--surface-frame)`, `box-shadow: var(--shadow-bevel-raised)`, com
  a arte do terreno e o nome embaixo. Em 78px só o nome cabe, então "Terreno" sobrevive no
  `aria-label` (`Terreno: {nome}`); sem terreno ativo é uma caixa afundada com `Terreno` / `Nenhum`.
- **Mão** — `button.hand-card` de 64px com a arte recortada em `aspect-ratio: 3/4` e o nome numa
  faixa, selecionada com `box-shadow: 0 0 0 3px var(--color-success)`. A mão do oponente é a mesma
  faixa em 28px, sempre virada.
- **Carta virada** — `apps/web/public/card-back.jpg`, o verso real, em vez do padrão de CSS anterior;
  o padrão continua como fallback de `onError`.
- **Botões de ação** — `primary`: `background: var(--color-gold); color: var(--color-black)`;
  `secondary`: `background: var(--surface-frame); color: var(--text-heading)`; ambos com
  `box-shadow: var(--shadow-bevel-raised)`, `min-height: 44px`, `text-transform: uppercase`.
- **Sobreposições** — `.dialogLayer` (rendição) e `DuelResultOverlay` são `position: absolute` dentro
  de `.screen`, que é `position: relative`; a moldura do diálogo de rendição vem por descendência
  (`.dialogLayer > div`), sem tocar no componente (Decisão 19).

**Responsividade 320–1920px** (`arquitetura.md` §7; ADR-004): as cinco colunas de zona se mantêm em
todas as larguras. Até 1180px o cromo fixo encolhe (`232px 72px 1fr 108px`); abaixo de 900px o
inspetor desce para uma faixa horizontal sob o tabuleiro; abaixo de 640px os trilhos viram barras
horizontais e a tela empilha `rail-l / board / rail-r / inspector`. A altura é distribuída por
`flex`, com `min-height: 0` em cada filho.

### Eventos

F10 **não define evento novo** e **não emite nenhum**. Consome os dez tipos do motor
(`arquitetura.md` §3.3) traduzindo-os em cues:

| Evento | Cue | Insumo |
|---|---|---|
| `onDraw` | `draw` | `originPlayer` |
| `onSummon`, `onSet`, `onFlip` | `place` | `involvedZones[0]` |
| `onAttackDeclared` | `attack` | `involvedZones[0]` = atacante, `involvedZones[1]` = alvo (ausente no ataque direto) |
| `onDamage` | `damage` | `context.toPlayer`, `context.amount` |
| `onDestroy` | `destroy` | `involvedZones[0]` |
| `onTurnStart`, `onTurnEnd`, `onPositionChange` | *(nenhuma)* | — |

`toCues` é **total**: qualquer arranjo de eventos, inclusive com `involvedZones` vazio ou `context`
sem as chaves esperadas, devolve uma lista válida — eventos sem cue derivável são simplesmente
omitidos, nunca lançam.

### Determinismo e pureza

Esta feature **não toca `packages/engine`** e não introduz nenhuma fonte de aleatoriedade — não há
`Math.random()` em lugar algum, e o único não-determinismo é o relógio dos `setTimeout` da fila de
cues, isolado dentro de `use-duel-cues.ts` e controlável por `vi.useFakeTimers()`.

- **`reduceIntent`, `describeAffordances`, `describeActionSlots`, `zoneAffordance` e `toCues` são
  puras e totais**: mesma entrada ⇒ mesma saída, sem leitura de relógio, sem I/O, sem React.
- **Nenhuma cópia de estado do motor é mantida na tela.** A view é derivada por projeção a cada
  render; `DuelIntent` guarda apenas índices, não cartas — o que impede a tela de ficar com uma carta
  obsoleta na mão após uma mudança de estado.
- **O `DuelState` continua JSON-serializável**: F10 não escreve nele, apenas lê.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

**Nenhum tipo ou schema novo em `packages/shared`.** F10 reusa sem redefinir: `Card`, `CardNumber`,
`DuelState`, `PublicDuelState`, `PublicPlayerState`, `PublicMonsterZone`, `PublicSpellZone`,
`PublicCard`, `PublicHand`, `DuelSession`, `DuelAction`, `DuelEvent`, `EventType`, `ZoneReference`,
`ZoneIndex`, `MonsterPosition`, `Phase`, `PlayerId`, `DomainError`, `ConsolidatedDuelResult`.

Os tipos de interação (`DuelIntent`, `InteractionEvent`, `DuelAffordances`, `ActionSlot`,
`ActionSlotId`, `ZoneAffordance`, `DuelCue`) são **locais a `apps/web/src/lib/free-duel/`** de
propósito: são vocabulário de apresentação e não pertencem ao pacote raiz do domínio.

### Funções públicas

```
// apps/web/src/lib/free-duel/duel-interaction.ts   (puro; importa apenas @yugioh/shared)

reduceIntent(
  intent: DuelIntent,
  event: InteractionEvent,
  state: DuelState,
): Readonly<{ intent: DuelIntent; action?: DuelAction }>
  // total: evento inaplicavel a intencao corrente => devolve a mesma intencao, sem acao
  // pos: sempre que `action` esta presente, `intent` volta a { kind: "idle" }

describeAffordances(input: Readonly<{
  state: DuelState;
  isPlayerTurn: boolean;
  busy: boolean;
  intent: DuelIntent;
}>): DuelAffordances
  // espelha as guardas do motor; nunca decide legalidade em nome dele

describeActionSlots(
  input: Readonly<{ intent: DuelIntent; state: DuelState }>,
  affordances: DuelAffordances,
): readonly [ActionSlot, ActionSlot, ActionSlot]
  // pos: exatamente 3 slots, sempre; indisponibilidade vira `disabled`, nunca ausencia

zoneAffordance(state: DuelState, intent: DuelIntent, reference: ZoneReference): ZoneAffordance
```

```
// apps/web/src/lib/free-duel/duel-cues.ts   (puro)

toCues(events: readonly DuelEvent[]): readonly DuelCue[]
  // total sobre qualquer array de eventos; eventos sem cue derivavel sao omitidos
  // pos: length <= MAX_CUE_QUEUE (24)

CUE_DURATIONS_MS: Readonly<Record<DuelCue["kind"], number>>
```

```
// apps/web/src/lib/free-duel/duel-action-messages.ts

getRefusalMessage(error: DomainError): string
  // codigo conhecido => frase PT-BR especifica; desconhecido => frase generica
  // nunca devolve `error.message` (o motor emite texto bilingue)
```

```
// apps/web/src/hooks/use-duel-interaction.ts

useDuelInteraction(input: {
  state: DuelState | null;
  isPlayerTurn: boolean;
  busy: boolean;
  dispatch: (action: DuelAction) => void;
}): {
  intent: DuelIntent;
  slots: readonly [ActionSlot, ActionSlot, ActionSlot];
  affordanceFor: (reference: ZoneReference) => ZoneAffordance;
  onZoneActivate: (reference: ZoneReference) => void;
  onSelectHandCard: (handIndex: number) => void;
  onChoosePosition: (position: MonsterPosition) => void;
  onInvokeSlot: (id: ActionSlotId) => void;
  reset: () => void;
}
```

```
// apps/web/src/hooks/use-duel-cues.ts

useDuelCues(): {
  enqueue: (events: readonly DuelEvent[]) => void;
  cueFor: (reference: ZoneReference) => DuelCue["kind"] | undefined;
  cueForPlayer: (player: PlayerId) => DuelCue | undefined;
  busy: boolean;   // sempre false sob prefers-reduced-motion
}
```

### Props dos componentes

```
DuelBoardProps = Readonly<{
  view: PublicDuelState;
  zoneAffordance: (reference: ZoneReference) => ZoneAffordance;
  cueFor: (reference: ZoneReference) => DuelCue["kind"] | undefined;
  onZoneActivate: (reference: ZoneReference) => void;
  interactive: boolean;
}>

DuelZoneProps = Readonly<{
  zone: PublicMonsterZone | PublicSpellZone;
  reference: ZoneReference;
  label: string;                      // nome acessivel em PT-BR
  emptyLabel: "Vazio" | "—";
  affordance: ZoneAffordance;
  cue?: DuelCue["kind"] | undefined;
  onActivate?: (() => void) | undefined;   // ausente => zona nao interativa (botao `disabled`)
}>

PlayerHandProps = Readonly<{
  cards: readonly Card[];
  selectedIndex: number | null;
  disabled: boolean;
  drawnCount: number;                 // alimenta a cue de compra das cartas recem-adicionadas
  onSelect: (index: number) => void;
}>

DuelActionsProps = Readonly<{
  slots: readonly [ActionSlot, ActionSlot, ActionSlot];
  onInvoke: (id: ActionSlotId) => void;
}>

DuelTopBarProps = Readonly<{
  terrainName: string | null;
  phase: Phase;
  turn: number;
  onExit: () => void;
  children?: ReactNode;               // slot do controle de rendicao de F04
}>

DuelPromptProps = Readonly<{
  intent: DuelIntent;
  onChoosePosition: (position: MonsterPosition) => void;
  onCancel: () => void;
}>

DuelMessageProps = Readonly<{ text: string | null; tone: "info" | "refusal" }>

DuelResultOverlayProps = Readonly<{ children: ReactNode }>
```

### Exemplo — o que a projeção pública entrega ao componente de zona

Monstro do oponente virado para baixo (o componente **não tem** como renderizar nome ou ATK/DEF,
porque a variante do tipo não os carrega):

```json
{
  "occupied": true,
  "card": { "visible": false },
  "position": "defense_face_down",
  "hasAttacked": false,
  "hasChangedPosition": false
}
```

O mesmo monstro no lado do jogador (`forPlayer === "P1"`, `revealAll`):

```json
{
  "occupied": true,
  "card": { "visible": true, "card": { "numero": "012", "nome": "…", "atk": 1200, "def": 900 } },
  "position": "defense_face_down",
  "hasAttacked": false,
  "hasChangedPosition": false
}
```

### Contratos consumidos de F09 (não redefinir)

- **`PlayerActionOutcome`** = `{ session, events, refusal? }` — a sessão é **referencialmente
  idêntica** à entrada quando a ação é recusada, e `events` traz apenas os eventos da ação do jogador.
- **`ApplyAction`** = `(state, action) => Result<ApplyResult, DomainError>`.
- **`DuelRuntime`** = `{ start, applyAction, advanceDependencies, resolveResult }`, criado por
  `createDuelRuntime` — único módulo do app que importa `@yugioh/engine`.
- **`onStep`** de `AdvanceCpuDependencies` — publicado após **cada** ação da CPU aplicada e liquidada;
  é a fonte dos estados intermediários e das cues do turno do oponente.
- **Agente passivo** (`createPassiveAiAgent`) com ritmo dentro do próprio agente, substituível pelo
  agente real de `packages/ai` sem tocar nesta feature.

### Contratos externos (cross-PRD)

**A ser fornecido por `packages/ai`:** a implementação real de `AiAgent`. F10 é indiferente à
estratégia — renderiza qualquer sequência de ações publicada por `onStep`.

**A ser fornecido pelo Rating Engine:** nota e tabela nota→recompensa, renderizadas por `DuelResult`
(F05) dentro do overlay. Enquanto ausente, toda vitória mostra o `minimum_fallback`.

**A ser fornecido pelo usuário (dado externo):** matrizes de terreno e Guardião Estelar. Enquanto
vazias, a barra superior exibe apenas o **nome** do terreno ativo e nenhum modificador — o caminho
neutro de `arquitetura.md` §4.3.

## 5. Modelo de Dados

### Postgres / Supabase

**Nenhuma tabela, coluna, índice, constraint, política de RLS, RPC ou migração é criada ou alterada.**
A sessão de duelo vive em memória (spec F03, Decisão 15; F09, Decisão 24) e a economia permanece
intocada porque F06/F07 seguem desligadas. Não há valor sensível vindo do cliente nem crédito a tornar
idempotente.

### Cache local / fila offline

Nenhuma estrutura nova. A tela não persiste nada — nem a intenção corrente, nem a fila de cues, nem a
sessão. Recarregar `/duel` perde o handoff e redireciona para `/free-duel` (comportamento de F03).

### Arquivos de dados versionados

Nenhum arquivo de dados é criado ou alterado. As artes continuam vindo de `cards-data/*.jpg` pela rota
`app/cards-data/[file]/route.ts`, endereçadas por `cardArtUrl(numero) → "/cards-data/NNN.jpg"`
(`apps/web/src/lib/card-art-url.ts`), o único lugar onde essa URL é escrita.

**Tokens de estilo:** apenas `--text-display-xl/lg/md` foram acrescentados a
`apps/web/src/app/globals.css` (Decisão 11, revisada 2026-08-07). Todo o resto do
protótipo é expressável com os tokens já publicados: superfícies (`--surface-page/raised/sunken/frame`),
texto (`--text-primary/heading/muted/danger/success`), paleta (`--color-gold/panel/night/night-sunken/
sand/stone/danger/danger-dark/success`), relevos (`--shadow-bevel-raised/pressed`), tipografia
(`--font-display`, `--font-body`, `--text-body-lg/md/sm/xs`), espaçamento (`--space-1..6`),
`--radius: 0` e `--touch-target: 44px`.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Motor recusa a jogada | `PlayerActionOutcome.refusal` presente | Intenção volta a `idle`; **tabuleiro inalterado**; sessão segue `in_progress` | Linha traduzida do `code` em `role="status"`/`aria-live="polite"` (PRD F10 Error Handling) |
| Código de recusa desconhecido | Ausente do mapa de mensagens | Cai no fallback genérico; nunca vaza `error.message` do motor | "Não foi possível fazer essa jogada agora." |
| Não é a vez do jogador | `currentDecider === "P2"` | Mão, zonas e slots A/B/C desabilitados; banner de vez do oponente | "Vez do oponente…" |
| Despacho em voo ou animação correndo | `busy` do store (F09) ou da fila de cues | Controles desabilitados; nenhuma ação enfileirada | Nenhuma (estado visual) |
| Movimento reduzido preferido | `matchMedia("(prefers-reduced-motion: reduce)").matches` | Durações a zero, fila drenada em um tick, `busy` nunca verdadeiro, nenhum `@keyframes` ativo | Nenhuma |
| `matchMedia` inexistente (jsdom) | `typeof window.matchMedia !== "function"` | Tratado como "movimento não reduzido"; nenhuma exceção | Nenhuma |
| Arte da carta falha ao carregar | `onError` do `<img>` | Cai no marcador neutro de arte ausente, mantendo a proporção 3/4 (sem deslocamento de layout) | Nenhuma (nome acessível preservado) |
| Zona do oponente virada para baixo | `card.visible === false` na projeção | Renderiza verso de carta; **sem** nome, `{atk}/{def}`, `title` ou `alt` identificador | "Carta virada" |
| Clique numa zona sem afordância | Botão renderizado com `disabled` | Sem efeito; a zona está fora do tab order | Nenhuma |
| Mão vazia na fase principal | `hand.length === 0` | Slots A e B desabilitados; slot Passar Fase segue ativo | Nenhuma |
| Todas as zonas de monstro ocupadas | Nenhuma zona livre | **Invocar**/**Definir** desabilitados antes de qualquer despacho | Nenhuma |
| Fila de cues estoura o teto | Comprimento > 24 | Excedente **descartado**; a fila nunca acumula indefinidamente | Nenhuma |
| Duelo termina no meio de uma animação | `session.status === "ended"` | A fila é descartada, o tabuleiro congela e o overlay abre | Resultado (F05) + navegação (F08) |
| Duelo já encerrado | `state.outcome` definido | Todos os controles desabilitados; `SurrenderButton` some (comportamento de F04) | Overlay de resultado |
| Rendição pelo chrome (`◀ Sair do Duelo`) | Clique no controle da barra superior | Abre a confirmação de F04 sem tocar no estado | "Render-se conta como derrota. Confirmar?" |
| Falha de orquestração (F03/F09) | `session.status === "failed"` | Renderiza `OrchestrationFailureNotice` intacto, sem tabuleiro | Mensagem específica da razão |
| Catálogo indisponível | `catalogResult.status === "error"` (F09) | `duel-unavailable-notice`, sem tabuleiro e sem partida | Aviso PT-BR com recarregar |
| Refresh em `/duel` | Handoff já consumido | Redireciona para `/free-duel` | Nenhuma (documentado em F03 e PRD §7) |
| Terreno ativo ausente | `activeField === null` | Barra superior mostra "Terreno: Nenhum"; nenhum modificador é exibido | Nenhuma |

## 7. Estratégia de Testes

Vitest 4.1.10; ambiente **node** por padrão, com os testes de React optando por jsdom via docblock
`// @vitest-environment jsdom` por arquivo (não existe `environmentMatchGlobs` nesta versão). Sem
`@testing-library/jest-dom` e sem `@testing-library/user-event` — `fireEvent` e asserts simples.
`@testing-library/react` e `fast-check` disponíveis. Comandos sem `--`
(`pnpm --filter @yugioh/web test duel-interaction`).

### Unitários (Vitest)

**`duel-interaction.test.ts`** (node) — uma transição por linha da máquina:

- `reduceIntent seleciona a carta da mao e abre a previa`
- `reduceIntent leva de card_selected a choosing_position ao invocar, com a zona calculada automaticamente` (correção 2026-08-02 — não passa mais por `choosing_zone`)
- `reduceIntent pula zonas ocupadas e escolhe a proxima zona de monstro livre ao invocar`
- `reduceIntent produz summon_monster com a posicao escolhida` — uma asserção por posição, tabela com
  as quatro (`attack_face_up`, `attack_face_down`, `defense_face_up`, `defense_face_down`)
- `reduceIntent do atalho Definir produz summon_monster direto em defense_face_down, com a zona calculada automaticamente e sem passar por choosing_position`
- `reduceIntent produz play_spell_or_trap ao ativar uma zona livre da backrow`
- `reduceIntent produz declare_attack com alvo apos escolher atacante e alvo`
- `reduceIntent produz declare_attack sem alvo no ataque direto`
- `reduceIntent produz change_position ao ativar um monstro proprio em choosing_flip`
- `reduceIntent ignora evento inaplicavel e devolve a mesma intencao`
- `reduceIntent volta a idle sempre que produz uma acao`
- `reduceIntent cancela e volta a idle preservando o estado`

**`duel-interaction.test.ts` — afordâncias** (uma por regra da tabela da Seção 3):

- `describeAffordances nega canAct quando o decisor e P2`
- `describeAffordances nega canAct quando busy`
- `describeAffordances nega canAct quando o duelo terminou`
- `describeAffordances nega canSummon fora da fase principal`
- `describeAffordances nega canSummon quando a jogada da mao ja foi usada`
- `describeAffordances nega canSummon para carta de magia`
- `describeAffordances nega canSummon sem zona de monstro livre`
- `describeAffordances nega canPlaceSpell para carta de monstro`
- `describeAffordances nega canAttack no primeiro turno do duelo`
- `describeAffordances aceita canAttack com monstro em attack_face_down` — o espelho errado mataria o botão
- `describeAffordances nega canAttack quando o monstro ja atacou`
- `describeAffordances aceita canDirectAttack somente com o campo do oponente vazio`
- `describeAffordances nega canChangePosition fora da fase de batalha`
- `describeAffordances nega canChangePosition quando o monstro ja mudou de posicao`
- `describeActionSlots devolve sempre tres slots` — tabela cobrindo as cinco linhas do layout
- `describeActionSlots mantem Passar Fase no slot primario em todas as situacoes`
- `zoneAffordance marca as zonas de magia/armadilha livres como selectable em choosing_zone` (correção 2026-08-02 — `choosing_zone` só existe mais para a backrow)
- `zoneAffordance marca os monstros do oponente como target em choosing_target`
- `zoneAffordance devolve idle para zonas do oponente em choosing_zone`

**`duel-cues.test.ts`** (node):

- `toCues mapeia onDraw para uma cue de compra do jogador de origem`
- `toCues mapeia onSummon, onSet e onFlip para place na zona envolvida`
- `toCues mapeia onAttackDeclared para attack com atacante e alvo`
- `toCues mapeia onAttackDeclared sem alvo no ataque direto`
- `toCues le toPlayer e amount do contexto de onDamage`
- `toCues mapeia onDestroy para destroy na zona envolvida`
- `toCues ignora onTurnStart, onTurnEnd e onPositionChange`
- `toCues preserva a ordem de emissao dos eventos`
- `toCues limita a fila ao teto de 24 entradas`

**`duel-action-messages.test.ts`** (node):

- `getRefusalMessage traduz cada codigo conhecido do motor` — tabela com os ~24 códigos da Decisão 16
- `getRefusalMessage cai no fallback generico para codigo desconhecido`
- `getRefusalMessage nunca devolve a mensagem original do motor`

**`use-duel-interaction.test.ts`** (jsdom):

- `o fluxo selecionar carta, invocar e escolher posicao despacha summon_monster uma unica vez, na zona livre calculada automaticamente` (correção 2026-08-02)
- `cancelar no meio da selecao nao despacha nada`

**`use-duel-cues.test.ts`** (jsdom, `vi.useFakeTimers()`):

- `uma cue ativa marca busy e limpa apos a duracao do seu tipo`
- `as cues sao consumidas na ordem de enfileiramento`
- `com prefers-reduced-motion a fila drena em um tick e busy nunca fica verdadeiro` — `matchMedia`
  stubado com `matches: true`
- `sem window.matchMedia o hook trata como movimento nao reduzido e nao lanca`

**Componentes** (jsdom):

- `duel-zone.test.tsx`: `uma zona de monstro vazia mostra Vazio`; `uma zona de backrow vazia mostra o
  travessao`; `uma zona ocupada e visivel mostra atk e def`; `uma zona do oponente virada para baixo
  nao expoe nome, atk nem def` (alimentada com `card.visible === false`); `uma zona sem onActivate
  renderiza o botao desabilitado e fora do tab order`; `a afordancia vira o atributo data-affordance`.
- `duel-board.test.tsx`: `renderiza 10 zonas de monstro e 10 de magia/armadilha`; `os rotulos das
  zonas estao em portugues`; `nao expoe nome nem atributos de carta virada do oponente`.
- `duel-side.test.tsx` (**novo 2026-08-07**): `a fileira de monstros vem antes da backrow para os
  dois jogadores` — a regressão do espelhamento.
- `duel-card-art.test.tsx` (**novo 2026-08-07**): `carta virada mostra o verso real`; `cai no padrao
  antigo quando o verso nao carrega`.
- `duel-lp-bar.test.tsx`, `field-slot.test.tsx`, `turn-chip.test.tsx` (**novos 2026-08-07**): cobrem
  o que saiu de `duel-top-bar.test.tsx` mais a barra de vida limitada a 100%.
- `player-hand.test.tsx`: `cada carta da mao expoe o nome como rotulo acessivel` (Decisão 20); `a
  carta selecionada recebe o atributo de selecao`; `a mao desabilitada nao aceita clique`.
- `duel-actions.test.tsx`: `renderiza exatamente tres botoes em todos os estados`; `um slot sem
  afordancia fica desabilitado em vez de sumir`.
- `duel-prompt.test.tsx`: `o seletor oferece as quatro posicoes em portugues`; `escolher uma posicao
  chama o callback com a posicao correspondente`.
**`duel-screen.test.tsx`** (jsdom, reescrito):

- `a tela renderiza os dois campos, os LP e a mao sem rolagem`
- `o LP do oponente continua legivel como texto` — preserva `{lp} LP` (Decisão 20)
- `a mao e as zonas ficam desabilitadas enquanto o decisor e P2` e o banner de vez do oponente aparece
- `uma recusa do motor exibe a linha de aviso e mantem o tabuleiro` — a view não muda
- `a tela mostra o aviso de catalogo indisponivel e nao inicia a partida` (herdado de F09)
- `encerrado o duelo, o overlay de resultado cobre a tela e o tabuleiro congela`
- `nenhum nome de carta virada do oponente aparece no DOM`

### Property-based (fast-check)

- `toCues e total sobre qualquer arranjo de eventos` — 1.000 arrays arbitrários de `DuelEvent`
  (incluindo `involvedZones` vazio e `context` sem `toPlayer`/`amount`): nunca lança, sempre devolve
  no máximo 24 cues, e toda cue referencia uma zona presente no evento de origem.
- `reduceIntent nunca produz acao ilegal pelo pre-gate` — para qualquer par (intenção, evento)
  arbitrário sobre um `DuelState` arbitrário, quando `reduceIntent` devolve uma ação, a afordância
  correspondente calculada por `describeAffordances` era verdadeira.
- `describeActionSlots devolve sempre exatamente tres slots` — sobre intenções e estados arbitrários.
- `reduceIntent e total` — nenhuma combinação de intenção e evento lança; a saída é sempre uma
  `DuelIntent` válida da união.

### Integração

- **`apps/web/tests/free-duel-playable-duel.integration.test.tsx` (novo, jsdom, contra o motor real —
  só o `sleep` do agente é falso):** monta o catálogo selado, cria o `DuelRuntime` de F09 e conduz uma
  partida completa pela interface — iniciar → selecionar carta → Invocar → escolher posição (zona
  calculada automaticamente, correção 2026-08-02) → a zona mostra a carta e a mão encolhe → Passar
  Fase ×3 → o turno da CPU avança visivelmente
  → na fase de batalha do turno ≥ 2, Atacar → atacante → alvo (ou ataque direto) → o LP do oponente cai
  → render → "Derrota" + "Revanche" / "Trocar oponente" / "Voltar ao menu". **Sem fakes do motor.**
- **`apps/web/tests/surrender.integration.test.tsx` (existente, deve seguir verde):** o botão
  "Render-se" continua alcançável pelo nome acessível e a confirmação encerra a partida.
- **`apps/web/tests/free-duel-post-duel-navigation.integration.test.tsx` (existente, deve seguir
  verde):** os três links pós-duelo continuam presentes dentro do novo overlay.
- **`apps/web/tests/free-duel-result.integration.test.tsx` e `free-duel-victory-reward.integration.test.tsx`
  (existentes, devem seguir verdes):** `DuelResult`/`CardDropReward`/`StarsRewardBadge` foram
  emoldurados, não alterados.

### Análise estática

- **`scripts/check-duel-engine-boundary.mjs`** (criado por F09, encadeado em `pnpm lint`) — continua
  sendo o portão real: nenhum arquivo desta feature pode importar `@yugioh/engine`, e nenhum módulo
  `"use client"` pode alcançar `lib/catalog/sealed-catalog.ts` ou `lib/server/`. **Verificação
  explícita:** acrescentar temporariamente um import do motor em `duel-board.tsx` e confirmar que o
  script falha (reverter em seguida).
- **`pnpm typecheck`** é o que garante a Decisão 1 no nível estrutural: com os componentes tipados em
  `PublicMonsterZone`/`PublicSpellZone`, ler `card.nome` de uma zona `{visible:false}` **não compila**.
  A ausência de vazamento não depende da disciplina do componente.
- `pnpm lint` cobre os módulos puros (`domain-cores-are-pure` não se aplica a `apps/web`, mas as regras
  de import continuam valendo); a fronteira entre pacotes **não** é evidenciada pelo dependency-cruiser
  (CLAUDE.md).

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9, F10) | Teste |
|---|---|
| Barra superior, dois campos 5+5, LP dos dois lados e mão do jogador, sem rolagem | `a tela renderiza a barra superior, os dois campos, os LP e a mao sem rolagem` + `renderiza 10 zonas de monstro e 10 de magia/armadilha` |
| Cartas viradas do oponente sem nome, ATK ou DEF acessíveis; lado do oponente vindo da projeção pública | `uma zona do oponente virada para baixo nao expoe nome, atk nem def`, `nenhum nome de carta virada do oponente aparece no DOM` e o portão de tipos (`pnpm typecheck`) |
| Invocar na zona livre calculada automaticamente, escolhendo cada uma das quatro posições | `reduceIntent produz summon_monster com a posicao escolhida` (tabela das 4) + o caminho completo na integração |
| Colocar magia/armadilha na fileira de trás, carta virada e jogada da mão consumida | `reduceIntent produz play_spell_or_trap…` + integração (a segunda tentativa de jogada no mesmo turno é recusada com `hand_play_already_used`) |
| Declarar ataque com atacante e alvo, e ataque direto; LP refletem o resultado | `reduceIntent produz declare_attack…` (×2) + integração (queda de LP contra o motor real) |
| Mudar a posição de um monstro em campo na fase de batalha | `reduceIntent produz change_position…` + `describeAffordances nega canChangePosition…` |
| Controles indisponíveis aparecem desabilitados e não somem; chrome não muda de tamanho | `renderiza exatamente tres botoes em todos os estados`, `um slot sem afordancia fica desabilitado em vez de sumir`, `uma zona sem onActivate renderiza o botao desabilitado` |
| Compra, entrada em campo, ataque, dano e destruição têm animação curta; movimento reduzido não anima | `uma cue ativa marca busy e limpa apos a duracao do seu tipo`, `com prefers-reduced-motion a fila drena em um tick e busy nunca fica verdadeiro`, `toCues mapeia…` |
| Encerrado o duelo, o resultado cobre a tela com as opções de F08 e o tabuleiro congela | `encerrado o duelo, o overlay de resultado cobre a tela e o tabuleiro congela` + `free-duel-post-duel-navigation.integration.test.tsx` |
| Os textos da tela de duelo estão em português | `os rotulos das zonas estao em portugues`, `o rotulo da fase esta em portugues`, `o seletor oferece as quatro posicoes em portugues`, `getRefusalMessage traduz cada codigo conhecido do motor` |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Cross-Feature: fluxo completo F01→F02→F03/F09→F05→F08 sem estado inconsistente | `free-duel-playable-duel.integration.test.tsx` |
| Cross-Feature: em derrota/empate (inclusive rendição de F04), F06/F07 não disparam e não há recompensa | `surrender.integration.test.tsx` (existente) — resultado sem bloco de recompensa dentro do novo overlay |
| Cross-PRD (Motor de Duelo 1x1): todo desfecho vem do motor; a tela não reimplementa regra | `free-duel-playable-duel.integration.test.tsx` contra o motor real + `scripts/check-duel-engine-boundary.mjs` |
| Cross-PRD (MotorDuelo/F01 — projeção pública): o lado do oponente é renderizado a partir de `getPublicDuelState` | `uma zona do oponente virada para baixo nao expoe nome, atk nem def` + `pnpm typecheck` |
| Cross-PRD (IA de NPCs): o lado P2 é conduzido pelo agente do perfil do oponente; trocar o agente não toca a tela | `free-duel-playable-duel.integration.test.tsx` (a tela só consome `onStep`) + ausência de qualquer import de agente nos componentes |
| Cross-PRD (Rating Engine): a nota exibida reflete as definições oficiais quando fornecidas — pendência registrada | `free-duel-result.integration.test.tsx` (existente) — caminho `minimum_fallback` dentro do overlay |
| Cross-PRD (Banco de Cartas): as artes das cartas em campo e na mão resolvem pela rota de artes por `numero` | `free-duel-playable-duel.integration.test.tsx` (URLs `/cards-data/NNN.jpg`) |
