# Plano de Implementação — Revanche e Navegação Pós-Duelo

> Spec: `./spec.md`

## Pré-requisitos

- **F01 (Seleção de Oponente)** — implementada; fornece a rota `/free-duel` (`OpponentSelection`)
  para onde "Trocar oponente" navega.
- **F02 (Verificação do Deck Ativo)** — implementada; fornece a rota
  `/free-duel/[duelistId]/prepare` (`DuelPreparation`) que a Revanche reaproveita para revalidar o
  deck ativo.
- **F03 (Orquestração da Partida)** — implementada; fornece a rota `/free-duel/[duelistId]/duel`
  (`DuelScreen`) e a criação de sessão (`createDuelSession`, `generateDuelSessionId`,
  `createCryptoSeedGenerator`) que a Revanche reaproveita sem alteração.
- **F05 (Resultado do Duelo e Nota)** — implementada; fornece `ConsolidatedDuelResult` e o
  componente `DuelResult`, ao lado do qual as ações de F08 passam a aparecer.
- Nenhum contrato externo cross-PRD é assumido — todas as dependências já existem em código.
- Nenhuma pendência de dado externo (guardião, terreno, fusão, drop, rating, balanceamento) toca
  esta feature.

## Fase 1: Rotas e componente de navegação pós-duelo

**1. Rotas de destino** — Criar as constantes/função de rota (Revanche, Trocar oponente, Voltar ao
menu) descritas na Seção 3/4 da spec, como utilitário puro isolado do componente visual.

**2. Componente de ações pós-duelo** — Criar o componente de apresentação que renderiza as três
ações lado a lado, consumindo as rotas do passo anterior e recebendo o `duelistId` da tela de
duelo.

**3. Testes unitários das rotas e do componente** — Cobrir a composição da rota de revanche
(incluindo a propriedade de fast-check da Seção 7) e a presença/`href` de cada uma das três ações.

## Fase 2: Integração à tela de duelo

**4. Exibição condicionada ao fim de sessão** — Alterar a tela de duelo para renderizar o
componente de ações pós-duelo no mesmo ramo em que hoje só exibe o resultado consolidado de F05,
sem introduzir nova condição além de `status === "ended"`.

**5. Testes da tela de duelo** — Estender os testes já existentes da tela para confirmar que as
ações aparecem apenas quando a sessão termina (nunca durante o duelo nem numa falha de
orquestração) e acompanham o resultado consolidado em qualquer desfecho.

**6. Testes de integração da navegação** — Cobrir, num teste de integração, o resultado consolidado
e as três ações aparecendo juntos para os quatro desfechos possíveis.

**7. Teste de integração de independência da revanche** — Cobrir, num teste de integração dedicado,
que duas sessões criadas em sequência (duelo original e revanche simulada) nunca compartilham
identificador nem carregam estado residual uma da outra.
