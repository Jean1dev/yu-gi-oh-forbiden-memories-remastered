# Plano de Implementação — Enriquecimento de Metadados via YGOPRODeck

> Spec: `./spec.md`

## Pré-requisitos
- `renderizacao-cartas/F01` implementada (schema `atributo`/`nivel`/`descricao` e a tabela de
  enriquecimento já existem) — confirmado, commits `b918c34` e `d1d39cb`
- Nenhum contrato externo cross-PRD; a API do YGOPRODeck é uma dependência de terceiros, não um módulo do
  projeto

## Fase 1: Cliente e parser da YGOPRODeck

**1. Tipos e schema da resposta** — criar `packages/data/src/ygoprodeck/types.ts` com o schema zod dos
campos usados da resposta da API (Contratos da spec).

**2. Parser puro** — criar `packages/data/src/ygoprodeck/parse-match.ts` convertendo uma resposta validada
num `YgoprodeckMatch`, aplicando a regra de nível só-para-monstro.

**3. Testes do parser** — cobrir os casos da Seção 7 da spec em `parse-match.test.ts`.

## Fase 2: Cliente HTTP e script de orquestração

**4. Cliente HTTP** — criar `packages/data/scripts/ygoprodeck-client.ts` com `fetchById`/`fetchByName`,
timeout de 10s e o único `fetch()` desta feature.

**5. Script de enriquecimento** — criar `packages/data/scripts/enrich-cards.ts`: lê as cartas locais e os
overrides, resolve casamento por id/nome com o *rate limit* de 300ms, grava
`cards-data/enriquecimento-ygoprodeck.json` e `packages/data/generated/ygoprodeck-art-urls.json`,
imprime o relatório de casadas/não-casadas.

**6. Arquivo de overrides vazio** — criar `cards-data/overrides-nomes-ygoprodeck.json` com `{}`.

**7. Testes do orquestrador** — cobrir os casos da Seção 7 da spec em `enrich-cards.test.ts`, com o cliente
HTTP stubado (o stub vive só no arquivo de teste).

## Fase 3: Execução real contra o piloto

**8. Rodar contra as 15 cartas do piloto** — executar `enrich-cards.ts` de verdade contra a rede real, para
os 15 `numero` da Decisão 1 da spec, e conferir o relatório: as 15 devem casar (nenhuma cai no caminho de
override, conforme verificado no planejamento).

**9. Confirmar a integração com F01** — rodar `data:ingest` depois do enriquecimento e conferir, em
`packages/data/generated/cards.json`, que as 15 cartas do piloto têm `atributo`/`nivel`/`descricao`
preenchidos e as demais continuam `null`.
