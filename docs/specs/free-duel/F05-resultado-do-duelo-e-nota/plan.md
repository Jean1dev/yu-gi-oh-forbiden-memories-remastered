# Plano de Implementação — Resultado do Duelo e Nota

> Spec: `./spec.md`

## Pré-requisitos

- **F03 (interna, spec já publicada)** — `SessaoDuelo` com o desfecho `encerrada` expondo
  `estadoFinal: EstadoDuelo` na fase `fim` e um identificador de sessão estável (`idSessaoDuelo`,
  spec Decisão 10) que este plano repassa a F06/F07 para idempotência de recompensa.
- **`MotorDuelo/F12` (cross-PRD, sem spec)** — encerramento do duelo com vencedor/perdedor/motivo.
  Assumido inteiramente como contrato externo, consumido por meio da porta injetada
  `ExtrairDesfechoMotor` (spec, Decisão 2). Nenhuma implementação real existe ainda.
- **`MotorDuelo/F05` (cross-PRD, spec já publicada)** — `serializar(estado): Snapshot` em
  `packages/engine/src/serializacao/`. Pré-requisito de código: essa função precisa existir em
  `packages/engine` antes de F05 poder ser integrada de ponta a ponta (os testes unitários e de
  propriedade desta feature não dependem disso, mas o teste de integração sim).
- **Rating Engine (cross-PRD, sem PRD, sem spec)** — assumido inteiramente como contrato externo
  via a porta injetada `PortaRatingEngine`. Enquanto não existir, a implementação usa o adaptador
  placeholder que sempre sinaliza indisponibilidade, exercitando o caminho de recompensa mínima
  garantida como comportamento padrão observável.
- **Pendência de dado externo:** escala de notas e tabela nota→recompensa do Rating Engine.
  Fallback adotado enquanto não chega: recompensa mínima garantida não-nula (piso estrutural
  `ESTRELAS_MINIMAS_GARANTIDAS = 1`, `FAIXA_MINIMA_GARANTIDA = 'comum'`) em vez do fallback neutro
  padrão de outras tabelas pendentes — ver spec, Decisão 6.

## Fase 1: Vocabulário e contratos compartilhados

**1. Vocabulário de desfecho** — Declarar em `packages/shared` o vocabulário fechado do motivo de
encerramento e do desfecho do jogador, reaproveitando `JogadorId` já existente do motor de duelo.

**2. Forma do desfecho do motor e seu invariante** — Declarar o tipo e o schema que representam o
que `MotorDuelo/F12` vai produzir (vencedor, perdedor, motivo), incluindo a regra estrutural que
liga `motivo` a `vencedor`/`perdedor`, para que entradas inconsistentes sejam rejeitadas antes de
qualquer interpretação.

**3. Contratos da avaliação e do resultado consolidado** — Declarar a nota opaca, a recompensa por
nota (reaproveitando a faixa de raridade já definida por F01), a avaliação consolidada com suas
duas origens possíveis, e a união discriminada do resultado final que F06/F07/F08 vão consumir.

**4. Portas injetadas e constantes** — Declarar os tipos das duas portas externas (extração do
desfecho do motor e avaliação do Rating Engine), o lado fixo do jogador humano, o piso de
recompensa mínima garantida e o timeout da chamada ao Rating Engine.

## Fase 2: Núcleo puro de interpretação e consolidação

**5. Validação estrutural do desfecho do motor** — Implementar a checagem pura que aceita ou
rejeita um desfecho do motor conforme o invariante declarado na Fase 1.

**6. Mapeamento para o desfecho do jogador** — Implementar a função pura que traduz
vencedor/perdedor/motivo para vitória, derrota ou empate do ponto de vista do lado humano.

**7. Montagem do resultado consolidado** — Implementar a função pura que monta a união
discriminada final, incluindo o ramo de recompensa mínima garantida quando nenhuma avaliação do
Rating Engine é fornecida, mantendo o campo de avaliação ausente em derrota e empate.

**8. Testes do núcleo puro** — Cobrir a validação estrutural, o mapeamento e a montagem com casos
tabulares e com as propriedades de bicondicional, correção do mapeamento, exclusividade da
avaliação e não-ausência da recompensa mínima descritas na spec.

## Fase 3: Orquestração com o motor e o Rating Engine

**9. Adaptador placeholder do Rating Engine** — Criar o adaptador que satisfaz a porta do Rating
Engine sinalizando indisponibilidade, para que o restante do fluxo seja exercitável e testável
antes de o Rating Engine real existir.

**10. Cache em memória por sessão** — Implementar o armazenamento efêmero que evita reprocessar
ou rechamar o Rating Engine quando a tela de resultado é remontada para a mesma sessão.

**11. Orquestrador de apuração do resultado** — Implementar a função de borda que observa a
sessão encerrada de F03, extrai o desfecho do motor pela porta injetada, serializa o estado final
usando a função já especificada por `MotorDuelo/F05` apenas na vitória, chama a porta do Rating
Engine sob timeout, aplica o fallback de recompensa mínima quando necessário, e delega ao núcleo
puro da Fase 2 para montar o resultado final.

**12. Registro estruturado de incidentes** — Adicionar o log de borda para indisponibilidade do
Rating Engine, resposta fora do schema, e inconsistência do resultado do motor, sempre incluindo
o identificador de sessão e o código do problema.

**13. Testes do orquestrador** — Cobrir timeout, falha, resposta inválida, indisponibilidade do
motor, sessão não encerrada, idempotência por sessão e não-reaproveitamento de cache entre
sessões diferentes.

## Fase 4: Apresentação do resultado

**14. Hook de leitura do resultado** — Criar o hook fino que dispara a apuração quando a sessão de
F03 encerra e expõe o estado (carregando/resolvido) à interface.

**15. Painel de resultado e mensagens** — Criar o componente que exibe desfecho e motivo em todo
caso, e — somente na vitória — a nota (ou o aviso de indisponibilidade quando a origem é a
recompensa mínima) e as estrelas, com o mapa de mensagens exatas do PRD; integrar o painel à tela
de duelo já montada por F03 quando a sessão atinge o desfecho encerrado, e cobrir os estados com
testes de tela.
