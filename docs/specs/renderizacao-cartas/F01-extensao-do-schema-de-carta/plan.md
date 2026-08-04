# Plano de Implementação — Extensão do Schema de Carta

> Spec: `./spec.md`

## Pré-requisitos
- Nenhuma dependência interna (F01 é Foundation do PRD `renderizacao-cartas`)
- Nenhum contrato externo cross-PRD
- Nenhuma pendência de dado externo

## Fase 1: Schema em `packages/shared`

**1. Constantes** — adicionar `CARD_ATTRIBUTES` (os 7 valores do TCG) e os limites de nível de monstro a
`packages/shared/src/card/constants.ts`, atualizando `CARD_FIELD_ORDER` para incluir os três campos novos
na posição consistente com o restante do schema.

**2. Schema e tipos** — estender `CardSchema` em `packages/shared/src/card/schema.ts` com `atributo`,
`nivel` e `descricao` (todos nullable), incluindo a regra de que `nivel` só pode ser não-nulo quando
`tipo` é `monstro`. Espelhar os campos novos em `Card` (`packages/shared/src/card/types.ts`).

**3. Testes do schema** — criar `packages/shared/src/card/schema.test.ts` cobrindo os casos da Seção 7 da
spec (valores válidos, enum, intervalo de nível, regra nível×tipo, string vazia em descrição).

## Fase 2: Tabela de enriquecimento e mescla em `packages/data`

**4. Schema e mescla** — criar `packages/data/src/ingestion/enrichment.ts` com o schema da tabela de
enriquecimento e a função pura que mescla uma entrada num `Card` já normalizado, revalidando contra
`CardSchema`. Exportar do `packages/data/src/ingestion/index.ts`.

**5. Wiring no pipeline** — estender `IngestionInput`/`ingestSource`
(`packages/data/src/ingestion/ingest-source.ts`) para aceitar a tabela de enriquecimento e aplicar a
mescla a cada card normalizado antes da agregação, com tabela ausente/vazia como caminho neutro.

**6. Adapter de I/O** — atualizar `packages/data/scripts/ingest-cards.ts` para ler
`cards-data/enriquecimento-ygoprodeck.json` do disco quando existir, e passar `{}` quando não
existir.

**7. Testes de mescla e integração** — cobrir `enrichment.ts` isoladamente e os novos casos de
`ingest-source.test.ts` descritos na Seção 7 da spec.

## Fase 3: Validação de regressão

**8. Rodar o pipeline real** — rodar `data:ingest` + `data:validate` sobre o dataset atual (sem
`enriquecimento-ygoprodeck.json`, que só nasce em F02) e confirmar que `dataset-seal.json` continua sendo
gerado com sucesso e as 722 cartas saem com os três campos novos `null`.
