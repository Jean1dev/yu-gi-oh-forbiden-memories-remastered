# Extensão do Schema de Carta

> PRD: `docs/prds/renderizacao-cartas.md` — F01
> Pacote-alvo: `packages/shared` + `packages/data`

## 1. Contexto e Escopo

Esta feature adiciona os três campos que faltam no `CardSchema` para o `CardFrame` (F04/F05) poder
desenhar uma carta sem imagem achatada: `atributo`, `nivel` e `descricao`. Nenhum desses campos existe
hoje em `packages/shared/src/card/schema.ts` nem nos arquivos-fonte `cards-data/dados/NNN.json`.

O ponto central desta spec é **onde os valores enriquecidos entram no pipeline**. `cards-data/dados/*.json`
é o registro canônico do jogo (fiel ao PS1) e nenhuma feature deste PRD deve escrevê-lo parcialmente:
722 arquivos, e só o piloto (~15-20 cartas, F02/F03) vai ter dado de enriquecimento na primeira entrega.
Se os três campos fossem obrigatórios em `SourceCardSchema` (`strictObject`, sem campos opcionais —
`packages/data/src/ingestion/envelope.ts`), a ingestão inteira quebraria para as ~700 cartas ainda não
migradas. A spec resolve isso tratando o enriquecimento como **uma tabela auxiliar separada**, no mesmo
espírito das já existentes e pendentes do projeto (`fusions.json`, matriz de Guardiões, terrenos, drops —
`docs/arquitetura.md`): um arquivo `cards-data/dados/enriquecimento-ygoprodeck.json` (`numero` → dados),
gerado por F02/F07 e consumido no fim do pipeline de ingestão, nunca escrito de volta em `dados/NNN.json`.
Isso mantém o dataset fonte imutável e faz o pipeline continuar validando as 722 cartas em qualquer ponto
do rollout, com os três campos novos simplesmente `null` para quem ainda não tem entrada na tabela.

### Incluído
- `atributo` (enum fechado dos 7 valores padrão do TCG), `nivel` (inteiro 1-12, só para `tipo = monstro`)
  e `descricao` (string) em `CardSchema`, todos `nullable`, seguindo o padrão de `atk`/`def`
- Schema e loader da tabela auxiliar de enriquecimento (`cards-data/dados/enriquecimento-ygoprodeck.json`),
  vazia por padrão (nenhuma entrada) até F02 escrever nela
- Função pura que mescla uma entrada de enriquecimento num `Card` já normalizado
- Wiring da mescla dentro de `ingestSource` (`packages/data/src/ingestion/ingest-source.ts`), sem quebrar
  o caminho de nenhuma carta que não tenha entrada na tabela

### Fronteiras
- Buscar os valores reais (chamar a API do YGOPRODeck) é F02, não esta feature — F01 só garante que o
  schema aceita e o pipeline mescla os valores, com uma tabela vazia
- Escrever a tabela para o piloto é F02; F01 só cria o schema/loader que lê essa tabela

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | Enriquecimento vive numa tabela auxiliar separada (`enriquecimento-ygoprodeck.json`), nunca escrito em `dados/NNN.json` | Adaptação técnica desta spec — evita quebrar `SourceCardSchema.strictObject` para as ~700 cartas ainda não migradas; segue o precedente de `fusions.json`/matriz de Guardiões já pendentes no projeto | confirmada |
| 2 | Enum de `atributo`: `DARK, LIGHT, EARTH, WATER, FIRE, WIND, DIVINE` — os 7 valores padrão do TCG real, cobrindo o que a YGOPRODeck retorna | PRD F01 Capabilities + domínio do jogo (não é uma tabela de lore pendente como Guardiões/Terrenos — são os atributos padrão do TCG) | confirmada |
| 3 | `nivel`: inteiro 1-12 (intervalo real de nível de monstro no TCG); obrigatoriamente `null` quando `tipo != monstro` | PRD F01 Capabilities | confirmada |
| 4 | Tabela de enriquecimento vazia (nenhuma entrada) é o estado inicial válido — todo card com `atributo/nivel/descricao = null` até ter entrada | Fase 0.4 do spec-writer (nunca inventar dado de tabela auxiliar) | confirmada |
| 5 | Nome do arquivo: `cards-data/dados/enriquecimento-ygoprodeck.json`, ao lado dos `NNN.json` — versionado no git (não é `packages/data/generated/`, que é gitignored: o enriquecimento é dado de origem, não artefato de build) | Segue o precedente de `cards-data/dados/` como diretório de dados-fonte versionados | confirmada |
| 6 | `atributo`/`nivel`/`descricao` são campos **opcionais** (`?:`) no tipo `Card`, e `.nullish()` (aceita `undefined` OU `null`) no `CardSchema` — não apenas `.nullable()` com chave obrigatória | Descoberta durante a implementação: ~85 arquivos em todo o monorepo já constroem literais `Card` para teste sem os campos novos; torná-los obrigatórios quebraria o typecheck de `packages/rules`, `packages/engine` e `apps/web` — um raio de explosão incompatível com o Objetivo 4 do PRD ("não regredir cartas ainda não migradas"). Código de produção (`normalizeCard`, `applyEnrichment`, `toCanonicalRecord`) sempre atribui `null` explicitamente, nunca omite a chave — `cards.json` mantém as 3 chaves em todo registro | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/card/constants.ts` | shared | alterado | adiciona `CARD_ATTRIBUTES`, `MIN_MONSTER_LEVEL`/`MAX_MONSTER_LEVEL`, atualiza `CARD_FIELD_ORDER` |
| `packages/shared/src/card/schema.ts` | shared | alterado | adiciona `AttributeSchema`; estende `CardSchema` com `atributo`/`nivel`/`descricao` + regra `nivel` só para monstro |
| `packages/shared/src/card/types.ts` | shared | alterado | adiciona `Attribute` ao `Card` |
| `packages/shared/src/card/schema.test.ts` | shared | novo | testes unitários do schema estendido |
| `packages/data/src/ingestion/enrichment.ts` | data | novo | `CardEnrichmentEntrySchema`, `CardEnrichmentTableSchema`, `applyEnrichment(card, entry) -> Card` |
| `packages/data/src/ingestion/enrichment.test.ts` | data | novo | testes da mescla |
| `packages/data/src/ingestion/ingest-source.ts` | data | alterado | `IngestionInput` ganha `enrichment?: CardEnrichmentTable`; mescla antes de `candidates.push` |
| `packages/data/src/ingestion/ingest-source.test.ts` | data | alterado | casos novos: carta com/sem entrada de enriquecimento |
| `packages/data/src/ingestion/index.ts` | data | alterado | exporta o módulo `enrichment.ts` |
| `packages/data/scripts/ingest-cards.ts` | data | alterado | lê `cards-data/dados/enriquecimento-ygoprodeck.json` (se existir; ausência = tabela vazia) e passa para `ingestSource` |

**Verificação da direção de dependências:** `packages/shared` não importa nada — raiz do grafo, como hoje.
`packages/data` continua importando só `@yugioh/shared`, nenhuma inversão. Nenhum arquivo tocado é
`packages/engine`/`packages/rules`/`packages/ai` — portão "engine puro" não se aplica a esta feature.

## 3. Design Técnico

### Estruturas de dados

```
Attribute = "DARK" | "LIGHT" | "EARTH" | "WATER" | "FIRE" | "WIND" | "DIVINE"

Card (estendido, os 3 campos novos opcionais — Decision 6):
  ...campos existentes...
  atributo?: Attribute | null   // ausente/null = ainda não enriquecida, ou carta sem atributo aplicável
  nivel?: number | null         // 1-12 quando tipo=monstro; sempre null/ausente em outros tipos
  descricao?: string | null     // ausente/null = ainda não enriquecida

CardEnrichmentEntry:
  atributo: Attribute | null
  nivel: number | null
  descricao: string | null

CardEnrichmentTable = Record<CardNumber, CardEnrichmentEntry>   // chave = numero, "001".."722"
```

### Fluxo

1. `ingestSource` normaliza cada registro-fonte em `Card` como hoje (sem os 3 campos novos preenchidos —
   `normalizeCard` continua sem tocar neles, eles nascem `null` por não estarem em `SourceCardSchema`)
2. Depois de `normalizeCard` ter sucesso e antes de `candidates.push`, se `input.enrichment[numero]`
   existir, `applyEnrichment(card, input.enrichment[numero])` substitui `atributo`/`nivel`/`descricao` pelos
   valores da entrada; caso contrário o card segue com os 3 campos `null`
3. `applyEnrichment` revalida o resultado contra `CardSchema` (mesma disciplina de `normalizeCard`) — uma
   entrada de enriquecimento inválida (ex.: `nivel` fora de 1-12) descarta só aquela mescla e devolve o
   `Card` original sem os campos aplicados, reportando o problema (ver Seção 6), nunca derruba a ingestão
   inteira
4. `packages/data/scripts/ingest-cards.ts` (adapter de I/O) lê `enriquecimento-ygoprodeck.json` do disco se
   existir; se o arquivo não existir, passa `{}` — ausência do arquivo inteiro é um estado válido, não erro

### Regras de negócio

- `atributo` ∈ `CARD_ATTRIBUTES` (7 valores) ou `null` — nunca uma string livre
- `nivel` é inteiro entre 1 e 12 quando `tipo = "monstro"`; deve ser `null` quando `tipo != "monstro"`
  (regra validada via `.superRefine` no `CardSchema`, já que depende de dois campos)
- `descricao` é uma string não vazia quando presente, ou `null` — nunca string vazia (`""` inválido, mesmo
  padrão de "ausência é `null`, não string vazia" já usado em `atk`/`def`)
- A tabela de enriquecimento pode ter entradas para um subconjunto qualquer das 722 `numero` — não precisa
  cobrir todas, e uma entrada extra para um `numero` inexistente no catálogo é ignorada silenciosamente na
  mescla (não é erro de ingestão; é relatado pelo script de F02/F07, fora desta feature)

### Eventos
Não aplicável — feature não toca o motor de duelo nem o Effect System.

### Determinismo e pureza
Não aplicável (fora de `packages/engine`), mas `applyEnrichment` e a mescla dentro de `ingestSource`
continuam puras (sem I/O), preservando o pilar "domain cores are pure" — a leitura do arquivo de
enriquecimento do disco fica só em `packages/data/scripts/ingest-cards.ts`, o adapter, igual ao padrão já
usado para `availableArts`.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

```ts
export const CARD_ATTRIBUTES = ["DARK", "LIGHT", "EARTH", "WATER", "FIRE", "WIND", "DIVINE"] as const;
export const MIN_MONSTER_LEVEL = 1;
export const MAX_MONSTER_LEVEL = 12;

export const AttributeSchema = z.enum(CARD_ATTRIBUTES);

// CardSchema ganha, dentro do mesmo strictObject (Decision 6: nullish, não só nullable):
atributo: AttributeSchema.nullish(),
nivel: z.number().int().min(MIN_MONSTER_LEVEL).max(MAX_MONSTER_LEVEL).nullish(),
descricao: z.string().min(1).nullish(),
// + .superRefine: nivel != null && nivel != undefined exige tipo === "monstro"
```

### Funções públicas (`packages/data`)

```
applyEnrichment(card: Card, entry: CardEnrichmentEntry | undefined): Result<Card, DomainError>
// entry undefined -> ok(card) inalterado
// entry presente -> ok({...card, atributo, nivel, descricao}) revalidado contra CardSchema
// entry presente mas resultado inválido -> err(DomainError "invalid_enrichment_entry"), card original preservado pelo chamador
```

### Contratos externos (cross-PRD)
Nenhum — esta feature não depende de nada fora do próprio módulo.

## 5. Modelo de Dados

### Arquivos de dados versionados

`cards-data/dados/enriquecimento-ygoprodeck.json`:

```json
{
  "001": { "atributo": "LIGHT", "nivel": 8, "descricao": "This legendary dragon is a powerful engine of destruction..." },
  "300": { "atributo": "WIND", "nivel": 3, "descricao": "A vicious bird that attacks from the skies with its whip-like tail." }
}
```

Sem `version`/`hash` próprios nesta feature — a tabela participa do hash geral do dataset que
`banco-de-cartas/F10` já calcula sobre `cards.json`, não precisa de um mecanismo de versionamento paralelo.
Comportamento com tabela ausente/vazia: todo `Card` sai da ingestão com os 3 campos `null` (fallback
neutro), sem quebrar `data:validate`.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| `enriquecimento-ygoprodeck.json` não existe no disco | `ingest-cards.ts` checa existência antes de ler | Trata como tabela vazia (`{}`), ingestão segue normal | N/A (build-time, sem jogador envolvido) |
| Arquivo existe mas não é JSON válido | `JSON.parse` lança | Ingestão inteira aborta com `DomainError("invalid_enrichment_file")` — arquivo corrompido é um erro de build, não um dado parcial aceitável | N/A |
| Entrada de enriquecimento com `nivel` fora de 1-12, ou `nivel` presente com `tipo != monstro` | `applyEnrichment` revalida contra `CardSchema` | Mescla é descartada para aquela carta só; card mantém os 3 campos `null`; ingestão continua; entra no relatório de ingestão como `discardedEnrichment` | N/A |
| Entrada de enriquecimento para um `numero` que não existe no catálogo (arquivo com typo) | Mescla percorre `cards`, não `enrichment` — chave órfã nunca é visitada | Ignorada silenciosamente nesta feature (F02/F07 relatam órfãos no próprio script de enriquecimento, fora do escopo de F01) | N/A |
| `atributo` na entrada fora dos 7 valores do enum | Zod rejeita no parse da entrada | Mesmo tratamento do caso "nivel fora do intervalo" acima | N/A |

## 7. Estratégia de Testes

### Unitários (Vitest)

`packages/shared/src/card/schema.test.ts`:
- `aceita atributo null` — carta sem enriquecimento continua válida
- `aceita os 7 valores de atributo` — parametrizado sobre `CARD_ATTRIBUTES`
- `rejeita atributo fora do enum`
- `aceita nivel entre 1 e 12 quando tipo é monstro`
- `rejeita nivel fora do intervalo 1-12`
- `rejeita nivel preenchido quando tipo não é monstro`
- `aceita nivel null independente do tipo`
- `rejeita descricao vazia` (string `""`)
- `aceita descricao null`

`packages/data/src/ingestion/enrichment.test.ts`:
- `applyEnrichment mescla atributo/nivel/descricao quando a entrada existe`
- `applyEnrichment retorna o card original quando não há entrada para o numero`
- `applyEnrichment descarta a mescla e reporta erro quando o resultado viola o schema`

### Property-based (fast-check)
Não aplicável — sem determinismo de motor nem round-trip de estado de duelo envolvido nesta feature.

### Integração

`packages/data/src/ingestion/ingest-source.test.ts` (casos novos):
- `ingestSource preenche atributo/nivel/descricao para uma carta presente na tabela de enriquecimento`
- `ingestSource mantém atributo/nivel/descricao null para uma carta ausente da tabela`
- `ingestSource com tabela de enriquecimento vazia produz o mesmo resultado que sem o parâmetro` (equivalência ao comportamento atual — não regride nenhum teste existente)

### Análise estática
Não aplicável (fora de `packages/engine`/`packages/rules`).

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| `CardSchema` aceita `atributo`, `nivel` e `descricao` como `null` sem quebrar nenhuma carta existente | `packages/shared/src/card/schema.test.ts` + suíte completa de `packages/data` (regressão) |
| `nivel` preenchido para carta com `tipo != monstro` falha a validação | `rejeita nivel preenchido quando tipo não é monstro` |
| `atributo` fora dos 7 valores do enum falha a validação | `rejeita atributo fora do enum` |
| `data:validate`/`dataset-seal.json` continuam passando com os 3 campos novos presentes e nulos | Rodar `pnpm --filter @yugioh/data data:validate` sobre o dataset real (sem `enriquecimento-ygoprodeck.json` no piloto desta fase) como smoke check |

### Testes de integração cross-feature e cross-PRD
Nenhum nesta feature — F02/F03/F04/F05/F06 consomem o que F01 entrega, mas a integração deles é testada
nas próprias specs.
