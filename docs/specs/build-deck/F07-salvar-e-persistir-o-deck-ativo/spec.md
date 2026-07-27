# Salvar e Persistir o Deck Ativo

> PRD: `docs/prds/build-deck.md` — F07
> Pacote-alvo: `apps/web` (+ migração/RPC Supabase, `packages/shared`)

## 1. Contexto e Escopo

Esta é a última feature do módulo: persiste o rascunho de F05, uma vez validado por F06, como o
deck ativo único do jogador — servidor (conta) com cache local — e o recarrega ao abrir o Build
Deck. Fecha o ciclo `arquitetura.md` §9 (Fase 2): F02 → F04 → F05 → F06 → **F07**. A partir daqui,
o deck persistido é a fonte única que `MotorDuelo/F03`, Free Duel e Online Duel (cross-PRD)
recebem para iniciar um duelo.

### Incluído
- Salvar o rascunho apenas quando `F06.valido === true`; deck inválido nunca é persistido, com
  recusa no back-end mesmo por contorno de UI (PRD Core Scope + Capabilities).
- Gravar primeiro no cache local (imediato) e replicar ao servidor em até 2 s em rede normal (PRD
  Core Scope + Capabilities).
- Carregar o deck ativo persistido ao abrir o Build Deck, alimentando `inicializarRascunho` de F05
  (PRD Core Scope).
- Fila offline básica: em falha de rede, mantém o save no cache local e sincroniza
  automaticamente ao reconectar, sem intervenção do jogador (PRD Capabilities, incondicional).
- Aviso de conflito de versão entre dispositivos, mantendo sempre a última gravação válida (PRD
  Error Handling, incondicional).
- Salvar sobrescreve o deck ativo único — não cria novo slot (PRD Capabilities).

### Adiado
- **Resolução de conflito multi-dispositivo mais sofisticada** (comparar as duas versões, deixar o
  jogador escolher, mesclar cartas divergentes). A versão Core apenas detecta a divergência ao
  carregar e adota a última gravação válida do servidor com um aviso passivo — sem oferecer
  escolha entre versões (PRD Full Scope additions, item 1).
- **Sincronização em segundo plano via Service Worker/Background Sync API**, que sincronizaria
  mesmo com o app fechado. A versão Core sincroniza só em primeiro plano, disparada pelo evento
  `online` do navegador enquanto o app está aberto — mesmo mecanismo que `build-deck`/F03 já usa
  para a fila de recompensas (PRD Full Scope additions, item 2).

### Fronteiras
- **Não** decide se o deck é válido — isso é de **F06**; F07 só lê `valido` e recusa salvar
  quando `false` (validação redundante no back-end é defesa em profundidade, não uma segunda
  fonte de verdade).
- **Não** edita o conteúdo do rascunho — isso é de **F05**; F07 só lê o rascunho no momento do
  save.
- **Não** redesenha a tabela `active_decks` nem seu formato de coluna `cards jsonb` — ela já foi
  criada por `build-deck`/F02 (Decisão 10 daquela spec), que a antecipou por precisar dela antes
  de F07 existir na ordem das waves. F07 **herda** a mesma tabela.

### Contratos externos assumidos
Nenhum novo. F07 é consumida por três contratos externos que ainda não existem (nenhum bloqueia a
escrita desta spec, todos são cross-PRD e ficam do lado de fora, consumindo o que F07 produz):
- **`MotorDuelo`/F03 (cross-PRD)** — espera ler o deck ativo persistido (`active_decks`) como a
  lista de 40 cartas ao iniciar um duelo.
- **`free-duel`/FXX e `online-duel`/FXX (cross-PRD)** — mesma expectativa: nenhum rascunho não
  salvo chega a um duelo.

### Decisões e Premissas
| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | Escopo: **Core + fila offline básica**, conforme a entrevista — inclui a fila de sincronização e o aviso de conflito (ambos exigidos incondicionalmente por Capabilities/Error Handling do PRD, não apenas por Full Scope), mas adia a resolução de conflito multi-dispositivo mais ativa e a sincronização em segundo plano fora do app aberto. | entrevista | confirmada |
| 2 | **Refinamento do mecanismo de conflito** em relação à opção de entrevista: o servidor **nunca rejeita um save por versão desatualizada** — sempre aplica a última escrita válida (`last-write-wins`, coerente com o texto literal do PRD "mantém a última gravação válida"). A detecção de conflito acontece do lado do **cliente**, comparando `updated_at` do cache local com o do servidor **ao carregar** o deck, não ao salvar. Isso é mais simples que uma RPC com verificação de versão e ainda entrega a mensagem de aviso exigida. | PRD §6 F07 Error Handling (texto literal); entrevista | confirmada |
| 3 | `active_decks` é herdada de `build-deck`/F02 sem alteração de schema — nenhuma migração nova cria a tabela; F07 só adiciona a RPC de salvar e reusa a tabela existente. | precedente: spec `build-deck/F02` Decisão 10 | confirmada |
| 4 | A nova RPC `salvar_deck_ativo` é **liberada ao papel `authenticated`** (o próprio jogador chama diretamente), ao contrário da RPC restrita `persistir_deck_inicial` de F02. Justificativa: aqui o conteúdo do deck é uma **escolha legítima do jogador** — o que precisa de defesa é validar essa escolha (estrutura + posse real), não impedir o cliente de chamar a função, como era o caso em F02 (onde o conteúdo precisava ser comprovadamente aleatório). | `arquitetura.md` §5.2 ("nunca confiar em valor vindo do cliente" — aqui satisfeito por validação, não por restrição de papel); contraste com spec `build-deck/F02` Decisão 11 | confirmada |
| 5 | A validação estrutural (soma = 40, cada quantidade entre 1 e 3, chaves no formato de `numero`) é **reaplicada** dentro da nova RPC, espelhando a mesma checagem que `persistir_deck_inicial` (F02) já faz, em vez de extrair uma função SQL compartilhada — migrações já aplicadas não são reabertas; uma consolidação futura das duas checagens é um refinamento de manutenção, não um requisito desta feature. | decisão de projeto (migrações são aditivas, não retroativas) | confirmada |
| 6 | Além da validação estrutural, a RPC verifica que **cada quantidade em `cartas` não excede a quantidade possuída** em `collections` para aquele jogador — a mesma regra de posse que F06 já aplica no cliente, agora reforçada no servidor como defesa em profundidade (nunca confiar apenas na validação do cliente). Como nenhuma feature especificada até aqui reduz `collections` (só F02 semeia e F03 incrementa), essa checagem nunca deve falhar em uso normal — mas protege contra um cliente adulterado chamando a RPC diretamente. | `arquitetura.md` §5.2; PRD §6 F07 Error Handling ("apenas cartas possuídas") | confirmada |
| 7 | A fila offline desta feature é um **slot único por jogador** (chave = `playerId`), não uma lista como a de `build-deck`/F03 — como há **1 deck único**, um novo save enquanto offline **substitui** a pendência anterior em vez de enfileirar as duas; só a última tentativa importa. | PRD Capabilities ("1 deck único... sobrescreve") | confirmada |
| 8 | Enquanto existe uma pendência local não sincronizada para o jogador, o carregamento do deck ativo **não** compara `updated_at` para detectar conflito — a divergência esperada (servidor ainda não recebeu o save local) não é um conflito real. A comparação só acontece quando não há pendência em aberto. | decisão de projeto (evitar falso-positivo durante lag de sincronização) | confirmada |
| 9 | `salvarDeckAtivo` reaplica `validarDeck` (F06) **antes** de qualquer tentativa de rede, como defesa em profundidade contra um "Salvar deck" habilitado por um estado de UI desatualizado — nunca confia apenas no botão estar habilitado. | `arquitetura.md` §5.2; precedente: mesma filosofia de F03 (valida antes de qualquer efeito colateral) | confirmada |
| 10 | Falha de sessão expirada durante a sincronização é distinguida de falha de rede genérica (mensagens diferentes no PRD) — em ambos os casos a pendência **permanece** na fila; a diferença é só a mensagem exibida e se o app solicita reautenticação. | PRD §6 F07 Error Handling | confirmada |
| 11 | Serialização do rascunho para o payload da RPC reusa `serializarColecao` de `banco-de-cartas`/F01 — nenhuma função nova de serialização é criada. | precedente: spec `build-deck/F01` Seção 4 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/deck/tipos.ts` | shared | alterado | Acrescenta `ResultadoSalvarDeck`, `DeckAtivoCarregado`, `RegistroDeckAtivoCache` |
| `supabase/migrations/0003_create_rpc_salvar_deck_ativo.sql` | raiz | novo | RPC `salvar_deck_ativo`, `GRANT EXECUTE` ao papel `authenticated`; **não** recria `active_decks` |
| `apps/web/src/lib/deck-ativo/repositorio-supabase.ts` | web | novo | Leitura de `active_decks` por `player_id` e chamada da RPC `salvar_deck_ativo` |
| `apps/web/src/lib/deck-ativo/cache-indexeddb.ts` | web | novo | Store `deck_ativo_cache`: `{ playerId, cartas, atualizadoEm, sincronizado }`, chave `playerId` |
| `apps/web/src/lib/deck-ativo/fila-pendente.ts` | web | novo | Store `deck_ativo_pendente` (slot único por `playerId`): gravar/ler/remover a pendência de save |
| `apps/web/src/lib/deck-ativo/carregar-deck-ativo.ts` | web | novo | `carregarDeckAtivo` — orquestra servidor → cache, detecta conflito quando não há pendência |
| `apps/web/src/lib/deck-ativo/salvar-deck-ativo.ts` | web | novo | `salvarDeckAtivo` — revalida com F06, tenta RPC, cai para cache+fila em falha de rede |
| `apps/web/src/lib/deck-ativo/sincronizar-pendencia.ts` | web | novo | `sincronizarPendenciaDeckAtivo` — reenvia a pendência ao reconectar |
| `apps/web/src/hooks/use-deck-ativo.ts` | web | novo | Hook fino: carrega ao montar, expõe `salvar()`, status (`salvo`/`salvo_offline`/`sincronizado`/`recusado`), e o aviso de conflito |
| `apps/web/src/hooks/use-sincronizacao-deck-ativo.ts` | web | novo | Dispara `sincronizarPendenciaDeckAtivo` no evento `online` do navegador — mesmo padrão de `use-sincronizacao-recompensas` (F03) |
| `apps/web/src/components/build-deck/indicador-salvar.tsx` | web | novo | Botão "Salvar deck" (habilitado só com `F06.valido`) + indicador de status/conflito |
| `apps/web/src/app/build-deck/page.tsx` | web | alterado | Inicializa `useDeckAtivo` no lugar da leitura direta de F02 usada por F05, conecta o indicador |
| `apps/web/tests/build-deck-salvar.integration.test.ts` | web | novo | Fluxo completo: salvar válido, recusa de inválido, falha de rede → fila → sincronização, conflito ao carregar |

**Verificação da direção de dependências:** `packages/shared` continua sem importar nenhum outro
pacote do monorepo — os tipos novos são só dados. `apps/web/src/lib/deck-ativo/**` é o único ponto
com Supabase e IndexedDB para esta feature (guidelines §7.3), assim como `apps/web/src/lib/colecao/**`
já é para F01. Nenhum arquivo importa `engine`, `ai` ou `server`. A migração e a RPC vivem em
`supabase/`, fora do grafo de pacotes TypeScript. Esta feature **não toca `packages/engine`** —
PRNG semeado e estado de duelo serializável não se aplicam; a garantia relevante aqui é a mesma de
F01/F02/F03: I/O confinado a `apps/web/src/lib/**`.

## 3. Design Técnico

### Estruturas de dados

**`ResultadoSalvarDeck`** — união discriminada por `status`, devolvida por `salvarDeckAtivo`:

```
| { status: 'salvo'; atualizadoEm: string }       // confirmado pelo servidor nesta chamada
| { status: 'salvo_offline' }                      // só no cache local; pendência enfileirada
| { status: 'recusado'; motivo: 'deck_invalido' }  // F06 ou o back-end recusaram; nada foi escrito
| { status: 'sessao_expirada' }                    // pendência mantida; requer reautenticação
```

**`DeckAtivoCarregado`** — devolvida por `carregarDeckAtivo`:

| Campo | Tipo | Semântica |
|---|---|---|
| `cartas` | `RascunhoDeck` (reuso do alias de F05) | O deck ativo, `numero → quantidade` |
| `atualizadoEm` | `string` (ISO 8601) | Timestamp do servidor (ou do cache, se offline) |
| `origem` | `'servidor' \| 'cache'` | De onde veio, mesmo vocabulário de F01 |
| `conflitoDetectado` | `boolean` | `true` quando o `atualizadoEm` do servidor diverge do cache local e não havia pendência em aberto (Decisão 8) |

**`RegistroDeckAtivoCache`** (IndexedDB, store `deck_ativo_cache`) — `{ playerId, cartas:
ColecaoSerializada, atualizadoEm, sincronizado: boolean }`; `sincronizado = false` enquanto uma
pendência local ainda não foi confirmada pelo servidor.

**Pendência do save** (IndexedDB, store `deck_ativo_pendente`, **slot único** por `playerId`) —
`{ playerId, cartas: ColecaoSerializada, enfileiradoEm }`. Um novo save enquanto offline
**substitui** este registro (Decisão 7); nunca existem duas pendências para o mesmo jogador.

### Fluxo

**Carregar o deck ativo** (`carregarDeckAtivo`, ao abrir `/build-deck`):

1. Verifica se existe pendência local (`deck_ativo_pendente`) para o jogador.
2. Tenta ler `active_decks` no servidor.
   - Sucesso, **sem** pendência local: se o `atualizadoEm` do servidor difere do
     `atualizadoEm` do cache local, marca `conflitoDetectado = true` — o dispositivo estava
     desatualizado porque outro salvou depois. Em ambos os casos (com ou sem divergência), adota
     `cartas`/`atualizadoEm` do servidor e regrava o cache local, `origem = 'servidor'`.
   - Sucesso, **com** pendência local: não compara `atualizadoEm` (Decisão 8); dispara a
     sincronização da pendência (fluxo abaixo) e, ao concluir, repete este carregamento.
   - Falha de rede: cai para o cache local (`origem = 'cache'`), sem detectar conflito (não dá
     para comparar sem o servidor).
3. Devolve `DeckAtivoCarregado` para a página inicializar `useRascunhoDeck` (F05) com `cartas`.

**Salvar o deck ativo** (`salvarDeckAtivo`, ao clicar "Salvar deck"):

4. Revalida com `validarDeck(rascunho, colecaoJogador)` (F06) antes de qualquer efeito colateral
   (Decisão 9). Inválido ⇒ `{ status: 'recusado', motivo: 'deck_invalido' }`, nada é escrito.
5. Serializa o rascunho (`serializarColecao`, F01) e chama a RPC `salvar_deck_ativo`.
   - Sucesso ⇒ grava `deck_ativo_cache` com `sincronizado = true` e o `atualizadoEm` devolvido;
     remove qualquer pendência antiga (não deveria existir, mas limpa por segurança); devolve
     `{ status: 'salvo', atualizadoEm }`.
   - Back-end recusa por deck inválido (contorno de UI/defesa em profundidade) ⇒
     `{ status: 'recusado', motivo: 'deck_invalido' }`, nada é escrito localmente.
   - Sessão expirada/`401` ⇒ grava `deck_ativo_cache` (`sincronizado = false`) e
     `deck_ativo_pendente` na mesma transação IndexedDB; devolve `{ status: 'sessao_expirada' }`.
   - Falha de rede/timeout ⇒ mesma escrita atômica de cache + pendência; devolve
     `{ status: 'salvo_offline' }`.

**Sincronizar a pendência** (`sincronizarPendenciaDeckAtivo`, disparada no evento `online`):

6. Lê a pendência do jogador (se houver). Sem pendência, não faz nada.
7. Revalida a pendência contra o catálogo/posse **atual** — chama a mesma RPC `salvar_deck_ativo`.
   - Sucesso ⇒ atualiza `deck_ativo_cache` (`sincronizado = true`, novo `atualizadoEm`), remove a
     pendência.
   - Recusa estrutural/posse (definitiva — não vai se resolver sozinha reenviando) ⇒ remove a
     pendência, marca `deck_ativo_cache` com um aviso de recusa para a UI mostrar a mensagem do
     PRD, sem retentar para sempre (mesmo espírito do passo 10 de `build-deck`/F03).
   - Falha de rede novamente ⇒ mantém a pendência, tenta de novo no próximo evento `online`.

### Regras de negócio

- **Deck inválido nunca é persistido**, nem por F06 (não confirma), nem pela RPC (recusa
  independentemente) — duas checagens redundantes, nenhuma delas opcional (`arquitetura.md` §5.2).
- **1 deck único, sempre sobrescrito**: `active_decks` tem `player_id` como chave primária
  (herdada de F02); salvar é sempre um upsert na própria linha, nunca uma nova linha.
- **Última gravação válida vence** entre dispositivos: a RPC nunca rejeita por estar "desatualizada" — o conflito é só informativo, detectado no carregamento seguinte (Decisão 2).
- **A fila é um slot, não uma lista**: reenfileirar substitui a pendência anterior (Decisão 7).
- **Cache e pendência são escritos atomicamente** na mesma transação IndexedDB sempre que o
  caminho online falha — nunca um sem o outro (mesmo padrão de F03 para cache + fila).

### Determinismo e pureza

Esta feature não toca `packages/engine`; PRNG semeado e round-trip de estado de duelo não se
aplicam. Não introduz nenhuma função pura nova relevante além do reuso de `validarDeck` (F06) e
`serializarColecao` (F01) — a superfície nova é inteiramente de orquestração de I/O em
`apps/web/src/lib/deck-ativo/**`, que é o único ponto com Supabase/IndexedDB desta feature.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`ResultadoSalvarDeck`**, **`DeckAtivoCarregado`** — descritos na Seção 3. Não são fronteira de
  rede direta (a RPC tem seu próprio formato de payload, Seção abaixo), mas são o contrato interno
  entre `apps/web/src/lib/deck-ativo` e a UI.
- **`RascunhoDeck`, `Colecao`, `NumeroCarta`, `Result`, `DomainError`** — reusados de
  `packages/shared` conforme as specs de `banco-de-cartas`/F01, `build-deck`/F01 e
  `build-deck`/F05. **Não são redefinidos aqui.**

Novo código de `DomainError`: `persistencia_indisponivel` (rede indisponível **e** IndexedDB
indisponível ao mesmo tempo — não há onde gravar o save nem localmente nem remotamente). Reusa
`sessao_ausente` de F01 quando aplicável antes mesmo de tentar a RPC.

### Funções públicas

```
// apps/web/src/lib/deck-ativo — fronteira de I/O

carregarDeckAtivo(playerId: string, deps: DependenciasDeckAtivo): Promise<Result<DeckAtivoCarregado, DomainError>>
  // pós: origem='servidor' e conflitoDetectado=true ⇒ atualizadoEm do servidor != cache local
  //      e nenhuma pendência local em aberto; origem='cache' ⇒ falha de rede

salvarDeckAtivo(rascunho: RascunhoDeck, colecaoJogador: Colecao, deps: DependenciasDeckAtivo): Promise<Result<ResultadoSalvarDeck, DomainError>>
  // pré: chamado só quando a UI já observou F06.valido, mas revalida internamente (Decisão 9)
  // pós: status='recusado' ⇒ nenhuma escrita local nem remota;
  //      status='salvo' ⇒ cache atualizado e sincronizado=true;
  //      status='salvo_offline'|'sessao_expirada' ⇒ cache+pendência escritos atomicamente

sincronizarPendenciaDeckAtivo(deps: DependenciasDeckAtivo): Promise<SincronizacaoDeckResumo>
  // pós: sem pendência ⇒ no-op; sucesso ⇒ pendência removida, cache sincronizado=true;
  //      recusa definitiva ⇒ pendência removida com aviso; falha de rede ⇒ pendência mantida
```

```
// apps/web/src/lib/deck-ativo/cache-indexeddb e fila-pendente — fronteira de I/O (IndexedDB)

lerCacheDeckAtivo(playerId: string): Promise<RegistroDeckAtivoCache | undefined>
gravarCacheDeckAtivo(registro: RegistroDeckAtivoCache): Promise<void>

lerPendenciaDeckAtivo(playerId: string): Promise<RegistroPendenciaDeckAtivo | undefined>
gravarPendenciaDeckAtivo(pendencia: RegistroPendenciaDeckAtivo): Promise<void>
removerPendenciaDeckAtivo(playerId: string): Promise<void>
```

### Endpoints / RPC / mensagens de rede

RPC Postgres `salvar_deck_ativo(p_player_id uuid, p_cartas jsonb) RETURNS TABLE(atualizado_em
timestamptz)` — `SECURITY DEFINER`, `GRANT EXECUTE` a `authenticated` (Decisão 4), transação
única:

1. Valida a estrutura de `p_cartas`: toda chave casa `^[0-9]{3}$`, todo valor é inteiro entre 1 e
   3, soma exatamente 40 (mesma checagem de `persistir_deck_inicial`, F02) — falha ⇒ exceção
   `deck_invalido`, nada é escrito (Decisão 5).
2. Para cada `numero` em `p_cartas`, verifica `quantidade <= COALESCE((SELECT quantity FROM
   collections WHERE player_id = p_player_id AND numero = numero), 0)` — falha em qualquer carta
   ⇒ exceção `deck_invalido`, nada é escrito (Decisão 6).
3. `INSERT INTO active_decks (player_id, cards, updated_at) VALUES (p_player_id, p_cartas, now())
   ON CONFLICT (player_id) DO UPDATE SET cards = EXCLUDED.cards, updated_at = now()`.
4. Devolve `atualizado_em` da linha resultante.

Chamada:

```json
{ "p_player_id": "6f1c9e10-...", "p_cartas": { "001": 3, "045": 2, "333": 1 } }
```

Resposta — sucesso:

```json
{ "atualizado_em": "2026-07-27T12:00:05.000Z" }
```

Resposta — recusa (exceção sinalizada, traduzida pelo repositório para `DomainError` `deck_invalido`):

```json
{ "erro": "deck_invalido" }
```

Registro na fila de pendência (IndexedDB), chave `playerId`:

```json
{
  "playerId": "6f1c9e10-...",
  "cartas": { "001": 3, "045": 2, "333": 1 },
  "enfileiradoEm": "2026-07-27T12:00:03.500Z"
}
```

### Contratos externos (cross-PRD)

- **`MotorDuelo`/F03 (cross-PRD)** — *a ser fornecido pelo módulo de duelo.* Espera ler
  `active_decks` (ou um endpoint que a exponha) para obter o deck de 40 cartas ao iniciar um
  duelo; F07 garante que essa linha só existe com um deck estruturalmente válido.
- **`free-duel`/FXX, `online-duel`/FXX (cross-PRD)** — mesma expectativa: nenhum rascunho não
  salvo chega a um duelo, só o que F07 persistiu.

## 5. Modelo de Dados

### Postgres / Supabase

`active_decks` **já existe** (criada por `build-deck`/F02, migração
`0002_create_active_decks_and_rpc_gerar_deck_inicial.sql`) — F07 não altera colunas nem RLS dessa
tabela, apenas adiciona uma segunda função capaz de escrevê-la.

**RPC `salvar_deck_ativo`** — descrita na Seção 4. `SECURITY DEFINER` porque escreve em
`active_decks`, cuja única política de escrita são funções `SECURITY DEFINER` (mesmo padrão de
F02); mas, ao contrário de `persistir_deck_inicial`, seu `GRANT EXECUTE` é concedido a
`authenticated` (Decisão 4) — a função em si é quem impede conteúdo forjado, validando estrutura e
posse antes de escrever.

**RLS:** nenhuma política nova — a política de `SELECT` de `active_decks` (criada por F02) já
cobre a leitura que `carregarDeckAtivo` faz; a escrita continua exclusiva de funções `SECURITY
DEFINER`.

**Migração:** `supabase/migrations/0003_create_rpc_salvar_deck_ativo.sql` cria só a função
`salvar_deck_ativo` e seu `GRANT`; é aditiva, não toca `0001_create_collections.sql` nem
`0002_create_active_decks_and_rpc_gerar_deck_inicial.sql`.

**Atomicidade e idempotência:** a escrita em si já é idempotente por natureza — salvar o mesmo
`cartas` duas vezes produz o mesmo estado final (upsert por `player_id`, chave primária única);
não há necessidade de uma tabela de ledger como a de F03, porque não há "soma" a proteger contra
duplicação, só uma sobrescrita.

### Cache local / fila offline

| Item | Definição |
|---|---|
| Banco | Mesmo IndexedDB da aplicação (F01/F03), versão elevada para 3 |
| Store `deck_ativo_cache` | Chave `playerId`; valor `{ playerId, cartas, atualizadoEm, sincronizado }` |
| Store `deck_ativo_pendente` | Chave `playerId` (**slot único**, Decisão 7); valor `{ playerId, cartas, enfileiradoEm }` |
| Escrita da pendência | Sempre na mesma transação IndexedDB que a atualização do cache (`sincronizado = false`) — nunca uma sem a outra |
| Leitura da pendência | Ao carregar (decidir se pula a checagem de conflito, Decisão 8) e ao sincronizar |
| Remoção da pendência | Após a RPC confirmar o save (sucesso) ou recusar de forma definitiva (estrutura/posse inválida) |

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|----------------------|
| Tentar salvar deck inválido (contorno de UI; F06 mostrava violações mas o botão foi acionado mesmo assim) | `validarDeck` (revalidação local) ou a RPC recusam | Nenhuma escrita local nem remota | "Deck inválido: exatamente 40 cartas, máx. 3 cópias, apenas cartas possuídas." |
| Falha de rede ao salvar | timeout/erro de rede na chamada da RPC | Grava cache (`sincronizado=false`) + pendência na mesma transação | "Salvo offline — sincronizando quando a conexão voltar." |
| Conflito de versão (deck alterado em outro dispositivo) | `carregarDeckAtivo` compara `atualizadoEm` do servidor com o do cache, sem pendência em aberto | Adota a versão do servidor, regrava o cache | "Seu deck foi atualizado em outro dispositivo; a versão mais recente foi mantida." |
| Sessão expirada/sem autorização ao sincronizar | RPC devolve `401`/erro de autorização | Mantém cache e pendência; não descarta | "Faça login novamente para sincronizar seu deck." |
| Pendência local existe e o carregamento também detectaria divergência de `atualizadoEm` | pendência presente (Decisão 8) | Pula a comparação de conflito; dispara sincronização da pendência primeiro | — (sem aviso de conflito nesse caso; não é um conflito real, é lag de sincronização) |
| Recusa definitiva ao sincronizar uma pendência (estrutura/posse inválida, ex.: coleção mudou de forma incompatível) | RPC recusa durante `sincronizarPendenciaDeckAtivo` | Remove a pendência (não retenta para sempre); marca aviso de recusa no cache para a UI | "Deck inválido: exatamente 40 cartas, máx. 3 cópias, apenas cartas possuídas." |
| Rede **e** IndexedDB indisponíveis ao mesmo tempo (modo privativo + offline) | ambas as escritas falham | Nenhum estado é gravado; erro genuíno devolvido à UI | `persistencia_indisponivel` — "Não foi possível salvar seu deck agora. Tente novamente." |
| Nenhum deck ativo encontrado nem no servidor nem no cache (F02 ainda não rodou) | ausência total de `active_decks`/cache | Reusa a mensagem de F02 (herdada por F05) em vez de inventar uma nova | "Preparando seu deck inicial…" |

## 7. Estratégia de Testes

### Unitários (Vitest)

- `salvarDeckAtivo recusa sem escrever quando validarDeck aponta violacao mesmo com botao habilitado`
- `salvarDeckAtivo devolve salvo com o atualizadoEm da RPC quando a chamada online funciona`
- `salvarDeckAtivo grava cache e pendencia atomicamente quando a rede falha`
- `salvarDeckAtivo devolve sessao_expirada mantendo a pendencia quando a RPC nega autorizacao`
- `carregarDeckAtivo adota a versao do servidor e marca conflito quando o atualizadoEm diverge do cache sem pendencia`
- `carregarDeckAtivo nao marca conflito quando existe pendencia local em aberto`
- `carregarDeckAtivo cai para o cache local quando o servidor esta inacessivel`
- `sincronizarPendenciaDeckAtivo remove a pendencia e atualiza o cache quando a RPC confirma`
- `sincronizarPendenciaDeckAtivo mantem a pendencia quando a rede falha novamente`
- `sincronizarPendenciaDeckAtivo remove a pendencia com aviso quando a recusa e definitiva`

### Property-based (fast-check)

- `salvar o mesmo rascunho valido duas vezes seguidas produz o mesmo active_decks final` — round-trip de idempotência da RPC (upsert por `player_id`), gerando rascunhos válidos arbitrários.
- `salvarDeckAtivo nunca escreve cache nem pendencia quando validarDeck reporta invalido` — para qualquer combinação arbitrária de rascunho/coleção que produza violação em F06.

### Integração

- `apps/web/tests/build-deck-salvar.integration.test.ts`: fluxo completo — deck válido em 40/40,
  clicar "Salvar deck", ver "Deck salvo" e depois "sincronizado"; deck inválido com botão
  desabilitado por F06 (nenhuma tentativa de salvar é sequer possível pela UI); simular falha de
  rede e ver "Salvo offline", reconectar e ver a pendência sumir; simular servidor com
  `atualizadoEm` mais recente que o cache local (sem pendência) e ver o aviso de conflito ao
  reabrir o Build Deck.
- Migração: `RPC salvar_deck_ativo recusa cartas com soma diferente de quarenta`,
  `RPC salvar_deck_ativo recusa carta alem da quantidade possuida em collections`,
  `RPC salvar_deck_ativo sobrescreve active_decks existente preservando a chave primaria unica`,
  `papel authenticated consegue executar salvar_deck_ativo diretamente` (ao contrário de
  `persistir_deck_inicial`, Decisão 4).

### Análise estática

- `apps/web/src/lib/deck-ativo/**` é o único ponto desta feature com Supabase e IndexedDB
  (guidelines §7.3, mesma regra de fronteira que F01/F03 já aplicam).

### Testes de aceitação (critérios do PRD)

| Critério (Seção 9 do PRD) | Teste |
|---|---|
| Salvar só é permitido com deck 100% válido; um deck inválido nunca é persistido, mesmo por contorno de UI | `salvarDeckAtivo recusa sem escrever...` + `RPC salvar_deck_ativo recusa cartas com soma diferente de quarenta` + `...recusa carta alem da quantidade possuida` |
| Um save válido grava no cache local imediatamente e replica ao servidor em até 2 s em rede normal | `salvarDeckAtivo devolve salvo com o atualizadoEm da RPC...` — grava cache e chama a RPC na mesma invocação, sem etapa intermediária que introduza atraso artificial |
| Em falha de rede, o save é mantido localmente e sincronizado automaticamente na reconexão, sem perda | `salvarDeckAtivo grava cache e pendencia atomicamente...` + `sincronizarPendenciaDeckAtivo remove a pendencia e atualiza o cache...` |
| Salvar sobrescreve o deck ativo único; ao reabrir o Build Deck, o deck ativo persistido é carregado | `RPC salvar_deck_ativo sobrescreve active_decks existente preservando a chave primaria unica` + `carregarDeckAtivo` (teste de integração) |
| Conflito entre dispositivos mantém a última gravação válida e avisa o jogador | `carregarDeckAtivo adota a versao do servidor e marca conflito...` |

### Testes de integração cross-feature e cross-PRD

| Critério | Teste |
|---|---|
| Fluxo completo F02 → F04 → F05 → F06 → F07 sem estado inconsistente entre coleção e deck | `build-deck-salvar.integration.test.ts` cobre a ponta F05/F06 → F07; as pontas com F02 (carregamento inicial) e os módulos de duelo (cross-PRD) ficam marcadas como pré-requisito de integração para quando essas specs/módulos existirem |
| Cross-PRD (Motor de Duelo 1x1): o deck válido de 40 cartas persistido por F07 é aceito por `MotorDuelo/F03` sem rejeição por tamanho/cópias | `RPC salvar_deck_ativo recusa cartas com soma diferente de quarenta` garante que nenhuma linha de `active_decks` escrita por esta RPC pode violar 40/≤3 — pré-condição estrutural que `MotorDuelo/F03` vai assumir |
| Cross-PRD (Free Duel / Online Duel): nenhum rascunho não salvo chega ao duelo | reforçado por `salvarDeckAtivo` nunca escrever `active_decks` a partir de um rascunho inválido — mesma garantia do critério anterior |
