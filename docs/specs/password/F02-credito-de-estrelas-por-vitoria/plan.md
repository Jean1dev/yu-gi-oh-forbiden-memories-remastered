# Plano de Implementação — Crédito de Estrelas por Vitória

> PRD: `docs/prds/password.md` — F02
> Spec: `docs/specs/password/F02-credito-de-estrelas-por-vitoria/spec.md`

## Pré-requisitos

**Já implementado no repositório (nada a construir):**

- Tabela `wallets`, tabela `reward_ledger` e o RPC transacional `apply_victory_reward`, que
  credita carta e estrelas na mesma transação e é idempotente pelo `duel_id` —
  `supabase/migrations/0005` e `0008` (`free-duel/F07`, que é a implementação do handler
  `onVictory` unificado de `docs/arquitetura.md` §5.3)
- Contratos e schemas de evento, resultado e fila — `packages/shared/src/economy/`
- Validações puras de carta e de quantidade de estrelas — `packages/rules/src/economy/` e
  `packages/rules/src/drop-reward/`
- Handler de crédito, adaptador do RPC, fila offline e rotina de drenagem —
  `apps/web/src/lib/reward/`
- Origem do evento a partir do resultado de duelo — `apps/web/src/lib/free-duel/`
- Mensagens de UI da tela de vitória, incluindo as três exigidas pelo Error Handling do PRD —
  `apps/web/src/components/free-duel/stars-reward-badge.tsx`
- Sink de logging estruturado do repositório — `apps/web/src/lib/logging.ts`

**Contratos externos assumidos:**

- **Free Duel (cross-PRD)** — é hoje a única origem do evento de vitória; a injeção do handler
  na tela de duelo pertence a `free-duel/F03` e depende da máquina de turnos do motor, que não
  existe. F02 não faz essa fiação.
- **Online Duel e Campanha (cross-PRD)** — não existem; entrarão pelo mesmo ponto de entrada,
  que já valida o evento na fronteira e não conhece o módulo de duelo.
- **`free-duel/F05` — Rating Engine** — fornece o `N` desta vitória; hoje sem provedor de
  produção.
- **`password/F01`** — consome o efeito do crédito pela leitura reconciliada do saldo; nenhuma
  chamada direta entre as duas features.

**Pendências que a implementação carrega (não resolve):**

- **Balanceamento:** o valor de `N` estrelas por vitória continua sem definição. Nenhum valor é
  inventado; a implementação apenas garante, por propriedade e por análise estática, que o valor
  creditado é sempre e exatamente o injetado pelo resultado do duelo.
- **ADR-006 segue "Proposto"** — a unificação de carteira e handler é adotada como decisão de
  código; a formalização do ADR é externa a esta implementação.
- **Nenhuma migração é criada ou editada** — toda a lacuna é de `apps/web`.

## Fase 1 — Registro e robustez do handler de crédito

**1. Instrumentação do caminho de crédito** — Levar o handler de crédito de estrelas ao mesmo
nível de observabilidade que o seu irmão do lado carta já tem, cobrindo os ramos de evento
malformado, crédito aplicado, crédito duplicado (tanto o detectado localmente quanto o reportado
pelo servidor) e falha de persistência. É o que satisfaz os dois itens de Error Handling do PRD
que falam em "registrar", usando a taxonomia de eventos descrita na Seção 4 da spec.

**2. Evento de vitória validado como valor na origem** — Substituir a montagem que lança por uma
validação que devolve resultado, registrando a inconsistência e garantindo que uma nota de duelo
malformada não produza nenhuma escrita nem nenhuma exceção atravessando a fronteira de crédito.

**3. Leitura tolerante da fila local** — Fazer com que a indisponibilidade do cache local na
etapa de deduplicação degrade para "sem itens pendentes" com registro, em vez de abortar um
crédito que teria funcionado online. A idempotência real continua sendo a chave de duelo no
banco, conforme a Seção 3 da spec.

## Fase 2 — Durabilidade do crédito offline

**4. Registro de descarte na drenagem** — Fazer a rotina de sincronização registrar cada item
que ela remove da fila sem aplicar, com o identificador do duelo e o motivo, e emitir um sumário
ao final. Hoje esse descarte é uma perda silenciosa de crédito do jogador.

**5. Montagem do sincronizador** — Montar o hook de sincronização da fila de recompensa de
vitória no composition root cliente indicado pela Decisão 7 da spec, para que o crédito
enfileirado offline efetivamente chegue ao servidor ao reconectar, fechando a segunda metade do
Error Handling do PRD.

## Fase 3 — Travas de contrato e rastreabilidade

**6. Travas do valor de balanceamento e da fonte única** — Acrescentar as verificações que
impedem o `N` de virar um literal no código e que confirmam que o RPC transacional é o único
escritor da carteira no caminho de vitória, além da invariante de que o módulo de economia não
importa o módulo de duelo — o que mantém Online Duel e Campanha atendidos pelo mesmo ponto.

**7. Integração ponta a ponta do handler** — Cobrir o ciclo completo do crédito: vitória
creditando carta e estrelas juntas, reprocessamento não duplicando, crédito offline escrito de
forma indivisível no cache local e drenagem posterior aplicando exatamente uma vez, incluindo os
casos de atomicidade e concorrência exercitados contra o Supabase local.
