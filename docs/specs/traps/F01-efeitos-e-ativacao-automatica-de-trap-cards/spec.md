# Efeitos e Ativação Automática de Trap Cards

> PRD: `docs/prds/traps.md` — F01
> Pacotes-alvo: `packages/shared`, `packages/engine`, `packages/ai`, `apps/web`

## 1. Contexto e Escopo

Esta feature torna funcionais as dez armadilhas do dataset (681–690). Ela estende o precedente de
`docs/spells/`: vocabulário e tabela estática ficam em `shared`, enquanto a resolução pura fica no
`engine`. A UI e a IA consultam a mesma tabela sem importar o motor.

### Incluído
- Tabela validada dos dez efeitos e lookup seguro.
- Ativação automática em ataque, dano direto de magia, cura e equipamento.
- Equipamentos reversíveis, piso zero de ATK/DEF, eventos, pontuação, cues e seleção pela CPU.
- Documentação normativa em `docs/traps/` e correções correlatas em `docs/spells/`.

### Adiado
- Nada: o PRD define uma única feature sem divisão Core/Full.

### Fronteiras
- Não há chains, ativação manual, cemitério nem efeitos do TCG moderno.
- Fake Trap é a isca inerte do FM; não redireciona destruição.
- Guardian Stars e terreno continuam neutros enquanto suas tabelas estiverem pendentes.

### Contratos externos assumidos
- Nenhum contrato inexistente. Motor F02/F04/F09/F11 e Rating F01 já estão implementados.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|---|---|---|
| 1 | Todas as traps entram viradas para baixo e ativam automaticamente | entrevista + `product.md` | confirmada |
| 2 | Só a primeira trap compatível, por zona 0→4, dispara | entrevista | confirmada |
| 3 | Limites de ataque usam ATK efetivo no instante da resolução | entrevista | confirmada |
| 4 | Modificadores negativos têm piso zero no resultado efetivo | entrevista | confirmada |
| 5 | A trap ativada é revelada e consumida; não existe cemitério | estado atual do motor | confirmada |
| 6 | O vocabulário/tabela vive em `shared` e o interpretador em `engine` | `docs/spells/README.md` ADR-S1/S2 | confirmada |
| 7 | Nenhuma ação/evento novo; `onFlip` identifica ativação por contexto | `docs/arquitetura.md` §3.3 + precedente spells | confirmada |
| 8 | Equipamento anexado ganha polaridade explícita, sem mutar a carta base | `docs/arquitetura.md` §3.1 + ADR-002 | confirmada |
| 9 | A IA preserva a prioridade summon→spell; trap é escolhida quando summon não vence | estratégia `fm-basic` atual | confirmada |

## 2. Alocação no Monorepo

| Arquivo/área | Pacote | Novo/Alterado | Responsabilidade |
|---|---|---|---|
| `docs/traps/**` | docs | novo | catálogo normativo e regras transversais |
| `packages/shared/src/duel/trap-effects/**` | shared | novo | tipos, schema, tabela e lookup |
| `packages/shared/src/duel/types.ts` e schema/projeções | shared | alterado | `EquipAttachment` serializável e público |
| `packages/engine/src/traps/**` | engine | novo | seleção, consumo e resolução automática |
| `packages/engine/src/combat/resolve-attack.ts` | engine | alterado | interceptação antes do combate |
| `packages/engine/src/spells/**` | engine | alterado | dano/cura/equipamento interceptáveis |
| `packages/engine/src/stats/accumulate-stats.ts` | engine | alterado | múltiplos incrementos e `triggeredTraps` |
| `packages/ai/src/strategy/fm-basic/**` | ai | alterado | seleção de traps conhecidas |
| `apps/web/src/lib/free-duel/duel-cues.ts` | web | alterado | feedback da ativação |

**Direção de dependências:** `shared ← engine ← ai` é preservada; `apps/web` consome `shared` e o
runtime existente. `engine` não importa React, DOM, fetch, Supabase, data ou rules. A alocação segue
`docs/arquitetura.md` §§2–3 e ADR-002; testes seguem ADR-008.

## 3. Design Técnico

### Estruturas de dados

`TrapEffect` é uma união discriminada com variantes `destroy_attacker`, `reflect_effect_damage`,
`invert_effect_heal`, `reverse_equip` e `decoy`. `destroy_attacker` carrega `maxAtk: number | null`,
onde `null` significa qualquer ATK. A tabela cobre exclusivamente 681–690.

`EquipAttachment` contém `card: Card` e `polarity: "normal" | "reversed"`. `MonsterZone.equips`,
`PublicMonsterZone.equips` e seus schemas usam anexos. O bônus elegível é multiplicado por +1 ou
-1; o cálculo efetivo aplica `Math.max(0, total)` somente no resultado, nunca em `Card.atk/def`.

### Fluxo

1. `play_spell_or_trap` continua baixando armadilhas face-down e abrindo a janela informativa.
2. Cada integração constrói um gatilho interno e varre as zonas do possível dono da trap de 0 a 4.
3. Somente zonas ocupadas, face-down, `tipo: armadilha`, com entrada na tabela e condição compatível
   podem ser escolhidas.
4. A escolhida sai da zona; são emitidos `onFlip` com contexto de ativação e `onDestroy` da própria
   trap com causa `trap_consumed`.
5. O efeito transformado resolve na mesma transição e nenhuma segunda trap é examinada.

No ataque, a seleção acontece dentro de `resolveAttack`, após fechar a janela pendente e antes de
revelar defensor/calcular combate. O ATK efetivo inclui os provedores atuais. Havendo trap, o
atacante é destruído e o ataque termina sem dano.

Em `activateSpell`, a jogada é publicada antes dos eventos de trap. Um `life_points` negativo que
atingiria o dono de Goblin Fan passa a atingir o conjurador; uma cura do conjurador perante Bad
Reaction vira dano nele. Em `equipCard`, Reverse Trap marca somente o novo anexo como reverso.

### Regras de negócio

- 681≤500; 682≤1000; 683≤1500; 684≤2000; 685≤3000; 686 sem limite.
- Ataque direto ou com alvo usa o mesmo gatilho.
- Efeitos próprios nunca disparam a trap do mesmo jogador.
- Reverse Trap pode ser consumida por equip incompatível; o modificador continua zero pelo filtro.
- Fake Trap não casa com nenhum gatilho.
- `triggeredTraps` é derivado do `onFlip` com contexto de ativação e atribuído ao dono da zona.
- Uma transição pode contar simultaneamente a ação do atacante/conjurador e a trap do defensor.

### Eventos

O vocabulário de dez eventos permanece fechado. A ativação emite `onFlip` com
`context: { cause: "trap_activation", effect, by }`; o consumo emite `onDestroy` com
`context: { cause: "trap_consumed", by }`. Depois vêm `onDestroy` do atacante ou `onDamage` já
existente. A ordem é determinística e o evento revela a carta mesmo após a zona ser esvaziada.

### Determinismo e pureza

Todas as funções são puras, sem I/O ou aleatoriedade. O estado permanece JSON-serializável e o
round-trip é idempotente. A varredura usa ordem fixa 0→4. Cartas e ATK/DEF base nunca são mutados.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- `TrapEffect`, `TrapEffectSchema`, `TRAP_EFFECTS`, `getTrapEffect(cardNumber)`.
- `EquipPolarity = "normal" | "reversed"`, `EquipAttachment`, `EquipAttachmentSchema`.
- `MonsterZone.equips` e `PublicMonsterZone.equips`: `readonly EquipAttachment[]`.

Exemplo de tabela:

```json
{ "681": { "type": "destroy_attacker", "maxAtk": 500 }, "686": { "type": "destroy_attacker", "maxAtk": null }, "690": { "type": "decoy" } }
```

Exemplo de anexo reverso:

```json
{ "card": { "numero": "304", "nome": "Axe of Despair" }, "polarity": "reversed" }
```

### Funções públicas

```text
getTrapEffect(cardNumber): TrapEffect | undefined
sumEquipBonuses(host, attachments): EffectiveAtkDef
```

As resoluções de trap são internas ao engine e retornam estado/eventos transformados; nenhuma ação
externa é criada.

### Endpoints / RPC / mensagens de rede

Não aplicável. O contrato transportável continua sendo `DuelState`, `PublicDuelState`, `Action` e
`DuelEvent` validados pelos schemas existentes.

### Contratos externos

Não aplicável: todas as dependências do PRD estão materializadas.

## 5. Modelo de Dados

Não há Postgres, IndexedDB ou migração. A única mudança persistível é a forma JSON de anexos em
`DuelState`. Não existe compatibilidade retroativa para snapshots efêmeros anteriores; todos os
construtores e schemas passam a produzir a nova forma.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| Trap sem entrada | lookup retorna `undefined` | permanece baixada/inert | nenhuma |
| Trap incompatível antes de uma compatível | condição falsa | varredura continua | nenhuma |
| Várias compatíveis | primeiro índice | só a primeira é consumida | nenhuma |
| Atacante já não existe | invariante pendente violada | erro de programação existente | nenhuma |
| Dano/cura zero | magnitude zero | não dispara trap | nenhuma |
| Equip incompatível com Reverse Trap | filtro de classe falha | anexo reverso contribui zero | feedback normal |
| Penalidade excede base | total negativo | ATK/DEF efetivo fica zero | nenhuma |
| Fake Trap | variante `decoy` | nunca casa | nenhuma |
| Trap destruída por magia | zona removida antes do gatilho | não ativa; evento revela a carta | feedback de destruição existente |

## 7. Estratégia de Testes

### Unitários (Vitest)
- `TRAP_EFFECTS cobre exatamente 681–690 e satisfaz o schema`.
- `resolveAttack aplica cada limite, inclusive limite+1, ataque direto e ATK equipado`.
- `resolveAttack dispara somente a primeira trap compatível e preserva as demais`.
- `Goblin Fan reflete dano ao conjurador` e `Bad Reaction converte cura em dano`.
- `Reverse Trap anexa o equipamento reverso, respeita filtros e piso zero`.
- `Fake Trap permanece inerte`.
- `accumulateStats conta a ação e triggeredTraps na mesma transição`.
- `fm-basic escolhe a primeira trap conhecida e primeira zona livre`.
- `duel-cues publica revelação e resultado da trap`.

### Property-based (fast-check)
- 1.000 estados: mesma entrada produz resultado idêntico e no máximo uma trap dispara.
- 1.000 combinações de modificadores: ATK/DEF efetivo nunca é negativo e carta base não muda.
- Round-trip de estados com anexos normais/reversos preserva igualdade estrutural.

### Integração
- Free Duel executa ataque e magia que disparam trap sem ação manual.
- CPU baixa trap e ela dispara numa partida sintética.

### Análise estática
- `engine` sem UI/IO, dependências na direção permitida, sem `Math.random`/`Date.now`.

### Testes de aceitação

| Critério do PRD | Teste |
|---|---|
| Limites 681–686 e ataques diretos | tabela de `resolve-attack.test.ts` |
| Primeira trap por índice | teste com três zonas |
| Goblin/Bad Reaction/Reverse | integrações de spells/equip |
| Piso zero | cálculo efetivo com Megamorph reverso |
| Fake Trap inerte | teste de gatilhos |
| Revelação, consumo e contador | eventos + stats |
| Ocultação pública | projeção de estado/evento |
| CPU baixa trap | `fm-basic-policy.test.ts` |
| Determinismo e round-trip | propriedades fast-check |

### Integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Ataque interceptado não chega ao combate | ausência de flip do defensor/onDamage |
| Contadores simultâneos | stats após spell/equip/attack com trap |
| Free Duel sem prompt manual | `duel-session.test.ts` |
| Engine puro e anexos usando tabela de spells | lint de fronteiras + testes de bônus |
