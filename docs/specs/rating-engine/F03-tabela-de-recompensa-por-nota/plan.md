# Plano de Implementação — Tabela de Recompensa por Nota

> Spec: `./spec.md`

## Pré-requisitos

- `rating-engine/F02` implementado — a nota precisa ser uma união fechada de dez literais para que
  a exaustividade da tabela seja verificada pelo compilador em vez de por teste.
- `free-duel/F05` implementado — `RatingReward` já existe e não muda de forma.
- `free-duel/F01` implementado — as três faixas de drop (`common`, `sa-pow`, `sa-tec`) já existem no
  roster e são reportadas pelo relatório de carga.
- `free-duel/F06`, `free-duel/F07` e a migração da carteira já implementados — os consumidores da
  recompensa existem e **não precisam mudar**: eles já leem os dois campos, só recebiam sempre os
  valores do fallback mínimo.
- O valor de estrelas por vitória **não** é dado de balanceamento pendente: é o star chip do
  original, recuperado junto com a fórmula (spec, Decisão 1).

## Fase 1: Tabela e consumo

**1. Identificadores de faixa** — Acrescentar aos constantes de duelista os três identificadores de
faixa de drop como constantes nomeadas, para que a tabela de recompensa não espalhe literais e a
renomeação de uma faixa tenha um único ponto de verdade do lado das regras.

**2. Tabela de recompensa** — Criar o módulo da tabela nota → recompensa como um registro congelado
indexado pela união fechada de notas, mais a função total de consulta. A tabela e os valores estão
na spec. Exportar pelo índice do subsistema de rating.

**3. Composição na avaliação** — Ligar a consulta da recompensa ao passo final da avaliação do
duelo, completando a cadeia pontuação → nota → recompensa que F02 deixou aberta.

## Fase 2: Cobertura

**4. Entradas e invariantes** — Cobrir explicitamente as dez entradas da tabela, mais os invariantes
que a definem: uma entrada por nota, estrelas entre 1 e 5, nenhuma nota valendo zero, as três faixas
todas alcançáveis, só `S` e `A` abrindo faixa rara, e a monotonicidade dentro de cada lado do eixo.

**5. Propriedades da cadeia** — Cobrir a totalidade da cadeia pontuação → nota → recompensa para
qualquer inteiro, e a monotonicidade da cadeia por lado do eixo — a versão global seria falsa e não
deve ser testada.

**6. Contrato com os consumidores** — Cobrir que toda nota produz uma avaliação que satisfaz o
schema já validado pela tela de resultado, e que a faixa devolvida existe no pool real dos duelistas
do roster, atravessando as três features do módulo de ponta a ponta.
