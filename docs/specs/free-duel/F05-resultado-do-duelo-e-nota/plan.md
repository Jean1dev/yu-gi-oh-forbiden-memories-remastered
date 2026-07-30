# Plano de Implementação — Resultado do Duelo e Nota

> Spec: `./spec.md`

## Pré-requisitos

- F03 e F04 estão implementadas e fornecem `DuelSession`, `duelSessionId`, `finalState` e o fluxo
  de rendição.
- `MotorDuelo/F12` ainda não existe; o override “assuma os contratos externos” autoriza criar
  somente `ReadDuelOutcome` e seus tipos/schemas em `packages/shared`.
- O Rating Engine ainda não possui PRD/spec/implementação; o mesmo override autoriza criar somente
  sua porta e schemas compartilhados.
- Escala de notas e tabela nota→recompensa permanecem pendentes. A implementação recebe uma
  política mínima externa validada e não hard-code valores.
- A integração de produção completa ficará bloqueada até F12 e o Rating Engine fornecerem
  adaptadores reais; fakes existem apenas em testes.

## Fase 1: Contratos compartilhados

**1. Vocabulário do resultado** — Declarar o desfecho externo do motor, a avaliação do Rating
Engine, a política mínima e o resultado consolidado como uniões e tipos imutáveis.

**2. Validação das fronteiras** — Criar schemas zod para todos os payloads externos e invariantes
estruturais, exportando os contratos pela API pública de `packages/shared`.

**3. Núcleo puro de consolidação** — Implementar a tradução do resultado para o ponto de vista de
P1 e garantir por tipo que derrota/empate não carregam recompensa, com testes unitários e
property-based conforme a Seção 7.

## Fase 2: Resolução e fallback

**4. Orquestrador de resultado** — Implementar a borda que lê o desfecho, chama o Rating Engine
somente na vitória, valida sua resposta e delega a consolidação ao núcleo puro.

**5. Fallback e observabilidade** — Aplicar a política mínima injetada quando o Rating Engine
falhar, registrar incidentes estruturados e produzir o estado seguro quando o motor for
inconsistente.

**6. Idempotência em memória** — Memoizar o resultado por sessão para impedir avaliações repetidas
durante remontagens, cobrindo sucesso e falhas com testes.

## Fase 3: Apresentação e integração com F03

**7. Hook de resultado** — Expor o ciclo carregando/resolvido para sessões encerradas sem mover
regra de domínio para React.

**8. Painel acessível** — Renderizar desfecho, motivo e o ramo de vitória, incluindo a mensagem
exata de fallback, e cobrir os estados visuais.

**9. Tela de duelo** — Substituir o placeholder de duelo encerrado pelo painel F05 quando as portas
externas forem compostas, preservando um estado seguro quando ainda não estiverem disponíveis.

## Fase 4: Integração e aceite

**10. Fluxo F03→F05** — Adicionar teste de integração com uma sessão encerrada, portas externas
controladas e verificação de que apenas a vitória é avaliada.

**11. Critérios de aceite** — Reexecutar os testes mapeados na Seção 7, incluindo derrota, empate,
rendição, fallback mínimo, cache por sessão e preservação opaca da avaliação oficial.

**12. Portões finais** — Rodar lint, fronteiras arquiteturais, typecheck, suítes unitária e de
integração, além do build web como smoke check.
