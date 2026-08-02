# Liberação da Carta (pagamento em estrelas)

> PRD: `docs/prds/password.md` — F04
> Pacote-alvo: `packages/shared` + `packages/rules` + `apps/web` + `supabase/migrations`
> (+ um script de build em `packages/data/scripts/`)

## 1. Contexto e Escopo

F04 é a feature central do módulo Password: o ponto em que as duas raízes do módulo se
encontram e a economia efetivamente **muta**. F01 mantém o saldo, F03 resolve a senha em carta
e preço; F04 executa a troca — **debita o preço da carteira e concede `+1` cópia à coleção
numa única transação**, ou não faz nada. É a primeira e única operação de **débito** do
projeto: até aqui toda mutação de economia foi crédito (`apply_card_reward`,
`apply_victory_reward`), que `arquitetura.md` §5.4 e ADR-005 classificam como seguras de
enfileirar. Débito não é, e essa assimetria dita quase todo o desenho abaixo.

No roadmap (`arquitetura.md` §9) isto é Fase 2 — a última peça do "loop de conta/coleção/
economia" e o que completa o marco jogável mínimo descrito ali (*"cadastrar → receber deck
inicial → editar deck → duelar contra a CPU → ganhar carta/estrelas → **liberar carta por
senha**"*). A feature é da Wave 2 do PRD (§8, Parte 3) e consome F01 e F03, ambas com spec
escrita; F03 sem implementação e F01 com implementação parcial (ver Pré-requisitos do
`plan.md`).

Três problemas concentram o risco desta spec, e são tratados como decisões de primeira classe:

1. **Onde vive o preço autoritativo.** O preço é o campo `estrelas` do catálogo, que hoje só
   existe em arquivos de dados versionados lidos do disco (`packages/data`) — não no Postgres.
   Mas `arquitetura.md` §5.2 exige que a mutação de economia **nunca confie em valor vindo do
   cliente**. Resolvido pela Decisão 1 (tabela de preços autoritativa no Postgres, semeada a
   partir do dataset selado).
2. **Qual é a chave de idempotência.** Diferente de F02, cujo crédito é idempotente por
   `duel_id` (liberar a mesma vitória duas vezes seria um bug), aqui **liberar a mesma carta
   repetidamente é comportamento esperado e cobrado de novo**. A chave não pode ser a carta.
   Resolvido pela Decisão 3 (`redemption_id` por *tentativa de liberação*).
3. **O que acontece offline.** O PRD pede sincronização em segundo plano de liberações feitas
   offline; `arquitetura.md` §5.4 e ADR-005 dizem que débito deve preferir autoridade online.
   Resolvido pela Decisão 8 (fila de **intenções** sem débito local especulativo).

### Incluído

**Core Scope (PRD §6 F04):**

- Débito do preço em `wallets` e incremento de `collections` numa **única transação**
  Postgres, via a nova RPC `redeem_card_by_password`, `SECURITY DEFINER`, com o guard
  obrigatório `p_player_id = auth.uid()`
- Bloqueio da liberação quando `saldo < preço`, verificado **antes** de qualquer escrita, com
  a invariante "saldo nunca negativo" imposta também no banco (`check (stars >= 0)` já vigente
  em `wallets` + `update` condicional sob bloqueio de linha)
- **Preço decidido pelo servidor**: o cliente envia a senha; o servidor resolve senha → carta →
  preço contra a tabela autoritativa `card_prices` e cobra o valor que ele mesmo determinou
- **Cópias ilimitadas na coleção**: cada liberação soma `+1` sem teto; o limite de 3 cópias é
  regra de *deck* (`packages/rules/src/collection/ownership.ts`, `deck/validation.ts`) e não é
  tocado aqui
- Idempotência **por tentativa de liberação** (`redemption_id`), de modo que um retry de rede
  reenvie a mesma intenção sem cobrar duas vezes, e uma segunda liberação deliberada da mesma
  carta cobre normalmente
- Registro da liberação (carta + estrelas gastas + timestamp) na tabela `password_releases`,
  que é o `Provides` consumido por **F05 — Histórico de Liberações**
- Reflexo imediato do saldo já debitado na UI, via `setAuthoritativeBalance` de F01
- Promoção do item "Password" do menu principal de `"soon"` para `"ready"` (pendência que a
  Decisão 3 da spec de F03 deixou explicitamente para F04)

**Full Scope additions (PRD §6 F04 — incluídas por decisão do usuário):**

- **Confirmação explícita para liberações caras** acima de um limiar configurável, com o
  limiar declarado como constante única em `packages/shared` e **sem valor de balanceamento
  inventado** (Decisão 7)
- **Sincronização em segundo plano de liberações feitas offline**, na forma de fila de
  intenções reprocessável **sem débito local especulativo** (Decisão 8)

### Adiado

Nada do bloco F04 do PRD fica de fora: o usuário pediu Core Scope + Full Scope additions.
Duas consequências disso ficam registradas como fronteira, não como adiamento:

- O **valor** do limiar de confirmação é pendência de balanceamento e de ADR-006
  (`[PRECISA DE ENTRADA: Definir se liberacoes por senha acima de um limite exigem confirmacao
  adicional do jogador.]`). O mecanismo é entregue completo; o limiar nasce neutro (Decisão 7).
- A **exibição** do histórico de liberações é F05. F04 entrega a tabela, a escrita e o
  contrato de leitura; não entrega a tela.

### Fronteiras

- **Resolver a senha, precificar para exibição e calcular "posso pagar"** é F03 (spec escrita).
  F04 consome o ramo `resolved` de `PasswordResolution` como entrada e **não redefine**
  `normalizePasswordInput`, `resolveCardPrice`, `evaluateAffordability` nem `PasswordCardLookup`.
  O preço vindo de F03 é **preview**, nunca o valor cobrado (Decisão 2).
- **Manter o saldo** é F01. F04 não cria carteira, não lê `wallets` por conta própria fora da
  RPC e não mantém saldo paralelo: escreve o saldo já devolvido pelo servidor no store de F01
  através de `setAuthoritativeBalance` (spec F01, Decisão 6 e 7).
- **Crescer a coleção** é o sink de `build-deck/F03` (cross-PRD), já implementado. F04 **não
  cria coleção paralela**: escreve na mesma tabela `collections`, com a mesma semântica de
  incremento, dentro da própria transação de débito (PRD §6 F04 Capabilities; §7 "Coleção e
  deck").
- **Creditar estrelas por vitória** é F02, já satisfeita por `free-duel/F07`
  (`apply_victory_reward`). F04 não toca `reward_ledger`.
- **Exibir o extrato de liberações** é F05. F04 produz as linhas; não as lista.
- **Exibir e copiar a senha de cada carta** é `library/F05` (cross-PRD, implementada) — PRD §7.
- **Loja com grade navegável** está fora do módulo por decisão de produto (PRD §7). A única
  porta de aquisição desta tela continua sendo o código digitado.
- **Limite de 3 cópias** é regra de deck do Build Deck, aplicada na montagem, não na posse
  (PRD §6 F04 Capabilities, decisão da Fase 2 do PRD).

### Contratos externos assumidos

| Dependência | Estado no repositório | O que F04 usa |
|---|---|---|
| **`password/F03`** (interna, spec escrita, **sem implementação**) | `docs/specs/password/F03-entrada-e-validacao-de-senha/` | `PasswordResolution` (ramo `resolved`: `card`, `price`, `affordability`), a rota `/password`, `password-client.tsx`, `components/password/messages.ts`, `UNPRICED_CARD_STARS` |
| **`password/F01`** (interna, spec escrita, **implementação parcial**) | `apps/web/src/lib/wallet/`, `supabase/migrations/0008` | `useWalletBalance()` (observável reativo), `setAuthoritativeBalance(stars)`, `LoadedWalletBalance.effectiveStars` — **os três ainda não existem no código** e são pré-requisito declarado |
| **`build-deck/F03`** (cross-PRD, **implementada**) | `supabase/migrations/0005`+`0006`, `collections` (`0001`) | A tabela `collections` e a semântica de incremento `on conflict … quantity + 1`. F04 replica essa semântica **dentro da sua própria transação**, sem chamar `apply_card_reward` (Decisão 5) |
| **`free-duel/F07`** (cross-PRD, **implementada**) | `supabase/migrations/0008`, `apps/web/src/lib/reward/` | `wallets` como carteira única; o padrão de RPC de economia atômica que esta spec segue |
| **`banco-de-cartas/F03` + `F10`** (cross-PRD, **implementadas**) | `packages/data/src/catalog/`, `dataset-seal.json` | O catálogo selado e o `version`/`hash` do dataset, dos quais a tabela de preços é derivada |
| **Auth / Cadastro** (cross-PRD, sem PRD próprio) | `apps/web/src/lib/supabase/client.ts` | `getAuthenticatedPlayerId`, sessão de onde sai `auth.uid()` |
| **`password/F05`** (interna, sem spec) | — | Consumirá `password_releases` (Seção 4, "Contrato publicado para F05") |

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|---|---|---|
| 1 | **O preço autoritativo vive numa tabela Postgres `card_prices`, semeada a partir do dataset selado por uma migração gerada.** Esta é a decisão central da spec e é detalhada logo abaixo da tabela. O cliente envia a **senha**; a RPC resolve senha → `numero` → preço lendo `card_prices`, e cobra o valor que ela mesma leu. Nenhum preço atravessa a fronteira como valor de entrada confiável. Custos aceitos: (a) o dataset passa a ter uma projeção duplicada no Postgres, que pode divergir — mitigado por um teste de paridade contra o catálogo selado e pelo carimbo `dataset_version` em cada linha; (b) toda mudança de dataset exige uma nova migração de semente gerada, nunca a edição da anterior. | `arquitetura.md` §5.1/§5.2; ADR-006 §4/§6; `CLAUDE.md` (guard `auth.uid()`, migração `0006`) | confirmada |
| 2 | **O preço exibido por F03 é preview; o cobrado é o do servidor.** Para que uma divergência nunca vire uma cobrança silenciosamente diferente do que o jogador viu, a RPC recebe `p_expected_numero` e `p_expected_stars` como **cláusula de concordância**: se o que o servidor resolve não bate com o que o cliente exibiu, a operação **aborta sem cobrar** (`status: "preview_mismatch"`) e devolve os valores autoritativos para a tela se corrigir. Esses dois parâmetros são seguros por construção — um cliente que mande um preço menor apenas provoca um aborto; nunca paga menos. É o mesmo raciocínio "crédito vs. débito" que `build-deck/F03` registra na sua Decisão 10, aplicado ao lado do débito. | `arquitetura.md` §5.2; PRD §6 F04 Error Handling ("carta de senha sem correspondência no banco") | confirmada |
| 3 | **A chave de idempotência é a tentativa de liberação (`redemption_id`), não a carta nem o duelo.** O PRD é explícito: *"Liberar a mesma carta repetidamente é permitido: paga o preço a cada vez e soma outra cópia"*. Um `uuid` é gerado **no cliente**, uma vez por tentativa (não por clique de retry), e é a PK de `password_releases`; o `insert … on conflict (redemption_id) do nothing` é o portão de idempotência, exatamente como `duel_id` é em `apply_victory_reward`. Um retry de rede reenvia o **mesmo** id e não cobra de novo; uma segunda liberação deliberada gera um id **novo** e cobra normalmente. | PRD §6 F04 Capabilities; `arquitetura.md` §5.2; precedente `migrations/0008` | confirmada |
| 4 | **`password_releases` é criada por F04 e é o `Provides` de F05.** `arquitetura.md` §5.1 já reserva a tabela com o nome `password_releases` e as colunas `player_id, numero, stars_spent, created_at`; F04 adota esse nome e acrescenta `redemption_id` (PK, idempotência) e `dataset_version` (auditoria do preço cobrado). Como F05 ainda não tem spec, F04 define a estrutura, o índice de ordenação cronológica decrescente e a política de leitura que F05 vai consumir. | `arquitetura.md` §5.1; PRD §6 F04 Provides / F05 Consumes | confirmada |
| 5 | **F04 não chama `apply_card_reward`; replica a semântica de incremento dentro da própria transação.** Atomicidade em Postgres é por transação, não por chamada: aninhar a RPC de crédito dentro da de débito herdaria o portão de idempotência dela (`reward_ledger` por `duel_id`), que é a chave *errada* aqui — uma liberação não tem `duel_id`, e forjar um faria a segunda liberação da mesma carta ser silenciosamente ignorada. O sink que o PRD manda reusar é a **tabela `collections` e sua semântica** (`on conflict … quantity + 1`), e é isso que F04 reusa. Nenhuma coleção paralela é criada. Custo: a expressão de incremento existe em dois lugares (`0005`/`0008` e `0009`), verificado por teste de integração que compara o efeito das duas. | PRD §6 F04 Capabilities/§7; `arquitetura.md` §5.2 | confirmada |
| 6 | **Não há teto de posse a remover: o sink existente já não impõe nenhum.** Verificado no código — `collections.quantity` tem apenas `check (quantity >= 0)` (`migrations/0001`) e `apply_card_reward` faz `quantity + 1` sem limite superior. As três ocorrências de `MAX_COPIES_PER_CARD = 3` vivem em `packages/rules/src/{collection/ownership,deck/validation,initial-deck/*}` e todas atuam sobre **deck**, não sobre posse. A Capability "cópias ilimitadas" já é satisfeita pelo estado atual; F04 apenas não a viola, e um teste trava isso. | inspeção de `migrations/0001`, `0005`, `packages/rules` | confirmada |
| 7 | **O limiar de confirmação nasce neutro.** `EXPENSIVE_REDEMPTION_THRESHOLD_STARS` é declarada em `packages/shared/src/economy/constants.ts` como `number \| null` e vale **`null`** hoje, o que significa "nenhuma liberação é considerada cara" — o caminho neutro exigido pela Fase 0.4 do skill para dado de balanceamento. O mecanismo de confirmação é implementado e testado por completo (com limiar injetado nos testes), mas permanece dormente até que o valor seja definido. **Nenhum número de lore é inventado.** A decisão de *se* deve existir confirmação é literalmente uma entrada pendente de ADR-006. | PRD §6 F04 Full Scope; ADR-006 §1 (`[PRECISA DE ENTRADA: … liberacoes por senha acima de um limite …]`); Fase 0.4 do skill | pendente — aguarda balanceamento |
| 8 | **Fila de intenções de liberação, sem débito local especulativo — divergência registrada.** O PRD pede, literalmente: *"Sincronização em segundo plano de liberações feitas offline assim que a conexão volta"*. `arquitetura.md` §5.4 determina o oposto para débitos: *"Débitos offline (liberar carta gastando estrelas) têm risco de double-spend entre dispositivos → preferir online-autoritativo para débito, ou reconciliar por ledger"*; ADR-005 tem a entrada pendente *"Confirmar a politica final para debitos de estrelas offline: bloquear ate conexao, ou aceitar fila local com reconciliacao autoritativa"* e ADR-006 §5 rejeita explicitamente a opção "economia otimista no cliente". **Resolução adotada:** a intenção de liberação é enfileirada e reprocessada quando a conexão volta (atende o PRD), mas **o saldo local não é debitado** e a carta **não é concedida localmente** — a UI mostra "Liberação pendente", o saldo só muda quando o servidor confirma, e o `redemption_id` garante que o reenvio não cobre duas vezes (atende §5.4 e ADR-006). É a leitura literal de "reconciliar por ledger" do §5.4. | PRD §6 F04 Full Scope vs. `arquitetura.md` §5.4, ADR-005 (needs-input), ADR-006 §5; spec F01 Decisão 7 | **premissa a confirmar com o usuário** |
| 9 | **A liberação exige estar online para produzir efeito.** Consequência direta da Decisão 8 e herança explícita da Decisão 7 da spec de F01 (*"liberar carta exige estar online — restrição a herdar e declarar em F04"*). Offline, o jogador consegue consultar (F03 funciona sem rede) e **agendar** uma liberação, mas não recebe a carta. | spec `password/F01` Decisão 7; `arquitetura.md` §5.4 | confirmada |
| 10 | **A serialização por conta é o bloqueio da linha de `wallets`.** A RPC de F04 toma `select … from wallets where player_id = … for update` **antes** de checar o saldo, honrando a invariante que a spec de F01 registrou na sua Decisão 6: crédito (`apply_victory_reward`) e débito (F04) mutam a mesma linha, então uma vitória e uma liberação concorrentes serializam ali. Nenhuma tabela ou coluna de saldo alternativa é criada. | spec `password/F01` Decisão 6; PRD §6 F01 Capabilities; `arquitetura.md` §5.2 | confirmada |
| 11 | **A RPC devolve `status` como valor, não como exceção** — exceto o guard de identidade. Saldo insuficiente, senha desconhecida e divergência de preview são desfechos de domínio previstos pelo PRD, com mensagem própria cada um; virar exceção obrigaria o cliente a fazer *parsing* de texto de erro. Só a violação de `p_player_id = auth.uid()` levanta exceção, mantendo a forma da migração `0006`, porque ali não é desfecho de jogo e sim erro de programação ou ataque. Isso espelha, no Postgres, a regra "falhas viajam como valores" dos guidelines §8.1. | `TypeScript-development-guidelines.md` §8.1; `migrations/0006` | confirmada |
| 12 | **A normalização da senha é refeita no servidor.** A RPC compara sobre `password_digits` (só dígitos), derivada tanto na semente quanto na entrada da chamada, para não depender de o cliente ter normalizado corretamente. O `normalizePasswordInput` de F03 continua existindo para a experiência de digitação; a autoridade é do banco. | `arquitetura.md` §5.2; spec `password/F03` §3 | confirmada |
| 13 | **698 cartas liberáveis, não 722.** F04 herda sem reabrir a Decisão 4 da spec de F03: as 99 "sem senha" do PRD são registros descartados na ingestão e nunca chegam ao catálogo; dentro das 722 canônicas, 24 têm `password` ausente. `card_prices` recebe **apenas** as cartas com senha, e as 24 sem senha são inalcançáveis por construção. | spec `password/F03` Decisão 4; `arquitetura.md` §4.1 | confirmada — corrige o PRD |
| 14 | **`redemption_id` é gerado no cliente através de uma porta injetada**, não por chamada direta a `crypto.randomUUID()` dentro da lógica. Segue o mesmo padrão que `Clock` já estabelece em `lib/collection/load-collection.ts`, para que os testes sejam determinísticos sem *monkey-patching* de global. | `apps/web/src/lib/collection/load-collection.ts`; guidelines §12.2 | confirmada |
| 15 | **Migrações já aplicadas não são editadas.** F04 acrescenta duas migrações novas. A spec de F01 reserva `0009_create_ensure_wallet.sql`; se F01 for implementada antes, F04 desloca-se para os próximos números livres. Numeração é ordem, não identidade: o que a implementação deve garantir é que as migrações de F04 venham **depois** de `0008`. | `CLAUDE.md`; precedente `0006` corrigindo `0005`; spec `password/F01` Decisão 11 | confirmada |
| 16 | Identificadores e comentários em inglês; mensagens de UI em Português, no mapa único `components/password/messages.ts` criado por F03. | `CLAUDE.md` | confirmada |

#### Decisão 1 em detalhe — onde vive o preço autoritativo

O problema: `arquitetura.md` §5.2 exige que o débito **nunca** confie em valor vindo do
cliente, mas o preço (`Card.estrelas`) só existe hoje em `packages/data/generated/cards.json`,
lido do disco, e `packages/data` é inalcançável de dentro do Postgres.

Opções consideradas:

| Opção | Como funcionaria | Por que foi ou não escolhida |
|---|---|---|
| **A — Tabela de preços no Postgres, semeada por migração gerada a partir do dataset selado** (escolhida) | `card_prices (numero, password_digits, stars, dataset_version)` é semeada por uma migração gerada a partir de `cards.json` + `dataset-seal.json`. A RPC resolve senha → carta → preço lendo essa tabela. A RPC é `EXECUTE`-ável por `authenticated` **com** o guard `p_player_id = auth.uid()`. | O preço e a identidade passam a ser inviolá­veis **no nível do banco**: não existe superfície — navegador, `apps/server`, um cliente PostgREST direto — pela qual se possa pagar o preço errado ou liberar em nome de outro jogador. Mantém o guard obrigatório do `CLAUDE.md` (a lição que a migração `0006` existe só para retrofitar). Não cria superfície de API nova, coerente com a Decisão 1 da spec de F03, que deliberadamente evitou uma rota. Reaproveitável por `apps/server` sem importar código de `apps/web` (`arquitetura.md` §2/§6). |
| **B — Route handler Next.js lê o catálogo selado e chama uma RPC restrita a `service_role`, passando o preço** | A rota verifica o *bearer token*, resolve o preço com `resolveCardPrice` (F03) e chama a RPC com o cliente service-role; a RPC não teria guard `auth.uid()`, no mesmo molde de `persist_initial_deck`. | Descartada. É um padrão sancionado pelo `CLAUDE.md` ("`persist_initial_deck` é restrita a `service_role` porque seu chamador computa o conteúdo") e evitaria duplicar o dataset — mas concentra **toda** a integridade da economia numa única rota HTTP escrita à mão: um erro na verificação do token permite liberar em nome de qualquer conta, e o banco não teria como perceber. Para a única operação de débito do jogo, a defesa em profundidade vale o custo da duplicação. |
| **C — Preço no cliente, validado por hash do dataset** | O cliente enviaria preço + hash do dataset e a RPC validaria o hash. | Descartada de imediato: o hash prova qual dataset o cliente diz estar usando, não que o preço enviado corresponde àquela carta naquele dataset. É "confiar em valor vindo do cliente" com um passo a mais, o que §5.2 proíbe e ADR-006 §5 rejeita como "economia otimista no cliente". |

Custos aceitos da opção A, registrados aqui para não serem descobertos depois:

- **Duplicação do dataset.** `card_prices` é uma projeção de `(numero, password, estrelas)` do
  catálogo canônico. Mitigações: cada linha carrega o `dataset_version` de que foi derivada; um
  teste de paridade compara a migração de semente com o catálogo selado e falha na divergência;
  a semente é **gerada** por script, nunca escrita à mão.
- **Nova migração a cada mudança de dataset.** Aceitável porque `cards-data/` é dado versionado
  e estável, e porque migrações são acrescentadas, nunca editadas (`CLAUDE.md`).
- **`packages/data` continua sendo a fonte da verdade do catálogo.** `card_prices` é uma
  *derivação* dele para uso transacional, não uma segunda autoridade — o gerador só lê, nunca
  escreve, o catálogo.

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---|---|---|---|
| `packages/shared/src/economy/constants.ts` | shared | alterado (criado por F01/F03) | Acrescenta `EXPENSIVE_REDEMPTION_THRESHOLD_STARS` (Decisão 7) |
| `packages/shared/src/economy/redemption.ts` | shared | novo | Tipos `CardRedemptionIntent`, `RedemptionEligibility`, `CardRedemptionOutcome`, `PendingCardRedemption`, `RedemptionLedgerState` |
| `packages/shared/src/economy/redemption-schema.ts` | shared | novo | Schemas zod: `CardRedemptionIntentSchema`, `PendingCardRedemptionSchema`, `RedeemCardResponseSchema` (resposta snake_case da RPC) |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos tipos, schemas e a constante |
| `packages/rules/src/password/redemption.ts` | rules | novo | Puras: `evaluateRedemptionEligibility`, `applyRedemptionDebit`, `applyRedemptionToLedger` |
| `packages/rules/src/password/redemption.test.ts` | rules | novo | Unitários table-driven dos ramos de elegibilidade e débito |
| `packages/rules/src/password/redemption.properties.test.ts` | rules | novo | Propriedades de economia (saldo nunca negativo, soma de preços, retry idempotente) |
| `packages/rules/src/password/index.ts` | rules | alterado (criado por F03) | Reexporta o subdomínio de liberação |
| `packages/data/scripts/generate-card-prices-seed.ts` | data (**scripts**, fora de `src/`) | novo | Lê o catálogo selado do disco e emite a migração de semente de `card_prices`. Vive em `scripts/` porque faz I/O — a mesma razão pela qual `loadCatalogFromDisk` mora ali (`CLAUDE.md`, regra `domain-cores-are-pure`) |
| `packages/data/scripts/generate-card-prices-seed.test.ts` | data (scripts) | novo | Geração determinística, escape de literais, apenas cartas com senha |
| `packages/data/scripts/card-prices-seed-parity.test.ts` | data (scripts) | novo | Paridade entre a migração de semente comitada e o catálogo selado (guarda de drift da Decisão 1) |
| `packages/data/package.json` | data | alterado | Script `data:prices-seed` que executa o gerador |
| `supabase/migrations/0009_create_card_prices_and_password_releases.sql` | supabase | novo | Tabelas `card_prices` e `password_releases`, RLS, `GRANT`s, índices e a RPC `redeem_card_by_password` |
| `supabase/migrations/0010_seed_card_prices.sql` | supabase | novo (**gerado**) | Semente de `card_prices` a partir do dataset selado |
| `apps/web/src/lib/redemption/redemption-repository.ts` | web | novo | Porta `RedemptionRepository` + adaptador Supabase que chama a RPC e valida a resposta com zod |
| `apps/web/src/lib/redemption/redemption-repository.test.ts` | web | novo | Cliente Supabase falso: cada `status`, resposta malformada, erro de rede |
| `apps/web/src/lib/redemption/redemption-queue.ts` | web | novo | Porta `RedemptionQueue` + adaptador IndexedDB da fila de intenções, chaveada por `redemptionId` |
| `apps/web/src/lib/redemption/redemption-queue.test.ts` | web | novo | Enfileirar, listar por jogador, remover, registro corrompido |
| `apps/web/src/lib/redemption/redeem-card.ts` | web | novo | `redeemCardByPassword` — orquestra elegibilidade, RPC, fila e reflexo de saldo |
| `apps/web/src/lib/redemption/redeem-card.test.ts` | web | novo | Os ramos de desfecho, incluindo o caminho offline sem débito local |
| `apps/web/src/lib/redemption/redeem-card.properties.test.ts` | web | novo | Retry com o mesmo `redemptionId` nunca cobra duas vezes |
| `apps/web/src/lib/redemption/sync-redemption-queue.ts` | web | novo | `syncRedemptionQueue` — drena a fila de intenções ao reconectar |
| `apps/web/src/lib/redemption/sync-redemption-queue.test.ts` | web | novo | Drenagem parcial, item já aplicado, item permanentemente inválido |
| `apps/web/src/lib/collection/indexeddb-cache.ts` | web | alterado | Sobe `DATABASE_VERSION` e cria a store `pendingPasswordRedemptions` |
| `apps/web/src/hooks/use-card-redemption.ts` | web | novo | Máquina de estados da liberação na tela (incluindo o passo de confirmação) |
| `apps/web/src/hooks/use-card-redemption.test.ts` | web | novo | Transições `idle → confirming → submitting → succeeded/failed/pending` |
| `apps/web/src/hooks/use-redemption-sync.ts` | web | novo | Dispara a drenagem no evento `online` do navegador, espelhando `use-victory-reward-sync.ts` |
| `apps/web/src/hooks/use-redemption-sync.test.ts` | web | novo | Drenagem ao reconectar, não drena sem sessão |
| `apps/web/src/app/password/password-client.tsx` | web | alterado (criado por F03) | Liga o botão "Liberar", o diálogo de confirmação e o feedback ao estado da liberação |
| `apps/web/src/components/password/messages.ts` | web | alterado (criado por F03) | Acrescenta as mensagens de liberação, em Português |
| `apps/web/src/components/password/redeem-action.tsx` | web | novo | Botão "Liberar (custa X⭐)" habilitado, com estados de envio e bloqueio |
| `apps/web/src/components/password/redeem-action.test.tsx` | web | novo | Habilitado/desabilitado, rótulo com o preço, envio único por clique |
| `apps/web/src/components/password/expensive-redemption-dialog.tsx` | web | novo | Confirmação explícita de liberação cara (Full Scope) |
| `apps/web/src/components/password/expensive-redemption-dialog.test.tsx` | web | novo | Confirmar, cancelar, foco e fechamento por `Escape` |
| `apps/web/src/components/password/redemption-feedback.tsx` | web | novo | Sucesso, falha, pendência offline e divergência de preview |
| `apps/web/src/components/password/redemption-feedback.test.tsx` | web | novo | Uma asserção por mensagem do bloco Error Handling do PRD |
| `apps/web/src/components/menu/menu-items.ts` | web | alterado | Password passa a `status: "ready"` com `href: "/password"` |
| `apps/web/tests/password-redemption.integration.test.ts` | web | novo | Fluxo transacional contra o Supabase local: atomicidade, idempotência, bloqueio por saldo |
| `apps/web/tests/collection-cap-free.test.ts` | web | novo | Trava a Capability "cópias ilimitadas" (Decisão 6) |

**Verificação da direção de dependências** (`shared ← data ← rules ← engine ← ai`, com
`web`/`server` no topo):

- `packages/shared/src/economy/redemption*.ts` — não importa nenhum pacote do monorepo além de
  `zod` e dos próprios módulos de `shared`. É a raiz do grafo.
- `packages/rules/src/password/redemption.ts` — importa **apenas** `@yugioh/shared`. Sem
  `@yugioh/data`, sem `@yugioh/engine`, sem React, DOM, `fetch`, `node:*` ou Supabase. O preço
  e o saldo entram como **valores**, nunca por leitura própria — mesmo padrão de injeção que
  `CardCatalogLookup` já estabelece. Respeita `rules-depends-only-on-shared` e
  `domain-cores-are-pure`.
- `packages/data/scripts/generate-card-prices-seed.ts` — faz I/O (`node:fs`) e por isso vive em
  `scripts/`, **fora** de `packages/data/src/`, exatamente como `loadCatalogFromDisk`. A regra
  `domain-cores-are-pure` do `.dependency-cruiser.cjs` (uma das poucas que ainda funcionam
  neste repositório, segundo o `CLAUDE.md`) só alcança `packages/*/src/`, e continua satisfeita.
- `apps/web` importa `@yugioh/shared` e `@yugioh/rules`; nada importa `apps/web` de volta.
- `apps/web/src/lib/redemption/**` não importa `apps/web/src/lib/free-duel/**` nem
  `lib/reward/**` — preserva a invariante de fronteira herdada de `free-duel/F07`.
- Nenhum arquivo desta feature importa `packages/engine` ou `packages/ai`: F04 não participa do
  motor de duelo. Por isso **não há seção de determinismo/PRNG de duelo** — o único determinismo
  relevante é a pureza das funções de `packages/rules`, declarada na Seção 3.
- As migrações vivem em `supabase/`, fora do grafo de pacotes TypeScript.

**Fronteira servidor/cliente em `apps/web` (regra crítica do `CLAUDE.md`):** todo o código de
F04 em `apps/web` é de cliente (`"use client"` ou consumido por ele) e **nenhum** módulo sob
`lib/redemption/`, `hooks/` ou `components/password/` importa `lib/catalog/sealed-catalog.ts`,
`lib/password/catalog-password.ts` ou qualquer coisa em `lib/server/` — o que arrastaria
`node:fs` para o bundle do browser e quebraria a rota. A única leitura de disco continua sendo
a de `page.tsx`, entregue por F03. O gerador de semente roda em build/CLI, nunca no app.

## 3. Design Técnico

### Estruturas de dados

**`CardRedemptionIntent`** (`shared`) — o que o cliente monta e, se preciso, enfileira:

| Campo | Tipo | Semântica |
|---|---|---|
| `redemptionId` | `string` (uuid) | Chave de idempotência **da tentativa** (Decisão 3). Gerado uma vez, reusado em todo retry da mesma tentativa |
| `playerId` | `string` | Dono da carteira; deve casar com `auth.uid()` no servidor |
| `password` | `string` | A senha canônica exibida por F03. Renormalizada no servidor (Decisão 12) |
| `expectedCardNumber` | `CardNumber` | O `numero` que o preview de F03 mostrou — cláusula de concordância (Decisão 2) |
| `expectedStars` | `number` | O preço que o preview de F03 mostrou — cláusula de concordância |
| `createdAt` | `string` (ISO) | Momento em que a intenção foi montada; ordena a fila offline |

**`RedemptionEligibility`** (`shared`) — veredito **local** antes de enviar, união de quatro
ramos. É o que decide se o botão envia, pede confirmação ou está bloqueado:

- `{ status: "ready"; priceStars: number; balanceStars: number }`
- `{ status: "needs_confirmation"; priceStars: number; balanceStars: number; thresholdStars: number }`
- `{ status: "blocked_insufficient"; priceStars: number; balanceStars: number; missingStars: number }`
- `{ status: "blocked_unknown_balance"; priceStars: number }` — saldo indisponível (F03,
  Decisão 7): nunca libera

**`CardRedemptionOutcome`** (`shared`) — o desfecho que a tela renderiza, união de seis ramos:

- `{ status: "applied"; cardNumber; cardName; starsSpent; walletStars; cardQuantity; redeemedAt }`
- `{ status: "already_applied"; cardNumber; starsSpent; walletStars; cardQuantity }` — retry da
  mesma tentativa
- `{ status: "insufficient_stars"; priceStars; balanceStars; missingStars }`
- `{ status: "unknown_password"; expectedCardNumber }` — inconsistência de dados
- `{ status: "preview_mismatch"; authoritativeCardNumber; authoritativeStars }` — preview
  desatualizado; nada foi cobrado
- `{ status: "queued_offline"; redemptionId; queuedAt }` — intenção enfileirada, **sem débito**

**`PendingCardRedemption`** (`shared`) — o registro da fila offline: a `CardRedemptionIntent`
acrescida de `queuedAt` e `attempts`. Não guarda saldo nem quantidade: nada foi aplicado
localmente (Decisão 8).

**`RedemptionLedgerState`** (`shared`) — o modelo puro que espelha, em memória, o que a RPC faz
no banco: `{ balanceStars: number; appliedRedemptionIds: readonly string[] }`. Existe para que a
atomicidade e a idempotência do débito possam ser provadas por property-based test sem um
Postgres em pé, e para que o teste de integração possa comparar o efeito real com o modelo.

**`RedemptionViewState`** (`apps/web`, no hook) — a máquina de estados da tela:

```
| { status: "idle" }
| { status: "confirming"; intent: CardRedemptionIntent; priceStars: number }
| { status: "submitting"; intent: CardRedemptionIntent }
| { status: "settled"; outcome: CardRedemptionOutcome }
| { status: "failed"; error: DomainError }
```

### Fluxo — liberação online (caminho feliz e seus desvios)

1. O jogador chega ao estado `resolved` de F03: carta, `price` e `affordability` na tela, com o
   saldo no cabeçalho vindo de `useWalletBalance()` (F01).
2. `evaluateRedemptionEligibility({ priceStars, balanceStars, thresholdStars })` roda a cada
   render, puro. `blocked_insufficient` e `blocked_unknown_balance` deixam o botão desabilitado
   e exibem a mensagem correspondente — **é aqui que o bloqueio por saldo acontece antes de
   qualquer débito**, e o servidor o repete de forma autoritativa no passo 7.
3. O jogador aciona "Liberar (custa X⭐)". O hook monta a `CardRedemptionIntent`, gerando o
   `redemptionId` **uma única vez** pela porta `IdGenerator` (Decisão 14) e o `createdAt` pela
   porta `Clock`.
4. Se a elegibilidade é `needs_confirmation`, a tela entra em `confirming` e abre o diálogo de
   confirmação de liberação cara (Full Scope). Confirmar segue para o passo 5; cancelar volta a
   `idle` **preservando o `redemptionId` já gerado**, de modo que uma confirmação posterior da
   mesma intenção continue sendo a mesma tentativa. Com o limiar neutro (`null`), este passo
   nunca é alcançado.
5. A tela entra em `submitting` e o botão fica inerte — um segundo clique não gera segunda
   tentativa nem segundo `redemptionId`.
6. `redeemCardByPassword` chama a RPC `redeem_card_by_password` com a intenção completa,
   através do cliente Supabase da **sessão do jogador** (sem service-role: a RPC tem o guard
   `auth.uid()`).
7. Dentro de **uma única transação** Postgres, a RPC: valida a identidade; resolve
   `password_digits` → `card_prices` (senha desconhecida ⇒ `unknown_password`, nada escrito);
   confere as cláusulas de concordância (divergência ⇒ `preview_mismatch`, nada escrito);
   verifica se a tentativa já foi aplicada (⇒ `already_applied`); toma `for update` na linha de
   `wallets`; **bloqueia se `saldo < preço`** (⇒ `insufficient_stars`, nada escrito); insere em
   `password_releases`; debita `wallets`; incrementa `collections`; devolve o novo saldo, a nova
   quantidade e o timestamp.
8. Com `status: "applied"`, o cliente: chama `setAuthoritativeBalance(walletStars)` no store de
   F01 — **nunca** um débito local calculado —, exibe o toast de sucesso e volta a `idle`, com o
   preview mantido para permitir liberar de novo (nova tentativa, novo `redemptionId`).
9. Com `insufficient_stars`, `unknown_password` ou `preview_mismatch`, nada foi cobrado; a tela
   exibe a mensagem correspondente. Em `preview_mismatch`, além da mensagem, o preview é
   atualizado com os valores autoritativos devolvidos.
10. Falha de rede/RPC segue para o fluxo offline (passo 11). Sessão expirada (`401`/erro de
    autenticação) **não** enfileira: pedir reautenticação é o desfecho correto, e enfileirar uma
    intenção que o servidor recusaria por identidade só adiaria o erro.

### Fluxo — liberação offline (Full Scope, Decisão 8)

11. Numa falha de rede genuína, a intenção é gravada na store IndexedDB
    `pendingPasswordRedemptions` (chave `redemptionId`) e o desfecho devolvido é
    `queued_offline`. **Nada é debitado localmente, nada é concedido localmente, o saldo em tela
    não muda.**
12. A tela exibe o aviso persistente "Liberação pendente: será concluída quando você voltar a
    ficar online." e mantém o botão inerte para aquela intenção.
13. `useRedemptionSync` escuta o evento `online` do navegador — mesmo mecanismo de
    `use-victory-reward-sync.ts` — e chama `syncRedemptionQueue`.
14. A drenagem percorre as intenções pendentes em ordem de `queuedAt` e reenvia cada uma com o
    **mesmo `redemptionId`**. Desfecho `applied` ou `already_applied` ⇒ remove da fila e reflete
    o saldo devolvido. `insufficient_stars`, `unknown_password` e `preview_mismatch` ⇒ remove da
    fila e reporta ao jogador (a intenção não é aplicável e reprocessá-la eternamente só geraria
    ruído). Falha de rede ⇒ mantém na fila, incrementa `attempts` e tenta na próxima reconexão.
15. Como o saldo nunca foi debitado localmente, o jogador pode gastar as mesmas estrelas em
    outra coisa antes da drenagem; nesse caso a intenção pendente volta `insufficient_stars` — o
    desfecho correto e honesto, e a razão pela qual débito especulativo foi rejeitado.

### Regras de negócio

- **Saldo nunca negativo** (invariante do módulo, PRD §6 F01/F04): imposto em três camadas
  independentes — `check (stars >= 0)` na tabela `wallets` (`migrations/0008`), o `update`
  condicionado ao saldo suficiente sob `for update` na RPC, e o veredito puro
  `evaluateRedemptionEligibility` no cliente. Nenhuma das três depende das outras.
- **Bloqueio antes do débito:** a checagem de saldo na RPC acontece **antes** de qualquer
  `insert`/`update`; um `insufficient_stars` não deixa linha em `password_releases`.
- **Preço decidido pelo servidor:** a RPC nunca usa `p_expected_stars` como valor a cobrar,
  apenas como comparação. O valor cobrado sai sempre de `card_prices.stars`.
- **Cópias ilimitadas:** o incremento é `quantity + 1` sem teto (Decisão 6). O limite de 3 é
  aplicado por `packages/rules` na montagem do deck e não é consultado aqui.
- **Idempotência por tentativa:** `redemption_id` é PK de `password_releases`; a segunda
  chamada com o mesmo id não cobra. Liberar a mesma carta de novo exige um id novo, e cobra.
- **Uma tentativa por vez, por tela:** o hook rejeita um novo envio enquanto há um em
  `submitting`, evitando duas tentativas distintas (dois ids) disparadas por duplo clique.
- **Preço `999999⭐`** (98 cartas) não recebe tratamento especial: é apenas um preço alto que
  quase sempre cai em `blocked_insufficient`, e o *gate* natural que o PRD descreve. O fallback
  de preço ausente (`UNPRICED_CARD_STARS`) é inalcançável por senha (spec F03, Decisão 5), mas a
  tabela `card_prices` o materializa mesmo assim, para que o banco nunca tenha uma carta com
  senha e sem preço.
- **Confirmação de liberação cara:** exigida quando `EXPENSIVE_REDEMPTION_THRESHOLD_STARS` não
  é `null` e `priceStars >= thresholdStars`. Com o valor neutro `null`, nunca exigida
  (Decisão 7).
- **Responsividade e acessibilidade:** o diálogo de confirmação é modal, com foco preso,
  fechável por `Escape`, e a tela permanece utilizável de 320 px a 1920 px sem scroll
  horizontal (`arquitetura.md` §7, ADR-004).

### Eventos

F04 não emite nem consome eventos do motor de duelo (`packages/engine`). Os únicos "eventos" do
módulo são a submissão do jogador e o evento `online` do navegador, ambos tratados como estado
de UI em `apps/web`.

### Pureza e determinismo

As três funções de `packages/rules/src/password/redemption.ts` são **puras e totais**: sem I/O,
sem relógio, sem `Math.random()`, sem `crypto`, saída função apenas das entradas, nunca lançam —
entradas estruturalmente inválidas (`NaN`, negativos, não inteiros) voltam como
`Result` de erro. Toda fonte de não-determinismo do fluxo (geração de `redemptionId`, relógio,
rede, IndexedDB) é injetada como porta em `apps/web` (Decisão 14, guidelines §12.2). F04 não
toca `packages/engine`, então não há PRNG semeado, estado de duelo nem `atk`/`def` a preservar.

## 4. Contratos

### Tipos, schemas e constantes (`packages/shared`)

```
// economy/constants.ts (acrescentado ao arquivo que F01/F03 criam)
EXPENSIVE_REDEMPTION_THRESHOLD_STARS: number | null = null
  // PENDÊNCIA DE BALANCEAMENTO (arquitetura.md §10, ADR-006 needs-input).
  // `null` = nenhuma liberação é considerada cara; o mecanismo de confirmação
  // fica dormente. Nenhum valor de lore é inventado. Ponto único de troca.

// economy/redemption.ts
type CardRedemptionIntent = Readonly<{
  redemptionId: string; playerId: string; password: string;
  expectedCardNumber: CardNumber; expectedStars: number; createdAt: string;
}>;

type RedemptionEligibility =
  | { status: "ready";                    priceStars: number; balanceStars: number }
  | { status: "needs_confirmation";       priceStars: number; balanceStars: number; thresholdStars: number }
  | { status: "blocked_insufficient";     priceStars: number; balanceStars: number; missingStars: number }
  | { status: "blocked_unknown_balance";  priceStars: number };

type CardRedemptionOutcome =
  | { status: "applied";            cardNumber: CardNumber; starsSpent: number; walletStars: number;
                                    cardQuantity: number; redeemedAt: string }
  | { status: "already_applied";    cardNumber: CardNumber; starsSpent: number; walletStars: number;
                                    cardQuantity: number }
  | { status: "insufficient_stars"; priceStars: number; balanceStars: number; missingStars: number }
  | { status: "unknown_password";   expectedCardNumber: CardNumber }
  | { status: "preview_mismatch";   authoritativeCardNumber: CardNumber; authoritativeStars: number }
  | { status: "queued_offline";     redemptionId: string; queuedAt: string };

type PendingCardRedemption = CardRedemptionIntent & Readonly<{ queuedAt: string; attempts: number }>;

type RedemptionLedgerState = Readonly<{
  balanceStars: number;
  appliedRedemptionIds: readonly string[];
}>;
```

```
// economy/redemption-schema.ts (zod, fronteiras não confiáveis)
CardRedemptionIntentSchema   // valida a intenção antes de qualquer I/O
PendingCardRedemptionSchema  // valida o registro lido do IndexedDB (fronteira não confiável,
                             // mesmo tratamento que PendingVictoryRewardSchema recebe)
RedeemCardResponseSchema     // valida a linha snake_case devolvida pela RPC:
                             // { status, card_numero, stars_spent, wallet_stars,
                             //   card_quantity, dataset_version, redeemed_at }
```

Novos códigos de `DomainError`: `redemption_unavailable` (RPC inalcançável e fila indisponível),
`redemption_response_invalid` (resposta da RPC reprovada pelo schema),
`invalid_redemption_intent` (intenção malformada), `invalid_redemption_amount` (preço/saldo
estruturalmente inválido nas funções puras). Reusados sem redefinição: `session_missing`,
`wallet_unavailable`.

### Funções públicas (`packages/rules` — puras)

```
evaluateRedemptionEligibility(input: {
  priceStars: number;
  balanceStars: number | undefined;
  thresholdStars: number | null;
}): Result<RedemptionEligibility, DomainError>
  // Pura e total. Não lança.
  // pós: balanceStars undefined              ⇒ blocked_unknown_balance
  //      balanceStars < priceStars           ⇒ blocked_insufficient, missingStars = priceStars - balanceStars > 0
  //      thresholdStars != null && priceStars >= thresholdStars ⇒ needs_confirmation
  //      caso contrário                      ⇒ ready
  //      priceStars/balanceStars não inteiros ou negativos ⇒ err('invalid_redemption_amount')
  //      a igualdade paga: balanceStars === priceStars nunca é blocked_insufficient

applyRedemptionDebit(balanceStars: number, priceStars: number): Result<number, DomainError>
  // Pura e total. O modelo do débito.
  // pós: sucesso ⇒ resultado === balanceStars - priceStars, inteiro >= 0
  //      balanceStars < priceStars ⇒ err('invalid_redemption_amount'); NUNCA devolve negativo

applyRedemptionToLedger(
  state: RedemptionLedgerState,
  intent: { redemptionId: string; priceStars: number },
): Result<{ state: RedemptionLedgerState; applied: boolean }, DomainError>
  // Pura e total. Espelha, em memória, a semântica transacional da RPC.
  // pós: redemptionId já em appliedRedemptionIds ⇒ applied false, state inalterado (idempotência)
  //      saldo insuficiente                      ⇒ err('invalid_redemption_amount'), state inalterado
  //      caso contrário ⇒ applied true, balanceStars debitado, id acrescido
  //      invariante: state.balanceStars nunca fica negativo em nenhuma sequência de chamadas
```

### Fronteira de I/O (`apps/web` — portas e orquestração)

```
type IdGenerator = Readonly<{ newId(): string }>;   // Decisão 14

type RedemptionRepository = Readonly<{
  redeem(intent: CardRedemptionIntent): Promise<Result<CardRedemptionOutcome, DomainError>>;
}>;

type RedemptionQueue = Readonly<{
  enqueue(pending: PendingCardRedemption): Promise<void>;
  listPending(playerId: string): Promise<readonly PendingCardRedemption[]>;
  remove(redemptionId: string): Promise<void>;
}>;

type RedeemCardDeps = Readonly<{
  repository: RedemptionRepository;
  queue: RedemptionQueue;
  clock: Clock;
  ids: IdGenerator;
}>;

redeemCardByPassword(
  intent: unknown,
  deps: RedeemCardDeps,
): Promise<Result<CardRedemptionOutcome, DomainError>>
  // `intent` é `unknown` e validado com zod antes de qualquer I/O (guidelines §18.3),
  // no mesmo molde de `registerCardReward`.
  // pós: RPC responde            ⇒ o desfecho devolvido por ela, sem reinterpretação
  //      falha de rede           ⇒ enfileira e devolve queued_offline; NENHUM débito local
  //      falha de autenticação   ⇒ err('session_missing'); NÃO enfileira
  //      rede e fila indisponíveis ⇒ err('redemption_unavailable')

syncRedemptionQueue(deps: { playerId: string } & RedeemCardDeps):
  Promise<{ applied: number; removed: number; remaining: number }>
  // Reenvia cada intenção pendente com o mesmo redemptionId, em ordem de queuedAt.
```

### RPC `redeem_card_by_password` (Postgres, `SECURITY DEFINER`)

```
redeem_card_by_password(
  p_player_id       uuid,
  p_redemption_id   uuid,
  p_password        text,
  p_expected_numero text,
  p_expected_stars  integer
) returns table (
  status          text,      -- applied | already_applied | insufficient_stars
                             -- | unknown_password | preview_mismatch
  card_numero     text,
  stars_spent     integer,
  wallet_stars    integer,
  card_quantity   integer,
  dataset_version text,
  redeemed_at     timestamptz
)
```

Algoritmo (descrição, não implementação) — tudo dentro de **uma** transação:

1. Se `p_player_id <> auth.uid()`, **levanta exceção**. Mesmo guard e mesma forma da migração
   `0006`, que existe exatamente para retrofitar essa falta (`CLAUDE.md`).
2. Normaliza `p_password` removendo todo espaçamento e resolve o `numero`, o preço e o
   `dataset_version` em `card_prices` por `password_digits` (Decisão 12). Sem correspondência ⇒
   devolve `unknown_password` sem escrever nada.
3. Se `numero` resolvido `<> p_expected_numero` **ou** preço resolvido `<> p_expected_stars` ⇒
   devolve `preview_mismatch` com os valores autoritativos, sem escrever nada (Decisão 2).
4. Se já existe linha em `password_releases` com `redemption_id = p_redemption_id`: se
   pertencer a outro jogador, levanta exceção; senão devolve `already_applied` com os valores
   já registrados e o estado atual de carteira/coleção (Decisão 3).
5. `select stars … from wallets where player_id = p_player_id for update` — o ponto de
   serialização por conta (Decisão 10), que também bloqueia um `apply_victory_reward`
   concorrente.
6. Se não há linha de carteira ou `stars < preço` ⇒ devolve `insufficient_stars` com o preço e o
   saldo atual, **sem nenhuma escrita** (bloqueio antes do débito).
7. `insert into password_releases (…) on conflict (redemption_id) do nothing` — o portão de
   idempotência contra a corrida em que duas chamadas com o mesmo id passam pelo passo 4.
   Se não inseriu, devolve `already_applied`.
8. Debita `wallets` (`stars - preço`), incrementa `collections`
   (`on conflict … quantity + 1`, sem teto) e devolve `applied` com o novo saldo, a nova
   quantidade e o `redeemed_at` da linha registrada.

`language plpgsql`, `security definer`, `set search_path = public, pg_temp` — mesma regra de
`apply_victory_reward`, `apply_card_reward` e `persist_initial_deck`. `EXECUTE` revogado de
`public` e `anon`, concedido a `authenticated` e `service_role`: é seguro conceder ao jogador
autenticado porque **nenhum** valor sensível vem dele — o preço é lido pela própria função e a
identidade é checada no passo 1 (contraste deliberado com `persist_initial_deck`, restrita a
`service_role` justamente porque lá o chamador computa o conteúdo).

Exemplo de chamada:

```json
{
  "p_player_id": "1f4c8b6e-0f1a-4b2c-9d3e-5a6b7c8d9e0f",
  "p_redemption_id": "7c9a1b2d-3e4f-4a5b-8c9d-0e1f2a3b4c5d",
  "p_password": "89 63 11 39",
  "p_expected_numero": "001",
  "p_expected_stars": 999999
}
```

Resposta de sucesso:

```json
{
  "status": "applied",
  "card_numero": "001",
  "stars_spent": 999999,
  "wallet_stars": 41,
  "card_quantity": 2,
  "dataset_version": "1.0.0",
  "redeemed_at": "2026-07-31T14:02:11.492Z"
}
```

Resposta de bloqueio por saldo (nada foi escrito):

```json
{
  "status": "insufficient_stars",
  "card_numero": "001",
  "stars_spent": 999999,
  "wallet_stars": 1240,
  "card_quantity": 1,
  "dataset_version": "1.0.0",
  "redeemed_at": null
}
```

Resposta de divergência de preview (nada foi escrito):

```json
{
  "status": "preview_mismatch",
  "card_numero": "001",
  "stars_spent": 50000,
  "wallet_stars": 1240,
  "card_quantity": 1,
  "dataset_version": "1.1.0",
  "redeemed_at": null
}
```

> Os saldos e preços destes exemplos ilustram a **forma** da resposta; não são valores de
> balanceamento.

### Contrato publicado para `password/F05` (interna, sem spec)

F04 publica a tabela `password_releases` e o formato de leitura que o extrato de F05 vai
consumir — ordem cronológica decrescente, somente leitura, sob RLS `select`-own:

```json
[
  {
    "redemption_id": "7c9a1b2d-3e4f-4a5b-8c9d-0e1f2a3b4c5d",
    "numero": "001",
    "stars_spent": 999999,
    "created_at": "2026-07-31T14:02:11.492Z"
  }
]
```

O `nome` da carta **não** é persistido: F05 o resolve pelo `numero` contra o catálogo, mesma
regra que `collections` e `reward_ledger` já seguem (`arquitetura.md` §5.1 — o `numero`
identifica a carta; o nome é derivação do dataset e não deve ser congelado no banco).

### Contratos externos consumidos

- **`password/F03`** — F04 consome o ramo `resolved` de `PasswordResolution` e **não** o
  redefine. A spec de F03 já declara que este é o contrato que ela publica para F04.
- **`password/F01`** — F04 consome `useWalletBalance()` (`effectiveStars` para a elegibilidade)
  e `setAuthoritativeBalance(stars)` (para refletir o saldo pós-débito). Ambos são entregas de
  F01 ainda **não implementadas** e são pré-requisito declarado no `plan.md`. Enquanto não
  existirem, F04 não tem como refletir o saldo reativamente — ver Seção 6.
- **`build-deck/F03`** — F04 escreve na tabela `collections` com a mesma semântica de
  incremento, dentro da própria transação (Decisão 5).

## 5. Modelo de Dados

### Postgres — migração `0009_create_card_prices_and_password_releases.sql`

**Tabela `card_prices`** — a projeção autoritativa de preço derivada do dataset selado
(Decisão 1). Somente as **698** cartas com senha (Decisão 13).

| Coluna | Tipo | Constraints / Índices |
|---|---|---|
| `numero` | `text` | **PK**, `check (numero ~ '^[0-9]{3}$')` — mesmo formato de `collections.numero` |
| `password_digits` | `text` | `not null`, **`unique`**, `check (password_digits ~ '^[0-9]{8}$')` — a senha só com dígitos, forma de comparação do servidor (Decisão 12) |
| `stars` | `integer` | `not null`, `check (stars >= 0)` |
| `dataset_version` | `text` | `not null` — a versão do dataset de que a linha foi derivada |
| `created_at` | `timestamptz` | `not null default now()` |

O `unique` em `password_digits` é o índice que a resolução senha→carta usa; nenhum índice
adicional é necessário.

**RLS:** habilitada, **sem política alguma**. Esta tabela não é de jogador e não precisa ser
lida pelo cliente — o preço para exibição já viaja no payload do catálogo entregue por F03, e
quem lê `card_prices` é exclusivamente a RPC `SECURITY DEFINER`, que roda como dona da função e
não passa por RLS.

**GRANTs:** `select, insert, update, delete` para `service_role` (migração, semente, testes de
integração). **Nada** para `anon`/`authenticated`. O `GRANT` explícito é obrigatório porque o
schema `public` deste projeto não tem privilégios default (`CLAUDE.md`; lição das migrações
`0002`/`0003`).

**Tabela `password_releases`** — o registro de cada liberação; `Provides` de F04 e `Consumes`
de F05 (`arquitetura.md` §5.1).

| Coluna | Tipo | Constraints / Índices |
|---|---|---|
| `redemption_id` | `uuid` | **PK** — a chave de idempotência da tentativa (Decisão 3) |
| `player_id` | `uuid` | `not null`, `references auth.users (id) on delete cascade` |
| `numero` | `text` | `not null`, `check (numero ~ '^[0-9]{3}$')`, `references card_prices (numero)` |
| `stars_spent` | `integer` | `not null`, `check (stars_spent >= 0)` |
| `dataset_version` | `text` | `not null` — auditoria: contra qual versão o preço foi cobrado |
| `created_at` | `timestamptz` | `not null default now()` |

**Índice:** `(player_id, created_at desc)` — serve o extrato cronológico decrescente de F05 sem
ordenação em memória.

**RLS:** habilitada; política `password_releases_select_own`
(`for select to authenticated using (player_id = auth.uid())`), mesmo padrão de
`reward_ledger_select_own` e `wallets_select_own`. **Nenhuma política de escrita**: o único
escritor é a RPC `SECURITY DEFINER`.

**GRANTs:** `select` para `authenticated` (F05 lê o próprio extrato);
`select, insert, update, delete` para `service_role`.

**Função:** `redeem_card_by_password(uuid, uuid, text, text, integer)`, descrita na Seção 4.
`revoke execute … from public, anon`; `grant execute … to authenticated, service_role`.

**Atomicidade e idempotência (obrigatório para economia):**

- **Atomicidade:** débito de `wallets` e incremento de `collections` acontecem na mesma
  transação da RPC; qualquer erro aborta ambos. Não existe caminho no cliente que faça um sem o
  outro. — `arquitetura.md` §5.2, ADR-006 §4.
- **Idempotência:** `redemption_id` é PK de `password_releases`; o
  `insert … on conflict do nothing` seguido da checagem de `FOUND` distingue "aplicou agora" de
  "já estava aplicado", exatamente como `apply_victory_reward` faz com `duel_id`.
- **Nenhum valor sensível vindo do cliente:** o preço é lido de `card_prices` pela própria
  função; `p_expected_stars` só pode abortar, nunca reduzir a cobrança; a identidade vem de
  `auth.uid()`.
- **Serialização por conta:** `for update` na linha de `wallets` (Decisão 10).

### Postgres — migração `0010_seed_card_prices.sql` (gerada)

Semente de `card_prices` a partir do catálogo selado, emitida por
`packages/data/scripts/generate-card-prices-seed.ts`:

- Uma linha por carta com `password !== null` (698 hoje), com `numero`, `password_digits`,
  `stars` (usando `UNPRICED_CARD_STARS` quando `estrelas` é ausente) e o `version` do
  `dataset-seal.json`.
- Escrita como `insert … on conflict (numero) do update set …`, para que reaplicar a semente
  seja idempotente e para que uma futura migração de semente de um dataset novo atualize preços
  em vez de conflitar.
- **Nunca editada à mão.** Uma mudança de dataset gera uma migração de semente **nova**, com o
  número seguinte (`CLAUDE.md`, precedente `0006`).
- Guarda de drift: o teste de paridade (Seção 7) compara a semente comitada com o catálogo
  selado e falha quando divergem.

### Cache local / fila offline (IndexedDB)

`DATABASE_VERSION` em `apps/web/src/lib/collection/indexeddb-cache.ts` sobe de `5` para `6`, com
uma object store nova no mesmo banco `yugioh-build-deck`:

| Store | Key path | Conteúdo |
|---|---|---|
| `pendingPasswordRedemptions` | `redemptionId` | `PendingCardRedemption` — reenfileirar o mesmo id substitui, nunca duplica |

Deliberadamente **não** há transação IndexedDB abrangendo `collection` e `walletBalance`, ao
contrário de `applyOfflineVictoryReward` (`free-duel/F07`): aquela aplica um **crédito** local,
esta apenas **agenda um débito** e não altera nenhum snapshot local (Decisão 8). O registro lido
é validado por `PendingCardRedemptionSchema` antes do uso — o IndexedDB é fronteira não confiável
como a rede, mesma regra que `createIndexedDbVictoryRewardQueue` já segue.

### Arquivos de dados versionados

Nenhum artefato novo em `packages/data/generated/`. F04 **lê** `cards.json` +
`dataset-seal.json` apenas no gerador de semente (build/CLI) e não altera o hash do dataset. O
`version` do selo passa a ser carimbado em `card_prices.dataset_version` e propagado a cada
`password_releases.dataset_version`, o que dá ao extrato de F05 e a uma auditoria futura a
capacidade de saber contra qual dataset cada cobrança foi feita.

### Dado de balanceamento pendente

`EXPENSIVE_REDEMPTION_THRESHOLD_STARS = null` é o único item de balanceamento introduzido, e é
introduzido **sem valor** (Decisão 7). Nenhum valor de guardião, terreno, fusão, drop, rating,
`N` estrelas por vitória ou saldo inicial é lido, escrito ou inventado por F04.

## 6. Tratamento de Erros e Casos de Borda

Mensagens marcadas com **(PRD)** são reproduzidas literalmente do bloco Error Handling /
Experience de F04.

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---|---|---|---|
| Saldo insuficiente (bloqueio local, antes de enviar) | `evaluateRedemptionEligibility` → `blocked_insufficient` | Botão desabilitado; nenhuma chamada de rede; nenhum débito | **(PRD)** "Estrelas insuficientes: esta carta custa X⭐, você tem Y⭐." |
| Saldo insuficiente detectado pelo servidor (saldo mudou entre o preview e o envio) | RPC → `insufficient_stars` | Nada foi escrito; a tela atualiza o saldo com o valor autoritativo devolvido | **(PRD)** "Estrelas insuficientes: esta carta custa X⭐, você tem Y⭐." |
| Falha de rede/servidor no meio da liberação | RPC devolve erro de transporte | A transação Postgres é atômica: ou aplicou por inteiro, ou nada. O cliente enfileira a intenção com o **mesmo** `redemptionId` e o retry reconcilia (Decisão 3/8). O saldo em tela não muda | **(PRD)** "Não foi possível concluir a liberação. Seu saldo não foi alterado. Tente novamente." + "Liberação pendente: será concluída quando você voltar a ficar online." |
| Sessão expirada / sem autorização | Erro de autenticação na chamada, ou exceção do guard `auth.uid()` | Não aplica, **não enfileira** (passo 10 do fluxo); saldo e coleção intactos | **(PRD)** "Faça login novamente para liberar cartas." |
| Senha sem correspondência no banco (inconsistência de dados) | RPC → `unknown_password` | Não libera; nenhum débito; registra a inconsistência no log estruturado | **(PRD)** "Carta indisponível para liberação (numero X)." |
| Liberação concluída | RPC → `applied` | `setAuthoritativeBalance` reflete o saldo; a carta fica imediatamente disponível no Build Deck | **(PRD)** "**{Nome}** adicionada à coleção. Saldo: **Y⭐**." |
| Divergência entre o preview e o preço/carta autoritativos (conflito de versão do dataset) | RPC → `preview_mismatch` | **Nada é cobrado.** O preview é reconstruído com os valores autoritativos e o jogador precisa acionar de novo | "O preço desta carta mudou. Agora custa Z⭐. Confira e tente novamente." |
| Retry da mesma tentativa (duplo envio, reconexão, dois dispositivos) | `on conflict (redemption_id) do nothing` → `already_applied` | Nenhuma segunda cobrança; a tela mostra o resultado já aplicado | "Esta liberação já havia sido concluída. Saldo: Y⭐." |
| `redemption_id` de outro jogador | Linha existente com `player_id` diferente | A RPC levanta exceção; nada é escrito | "Não foi possível concluir a liberação. Seu saldo não foi alterado. Tente novamente." |
| Liberação enfileirada offline | Falha de rede + gravação na fila bem-sucedida | `queued_offline`; **nenhum débito local, nenhuma carta local**; aviso persistente até a drenagem | "Liberação pendente: será concluída quando você voltar a ficar online." |
| Intenção pendente que deixou de ser pagável (o jogador gastou o saldo antes de reconectar) | Drenagem → `insufficient_stars` | Remove da fila e informa; nenhuma cobrança parcial (Decisão 8, passo 15) | "Sua liberação pendente de **{Nome}** não pôde ser concluída: estrelas insuficientes." |
| IndexedDB indisponível (aba privada, quota) na hora de enfileirar | `enqueue` lança | `err("redemption_unavailable")`: sem rede e sem fila, não há o que prometer ao jogador | **(PRD)** "Não foi possível concluir a liberação. Seu saldo não foi alterado. Tente novamente." |
| Registro corrompido na fila | `PendingCardRedemptionSchema` reprova | Descartado com log; a drenagem continua nos demais — mesma regra de `PendingVictoryRewardSchema` | nenhuma |
| Resposta da RPC fora do formato esperado | `RedeemCardResponseSchema` reprova | `err("redemption_response_invalid")`; a tela trata como falha sem alterar o saldo exibido | **(PRD)** "Não foi possível concluir a liberação. Seu saldo não foi alterado. Tente novamente." |
| Saldo indisponível (servidor **e** cache falharam em F01) | `useWalletBalance` → `unavailable`; elegibilidade → `blocked_unknown_balance` | Preview e preço continuam visíveis; liberar fica desabilitado — **nunca** assume que dá para pagar | "Não foi possível carregar seu saldo. A liberação fica indisponível até sincronizar." |
| Saldo servido pelo cache (`origin: "cache"`) | `LoadedWalletBalance.origin` | O aviso de F03 permanece; a liberação continua permitida, porque a autoridade é do servidor e um saldo de cache otimista só provoca um `insufficient_stars` honesto | "Saldo carregado do cache; sincronizando…" (herdada de F03) |
| Liberação cara acima do limiar | `evaluateRedemptionEligibility` → `needs_confirmation` | Abre o diálogo modal; cancelar não envia nada | "Esta liberação custa X⭐. Confirmar?" |
| Limiar de confirmação ainda não definido (`null`) | Constante neutra | Nenhuma confirmação é pedida; o caminho de liberação é direto (Decisão 7) | nenhuma |
| Duplo clique em "Liberar" | Estado `submitting` no hook | O segundo clique é ignorado; nunca gera segunda tentativa nem segundo `redemptionId` | nenhuma |
| Vitória (crédito) e liberação (débito) simultâneas na mesma conta | `for update` na linha de `wallets` | As transações serializam; nenhuma leitura-modificação-escrita perdida; saldo nunca negativo | nenhuma |
| **F01 ou F03 ainda não implementadas** | Ausência de `useWalletBalance`/`setAuthoritativeBalance` (F01) ou da rota `/password` (F03) | F04 **não é implementável**: são pré-requisitos declarados no `plan.md`, não contratos externos a estubar. A camada Postgres, `packages/shared` e `packages/rules` de F04 podem ser construídas e testadas antes; a camada `apps/web` não | não se aplica |
| Divergência entre `card_prices` e o catálogo selado | Teste de paridade da semente | Falha em CI antes de chegar ao jogador; a correção é uma nova migração de semente gerada | não se aplica |

## 7. Estratégia de Testes

> **Aviso sobre integração:** os testes que tocam o Supabase estão sob
> `describe.skipIf(!hasSupabaseEnv)` e **reportam verde sem executar** quando o ambiente não
> está configurado (`CLAUDE.md`). Antes de confiar no verde desta feature — que é a única com
> débito de economia no projeto — é obrigatório exportar `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
> `SUPABASE_SERVICE_ROLE_KEY` e rodar `pnpm test:integration`. Os dois testes de propriedade
> instáveis já conhecidos (`engine/serialization` com `__proto__`, `data/art` com
> `valueOf`/`toString`) são de outros pacotes e não se relacionam a esta feature.

### Unitários (Vitest)

`packages/rules/src/password/redemption.test.ts` — table-driven:

- `evaluateRedemptionEligibility returns ready when the balance covers the price`
- `evaluateRedemptionEligibility treats an exact balance as payable` — fronteira `saldo === preço`
- `evaluateRedemptionEligibility reports how many stars are missing when the balance is short`
- `evaluateRedemptionEligibility blocks with unknown balance and never returns ready`
- `evaluateRedemptionEligibility never asks for confirmation when the threshold is null` — caminho
  neutro da pendência de balanceamento (Decisão 7)
- `evaluateRedemptionEligibility asks for confirmation at and above an injected threshold`
- `evaluateRedemptionEligibility prefers the insufficient block over the confirmation prompt`
- `evaluateRedemptionEligibility rejects a non-integer or negative price`
- `applyRedemptionDebit subtracts the price from the balance`
- `applyRedemptionDebit refuses to produce a negative balance`
- `applyRedemptionToLedger applies a new redemption id exactly once`
- `applyRedemptionToLedger is a no-op for an already applied redemption id`
- `applyRedemptionToLedger leaves the state untouched when the balance is insufficient`
- `applyRedemptionToLedger charges twice for the same card under two distinct redemption ids`

`apps/web/src/lib/redemption/redemption-repository.test.ts` (cliente Supabase falso):

- `redeem maps the applied status with the new balance and quantity`
- `redeem maps insufficient_stars without treating it as an error`
- `redeem maps unknown_password to the data-inconsistency outcome`
- `redeem maps preview_mismatch with the authoritative price`
- `redeem maps already_applied on a repeated redemption id`
- `redeem returns redemption_response_invalid for a malformed rpc payload`
- `redeem returns a transport error when the rpc call fails`

`apps/web/src/lib/redemption/redeem-card.test.ts`:

- `redeemCardByPassword rejects a malformed intent before any io`
- `redeemCardByPassword returns the server outcome untouched when the rpc responds`
- `redeemCardByPassword queues the intent and never debits locally when the network fails` — a
  asserção central da Decisão 8: nenhum snapshot local de carteira ou coleção é escrito
- `redeemCardByPassword does not queue when the session is missing`
- `redeemCardByPassword returns redemption_unavailable when both the rpc and the queue fail`
- `redeemCardByPassword reuses the same redemption id across retries of one attempt`

`apps/web/src/lib/redemption/redemption-queue.test.ts`:

- `enqueue replaces an entry with the same redemption id instead of duplicating it`
- `listPending returns only the entries of the given player ordered by queuedAt`
- `listPending discards a corrupted record and keeps the valid ones`

`apps/web/src/lib/redemption/sync-redemption-queue.test.ts`:

- `syncRedemptionQueue resends every pending intent with its original redemption id`
- `syncRedemptionQueue removes an intent the server reports as already applied`
- `syncRedemptionQueue removes an intent that became unaffordable and reports it`
- `syncRedemptionQueue keeps an intent in the queue when the network still fails`

`packages/data/scripts/generate-card-prices-seed.test.ts`:

- `seed generator emits one row per card with a password and none for the 24 without`
- `seed generator prices a card without estrelas at the unpriced fallback`
- `seed generator stamps every row with the sealed dataset version`
- `seed generator produces byte-identical output for the same catalog` — determinismo

Hooks e componentes (`// @vitest-environment jsdom` por arquivo, padrão do repositório):

- `use-card-redemption.test.ts` — `hook goes from idle to submitting to settled on success`,
  `hook opens the confirmation step only when eligibility asks for it`,
  `cancelling the confirmation keeps the same redemption id for a later attempt`,
  `a second click while submitting does not start a second attempt`,
  `hook pushes the returned balance into the wallet store exactly once`
- `redeem-action.test.tsx` — `button label shows the price`,
  `button is disabled when the balance is short`,
  `button is disabled while a redemption is in flight`
- `expensive-redemption-dialog.test.tsx` — `dialog shows the price and asks for confirmation`,
  `cancelling closes the dialog without redeeming`, `escape closes the dialog`
- `redemption-feedback.test.tsx` — uma asserção por mensagem do bloco Error Handling do PRD:
  `success toast names the card and the new balance`,
  `insufficient message names the price and the balance`,
  `transaction failure states the balance was not changed`,
  `expired session asks the player to sign in again`,
  `unknown password names the card number`,
  `queued redemption announces it will finish when back online`

### Property-based (fast-check)

Invariantes de economia sobre `packages/rules/src/password/redemption.ts`, 1.000 execuções
cada (ADR-008: *"a economia deve ter testes que demonstrem uma unica aplicacao por recompensa e
ausencia de estado parcial em liberacoes"*):

- **Saldo nunca negativo:** para qualquer saldo inicial inteiro `≥ 0` e qualquer sequência
  arbitrária de liberações, `state.balanceStars` permanece inteiro `≥ 0` em todos os passos
  intermediários e no final.
- **Conservação:** para qualquer sequência de liberações **todas aplicadas** (ids distintos e
  saldo sempre suficiente), `saldo_final === saldo_inicial − Σ preços`.
- **Retry não duplica cobrança:** para qualquer sequência de intenções e qualquer permutação de
  repetições de `redemptionId` já presentes, o saldo final é igual ao da mesma sequência com as
  repetições removidas — reprocessar nunca cobra de novo.
- **Liberar a mesma carta N vezes cobra N vezes:** para qualquer `N` de 1 a 20 com ids
  **distintos** para a mesma carta, o saldo cai exatamente `N × preço` e a coleção soma `N`
  cópias — o oposto da propriedade anterior, e a Capability que distingue F04 de F02.
- **Ordem irrelevante:** aplicar um conjunto de liberações pagáveis em qualquer ordem produz o
  mesmo saldo final.
- **Totalidade:** para qualquer número (incluindo `NaN`, `Infinity`, negativos e não inteiros) e
  qualquer estado arbitrário, as três funções puras nunca lançam — sempre devolvem `Result`.

`apps/web/src/lib/redemption/redeem-card.properties.test.ts`:

- **Idempotência da orquestração:** chamar `redeemCardByPassword` de 1 a 20 vezes com a **mesma**
  intenção produz no máximo um `applied`; todas as demais são `already_applied` ou
  `queued_offline`, e o saldo refletido no store nunca é debitado mais de uma vez.

### Integração

`apps/web/tests/password-redemption.integration.test.ts` — contra o Supabase local
(`describe.skipIf(!hasSupabaseEnv)`; ver o aviso no topo da seção):

- `redeem_card_by_password debits the wallet and increments the collection in one transaction`
- `redeem_card_by_password blocks with insufficient_stars and writes nothing when the balance is short`
- `redeem_card_by_password leaves no password_releases row after an insufficient_stars attempt`
- `redeem_card_by_password charges only once for a repeated redemption id`
- `redeem_card_by_password charges twice for the same card under two redemption ids`
- `redeem_card_by_password prices from card_prices and ignores a lower expected price` — a prova
  de que o preço não vem do cliente: `p_expected_stars` menor aborta, nunca cobra menos
- `redeem_card_by_password aborts with preview_mismatch and writes nothing`
- `redeem_card_by_password rejects a p_player_id different from auth.uid()` — o guard do
  `CLAUDE.md` / migração `0006`
- `redeem_card_by_password raises for a redemption id owned by another player`
- `redeem_card_by_password returns unknown_password for a password absent from card_prices`
- `a concurrent apply_victory_reward and redeem_card_by_password never leave a negative balance` —
  a serialização por linha de `wallets` (Decisão 10)
- `the wallets check constraint rejects any attempt to drive stars below zero`
- `password_releases is readable only by its owner under RLS`
- `card_prices is not readable by an authenticated client`
- `the collection quantity grows past three copies through repeated redemptions` — Capability
  "cópias ilimitadas" (Decisão 6)
- `the transactional effect of redeem_card_by_password matches applyRedemptionToLedger` —
  o modelo puro e o banco concordam

`apps/web/tests/collection-cap-free.test.ts`:

- `no redemption path applies a copy ceiling to the collection`

`packages/data/scripts/card-prices-seed-parity.test.ts`:

- `the committed seed migration matches the sealed catalog card for card` — guarda de drift da
  Decisão 1
- `every seeded row carries the current dataset version`
- `no card without a password appears in the seed`

### Análise estática

- `packages/rules/src/password/redemption.ts` não importa `@yugioh/data`, `@yugioh/engine`,
  `@yugioh/ai`, React, DOM, `fetch`, `node:*` nem Supabase — asserção sobre os imports do
  diretório, no mesmo estilo do teste de fronteira de `free-duel/F06`. Necessária porque o
  `.dependency-cruiser.cjs` **não** detecta violações de fronteira entre pacotes neste
  repositório (todo import de workspace resolve como `couldNotResolve`, `CLAUDE.md`); o que ele
  ainda pega é `domain-cores-are-pure`, que também cobre estes arquivos.
- `packages/shared/src/economy/redemption*.ts` não importa nenhum pacote do monorepo.
- `packages/data/scripts/generate-card-prices-seed.ts` está **fora** de `packages/data/src/`, de
  modo que seu uso de `node:fs` não viola `domain-cores-are-pure`.
- Nenhum módulo sob `apps/web/src/lib/redemption/`, `apps/web/src/hooks/use-card-redemption.ts`
  ou `apps/web/src/components/password/` importa `lib/catalog/sealed-catalog.ts`,
  `lib/password/catalog-password.ts` ou `lib/server/*` — asserção que protege o bundle do
  browser de `node:fs`.
- `apps/web/src/lib/redemption/**` não importa `apps/web/src/lib/free-duel/**` nem
  `apps/web/src/lib/reward/**`.
- Nenhum módulo fora de `lib/wallet/**` e `lib/reward/**` escreve saldo: F04 só **lê** o store
  de F01 e chama `setAuthoritativeBalance` com um valor devolvido pelo servidor — trava a
  Capability "fonte única da verdade" de F01.
- Migrações `0001`–`0008` permanecem byte-idênticas; apenas as duas migrações novas são
  acrescentadas.
- `pnpm lint`, `pnpm typecheck` e `pnpm test` passam sem novos avisos.

### Testes de aceitação (critérios do PRD §9, F04)

| Critério (Seção 9 do PRD — F04) | Teste |
|---|---|
| Liberar debita exatamente o preço da carta do saldo **e** adiciona `+1` cópia à coleção (via `BuildDeck/F03`), de forma atômica | `redeem_card_by_password debits the wallet and increments the collection in one transaction` + `the transactional effect of redeem_card_by_password matches applyRedemptionToLedger` + propriedade de conservação |
| Com `saldo < preço`, a liberação é bloqueada **antes** de qualquer débito, com "Estrelas insuficientes: esta carta custa X⭐, você tem Y⭐." | `evaluateRedemptionEligibility reports how many stars are missing…` + `redeem_card_by_password blocks with insufficient_stars and writes nothing…` + `redeem_card_by_password leaves no password_releases row…` + `insufficient message names the price and the balance` |
| Liberar a mesma carta repetidamente é permitido; cada liberação paga o preço e soma outra cópia, sem teto de posse (o limite 3 é apenas de deck) | `applyRedemptionToLedger charges twice for the same card under two distinct redemption ids` + `redeem_card_by_password charges twice for the same card under two redemption ids` + `the collection quantity grows past three copies through repeated redemptions` + propriedade "liberar a mesma carta N vezes cobra N vezes" |
| Falha no meio da transação **não** deixa estado parcial: nunca há estrela debitada sem carta concedida nem carta concedida sem débito; o saldo é preservado e a operação pode ser retomada | Atomicidade da transação exercida por `redeem_card_by_password charges only once for a repeated redemption id` + `redeemCardByPassword queues the intent and never debits locally when the network fails` + propriedade "retry não duplica cobrança" |
| Sessão expirada ao liberar não altera saldo/coleção e solicita reautenticação | `redeem_card_by_password rejects a p_player_id different from auth.uid()` + `redeemCardByPassword does not queue when the session is missing` + `expired session asks the player to sign in again` |
| Cartas em `999999⭐` só são liberadas quando o saldo alcança esse valor (gate respeitado) | `evaluateRedemptionEligibility treats an exact balance as payable` + `redeem_card_by_password blocks with insufficient_stars…` aplicado a uma carta de `999999⭐` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: fluxo completo F02 → F03 → F04 → F05 sem estado inconsistente entre saldo e coleção | `redeem_card_by_password debits the wallet and increments the collection in one transaction` encadeado após um `apply_victory_reward`, verificando saldo, coleção e a linha de `password_releases` que F05 vai ler |
| Cross-Feature: o saldo exibido (F01) sempre reflete todos os créditos (F02) menos todos os débitos (F04), sem divergência | `a concurrent apply_victory_reward and redeem_card_by_password never leave a negative balance` + `hook pushes the returned balance into the wallet store exactly once` + propriedade de conservação |
| Cross-Feature: uma liberação bloqueada por saldo insuficiente (F04) não gera registro em F05 nem altera F01 | `redeem_card_by_password leaves no password_releases row after an insufficient_stars attempt` |
| Cross-PRD (**Build Deck**): a carta liberada entra na coleção via o sink de `BuildDeck/F03` e fica imediatamente disponível no editor de deck, respeitando o limite de 3 cópias **no deck** | `the collection quantity grows past three copies through repeated redemptions` + `no redemption path applies a copy ceiling to the collection` + asserção de que a leitura de coleção de `build-deck/F01` enxerga a nova quantidade e aplica `min(qty, 3)` só na montagem |
| Cross-PRD (**Library**): cartas liberadas por este módulo passam a constar como obtidas na Library | Asserção de que `collections.quantity ≥ 1` após uma liberação, que é a derivação "obtida" que `library/F01` usa |
| Cross-PRD (**Save/persistência**): saldo, liberações e coleção persistem na conta e sobrevivem à troca de dispositivo | `password_releases is readable only by its owner under RLS` + releitura do saldo e do extrato por um segundo cliente autenticado da mesma conta |
| Cross-PRD (**módulos de duelo**): o crédito de vitória e o débito de liberação não interferem entre si | `a concurrent apply_victory_reward and redeem_card_by_password never leave a negative balance` |
