# Mudança de Posição

> PRD: `docs/prds/motor-duelo-1x1.md` — F10
> Pacote-alvo: `packages/engine` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta feature entrega a ação de **mudar a posição de um monstro já em campo**: alternar entre
ataque e defesa e, quando o monstro estiver face-baixo, revelá-lo no processo. É uma das cinco
features de ação da **Wave 4** (`docs/prds/motor-duelo-1x1.md` §8 Parte 3), consumidora direta da
máquina de turno/fase que **F06 (Ciclo de Turno e Fases)** especifica — a união `Action` e o
dispatcher central `apply(state, action)` que F06 cria. F10 acrescenta sua própria variante a
`Action` e seu próprio `case` ao `switch` de `apply`, sem redefinir nenhum dos dois, exatamente como
F06 já previu em suas Fronteiras ("Mudança de posição, declaração/resolução de ataque → F10/F11, que
vão adicionar variantes a `Action` e ler `hasAttacked`/`hasChangedPosition`").

F10 é deliberadamente estreita: só move um monstro entre as 4 posições já modeladas por F01
(`MonsterPosition`) e marca a flag `hasChangedPosition` (também já existente desde F01). Não
inventa nenhuma posição nova, não calcula ATK/DEF efetivo (F04) e não resolve combate (F11) — é
puramente uma mudança de estado do monstro-alvo, restrita à fase de Batalha.

### Incluído

- Nova variante de `Action` (`packages/shared`) para mudar a posição de um monstro em campo (PRD
  F10 Capabilities — "mudar a posição de um monstro já no campo")
- Validação de fase: só aceita na fase de Batalha (`state.phase === "battle"`) (PRD F10 Consumes —
  "F06: turno ativo, fase de Batalha")
- Validação de propriedade: só aceita sobre uma zona de monstro do jogador ativo
- Validação de disponibilidade: recusa zona vazia e recusa 2ª troca no mesmo turno (flag
  `hasChangedPosition`, PRD F10 Capabilities — "1x por turno")
- Matriz determinística de transição entre as 4 posições, incluindo a revelação de monstros
  face-baixo (PRD F10 Capabilities — "Alterna entre ataque e defesa e/ou revela um monstro
  face-baixo")
- Emissão de `onPositionChange` (sempre) e `onFlip` (só quando revela um monstro face-baixo) (PRD
  F10 Capabilities e Provides)
- `case "change_position"` acrescentado ao dispatcher `apply` que F06 cria

### Adiado

Não aplicável — o PRD não declara blocos `Core Scope`/`Full Scope additions` para F10 (só
Consumes/Provides/Capabilities/Experience); pela regra de Auto-Aceite, esta spec cobre a íntegra da
feature descrita.

### Fronteiras

- **Resolução de combate e declaração de ataque** → **F11**. F10 não escreve `hasAttacked` — quem
  seta essa flag é F11. **Correção (2026-08-02):** F10 agora **lê** `hasAttacked` para recusar a
  mudança de posição quando `true` — ver Decisão 6, revisada.
- **Reset da flag `hasChangedPosition` ao fim do turno** → já especificado por **F06** (Fluxo passo
  3b: reseta `hasAttacked`/`hasChangedPosition` das zonas do jogador cujo turno termina). F10 só
  consome o estado inicial dessa flag (sempre `false` no início do turno de quem vai agir) e a
  marca `true`; não implementa o reset.
- **Cálculo de ATK/DEF efetivo** → **F04**, já implementada; não é consultado aqui porque mudar de
  posição não precisa comparar valores de combate.
- **Resolução de armadilhas/magias que reagem à mudança de posição** → **Effect System (cross-PRD)**;
  F10 só emite os eventos e não abre janela de reação (ver Decisão 7).
- **Primeiro turno do duelo** → irrelevante para F10. O predicado `isFirstDuelTurn` (F06) só é
  consumido por F11 para bloquear ataque; o PRD F10 é explícito ("mudança de posição é permitida;
  apenas o ataque é bloqueado no 1º turno").

### Contratos externos assumidos

Nenhum. A tabela de dependências do PRD (§8) lista `F10 | Dependências: F06, F02, F01` — as três
já internas ao próprio módulo `motor-duelo-1x1`, nenhuma cross-PRD.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A nova variante de `Action` reutiliza o tipo `ZoneReference` (`player`, `zoneType`, `index`) já criado por F02 em `packages/shared/src/duel/events.ts`, em vez de inventar uma forma nova. `ChangePositionAction = Readonly<{ type: "change_position"; zone: ZoneReference }>`. Isso identifica a zona (índice 0–4) **e** o jogador dono, permitindo validar explicitamente "monstro não pertence ao jogador ativo" como um caso de recusa de primeira classe, em vez de assumir implicitamente que toda ação pertence a `state.activePlayer` (como `advance_phase` de F06 faz, por não ter alvo). | Reuso de tipo já existente (`packages/shared/src/duel/events.ts`, F02); Auto-Aceite "decisão técnica com recomendação clara" | premissa a confirmar (nenhuma outra feature da wave consultada — ver Decisão 13) |
| 2 | `ChangePositionAction` **não carrega uma posição-alvo explícita**. A leitura literal do PRD ("Alterna entre ataque e defesa e/ou revela um monstro face-baixo") descreve uma alternância determinística a partir da posição atual, não uma escolha livre entre as 4 posições (que é exclusiva da invocação, F08 — "Escolha entre as 4 posições no momento da invocação"). O motor computa o destino; o jogador só aponta a zona. | Leitura literal de PRD F10 Capabilities vs. F08 Capabilities (contraste explícito) | confirmada |
| 3 | Matriz de transição (função total `nextPosition: MonsterPosition → MonsterPosition`), decidida por não haver dado externo pendente que a defina e por precisar ser total sobre as 4 posições já modeladas em F01: cada mudança de posição **sempre alterna a postura** (ataque↔defesa) **e sempre força a face para cima** se estava para baixo (nunca o inverso — não existe "esconder" um monstro já face-cima via mudança manual de posição, fiel à regra clássica de Yu-Gi-Oh de que um flip summon manual de um monstro em defesa face-baixo sempre vira **ataque** face-cima). Concretamente: `attack_face_up → defense_face_up`; `defense_face_up → attack_face_up`; `defense_face_down → attack_face_up` (revela); `attack_face_down → defense_face_up` (revela, caso simétrico e não-canônico, mas presente no schema desde F01). | Regra clássica de Yu-Gi-Oh (fiel ao FM, citada por analogia às "Notas de fidelidade" de F04/F11); nenhuma tabela externa pendente envolvida — decisão puramente de regras já contida no schema de F01 | confirmada (Auto-Aceite — default de boa prática, PRD omite a matriz exata) |
| 4 | `onFlip` só é emitido quando a posição de origem é face-baixo (`isFaceDown(position)` antes da transição); `onPositionChange` é **sempre** emitido, independentemente de revelar ou não. Quando ambos disparam, a ordem é `onFlip` primeiro, `onPositionChange` depois — o monstro é revelado e só então a mudança de postura é registrada, mesma ordem causal usada por F11 ("Um monstro face-baixo do defensor é revelado antes da resolução"). | PRD F10 Capabilities ("emite onFlip quando um monstro face-baixo é virado para cima") + PRD F11 Capabilities (precedente de ordem revelar-antes-de-resolver) | confirmada |
| 5 | Guard de fase: `state.phase !== "battle"` recusa com `DomainError` (`wrong_phase`) antes de qualquer outra validação. Único guard de fase explícito no PRD F10 ("Consumes: F06: turno ativo, fase de Batalha"). | PRD F10 Consumes (leitura literal) | confirmada |
| 6 | ~~`hasAttacked` nunca é lido nem alterado por esta feature... um monstro que já atacou neste turno ainda pode mudar de posição~~ — **revisada (2026-08-02):** `changePosition` agora **recusa** com `already_attacked` quando `monsterZone.hasAttacked === true`, checado antes de `hasChangedPosition` (mas depois de `zone_empty`). A decisão original leu literalmente o silêncio do PRD como "permitido"; correção pedida diretamente pelo usuário por não corresponder à regra clássica de Yu-Gi-Oh (um monstro que atacou já se comprometeu com a posição de ataque até o fim do turno) nem ao comportamento do FM original. `hasAttacked` continua sendo escrito só por F11 — F10 passa a **ler**, nunca escrever. Um monstro ainda **não** atacado pode mudar de posição e **depois** atacar no mesmo turno (F11 não é afetado por esta correção). | Correção pontual solicitada pelo usuário (trilha curta — `AGENTS.md` "Small fixes and adjustments"), não uma reabertura de PRD | corrigida (substitui a decisão original) |
| 7 | Nem `onFlip` nem `onPositionChange` abrem janela de reação — o único evento do motor com janela documentada até agora é `onAttackDeclared` (F11), citado como exemplo único em F02 Capabilities. Mesmo precedente já registrado por F06 Decisão 12 para `onTurnStart`/`onTurnEnd`: o Effect System (cross-PRD) pode reagir a `onFlip`/`onPositionChange` fora de uma janela suspensiva, se algum dia precisar. | `docs/prds/motor-duelo-1x1.md` §6 F02 Capabilities (único exemplo de janela é `onAttackDeclared`); `docs/specs/motor-duelo-1x1/F06-.../spec.md` Decisão 12 (precedente direto) | confirmada (precedente, não reaberta) |
| 8 | O guard de janela de reação aberta (`hasOpenReactionWindow`) é consultado **dentro da própria função `changePosition`**, não centralizado no dispatcher `apply`. Seguindo o padrão que F06 já aplicou para `advancePhase` (o guard vive dentro da função que trata a ação, não como um pré-check genérico do `switch`) e o comentário já presente em `packages/engine/src/events/reaction-window.ts` ("Guard that F06-F12 must consult before accepting a new player action") — a obrigação é de cada feature de ação, não do dispatcher. | `packages/engine/src/events/reaction-window.ts` (comentário existente); `docs/specs/motor-duelo-1x1/F06-.../spec.md` Fluxo passo 1 (precedente de implementação) | confirmada |
| 9 | Validação defensiva extra, além dos casos citados textualmente no PRD: `zone.zoneType !== "monster"` recusa com `zone_not_monster`. Necessária porque `ZoneReference` (reutilizado pela Decisão 1) também permite `zoneType: "spell"`, e mudar posição só faz sentido para monstros — sem essa checagem, um `zone` apontando para uma zona de magia/armadilha cairia num acesso inválido ao array errado. | Consequência direta da Decisão 1 (reuso de `ZoneReference`); Auto-Aceite "especificação parcial no PRD" (o PRD não previu a reutilização de um tipo genérico, então esta spec preenche a lacuna) | confirmada |
| 10 | Novo subsistema `packages/engine/src/position/` (substantivo em inglês, singular, kebab-case dentro), no mesmo padrão de nomenclatura de `combat/`, `events/`, `initialization/`, `serialization/`, `turn/` (F06). Não reaproveita `turn/` porque a lógica de transição de posição não pertence à máquina de turno/fase — só o `case` no `switch` de `apply` (dentro de `turn/apply.ts`, criado por F06) importa o novo subsistema. | Padrão observado em `packages/engine/src/*` (Camada 1); `docs/specs/motor-duelo-1x1/F06-.../spec.md` Decisão 11 (precedente de nomenclatura) | confirmada |
| 11 | `apply(state, action): Result<ApplyResult, DomainError>` — mesma assinatura que F06 já fixou (Nota de tipo de retorno de F06: "isso já antecipa a forma que F07–F12 vão usar para suas próprias recusas"). F10 não altera a assinatura de `apply`, só acrescenta um `case` ao `switch` existente. | `docs/specs/motor-duelo-1x1/F06-.../spec.md` (Nota de tipo de retorno, contratos) | confirmada (precedente, não reaberta) |
| 12 | **F06 tem spec mas ainda não está implementada** (`packages/engine/src/turn/` não existe no código hoje). Esta spec assume, como pré-requisito de implementação, que F06 (união `Action`, `apply`, `advancePhase`, `hasUsedHandPlay`/`markHandPlayUsed`, `isFirstDuelTurn`) já existe conforme sua própria spec, sem redefinir nenhum desses contratos — registrado também no `plan.md` (Pré-requisitos). | Instrução do lote (Auto-Aceite — "feature de fase posterior do roadmap sem a anterior implementada"); `docs/specs/motor-duelo-1x1/F06-.../spec.md` | premissa a confirmar |
| 13 | Esta feature roda em **Modo Batch** junto de F07, F08, F09 e F11 (mesma Wave 4), cada uma como sub-agente independente e paralelo. Todas as cinco acrescentam variantes ao mesmo `packages/shared/src/duel/action.ts`/`action.schema.ts` e um `case` ao mesmo `packages/engine/src/turn/apply.ts` — a reconciliação de merge entre as cinco variantes (ordem final da união discriminada, ordem dos `case`s) é responsabilidade da fase de **implementação**, não desta spec, que descreve apenas a contribuição isolada de F10. | Regras do Modo Batch ("nada é compartilhado" entre sub-agentes); natureza do lote (5 features, mesmo arquivo-alvo) | premissa a confirmar |
| 14 | Identificadores de código em **inglês** (`ChangePositionAction`, `changePosition`, `nextPosition`, `isFaceDown`), prosa da spec em português — mesmo padrão que F06 já corrigiu em relação a specs mais antigas. | `CLAUDE.md` ("Code, comments and identifiers are in English"); `docs/specs/motor-duelo-1x1/F06-.../spec.md` Decisão 8 (precedente) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duel/action.ts` | shared | alterado (arquivo criado por F06) | Acrescenta `ChangePositionAction` e estende a união `Action` (Decisões 1, 2) |
| `packages/shared/src/duel/action.schema.ts` | shared | alterado (arquivo criado por F06) | Acrescenta `ChangePositionActionSchema`; contribui a variante para `ActionSchema` (Decisão 13 — merge final é da implementação) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta `ChangePositionAction` ao lado de `Action`/`ActionSchema` (já reexportados por F06) |
| `packages/engine/src/position/next-position.ts` | engine | novo | `nextPosition(position)`, `isFaceDown(position)` — matriz de transição pura (Decisão 3) |
| `packages/engine/src/position/change-position.ts` | engine | novo | `changePosition(state, zone): Result<ApplyResult, DomainError>` — validações + transição + eventos |
| `packages/engine/src/position/index.ts` | engine | novo | Export público do subsistema `position` |
| `packages/engine/src/turn/apply.ts` | engine | alterado (arquivo criado por F06) | Acrescenta `case "change_position"` delegando a `changePosition` (Decisão 13) |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta `changePosition`, `nextPosition`, `isFaceDown` |
| `packages/engine/README.md` | engine | alterado | Acrescenta o subsistema `position` à lista de exports públicos |
| `packages/engine/src/position/next-position.test.ts` | engine | novo | Unitários: as 4 transições e `isFaceDown` |
| `packages/engine/src/position/change-position.test.ts` | engine | novo | Unitários: casos de sucesso, eventos, todos os casos de recusa |
| `packages/engine/src/position/change-position.properties.test.ts` | engine | novo | Propriedade: preservação estrutural do estado e não-dupla-aplicação |

**Verificação da direção de dependências:** `packages/engine/src/position/**` importa apenas de
`packages/shared` (`DuelState`, `MonsterPosition`, `MonsterZone`, `PlayerId`, `ZoneReference`,
`ApplyResult`, `DuelEvent`, `Result`, `DomainError`) e de `packages/engine/src/events` (`createEvent`,
`hasOpenReactionWindow`), ambos já internos ao próprio pacote `engine` — mesma garantia que
`combat`, `events`, `initialization`, `serialization` e `turn` (F06) já verificam. Nenhum import de
`data`, `rules`, `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase.

## 3. Design Técnico

### Estruturas de dados

Nenhuma estrutura nova em `DuelState`/`PlayerState`/`MonsterZone` — F10 só lê e escreve os campos já
existentes desde F01 (`position`, `hasChangedPosition`) e reutiliza `ZoneReference` (F02) como forma
do alvo da ação.

**`Action`** (`packages/shared`, arquivo alterado):

```ts
export type ChangePositionAction = Readonly<{ type: "change_position"; zone: ZoneReference }>;
export type Action = AdvancePhaseAction | ChangePositionAction; // F07-F09, F11-F12 continuam estendendo
```

### Matriz de transição (`nextPosition`)

| Posição atual | Próxima posição | Revela (`onFlip`)? |
|---|---|---|
| `attack_face_up` | `defense_face_up` | Não |
| `defense_face_up` | `attack_face_up` | Não |
| `defense_face_down` | `attack_face_up` | Sim |
| `attack_face_down` | `defense_face_up` | Sim |

Regra geral (Decisão 3): a postura (ataque/defesa) sempre alterna; a face sempre vira para cima se
estava para baixo, e nunca vira para baixo se já estava para cima. `nextPosition` é uma função pura,
total e determinística sobre as 4 posições de `MonsterPosition` (F01) — não há entrada inválida
possível dentro do tipo.

### Fluxo — `change_position`

1. `changePosition(state, zone)` primeiro consulta `hasOpenReactionWindow(state)` (Decisão 8). Se
   `true`, devolve erro `reaction_window_open` sem tocar o estado.
2. Recusa se `state.phase !== "battle"` (Decisão 5) → `wrong_phase`.
3. Recusa se `zone.zoneType !== "monster"` (Decisão 9) → `zone_not_monster`.
4. Recusa se `zone.player !== state.activePlayer` (Decisão 1) → `zone_not_owned_by_active_player`.
5. Lê `const monsterZone = state.players[zone.player].field.monsters[zone.index]`. Recusa se
   `monsterZone.occupied === false` → `zone_empty`.
6. Recusa se `monsterZone.hasAttacked === true` → `already_attacked` (Decisão 6, revisada).
7. Recusa se `monsterZone.hasChangedPosition === true` → `already_changed_position`.
8. Calcula `const revealed = isFaceDown(monsterZone.position)` e
   `const newPosition = nextPosition(monsterZone.position)`.
9. Constrói o novo estado: a zona apontada por `zone` passa a ter
   `{ ...monsterZone, position: newPosition, hasChangedPosition: true }`; `card` e `hasAttacked`
   permanecem inalterados (não são escritos — só lidos no passo 6); nenhuma outra zona, jogador ou
   campo global é tocado.
10. Monta a lista de eventos: se `revealed`, primeiro `onFlip`, depois sempre `onPositionChange`
    (Decisão 4) — ambos com `originPlayer = zone.player`, `involvedCards = [monsterZone.card]`,
    `involvedZones = [zone]`.
11. Devolve `ok({ state: <novo estado>, events })`.

### Regras de negócio

- **1x por turno** (PRD F10 Capabilities; critério de aceite 1): `hasChangedPosition` bloqueia a 2ª
  troca; o reset para `false` no início do turno é responsabilidade de F06, não desta feature.
- **Não consome a jogada da mão** (PRD F06 Capabilities, citado por F10 Consumes indiretamente):
  `changePosition` nunca lê nem escreve `handPlayUsed`/`hasUsedHandPlay`/`markHandPlayUsed`.
- **Restrito à fase de Batalha** (PRD F10 Consumes): único guard de fase, sem exceção para outras
  fases.
- **Exige "ainda não atacou"** (Decisão 6, revisada): `hasAttacked === true` recusa com
  `already_attacked`, checado antes de `hasChangedPosition`.

### Eventos

- `onFlip` e `onPositionChange` (ambos já no vocabulário fechado `EVENT_TYPES` de F02) são os únicos
  eventos emitidos por esta feature — `onFlip` condicional (Decisão 4), `onPositionChange` sempre.
- Nenhuma janela de reação é aberta por esta feature (Decisão 7).

### Determinismo e pureza

- `nextPosition`, `isFaceDown` e `changePosition` são **puros e totais**: nenhuma leitura de
  relógio, nenhum `Math.random()`, nenhuma exceção — toda recusa é um `Result` de erro.
- A transição depende só de `state` e `zone`; a mesma entrada sempre produz a mesma saída.
- O `atk`/`def` base da carta nunca é tocado — só `position` e `hasChangedPosition` mudam na zona
  afetada, coerente com o invariante de F01 ("Modificadores... não alteram o atk/def base").

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
// packages/shared/src/duel/action.ts (alterado)
export type ChangePositionAction = Readonly<{ type: "change_position"; zone: ZoneReference }>;
export type Action = AdvancePhaseAction | ChangePositionAction;

// packages/shared/src/duel/action.schema.ts (alterado)
export const ChangePositionActionSchema = z.strictObject({
  type: z.literal("change_position"),
  zone: ZoneReferenceSchema,
});
// ActionSchema passa a ser um z.discriminatedUnion("type", [...]) somando as variantes
// já existentes (advance_phase, F06) com esta (change_position); a lista final de
// variantes depende de quais outras features da Wave 4 já foram implementadas (Decisão 13).
```

**Reusados sem redefinir:** `DuelState`, `Phase`, `PlayerId`, `MonsterZone`, `MonsterPosition`,
`ZoneReference`, `DuelEvent`, `ApplyResult`, `Result`, `DomainError` (F01–F05);
`AdvancePhaseAction`, `apply` (F06); `createEvent`, `hasOpenReactionWindow` (F02).

### Funções públicas

```
// packages/engine/src/position — núcleo puro

nextPosition(position: MonsterPosition): MonsterPosition
  // pós: matriz de transição da Seção 3 (total sobre as 4 posições)

isFaceDown(position: MonsterPosition): boolean
  // pós: true sse position é "attack_face_down" ou "defense_face_down"

changePosition(state: DuelState, zone: ZoneReference): Result<ApplyResult, DomainError>
  // pré: nenhuma (zone já validado por ZoneReferenceSchema na fronteira externa, se vier de fora)
  // pós: ok ⇒ { state, events } com a posição da zona atualizada e hasChangedPosition = true
  //      erro ⇒ code em {reaction_window_open, wrong_phase, zone_not_monster,
  //              zone_not_owned_by_active_player, zone_empty, already_attacked,
  //              already_changed_position}
  // total: nunca lança
```

**`apply` (alterado, `packages/engine/src/turn/apply.ts`, criado por F06):**

```
case "change_position":
  return changePosition(state, action.zone);
```

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01–F06. `ChangePositionAction` é parte do contrato
`Action`/`apply` que o Online Duel (cross-PRD, Fase 5) vai transportar por WebSocket, mas o
transporte em si não existe ainda.

### Contratos externos (cross-PRD)

Nenhum novo. `ChangePositionAction` é consumida internamente pelo próprio motor (`apply`), não por
um PRD externo ainda existente.

### Exemplo — mudança de posição sem revelar (ataque → defesa)

```json
{
  "estadoAntes": {
    "phase": "battle",
    "activePlayer": "P1",
    "zonaAlvo": { "occupied": true, "position": "attack_face_up", "hasChangedPosition": false }
  },
  "acao": { "type": "change_position", "zone": { "player": "P1", "zoneType": "monster", "index": 2 } },
  "resultado": {
    "state": { "zonaAlvo": { "position": "defense_face_up", "hasChangedPosition": true } },
    "events": [
      { "type": "onPositionChange", "originPlayer": "P1", "involvedZones": [{ "player": "P1", "zoneType": "monster", "index": 2 }], "context": {} }
    ]
  }
}
```

### Exemplo — mudança de posição revelando um monstro face-baixo

```json
{
  "estadoAntes": {
    "phase": "battle",
    "activePlayer": "P1",
    "zonaAlvo": { "occupied": true, "position": "defense_face_down", "hasChangedPosition": false }
  },
  "acao": { "type": "change_position", "zone": { "player": "P1", "zoneType": "monster", "index": 0 } },
  "resultado": {
    "state": { "zonaAlvo": { "position": "attack_face_up", "hasChangedPosition": true } },
    "events": [
      { "type": "onFlip", "originPlayer": "P1", "involvedZones": [{ "player": "P1", "zoneType": "monster", "index": 0 }], "context": {} },
      { "type": "onPositionChange", "originPlayer": "P1", "involvedZones": [{ "player": "P1", "zoneType": "monster", "index": 0 }], "context": {} }
    ]
  }
}
```

### Exemplo — recusa por segunda troca no mesmo turno

```json
{
  "ok": false,
  "error": {
    "code": "already_changed_position",
    "message": "Este monstro já mudou de posição neste turno.",
    "details": { "zone": { "player": "P1", "zoneType": "monster", "index": 2 } }
  }
}
```

### Exemplo — recusa fora da fase de Batalha

```json
{
  "ok": false,
  "error": {
    "code": "wrong_phase",
    "message": "Mudança de posição só é permitida na fase de Batalha.",
    "details": { "phase": "main" }
  }
}
```

## 5. Modelo de Dados

Não aplicável. F10 não cria tabela Postgres nem estrutura IndexedDB — opera inteiramente sobre
`DuelState` em memória, igual F01–F06.

## 6. Tratamento de Erros e Casos de Borda

F10 não tem bloco `Error Handling` próprio no PRD; os casos abaixo foram inferidos das Capabilities
e do Consumes da feature (Auto-Aceite — "PRD sem bloco explícito de Error Handling").

| Cenário | Detecção | Comportamento | Código |
|---|---|---|---|
| `change_position` chamado com `state.pending` definido | `hasOpenReactionWindow(state)` | `Result` de erro, estado inalterado | `reaction_window_open` |
| `change_position` chamado fora da fase de Batalha | `state.phase !== "battle"` | `Result` de erro, estado inalterado | `wrong_phase` |
| `zone.zoneType` aponta para zona de magia/armadilha | `zone.zoneType !== "monster"` | `Result` de erro, estado inalterado | `zone_not_monster` |
| `zone.player` é o jogador **inativo** | `zone.player !== state.activePlayer` | `Result` de erro, estado inalterado | `zone_not_owned_by_active_player` |
| Zona de monstro apontada está vazia | `monsterZone.occupied === false` | `Result` de erro, estado inalterado | `zone_empty` |
| Monstro já mudou de posição neste turno | `monsterZone.hasChangedPosition === true` | `Result` de erro, estado inalterado | `already_changed_position` |
| Monstro já atacou neste turno | `monsterZone.hasAttacked === true` | `Result` de erro, estado inalterado | `already_attacked` (Decisão 6, revisada) |
| `Action` recebida de fora (rede/UI) não corresponde a nenhuma variante conhecida | `ActionSchema.safeParse` na fronteira (fora do `engine`) | Rejeição de schema antes de chegar a `apply` — mesmo padrão já descrito por F06 | erro de validação zod padrão |
| Índice de zona fora de `0..4` | Impossível pelo tipo `ZoneIndex` (`0\|1\|2\|3\|4`) e por `ZoneIndexSchema` na fronteira | Rejeitado na fronteira, nunca chega a `changePosition` | erro de validação zod padrão |

## 7. Estratégia de Testes

### Unitários (Vitest)

`next-position` (`position/next-position.test.ts`):
- `nextPosition transforma attack_face_up em defense_face_up`
- `nextPosition transforma defense_face_up em attack_face_up`
- `nextPosition transforma defense_face_down em attack_face_up`
- `nextPosition transforma attack_face_down em defense_face_up`
- `isFaceDown devolve true para defense_face_down e attack_face_down`
- `isFaceDown devolve false para defense_face_up e attack_face_up`

`change-position` (`position/change-position.test.ts`):
- `changePosition muda um monstro de attack_face_up para defense_face_up sem emitir onFlip`
- `changePosition muda um monstro de defense_face_up para attack_face_up sem emitir onFlip`
- `changePosition revela um monstro em defense_face_down, movendo-o para attack_face_up e emitindo onFlip seguido de onPositionChange`
- `changePosition revela um monstro em attack_face_down, movendo-o para defense_face_up e emitindo onFlip seguido de onPositionChange`
- `changePosition marca hasChangedPosition como true na zona alterada`
- `changePosition não altera hasAttacked da zona alterada`
- `changePosition não altera handPlayUsed de nenhum dos jogadores`
- `changePosition não altera as demais zonas de monstro do jogador ativo`
- `changePosition não altera nenhuma zona do jogador oponente`
- `changePosition recusa com already_attacked quando o monstro já atacou neste turno, sem alterar o estado` (Decisão 6, revisada)
- `changePosition recusa com already_changed_position quando a zona já mudou de posição neste turno, sem alterar o estado`
- `changePosition recusa com zone_empty quando a zona apontada está vazia, sem alterar o estado`
- `changePosition recusa com wrong_phase nas fases draw, main e end, sem alterar o estado`
- `changePosition recusa com zone_not_owned_by_active_player quando zone.player é o jogador inativo, sem alterar o estado`
- `changePosition recusa com zone_not_monster quando zone.zoneType é spell, sem alterar o estado`
- `changePosition recusa com reaction_window_open quando state.pending está definido, sem alterar o estado`

`apply` (`turn/apply.test.ts`, arquivo alterado por F06 — testes acrescentados):
- `apply roteia change_position para changePosition e devolve o resultado de sucesso inalterado`
- `apply devolve o erro de changePosition sem processamento adicional quando a mudança de posição é recusada`

### Property-based (fast-check)

- **Preservação estrutural:** para qualquer `DuelState` válido em fase `"battle"` sem `pending` e
  qualquer zona de monstro ocupada do jogador ativo com `hasChangedPosition: false`,
  `changePosition` altera exclusivamente `position` e `hasChangedPosition` daquela zona — `lp`,
  `hand`, `deck`, as demais zonas de monstro e de magia/armadilha, `activeField`, `activePlayer`,
  `turn`, `phase`, `seed` e `handPlayUsed` de ambos os jogadores permanecem estruturalmente
  idênticos. 1.000 execuções.
- **Convergência para face-cima:** para qualquer uma das 4 posições possíveis, `nextPosition`
  devolve sempre uma posição face-cima (`attack_face_up` ou `defense_face_up`) — nunca uma posição
  face-baixo é reintroduzida por uma única mudança de posição.
- **Recusa determinística da 2ª troca:** para qualquer estado onde `changePosition` teve sucesso
  sobre uma zona, aplicar `changePosition` novamente sobre a mesma zona no mesmo estado resultante
  sempre falha com `already_changed_position`, nunca aplica uma segunda transição.

### Integração

Não aplicável isoladamente — a costura completa "F06 conduz o turno até a fase de Batalha → F10
muda a posição de um monstro" só é exercível quando F06 estiver implementada (Decisão 12). Esta
feature testa `changePosition` isoladamente sobre estados de teste construídos diretamente já na
fase `"battle"`, mesma estratégia que F06 usou para testar `advancePhase` a partir do estado que
`initDuel` (F03) produz.

### Análise estática

- `packages/engine/src/position/**` importa apenas `packages/shared` e
  `packages/engine/src/events` — nunca `data`, `rules`, `ai`, `web`, `server`, React, DOM, `fetch`
  ou Supabase.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.
- O `switch` de `apply` (`turn/apply.ts`) continua exaustivo (`never` no `default`) depois de
  acrescentado o `case "change_position"` — trava de segurança já estabelecida por F06.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F10) | Teste |
|---|---|
| Cada monstro muda de posição no máximo 1x por turno; a 2ª troca é recusada | `changePosition recusa com already_changed_position...` |
| Virar um monstro face-baixo para cima emite onFlip | Os dois testes `changePosition revela um monstro em ..., emitindo onFlip seguido de onPositionChange` |
| Mudança de posição não consome a jogada da mão do turno | `changePosition não altera handPlayUsed de nenhum dos jogadores` + propriedade de preservação estrutural |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "Todos os eventos emitidos pelas ações (F06–F11) passam por F02 e abrem janela de reação quando aplicável" | `onFlip`/`onPositionChange` usam `createEvent` (F02) e deliberadamente **não** abrem janela (Decisão 7, documentada) — asserção implícita nos testes de sucesso de `change-position.test.ts` (`state.pending` continua `undefined` após sucesso) |
| Cross-Feature: "O mesmo estado inicial + mesma sequência de ações + mesmo seed produz o mesmo resultado final em execuções repetidas" | Propriedade `Recusa determinística da 2ª troca` e a natureza pura/total de `changePosition` (Seção 3) |
| Cross-Feature: "Nenhuma capacidade do motor depende de UI" | Verificação de análise estática (imports de `position/**`) |
| Cross-PRD | Nenhum critério de Cross-PRD Integration do PRD (§9) cita F10 diretamente — `ChangePositionAction`/`changePosition` não têm consumidor cross-PRD declarado nesta feature |
