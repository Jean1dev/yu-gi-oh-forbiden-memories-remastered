# Entrada e Validação de Senha

> PRD: `docs/prds/password.md` — F03
> Pacote-alvo: `packages/shared` + `packages/rules` (+ `apps/web`)

## 1. Contexto e Escopo

F03 é a segunda raiz do módulo Password (PRD §8, Parte 2): a camada que transforma o código
digitado pelo jogador na **carta correspondente, no seu preço em estrelas e no veredito
"posso pagar?"** — sem tocar carteira nem coleção. É somente leitura sobre os dois recursos de
economia; quem debita e concede é F04.

A feature chega num terreno já preparado. `banco-de-cartas/F03` publicou `findByPassword` no
`CardCatalog` com um resultado de três ramos (`found` / `invalid_format` / `not_found`) e a spec
dele registra explicitamente que a discriminação existe porque *"Password (cross-PRD) mostra uma
mensagem diferente para cada"*. `free-duel/F07` já entregou a carteira (`wallets`, RPC
`apply_victory_reward`, `loadWalletBalance` com fallback servidor→cache), que é a implementação de
`password` F01 e F02 sob a unificação recomendada por `docs/arquitetura.md` §5.3 — de modo que F03
**consome** F01 em vez de construí-la. O que falta, e é o que esta spec entrega, é a
**normalização da entrada** (o catálogo só aceita o formato canônico `NN NN NN NN`, e o PRD exige
aceitar `"89631139"`), a **precificação** com o fallback de preço ausente, o **cálculo de
poder de compra** e a **primeira tela do módulo** em `/password`.

No roadmap de `docs/arquitetura.md` §9 isto é Fase 2 (auth + persistência + Library + Build Deck +
Password), cujas demais entregas já estão no repositório.

### Incluído

- Normalização pura da entrada: aceita o código com ou sem espaços, com espaçamento irregular, e
  o converte no formato canônico `NN NN NN NN` que `CardCatalog.findByPassword` exige
- Resolução senha→carta contra o catálogo selado, distinguindo **formato inválido** de **senha
  inexistente** (duas mensagens diferentes, conforme o bloco Error Handling do PRD)
- Precificação da carta resolvida a partir do campo `estrelas`, com fallback total para
  `999999⭐` quando o preço é ausente
- Cálculo de `saldo ≥ preço` para o preview, com um terceiro estado explícito para "saldo
  desconhecido" que **nunca** habilita a liberação
- Rota `/password` (Server Component + client component), com o cabeçalho de saldo persistente,
  o campo de senha, o preview da carta (arte, nome, `tipo`/`classe`, preço, saldo) e o botão
  "Liberar" renderizado desabilitado
- Payload serializável senha→carta montado no servidor e reidratado no cliente, no mesmo padrão
  de `/library` e `/build-deck`

### Adiado

Não há divisão `Core Scope` / `Full Scope additions` em F03 no PRD; o escopo desta spec é a
feature completa.

### Fronteiras

- **Debitar estrelas e conceder a carta** são de F04 (PRD §6 F03: *"É somente leitura sobre
  carteira e coleção — apenas identifica a carta e prepara a liberação"*). F03 renderiza o botão
  "Liberar" **desabilitado**; a ação e o RPC transacional são a próxima feature.
- **Exibir e copiar a senha de cada carta** é da Library (`library/F05`, já implementada) — PRD §7,
  "Descoberta/consulta das senhas". F03 apenas valida e consome o código digitado.
- **Manter o saldo** é de F01, já implementada por `free-duel/F07`. F03 lê via `loadWalletBalance`
  e não escreve na carteira.
- **Grade navegável de loja** está fora do módulo por decisão de produto (PRD §7). Não há
  listagem, busca por nome nem filtro de cartas nesta tela.
- **Item do menu principal** permanece `status: "soon"` (`components/menu/menu-items.ts`); a
  promoção para `"ready"` com `href: "/password"` é entrega de F04 — ver Decisão 3.

### Contratos externos assumidos

Nenhum contrato inexistente. As três dependências de F03 já estão materializadas no repositório:

| Dependência | Onde está | O que F03 usa |
|---|---|---|
| Banco de cartas (infra Fase 0) | `packages/data/src/catalog/` | `CardCatalog.findByPassword`, `listByTipo`, `getArtManifest`; `Card.password`, `Card.estrelas` |
| Resolução de artes (`banco-de-cartas/F04`) | `packages/data/src/art/` | `CardArtLookup` → `ObtainedArtReference`, já composto por `getLibraryCatalog` |
| Carteira de estrelas (F01, via `free-duel/F07`) | `apps/web/src/lib/wallet/` | `loadWalletBalance` → `LoadedWalletBalance` (`origin: "server" \| "cache"`) |

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|---|---|---|
| 1 | **A resolução acontece no cliente**, a partir de um payload serializável montado em `page.tsx`. O catálogo lê do disco e só existe no servidor (`lib/catalog/sealed-catalog.ts`); em vez de uma rota de API nova, o Server Component achata o índice senha→carta e o cliente o reidrata — exatamente o que `/library` (`toCatalogPayload`) e `/build-deck` (`buildCatalogLookup`) já fazem. Entrega o critério de ≤300 ms sem rede, preserva o uso offline (ADR-009, PWA de `arquitetura.md` §7) e não cria superfície de API. `/library` já envia os 722 `Card` completos ao browser — incluindo `password` — então não há exposição nova; e conhecer a senha não dá a carta: o gate é econômico, aplicado por F04. | entrevista | confirmada |
| 2 | **F03 entrega a casca de `/password`**: cabeçalho de saldo + campo + preview + botão desabilitado. F01 não tem tela própria por decisão do PRD (*"Não há tela isolada só para a carteira"*), e o bloco Capabilities de F03 exige o cálculo `saldo ≥ preço` e o saldo no preview — logo a exibição do saldo nasce aqui. | entrevista | confirmada |
| 3 | **O menu principal continua `"soon"` até F04.** A rota `/password` existe e é testada, mas o menu só a oferece quando o módulo entrega valor completo (consultar **e** liberar), para não expor uma tela que mostra o preço e não deixa comprar. Registrado como pendência explícita de F04. | entrevista | confirmada |
| 4 | **São 698 cartas resolvíveis por senha, não 722.** O PRD (§1, §6 F03, §9) afirma "722 possuem senha / 99 sem senha". Contra o dataset real: as **99** são os registros `success:false` que o pipeline **descarta** na ingestão (`arquitetura.md` §4.1) e que nunca chegam ao catálogo; dentro das 722 canônicas, **24** trazem o sentinela `"Indisponível"` no campo `password`, que `packages/data/src/ingestion/normalize-card.ts` já resolve para `null` (`NO_PASSWORD_SENTINEL`). `buildIndexes` mantém essas 24 fora de `byPassword`, de modo que `findByPassword` nunca casa por ausência. Números afetados: `356, 360, 364, 365, 374, 380, 701, 702, 703, 704, 705, 706, 708, 709, 710, 713, 715, 716, 717, 718, 719, 720, 721, 722`. A spec adota **698 + 24**, mesmo desfecho que `banco-de-cartas/F02` teve na regra de guardiões vs. rituais (`arquitetura.md` §4.2): o dado real vence e o critério do PRD é corrigido. | entrevista + `arquitetura.md` §4.1 + dataset verificado | confirmada — corrige o PRD |
| 5 | **`resolveCardPrice` continua total, com fallback `999999⭐`.** As 24 cartas com `estrelas` ausente são **exatamente** as 24 sem senha, então o ramo `null` é inalcançável por F03 hoje: a regra do PRD "`estrelas` vazio (24 casos) → `999999⭐`" descreve um caminho que esta tela não pode percorrer. A função é mantida total como defesa contra evolução do dataset, coberta por teste unitário direto, e um teste de aceite prova que nenhuma das 24 chega até ela por senha. O gate real de `999999⭐` são as **98** cartas já cadastradas nesse valor. | entrevista + dataset verificado | confirmada |
| 6 | **A resolução dispara no envio explícito** (botão "Buscar" ou `Enter`), não a cada tecla. É o que o bloco Experience do PRD descreve (*"campo 'Digite a senha da carta' e um botão 'Buscar/Confirmar'"*) e evita mensagens de erro piscando enquanto o jogador digita os 8 dígitos. Como a busca é um `Map.get` em memória, o critério de ≤300 ms fica com folga de ordens de grandeza — nenhum debounce é necessário. Contrasta deliberadamente com a busca da Library (`library/F03`), que é incremental porque filtra por prefixo. | premissa derivada do PRD §6 F03 Experience | confirmada |
| 7 | **Saldo indisponível não bloqueia o preview, mas nunca habilita a liberação.** Se `loadWalletBalance` falhar em servidor **e** cache, a carta e o preço ainda são exibidos (a resolução não depende da carteira), e o veredito de pagamento assume o estado `desconhecido`. É o mesmo fail-safe que `library/F01` aplica à coleção — nunca assumir um valor favorável por engano — e a contrapartida do Error Handling de F01 (*"não assume `0` por engano"*). | premissa derivada de PRD §6 F01 Error Handling + padrão de `library/F01` | confirmada |
| 8 | **Cache de saldo é sinalizado, não escondido.** Quando `LoadedWalletBalance.origin === "cache"`, a tela exibe o aviso "Saldo carregado do cache; sincronizando…" exigido pelo PRD, reusando o padrão visual de `CacheNotice` (`library/F02`). | PRD §6 F01 Error Handling | confirmada |
| 9 | **F01 e F02 do PRD `password` já estão implementadas** por `free-duel/F07` sob a unificação de `arquitetura.md` §5.3 e ADR-006 (carteira única + handler `onVictory` idempotente por `duel_id`). F03 não redefine nem duplica nenhum dos dois; o item correspondente de `arquitetura.md` §10 pode ser considerado resolvido no código, ainda que o ADR-006 permaneça "Proposto". | `arquitetura.md` §5.3/§10, ADR-006, `supabase/migrations/0008` | premissa a confirmar |
| 10 | **A validação de balanceamento (`N` estrelas/vitória, saldo inicial) não é tocada por F03.** A tela lê o saldo que existir, seja qual for. Nenhum valor de balanceamento é inventado. | Fase 0.4 / PRD §7 | pendente — aguarda dado |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---|---|---|---|
| `packages/shared/src/economy/constants.ts` | shared | novo | `UNPRICED_CARD_STARS` (999999) e `PASSWORD_DIGIT_COUNT` (8) |
| `packages/shared/src/economy/password.ts` | shared | novo | Tipos `NormalizedPasswordInput`, `PasswordCardLookup`, `CardPrice`, `PasswordAffordability`, `PasswordResolution` |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos tipos e constantes |
| `packages/rules/src/password/normalize.ts` | rules | novo | `normalizePasswordInput` — entrada crua → código canônico ou motivo de rejeição |
| `packages/rules/src/password/pricing.ts` | rules | novo | `resolveCardPrice` — `Card` → preço em estrelas (função total) |
| `packages/rules/src/password/affordability.ts` | rules | novo | `evaluateAffordability` — preço + saldo → `podePagar` / `insuficiente` / `desconhecido` |
| `packages/rules/src/password/resolve.ts` | rules | novo | `resolvePasswordEntry` — compõe as três acima contra o port de lookup |
| `packages/rules/src/password/index.ts` | rules | novo | Barril do subdomínio |
| `packages/rules/src/index.ts` | rules | alterado | Reexporta o barril de `password/` |
| `packages/rules/src/password/normalize.test.ts` | rules | novo | Casos de normalização |
| `packages/rules/src/password/normalize.properties.test.ts` | rules | novo | Propriedades de normalização (idempotência, invariância a espaços) |
| `packages/rules/src/password/pricing.test.ts` | rules | novo | Preço presente, preço ausente, preço zero |
| `packages/rules/src/password/affordability.test.ts` | rules | novo | Fronteiras `saldo == preço`, saldo desconhecido |
| `packages/rules/src/password/resolve.test.ts` | rules | novo | Os três ramos de `PasswordResolution` |
| `apps/web/src/lib/password/types.ts` | web | novo | `PasswordCatalogPayload` (forma serializável da fronteira servidor→cliente) |
| `apps/web/src/lib/password/catalog-payload.ts` | web | novo | `toPasswordPayload` (servidor) / `fromPasswordPayload` (cliente) |
| `apps/web/src/lib/password/catalog-password.ts` | web | novo | Leitura do catálogo selado + composição do `artLookup`, server-only |
| `apps/web/src/lib/password/catalog-payload.test.ts` | web | novo | Round-trip do payload |
| `apps/web/src/hooks/use-wallet-balance.ts` | web | novo | Adaptador React sobre `loadWalletBalance` (F01) |
| `apps/web/src/hooks/use-wallet-balance.test.ts` | web | novo | Estados `loading` / `ready` / `unavailable` |
| `apps/web/src/hooks/use-password-lookup.ts` | web | novo | Estado da busca: entrada, submissão, resolução corrente |
| `apps/web/src/hooks/use-password-lookup.test.ts` | web | novo | Submissão, limpeza, resolução repetida |
| `apps/web/src/app/password/page.tsx` | web | novo | Server Component: carrega o catálogo selado e monta o payload |
| `apps/web/src/app/password/password-client.tsx` | web | novo | `"use client"`: máquina de estados da tela |
| `apps/web/src/app/password/password-client.test.tsx` | web | novo | Render dos estados da tela |
| `apps/web/src/components/password/messages.ts` | web | novo | Mapa único de mensagens em Português |
| `apps/web/src/components/password/star-balance.tsx` | web | novo | Cabeçalho persistente `Saldo: 1.240⭐` + aviso de cache |
| `apps/web/src/components/password/password-field.tsx` | web | novo | Campo + botão "Buscar", com envio por `Enter` |
| `apps/web/src/components/password/password-field.test.tsx` | web | novo | Envio, normalização visual, limpeza |
| `apps/web/src/components/password/card-preview.tsx` | web | novo | Arte, nome, `tipo`/`classe`, preço, saldo e botão desabilitado |
| `apps/web/src/components/password/card-preview.test.tsx` | web | novo | Preview pagável, insuficiente e com saldo desconhecido |
| `apps/web/src/components/password/lookup-failure.tsx` | web | novo | Mensagens de senha inválida / inexistente |
| `apps/web/src/components/password/catalog-unavailable.tsx` | web | novo | Estado de catálogo indisponível |
| `apps/web/tests/password-lookup.integration.test.tsx` | web | novo | Fluxo digitar → resolver → preview, atravessando rules + payload |

**Verificação da direção de dependências:** `shared ← data ← rules ← engine ← ai`, com `web` no
topo. Os imports desta feature são:

- `packages/shared` — não importa nada (raiz do grafo). Os novos tipos são declarações puras.
- `packages/rules/src/password/*` — importa **apenas** `@yugioh/shared`. Não importa `@yugioh/data`:
  o acesso ao catálogo entra por injeção, através do port `PasswordCardLookup` declarado em
  `shared`, exatamente como `CardCatalogLookup` já faz em `build-deck/F01` e `free-duel/F01`.
  Sem `node:*`, sem I/O — respeita a regra `domain-cores-are-pure` do `.dependency-cruiser.cjs`.
- `apps/web` — importa `@yugioh/rules`, `@yugioh/shared` e, **somente em `page.tsx` e em
  `lib/password/catalog-password.ts`**, `lib/catalog/sealed-catalog.ts` (que alcança `node:fs`
  via `@yugioh/data/catalog/disk`).

F03 **não toca `packages/engine`**, e por isso não há seção de determinismo/PRNG.

**Fronteira servidor/cliente (regra crítica do `CLAUDE.md`):** `password-client.tsx` leva
`"use client"` e **nunca** importa `lib/password/catalog-password.ts`, `lib/catalog/sealed-catalog.ts`
ou qualquer módulo sob `lib/server/`. `lib/password/types.ts` existe separado de
`catalog-password.ts` justamente para que o cliente possa nomear a *forma* do payload sem nomear
o módulo que lê o disco — mesma separação que `lib/library/types.ts` vs. `lib/library/catalog-library.ts`.

## 3. Design Técnico

### Estruturas de dados

**`NormalizedPasswordInput`** — resultado da normalização, união discriminada:

- `{ status: "canonical"; value: string }` — 8 dígitos reagrupados em `NN NN NN NN`, formato que
  `CardPasswordSchema` aceita.
- `{ status: "empty" }` — a entrada não tem dígito algum depois de removido o espaçamento. Estado
  separado porque abrir a tela com o campo vazio não é um erro do jogador e não deve mostrar
  mensagem de rejeição.
- `{ status: "malformed"; reason: "non_digit" | "wrong_length" }` — a entrada tem caractere fora de
  `[0-9]` (ex.: letras, `-`), ou tem uma quantidade de dígitos diferente de 8.

**`CardPrice`** — `{ stars: number; source: "catalog" | "fallback" }`. O `source` acompanha o preço
para que testes e telemetria distingam um preço vindo do campo `estrelas` de um preço vindo do
fallback de Decisão 5, sem reexaminar a carta.

**`PasswordAffordability`** — união de três ramos:

- `{ status: "affordable"; balanceStars: number }`
- `{ status: "insufficient"; balanceStars: number; missingStars: number }` — `missingStars` é
  pré-computado porque a mensagem de F04 (*"esta carta custa X⭐, você tem Y⭐"*) e o texto de
  apoio de F03 (*"uma mensagem explica o quanto falta"*) precisam do mesmo número.
- `{ status: "unknown" }` — a carteira não pôde ser lida (Decisão 7). Nunca habilita a liberação.

**`PasswordResolution`** — o Provides de F03, união de três ramos:

- `{ status: "resolved"; card: Card; price: CardPrice; affordability: PasswordAffordability }`
- `{ status: "invalid_format"; reason: "non_digit" | "wrong_length" }`
- `{ status: "not_found"; canonicalPassword: string }`

Os dois ramos de falha permanecem distintos porque o PRD dá uma mensagem diferente a cada um; é a
mesma razão pela qual `banco-de-cartas/F03` desenhou `PasswordLookupResult` com três ramos em vez
de devolver `undefined`.

**`PasswordCardLookup`** (port, em `shared`) — `(canonicalPassword: string) => Card | undefined`.
Mais estreito que `CardCatalog.findByPassword` de propósito: quando o lookup é chamado,
`normalizePasswordInput` já garantiu o formato canônico, então o ramo `invalid_format` do catálogo
é inalcançável a partir daqui. O adaptador em `apps/web` faz a redução (`found: true` → carta;
`not_found` → `undefined`; `invalid_format` → `undefined`, defensivamente).

**`PasswordCatalogPayload`** (em `apps/web`) — forma serializável da fronteira servidor→cliente:

- `{ status: "ok"; cards: readonly Card[]; arts: Record<CardNumber, ObtainedArtReference> }` —
  `cards` contém **apenas** as cartas com `password !== null` (698 hoje), já que uma carta sem senha
  não pode ser alcançada por esta tela e não precisa viajar.
- `{ status: "error" }`

Mesma forma e mesma justificativa de `LibraryCatalogPayload`: `listing` e `artLookup` são funções e
não atravessam a fronteira; o lado cliente as reconstrói.

### Fluxo

1. `page.tsx` (Server Component) chama `getPasswordCatalog()`, que usa o `getSealedCatalog()`
   memoizado do processo — nenhuma leitura de disco adicional é introduzida por esta rota.
2. `toPasswordPayload` percorre as cartas com `listAllCards`, mantém as que têm `password !== null`,
   resolve a arte de cada uma pelo `CardArtLookup` e devolve o payload. O resultado é memoizado por
   catálogo num `WeakMap`, como `toCatalogPayload` faz, porque o payload é idêntico em toda
   requisição a `/password`.
3. `PasswordClient` recebe o payload como prop. Em `useMemo`, `fromPasswordPayload` reconstrói um
   `Map<string, Card>` chaveado pela senha canônica e o expõe como `PasswordCardLookup`. Uma carta
   cuja arte não viajou resolve para o placeholder neutro em vez de lançar — a leitura de chave usa
   `Object.hasOwn`, para que uma chave herdada (`toString`, `__proto__`) do objeto desserializado
   nunca seja confundida com uma entrada de arte, mesmo cuidado tomado em `fromCatalogPayload`.
4. `useWalletBalance` carrega o saldo em paralelo, via `loadWalletBalance` (F01) com o repositório
   Supabase e o cache IndexedDB já existentes. A tela **não** espera a carteira para permitir a
   digitação: catálogo e saldo são independentes.
5. O jogador digita o código e envia (botão "Buscar" ou `Enter`). O campo aceita no máximo
   `PASSWORD_MAX_INPUT_LENGTH` caracteres, para que uma colagem gigante nunca chegue à
   normalização.
6. `useReducer`/estado local do hook chama `resolvePasswordEntry({ rawInput, lookup, balance })`,
   que executa, em ordem: normalização → (se canônico) lookup → precificação → veredito de
   pagamento. É síncrono e em memória — nenhuma chamada de rede.
7. A tela renderiza o ramo devolvido:
   - `resolved` → preview com arte, `nome`, `numero`, `tipo`, `classe`, `Custa X⭐`, `Saldo: Y⭐`
     e o botão "Liberar (custa X⭐)" **desabilitado**, com o rótulo de indisponibilidade de F04.
     Quando `affordability.status === "insufficient"`, exibe também quanto falta.
   - `invalid_format` → mensagem de formato; nenhum preview.
   - `not_found` → mensagem de senha inexistente; nenhum preview.
8. Enviar uma nova senha substitui integralmente a resolução anterior; limpar o campo volta ao
   estado inicial sem mensagem.

O cabeçalho de saldo (passo 4) fica visível em todos os estados, incluindo os de erro de busca,
porque o PRD o descreve como persistente no topo da tela.

### Regras de negócio

- **Normalização (PRD §6 F03 Capabilities):** remove todo espaçamento (espaço, tabulação, quebra de
  linha, ` `), exige exatamente **8** dígitos e reagrupa em quatro pares separados por um
  espaço simples. `"89631139"`, `"89 63 11 39"` e `"  89  63 11   39 "` produzem o mesmo canônico.
  Qualquer caractere restante fora de `[0-9]` rejeita com `non_digit`; contagem diferente de 8
  rejeita com `wrong_length`.
- **Cobertura do catálogo (Decisão 4):** **698** das 722 cartas canônicas são resolvíveis. As **24**
  sem senha nunca resolvem, porque `buildIndexes` as mantém fora de `byPassword` e
  `toPasswordPayload` as exclui do payload. As **99** cartas "sem senha" citadas pelo PRD são os
  registros descartados na ingestão e não existem no catálogo.
- **Precificação (PRD §6 F03 + Decisão 5):** `resolveCardPrice(card)` devolve
  `{ stars: card.estrelas, source: "catalog" }` quando `estrelas` não é `null`, e
  `{ stars: UNPRICED_CARD_STARS, source: "fallback" }` caso contrário. `estrelas === 0` é preço
  zero legítimo, **não** ausência — a mesma distinção `null` vs. `0` que o `Card` canônico já
  documenta para `atk`/`def`.
- **Poder de compra (PRD §6 F03 Capabilities):** `affordable` exige `saldo ≥ preço`; a igualdade
  paga. Saldo ausente → `unknown`, nunca `affordable`.
- **Invariante herdado de F01:** o saldo é inteiro `≥ 0`. F03 não escreve na carteira, então não
  pode violá-lo; o tipo do saldo lido reflete o `check (stars >= 0)` da tabela `wallets`.
- **Desempenho (PRD §9):** resolução em `≤ 300 ms`. Com o índice em memória a operação é
  `O(1)`; a construção do índice ocorre uma vez, sob `useMemo`, na montagem do cliente.
- **Responsividade:** 320–1920 px sem scroll horizontal, conforme `arquitetura.md` §7.

### Eventos

F03 não emite nem consome eventos do motor de duelo. O único "evento" no sentido do módulo é o
envio da senha pelo jogador, tratado como estado local de UI.

## 4. Contratos

### Tipos e constantes (`packages/shared`)

```
// economy/constants.ts
UNPRICED_CARD_STARS = 999999          // preço de carta sem `estrelas` (PRD §6 F03/F04)
PASSWORD_DIGIT_COUNT = 8              // dígitos de uma senha, antes do agrupamento
PASSWORD_MAX_INPUT_LENGTH = 32        // teto defensivo do campo, antes de normalizar

// economy/password.ts
type NormalizedPasswordInput =
  | { status: "canonical"; value: string }
  | { status: "empty" }
  | { status: "malformed"; reason: "non_digit" | "wrong_length" };

type CardPrice = { stars: number; source: "catalog" | "fallback" };

type PasswordAffordability =
  | { status: "affordable";   balanceStars: number }
  | { status: "insufficient"; balanceStars: number; missingStars: number }
  | { status: "unknown" };

type PasswordResolution =
  | { status: "resolved"; card: Card; price: CardPrice; affordability: PasswordAffordability }
  | { status: "invalid_format"; reason: "non_digit" | "wrong_length" }
  | { status: "not_found"; canonicalPassword: string };

type PasswordCardLookup = (canonicalPassword: string) => Card | undefined;
```

Todos `Readonly`, no estilo já adotado em `economy/wallet.ts`. Nenhum schema zod novo: a única
fronteira de dado não confiável é a **entrada do jogador**, e ela é validada por
`normalizePasswordInput` + o `CardPasswordSchema` já exportado por `shared` — que a spec de
`banco-de-cartas/F03` declara existir precisamente para que "carta parseada" e "string que o
jogador digitou" nunca divirjam de definição. O payload de `/password` é uma prop React entre
código próprio, não uma fronteira de rede, e segue o precedente de `LibraryCatalogPayload`
(também sem zod).

### Funções públicas (`packages/rules`)

```
normalizePasswordInput(raw: string): NormalizedPasswordInput
  // Pura. Não lança. Trunca em PASSWORD_MAX_INPUT_LENGTH antes de qualquer análise.
  // Pós-condição: status "canonical" ⇒ CardPasswordSchema.safeParse(value).success

resolveCardPrice(card: Card): CardPrice
  // Pura e total. Pós-condição: stars é inteiro ≥ 0.

evaluateAffordability(price: CardPrice, balanceStars: number | undefined): PasswordAffordability
  // Pura. balanceStars undefined ⇒ { status: "unknown" }.
  // Pós-condição: status "insufficient" ⇒ missingStars = price.stars - balanceStars > 0

resolvePasswordEntry(input: {
  rawInput: string;
  lookup: PasswordCardLookup;
  balanceStars: number | undefined;
}): PasswordResolution
  // Pura. Compõe as três acima. Não consulta o lookup quando a entrada não é canônica.
  // Pré-condição: `lookup` responde por senha canônica; nunca é chamado com string crua.
```

### Fronteira servidor → cliente (`apps/web`)

Não há endpoint HTTP nem RPC novo. O contrato é a prop de `page.tsx` para `PasswordClient`:

```json
{
  "status": "ok",
  "cards": [
    {
      "id": 1,
      "numero": "001",
      "nome": "Blue-eyes White Dragon",
      "img": null,
      "classe": "Dragon",
      "atk": 3000,
      "def": 2500,
      "guardiao1": "Uranus",
      "guardiao2": "Sun",
      "password": "89 63 11 39",
      "estrelas": 999999,
      "tipo": "monstro"
    }
  ],
  "arts": {
    "001": { "kind": "resolved", "path": "cards-data/001.jpg" }
  }
}
```

Forma de falha, quando o catálogo selado não pôde ser lido:

```json
{ "status": "error" }
```

Exemplos das três resoluções que `resolvePasswordEntry` devolve ao cliente:

```json
{
  "status": "resolved",
  "card": { "numero": "001", "nome": "Blue-eyes White Dragon", "tipo": "monstro", "classe": "Dragon" },
  "price": { "stars": 999999, "source": "catalog" },
  "affordability": { "status": "insufficient", "balanceStars": 1240, "missingStars": 998759 }
}
```

```json
{ "status": "invalid_format", "reason": "non_digit" }
```

```json
{ "status": "not_found", "canonicalPassword": "00 00 00 00" }
```

### Contratos externos (cross-PRD)

Nenhum a ser fornecido: as três dependências de F03 já existem no repositório (ver §1, "Contratos
externos assumidos"). O único contrato que F03 **publica** para consumo futuro é
`PasswordResolution` — F04 consome o ramo `resolved` (carta + `price.stars` + `affordability`) como
entrada da liberação, conforme o bloco Provides do PRD.

## 5. Modelo de Dados

### Postgres / Supabase

**Nenhuma tabela, coluna, índice, política ou migração nova.** F03 é somente leitura sobre a
economia. Consome, sem alterar:

| Tabela | Uso por F03 | Origem |
|---|---|---|
| `wallets` (`player_id` PK, `stars integer not null check (stars >= 0)`) | `select` da própria linha, via `loadWalletBalance` | `supabase/migrations/0008` (`free-duel/F07`) |

**RLS:** a política `wallets_select_own` (`player_id = auth.uid()`) e o `grant select … to
authenticated` já vigentes cobrem a leitura de F03. Nenhum `GRANT` novo é necessário — o que
importa checar aqui, dada a regra do projeto de que toda tabela nova precisa de `GRANT` explícito,
é que **nenhuma tabela nova é criada**.

**Atomicidade e idempotência:** não se aplicam a F03, que não muta economia. Toda a exigência de
atomicidade do módulo (débito + concessão numa transação) é de F04, que deverá seguir o padrão de
`apply_victory_reward`: RPC `SECURITY DEFINER`, guarda `p_player_id = auth.uid()`, e nenhum valor
sensível — em particular o **preço** — vindo do cliente.

### Cache local

Nenhum store IndexedDB novo. F03 lê o store de carteira já criado por `free-duel/F07`
(`apps/web/src/lib/wallet/indexeddb-cache.ts`), através de `loadWalletBalance`, que faz
servidor→cache com `origin` explícito no resultado. Não há fila de mutações, porque não há mutação.

### Dados versionados

O payload de `/password` é derivado do mesmo `cards.json` + `dataset-seal.json` gerados por
`data:ingest` / `data:validate`; F03 não introduz artefato de dado novo e não altera o hash do
dataset. Se o selo for inválido, `getSealedCatalog` falha e a tela entra no estado de catálogo
indisponível — a mesma recusa total que `createCatalog` já aplica (`banco-de-cartas/F03`).

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Senha inexistente no catálogo | `lookup` devolve `undefined` para um canônico bem formado | Não abre preview; não habilita liberar | "Senha inválida. Verifique o código." |
| Caractere não numérico na entrada | `normalizePasswordInput` → `malformed`/`non_digit` | Não consulta o índice; não abre preview | "Senha inválida. Use apenas os números do código." |
| Quantidade de dígitos ≠ 8 | `normalizePasswordInput` → `malformed`/`wrong_length` | Idem | "Senha inválida. Use apenas os números do código." |
| Campo vazio ao enviar | `normalizePasswordInput` → `empty` | Estado inicial; nenhuma mensagem de erro | — |
| Carta sem senha (as 24) | Ausente de `byPassword` e do payload | Impossível de alcançar por esta tela; tratada como senha inexistente se digitada por acaso | "Senha inválida. Verifique o código." |
| Catálogo selado indisponível ou selo inválido | `getSealedCatalog` devolve `err`; payload `status: "error"` | A tela não monta o campo de busca | "Não foi possível carregar as cartas. Tente novamente." |
| Saldo indisponível (servidor **e** cache falham) | `loadWalletBalance` → `err` (`wallet_unavailable`) | Preview e preço continuam; veredito vira `unknown`; liberar segue desabilitado | "Não foi possível carregar seu saldo. O preço é exibido, mas a liberação fica indisponível." |
| Saldo servido pelo cache | `LoadedWalletBalance.origin === "cache"` | Exibe o saldo normalmente com aviso persistente | "Saldo carregado do cache; sincronizando…" |
| Sem sessão autenticada | `loadWalletBalance` → `err` (`session_missing`) | Mesmo tratamento de saldo indisponível, com convite a entrar | "Faça login para ver seu saldo de estrelas." |
| Saldo insuficiente para a carta resolvida | `evaluateAffordability` → `insufficient` | Preview completo; liberar desabilitado; exibe quanto falta | "Faltam Z⭐ para liberar esta carta." |
| Preço `999999⭐` (98 cartas) | Preço normal vindo do campo `estrelas` | Nenhum tratamento especial: é apenas um preço alto que quase sempre cai em `insufficient` | (mensagem de saldo insuficiente) |
| Entrada colada muito longa | Corte em `PASSWORD_MAX_INPUT_LENGTH` antes de normalizar | Rejeitada como `wrong_length` sem custo de processamento | "Senha inválida. Use apenas os números do código." |
| Arte da carta ausente do manifesto | `Object.hasOwn` falha na leitura de `arts` | Renderiza o placeholder neutro; o preview não quebra | — |
| Payload com chave herdada (`__proto__`, `toString`) | `Object.hasOwn` em `fromPasswordPayload` | Ignorada; resolve para placeholder | — |
| Nova busca enquanto a anterior está exibida | Envio substitui a resolução no estado | Preview anterior é descartado por completo, sem mesclar campos | — |

## 7. Estratégia de Testes

### Unitários (Vitest)

`packages/rules/src/password/normalize.test.ts`
- `normalizacao trata codigo sem espacos e com espacos como o mesmo canonico` — `"89631139"` e
  `"89 63 11 39"` produzem `{ status: "canonical", value: "89 63 11 39" }`
- `normalizacao ignora espacamento irregular` — `"  89  63 11   39 "` → mesmo canônico
- `normalizacao remove tabulacao, quebra de linha e espaco nao separavel`
- `normalizacao rejeita caractere nao numerico com reason non_digit` — `"89-63-11-39"`
- `normalizacao rejeita sete digitos com reason wrong_length`
- `normalizacao rejeita nove digitos com reason wrong_length`
- `normalizacao devolve empty para string vazia e so espacos`
- `normalizacao trunca entrada acima do teto e rejeita como wrong_length`

`packages/rules/src/password/pricing.test.ts`
- `preco vem do campo estrelas quando presente` — `source: "catalog"`
- `preco zero e preco legitimo e nao ausencia` — `estrelas: 0` → `{ stars: 0, source: "catalog" }`
- `preco ausente cai no fallback de 999999` — `estrelas: null` → `source: "fallback"`
- `carta cadastrada em 999999 nao usa o fallback` — distingue os 98 dos 24 (Decisão 5)

`packages/rules/src/password/affordability.test.ts`
- `saldo maior que preco e pagavel`
- `saldo igual ao preco e pagavel` — a igualdade paga (fronteira)
- `saldo menor que preco reporta quanto falta` — `missingStars` correto
- `saldo indefinido devolve unknown e nunca affordable`

`packages/rules/src/password/resolve.test.ts`
- `entrada canonica de carta existente devolve resolved com carta preco e veredito`
- `entrada malformada nao consulta o lookup` — o port é um espião e não deve ser chamado
- `senha bem formada sem carta devolve not_found com o canonico`
- `resolucao de carta sem preco devolve fallback de 999999`

`apps/web/src/lib/password/catalog-payload.test.ts`
- `payload inclui apenas cartas com senha`
- `payload preserva arte resolvida por numero`
- `fromPasswordPayload devolve undefined para payload de erro`
- `arte ausente resolve para placeholder`
- `chave herdada no mapa de artes nao e confundida com entrada valida`

`apps/web/src/hooks/use-wallet-balance.test.ts`
- `hook reporta loading antes da carteira responder`
- `hook expoe saldo e origem servidor`
- `hook expoe origem cache para sinalizar sincronizacao pendente`
- `falha de carteira reporta indisponivel sem assumir saldo zero`

`apps/web/src/hooks/use-password-lookup.test.ts`
- `envio resolve a senha e expoe a resolucao`
- `novo envio substitui a resolucao anterior`
- `limpar o campo volta ao estado inicial sem mensagem`

Componentes (`// @vitest-environment jsdom` por arquivo, conforme o padrão do repositório):
- `password-field.test.tsx` — `enter no campo dispara a busca`, `botao buscar dispara a busca`,
  `campo vazio nao dispara busca`
- `card-preview.test.tsx` — `preview exibe arte nome tipo classe preco e saldo`,
  `preview com saldo suficiente mantem liberar desabilitado em F03`,
  `preview com saldo insuficiente informa quanto falta`,
  `preview com saldo desconhecido nao anuncia que o jogador pode pagar`
- `password-client.test.tsx` — `catalogo indisponivel nao monta o campo de busca`,
  `senha inexistente exibe verifique o codigo`,
  `senha nao numerica exibe use apenas os numeros`,
  `saldo do cache exibe aviso de sincronizacao`

### Property-based (fast-check)

`packages/rules/src/password/normalize.properties.test.ts` — não há round-trip de estado nem PRNG
em F03, mas a normalização tem invariantes que valem provar sobre entrada gerada:

- `normalizacao e invariante a espacamento` — para qualquer sequência de 8 dígitos e qualquer
  distribuição de espaços em branco entre eles, o canônico é o mesmo
- `normalizacao e idempotente` — normalizar um canônico devolve o próprio canônico
- `canonico sempre satisfaz CardPasswordSchema` — pós-condição declarada em §4
- `normalizacao nunca lanca` — para qualquer string arbitrária, devolve um dos três ramos

`packages/rules/src/password/pricing.properties.test.ts`
- `preco resolvido e sempre inteiro maior ou igual a zero` — para qualquer `Card` gerado

> Os dois testes de propriedade instáveis conhecidos do repositório (`__proto__` em
> `engine/serialization`, `valueOf`/`toString` em `data/art`) são de outros pacotes e não se
> relacionam a estes.

### Integração

`apps/web/tests/password-lookup.integration.test.tsx`
- `fluxo completo resolve senha contra o catalogo selado real` — monta o payload a partir do
  catálogo em disco, digita a senha de uma carta conhecida e verifica arte, nome, preço e saldo no
  preview, atravessando `apps/web` → `@yugioh/rules` → payload
- `as 698 cartas com senha do catalogo selado sao todas resolviveis` — percorre o payload e afirma
  que cada senha resolve para a própria carta, sem colisão
- `as 24 cartas sem senha nunca aparecem no payload nem resolvem` — verifica os `numero` listados
  na Decisão 4 (`356, 360, 364, 365, 374, 380, 701–706, 708–710, 713, 715–722`)
- `resolucao responde em menos de 300ms sobre o catalogo completo` — mede a busca após a montagem
  do índice

### Análise estática

- `packages/rules/src/password/**` não importa `@yugioh/data`, `node:*`, React, DOM, `fetch` nem
  Supabase — verificado por asserção sobre os imports do diretório, no mesmo estilo do teste de
  fronteira que `free-duel/F06` já mantém. Isso é necessário porque o `.dependency-cruiser.cjs`
  **não** detecta violações de fronteira entre pacotes neste repositório (todos os imports de
  workspace resolvem como `couldNotResolve`), conforme documentado no `CLAUDE.md`; o que ele ainda
  pega é `domain-cores-are-pure` (`node:*` sob `packages/*/src/`), que também cobre estes arquivos.
- `password-client.tsx` e os componentes sob `components/password/` não importam
  `lib/catalog/sealed-catalog.ts`, `lib/password/catalog-password.ts` nem `lib/server/*` — asserção
  de import que protege o bundle do browser de `node:fs`.

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD — F03) | Teste |
|---|---|
| Senha existente resolve a carta correta e exibe arte, nome, `tipo`/`classe`, preço e saldo em ≤ 300 ms | `fluxo completo resolve senha contra o catalogo selado real` + `resolucao responde em menos de 300ms sobre o catalogo completo` |
| A entrada é normalizada: o mesmo código com ou sem espaços resolve a mesma carta | `normalizacao trata codigo sem espacos e com espacos como o mesmo canonico` + `normalizacao e invariante a espacamento` |
| As cartas com `password` são resolvíveis; as sem senha nunca resolvem — **corrigido para 698 + 24** (Decisão 4) | `as 698 cartas com senha do catalogo selado sao todas resolviveis` + `as 24 cartas sem senha nunca aparecem no payload nem resolvem` |
| Carta com `estrelas` vazio é precificada como `999999⭐` — **inalcançável por senha** (Decisão 5) | `preco ausente cai no fallback de 999999` (unitário, direto) + o teste das 24 acima, que prova que nenhuma delas chega por senha |
| Senha inexistente exibe "Senha inválida. Verifique o código." e não habilita a liberação | `senha inexistente exibe verifique o codigo` |
| O preview indica corretamente se o jogador pode ou não pagar (`saldo ≥ preço`) | `saldo igual ao preco e pagavel`, `saldo menor que preco reporta quanto falta`, `preview com saldo insuficiente informa quanto falta` |

Critérios do PRD referentes a F03 que esta spec **não** cobre porque pertencem a F04: nenhum — os
seis critérios de F03 estão cobertos acima.

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Cross-Feature: "F03 valida a senha e mostra preço/saldo" dentro do fluxo F02→F03→F04→F05 | `fluxo completo resolve senha contra o catalogo selado real` cobre o trecho de F03; o encadeamento com F04/F05 é verificado quando aquelas features existirem |
| Cross-Feature: o saldo exibido reflete a carteira de F01 sem manter saldo paralelo | `hook expoe saldo e origem servidor` + asserção de que nenhum módulo de `lib/password/` escreve em `wallets` |
| Cross-PRD (Library): as senhas exibidas em `library/F05` correspondem às aceitas por F03 (mesmo banco de cartas) | `as 698 cartas com senha do catalogo selado sao todas resolviveis`, que consome o mesmo `getSealedCatalog` que `/library` |
| Cross-PRD (Save/persistência): o saldo lido sobrevive à troca de dispositivo | Coberto pelos testes de integração de `wallets` já existentes em `free-duel/F07`; F03 não adiciona superfície de persistência |
