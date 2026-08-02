# Versionamento e Integridade da Distribuição

> PRD: `docs/prds/banco-de-cartas.md` — F10
> Pacote-alvo: `packages/data` + `packages/shared` (+ contrato para `apps/server`, `apps/web` e Save)

## 1. Contexto e Escopo

F10 é a Wave 6 do Banco de Cartas e fecha o módulo como distribuição confiável: o payload único de F09 recebe uma **identidade de dataset** (`version`, `hash`, algoritmo e metadados), pode ser verificado no carregamento e passa a ser comparado no handshake do Online Duel antes de qualquer jogada. Esta feature implementa diretamente os pilares de paridade offline↔online de `docs/arquitetura.md` §1, §4.1 e §6, além da decisão de ADR-003 de que cliente e servidor devem usar o mesmo pacote versionado.

O escopo também define como Save registra a versão usada no progresso: F10 publica a identidade oficial do dataset e cria a tabela de catálogo de versões (`dataset_versions`); o módulo Save/Profiles, ainda não materializado no workspace, deve persistir `dataset_version` como referência auditável. As migrações de economia já usam colunas `dataset_version`, mas hoje elas são alimentadas por um valor provisório; F10 torna `DataPackageMetadata.dataset.version` a fonte oficial desse carimbo.

### Incluído

- Arquivo de versão explícita do dataset, versionado em git, para evitar usar timestamp de build como versão.
- Hash SHA-256 de conteúdo calculado sobre a serialização canônica do payload de F09, excluindo metadados voláteis.
- Digest SHA-256 de cada arte referenciada, para que a integridade cubra também assets binários que não são embutidos no JSON.
- Pacote final `data-package.json` com `metadata` + `payload`, e `data-package-metadata.json` para consumo leve.
- Verificação de integridade no carregamento: pacote corrompido/adulterado é recusado antes de reconstruir catálogo/tabelas.
- Schemas compartilhados de `DatasetIdentity` e mensagens de handshake online.
- Comparação cliente-servidor de `version` + `hash` antes de iniciar sessão online.
- Tabela `dataset_versions` em Supabase para registrar versões conhecidas/publicadas.
- Contrato para Save registrar `dataset_version` no progresso do jogador.

### Fronteiras

- **Conteúdo do pacote** → F09. F10 não decide quais tabelas entram, apenas assina/verifica o payload recebido.
- **Servidor Online completo** → `apps/server` futuro. F10 define schemas e função de comparação; não implementa WebSocket, matchmaking, reconexão ou aplicação de ações.
- **Módulo Save/Profiles completo** → cross-PRD ainda não materializado. F10 define contrato e tabela de versões; criar/alterar `profiles` só deve ocorrer quando o módulo dono existir.
- **Política de atualização do PWA** → `apps/web`/ADR-004. F10 fornece identidade e erro de pacote desatualizado; UX de atualização/cache pertence à app.
- **Correção dos valores pendentes** de fusões/Guardiões/terreno/drops → dado externo, fora desta feature. O hash muda quando esses arquivos forem preenchidos.

### Contratos externos assumidos

- **F09 — payload de distribuição**: `packages/data/generated/data-package.payload.json` existe e é serialização canônica do conteúdo.
- **Online Duel / `apps/server`**: deve enviar e receber `DatasetHandshakeMessage` antes de qualquer ação de duelo. A sessão só abre com identidade idêntica.
- **Save / Profiles**: deve persistir `dataset_version` como string não-vazia apontando para uma versão em `dataset_versions`; se a versão não existir mais, deve recusar carregamento automático e pedir migração/atualização.
- **Password/Economia**: geradores de seed e RPCs que gravam `dataset_version` devem usar `DataPackageMetadata.dataset.version`, não `dataset-seal.generatedAt`.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A versão é um identificador explícito mantido em `packages/data/dataset-version.json`, não um timestamp de build. Timestamp muda sem mudança de conteúdo e tornaria reprodutibilidade e auditoria piores. | PRD F10 Capabilities; F01/F02 specs excluem timestamps do hash | confirmada |
| 2 | `version` é string opaca não-vazia para o código, com recomendação de formato `YYYY.MM.DD[-N]` para humanos. O sistema não interpreta ordenação semântica; só compara igualdade. | TypeScript guidelines §1.2; necessidade de governança simples | confirmada |
| 3 | O hash do pacote é `sha256-<hex>` calculado sobre o **conteúdo canônico** de F09, excluindo `metadata.version`, `metadata.hash`, `generatedAt` e relatórios. Assim, mudança de conteúdo altera hash; mudança só de rótulo altera versão, mas não hash. | `docs/arquitetura.md` §4.1; ADR-003 | confirmada |
| 4 | O handshake online exige igualdade de **version e hash**. Mesmo conteúdo com versões diferentes é recusado, porque o PRD pede correspondência versão/hash e Save/economia registram versão para auditoria. | PRD F10 Capabilities/Error Handling; `docs/arquitetura.md` §6 | confirmada |
| 5 | Digest de artes entra em `metadata.artDigests` e no hash de conteúdo. Como as imagens não são embutidas no JSON de F09, sem digest por arquivo uma arte adulterada não seria detectada pelo hash. | PRD F10 "hash de conteúdo"; F09 Decisão 2 | confirmada |
| 6 | `dataset-seal.json` continua sendo o selo de F02 (`valid`, `generatedAt`) e não vira fonte de versão/hash. A identidade oficial vive em `data-package-metadata.json`. | F02 spec; separação F09/F10 | confirmada |
| 7 | `dataset_versions` é tabela pública de metadados de dataset, escrita por migração/seed de manutenção e lida por clientes autenticados/serviço. Ela não armazena o pacote inteiro. | `docs/arquitetura.md` §5.1; ADR-005 | confirmada |
| 8 | Save ainda não existe; F10 não cria uma tabela `profiles` ad hoc. A spec define a coluna/contrato que Save deve implementar quando o módulo for materializado. | `docs/arquitetura.md` §5.1; ausência local de `profiles` | contrato externo |
| 9 | Pacote com hash inválido falha fechado: cliente não reconstrói catálogo e servidor não aceita sessões online. Operar com dado suspeito é pior que ficar indisponível. | ADR-003; ADR-007 | confirmada |
| 10 | A seed de `card_prices.dataset_version` deve migrar de valor provisório para `DataPackageMetadata.dataset.version`. Isso é compatibilidade com specs de Password, não nova regra de economia. | `supabase/migrations/0010/0011`; specs password/F04 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/dataset-identity/schema.ts` | shared | novo | Schemas zod de `DatasetIdentity`, handshake e erros |
| `packages/shared/src/dataset-identity/types.ts` | shared | novo | Tipos compartilhados entre web, server e data |
| `packages/shared/src/dataset-identity/index.ts` | shared | novo | Export público dos contratos |
| `packages/shared/src/index.ts` | shared | alterado | Reexport dos contratos de identidade |
| `packages/data/dataset-version.json` | data | novo | Versão humana/autoral do dataset distribuído |
| `packages/data/src/integrity/types.ts` | data | novo | `DataPackageMetadata`, `VersionedDataPackage`, `IntegrityCheckResult` |
| `packages/data/src/integrity/schema.ts` | data | novo | Schemas zod do pacote final e metadados |
| `packages/data/src/integrity/calculate-package-hash.ts` | data | novo | SHA-256 do conteúdo canônico e digests de artes |
| `packages/data/src/integrity/sign-data-package.ts` | data | novo | Anexa metadata ao payload de F09 e produz pacote final |
| `packages/data/src/integrity/verify-data-package.ts` | data | novo | Recalcula hash/digests e recusa pacote corrompido |
| `packages/data/src/integrity/compare-dataset-identity.ts` | data | novo | Compara identidades para handshake |
| `packages/data/src/integrity/index.ts` | data | novo | Export público de integridade |
| `packages/data/scripts/sign-data-package.ts` | data | novo | CLI `data:sign`: lê payload F09, versão e artes; escreve pacote final/metadados |
| `packages/data/scripts/load-versioned-data-package-from-disk.ts` | data | novo | Loader Node com verificação de integridade antes de reconstruir F09 |
| `packages/data/package.json` | data | alterado | Exports `./integrity`, `./integrity/disk` e script `data:sign` |
| `turbo.json` | raiz | alterado | Task `data:sign` dependente de `data:package` |
| `supabase/migrations/0012_create_dataset_versions.sql` | supabase | novo | Tabela de versões publicadas do dataset |
| `supabase/migrations/0013_seed_dataset_version.sql` | supabase | novo/gerado | Seed da versão/hash atual em `dataset_versions` |
| `packages/data/src/integrity/*.test.ts` | data | novo | Unitários de hash, assinatura, verificação e comparação |
| `packages/shared/src/dataset-identity/*.test.ts` | shared | novo | Testes de schema do handshake |
| `packages/data/tests/integrity.integration.test.ts` | data | novo | Integração assinando/verificando pacote real |

**Verificação da direção de dependências:** `packages/shared` define apenas tipos e zod, sem importar `data`. `packages/data` importa `shared`, `node:crypto` e seus próprios módulos. `apps/web` e `apps/server` consomem os contratos compartilhados e o pacote `data`. Nenhum código de `engine` é tocado; nenhuma dependência de UI/rede entra em `packages/data`.

## 3. Design Técnico

### Estruturas de dados

`DatasetIdentity` (`packages/shared`):

```ts
type DatasetIdentity = Readonly<{
  version: string;
  hash: string; // "sha256-" + 64 hex chars
  hashAlgorithm: "sha256";
}>;
```

`DataPackageMetadata` (`packages/data`):

| Campo | Tipo | Semântica |
|---|---|---|
| `schemaVersion` | `1` | Versão do envelope de metadados |
| `dataset` | `DatasetIdentity` | Identidade comparada no handshake |
| `contentHash` | `string` | Mesmo valor de `dataset.hash`; repetido só se a implementação preferir nome explícito |
| `cardCount` | `722` | Guarda contra pacote com contagem errada |
| `artCount` | `number` | Quantidade de artes digeridas |
| `artDigests` | `Readonly<Record<CardNumber, string>>` | `sha256-<hex>` por JPG referenciado |
| `generatedAt` | `string` | ISO 8601, evidência de processo; excluído do hash |
| `sourcePayloadFile` | `string` | Caminho relativo do payload F09 usado |

`VersionedDataPackage`:

```ts
type VersionedDataPackage = Readonly<{
  metadata: DataPackageMetadata;
  payload: DataPackagePayload;
}>;
```

Mensagens de handshake (`packages/shared`):

```ts
type DatasetHandshakeClientHello = Readonly<{
  type: "dataset_client_hello";
  dataset: DatasetIdentity;
}>;

type DatasetHandshakeServerAccept = Readonly<{
  type: "dataset_server_accept";
  dataset: DatasetIdentity;
}>;

type DatasetHandshakeServerReject = Readonly<{
  type: "dataset_server_reject";
  code: "dataset_version_mismatch" | "dataset_hash_mismatch" | "dataset_identity_invalid";
  serverDataset: DatasetIdentity;
  clientDataset?: DatasetIdentity;
  message: string;
}>;
```

### Fluxo

1. **Definir versão.** O mantenedor edita `packages/data/dataset-version.json` antes de publicar um pacote. O schema aceita string opaca não-vazia; CI pode recomendar o padrão humano.
2. **Assinar o payload.** `data:sign` lê `data-package.payload.json` de F09, revalida o schema, lê `dataset-version.json` e calcula SHA-256 do conteúdo canônico.
3. **Digerir artes.** Para cada item de `packagedArts`, o script lê o JPG de `cards-data/`, calcula `sha256-<hex>` e inclui em `artDigests`. Arte ausente ou ilegível falha o pacote.
4. **Montar metadados.** `signDataPackage` cria `DataPackageMetadata` com `dataset.version`, `dataset.hash`, contagens e digests. `generatedAt` é registrado, mas fica fora da entrada do hash.
5. **Escrever artefatos finais.** O script grava `packages/data/generated/data-package.json` e `packages/data/generated/data-package-metadata.json`. O primeiro é o pacote completo; o segundo permite handshake e seed leve sem carregar 722 cartas.
6. **Verificar no carregamento.** `loadVersionedDataPackageFromDisk` valida schema, recalcula hash e digests, e só então chama o loader F09 para reconstruir as APIs. Qualquer divergência retorna `data_package_integrity_failed`.
7. **Comparar no online.** Cliente envia `DatasetHandshakeClientHello` com sua identidade. Servidor compara com sua identidade carregada. Se `version` ou `hash` divergir, responde reject e não aceita ações de duelo.
8. **Registrar no Save.** Fluxos que persistem progresso registram `dataset_version = metadata.dataset.version`. Se uma leitura futura encontrar versão inexistente em `dataset_versions`, Save sinaliza incompatibilidade em vez de resolver contra dados atuais silenciosamente.

### Regras de negócio

- `hash` sempre usa o formato `sha256-` + 64 caracteres hex minúsculos.
- O hash de conteúdo inclui cards, manifesto, lista de assets, tabelas auxiliares e `artDigests`; exclui `version` e `generatedAt`.
- O servidor online só avança para autenticação de partida/deck após handshake aceito.
- Divergência de versão ou hash é bloqueante, mesmo se o cliente parecer ter cartas válidas.
- `dataset_versions.version` é imutável: publicar novo conteúdo deve inserir nova versão ou atualizar somente se o hash for idêntico em ambiente local de manutenção. Em produção, atualização de hash para a mesma versão deve ser tratada como erro operacional.
- Save registra versão, não hash, para manter o progresso legível e estável. Auditoria detalhada pode cruzar a versão com `dataset_versions.hash`.

### Determinismo e pureza

Esta feature não toca `packages/engine`. O cálculo de hash é determinístico para o mesmo payload e os mesmos bytes de arte. As funções puras recebem strings/bytes já lidos; leitura de arquivo e `crypto.createHash` ficam em `packages/data/scripts/**` ou módulos de integridade isolados de UI/rede.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- `DatasetIdentitySchema` — `version` string não-vazia, `hashAlgorithm: "sha256"`, `hash` no padrão `^sha256-[a-f0-9]{64}$`.
- `DatasetHandshakeClientHelloSchema` — mensagem inicial do cliente.
- `DatasetHandshakeServerAcceptSchema` — aceite do servidor.
- `DatasetHandshakeServerRejectSchema` — recusa com código estável.
- `DatasetHandshakeMessageSchema` — união discriminada.

### Tipos e schemas (`packages/data`)

- `DataPackageMetadataSchema` — valida metadata, contagens e `artDigests`.
- `VersionedDataPackageSchema` — valida `{ metadata, payload }`.
- `DatasetVersionFileSchema` — valida `packages/data/dataset-version.json`.

### Funções públicas

```ts
calculatePackageHash(input: {
  payload: DataPackagePayload;
  artDigests: Readonly<Record<CardNumber, string>>;
}): string

calculateArtDigests(input: {
  packagedArts: readonly PackagedArtAsset[];
  readBytes: (sourcePath: string) => Promise<Uint8Array>;
}): Promise<Result<Readonly<Record<CardNumber, string>>, DomainError>>

signDataPackage(input: {
  payload: DataPackagePayload;
  version: string;
  artDigests: Readonly<Record<CardNumber, string>>;
  now: () => string;
}): Result<VersionedDataPackage, DomainError>

verifyDataPackageIntegrity(input: {
  dataPackage: VersionedDataPackage;
  readBytes: (sourcePath: string) => Promise<Uint8Array>;
}): Promise<Result<DataPackageMetadata, DomainError>>

compareDatasetIdentity(input: {
  client: DatasetIdentity;
  server: DatasetIdentity;
}): DatasetHandshakeServerAccept | DatasetHandshakeServerReject
```

### Mensagens de rede

Cliente → servidor:

```json
{
  "type": "dataset_client_hello",
  "dataset": {
    "version": "2026.08.01",
    "hashAlgorithm": "sha256",
    "hash": "sha256-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  }
}
```

Servidor aceita:

```json
{
  "type": "dataset_server_accept",
  "dataset": {
    "version": "2026.08.01",
    "hashAlgorithm": "sha256",
    "hash": "sha256-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  }
}
```

Servidor recusa:

```json
{
  "type": "dataset_server_reject",
  "code": "dataset_hash_mismatch",
  "serverDataset": {
    "version": "2026.08.01",
    "hashAlgorithm": "sha256",
    "hash": "sha256-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "clientDataset": {
    "version": "2026.08.01",
    "hashAlgorithm": "sha256",
    "hash": "sha256-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
  },
  "message": "Seu conjunto de cartas está desatualizado. Atualize para jogar online."
}
```

### Contratos externos (cross-PRD)

- **Online Duel / `apps/server`**: deve executar o handshake antes de aceitar mensagens de partida. Qualquer mensagem de ação recebida antes de `dataset_server_accept` é erro de protocolo.
- **`apps/web`**: deve expor a identidade do pacote local no cliente e, ao receber `dataset_server_reject`, bloquear o online e acionar fluxo de atualização do app/PWA.
- **Save**: deve persistir `dataset_version` como string igual a `DataPackageMetadata.dataset.version`. Se uma versão antiga não existir em `dataset_versions`, deve sinalizar incompatibilidade e não reinterpretar progresso contra outra versão sem migração explícita.
- **Password/Economia**: geradores de seed e RPCs que carimbam `dataset_version` devem ler `data-package-metadata.json` para usar a versão oficial.

## 5. Modelo de Dados

### Postgres / Supabase

`dataset_versions`:

| Coluna | Tipo | Constraints / Índices |
|--------|------|------------------------|
| `version` | `text` | PK, não vazio |
| `hash` | `text` | not null, check `^sha256-[a-f0-9]{64}$` |
| `hash_algorithm` | `text` | not null, default `sha256`, check `hash_algorithm = 'sha256'` |
| `package_schema_version` | `integer` | not null, check `= 1` |
| `card_count` | `integer` | not null, check `= 722` |
| `art_count` | `integer` | not null, check `>= 0` |
| `created_at` | `timestamptz` | not null, default `now()` |
| `active` | `boolean` | not null, default `true` |

**RLS:** habilitada. `authenticated` pode `select` versões ativas. Escrita fica sem policy de cliente; apenas migração/role de serviço insere versões publicadas.

**Migração:** `0012_create_dataset_versions.sql` cria tabela, constraints e policy de leitura. `0013_seed_dataset_version.sql` é gerada a partir de `data-package-metadata.json` e faz upsert idempotente da versão atual apenas em desenvolvimento/CI.

**Save:** quando `profiles` ou tabela equivalente existir, deve ter `dataset_version text not null` com referência lógica a `dataset_versions(version)`. A FK física pode ser adiada se o produto precisar preservar saves antigos de versões removidas, mas a validação de aplicação deve consultar `dataset_versions`.

### Cache local / fila offline

- O cache local do pacote usa a chave `{ version, hash }`.
- Divergência entre identidade esperada e cache local descarta o cache inteiro; não há merge de pacote.
- Mutação offline de progresso deve carregar o `dataset_version` vigente no momento da mutação para auditoria. A fila offline não recalcula hash.

### Arquivos de dados versionados

| Arquivo | Responsabilidade |
|---|---|
| `packages/data/dataset-version.json` | Entrada autoral versionada em git: `{ "version": "2026.08.01" }` |
| `packages/data/generated/data-package.payload.json` | Conteúdo F09, insumo do hash |
| `packages/data/generated/data-package.json` | Pacote final F10: `{ metadata, payload }` |
| `packages/data/generated/data-package-metadata.json` | Identidade leve para handshake, seed e logs |

Formato de `dataset-version.json`:

```json
{
  "version": "2026.08.01"
}
```

Trecho de `data-package-metadata.json`:

```json
{
  "schemaVersion": 1,
  "dataset": {
    "version": "2026.08.01",
    "hashAlgorithm": "sha256",
    "hash": "sha256-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
  },
  "cardCount": 722,
  "artCount": 722,
  "generatedAt": "2026-08-01T00:00:00.000Z"
}
```

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| `dataset-version.json` ausente ou inválido | `DatasetVersionFileSchema` | `data:sign` aborta sem pacote final | Não aplicável em build |
| Payload F09 ausente | Script não lê `data-package.payload.json` | `data:sign` aborta com `data_package_payload_missing` | Não aplicável em build |
| Arte referenciada ausente | `calculateArtDigests` não lê JPG | `data:sign` aborta; pacote não é publicado | Não aplicável em build |
| Hash recalculado diverge do metadata | `verifyDataPackageIntegrity` | Recusa carregar pacote com `data_package_integrity_failed` | `Dados de cartas corrompidos. Atualize ou reinstale o pacote.` |
| Digest de uma arte diverge | Verificação por `artDigests` | Cliente usa placeholder se falha isolada no render; servidor/build recusa pacote em carregamento autoritativo | `Dados de cartas corrompidos. Atualize ou reinstale o pacote.` |
| Cliente envia identidade malformada | Schema compartilhado falha | Servidor responde `dataset_identity_invalid` e fecha/recusa sessão | `Não foi possível validar seu conjunto de cartas. Atualize o jogo.` |
| `version` divergente | `compareDatasetIdentity` | Recusa antes de qualquer jogada | `Seu conjunto de cartas está desatualizado. Atualize para jogar online.` |
| `hash` divergente com mesma versão | `compareDatasetIdentity` | Recusa antes de qualquer jogada; loga anomalia mais severa | `Seu conjunto de cartas está desatualizado. Atualize para jogar online.` |
| Save aponta para versão inexistente | Consulta a `dataset_versions` | Save entra em estado incompatível e exige migração/atualização | `Este save usa uma versão de cartas incompatível com o jogo atual.` |
| Tabela auxiliar vazia mas assinada | Payload válido de F09 | Hash cobre o estado vazio; consumidores mantêm fallback neutro | Sem mensagem global |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `DatasetIdentitySchema rejects malformed hash` — hash sem prefixo ou tamanho incorreto falha.
- `calculatePackageHash ignores generatedAt` — dois pacotes com mesmo conteúdo e `generatedAt` diferente têm o mesmo hash.
- `calculatePackageHash changes when a card changes` — alteração em `atk`, `tipo` ou `numero` muda o hash.
- `calculatePackageHash changes when a pending table changes` — adicionar fusão/drop/terreno/Guardião muda o hash.
- `calculatePackageHash changes when an art digest changes` — alteração em digest de JPG muda o hash.
- `signDataPackage attaches opaque version` — metadata preserva exatamente a versão de `dataset-version.json`.
- `verifyDataPackageIntegrity rejects tampered payload` — pacote editado após assinatura retorna `data_package_integrity_failed`.
- `compareDatasetIdentity accepts exact match` — version/hash iguais geram `dataset_server_accept`.
- `compareDatasetIdentity rejects version mismatch` — versão diferente gera `dataset_version_mismatch`.
- `compareDatasetIdentity rejects hash mismatch` — hash diferente gera `dataset_hash_mismatch`.

### Property-based (fast-check)

- `hash is deterministic for equivalent canonical payloads` — objetos com chaves permutadas e mesmo conteúdo geram o mesmo hash após canonicalização.
- `any single-card field mutation changes package hash` — para cartas válidas geradas, mudar um campo canônico altera o hash.
- `identity comparison is equality only` — para pares arbitrários de versões/hashes válidos, aceite ocorre somente quando ambos são idênticos.

### Integração

- `signs and verifies real data package` — após F09, assina o pacote real, verifica integridade e reconstrói `LoadedDataPackage`.
- `metadata seed matches generated package` — `0013_seed_dataset_version.sql` contém a versão/hash de `data-package-metadata.json`.
- `password seed uses package metadata version` — gerador de `card_prices` carimba a versão oficial, não `dataset-seal.generatedAt`.
- `tampered art is detected` — fixture altera bytes de uma arte e a verificação falha por digest.

### Análise estática

- `packages/shared/src/dataset-identity/**` não importa `packages/data`.
- `packages/data/src/integrity/**` não importa `web`, `server`, React, Supabase ou `engine`.
- `apps/server` futuro deve ter teste de protocolo impedindo ações antes do handshake.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---------------------------|-------|
| Cada pacote recebe versão e hash de conteúdo | `signs and verifies real data package` |
| Versão/hash divergentes recusam sessão online antes de qualquer jogada | `compareDatasetIdentity rejects version mismatch`, `rejects hash mismatch` e contrato futuro do servidor |
| Pacote com hash inválido é recusado no carregamento | `verifyDataPackageIntegrity rejects tampered payload` |
| Save consegue registrar a versão do dataset | Teste de contrato: Save persiste `dataset_version = metadata.dataset.version` e consulta `dataset_versions` |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|----------|-------|
| Cross-Feature: F10 versiona o pacote de F09 como unidade | `calculatePackageHash changes when a pending table changes` e integração sobre `data-package.payload.json` |
| Cross-PRD: Online Duel só inicia quando cliente e servidor têm identidade igual | Teste de protocolo em `apps/server` futuro usando `DatasetHandshakeMessageSchema` |
| Cross-PRD: Save registra versão usada no progresso | Teste de contrato do módulo Save/Profiles quando existir |
| Password/Economia auditam versão oficial | `password seed uses package metadata version` |
