# Download de Arte Crop (Piloto)

> PRD: `docs/prds/renderizacao-cartas.md` — F03
> Pacote-alvo: `packages/data`

## 1. Contexto e Escopo

Baixa, para as 15 cartas do piloto, a imagem de arte "crop" (só a ilustração, sem moldura) cuja URL
`renderizacao-cartas/F02` já resolveu em `packages/data/generated/ygoprodeck-art-urls.json`. O resultado
fica em `cards-data/art/NNN.jpg` — um diretório novo, para não colidir com `cards-data/NNN.jpg` (a imagem
completa antiga, que continua servindo de fallback até o rollout total).

### Incluído
- Download dos 15 arquivos de arte crop do piloto, com validação de formato e resolução mínima
- Extensão de `data:ingest` para também mapear `cards-data/art/*.jpg` num segundo manifesto
  (`generated/crop-arts-manifest.json`), reaproveitando `buildArtManifest` (já existe desde
  `banco-de-cartas/F01`) — nenhuma lógica de manifesto nova, só uma segunda chamada sobre outro diretório
- Validação de imagem: rejeita e não grava um download que não seja JPEG ou tenha menos de 400px no lado
  maior (Objetivo de Sucesso 1 do PRD)

### Fronteiras
- Resolver a URL é `renderizacao-cartas/F02` — esta feature só baixa
- Consumir o manifesto crop para decidir `CardFrame` vs. fallback é `renderizacao-cartas/F06`
- Rodar sobre as ~700 cartas restantes é `renderizacao-cartas/F07` — fora desta entrega

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | `cards-data/art/NNN.jpg`, diretório novo e versionado (mesma convenção de `cards-data/NNN.jpg`, mas para a arte isolada) | PRD F03 Capabilities | confirmada |
| 2 | O manifesto de arte crop é **gerado** (`generated/crop-arts-manifest.json`, gitignored), produzido durante `data:ingest` reaproveitando `buildArtManifest` sobre `cards-data/art/` — não um arquivo versionado à parte | Segue exatamente o precedente de `arts-manifest.json` (spec `banco-de-cartas/F01`); evita duplicar a lógica de casamento numero↔arquivo que já existe | confirmada |
| 3 | Validação de dimensão lê os cabeçalhos JPEG (marcadores SOF) diretamente — sem adicionar uma dependência de processamento de imagem ao projeto, que hoje não tem nenhuma | Mantém a superfície de dependências do pacote enxuta, consistente com o resto do repositório | confirmada |
| 4 | Falha de download ou de validação não apaga um arquivo `cards-data/art/NNN.jpg` já existente de uma execução anterior — só um download bem-sucedido e válido substitui o anterior | Idempotência simétrica à Decisão 7 de F02 (nunca perder um dado bom por causa de uma falha na tentativa seguinte) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/src/art/jpeg-dimensions.ts` | data | novo | `readJpegDimensions(buffer) -> {width, height} \| null`, pura, lê os marcadores SOF0/SOF2 |
| `packages/data/src/art/jpeg-dimensions.test.ts` | data | novo | testes com buffers JPEG sintéticos mínimos |
| `packages/data/scripts/download-card-art.ts` | data | novo | I/O: lê `ygoprodeck-art-urls.json`, baixa, valida, grava `cards-data/art/NNN.jpg` |
| `packages/data/scripts/download-card-art.test.ts` | data | novo | testes com cliente HTTP stubado (mesmo padrão de injeção de F02) |
| `packages/data/src/ingestion/serialize.ts` | data | alterado | extrai `serializeArtManifest(manifest)` reaproveitável (hoje só embutida em `serializeArtifacts`) |
| `packages/data/scripts/ingest-cards.ts` | data | alterado | chama `buildArtManifest` uma segunda vez sobre `cards-data/art/`, grava `crop-arts-manifest.json` |

**Verificação da direção de dependências:** tudo em `packages/data`; nenhuma inversão. `jpeg-dimensions.ts`
não faz I/O (recebe o buffer já baixado) — só `download-card-art.ts` (scripts/) baixa de verdade.

## 3. Design Técnico

### Estruturas de dados

```
DownloadOutcome =
  | { kind: "downloaded", numero: CardNumber, path: string, width: number, height: number }
  | { kind: "skipped", numero: CardNumber, reason: "no_url" | "http_error" | "not_jpeg" | "too_small" }
```

### Fluxo

1. Lê `packages/data/generated/ygoprodeck-art-urls.json` (produzido por F02 — se ausente, nenhuma carta tem
   URL, todas saem `skipped: no_url`)
2. Para cada `numero` da lista-alvo (piloto = os mesmos 15 de F02, Decisão 1 daquela spec), na ordem
   ascendente:
   a. Sem URL na tabela → `skipped: no_url`
   b. Baixa a URL (mesmo cliente de rede simples de F02, com timeout de 10s); falha → `skipped: http_error`
   c. Confere o `Content-Type`/assinatura de bytes JPEG (`FF D8 FF`); não é JPEG → `skipped: not_jpeg`
   d. `readJpegDimensions` no buffer; lado maior < 400px → `skipped: too_small`
   e. Grava `cards-data/art/{numero}.jpg`; registra `downloaded` com as dimensões
3. Ao final: imprime o relatório (baixadas vs. puladas por motivo)
4. Não escreve manifesto — isso é responsabilidade de `data:ingest` (Decisão 2), rodado depois

### Regras de negócio
- 400px é o limiar mínimo do lado maior, igual à Métrica de Sucesso 1 do PRD
- Um download que falha nunca apaga o arquivo anterior (Decisão 4)

### Eventos
Não aplicável.

### Determinismo e pureza
`readJpegDimensions` é pura, testável com buffers construídos à mão, sem rede nem disco.

## 4. Contratos

### Funções públicas

```
readJpegDimensions(buffer: Uint8Array): { width: number; height: number } | null
// null quando o buffer não começa com a assinatura JPEG (FF D8) ou não tem um marcador SOF reconhecível
```

```
serializeArtManifest(manifest: ArtManifest): string
// mesmo formato que a parte "artManifestJson" de serializeArtifacts hoje: chaves ordenadas, indentação 2, newline final
```

### Contratos externos (cross-PRD)
Nenhum.

## 5. Modelo de Dados

### Artefato versionado
`cards-data/art/NNN.jpg` — 15 arquivos nesta entrega, mesmo formato JPEG dos arquivos completos existentes.

### Artefato gerado (não versionado)
`packages/data/generated/crop-arts-manifest.json` — mesmo formato de `arts-manifest.json`
(`Record<CardNumber, string>`), mas apontando para `cards-data/art/NNN.jpg`.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Carta sem entrada em `ygoprodeck-art-urls.json` | Lookup no início da iteração | `skipped: no_url`, script continua | N/A (build-time) |
| Download falha (rede/404/timeout) | Cliente HTTP | `skipped: http_error`, arquivo anterior (se houver) preservado | N/A |
| Resposta não é JPEG | Assinatura de bytes | `skipped: not_jpeg`, nada é gravado | N/A |
| Imagem menor que 400px no lado maior | `readJpegDimensions` | `skipped: too_small`, nada é gravado | N/A |

## 7. Estratégia de Testes

### Unitários (Vitest)

`packages/data/src/art/jpeg-dimensions.test.ts`:
- `lê largura e altura de um JPEG SOF0 válido`
- `retorna null para um buffer que não começa com a assinatura JPEG`
- `retorna null para um buffer JPEG truncado sem marcador SOF`

`packages/data/scripts/download-card-art.test.ts` (cliente HTTP stubado):
- `baixa e grava quando a resposta é um JPEG válido acima do limiar`
- `pula (too_small) sem gravar quando a imagem é menor que 400px`
- `pula (not_jpeg) sem gravar quando a resposta não é JPEG`
- `pula (http_error) e continua para a próxima carta quando um download falha`
- `pula (no_url) sem chamar a rede quando a carta não está na tabela de URLs`
- `preserva o arquivo existente quando uma nova tentativa falha`

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| As ~15-20 cartas piloto têm arquivo de arte crop em `cards-data/art/NNN.jpg`, ≥400px no lado maior | Execução manual real documentada no plan.md, Fase 2 |
| Carta sem URL de arte (não-casada em F02) não tem entrada no manifesto de arte crop | `buildArtManifest` já garante isso (reaproveitado, spec `banco-de-cartas/F01`) |
| Download que falha ou vem abaixo da resolução mínima não é gravado, e é reportado | `pula (too_small)...`, `pula (not_jpeg)...`, `pula (http_error)...` |

### Testes de integração cross-feature e cross-PRD
| Critério | Teste |
|----------|-------|
| `crop-arts-manifest.json` gerado por `data:ingest` reflete os arquivos reais de `cards-data/art/` | Execução manual real: rodar `download-card-art` + `data:ingest`, conferir o manifesto (Fase 2 do plan.md) |
