# Plano de Implementação — Serialização e Snapshot do Estado

> Spec: `./spec.md`

## Pré-requisitos

- **Spec de `motor-duelo-1x1`/F01** (`EstadoDuelo` e seu schema), ainda sem implementação. Esta
  feature só lê esse contrato; não o altera.
- **Nenhuma outra dependência interna.** F05 tem `Dependências: F01` na tabela do PRD §8 — não
  depende de F02, F03 ou F04, embora se beneficie de todos os campos que eles já acrescentaram ao
  estado (`pendente`, `seed`).
- **Nenhuma dependência cross-PRD.** O consumidor declarado (Online Duel) ainda não existe e não
  bloqueia esta feature — F05 apenas oferece o contrato.
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é tocada por esta feature.

## Fase 1: Contrato de snapshot

**1. Nome público para o estado serializável** — Declarar o tipo que representa "um estado pronto
para ser armazenado ou transmitido" como o próprio tipo de estado já existente, sem introduzir
nenhum campo ou wrapper adicional.

## Fase 2: Operações de serialização

**2. Captura de um snapshot** — Implementar a operação que devolve uma cópia independente de um
estado de duelo, garantindo que nenhuma alteração posterior ao estado original ou à cópia afete o
outro lado.

**3. Reconstrução a partir de um snapshot** — Implementar a operação que recebe um valor de
procedência não confiável, valida sua forma contra o mesmo contrato do estado de duelo, e devolve
o resultado como um sucesso com o estado reconstruído ou uma falha explícita com o motivo.

## Fase 3: Garantias e verificação

**4. Testes unitários das duas operações** — Cobrir a preservação de conteúdo e a independência de
referência na captura, e a aceitação do caminho válido e a rejeição de cada forma de entrada
malformada na reconstrução.

**5. Teste de propriedade do round-trip** — Cobrir por geração aleatória, sobre toda a variedade de
formas que um estado de duelo pode assumir, que capturar e em seguida reconstruir sempre devolve
um resultado estruturalmente idêntico ao estado original.
