# Plano de Implementação — Carteira de Estrelas (free-duel F07)

> Spec: `docs/specs/free-duel/F07-carteira-de-estrelas/spec.md`

## Pré-requisitos

- **F05 (Resultado do Duelo e Nota)** implementada — `ConsolidatedDuelResult` com
  `rating.reward.stars` disponível em ambos os ramos de `ConsolidatedRating`.
- **F06 (Concessão de Carta)** implementada — `selectDropCardNumber` (`packages/rules`) e o par
  `grant-card-drop.ts`/`use-card-drop-reward.ts` existentes, que esta feature substitui.
- **`build-deck/F03`** implementada — `apply_card_reward`, `reward_ledger`
  (`supabase/migrations/0005`, `0006`), `collections`, e os padrões de fila offline/cache que esta
  feature espelha (`offline-queue.ts`, `sync-reward-queue.ts`, `indexeddb-cache.ts`).
- **Contrato externo assumido:** Rating Engine (cross-PRD, via F05) — a quantidade de estrelas por
  vitória continua sendo lida de `rating.reward.stars`, nunca recalculada ou inventada aqui.
- **Pendência de decisão adotada por Auto-Aceite:** ADR-006 ("Economia unificada, idempotente e
  atômica") segue "Proposto"; esta spec adota a recomendação de `arquitetura.md` §5.3 como premissa
  a confirmar (spec Decisão 1). Nenhum passo abaixo depende da aceitação formal do ADR para ser
  executável.

## Fase 1 — Contratos e regra pura

1. **Tipos e schemas de carteira/recompensa unificada.** Criar `packages/shared/src/economy/
   wallet.ts` e `wallet-schema.ts` com `WalletBalance`, `LoadedWalletBalance`, `VictoryRewardEvent`,
   `VictoryRewardResult`, `PendingVictoryReward` e os schemas zod correspondentes, e exportá-los em
   `packages/shared/src/index.ts`.
2. **Validação pura de estrelas.** Criar `packages/rules/src/economy/victory-reward.ts` com
   `validateVictoryRewardStars`, seus testes table-driven, e exportar via `packages/rules/src/
   economy/index.ts` e `packages/rules/src/index.ts`.

## Fase 2 — Persistência

3. **Migração `0008`.** Criar `supabase/migrations/0008_create_wallets_and_apply_victory_reward.sql`
   com a tabela `wallets` (RLS, política de leitura própria, grants) e o RPC
   `apply_victory_reward`, sem alterar nenhuma migração existente.
4. **Stores locais novas.** Alterar `apps/web/src/lib/collection/indexeddb-cache.ts` para subir
   `DATABASE_VERSION` para 5 e criar as stores `walletBalance` e `pendingVictoryRewards` no
   `onupgradeneeded`, cobrindo com teste que as duas existem após o upgrade.

## Fase 3 — Pipeline de recompensa unificada em `apps/web`

5. **Repositório e fila da carteira.** Criar `apps/web/src/lib/wallet/supabase-repository.ts`
   (leitura de `wallets`) e `apps/web/src/lib/wallet/indexeddb-cache.ts` (cache local de saldo),
   deliberadamente fora de `lib/free-duel/` para permanecerem reaproveitáveis por outro módulo
   futuro.
6. **Leitura de saldo.** Criar `apps/web/src/lib/wallet/load-wallet.ts` (`loadWalletBalance`),
   espelhando o formato servidor→cache→fallback de `load-collection.ts`.
7. **Repositório e fila da recompensa de vitória.** Criar `apps/web/src/lib/reward/
   victory-reward-repository.ts` (chama o RPC `apply_victory_reward`) e `apps/web/src/lib/reward/
   victory-reward-queue.ts` (fila IndexedDB `pendingVictoryRewards`).
8. **Transação offline combinada.** Criar `apps/web/src/lib/reward/apply-offline-victory-reward.ts`,
   gravando coleção, carteira e fila pendente numa única transação IndexedDB.
9. **Orquestração do crédito.** Criar `apps/web/src/lib/reward/apply-victory-reward.ts`
   (`applyVictoryReward`), seguindo o mesmo fluxo de validação → deduplicação local → RPC →
   fallback offline já provado por `register-card-reward.ts`.
10. **Sincronização ao reconectar.** Criar `apps/web/src/lib/reward/sync-victory-reward-queue.ts` e
    `apps/web/src/hooks/use-victory-reward-sync.ts`, espelhando `sync-reward-queue.ts`/
    `use-reward-sync.ts`, incluindo a pré-condição de sessão autenticada.

## Fase 4 — Retrofit de F06 e orquestração unificada

11. **Substituir o ponto de composição de F06.** Criar `apps/web/src/lib/free-duel/
    grant-victory-reward.ts`, reaproveitando `selectDropCardNumber` sem alteração e chamando
    `applyVictoryReward` com o `cardNumber` selecionado e `stars` de `result.rating.reward.stars`;
    remover `grant-card-drop.ts` e seu teste, com a lógica de seleção pura preservada via o import
    já existente de `packages/rules`.
12. **Substituir o hook de F06.** Criar `apps/web/src/hooks/use-victory-reward.ts` (mesma guarda de
    "somente vitória" de `use-card-drop-reward.ts`) e remover este último e seu teste.

## Fase 5 — Interface e integração ponta a ponta

13. **Componente de estrelas.** Criar `apps/web/src/components/free-duel/stars-reward-badge.tsx`,
    cobrindo os ramos aplicado/offline/já-creditado, sem alterar `card-drop-reward.tsx`.
14. **Composição na tela de resultado.** Alterar `apps/web/src/components/free-duel/duel-result.tsx`
    para renderizar `StarsRewardBadge` ao lado de `CardDropReward`, ambos a partir do mesmo
    `GrantedVictoryReward`.
15. **Teste de integração ponta a ponta.** Criar `apps/web/tests/
    free-duel-victory-reward.integration.test.tsx` cobrindo o fluxo F03→F05→F06→F07 com portas
    controladas, incluindo o caminho offline e a idempotência por sessão repetida.
