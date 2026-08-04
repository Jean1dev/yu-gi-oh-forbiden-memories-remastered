# Jogada de Fusão no Motor

## 1. Contexto e Escopo

Integra F01 ao reducer headless como uma transação em duas ações: iniciar consome os materiais e cria uma pendência irrevogável; concluir encaminha a carta final à rota normal. Segue `docs/arquitetura.md` §§3.1–3.3, ADR-002 e ADR-008.

### Incluído
- Ações `begin_fusion` e `complete_fusion`.
- Pendência serializável e projeção pública.
- Composição por `createApply` com resolvedor injetado.
- Reuso de invocação, zona de magia, equip, ativação e terreno.

### Adiado
- UI (F03), materiais do campo, IA e transporte online.

### Decisões e Premissas
- `apply(state, action)` é preservado com resolvedor indisponível; `createApply(deps)` compõe runtime completo.
- A pendência carrega materiais/etapas/resultados já revelados e bloqueia toda ação exceto conclusão/rendição.
- O motor verifica que existe destino legal antes de consumir, evitando estado sem saída.
- A jogada da mão é marcada no início e nunca revertida.

## 2. Alocação no Monorepo

- `packages/shared/src/duel/fusion-action.ts`, `types.ts` e schemas: ações/estado.
- `packages/engine/src/fusion/*`: início, conclusão, roteamento e validações.
- `packages/engine/src/turn/apply.ts`: factory e dispatch.
- `packages/engine/src/serialization/*` e `packages/rules/src/visibility/*`: round-trip/projeção.
- Testes unitários, property-based e integração do motor.

Nenhum import de `data`, `rules`, UI ou I/O entra no engine; ele consome apenas `FusionResolver` de `shared`.

## 3. Design Técnico

`begin_fusion` captura cartas antes de remover índices em ordem descendente, chama o resolver, determina o modo final por `spellPlayMode`/tipo e confirma ao menos um destino. O novo `PendingFusionPlacement` fica em `DuelState.pending` com jogador, resolução e modo.

`complete_fusion` valida jogador e placement discriminado. Helpers de colocação existentes ganham variantes internas que recebem uma carta já resolvida, sem fingir que ela continua na mão. No sucesso, removem a pendência e emitem os mesmos eventos atuais.

## 4. Contratos

- `BeginFusionAction`: `{type:"begin_fusion",player,handIndices}`.
- `CompleteFusionAction`: `{type:"complete_fusion",player,placement}`.
- `FusionPlacement`: `monster`, `spell_zone`, `equip`, `activate` ou `field`.
- `PendingFusionPlacement`: `{type:"fusion_placement",player,resolution,playMode}`.
- `createApply({resolveFusion})` retorna função compatível com `ApplyAction`.

## 5. Modelo de Dados

Somente `DuelState` JSON. Schemas de snapshot passam a aceitar a nova variante de `pending`; não há banco ou migração.

## 6. Tratamento de Erros e Casos de Borda

- Fase/jogador/jogada usada seguem os erros existentes.
- Índices repetidos, ausentes ou fora de 2–5 → `invalid_fusion_materials`.
- Resolver neutro → `fusion_system_unavailable`.
- Sem destino → `no_legal_fusion_destination` antes de mutar.
- Outra ação durante pendência → `fusion_placement_pending`.
- Placement incompatível mantém a pendência e retorna erro específico.

## 7. Estratégia de Testes

- Início consome índices corretos, uma jogada e produz pendência determinística.
- Todas as recusas deixam o estado idêntico.
- Conclusão cobre cinco modos e eventos existentes.
- Round-trip e projeção pública preservam a pendência.
- Property-based cobre índices, serialização e determinismo.

