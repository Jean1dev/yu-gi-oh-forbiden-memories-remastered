# Enriquecimento de Metadados via YGOPRODeck

> PRD: `docs/prds/renderizacao-cartas.md` — F02
> Pacote-alvo: `packages/data`

## 1. Contexto e Escopo

Esta feature busca `atributo`, `nivel` e `descricao` para as cartas do piloto (~15 cartas
representativas, ver Decisão 1) na API pública do YGOPRODeck e grava o resultado na tabela auxiliar que
`renderizacao-cartas/F01` já criou (`cards-data/dados/enriquecimento-ygoprodeck.json`). Também resolve, para
cada carta casada, a URL da arte "crop" (só a ilustração, sem moldura) que `renderizacao-cartas/F03` vai
baixar — mas não baixa nada ela mesma.

O achado central da exploração do PRD é que o campo `password` do dataset local é, byte a byte, o `id` real
da carta na YGOPRODeck (verificado em 15 cartas distintas — Decisão 2): isso torna o casamento **por ID**
a via primária, confiável e sem ambiguidade, para 698 das 722 cartas (97%). Casamento por nome só é
necessário para o restante — nenhuma carta do piloto desta entrega cai nesse caminho, mas o código precisa
suportá-lo porque F07 (rollout completo) vai precisar.

### Incluído
- Cliente HTTP mínimo para `GET /api/v7/cardinfo.php` (por `id` e por `name`), com *rate limit* sequencial
- Parser puro que valida a resposta da API e a converte no formato interno de enriquecimento
- Script de I/O (`packages/data/scripts/enrich-cards.ts`) que orquestra: lê as cartas locais do piloto,
  resolve a chave de casamento (`password` → `id`, ou nome via arquivo de overrides), chama a API, grava
  `cards-data/dados/enriquecimento-ygoprodeck.json` (atributo/nível/descrição) e
  `packages/data/generated/ygoprodeck-art-urls.json` (numero → URL da arte crop, consumido por F03)
- Suporte a lista de cartas-alvo configurável, para o mesmo script servir o piloto (esta entrega) e o
  rollout completo (F07, sessão futura) sem reescrita
- Relatório de execução: casadas, não-casadas, ambíguas

### Fronteiras
- Baixar a imagem em si é `renderizacao-cartas/F03` — esta feature só resolve a URL
- Rodar sobre as ~700 cartas restantes é `renderizacao-cartas/F07` (Seção 7 do PRD) — fora desta entrega
- Resolver manualmente os overrides de nome para as cartas sem `password` é trabalho de quem rodar F07, não
  algo que este script inventa

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | Piloto = 15 cartas: `001` Blue-eyes White Dragon (monstro/LIGHT/8), `002` Mystical Elf (monstro/LIGHT/4), `003` Hitotsu-me Giant (monstro/EARTH/4), `004` Baby Dragon (monstro/WIND/3), `006` Feral Imp (monstro/DARK/4), `050` Basic Insect (monstro/EARTH/2), `300` Kurama (monstro/WIND/3), `301` Legendary Sword (equipamento), `304` Axe of Despair (equipamento), `320` Stop Defense (magica), `330` Forest (magica), `670` Black Luster Ritual (ritual), `671` Zera Ritual (ritual), `681` House of Adhesive Tape (armadilha), `685` Acid Trap Hole (armadilha) — cobre os 5 tipos e uma variedade de atributos, e todas já foram verificadas manualmente contra a API (Decisão 2) | PRD F02 Capabilities ("~15-20 cartas representativas") + verificação manual durante o planejamento desta spec | confirmada |
| 2 | `password` do dataset local == `id` da YGOPRODeck, sem espaços — casamento primário por ID, não por nome | PRD F02 Capabilities, "Achado de exploração" | confirmada |
| 3 | Casamento por nome (`?name=`) só para cartas sem `password` (24 no catálogo inteiro, nenhuma no piloto) — exato, case-insensitive, com fallback para o arquivo de overrides `cards-data/dados/overrides-nomes-ygoprodeck.json` (mapa `numero` → `nome YGOPRODeck`) quando o nome local não bate | PRD F02 Capabilities | confirmada |
| 4 | `nivel` só é gravado quando `tipo` local é `monstro` — para os demais tipos, `nivel` sai `null` mesmo que a API retorne um `level` (spell/trap não tem nível no TCG, então a API nunca retorna nesse caso, mas o código não confia nisso: filtra pelo `tipo` local) | Invariante já travado em `CardSchema.superRefine` (F01) | confirmada |
| 5 | Rate limit: 1 requisição a cada 300ms, sequencial, sem paralelismo | PRD F02 Capabilities | confirmada |
| 6 | URL da arte crop fica num artefato **gerado** (`packages/data/generated/ygoprodeck-art-urls.json`, gitignored, como `arts-manifest.json`), não em `cards-data/dados/`: é um ponteiro de download efêmero, não dado canônico do catálogo — `renderizacao-cartas/F03` o lê e descarta após baixar | Adaptação técnica desta spec: `CardEnrichmentEntrySchema` (F01, `strictObject`) não tem campo de URL, e misturar "dado canônico" com "ponteiro de download" no mesmo arquivo versionado quebraria essa fronteira | confirmada |
| 7 | Script idempotente: rodar de novo sobre uma carta já presente na tabela sobrescreve a entrada com o resultado mais recente da API (não pula silenciosamente) — permite re-rodar depois de a API corrigir um dado | Não especificado no PRD; escolha técnica desta spec, documentada aqui em vez de perguntada (baixo risco, reversível) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/src/ygoprodeck/types.ts` | data | novo | `YgoprodeckCardResponseSchema` (zod, campos usados apenas: `id`, `name`, `attribute`, `level`, `desc`, `card_images`), `YgoprodeckMatch` |
| `packages/data/src/ygoprodeck/parse-match.ts` | data | novo | `parseYgoprodeckMatch(numero, tipo, response) -> Result<YgoprodeckMatch, DomainError>`, pura |
| `packages/data/src/ygoprodeck/parse-match.test.ts` | data | novo | testes unitários do parser |
| `packages/data/src/ygoprodeck/index.ts` | data | novo | reexporta o módulo |
| `packages/data/scripts/ygoprodeck-client.ts` | data | novo | `fetchById(id)`, `fetchByName(name)` — único lugar com `fetch()` real, com *rate limit* e timeout |
| `packages/data/scripts/enrich-cards.ts` | data | novo | orquestração de I/O: lê `dados/*.json` + overrides, casa, chama o cliente, grava os dois artefatos, imprime relatório |
| `packages/data/scripts/enrich-cards.test.ts` | data | novo | testes do orquestrador com cliente HTTP stubado (stub só em teste, nunca em produção) |
| `cards-data/dados/overrides-nomes-ygoprodeck.json` | dados | novo | mapa vazio (`{}`) nesta entrega — infraestrutura para F07 |

**Verificação da direção de dependências:** tudo em `packages/data`, que já depende só de `@yugioh/shared`.
`fetch()` fica isolado em `packages/data/scripts/ygoprodeck-client.ts` — o único arquivo desta feature com
I/O de rede, seguindo o mesmo padrão que já isola leitura de disco em `scripts/ingest-cards.ts` (spec F01,
"domain cores are pure"). `packages/data/src/ygoprodeck/*` continua puro: recebe a resposta já desserializada,
nunca chama `fetch`.

## 3. Design Técnico

### Estruturas de dados

```
YgoprodeckMatch:
  numero: CardNumber
  atributo: Attribute | null       // null quando a API não informa (cartas sem atributo aplicável)
  nivel: number | null             // preenchido só quando tipo local é "monstro"
  descricao: string
  artCropUrl: string                // card_images[0].image_url_cropped

MatchOutcome = 
  | { kind: "matched", match: YgoprodeckMatch }
  | { kind: "unmatched", numero: CardNumber, reason: "no_password_no_override" | "not_found" | "ambiguous" | "http_error" | "invalid_response" }
```

### Fluxo

1. O script lê `cards-data/dados/*.json` (via o mesmo adapter de leitura que `ingest-cards.ts` já tem) e
   filtra pela lista de cartas-alvo (piloto = os 15 `numero` da Decisão 1; parametrizável para F07)
2. Lê `cards-data/dados/overrides-nomes-ygoprodeck.json` (ausente = `{}`, mesmo tratamento neutro de F01)
3. Para cada carta-alvo, na ordem de `numero` ascendente:
   a. Se `password` não for nulo: chama `fetchById(password sem espaços)`
   b. Se `password` for nulo: procura `overrides[numero]`; se ausente, marca `unmatched` com
      `no_password_no_override` e não chama a API; se presente, chama `fetchByName(overrides[numero])`
   c. Se a chamada falhar (rede/timeout) ou retornar vazio: marca `unmatched` (`http_error`/`not_found`)
   d. Se a API retornar mais de um resultado para o nome (só no caminho por nome): marca `unmatched`
      (`ambiguous`) sem escolher um dos dois
   e. Caso contrário, `parseYgoprodeckMatch` valida e converte a resposta; falha de validação também vira
      `unmatched` (`invalid_response`)
   f. Aguarda 300ms antes da próxima iteração (Decisão 5)
4. Ao final: funde os `matched` na tabela de enriquecimento existente (sobrescrevendo por `numero`, Decisão
   7), grava `cards-data/dados/enriquecimento-ygoprodeck.json` e
   `packages/data/generated/ygoprodeck-art-urls.json`, e imprime o relatório (contagem de casadas,
   não-casadas por motivo, lista de `numero` não-casados)

### Regras de negócio

- `nivel` só sai preenchido quando o `tipo` local da carta é `monstro` — decidido pelo dataset local, nunca
  pela API (Decisão 4)
- Casamento por `id` nunca é ambíguo por construção (é uma chave exata); só o caminho por nome pode retornar
  múltiplos resultados
- Um erro numa carta nunca aborta o lote — o script processa até o fim e reporta, mesmo que todas as cartas
  falhem

### Eventos
Não aplicável.

### Determinismo e pureza
`parseYgoprodeckMatch` é pura (sem I/O), testável sem rede. `ygoprodeck-client.ts` concentra o único
`fetch()` desta feature — o próprio parser nunca importa `fetch`/`node:*`.

## 4. Contratos

### Tipos e schemas (`packages/data/src/ygoprodeck`)

```ts
// Só os campos que este projeto usa — a resposta real da API tem muitos outros.
export const YgoprodeckCardResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  attribute: z.string().optional(),
  level: z.number().int().optional(),
  desc: z.string(),
  card_images: z.array(z.object({ image_url_cropped: z.string().url() })).min(1),
});
```

### Funções públicas

```
parseYgoprodeckMatch(
  numero: CardNumber,
  tipo: CardType,
  response: YgoprodeckCardResponseSchema,
): Result<YgoprodeckMatch, DomainError>
// atributo: response.attribute mapeado para o enum local; ausente ou fora do enum -> null (não é erro)
// nivel: response.level quando tipo === "monstro", senão null
// descricao: response.desc (nunca vazia — a API sempre retorna algo)
// artCropUrl: response.card_images[0].image_url_cropped
```

```
fetchById(id: number): Promise<Result<YgoprodeckCardResponseSchema[], DomainError>>
fetchByName(name: string): Promise<Result<YgoprodeckCardResponseSchema[], DomainError>>
// GET https://db.ygoprodeck.com/api/v7/cardinfo.php?id={id} | ?name={name}
// resposta 400/"No card matching your query" -> ok([]) (não é erro de transporte, é "não encontrada")
// timeout (10s) ou erro de rede -> err(DomainError "http_error")
```

### Endpoints / RPC / mensagens de rede

```
GET https://db.ygoprodeck.com/api/v7/cardinfo.php?id=89631139
```
```json
{
  "data": [
    {
      "id": 89631139,
      "name": "Blue-Eyes White Dragon",
      "type": "Normal Monster",
      "attribute": "LIGHT",
      "level": 8,
      "desc": "This legendary dragon is a powerful engine of destruction...",
      "card_images": [{ "image_url_cropped": "https://images.ygoprodeck.com/images/cards_cropped/89631139.jpg" }]
    }
  ]
}
```

### Contratos externos (cross-PRD)
Nenhum — API pública de terceiros, não um módulo interno do projeto.

## 5. Modelo de Dados

### Arquivos de dados versionados

`cards-data/dados/enriquecimento-ygoprodeck.json` (já schematizado por F01) recebe as 15 entradas do piloto.

`cards-data/dados/overrides-nomes-ygoprodeck.json` (novo, versionado):
```json
{}
```
Vazio nesta entrega — nenhuma carta do piloto precisa dele (Decisão 1). Schema: `Record<CardNumber, string>`.

### Artefato gerado (não versionado)

`packages/data/generated/ygoprodeck-art-urls.json`:
```json
{ "001": "https://images.ygoprodeck.com/images/cards_cropped/89631139.jpg" }
```
Gitignored, como `cards.json`/`arts-manifest.json`. Consumido e descartado por F03.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Carta sem `password` e sem entrada em overrides | Verificação local, sem chamar a API | `unmatched: no_password_no_override`, script continua | N/A (build-time) |
| API retorna vazio (`data: []` ou 400) | Resposta da API | `unmatched: not_found` | N/A |
| Timeout (10s) ou erro de rede | `fetch` rejeita ou não responde | `unmatched: http_error`, script continua para a próxima carta | N/A |
| Nome bate com mais de uma carta na API | `response.data.length > 1` no caminho por nome | `unmatched: ambiguous`, nunca escolhe a primeira | N/A |
| Resposta não bate com `YgoprodeckCardResponseSchema` | `parseYgoprodeckMatch` | `unmatched: invalid_response`, card não é gravado | N/A |
| `overrides-nomes-ygoprodeck.json` existe mas é JSON inválido ou foge do schema | Leitura no início do script | Script aborta antes de qualquer chamada de rede — mesmo tratamento de F01 §6 para o arquivo de enriquecimento corrompido | N/A |

## 7. Estratégia de Testes

### Unitários (Vitest)

`packages/data/src/ygoprodeck/parse-match.test.ts`:
- `mapeia attribute e level quando tipo é monstro`
- `zera nivel quando tipo não é monstro, mesmo com level presente na resposta`
- `usa null para atributo quando a resposta não informa attribute`
- `usa null para atributo quando o valor não bate com o enum dos 7 padrão`
- `extrai artCropUrl do primeiro item de card_images`
- `retorna erro quando a resposta não tem card_images`

`packages/data/scripts/enrich-cards.test.ts` (cliente HTTP stubado — stub só em teste):
- `casa por id quando a carta tem password`
- `casa por nome via override quando a carta não tem password`
- `marca no_password_no_override quando não há password nem override`
- `marca ambiguous quando o nome retorna mais de um resultado, sem escolher nenhum`
- `marca http_error e continua para a próxima carta quando uma chamada falha`
- `sobrescreve uma entrada existente na tabela ao rodar de novo (idempotência da Decisão 7)`
- `grava só os numero presentes na lista-alvo, mesmo com mais cartas no dataset local`

### Property-based (fast-check)
Não aplicável — sem determinismo de motor nem round-trip de estado.

### Integração
- Nenhum teste desta feature chama a API real (rede real é frágil em CI); a suíte de integração fica para
  uma verificação manual documentada no `plan.md` (rodar o script de verdade contra o piloto).

### Análise estática
Não aplicável.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| Rodar o script sobre as cartas do piloto preenche atributo/nivel/descricao para toda carta com nome batendo exata ou via override | Execução manual real documentada no plan.md, Fase 3 |
| Cartas sem correspondência aparecem no relatório de não-casadas, não silenciosamente ignoradas | `marca no_password_no_override...`, `marca ambiguous...`, `marca http_error...` |
| Rodar o script duas vezes seguidas sobre o mesmo conjunto não altera o resultado da segunda vez | `sobrescreve uma entrada existente...` (mesmo resultado determinístico dado o mesmo mock) |
| API fora do ar numa carta não interrompe o processamento das demais | `marca http_error e continua...` |

### Testes de integração cross-feature e cross-PRD
| Critério | Teste |
|----------|-------|
| `enriquecimento-ygoprodeck.json` produzido aqui é consumido corretamente pela mescla de F01 | Execução manual real: rodar `enrich-cards` e depois `data:ingest`, conferir `cards.json` (Fase 3 do plan.md) |
