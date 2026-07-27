# Serialização e Snapshot do Estado

> PRD: `docs/prds/motor-duelo-1x1.md` — F05
> Pacote-alvo: `packages/engine` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta feature entrega a operação de **tirar um snapshot** de um `EstadoDuelo` e de **recarregá-lo**
depois, com round-trip idempotente. É deliberadamente uma feature fina: desde F01, `EstadoDuelo` já
foi desenhado para ser 100% dados serializáveis em JSON — sem função, classe, `Map` ou `Set` (F01
Decisão 15), sem referência de UI (F01 Capabilities) — e `arquitetura.md` §3.1 já antecipa
exatamente isso: **"Snapshot = o próprio estado serializado. Isso entrega F05 quase de graça."**
F05 não inventa um formato novo; ela valida, na fronteira, que um valor desserializado é de fato um
`EstadoDuelo` legítimo, e garante que a cópia devolvida nunca compartilha referência com o estado
vivo em memória.

É a base declarada para o servidor autoritativo do Online Duel (cross-PRD, Fase 5 do roadmap) e
para replays/depuração de bugs — mas nenhum dos dois consumidores existe ainda; esta spec entrega
só o contrato de serialização em si.

### Incluído

- `serializar(estado): Snapshot` — cópia independente do estado, pronta para armazenar ou
  transmitir (PRD F05 Capabilities)
- `carregar(snapshot): Result<EstadoDuelo, DomainError>` — validação de fronteira e reconstrução de
  um `EstadoDuelo` a partir de um valor não confiável (PRD F05 Capabilities)
- Round-trip idempotente `carregar(serializar(estado)).value` estruturalmente igual a `estado`,
  para qualquer estado válido (PRD F05 Capabilities; critério de aceite 1; Métrica de Sucesso do
  PRD §4 "Serialização")
- `seed` preservado no round-trip, permitindo continuação determinística (PRD F05 Capabilities;
  critério de aceite 2) — automaticamente coberto, pois é só mais um campo de `EstadoDuelo`
- Garantia de que nenhuma referência de UI existe no snapshot (PRD F05 Capabilities; critério de
  aceite 3) — herdada por construção de F01–F04, nenhum dos quais introduziu tipo de UI em
  `EstadoDuelo`

### Fronteiras

- **Transporte físico do snapshot** (gravar em disco, enviar por rede, salvar no IndexedDB) → fora
  desta feature. `serializar` devolve um valor JS já JSON-compatível; quem precisar de texto aplica
  `JSON.stringify` por fora — F05 não duplica essa responsabilidade (Decisão 5).
- **Handshake de versão/hash do dataset de cartas** (`arquitetura.md` §6, necessário para o modo
  online) → **Online Duel, cross-PRD, Fase 5**. F05 não inclui `version`/`hash` no snapshot; o PRD
  F05 Capabilities não pede isso, e a Seção 9 Cross-PRD trata isso como responsabilidade do Online
  Duel ao consumir o snapshot.
- **Onde e quando tirar um snapshot durante o jogo** (ex.: a cada `apply`, só em pontos de
  checkpoint) → decisão de quem chama, não desta feature — F05 só entrega a operação.
- **Replay/reencenação de uma sequência de ações** → usa o snapshot como ponto de partida, mas a
  reprodução em si (`apply` repetido) é de F06–F12, não desta feature.

### Contratos externos assumidos

Nenhum. F05 tem `Dependências: F01` na tabela do PRD §8 — só depende de `EstadoDuelo`, já
especificado nesta wave.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | `Snapshot` é um **alias de tipo para `EstadoDuelo`**, não um wrapper novo. Citação literal de `arquitetura.md` §3.1: "Snapshot = o próprio estado serializado." | `arquitetura.md` §3.1 | confirmada |
| 2 | `Snapshot` é um **valor JS simples** (objeto/array já JSON-compatível), não uma `string`. Quem precisar de texto para armazenamento em disco ou rede aplica `JSON.stringify`/`JSON.parse` por fora — F05 não duplica essa responsabilidade (guidelines §7.3, "não misture validação, persistência e formatação numa função"). | Leitura de `arquitetura.md` §3.1; guidelines §7.3 | confirmada |
| 3 | `serializar` é **total** (nunca falha) — o `EstadoDuelo` que recebe já é produzido inteiramente pelo próprio motor (F01–F04), nunca de uma fronteira externa não confiável. Usa `structuredClone` (nativo do Node 24 LTS) para devolver uma cópia independente, nunca a mesma referência do estado vivo em memória. | `EstadoDuelo` é sempre produzido internamente pelo motor (nenhum caminho externo até aqui); Node.js 24 LTS runtime | confirmada |
| 4 | `carregar` recebe `unknown` (não `Snapshot` nem `EstadoDuelo`) e devolve `Result<EstadoDuelo, DomainError>` — trata **todo** snapshot recebido como fronteira não confiável (pode vir de disco, rede, ou um servidor online adversarial no futuro). | guidelines §18.3 ("use `unknown` nas fronteiras, então estreite") | confirmada |
| 5 | **Nenhuma API específica de texto** (`serializarParaTexto`/`carregarDeTexto`) é adicionada. `JSON.stringify`/`JSON.parse` sobre um valor já serializável são triviais para quem precisar de texto; adicionar essas funções duplicaria uma responsabilidade de formatação que não pertence a esta feature (YAGNI). | guidelines §19.3 (DRY — não extrair antes de precisar) | confirmada |
| 6 | **"Continuação determinística"** (PRD F05 Capabilities) é satisfeita automaticamente por um round-trip fiel de todos os campos, incluindo `seed`. Como não há cursor de PRNG armazenado (F03 Decisão 5 — só o `seed` estático), não há nada além do próprio estado a preservar para retomar a partida de onde parou. | F03 Decisão 5 | confirmada |
| 7 | O round-trip é testado com estados gerados por arbitrário cobrindo **toda** a árvore de `EstadoDuelo` — zonas vazias e ocupadas nas 4 posições possíveis, com e sem terreno ativo, com e sem `pendente` (janela de reação de F02), turno 1 e turnos arbitrários — não só o estado inicial que `initDuel` (F03) produz. | PRD F05 Capabilities ("para 100% dos estados", não só estados iniciais) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duelo/snapshot.ts` | shared | novo | `Snapshot` — alias de tipo para `EstadoDuelo` (Decisão 1) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta `Snapshot` |
| `packages/engine/src/serializacao/serializar.ts` | engine | novo | `serializar` — clona o estado numa forma independente |
| `packages/engine/src/serializacao/carregar.ts` | engine | novo | `carregar` — valida e reconstrói um `EstadoDuelo` a partir de entrada não confiável |
| `packages/engine/src/serializacao/index.ts` | engine | novo | Export público do subsistema `serializacao` |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta `serializacao` ao lado de `eventos`, `prng`, `inicializacao` e `combate` |
| `packages/engine/README.md` | engine | alterado | Acrescenta o subsistema `serializacao` ao propósito e aos exports públicos |
| `packages/engine/src/serializacao/serializar.test.ts` | engine | novo | Unitários: independência de referência, preservação de conteúdo |
| `packages/engine/src/serializacao/carregar.test.ts` | engine | novo | Unitários: aceitação de snapshot válido, rejeição de entradas malformadas |
| `packages/engine/src/serializacao/round-trip.propriedades.test.ts` | engine | novo | Propriedade fast-check central: `carregar(serializar(estado))` para 100% dos estados gerados |

**Verificação da direção de dependências:** `packages/engine/src/serializacao/**` importa apenas
de `packages/shared` (`EstadoDuelo`, `EstadoDueloSchema`, `Snapshot`, `Result`, `DomainError`).
Nenhum import de `data`, `rules`, `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase — a mesma
garantia já verificada para os demais subsistemas de `packages/engine` desde F02.

## 3. Design Técnico

### Estruturas de dados

**`Snapshot`** (`packages/shared`) — `type Snapshot = EstadoDuelo`. Não há campo, wrapper ou
metadado a mais: o próprio estado, já serializável, **é** o snapshot (Decisão 1).

### Fluxo

**Serializar:**

1. Recebe um `EstadoDuelo` (sempre produzido pelo próprio motor — F03 `initDuel`, ou por uma ação
   futura de F06–F12 via `apply`).
2. Devolve `structuredClone(estado)` — uma cópia estruturalmente idêntica, sem nenhuma referência
   compartilhada com o objeto original (Decisão 3).

**Carregar:**

3. Recebe `unknown` — um valor que pode ter vindo de qualquer lugar (arquivo, rede, um objeto
   montado à mão num teste).
4. Valida com `EstadoDueloSchema.safeParse`. Falha ⇒ `Result` de erro, `code: 'snapshot_invalido'`,
   `details` com os problemas reportados pelo zod.
5. Sucesso ⇒ `Result` de sucesso com `structuredClone` do valor validado — mesma garantia de
   independência de referência do lado de `serializar`.

### Regras de negócio

- **Round-trip idempotente para 100% dos estados** (Fase 0.3 pilar 2; critério de aceite 1) —
  `carregar(serializar(estado)).value` é estruturalmente (`deepEqual`) igual a `estado`, sem
  exceção, para qualquer `EstadoDuelo` válido — inicial, em turno avançado, com janela de reação
  aberta, com campo parcialmente ocupado.
- **`seed` sempre presente no snapshot** (critério de aceite 2) — é só mais um campo de
  `EstadoDuelo` (F03), preservado pelo mesmo mecanismo de clonagem/validação que todos os outros.
- **Nenhuma referência de UI, função, classe, `Map` ou `Set`** em nenhum campo (critério de aceite
  3) — herdado por construção de F01 Decisão 15; `EstadoDueloSchema` já rejeita qualquer campo
  fora do vocabulário conhecido (objetos `.strict()` desde F01).

### Eventos

Não aplicável. `serializar`/`carregar` não emitem nem consomem eventos — são operações de
persistência em memória, sem gatilho de jogo associado.

### Determinismo e pureza

- `serializar` e `carregar` são **puras**: nenhum I/O (não leem disco nem rede), nenhuma UI,
  nenhum `Math.random()`, nenhuma leitura de relógio.
- `structuredClone` é determinístico e não introduz nenhum campo novo nem remove nenhum existente.
- `carregar` é **total**: para qualquer `unknown`, sempre devolve um `Result` — nunca lança.
- O par `serializar`/`carregar` preserva a serializabilidade em JSON de `EstadoDuelo` estabelecida
  desde F01 — nenhuma das duas funções introduz um tipo não serializável em nenhum campo.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`Snapshot`** — alias de `EstadoDuelo` (Decisão 1). Reusa `EstadoDueloSchema` (F01–F04) para
  validação — nenhum schema novo é criado.
- **Reusados sem redefinir:** `EstadoDuelo`, `EstadoDueloSchema`, `Result`, `DomainError`
  (`banco-de-cartas`/F01, F01).

### Funções públicas

```
// packages/engine/src/serializacao — núcleo puro

serializar(estado: EstadoDuelo): Snapshot
  // pós: cópia estruturalmente idêntica a estado, sem referência compartilhada
  // total: nunca lança (estado já é sempre válido, produzido pelo próprio motor)

carregar(snapshot: unknown): Result<EstadoDuelo, DomainError>
  // pós: ok ⇒ EstadoDuelo validado e clonado, independente da referência de snapshot
  //      erro ⇒ code 'snapshot_invalido', details com os problemas do zod
  // total: nunca lança
```

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01–F04. O transporte do snapshot por rede é do Online Duel
(cross-PRD, Fase 5), que ainda não existe.

### Contratos externos (cross-PRD)

**Oferecido a Online Duel (cross-PRD, Fase 5, ainda sem PRD):** o par `serializar`/`carregar` é o
contrato que o servidor autoritativo vai usar para persistir e retomar sessões, e para reconexão
por reenvio de snapshot (`arquitetura.md` §6). Nenhuma extensão é antecipada aqui — quando aquele
PRD existir e precisar de metadado adicional (ex.: `version`/`hash` do dataset), ele estende
`Snapshot` por conta própria ou compõe um wrapper ao redor dela, sem alterar esta spec.

### Exemplo — round-trip

```json
{
  "estadoOriginal": { "...": "um EstadoDuelo válido qualquer, ex.: o produzido por initDuel" },
  "snapshot": "structuredClone(estadoOriginal) — estruturalmente idêntico",
  "estadoCarregado": "carregar(snapshot).value — estruturalmente idêntico a estadoOriginal"
}
```

### Exemplo — snapshot inválido

```json
{
  "ok": false,
  "error": {
    "code": "snapshot_invalido",
    "message": "Snapshot inválido: campo turno deve ser um inteiro maior ou igual a 1.",
    "details": { "issues": ["..."] }
  }
}
```

## 5. Modelo de Dados

Não aplicável. F05 não cria tabela Postgres nem estrutura IndexedDB própria — devolve um valor em
memória. **Onde** esse valor é persistido (arquivo, tabela, cache) é decisão de quem chama
`serializar`, fora desta feature.

## 6. Tratamento de Erros e Casos de Borda

F05 não tem bloco de Error Handling no PRD (é uma operação de dados pura, sem ação de jogador a
recusar).

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| `snapshot` não é um objeto (ex.: `string`, `number`, `null`, `undefined`) | `EstadoDueloSchema.safeParse` | `Result` de erro, `code: 'snapshot_invalido'` | Erro padrão do zod, sem string de UI |
| `snapshot` é um objeto mas falta um campo obrigatório (ex.: `seed`) | `EstadoDueloSchema.safeParse` | `Result` de erro | Idem |
| `snapshot` tem um campo extra não reconhecido | `.strict()` em `EstadoDueloSchema` | `Result` de erro | Idem |
| `snapshot` tem uma zona com `ocupada: true` mas sem `carta` | `EstadoDueloSchema` (união discriminada, F01) | `Result` de erro | Idem |
| `snapshot` é estruturalmente válido mas semanticamente "impossível" (ex.: duas cartas idênticas por identidade de objeto em zonas diferentes) | Fora de escopo — zod valida forma, não identidade de referência entre campos | Aceito — cada carta é um valor independente; duplicidade de `numero` na mesma composição de deck já foi barrada em F03, não é responsabilidade de F05 revalidar | — |

## 7. Estratégia de Testes

### Unitários (Vitest)

`serializar`:
- `serializar devolve um objeto estruturalmente igual ao estado recebido`
- `serializar devolve uma cópia independente, não a mesma referência do estado recebido`
- `serializar preserva o campo seed`
- `serializar preserva um pendente presente no estado`
- `serializar preserva um pendente ausente no estado`

`carregar` — table-driven:
- `carregar aceita um snapshot válido e devolve um EstadoDuelo estruturalmente igual`
- `carregar rejeita snapshot que não é um objeto`
- `carregar rejeita snapshot sem o campo seed`
- `carregar rejeita snapshot com campo extra desconhecido`
- `carregar rejeita snapshot com zona ocupada sem carta`
- `carregar devolve uma cópia independente do valor de entrada`

### Property-based (fast-check)

- **Round-trip idempotente (critério central, Métrica de Sucesso do PRD §4):** para qualquer
  `EstadoDuelo` válido gerado por arbitrário — cobrindo zonas vazias e ocupadas nas 4 posições,
  campo parcial e cheio, com e sem terreno ativo, com e sem `pendente`, turno 1 e turnos
  arbitrários —, `carregar(serializar(estado))` é sempre `{ ok: true }` e `.value` é
  estruturalmente (`deepEqual`) idêntico a `estado`. 1.000 execuções.
- **Independência de referência:** para qualquer `estado` gerado, nenhum objeto aninhado de
  `serializar(estado)` (jogadores, zonas, cartas) compartilha identidade de referência com o
  `estado` original.

### Integração

Não aplicável — mesma justificativa de F01–F04. Não há filesystem, banco de dados nem rede
envolvidos nesta feature.

### Análise estática

- `packages/engine/src/serializacao/**` importa apenas `packages/shared` — nunca `data`, `rules`,
  `ai`, `web`, `server`, React, DOM, `fetch` ou Supabase.
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F05) | Teste |
|---|---|
| `carregar(serializar(estado))` reproduz o estado idêntico (round-trip idempotente) para os estados de teste | Propriedade `Round-trip idempotente` (1.000 execuções) |
| O snapshot inclui o seed e permite continuação determinística do duelo | `serializar preserva o campo seed` + `carregar rejeita snapshot sem o campo seed` |
| O snapshot não contém referências de UI | Garantido por construção (F01 Decisão 15, `EstadoDueloSchema.strict()`); verificável por leitura do tipo `Snapshot` (alias direto de `EstadoDuelo`, sem campo de UI em nenhuma camada) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: "O mesmo estado inicial + mesma sequência de ações + mesmo seed produz o mesmo resultado final em execuções repetidas (determinismo verificado via F05)" | A propriedade `Round-trip idempotente` desta feature é o mecanismo de verificação citado pelo próprio critério — qualquer estado produzido por F03 (e, futuramente, por F06–F12) pode ser usado como entrada de teste de determinismo via este round-trip |
| Cross-PRD: "Online Duel: o snapshot serializado por F05 é aceito pelo servidor autoritativo do Online Duel para revalidação e sincronismo" | Contrato oferecido, declarado na Seção 4 — consumo real só é testável quando aquele PRD existir |
