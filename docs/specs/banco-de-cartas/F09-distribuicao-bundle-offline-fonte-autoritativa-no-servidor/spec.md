# Distribuição: Bundle Offline + Fonte Autoritativa no Servidor

> PRD: `docs/prds/banco-de-cartas.md` — F09
> Pacote-alvo: `packages/data` (+ contratos para `apps/web` e `apps/server`)

## 1. Contexto e Escopo

F09 é a Wave 5 do Banco de Cartas (PRD §8): depois de F03-F08 já terem catálogo, artes e tabelas auxiliares carregáveis, esta feature reúne esses insumos em um **único payload de distribuição** para que o cliente jogue offline e o servidor online carregue a mesma fonte autoritativa. O desenho segue o pilar data-driven de `docs/arquitetura.md` §1 e §4: consumidores não leem `cards-data/` nem tabelas auxiliares soltas, e o servidor nunca confia em atributos de carta enviados pelo cliente.

Esta spec separa duas responsabilidades que o PRD menciona juntas: F09 monta o **conteúdo canônico do pacote**; F10 atribui `version`, `hash`, verificação de integridade, handshake online e persistência da versão. A separação respeita o grafo do PRD, em que F10 depende de F09, e reaproveita a garantia de saída byte-determinística já definida por F01.

### Incluído

- Montagem de um payload único contendo catálogo de F03, manifesto/resolução de artes de F04 e tabelas de F05-F08.
- Inclusão explícita de tabelas auxiliares pendentes como estruturas schema-válidas, possivelmente vazias, sem quebrar o pacote.
- API pura em `packages/data` para criar, validar estruturalmente e carregar o payload de distribuição.
- Script de build `data:package` que lê os artefatos e fontes atuais, monta o payload e falha se catálogo ou artes obrigatórios estiverem ausentes.
- Contrato para o cliente offline carregar o pacote embarcado/cacheado sem rede depois da instalação do PWA.
- Contrato para o servidor autoritativo carregar o mesmo pacote e validar referências de carta por `numero`, ignorando ou rejeitando atributos vindos do cliente.

### Fronteiras

- **Versão, hash, assinatura do pacote e handshake cliente-servidor** → F10. F09 preserva serialização determinística e superfície de carregamento, mas não calcula a identidade criptográfica final.
- **Regras de duelo, fusão, Guardiões, terreno e drops** → `packages/rules`, `packages/engine`, Campanha e Free Duel. F09 só transporta os dados; não calcula efeitos, não sorteia drops e não usa PRNG.
- **Valores oficiais pendentes** de fusões, Guardiões, terreno e drops → dado externo. F09 empacota o que existir, inclusive `[]`, e registra cobertura quando os subsistemas já expõem relatório.
- **Servidor Online completo** → `apps/server`, ainda ausente no workspace. F09 define a porta que esse servidor deve consumir; não cria matchmaking, WebSocket ou sessão de duelo.
- **Service worker/PWA completo** → `apps/web`/ADR-004. F09 fornece o manifesto de assets que o PWA deve precachear; a política completa de atualização do app shell continua na camada web.

### Contratos externos assumidos

- **F03-F08 do próprio PRD** — já possuem specs e implementação principal em `packages/data`. F09 assume seus contratos públicos: `CardCatalog`, `ArtResolver`, `FusionTable`, `GuardianMatrix`, `TerrainClassTable` e `DropTable`.
- **`apps/server` / Online Duel** — contrato futuro: carregar `VersionedDataPackage` de F10, aceitar ações de duelo só depois do handshake de F10 e resolver toda carta pelo `numero` contra o pacote autoritativo.
- **`apps/web` / PWA** — contrato futuro: disponibilizar o payload assinado de F10 e os assets de arte para cache offline, sem duplicar schema de carta nem tabelas auxiliares.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | O payload de F09 é JSON canônico e não compactado inicialmente. ZIP, brotli dedicado ou empacotamento binário ficam para otimização posterior, porque 722 cartas e tabelas vazias/parciais cabem confortavelmente em um artefato legível e testável. | PRD F09 Capabilities; F01 spec Decisão 12; ADR-003 | confirmada |
| 2 | As artes **não** são embutidas como base64 no JSON. O pacote carrega `artsManifest` e uma lista ordenada de assets com `numero`, caminho de origem e URL web; F10 calcula digest por arquivo de arte. Isso evita inflar o JSON e preserva o endpoint existente `/cards-data/NNN.jpg` de `apps/web`. | `apps/web/src/app/cards-data/[file]/route.ts`; `docs/arquitetura.md` §7 | confirmada |
| 3 | Tabelas pendentes viajam dentro do payload como arrays/objetos válidos, mesmo vazios. Ausência de valor oficial não é erro de F09; schema inválido ou referência inválida já deve ter falhado em F05-F08. | `docs/arquitetura.md` §4.3; ADR-003 `[PRECISA DE ENTRADA]` | pendente — aguarda dados oficiais |
| 4 | F09 produz `data-package.payload.json` em `packages/data/generated/`; F10 lê esse arquivo e emite o pacote final com `version`/`hash`. O payload intermediário continua não versionado em git, como os demais artefatos derivados. | F01/F02 specs sobre `generated/`; PRD §8 F09→F10 | confirmada |
| 5 | O servidor autoritativo recebe do cliente apenas identidades (`numero`, ids de zona, ações) como dados confiáveis. Se um payload defensivo trouxer `atk`, `def`, `tipo`, `classe` ou outros atributos de carta, o servidor compara com o pacote autoritativo; divergência rejeita a ação e gera log de adulteração. | PRD F09 Error Handling; `docs/arquitetura.md` §6; ADR-007 | confirmada |
| 6 | `packages/data` continua sendo read-only em runtime. O pacote pode ser carregado várias vezes em testes, mas a instância pública é congelada e não expõe mutadores. | F03 spec Decisão 1/6; TypeScript guidelines §1.1/§3.3 | confirmada |
| 7 | O payload de F09 não inclui `ingestion-report.json`, `validation-report.json`, relatórios de cobertura nem timestamps. Esses arquivos são evidência de processo; incluir timestamp quebraria o hash de F10 sem alterar dado de jogo. | F01 spec Decisão 12; F02 spec Decisão 7 | confirmada |
| 8 | O roster de duelistas (`packages/data/data/roster.json`) não entra no escopo de F09 do Banco de Cartas. Free Duel F01 pode futuramente estender o bundle, mas esta feature empacota apenas o que o PRD F09 consome: catálogo, artes e F05-F08. | PRD F09 Consumes; PRD §7 Fora de Escopo | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/data/src/distribution/types.ts` | data | novo | Tipos `DataPackagePayload`, `DataPackageContents`, `PackagedArtAsset`, `AuthoritativeCardCheck` |
| `packages/data/src/distribution/schema.ts` | data | novo | Schemas zod do payload lido de disco/rede |
| `packages/data/src/distribution/create-data-package-payload.ts` | data | novo | Núcleo puro que recebe catálogo/tabelas já carregados e monta o payload congelado |
| `packages/data/src/distribution/serialize-data-package-payload.ts` | data | novo | Serialização canônica do payload, sem timestamp e com chaves/arrays em ordem estável |
| `packages/data/src/distribution/load-data-package-payload.ts` | data | novo | Reparse do payload e reconstrução das APIs read-only em memória |
| `packages/data/src/distribution/validate-authoritative-card.ts` | data | novo | Validação defensiva de `numero` e atributos de carta enviados por consumidores online |
| `packages/data/src/distribution/index.ts` | data | novo | Export público do subsistema de distribuição |
| `packages/data/scripts/build-data-package.ts` | data | novo | CLI `data:package`: carrega F03-F08, monta `data-package.payload.json` |
| `packages/data/scripts/load-data-package-payload-from-disk.ts` | data | novo | Adaptador Node para `@yugioh/data/distribution/disk`, usado por testes e futuro `apps/server` |
| `packages/data/package.json` | data | alterado | Exports `./distribution`, `./distribution/disk` e script `data:package` |
| `turbo.json` | raiz | alterado | Task `data:package` dependente de validação do catálogo e tabelas auxiliares |
| `apps/web/src/lib/data-package/load-embedded-data-package.ts` | web | novo | Adaptador de consumo do pacote assinado de F10 no cliente/PWA, sem recriar schema |
| `apps/web/src/lib/data-package/art-precache-manifest.ts` | web | novo | Deriva URLs de arte a partir de `packagedArts`, para o service worker/cache offline |
| `packages/data/tests/distribution.integration.test.ts` | data | novo | Integração contra os artefatos reais gerados por F01-F08 |
| `packages/data/src/distribution/*.test.ts` | data | novo | Unitários do payload, serialização e validação autoritativa |

**Verificação da direção de dependências:** `packages/data` importa apenas `@yugioh/shared` e seus próprios subsistemas (`catalog`, `art`, `fusion`, `guardian-stars`, `terrain`, `drops`). `apps/web` consome `packages/data` e `packages/shared`, o que é permitido para uma app. `apps/server` será consumidor futuro, não dependência. Nenhum import novo de `rules`, `engine`, `ai`, React ou Supabase entra em `packages/data`, preservando `shared ← data ← rules ← engine ← ai` de `docs/arquitetura.md` §2.

## 3. Design Técnico

### Estruturas de dados

`DataPackagePayload` é o artefato de conteúdo de F09, ainda sem identidade de F10:

```ts
type DataPackagePayload = Readonly<{
  schemaVersion: 1;
  contents: DataPackageContents;
}>;
```

`DataPackageContents`:

| Campo | Tipo | Semântica |
|---|---|---|
| `cards` | `readonly Card[]` | As 722 cartas do catálogo de F03, em `numero` crescente |
| `artsManifest` | `ArtManifest` | Mapa `numero -> caminho` produzido por F01/F04 |
| `packagedArts` | `readonly PackagedArtAsset[]` | Lista ordenada de artes que devem viajar/cachear com o pacote |
| `fusions` | `readonly FusionRecipe[]` | Receitas listadas por F05, hoje possivelmente `[]` |
| `guardianStars` | `readonly GuardianMatrixEntry[]` | Entradas listadas por F06, hoje possivelmente `[]` |
| `terrainClasses` | `readonly TerrainClassRule[]` | Regras listadas por F07, hoje possivelmente `[]` |
| `drops` | `readonly DropPool[]` | Pools listados por F08, hoje possivelmente `[]` |
| `requiredTables` | `readonly string[]` | Sempre `["cards","artsManifest","fusions","guardianStars","terrainClasses","drops"]`, usado por validação estrutural |

`PackagedArtAsset`:

```ts
type PackagedArtAsset = Readonly<{
  numero: CardNumber;
  sourcePath: string; // ex.: "cards-data/001.jpg"
  webPath: string;    // ex.: "/cards-data/001.jpg"
  mimeType: "image/jpeg";
}>;
```

`AuthoritativeCardCheck`:

```ts
type AuthoritativeCardCheck =
  | { ok: true; card: Card }
  | { ok: false; code: "unknown_card_number"; numero: string }
  | { ok: false; code: "card_attribute_mismatch"; numero: CardNumber; fields: readonly string[] };
```

### Fluxo

1. **Carregar o catálogo selado.** `build-data-package.ts` usa `loadCatalogFromDisk` de F03. Falha ou selo inválido aborta o empacotamento.
2. **Carregar tabelas auxiliares.** O script chama os loaders de F05-F08 com o catálogo carregado. Tabelas vazias são sucesso; schema inválido, duplicatas ou referência de `numero` inexistente abortam.
3. **Derivar artes empacotáveis.** A partir do `artsManifest`, monta `packagedArts` ordenado por `numero`, convertendo caminhos repo-relativos para URLs web. `artsManifest` continua sendo a verdade de existência; `webPath` é só a coordenada de entrega.
4. **Montar o payload.** `createDataPackagePayload` recebe estruturas já validadas e produz `DataPackagePayload` congelado. O array `cards` vem de todos os tipos do catálogo, reordenado por `numero`, para evitar depender da ordem de iteração por tipo.
5. **Validar completude estrutural.** `DataPackagePayloadSchema` exige `cards.length === 722`, `artsManifest` não vazio, `packagedArts` coerente com o manifesto e presença de todas as tabelas em `requiredTables`.
6. **Serializar deterministicamente.** `serializeDataPackagePayload` normaliza chaves e arrays e escreve `packages/data/generated/data-package.payload.json` com newline final. Nenhum timestamp entra no arquivo.
7. **Consumir no cliente.** `apps/web` carrega o pacote final produzido por F10. Depois do primeiro carregamento/cache do PWA, o cliente consegue recriar catálogo, resolvedor de artes e tabelas sem rede.
8. **Consumir no servidor.** O futuro `apps/server` carrega o mesmo pacote final de F10 no startup. Antes de aplicar qualquer ação online, resolve cada `numero` contra `getAuthoritativeCard`.

### Regras de negócio

- Catálogo e manifesto de artes são obrigatórios. Falta de `cards`, `artsManifest` ou `packagedArts` aborta o build.
- Tabelas de fusão, Guardiões, terreno e drops são obrigatórias como **chaves do pacote**, mas seus valores podem ser arrays vazios enquanto os dados oficiais não forem fornecidos.
- Nenhum atributo de carta vindo do cliente é autoridade. O servidor sempre resolve `numero` no pacote, e qualquer divergência em campos enviados defensivamente (`atk`, `def`, `tipo`, `classe`, `guardiao1`, `guardiao2`, `password`, `estrelas`) vira `card_attribute_mismatch`.
- O payload não altera `atk`/`def` base e não contém modificadores efetivos; cálculo de bônus continua em `rules`/`engine`.
- O payload de F09 não registra versão ou hash; qualquer comparação de paridade usa os contratos de F10.

### Determinismo e pureza

Esta feature não toca `packages/engine` e não usa PRNG. Os núcleos de `packages/data/src/distribution/**` são puros: mesma entrada de catálogo/tabelas produz o mesmo payload e os mesmos bytes serializados. I/O fica confinado aos scripts em `packages/data/scripts/**`, seguindo o padrão atual dos loaders de catálogo, fusões, terreno e drops.

## 4. Contratos

### Tipos e schemas (`packages/data`)

- `DataPackagePayloadSchema` — objeto estrito com `schemaVersion: 1` e `contents`.
- `DataPackageContentsSchema` — valida `cards`, `artsManifest`, `packagedArts`, `fusions`, `guardianStars`, `terrainClasses`, `drops` e `requiredTables`.
- `PackagedArtAssetSchema` — `numero` por `CardNumberSchema`, `sourcePath` não vazio, `webPath` começando com `/cards-data/`, `mimeType: "image/jpeg"`.
- Códigos de erro: `data_package_incomplete`, `data_package_table_unavailable`, `data_package_payload_invalid`, `unknown_card_number`, `card_attribute_mismatch`.

### Funções públicas

```ts
createDataPackagePayload(input: {
  catalog: CardCatalog;
  fusionTable: FusionTable;
  guardianMatrix: GuardianMatrix;
  terrainTable: TerrainClassTable;
  dropTable: DropTable;
}): Result<DataPackagePayload, DomainError>

serializeDataPackagePayload(payload: DataPackagePayload): string

loadDataPackagePayload(raw: unknown): Result<LoadedDataPackage, DomainError>

validateAuthoritativeCard(input: {
  dataPackage: LoadedDataPackage;
  numero: string;
  clientCard?: Partial<Card>;
}): AuthoritativeCardCheck
```

`LoadedDataPackage` expõe as mesmas superfícies read-only dos subsistemas originais:

```ts
type LoadedDataPackage = Readonly<{
  payload: DataPackagePayload;
  catalog: CardCatalog;
  artResolver: ArtResolver;
  fusionTable: FusionTable;
  guardianMatrix: GuardianMatrix;
  terrainTable: TerrainClassTable;
  dropTable: DropTable;
  getAuthoritativeCard(numero: CardNumber): Card | undefined;
}>;
```

### Exemplos JSON

Payload mínimo estrutural (trecho):

```json
{
  "schemaVersion": 1,
  "contents": {
    "cards": [
      {
        "id": 1,
        "numero": "001",
        "nome": "Blue-eyes White Dragon",
        "img": null,
        "classe": "Dragon",
        "atk": 3000,
        "def": 2500,
        "guardiao1": "Sun",
        "guardiao2": "Mars",
        "password": "89 63 11 39",
        "estrelas": 999999,
        "tipo": "monstro"
      }
    ],
    "artsManifest": {
      "001": "cards-data/001.jpg"
    },
    "packagedArts": [
      {
        "numero": "001",
        "sourcePath": "cards-data/001.jpg",
        "webPath": "/cards-data/001.jpg",
        "mimeType": "image/jpeg"
      }
    ],
    "fusions": [],
    "guardianStars": [],
    "terrainClasses": [],
    "drops": [],
    "requiredTables": ["cards", "artsManifest", "fusions", "guardianStars", "terrainClasses", "drops"]
  }
}
```

Validação autoritativa de ação online (contrato defensivo):

```json
{
  "numero": "001",
  "clientCard": {
    "atk": 9999,
    "tipo": "monstro"
  }
}
```

Resultado esperado:

```json
{
  "ok": false,
  "code": "card_attribute_mismatch",
  "numero": "001",
  "fields": ["atk"]
}
```

### Contratos externos (cross-PRD)

- **Online Duel / `apps/server`** deve chamar `validateAuthoritativeCard` antes de aceitar qualquer intent que referencie carta. O servidor pode aceitar payloads de ação que carreguem apenas `numero`; se vierem atributos redundantes, divergência é rejeitada e logada.
- **`apps/web` PWA** deve usar `packagedArts.webPath` como lista de assets de arte para cache. A falta de uma arte individual no cache cai no placeholder de F04, mas a falta do pacote JSON impede iniciar fluxos que dependem do catálogo.

## 5. Modelo de Dados

### Postgres / Supabase

Nenhuma tabela Postgres é criada por F09. A tabela `dataset_versions` e a persistência de versão no Save pertencem a F10 (`docs/arquitetura.md` §5.1).

### Cache local / fila offline

F09 não define store IndexedDB própria. O pacote é dado de aplicação, não progresso do jogador. `apps/web` pode armazenar a última cópia validada em CacheStorage/IndexedDB como detalhe de PWA, mas a chave de invalidação oficial será `version` + `hash` de F10.

### Arquivos de dados versionados

| Arquivo | Origem | Entra no payload? | Observação |
|---|---|---|---|
| `packages/data/generated/cards.json` | F01 | sim | 722 cartas canônicas |
| `packages/data/generated/arts-manifest.json` | F01/F04 | sim | Manifesto de existência de artes |
| `cards-data/*.jpg` | origem de assets | referenciado por `packagedArts` | Digest e integridade ficam em F10 |
| `packages/data/rules-data/fusions.json` | F05 | sim | Pode ser `[]` |
| `packages/data/generated/guardian-star-matrix.json` | F06 | sim | Pode ser `[]` |
| `packages/data/src/terrain/data/terrain-class-matrix.json` | F07 | sim | Pode ser `[]` |
| `packages/data/src/drops/data/drop-tables.json` | F08 | sim | Pode ser `[]` |
| `packages/data/generated/data-package.payload.json` | F09 | saída | Conteúdo único, sem versão/hash |

Relatórios (`ingestion-report`, `validation-report`, `fusion-validation-report`, cobertura de Guardiões) não entram no pacote; são evidência de processo.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Catálogo ausente, inválido ou não selado | `loadCatalogFromDisk` retorna erro | Aborta `data:package`; não escreve payload parcial | Não aplicável em build |
| Manifesto de artes ausente ou vazio | `DataPackagePayloadSchema` / checagem de completude | Aborta build com `data_package_incomplete` | Não aplicável em build |
| Tabela auxiliar vazia | Loader retorna tabela válida com contagem zero | Empacota a tabela vazia e mantém fallback neutro nos consumidores | Sem mensagem; mecânica consumidora mostra ausência/neutro quando aplicável |
| Tabela auxiliar malformada | Loader F05-F08 retorna `DomainError` | Aborta build com `data_package_table_unavailable` | Não aplicável em build |
| Arte listada no manifesto mas sem asset acessível | Checagem opcional de existência no script | Aborta quando a arte é obrigatória; se configurado como tolerado, F04 usa placeholder e F10 registra digest ausente como erro | Tela usa placeholder se a arte individual falhar após pacote válido |
| Cliente offline sem pacote cacheado | Loader web falha antes de reconstruir catálogo | Fluxos dependentes de carta ficam indisponíveis até o pacote existir | `Não foi possível carregar o pacote de cartas. Abra o jogo online uma vez para atualizar os dados.` |
| Cliente envia `numero` inexistente no online | `validateAuthoritativeCard` | Rejeita a ação antes de mudar estado | `Carta desconhecida no conjunto de dados.` |
| Cliente envia atributo forjado | Comparação campo a campo contra `Card` autoritativo | Rejeita a ação, registra `card_attribute_mismatch`, servidor mantém estado inalterado | `Ação recusada por dados de carta divergentes.` |
| Servidor não carrega pacote no startup | Loader de F10/F09 retorna erro | Servidor não aceita sessões online | `Modo online indisponível enquanto os dados de cartas carregam.` |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `createDataPackagePayload includes every required table key` — verifica que `requiredTables` sempre contém todas as tabelas de F09.
- `createDataPackagePayload rejects missing catalog cards` — catálogo vazio/sintético incompleto gera `data_package_incomplete`.
- `serializeDataPackagePayload is byte deterministic` — mesma entrada em ordens diferentes de objeto produz bytes idênticos.
- `loadDataPackagePayload rebuilds read-only APIs` — payload parseado permite consultas por catálogo, arte, fusão, Guardiões, terreno e drops.
- `validateAuthoritativeCard rejects unknown numero` — `numero` inexistente retorna `unknown_card_number`.
- `validateAuthoritativeCard rejects forged attributes` — divergência em `atk`, `def`, `tipo` ou `classe` retorna `card_attribute_mismatch` com campos listados.

### Property-based (fast-check)

- `payload serialization is stable for shuffled auxiliary arrays` — permutações de entradas equivalentes das tabelas produzem o mesmo JSON canônico depois da normalização.
- `authoritative card validation accepts exact client echoes` — para cartas geradas conforme `CardSchema`, qualquer subconjunto de campos com valores iguais ao autoritativo é aceito.

### Integração

- `data package builds from real generated artifacts` — roda depois de `data:validate`, carrega o catálogo real de 722 cartas e tabelas atuais, escreve `data-package.payload.json`.
- `empty pending tables travel without breaking the package` — com fusões/drops/Guardião/terreno vazios, o payload ainda é válido e consultável.
- `web adapter rebuilds catalog from embedded package` — `apps/web` consome o pacote sem ler `packages/data/generated/cards.json` diretamente.

### Análise estática

- `packages/data/src/distribution/**` não importa `node:fs`, `node:path`, `fetch`, React, Supabase, `rules`, `engine`, `ai`, `web` ou `server`.
- `apps/server` futuro deve depender de `@yugioh/data/distribution`, nunca o inverso.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| O pacote empacota catálogo + manifesto de artes + as 4 tabelas auxiliares | `data package builds from real generated artifacts` + snapshot estrutural de `requiredTables` |
| Tabelas pendentes viajam schema-válidas sem quebrar o pacote | `empty pending tables travel without breaking the package` |
| Cliente carrega o pacote embarcado e opera offline | `web adapter rebuilds catalog from embedded package`; teste PWA futuro valida CacheStorage |
| Servidor usa o mesmo pacote como fonte de verdade | Teste de contrato do loader de `apps/server` futuro usando `LoadedDataPackage` |
| `numero` inexistente é rejeitado | `validateAuthoritativeCard rejects unknown numero` |
| Atributo forjado é descartado/rejeitado em favor do autoritativo | `validateAuthoritativeCard rejects forged attributes` |
| Falta de tabela obrigatória aborta o empacotamento | `createDataPackagePayload includes every required table key` e caso negativo `data_package_incomplete` |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|----------|-------|
| Cross-Feature: F09 contém exatamente F03, F04 e F05-F08 | Integração compara contagem de cartas, manifesto e `listAll*` das tabelas com o payload serializado |
| Cross-Feature: F10 versiona esse pacote como unidade | Teste de F10 calcula hash sobre `data-package.payload.json` produzido por F09 |
| Cross-PRD: Online Duel só aceita dataset correspondente | Teste de contrato em F10/Online compara `DatasetIdentity` antes de abrir sessão |
| Cross-PRD: Library/Build Deck/Password continuam consumindo o catálogo único | Testes existentes desses módulos devem passar usando o loader de pacote como fonte alternativa ao loader de disco |
