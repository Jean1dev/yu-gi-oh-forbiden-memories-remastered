# Plano de Implementação — Condições de Fim de Duelo

> Spec: `./spec.md`

## Pré-requisitos

- **F01, F07, F11 implementadas** — `DuelState`, `deckOutPlayer` (marcado por `drawUpToHandSize`) e
  o dano com piso em 0 de `resolveAttack` são as três entradas de F12; nenhuma precisa mudar.
- **F05 implementada** — o campo novo `outcome` entra no snapshot, então `serialize`/`load` e o
  `DuelStateSchema` fazem parte do escopo desta feature.
- **`DuelOutcome` já publicado em `packages/shared`** e consumido pelo `free-duel`; F12 passa a
  produzi-lo e renomeia seus códigos de motivo para inglês, propagando aos consumidores.
- **Nenhuma pendência de dado externo.** F12 não toca guardiões, terrenos, fusões, drops nem
  rating — é a única feature do módulo sem tabela pendente.
- **Pendência que F12 não resolve:** `apps/web` continua sem depender de `@yugioh/engine`, e
  `ApplyAction` segue com assinatura divergente do `apply` real (spec, Decisão 12). Fiar o motor na
  UI é trabalho do `free-duel`.

## Fase 1: Contrato do resultado em `packages/shared`

**1. Renomeação dos motivos** — Trocar os quatro códigos de `DuelOutcome` para inglês em
`result.ts`, conforme a Decisão 5 da spec. As mensagens de UI continuam em português; só os códigos
mudam.

**2. Migração dos schemas de outcome** — Mover os schemas de motivo e de `DuelOutcome` para junto
de `PlayerIdSchema` e reexportá-los de onde estavam, evitando o ciclo de import que a Decisão 14
descreve. Nenhum consumidor muda seu caminho de import.

**3. Campo `outcome` no estado** — Acrescentar o campo opcional a `DuelState` e ao seu schema
estrito, seguindo o mesmo padrão dos campos opcionais já existentes. Sem isso, um snapshot de duelo
encerrado seria rejeitado no recarregamento.

**4. Ação de rendição** — Acrescentar a variante de rendição à união de ações e ao schema
discriminado, com o campo de jogador nomeado como as demais ações do motor (Decisão 9).

**5. Fechamento do vocabulário de ações** — Substituir o alias opaco de ação da orquestração pela
união real, que F12 completa (Decisão 12). Esperar que isso acuse divergências de tipo no
`apps/web` — são exatamente as que a Fase 4 corrige.

## Fase 2: Núcleo de fim de duelo em `packages/engine`

**6. Derivação do resultado** — Criar o subsistema `end` com a função pura que deriva o resultado
das condições observáveis no estado, na precedência da Decisão 7, devolvendo ausência de resultado
quando o duelo segue.

**7. Handler de rendição** — Implementar a rendição como declaração: produz o resultado com o
oponente como vencedor e devolve o restante do estado intacto, sem emitir evento (Decisão 4).

**8. Carimbo idempotente** — Implementar o pós-passo que preserva um resultado já presente e, na
ausência dele, consulta a derivação da etapa 6. É a peça que concilia a checagem centralizada com a
natureza declarativa da rendição.

## Fase 3: Congelamento no dispatcher

**9. Pré-guard de duelo encerrado** — Recusar toda e qualquer ação quando o estado já traz
resultado, posicionando a checagem antes do desvio antecipado de resolução de ataque (Decisão 2).

**10. Roteamento da rendição** — Acrescentar o caso ao switch exaustivo, ignorando o guard de janela
de reação e a exigência de jogador ativo, conforme a Decisão 10.

**11. Pós-passo em todos os retornos** — Envolver os retornos bem-sucedidos de todos os ramos com o
carimbo da etapa 8, incluindo o retorno antecipado da resolução de ataque. Retornos de erro seguem
intocados.

## Fase 4: Reconciliação do `apps/web`

**12. Fim de sessão pelo resultado real** — Trocar o critério de encerramento da sessão de duelo:
sai a comparação com a fase final do turno, entra a presença do resultado no estado (Decisão 13).
É a correção do defeito que faria toda sessão terminar no fim do primeiro turno.

**13. Alinhamento da ação de rendição** — Ajustar o construtor da ação de rendição do `free-duel`
para o campo que o motor define, agora que a união de ações é tipada de verdade.

**14. Propagação do rename** — Atualizar os consumidores dos códigos de motivo no `free-duel`
(consolidação do resultado, mensagens ao jogador) e as fixtures das suítes que os constroem,
mantendo os textos em português.

## Fase 5: Publicação e verificação

**15. Exports públicos e documentação** — Expor o subsistema novo no ponto de entrada do pacote do
motor, incluindo a leitura de conveniência "o duelo acabou?" para uso da UI e da IA futura, e
atualizar o README do pacote para registrar que o ciclo de duelo agora fecha.

**16. Unitários do subsistema** — Cobrir a derivação (as três condições, a precedência, o duelo em
andamento) e a rendição (cada lado, preservação do estado, ausência de eventos, janela aberta,
jogador não ativo).

**17. Casos do dispatcher** — Cobrir o roteamento da rendição, a recusa de cada tipo de ação depois
do fim — inclusive a resolução de ataque — e o carimbo produzido por um ataque letal e por uma
compra que esvazia o deck.

**18. Propriedades** — Provar que um estado com resultado é imutável sob qualquer ação da união,
que o carimbo é idempotente, que a derivação é total, e que o round-trip de serialização preserva o
resultado nos quatro motivos.

**19. Partida completa** — Exercer o ciclo inteiro do módulo numa única sequência: inicializar,
conduzir turnos, jogar da mão, batalhar e encerrar, verificando que o estado final traz o resultado
e recusa qualquer ação seguinte.
