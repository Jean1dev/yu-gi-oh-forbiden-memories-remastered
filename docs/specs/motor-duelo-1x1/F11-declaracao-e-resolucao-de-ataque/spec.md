# Declaração e Resolução de Ataque

> PRD: `docs/prds/motor-duelo-1x1.md` — F11
> Pacote-alvo: `packages/engine` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta é a feature mais complexa da wave 4: a tabela de resolução de combate do Forbidden Memories,
sem perfuração. Ela é também a **primeira consumidora real** de dois contratos que existiam até
aqui só como mecanismo pronto sem consumidor: a janela de reação de F02 (`onAttackDeclared` é o
único evento do vocabulário fechado que o próprio PRD já cita abrindo janela) e `isFirstDuelTurn`
de F06. É também a primeira feature a chamar `calculateEffectiveAtkDef` (F04) dentro de uma
transição real de estado.

**Decisão arquitetural central desta spec:** `docs/arquitetura.md` §3.2 descreve a janela de reação
como uma **máquina de estados explícita** — quando uma ação emite um evento com janela, `apply`
devolve um estado com `pending`, e "o chamador... resolve com ações de follow-up; sem reações, a
janela fecha e o fluxo segue." Isso significa que declarar o ataque e resolver o combate **não
podem ser a mesma transição síncrona**: são duas ações distintas, `declare_attack` e
`resolve_attack`, com uma janela de reação genuinamente aberta entre elas (Decisão 1).

### Incluído

- `DeclareAttackAction` — identifica a zona do atacante e, opcionalmente, a zona-alvo do defensor
  (ausência = ataque direto); valida as quatro condições de recusa do PRD, emite
  `onAttackDeclared` e abre a janela de reação (PRD F11 Capabilities, Consumes F06)
- `ResolveAttackAction` — sem parâmetros; fecha a janela de reação aberta por `declare_attack`,
  revela um defensor face-baixo (`onFlip`) antes de calcular, resolve a tabela de combate fiel ao
  FM (ATK vs ATK, ATK vs DEF, ataque direto), aplica destruição/dano, emite `onDamage`/`onDestroy`
  e marca `hasAttacked` do atacante (PRD F11 Capabilities)
- A tabela de resolução completa, sem perfuração, nos três blocos do PRD (PRD F11 Capabilities;
  `arquitetura.md` §3.5)
- Uso de `calculateEffectiveAtkDef` (F04) para os valores efetivos de atacante e defensor (PRD F11
  Consumes)
- Uso de `isFirstDuelTurn` (F06) para bloquear ataque no primeiro turno do duelo (PRD F11
  Capabilities; critério de aceite 5)
- Os cinco casos de recusa do PRD Error Handling, cada um com seu próprio código

### Fronteiras

- **Resolução de reações concretas** (o que uma armadilha faz ao reagir a `onAttackDeclared`) →
  Effect System (cross-PRD), fora de escopo — F11 só abre e fecha a janela.
- **Tabelas reais de Guardião/Terreno/Equipamento** → GuardianStar Engine / Terrain Engine / Effect
  System (cross-PRD, sem PRD ainda) — F11 consome `calculateEffectiveAtkDef` (F04), que já trata
  essas tabelas como neutras; F11 não as reimplementa nem inventa valores.
- **Revalidação de que o atacante/alvo ainda ocupam as mesmas zonas entre `declare_attack` e
  `resolve_attack`** → fora de escopo. Como o Effect System (cross-PRD) ainda não existe, nada pode
  de fato mutar o campo durante a janela aberta; `resolve_attack` confia que as zonas referenciadas
  no evento pendente continuam válidas (ver Decisão 11/Pendência).
- **Condição de fim de duelo** (LP chegando a 0) → F12 (wave 5), que ainda não existe. F11 aplica o
  dano e deixa o LP no estado — não decide vencedor, não congela o estado (mesmo padrão que F06 já
  aplicou para F12, Decisão 13 daquela spec).

### Contratos externos assumidos

Nenhum cross-PRD novo. F11 tem `Dependências: F06, F04, F02, F01` na tabela do PRD §8 — todas
internas ao mesmo PRD, com spec (F06 nesta mesma wave; F01/F02/F04 já implementadas).

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **Duas ações, não uma:** `declare_attack` abre a janela de reação em `onAttackDeclared` e devolve controle; `resolve_attack` (sem parâmetros — lê o evento pendente) fecha a janela e executa a resolução de fato. Alternativa descartada: uma única ação síncrona que declara e resolve no mesmo `apply`, o que contradiz `arquitetura.md` §3.2 ("o chamador resolve com ações de follow-up; sem reações, a janela fecha e o fluxo segue") e tornaria a janela de reação sempre um no-op para F11, esvaziando o propósito de F02. | `arquitetura.md` §3.2 (citação literal); `packages/engine/src/events/reaction-window.ts` (`closeReactionWindow` já existe como operação separada de quem abre a janela) | confirmada |
| 2 | `resolve_attack` não recebe atacante/alvo como parâmetro — lê `state.pending.event.involvedZones` (preenchido por `declare_attack`) para saber quem ataca e quem é o alvo. Evita duplicar essa informação em dois lugares do estado e mantém `ResolveAttackAction` sem campos, coerente com "o evento pendente já carrega o contexto" (`docs/specs/motor-duelo-1x1/F02-.../spec.md`, `DuelEvent.involvedZones`). | Design — evitar duplicação de referência de zona entre a ação de declarar e a de resolver | confirmada |
| 3 | `apply` (F06) só despacha `resolve_attack` quando `state.pending` está definido **e** `state.pending.event.type === "onAttackDeclared"` — recusa com `no_pending_attack_to_resolve` caso contrário. Isso inverte a pré-condição das demais ações da wave (que exigem `hasOpenReactionWindow(state) === false`): `resolve_attack` é a única ação cuja pré-condição é justamente **existir** uma janela, e especificamente uma de ataque (uma feature futura de Effect System pode um dia abrir janelas para outros tipos de evento; `resolve_attack` não deve fechar a janela errada). | Consistência com o guard genérico já estabelecido por F02/F06, adaptado à natureza inversa desta ação | confirmada |
| 4 | `declare_attack` segue a mesma disciplina que F06 já define para `advance_phase` e que F08/F09 já seguem: confia que `apply` já garantiu fase `battle`, jogador ativo correto e ausência de janela de reação aberta antes de despachar — `declareAttack` não revalida essas três condições, só o que é especificamente seu (posição do atacante, flag `hasAttacked`, existência/dono das zonas, regra de ataque direto, primeiro turno do duelo). | Padrão já confirmado em F08 (Decisão 7) e F09 (Decisão 10) — mesmas features desta wave | confirmada |
| 5 | Ordem de validação em `declareAttack`: (a) `isFirstDuelTurn(state)` → `first_turn_attack_forbidden`; (b) zona do atacante ocupada e pertence ao jogador ativo → senão `attacker_zone_empty`; (c) posição do atacante é uma das duas de ataque (`attack_face_up`/`attack_face_down`) → senão `attacker_not_in_attack_position`; (d) `hasAttacked` do atacante é `false` → senão `attacker_already_attacked`; (e) se `targetZoneIndex` informado, a zona do oponente naquele índice deve estar ocupada → senão `target_zone_empty`; (f) se `targetZoneIndex` **não** informado, todas as 5 zonas de monstro do oponente devem estar vazias → senão `direct_attack_blocked_by_monsters`. Ordem escolhida para que o bloqueio de primeiro turno (a regra mais "estrutural", independente de qualquer escolha do jogador) seja sempre a primeira mensagem, e as checagens dependentes da zona escolhida venham por último. | Leitura do PRD F11 Error Handling (4 mensagens citadas) + validações defensivas adicionais que o PRD não nomeia (zona vazia/não pertence ao jogador — Auto-Aceite, mesmo padrão de F08/F09) | confirmada |
| 6 | **Local dos provedores de modificador para esta feature:** `resolveAttack` chama `calculateEffectiveAtkDef` (F04) passando um bundle de provedores **neutros definidos localmente em `packages/engine/src/combat/`** (`{ atk: 0, def: 0 }` para os três eixos), em vez de importar `neutralModifierProviders` de `@yugioh/rules`. Motivo: `packages/engine/README.md` já declara que `calculateEffectiveAtkDef` "never imports `packages/rules` itself" — os provedores concretos vivem em `rules` e são injetados de fora; `packages/engine` como um todo mantém essa mesma disciplina (nenhum arquivo sob `packages/engine/src/**` importa `packages/rules`, verificado por `.dependency-cruiser.cjs`). Como `apply(state, action)` permanece uma função de **exatamente dois parâmetros** (`docs/specs/motor-duelo-1x1/F09-.../spec.md`, Decisão 2 — importante para reprodutibilidade entre nós), não há um terceiro parâmetro por onde `apps/web`/o servidor online injetariam os provedores reais quando existirem. **Pendência documentada, não bloqueante:** isso duplica intencionalmente o valor neutro `{0,0}` que `packages/rules/src/combat/neutral-modifier-providers.ts` (F04) também define; quando GuardianStar/Terrain/Effect System ganharem PRD e tabelas reais, alguém precisará decidir como `apply`/`resolveAttack` passam a receber provedores não-neutros sem violar a regra "`engine` nunca importa `rules`" (ex.: um parâmetro de dependências opcional em `apply`, ou uma camada de composição fora de `engine` que já resolve o resultado antes de chamar `apply`) — não resolvido aqui, para não inventar um mecanismo de injeção que nenhuma spec pediu ainda. | `packages/engine/README.md` ("this function never imports `packages/rules` itself"); `.dependency-cruiser.cjs` (regra de fronteira); `docs/specs/motor-duelo-1x1/F09-.../spec.md` Decisão 2 (apply com dois parâmetros) | confirmada (documentada como pendência arquitetural futura) |
| 7 | `getOpponent(player: PlayerId): PlayerId` **é reaproveitado de `packages/engine/src/spells/opponent.ts`** (introduzido por F09, feature irmã desta mesma wave), em vez de duplicado — esta spec foi escrita com visibilidade direta do `spec.md` real de F09 (não em worktree isolado), o que permite resolver aqui a "pendência de consolidação" que a Decisão 11 daquela spec já registrava. `packages/engine/src/combat/**` importa `getOpponent` de `../spells/opponent.ts` (import interno ao próprio pacote `engine`, não uma fronteira de pacote). | Releitura de `docs/specs/motor-duelo-1x1/F09-.../spec.md` Decisão 11 (pendência de duplicação já sinalizada) | confirmada |
| 8 | **Revelação de face-baixo (`onFlip`)** acontece em `resolveAttack`, não em `declareAttack` — a janela de reação abre sobre o ataque *declarado*, antes de qualquer revelação; o PRD descreve a revelação como parte da resolução ("é revelado antes da resolução"), que só ocorre depois que a janela fecha (Decisão 1). Revelar troca a posição do defensor de `*_face_down` para o `*_face_up` correspondente (`attack_face_down → attack_face_up`, `defense_face_down → defense_face_up`), preservando o par ataque/defesa; só ocorre se houver alvo (nunca em ataque direto) e só se o defensor já não estiver face-cima. | PRD F11 Capabilities ("um monstro face-baixo do defensor é revelado antes da resolução... usa seu valor real"); Decisão 1 (janela fecha antes de resolver) | confirmada |
| 9 | **`CombatContext.opponent`** (parâmetro de `calculateEffectiveAtkDef`, F04) é a **carta do monstro adversário no combate em curso** — não o `PlayerId` do oponente. Ao calcular o ATK efetivo do atacante, `context.opponent` é a carta do defensor (ou `undefined`/`null` em ataque direto); ao calcular o DEF/ATK efetivo do defensor, `context.opponent` é a carta do atacante. Releitura literal da definição de `CombatContext` em `packages/engine/src/combat/calculate-effective-atk-def.ts` (F04, já implementada) — não confundir com `getOpponent` (Decisão 7), que inverte `PlayerId`, não `Card`. | `packages/engine/src/combat/calculate-effective-atk-def.ts` (código real, F04) | confirmada |
| 10 | **Tabela de resolução** (fiel ao FM, sem perfuração), implementada como função pura `resolveCombatTable` separada de `resolveAttack` (Alocação, Seção 2), recebendo apenas `{ attackerEffective, defenderEffective, defenderPosition }` — nunca `DuelState` inteiro — para poder ser testada exaustivamente sem montar um estado completo por caso. As três ramificações (ATK vs ATK, ATK vs DEF, ataque direto) e os subcasos de empate seguem a transcrição literal do PRD F11 Capabilities (ver Seção 3). | PRD F11 Capabilities (transcrição literal); `arquitetura.md` §3.5 ("cobertura exaustiva" como pilar de qualidade) | confirmada |
| 11 | **LP nunca fica negativo:** dano aplicado é `Math.max(0, lp atual - dano)`. O PRD não especifica isso explicitamente, mas F12 (fim de duelo, ainda sem spec) verifica "LP chega a 0" — permitir LP negativo criaria uma representação alternativa do mesmo estado terminal sem benefício, e destoa da UI eventual de um duelo (barra de vida não-negativa). | Especificação parcial no PRD (não define o piso de LP); Auto-Aceite — default de mercado consistente com o critério de fim de duelo de F12 | confirmada |
| 12 | Ao final de uma resolução bem-sucedida (qualquer ramo), `hasAttacked` do atacante é marcado `true` **antes** de aplicar uma eventual destruição — se o atacante for destruído (só possível no ramo ATK vs ATK com o atacante perdendo), a zona inteira vira `{ occupied: false }`, o que apaga o próprio flag junto com a carta; não há inconsistência porque uma zona vazia não tem `hasAttacked` para ler. | Leitura do tipo `MonsterZone` (F01) — união discriminada, zona vazia não carrega flags | confirmada |
| 13 | `resolve_attack` **não revalida** que o atacante/alvo continuam nas mesmas zonas referenciadas pelo evento pendente entre a declaração e a resolução — não há como o campo mudar nesse intervalo hoje (Effect System, o único subsistema que poderia reagir e alterar o campo, não existe). Documentado como pendência: quando o Effect System existir e puder, por exemplo, destruir o atacante em reação a `onAttackDeclared`, `resolveAttack` precisará revalidar as zonas antes de calcular (Fronteiras). | Fase 0.5 (dependência cross-PRD inexistente, tratada como pendência não bloqueante) | confirmada (pendência documentada) |
| 14 | Identificadores de código em **inglês** (`DeclareAttackAction`, `declareAttack`, `resolveAttack`, `resolveCombatTable`), consistente com a correção de precedente já aplicada por F06 (Decisão 8) e F09 (Decisão 13) desta mesma wave, e com o código real (`calculateEffectiveAtkDef`, `DuelState`, etc.). | `CLAUDE.md`; código real em `packages/engine/src/**` | confirmada |
| 15 | Estrutura de arquivos: a lógica desta feature vive em `packages/engine/src/combat/`, o **mesmo** subsistema onde F04 já colocou `calculate-effective-atk-def.ts` — não um subsistema novo — porque "resolver um combate" e "calcular o poder de combate" são o mesmo domínio conceitual (`combat`), e F04 já estabeleceu essa pasta. | Padrão observado em `packages/engine/src/combat/` (Camada 1, F04 já implementada) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duel/action.ts` | shared | alterado (arquivo criado por F06) | Acrescenta `DeclareAttackAction`, `ResolveAttackAction` à união `Action` |
| `packages/shared/src/duel/action.schema.ts` | shared | alterado (arquivo criado por F06) | Acrescenta os schemas das duas novas variantes à união `ActionSchema` |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os dois tipos/schemas novos |
| `packages/engine/src/combat/declare-attack.ts` | engine | novo | `declareAttack(state, action)` — valida as 4+2 recusas, emite `onAttackDeclared`, abre janela |
| `packages/engine/src/combat/resolve-combat-table.ts` | engine | novo | `resolveCombatTable(input)` — função pura da tabela de combate (Decisão 10), sem `DuelState` |
| `packages/engine/src/combat/resolve-attack.ts` | engine | novo | `resolveAttack(state)` — fecha a janela, revela face-baixo, chama `calculateEffectiveAtkDef` + `resolveCombatTable`, aplica dano/destruição, emite `onFlip?`/`onDamage`/`onDestroy` |
| `packages/engine/src/combat/neutral-combat-providers.ts` | engine | novo | Bundle local de provedores neutros `{atk:0,def:0}` (Decisão 6) — **duplicação intencional** de `packages/rules/src/combat/neutral-modifier-providers.ts`, documentada |
| `packages/engine/src/combat/index.ts` | engine | alterado (arquivo criado por F04) | Reexporta `declareAttack`, `resolveAttack`, `resolveCombatTable` ao lado de `calculateEffectiveAtkDef` |
| `packages/engine/src/turn/apply.ts` | engine | alterado (arquivo criado por F06) | Acrescenta os `case`s `"declare_attack"` e `"resolve_attack"` ao switch exaustivo |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta as novas funções de `combat` (já reexporta o subsistema desde F04) |
| `packages/engine/README.md` | engine | alterado | Atualiza a descrição do subsistema `combat` para incluir a resolução de ataque |
| `packages/engine/src/combat/resolve-combat-table.test.ts` | engine | novo | Unitários: todos os ramos da tabela, exaustivos |
| `packages/engine/src/combat/declare-attack.test.ts` | engine | novo | Unitários: sucesso (com/sem alvo) e as 6 recusas |
| `packages/engine/src/combat/resolve-attack.test.ts` | engine | novo | Unitários: revelação, aplicação de dano/destruição por ramo, eventos, flag `hasAttacked` |
| `packages/engine/src/combat/resolve-combat-table.properties.test.ts` | engine | novo | Propriedade: simetria/determinismo da tabela para ATK/DEF gerados aleatoriamente |
| `packages/engine/src/turn/apply.test.ts` | engine | alterado (arquivo criado por F06) | Novos casos: roteamento de `declare_attack`/`resolve_attack`, recusa por `no_pending_attack_to_resolve` |

**Verificação da direção de dependências:** `packages/engine/src/combat/**` importa apenas de
`packages/shared` (`DuelState`, `Action`, `Card`, `PlayerId`, `ZoneIndex`, `Result`, `DomainError`,
`ApplyResult`, `EffectiveAtkDef`) e de subsistemas internos de `packages/engine` já existentes
(`events`: `createEvent`, `openReactionWindow`, `closeReactionWindow`, `hasOpenReactionWindow`;
`turn`: `isFirstDuelTurn`; `spells`: `getOpponent`, Decisão 7). **Nenhum import de `packages/rules`**
(Decisão 6) — nem `data`, `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase. Mesma garantia já
verificada para os demais subsistemas de `packages/engine`.

## 3. Design Técnico

### Estruturas de dados

Nenhuma estrutura nova em `DuelState`/`PlayerState`/`MonsterZone` — esta feature só lê/escreve
campos já existentes (`hasAttacked`, `position`, `lp`, o próprio `pending`).

**`DeclareAttackAction`** e **`ResolveAttackAction`** (`packages/shared`):

```ts
export type DeclareAttackAction = Readonly<{
  type: "declare_attack";
  attackerZoneIndex: ZoneIndex;
  targetZoneIndex?: ZoneIndex; // ausente = ataque direto
}>;

export type ResolveAttackAction = Readonly<{ type: "resolve_attack" }>;
```

**`ResolveCombatTableInput`/`ResolveCombatTableResult`** (`packages/engine`, internos ao
subsystem — não exportados em `packages/shared`, pois não atravessam a fronteira de rede):

```ts
type ResolveCombatTableInput = Readonly<{
  attackerEffective: EffectiveAtkDef;
  defenderEffective: EffectiveAtkDef | undefined; // undefined = ataque direto
  defenderPosition: "attack" | "defense" | undefined; // undefined = ataque direto
}>;

type ResolveCombatTableResult = Readonly<{
  attackerDestroyed: boolean;
  defenderDestroyed: boolean; // sempre false em ataque direto
  damage: Readonly<{ toAttackerOwner: number; toDefenderOwner: number }>; // um dos dois é sempre 0
}>;
```

### Fluxo — `declare_attack`

Pré-condições já garantidas por `apply` (Decisão 4): fase `battle`, jogador ativo correto, sem
janela de reação aberta.

1. `isFirstDuelTurn(state)` → recusa `first_turn_attack_forbidden`.
2. Zona `attackerZoneIndex` do jogador ativo deve estar ocupada → recusa `attacker_zone_empty`.
3. Posição do atacante deve ser `attack_face_up` ou `attack_face_down` → recusa
   `attacker_not_in_attack_position`.
4. `hasAttacked` do atacante deve ser `false` → recusa `attacker_already_attacked`.
5. Se `targetZoneIndex` informado: zona do oponente naquele índice deve estar ocupada → recusa
   `target_zone_empty`.
6. Se `targetZoneIndex` **ausente**: todas as 5 zonas de monstro do oponente devem estar vazias →
   recusa `direct_attack_blocked_by_monsters`.
7. Sucesso: monta `onAttackDeclared` com `originPlayer = activePlayer`, `involvedCards` = carta do
   atacante (+ carta do alvo, se houver), `involvedZones` = `[{ player: activePlayer, zoneType:
   "monster", index: attackerZoneIndex }]` (+ zona do alvo, se houver), `context: {}`. Abre a
   janela de reação com `reactingPlayer = getOpponent(activePlayer)` (Decisão 7). Devolve `{ state:
   <estado com pending>, events: [onAttackDeclared] }` — **nenhuma mutação de LP/campo ainda**.

### Fluxo — `resolve_attack`

Pré-condição (Decisão 3): `state.pending` definido e `state.pending.event.type ===
"onAttackDeclared"` — senão recusa `no_pending_attack_to_resolve`.

1. `closeReactionWindow(state)` (F02) — remove `pending`.
2. Lê `involvedZones` do evento fechado para recuperar `attackerZoneIndex`, `activePlayer`
   (=`originPlayer`), e `targetZoneIndex`/`opponent` (se presente).
3. Se há alvo e sua posição termina em `_face_down`: revela — troca para o `_face_up`
   correspondente e monta `onFlip` (Decisão 8).
4. Calcula `attackerEffective = calculateEffectiveAtkDef(attackerCard, { activeField:
   state.activeField, opponent: defenderCard ?? null }, neutralCombatProviders)` (Decisão 6, 9).
5. Se há alvo, calcula `defenderEffective` de forma simétrica (`opponent: attackerCard`).
6. Chama `resolveCombatTable({ attackerEffective, defenderEffective, defenderPosition })` (Decisão
   10) — devolve quem é destruído e o dano de cada lado (Seção "Regras de negócio" abaixo).
7. Aplica o resultado: zonas destruídas viram `{ occupied: false }`; zona do atacante sobrevivente
   ganha `hasAttacked: true` (Decisão 12); LP de cada dono é decrementado pelo dano correspondente,
   nunca abaixo de 0 (Decisão 11).
8. Monta `onDamage` (se algum dano > 0) e `onDestroy` (um evento por monstro destruído, se houver).
9. Devolve `{ state: <estado atualizado, sem pending>, events: [onFlip?, onDamage?, onDestroy...*] }`
   na ordem: `onFlip` primeiro (se houve revelação), depois `onDamage`, depois `onDestroy` (um por
   monstro destruído — até 2, no caso de empate ATK vs ATK).

### Regras de negócio — tabela de resolução (transcrição literal do PRD F11 Capabilities)

**Ataque direto** (`defenderEffective` ausente): `damage.toDefenderOwner = attackerEffective.atk`;
nenhuma destruição.

**Atacante (ATK) vs Defensor em posição de ataque:**
- `attackerEffective.atk > defenderEffective.atk` → `defenderDestroyed = true`;
  `damage.toDefenderOwner = attackerEffective.atk - defenderEffective.atk`.
- `attackerEffective.atk < defenderEffective.atk` → `attackerDestroyed = true`;
  `damage.toAttackerOwner = defenderEffective.atk - attackerEffective.atk`.
- `attackerEffective.atk === defenderEffective.atk` → `attackerDestroyed = defenderDestroyed =
  true`; nenhum dano.

**Atacante (ATK) vs Defensor em posição de defesa:**
- `attackerEffective.atk > defenderEffective.def` → `defenderDestroyed = true`; nenhum dano.
- `attackerEffective.atk < defenderEffective.def` → nenhuma destruição;
  `damage.toAttackerOwner = defenderEffective.def - attackerEffective.atk`.
- `attackerEffective.atk === defenderEffective.def` → nenhuma destruição, nenhum dano.

### Eventos

- `onAttackDeclared` — emitido por `declareAttack`, com janela de reação (o único evento desta wave
  que efetivamente abre e depois fecha uma janela por uma feature própria).
- `onFlip` — emitido por `resolveAttack` só quando o defensor estava face-baixo (Decisão 8).
- `onDamage` — emitido quando `damage.toAttackerOwner > 0` ou `damage.toDefenderOwner > 0`.
- `onDestroy` — um evento por monstro destruído (0, 1 ou 2 — só 2 no empate ATK vs ATK).
- Todos usam `createEvent` (F02); nenhum tipo novo fora do vocabulário fechado de 10.

### Determinismo e pureza

- `resolveCombatTable` é **pura, total e sem estado**: só aritmética sobre os números recebidos,
  nunca lê `DuelState`.
- `declareAttack` e `resolveAttack` são puras e totais: nenhuma leitura de relógio, nenhum
  `Math.random()` — a única fonte de "aleatoriedade" do motor (PRNG semeado) não é tocada por
  combate.
- Mesma entrada (`state` + ação) sempre produz a mesma saída — pilar de determinismo (PRD §4).
- `atk`/`def` base da carta nunca são sobrescritos: `calculateEffectiveAtkDef` (F04) só lê, nunca
  muta a `Card`; a zona destruída perde a carta inteira (não um campo dela).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duel/action.ts (acréscimo aos arquivos de F06/F08/F09)
export type DeclareAttackAction = Readonly<{
  type: "declare_attack";
  attackerZoneIndex: ZoneIndex;
  targetZoneIndex?: ZoneIndex;
}>;

export type ResolveAttackAction = Readonly<{ type: "resolve_attack" }>;

// packages/shared/src/duel/action.schema.ts
export const DeclareAttackActionSchema = z.strictObject({
  type: z.literal("declare_attack"),
  attackerZoneIndex: ZoneIndexSchema,
  targetZoneIndex: ZoneIndexSchema.optional(),
});

export const ResolveAttackActionSchema = z.strictObject({ type: z.literal("resolve_attack") });

export const ActionSchema = z.discriminatedUnion("type", [
  AdvancePhaseActionSchema,
  SummonMonsterActionSchema,
  PlaySpellOrTrapActionSchema,
  PlayFieldSpellActionSchema,
  DeclareAttackActionSchema,
  ResolveAttackActionSchema,
]);
```

**Reusados sem redefinir:** `DuelState`, `PlayerId`, `ZoneIndex`, `Card`, `EffectiveAtkDef`,
`DuelEvent`, `ApplyResult`, `Result`, `DomainError` (F01–F06); `createEvent`, `openReactionWindow`,
`closeReactionWindow`, `hasOpenReactionWindow` (F02); `isFirstDuelTurn` (F06); `getOpponent` (F09,
Decisão 7); `calculateEffectiveAtkDef`, `CombatContext`, `ModifierProviders` (F04).

### Funções públicas

```
// packages/engine/src/combat — núcleo puro

declareAttack(state: DuelState, action: DeclareAttackAction): Result<ApplyResult, DomainError>
  // pré: apply (F06) já confirmou fase "battle", jogador ativo correto, sem janela aberta
  // pós (sucesso): pending = janela de reação sobre onAttackDeclared; nenhuma mutação de LP/campo
  // pós (erro): estado original; código em {first_turn_attack_forbidden, attacker_zone_empty,
  //             attacker_not_in_attack_position, attacker_already_attacked, target_zone_empty,
  //             direct_attack_blocked_by_monsters}
  // total: nunca lança

resolveAttack(state: DuelState): Result<ApplyResult, DomainError>
  // pré: state.pending?.event.type === "onAttackDeclared"
  // pós (sucesso): pending removido; dano/destruição aplicados conforme a tabela; hasAttacked do
  //      atacante marcado quando sobrevive; eventos onFlip?/onDamage?/onDestroy* emitidos
  // pós (erro): code 'no_pending_attack_to_resolve' quando não há janela de ataque pendente
  // total: nunca lança

resolveCombatTable(input: ResolveCombatTableInput): ResolveCombatTableResult
  // pós: decide destruição e dano dos dois lados conforme a tabela (Seção 3)
  // total, puro, sem estado
```

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01–F09. `DeclareAttackAction`/`ResolveAttackAction` fazem
parte do mesmo contrato `Action`/`apply` que o Online Duel (cross-PRD, Fase 5) vai transportar por
WebSocket.

### Contratos externos (cross-PRD)

Nenhum novo. GuardianStar/Terrain/Effect System continuam consumidos só através de
`calculateEffectiveAtkDef` (F04), sem contrato adicional desta feature.

### Exemplo — ataque direto (sucesso)

```json
{
  "declarar": {
    "action": { "type": "declare_attack", "attackerZoneIndex": 0 },
    "result": { "events": [{ "type": "onAttackDeclared", "originPlayer": "P1", "involvedZones": [{ "player": "P1", "zoneType": "monster", "index": 0 }] }] }
  },
  "resolver": {
    "action": { "type": "resolve_attack" },
    "result": {
      "events": [{ "type": "onDamage", "originPlayer": "P1", "context": { "toPlayer": "P2", "amount": 1800 } }],
      "state": { "players": { "P2": { "lp": 6200 } } }
    }
  }
}
```

### Exemplo — ATK vs DEF, atacante sobrevive e toma dano

```json
{
  "resolver": {
    "action": { "type": "resolve_attack" },
    "result": {
      "events": [
        { "type": "onDamage", "originPlayer": "P1", "context": { "toPlayer": "P1", "amount": 300 } }
      ],
      "state": { "players": { "P1": { "field": { "monsters": [{ "occupied": true, "hasAttacked": true }] } } } }
    }
  }
}
```

### Exemplo — recusa por primeiro turno do duelo

```json
{
  "ok": false,
  "error": {
    "code": "first_turn_attack_forbidden",
    "message": "Não é permitido atacar no primeiro turno.",
    "details": { "turn": 1 }
  }
}
```

## 5. Modelo de Dados

Não aplicável. F11 não cria tabela Postgres nem estrutura IndexedDB — opera inteiramente sobre
`DuelState` em memória, igual F01–F10.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Código | Mensagem (PRD, quando citada) |
|---|---|---|---|
| Ataque no 1º turno do duelo | `isFirstDuelTurn(state)` | `first_turn_attack_forbidden` | "Não é permitido atacar no primeiro turno." |
| Monstro em defesa tentando atacar | posição do atacante | `attacker_not_in_attack_position` | "Monstros em defesa não podem atacar." |
| Monstro que já atacou neste turno | `hasAttacked` do atacante | `attacker_already_attacked` | "Este monstro já atacou neste turno." |
| Ataque direto com o oponente ainda tendo monstros | zonas de monstro do oponente | `direct_attack_blocked_by_monsters` | "Existem monstros para atacar — ataque direto indisponível." |
| Zona do atacante vazia | `field.monsters[attackerZoneIndex].occupied` | `attacker_zone_empty` | Não citada no PRD — validação defensiva (Auto-Aceite, mesmo padrão de F08/F09) |
| Zona-alvo informada mas vazia | `field.monsters[targetZoneIndex].occupied` do oponente | `target_zone_empty` | Não citada no PRD — validação defensiva |
| `resolve_attack` chamado sem janela de ataque pendente | `state.pending?.event.type !== "onAttackDeclared"` | `no_pending_attack_to_resolve` | Não citada no PRD — guard estrutural (Decisão 3) |
| `Action` malformada na fronteira de rede/UI | `ActionSchema.safeParse` | erro de validação zod padrão | — |

## 7. Estratégia de Testes

### Unitários (Vitest)

`resolveCombatTable` (`combat/resolve-combat-table.test.ts`) — table-driven, cobrindo **todos** os
ramos citados em `arquitetura.md` §3.5:
- `ATK do atacante maior que ATK do defensor: defensor destruído, atacante sobrevive, dono do defensor toma a diferença`
- `ATK do atacante menor que ATK do defensor: atacante destruído, defensor sobrevive, dono do atacante toma a diferença`
- `ATK do atacante igual ao ATK do defensor: ambos destruídos, nenhum dano`
- `ATK do atacante maior que DEF do defensor: defensor destruído, nenhum dano`
- `ATK do atacante menor que DEF do defensor: nenhuma destruição, dono do atacante toma a diferença`
- `ATK do atacante igual ao DEF do defensor: nenhuma destruição, nenhum dano`
- `ataque direto: nenhuma destruição, dano igual ao ATK efetivo do atacante`

`declareAttack` (`combat/declare-attack.test.ts`):
- `declara ataque direto com sucesso quando o campo do oponente está vazio`
- `declara ataque contra um alvo específico com sucesso`
- `emite onAttackDeclared e abre janela de reação com o oponente como reactingPlayer`
- `recusa com first_turn_attack_forbidden no primeiro turno do duelo`
- `recusa com attacker_zone_empty quando a zona do atacante está vazia`
- `recusa com attacker_not_in_attack_position quando o atacante está em defesa`
- `recusa com attacker_already_attacked quando o atacante já atacou neste turno`
- `recusa com target_zone_empty quando a zona-alvo informada está vazia`
- `recusa com direct_attack_blocked_by_monsters quando há monstros no campo do oponente e nenhum alvo foi informado`
- `não altera o estado em nenhum caminho de recusa`

`resolveAttack` (`combat/resolve-attack.test.ts`):
- `revela um defensor face-baixo antes de resolver e emite onFlip`
- `não emite onFlip quando o defensor já estava face-cima`
- `aplica dano ao dono do defensor quando o atacante vence`
- `aplica dano ao dono do atacante quando o defensor vence em defesa`
- `destrói o defensor e não aplica dano quando ATK supera DEF`
- `destrói ambos os monstros sem dano no empate de ATK`
- `marca hasAttacked do atacante quando ele sobrevive`
- `remove a zona do atacante quando ele é destruído`
- `fecha a janela de reação após resolver`
- `recusa com no_pending_attack_to_resolve quando não há janela de ataque pendente`

### Property-based (fast-check)

- **Cobertura exaustiva por geração:** para ATK/DEF efetivos gerados aleatoriamente dentro de
  faixas realistas (incluindo iguais), `resolveCombatTable` sempre devolve um resultado consistente
  com exatamente um dos seis ramos descritos na Seção 3 — nunca dano negativo, nunca os dois
  destruídos fora do caso de empate ATK vs ATK. 1.000 execuções.
- **Determinismo:** para qualquer par `(state, action)` válido, `declareAttack`/`resolveAttack`
  aplicados duas vezes de forma independente produzem sempre o mesmo `ApplyResult`.

### Integração

Não aplicável ainda — uma partida completa ponta-a-ponta só é exercível quando F07, F08, F09, F10 e
F12 existirem. Esta feature testa a declaração e a resolução isoladamente, a partir de fixtures de
`DuelState` com campo e mão já populados.

### Análise estática

- `packages/engine/src/combat/**` importa apenas `packages/shared` e subsistemas internos de
  `packages/engine` (`events`, `turn`, `spells`) — **nunca `packages/rules`** (Decisão 6), nem
  `data`, `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.
- O `switch` de `apply` permanece exaustivo após as duas novas variantes.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F11) | Teste |
|---|---|
| ATK vs ATK: maior ATK vence, perdedor destruído, dono do perdedor toma a diferença; ATK igual destrói ambos sem dano | Os três casos correspondentes de `resolveCombatTable` |
| ATK vs DEF: ATK>DEF destrói o defensor sem dano; ATK<DEF mantém o atacante e causa (DEF−ATK) ao dono do atacante; ATK=DEF não faz nada | Os três casos correspondentes de `resolveCombatTable` |
| Ataque direto (campo inimigo vazio) causa dano igual ao ATK efetivo total | Caso `ataque direto` de `resolveCombatTable` + `declara ataque direto com sucesso...` |
| Defensor face-baixo é revelado (onFlip) antes da resolução e usa o valor real | `revela um defensor face-baixo antes de resolver e emite onFlip` |
| Recusa: ataque no 1º turno, monstro em defesa atacando, monstro que já atacou, e ataque direto com monstros inimigos presentes — cada um com a mensagem específica | Os quatro testes de recusa correspondentes de `declareAttack` |
| Um monstro só ataca 1x por turno | `recusa com attacker_already_attacked...` + `marca hasAttacked do atacante quando ele sobrevive` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Todos os eventos emitidos pelas ações (F06–F11) passam por F02 e abrem janela de reação quando aplicável" | `onAttackDeclared` abre janela (único caso desta wave que de fato testa o fechamento via `resolve_attack`); `onFlip`/`onDamage`/`onDestroy` não abrem janela — comportamento verificado explicitamente |
| Cross-Feature: "O mesmo estado inicial + mesma sequência de ações + mesmo seed produz o mesmo resultado final em execuções repetidas" | Propriedade `Determinismo` desta feature |
| Cross-Feature: "Nenhuma capacidade do motor depende de UI" | Análise estática de `packages/engine/src/combat/**` |
| Cross-PRD: GuardianStar/Terrain/Effect System (modificadores refletidos por F04 quando existirem) | Não testável até essas tabelas existirem — F11 já consome o ponto de extensão de F04 sem modificação adicional |
