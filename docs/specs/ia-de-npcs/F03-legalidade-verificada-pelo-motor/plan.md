# Plano de Implementação — Legalidade Verificada pelo Motor

> Spec: `./spec.md`

## Pré-requisitos

- F01 implementada, com o pacote `packages/ai`, a composição do agente e o contrato `AiAgent.decide(state, profile)` existentes.
- F02 implementada, fornecendo candidatos imutáveis e ordenados derivados exclusivamente de `PublicDuelState`.
- Motor de Duelo 1x1 F01–F12 implementado, com `apply` puro e recusas representadas por `Result`.
- Free Duel/F09 implementado, mantendo o estado privado no orquestrador e produzindo a projeção pública da CPU.
- Confirmar durante a revisão a premissa auto-aceita da ponte efêmera por identidade entre projeção pública e snapshot privado.

## Fase 1: Contratos e filtro puro

**1. Contratos compartilhados** — Acrescentar os contratos imutáveis de avaliação, candidato legal e fallback à superfície pública de `shared`, conforme a Seção 4 da spec.

**2. Filtro de candidatos** — Implementar no pacote de IA a seleção que consulta a capability para cada candidato, preserva a ordem e descarta recusas esperadas sem log.

**3. Fallback explícito** — Completar o resultado do filtro para representar separadamente o avanço de fase quando nenhum candidato foi aprovado.

**4. Cobertura do núcleo** — Cobrir aceitação, recusa, ordem, duplicatas, imutabilidade, fallback e propriedades de subsequência junto ao filtro.

## Fase 2: Ponte de autoridade do motor

**5. Adaptador autorizado** — Criar no Free Duel a ponte efêmera entre a projeção pública de uma decisão e o snapshot privado correspondente, expondo somente o resultado público definido na spec.

**6. Ciclo do contexto** — Integrar a abertura e o encerramento idempotente do contexto ao redor da chamada existente do agente, preservando a assinatura de `AiAgent` e impedindo reutilização de snapshots.

**7. Projeção segura do resultado** — Garantir que aceitações sejam reprojetadas pela ótica da CPU e que recusas, eventos e dados privados não atravessem a fronteira.

**8. Cobertura do adaptador** — Validar snapshot correto, expiração, projeção desconhecida, não promoção de estado especulativo e proteção de cartas ocultas.

## Fase 3: Composição e gates

**9. Composição do agente** — Conectar o filtro ao pipeline estabelecido por F01 e F02 para que políticas posteriores recebam exclusivamente candidatos aprovados.

**10. Integração com o motor real** — Exercitar recusas de fase e zona, aceitação pelo orquestrador e preservação do estado com as implementações reais do motor e da projeção pública.

**11. Contratos cross-feature** — Preparar as asserções que F04 e F05 reutilizarão para provar que toda escolha da CPU veio do conjunto legal e que o fallback permanece seguro.

**12. Gates arquiteturais** — Executar formatação, lint, typecheck, testes dos pacotes afetados e verificação da direção de dependências, incluindo a ausência de regras de legalidade duplicadas na IA.
