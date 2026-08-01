# Plano de Implementação — Carteira de Estrelas

> PRD: `docs/prds/password.md` — F01
> Spec: `docs/specs/password/F01-carteira-de-estrelas/spec.md`

## Pré-requisitos

**Já implementado no repositório (nada a construir):**

- Tabela `wallets`, RPC `apply_victory_reward` e `reward_ledger` — `supabase/migrations/0005`,
  `0008` (`free-duel/F07`, que é a implementação de F01/F02 do PRD `password` sob a unificação
  de `arquitetura.md` §5.3)
- `WalletBalance` / `LoadedWalletBalance` / `PendingVictoryReward` e schemas zod —
  `packages/shared/src/economy/`
- `loadWalletBalance`, repositório Supabase de carteira e cache IndexedDB —
  `apps/web/src/lib/wallet/`
- Fila `pendingVictoryRewards` e `syncVictoryRewardQueue` — `apps/web/src/lib/reward/`
- Ponto de entrada de cadastro `onAccountCreated` + rota `POST /api/account/bootstrap`

**Contratos externos assumidos:**

- **Auth / Cadastro (cross-PRD)** — continua sendo a rota de bootstrap existente, que deriva o
  `playerId` verificando o bearer token
- **Save / persistência (cross-PRD)** — Supabase com RLS já configurado
- **`password/F04` (sem spec)** — consumirá `setAuthoritativeBalance` e deverá debitar a mesma
  linha de `wallets` dentro de uma RPC transacional

**Pendências que a implementação carrega (não resolve):**

- **Balanceamento:** valor do saldo inicial. Fica isolado em `INITIAL_WALLET_STARS`, hoje `0`
  (sugestão do próprio PRD). Nenhum valor é inventado.
- **ADR-006 segue "Proposto"** — a unificação da carteira é adotada como decisão de código; a
  formalização do ADR é externa a esta implementação.
- **Retificação da spec de `password/F03`:** `hooks/use-wallet-balance.ts` passa a ser entrega de
  F01. F03 não foi implementada, então nada quebra — mas a tabela de alocação dela deve ser
  atualizada, e o cabeçalho de saldo deve exibir `effectiveStars`.

## Fase 1 — Contratos e reconciliação pura

1. **Constante de saldo inicial** — Criar `packages/shared/src/economy/constants.ts` com
   `INITIAL_WALLET_STARS`, documentado como pendência de balanceamento, e reexportá-la no barril
   de `shared`. É o único lugar do repositório onde o número existe.

2. **Extensão dos contratos de carteira** — Acrescentar `ReconciledWalletBalance` e os campos de
   saldo efetivo/pendente a `LoadedWalletBalance`, mais o schema da resposta do novo RPC. Os
   tipos já existentes de `free-duel/F07` não mudam de forma.

3. **Função pura de reconciliação** — Implementar `reconcileWalletBalance` em
   `packages/rules/src/economy/`, combinando saldo persistido, fila de créditos e conjunto de
   `duelId` já aplicados, com tratamento distinto para origem servidor e origem cache. Total,
   sem I/O, com as invariantes de não-negatividade e de "nada criado após a sincronização"
   cobertas por testes unitários e property-based.

## Fase 2 — Criação da carteira no cadastro

4. **RPC `ensure_wallet`** — Adicionar `supabase/migrations/0009_create_ensure_wallet.sql` com a
   função idempotente que cria a carteira apenas se ainda não existir, nunca sobrescrevendo um
   saldo, com `EXECUTE` concedido somente ao `service_role`. Não editar nenhuma migração já
   aplicada.

5. **Adaptador de bootstrap da carteira** — Criar a porta `EnsureWalletRepository` e seu
   adaptador Supabase em `apps/web/src/lib/wallet/`, usando o cliente service-role, no mesmo
   formato dos adaptadores de deck inicial.

6. **Integração no fluxo de cadastro** — Estender `onAccountCreated` para garantir a carteira
   além do deck inicial e devolver o resultado das duas operações, e atualizar a rota de
   bootstrap para reportar ambos. Chamadas repetidas continuam sendo no-op observável.

## Fase 3 — Leitura reconciliada do saldo

7. **Leitura do ledger** — Criar `AppliedRewardsRepository` em `apps/web/src/lib/wallet/`, que
   consulta em `reward_ledger` quais dos `duelId` pendentes já foram aplicados, sob a política
   RLS existente, consultando apenas os ids em questão.

8. **`loadWalletBalance` reconciliado** — Ligar fila, ledger e função pura ao carregamento do
   saldo, com o caminho rápido de fila vazia (zero consultas ao ledger) e os fallbacks
   conservadores descritos na spec. Passar a gravar o saldo efetivo no snapshot em cache.

9. **Casos de falha** — Cobrir ledger inacessível, IndexedDB indisponível, servidor indisponível
   e ausência de sessão, garantindo que nenhum caminho inflacione o saldo nem assuma zero.

## Fase 4 — Saldo reativo para F03 e F04

10. **Store de carteira** — Criar `apps/web/src/stores/wallet-store.ts` com Zustand, expondo o
    estado do saldo, o carregamento e `setAuthoritativeBalance`, que só aceita um saldo inteiro
    não negativo já devolvido pelo servidor e regrava o snapshot em cache.

11. **Hook de consumo** — Criar `apps/web/src/hooks/use-wallet-balance.ts` como adaptador fino
    sobre o store, disparando a carga uma única vez mesmo com múltiplos consumidores montados.
    É o arquivo que a spec de F03 previa para si e que agora F03 apenas consome.

12. **Travas de fonte única** — Acrescentar a verificação de que nenhum módulo fora de
    `lib/wallet` e `lib/reward` referencia a tabela `wallets`, e as verificações de direção de
    dependências do subdomínio `economy`.

13. **Integração ponta a ponta** — Cobrir o ciclo crédito offline → saldo efetivo → drenagem da
    fila → saldo estável, e o bootstrap de uma conta nova lendo de volta o saldo inicial.
