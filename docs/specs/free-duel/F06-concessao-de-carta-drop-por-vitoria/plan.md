# Plano de Implementação — Concessão de Carta (Drop por Vitória)

> Spec: `docs/specs/free-duel/F06-concessao-de-carta-drop-por-vitoria/spec.md`

## Pré-requisitos

- **F05 (Resultado do Duelo e Nota)** — já implementada. Fornece `ConsolidatedDuelResult` com
  `rating.reward.dropTier` no ramo de vitória (`packages/shared/src/duel/result.ts`).
- **F01 (Seleção de Oponente / Roster)** — já implementada. Fornece `Duelist.dropPool`,
  `getDropPool`, `getDuelist`, `listCardNumbersForTier` (`packages/data/src/roster/drop-pool.ts`).
- **`build-deck/F03` (Recompensa: Adicionar Carta à Coleção)** — já implementada. Fornece
  `registerCardReward` (`apps/web/src/lib/reward/register-card-reward.ts`) e a RPC
  `apply_card_reward` já migrada. F06 reusa integralmente, sem alterar assinatura ou migração.
- **Contrato externo pendente:** `DefaultCommonDropPool` é dado de balanceamento a definir (não
  existe no repositório). A implementação entrega schema, loader e validação; nenhum valor de
  carta é inventado (spec, Decisão 4/5). Enquanto o dado oficial não chega, a composição de
  produção deve tratar essa ausência como o estado descrito na spec, Seção 6 — não deve inventar
  uma lista de cartas.
- **Pendência pré-existente não resolvida por este plano:** a sobreposição entre
  `packages/data/src/roster/drop-pool.ts` (F01) e `packages/data/src/drops/**`
  (`banco-de-cartas/F08`) continua em aberto (spec, Decisão 2). Este plano implementa contra o
  contrato de F01, já em uso.

## Fase 1 — Contratos e sorteio puro (`packages/shared`, `packages/rules`)

1. **Tipos e schemas de recompensa de drop.** Criar `DropRewardSource`, `DropRewardOutcome`,
   `DefaultCommonDropPool` e `CardWeightLookup` em `packages/shared/src/duelist/drop-reward.ts`, e
   `DefaultCommonDropPoolSchema` em `packages/shared/src/duelist/drop-reward-schema.ts`. Exportar
   ambos em `packages/shared/src/index.ts`.
2. **Utilitário de seleção determinística.** Implementar `deriveDeterministicIndex` e
   `deriveWeightedSelection` em `packages/rules/src/drop-reward/deterministic-selection.ts`: sem
   `Math.random()`, sem I/O, resultado sempre dentro dos limites e sempre reproduzível para a
   mesma chave.
3. **Sorteio da carta.** Implementar `selectDropCardNumber` em
   `packages/rules/src/drop-reward/select-drop-card.ts`: filtra a faixa resolvida, cai no
   fallback comum quando vazia, erra explicitamente quando as duas fontes estão vazias, e nunca
   importa `packages/data` (filtra a faixa localmente sobre o `DropPool` recebido).
4. **Exports do subsistema.** Criar `packages/rules/src/drop-reward/index.ts` e acrescentar os
   exports em `packages/rules/src/index.ts`.
5. **Testes unitários e de propriedade** dos dois módulos acima, cobrindo determinismo,
   fechamento do conjunto de candidatas, fallback e totalidade (nunca lança), conforme a Seção 7
   da spec.

## Fase 2 — Orquestração da recompensa (`apps/web`)

6. **Função de orquestração.** Implementar `grantCardDrop` em
   `apps/web/src/lib/free-duel/grant-card-drop.ts`: consulta o cache em memória por
   `duelSessionId`, chama `selectDropCardNumber`, monta o `CardRewardEvent` e delega a
   `registerCardReward` (já implementado, sem alteração de assinatura) — nenhuma nova escrita de
   rede ou de fila é criada aqui.
7. **Testes unitários** de `grantCardDrop` com dependências falsas (`RegisterCardRewardDeps` +
   `defaultCommonDropPool`), cobrindo cache, propagação de status e ausência de chamada quando a
   seleção falha.

## Fase 3 — Exibição na tela de resultado (`apps/web`)

8. **Hook de acionamento.** Implementar `use-card-drop-reward.ts`: dispara `grantCardDrop` apenas
   quando o resultado consolidado é `status: "victory"`; expõe estados de carregamento,
   resolvido e indisponível, no mesmo formato de `use-duel-result.ts` (F05).
9. **Componente de exibição.** Implementar `CardDropReward` (`card-drop-reward.tsx`): renderiza a
   carta concedida (arte, nome, faixa) e as mensagens de estado degradado da Seção 6 da spec
   (offline, já aplicada, pendente de configuração).
10. **Composição no resultado.** Alterar `duel-result.tsx` para renderizar `CardDropReward` dentro
    do ramo de vitória, e `duel-screen.tsx` para reter o `DuelScreenContext` carregado em estado e
    repassar `context.duelist.dropPool` ao componente de resultado.
11. **Testes** do hook, do componente e da alteração em `duel-result.tsx`/`duel-screen.tsx`
    (unitários com `@vitest-environment jsdom`).

## Fase 4 — Integração e verificação cross-feature

12. **Teste de integração ponta a ponta.** Criar
    `apps/web/tests/free-duel-card-drop.integration.test.tsx` cobrindo o fluxo de vitória
    completo, os fluxos de derrota/empate sem disparo de F06, o fallback de pool vazio e a
    não-duplicação ao reabrir a tela de resultado da mesma sessão.
13. **Verificação de fronteiras.** Confirmar por análise estática que
    `packages/rules/src/drop-reward/**` não importa `packages/data`, `packages/engine`,
    `packages/ai`, React, DOM, `fetch`, `node:*` nem Supabase, e que nenhum arquivo desta feature
    usa `Math.random()`.
14. **Checagem dos critérios de aceite.** Percorrer a tabela de testes de aceitação da Seção 7 da
    spec e confirmar cada critério do PRD (F06, Cross-Feature Integration, Cross-PRD Integration)
    contra os testes efetivamente escritos.
