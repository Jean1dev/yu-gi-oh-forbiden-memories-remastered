# Plano de Implementação — Download de Arte Crop (Piloto)

> Spec: `./spec.md`

## Pré-requisitos
- `renderizacao-cartas/F02` implementada, `ygoprodeck-art-urls.json` gerado com as 15 URLs do piloto —
  confirmado, commit `2498f3c`
- Nenhum contrato externo cross-PRD

## Fase 1: Download e validação

**1. Leitor de dimensões JPEG** — criar `packages/data/src/art/jpeg-dimensions.ts`, puro, lendo os
marcadores SOF do buffer.

**2. Testes do leitor** — cobrir os casos da Seção 7 da spec em `jpeg-dimensions.test.ts`.

**3. Script de download** — criar `packages/data/scripts/download-card-art.ts`: lê
`ygoprodeck-art-urls.json`, baixa cada URL da lista-alvo, valida formato e dimensão mínima, grava
`cards-data/art/NNN.jpg` sem apagar um arquivo bom existente em caso de falha.

**4. Testes do script** — cobrir os casos da Seção 7 da spec em `download-card-art.test.ts`, com o cliente
HTTP stubado (mesmo padrão de injeção de F02).

## Fase 2: Integração com o manifesto e execução real

**5. Segundo manifesto em `data:ingest`** — extrair `serializeArtManifest` de `serialize.ts` e chamar
`buildArtManifest` uma segunda vez em `ingest-cards.ts` sobre `cards-data/art/`, gravando
`generated/crop-arts-manifest.json`.

**6. Rodar contra o piloto** — baixar de verdade as 15 artes crop do piloto, rodar `data:ingest` depois, e
conferir que `crop-arts-manifest.json` lista as 15 entradas com os caminhos corretos.
