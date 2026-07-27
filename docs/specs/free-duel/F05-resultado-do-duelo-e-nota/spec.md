# Resultado do Duelo e Nota

> PRD: `docs/prds/free-duel.md` — F05
> Pacote-alvo: `packages/rules` (+ `packages/shared`, `apps/web`)

## 1. Contexto e Escopo

Esta feature é o **tradutor único** entre o desfecho técnico do Motor de Duelo e a recompensa que
o jogador entende. Ela recebe a sessão encerrada de F03, extrai o desfecho (vencedor, perdedor,
motivo) que `MotorDuelo/F12` (cross-PRD, sem spec própria) produziu, e — **apenas quando o jogador
venceu** — obtém do snapshot já especificado por `MotorDuelo/F05` (`docs/specs/motor-duelo-1x1/
F05-serializacao-e-snapshot-do-estado/spec.md`, spec já publicada) a nota calculada pelo **Rating
Engine** (cross-PRD, sem PRD e sem spec — porta injetada) e a tabela nota→recompensa aplicável.
O resultado desse trabalho é um **único objeto consolidado** que F06 (drop de carta), F07
(carteira de estrelas) e F08 (revanche/navegação) vão consumir sem tocar no motor nem no Rating
Engine diretamente (PRD F05 Capabilities: "é o ponto único que traduz o desfecho técnico do motor
em recompensa").

A feature pertence à **Fase 3** do roadmap (`arquitetura.md` §9 — "Free Duel vs IA") e à **Wave 3**
do PRD (junto de F04). Ela depende internamente de **F03** (spec já existe neste lote — o desfecho
`encerrada` de `SessaoDuelo` expõe `estadoFinal: EstadoDuelo` com `fase: 'fim'`) e, cross-PRD, de
**`MotorDuelo/F12`** (sem spec — modelada como porta injetada, ver Decisão 2), **`MotorDuelo/F05`**
(com spec — reusada literalmente, ver Decisão 3) e **Rating Engine** (sem PRD — porta injetada,
ver Decisão 4). Nenhuma dessas três dependências cross-PRD tem código implementado; todas são
contratos declarados na Seção 4.

A alocação segue a mesma filosofia de três camadas de F02: **contratos** (tipos e schemas zod) em
`packages/shared`; o **núcleo puro de interpretação e consolidação** em `packages/rules` (mesmo
pacote cujo charter F02 já ampliou para regra de composição de deck — a lógica de "desfecho do
motor → recompensa consolidada" é igualmente reusável por Online Duel e Campanha quando existirem,
não é exclusiva do Free Duel); e o **I/O** — chamar a porta do Rating Engine, serializar o estado,
cachear por sessão, logar incidentes e renderizar o painel de resultado — confinado a `apps/web`
(`arquitetura.md` §7, "UI **não** contém regra"; ADR-004).

### Incluído

- Contratos canônicos do desfecho e do resultado consolidado em `packages/shared`: vocabulário de
  motivo de encerramento, desfecho do jogador, nota (opaca), recompensa por nota, e a união
  discriminada `ResultadoConsolidadoDuelo` que F06/F07/F08 consomem
- **Extração e validação estrutural do desfecho do motor** a partir de `estadoFinal` (fase `fim`),
  via uma porta injetada — não um campo hard-coded, porque `MotorDuelo/F12` ainda não tem spec
  (Decisão 2)
- **Mapeamento puro** do desfecho do motor (vencedor/perdedor/motivo) para o desfecho do jogador
  (vitória/derrota/empate), fixando a convenção jogador=P1/CPU=P2 herdada de F03
- **Consolidação pura** do resultado final: só o ramo de vitória carrega nota + recompensa;
  derrota e empate nunca carregam esses campos — estado inválido irrepresentável no tipo
- **Serialização do estado final** via `serializar()` de `MotorDuelo/F05` (já especificada) como
  insumo do Rating Engine — nenhum formato de snapshot novo é inventado
- **Porta injetada do Rating Engine** (`PortaRatingEngine`): schema + tipos de entrada/saída,
  sem escala de notas nem pesos (pendência explícita, PRD Seção 9)
- **Recompensa mínima garantida** na indisponibilidade do Rating Engine durante uma vitória —
  tratamento deliberadamente diferente do fallback neutro de outras tabelas pendentes (Decisão 6)
- Cache em memória por sessão de duelo, evitando reprocessar/rechamar o Rating Engine em
  re-renderizações da tela de resultado
- Registro estruturado do incidente quando o Rating Engine falha, expira ou responde fora do
  schema esperado
- Painel de apresentação do resultado (desfecho, motivo, e — na vitória — nota e estrelas),
  consumido pela tela de duelo que F03 já monta

### Fronteiras

Delimitadas pela Seção 7 do PRD (Fora de Escopo) e pelos blocos Consumes/Provides vizinhos:

- **Cálculo da nota e a tabela nota→recompensa** → **Rating Engine (cross-PRD)**. F05 consome o
  resultado através da porta; não calcula, não pondera e não define escala. — PRD §7
- **Resolução de regras de combate, turnos, invocação** → **Motor de Duelo 1x1 (cross-PRD)**. F05
  só lê o desfecho já decidido; nunca recalcula LP, turno ou vencedor.
- **Como o duelo termina** (jogar até o motor decidir, ou rendição/abandono via F04) → **F04**.
  F05 trata todo `motivo` uniformemente, incluindo `rendicao` — não distingue de onde veio o
  encerramento.
- **Sorteio da carta e ponderação por faixa de raridade** → **F06**. F05 apenas entrega a
  `faixaRaridade` da recompensa; não escolhe carta nenhuma.
- **Crédito de estrelas na carteira** → **F07**. F05 apenas entrega `estrelas`; não toca
  `wallets` nem qualquer tabela de economia.
- **Revanche e navegação pós-duelo** → **F08**. F05 apenas expõe o resultado consolidado como
  entrada; não decide o que acontece depois.
- **Orquestração da partida, sessão ativa, seed** → **F03**. F05 só consome a sessão já
  **encerrada**; não inicia, não conduz e não valida deck.
- **Renderização fina, animação e som** → camada de apresentação (PRD §7). Esta spec descreve
  estrutura de painel, estados e mensagens, não estética.

### Contratos externos assumidos

- **F03 (interno, spec já existe neste lote)** — `SessaoDuelo`, união discriminada por `fase`
  (`nao_iniciada | em_andamento | encerrada | falha`); no desfecho `encerrada`, expõe
  `estadoFinal: EstadoDuelo` com `fase: 'fim'`. Detalhe em §4.
- **`MotorDuelo/F12` (cross-PRD, sem spec)** — encerramento do duelo com vencedor, perdedor e
  motivo. Modelado como porta injetada `ExtrairDesfechoMotor`, não como campo hard-coded de
  `EstadoDuelo` (Decisão 2). *A ser fornecido por Motor de Duelo 1x1.*
- **`MotorDuelo/F05` (cross-PRD, spec já publicada)** — `serializar(estado: EstadoDuelo): Snapshot`
  em `packages/engine/src/serializacao/`. F05 (free-duel) importa e usa literalmente; não duplica
  formato de snapshot (Decisão 3). *Já especificado, ainda sem implementação em código.*
- **Rating Engine (cross-PRD, sem PRD e sem spec)** — avalia um snapshot e devolve nota +
  recompensa. Modelado como porta injetada `PortaRatingEngine` (Decisão 4). *A ser fornecido por
  um módulo ainda inexistente.*

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A alocação segue três camadas: **contratos** em `packages/shared`, **núcleo puro de interpretação/consolidação** em `packages/rules`, **I/O e apresentação** em `apps/web`. `packages/rules` é reusado (não só `data`) porque a mesma lógica "desfecho do motor + nota → recompensa consolidada" servirá Online Duel e Campanha quando existirem — é regra de duelo genérica, não peculiaridade do Free Duel. Mesma justificativa usada por `free-duel` F02 (Decisão 1) para ampliar o charter de `rules`. | `arquitetura.md` §2, §7; guidelines §3.2; precedente `free-duel` F02 (Decisão 1) | confirmada |
| 2 | `MotorDuelo/F12` não tem spec própria. Em vez de assumir um nome de campo dentro de `EstadoDuelo` que F12 ainda não definiu, F05 modela a extração como uma **porta injetada** `ExtrairDesfechoMotor: (estadoFinal: EstadoDuelo) => Result<DesfechoMotor, DomainError>` — o mesmo padrão de `ConsultaCatalogo` (F01) para contratos cross-PRD ainda inexistentes. Quando `MotorDuelo/F12` ganhar spec, ela implementa essa porta; F05 não precisa mudar. | PRD §8 (F12 sem spec); precedente `free-duel` F01 (`ConsultaCatalogo`); guidelines §10.1 (interfaces em fronteiras) | **a confirmar** — reavaliar quando `MotorDuelo/F12` ganhar spec |
| 3 | `MotorDuelo/F05` **já tem spec publicada** (`docs/specs/motor-duelo-1x1/F05-.../spec.md`). F05 (free-duel) reusa literalmente `serializar(estado: EstadoDuelo): Snapshot` de `packages/engine/src/serializacao` como insumo do Rating Engine — o "snapshot/estatísticas do duelo" citado pelo PRD **é** o `EstadoDuelo` inteiro serializado (turno, LP de cada jogador, campo, etc.), sem extração ou duplicação de métricas por esta feature. Calcular estatísticas derivadas do snapshot é responsabilidade do próprio Rating Engine. | spec `motor-duelo-1x1` F05 (Decisão 1, "Snapshot = o próprio estado serializado") | confirmada |
| 4 | O Rating Engine é modelado como porta injetada `PortaRatingEngine.avaliarDuelo(entrada): Promise<Result<AvaliacaoRatingEngine, DomainError>>`. `NotaDuelo` é uma **string não-vazia opaca** (mesmo padrão de `estrategia` em `PerfilDificuldade`, F01 Decisão 4) — nunca um enum fechado `S+/S/A/B/C/D`, porque a escala é pendência explícita do PRD (Seção 9) e um enum fechado obrigaria a alterar o tipo quando o Rating Engine for definido. | PRD §6 F05 Capabilities ("F05 não inventa esses valores"); precedente `free-duel` F01 (Decisão 4, `estrategia` opaca) | pendente — aguarda dado |
| 5 | `RecompensaPorNota.faixaRaridade` **reusa** `IdFaixaRaridade`, já declarado em `packages/shared/src/duelista/tipos.ts` pela spec de `free-duel` F01 — a mesma faixa que os pools de drop de F01/F06 usam como chave. Não é redeclarada aqui. Isso é o que faz o contrato de saída de F05 diretamente consumível por F06 sem tradução. | precedente `free-duel` F01 (Decisão 5, `IdFaixaRaridade`) | confirmada |
| 6 | **Recompensa mínima garantida — tratamento deliberadamente diferente do fallback neutro.** Para as demais tabelas pendentes (`arquitetura.md` §4.3), o fallback é neutro/zero/vazio. Aqui o PRD exige o oposto: "concede a faixa de recompensa mínima garantida (**não a ausência de recompensa**)". F05 não inventa o valor balanceado final, mas declara um **piso estrutural**: `ESTRELAS_MINIMAS_GARANTIDAS = 1` (o menor inteiro positivo que satisfaz "não-ausência") e `FAIXA_MINIMA_GARANTIDA = 'comum'` — reusando a própria noção de "faixa comum padrão do catálogo" que o PRD **já usa em F06 Error Handling** para o caso de pool vazio, em vez de inventar um novo conceito. Ambos os valores são marcados como **piso de contingência**, não como recompensa balanceada final; o balanceamento oficial (quando o Rating Engine existir) pode substituí-los por outra linha da própria tabela nota→recompensa. Quando isso acontecer, `avaliacao.nota` continua `null` neste ramo (ver Decisão 7) — só a `recompensa` tem piso. | PRD §6 F05 Error Handling (texto literal); PRD §6 F06 Error Handling ("faixa comum padrão do catálogo", reusada aqui); `arquitetura.md` §4.3 e §10 (pendência, mas com requisito adicional de não-zero) | pendente — piso estrutural definido; valor balanceado final aguarda Rating Engine |
| 7 | `AvaliacaoConsolidada` é uma união discriminada por `origem`: no ramo `'rating_engine'`, `nota: NotaDuelo` (sempre presente); no ramo `'minima_garantida'`, `nota: null` — porque a mensagem do PRD é literalmente "**não foi possível avaliar a nota**; recompensa mínima aplicada". Modelar `nota` como sempre-presente forçaria a inventar uma nota fictícia para o caminho de erro, contradizendo a própria mensagem do PRD. | PRD §6 F05 Error Handling (mensagem exata); guidelines §1.1 ("make invalid states hard to represent") | confirmada |
| 8 | `ResultadoConsolidadoDuelo` é uma união discriminada por `desfecho` (`'vitoria' \| 'derrota' \| 'empate' \| 'indisponivel'`) onde **somente** o ramo `'vitoria'` tem o campo `avaliacao`. Isso torna "derrota/empate sem nota, sem estrelas, sem drop" (PRD §6 F05 Capabilities) uma garantia de tipo, não uma convenção de runtime a lembrar em cada consumidor (F06/F07/F08). | PRD §6 F05 Capabilities; guidelines §1.1, §6.2 (uniões precisas sobre strings genéricas) | confirmada |
| 9 | O **lado do jogador é fixo em `'P1'`**, reusando o tipo `JogadorId` já declarado por `motor-duelo-1x1` F01 (`packages/shared/src/duelo/tipos.ts`) e a convenção de F03 Capabilities ("lado do jogador = P1 e lado da CPU = P2"). F05 declara essa constante (`LADO_JOGADOR_HUMANO`) para reuso por F04/F08, que também precisam saber qual lado é o jogador. | PRD §6 F03 Capabilities; spec `motor-duelo-1x1` F01 (`JogadorId`) | confirmada |
| 10 | **Contrato de F03 confirmado:** `SessaoDuelo` expõe `idSessaoDuelo: string` (UUID v4, gerado por `criarSessaoDuelo`, independente do `seed`) em todo ramo que representa uma sessão existente — `em_andamento`, `encerrada` e `falha` (`docs/specs/free-duel/F03-orquestracao-da-partida/spec.md`, Decisão 22). F05 repassa esse identificador em `ResultadoConsolidadoDuelo.idSessaoDuelo`, e é esse valor — não o `seed` — que F06/F07 devem usar como chave de idempotência de recompensa (`reward_ledger.duel_id`, `arquitetura.md` §5.2). | `free-duel`/F03 (Decisão 22) | confirmada |
| 11 | **Restrição herdada: Free Duel roda 100% offline** (PRD §6 F03 Capabilities). Isso significa que, quando o Rating Engine (cross-PRD) for implementado, sua porta **precisa** ter um caminho local/offline — F05 não pode assumir que uma chamada de rede é aceitável no caminho crítico de uma vitória offline. Esta spec não implementa o Rating Engine, mas registra a restrição como requisito não-funcional para quem o implementar, e é também por isso que "Rating Engine indisponível" é tratado como caminho **esperado**, não excepcional raro — reforça a importância da recompensa mínima garantida (Decisão 6). | PRD §6 F03 Capabilities ("100% offline"); ADR-009 (offline-first) | confirmada |
| 12 | A chamada à porta do Rating Engine usa **timeout explícito** (`AbortController`, guidelines §9.1) em vez de esperar indefinidamente. Estourar o timeout é tratado exatamente como "Rating Engine indisponível" (Decisão 6) — não como um erro diferente a distinguir na UI. | guidelines §9.1 (`fetchWithTimeout`); PRD §6 F05 Error Handling | confirmada |
| 13 | `apurarResultadoDuelo` é **cacheado em memória por `idSessaoDuelo`**: chamadas repetidas para a mesma sessão encerrada (ex.: a tela de resultado remonta, o jogador navega e volta) devolvem o mesmo `ResultadoConsolidadoDuelo` sem invocar a porta do Rating Engine de novo. O cache é **só em memória de processo**, não em IndexedDB — a sessão de duelo em si já não sobrevive a reload nesta versão (spec de F03, Error Handling: "a sessão não persiste como duelo em andamento"), então persistir o resultado consolidado além disso criaria uma garantia que a sessão não tem. Uma nova sessão (revanche via F08) usa um novo `idSessaoDuelo` e não reaproveita o cache antigo. | PRD §6 F03 Error Handling (sessão não persiste); guidelines §7.3 (não misturar I/O repetido com lógica pura) | confirmada |
| 14 | F05 **não escreve em nenhuma tabela Postgres nem em IndexedDB persistente**: não toca `wallets`, `collections` nem `reward_ledger` (isso é F06/F07). O resultado consolidado é um valor efêmero em memória, consumido na mesma sessão de UI pelos componentes de F06/F07/F08. | PRD §6 F05 Capabilities ("ponto único que traduz... F06 e F07 consomem daqui"); `arquitetura.md` §5.1 (tabelas pertencem a quem as possui) | confirmada |
| 15 | O tipo de `DesfechoMotor` (`vencedor`, `perdedor`, `motivo`) tem um **invariante estrutural** validado por schema antes de qualquer interpretação: `motivo === 'empate' ⟺ vencedor === null && perdedor === null`; caso contrário, `vencedor` e `perdedor` são `JogadorId` distintos. Um `EstadoDuelo` cujo `estadoFinal` viole isso é tratado como **inconsistente** (PRD §6 F05 Error Handling, "resultado do motor ausente/inconsistente"), não como um caso a adivinhar. | PRD §6 F05 Error Handling; guidelines §7.2 (retorno explícito de invalidez) | confirmada |
| 16 | **Nenhuma tabela de dado externo pendente com fallback neutro tradicional toca F05** além da nota/recompensa em si (já coberta pelas Decisões 4 e 6). Não há guardião, terreno, fusão, drop ou balanceamento de roster aqui. | `arquitetura.md` §4.3, §10 | confirmada — exceção documentada nas Decisões 4/6 |
| 17 | Não existe código de implementação no repositório: nem `packages/` nem `apps/`. A Camada 0 (arquitetura + ADRs + guidelines + specs precedentes) é a única fonte de padrões. Precedentes aplicáveis: `free-duel` F01/F02 (estrutura de camadas, porta injetada, união discriminada de desfecho) e `motor-duelo-1x1` F05 (contrato de serialização, reusado literalmente). | estado do repositório; auto-aceite: "Sem código ainda" | confirmada |
| 18 | Esta feature não tem divisão Core/Full Scope no PRD — a spec cobre o **escopo completo** de F05. | PRD §6 F05 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/duelo/resultado-tipos.ts` | shared | novo | `MotivoEncerramentoDuelo`, `DesfechoJogador`, `DesfechoMotor`, `NotaDuelo`, `RecompensaPorNota`, `AvaliacaoRatingEngine`, `AvaliacaoConsolidada`, `ResultadoConsolidadoDuelo`, `PortaRatingEngine`, `ExtrairDesfechoMotor` |
| `packages/shared/src/duelo/resultado-schema.ts` | shared | novo | `DesfechoMotorSchema` (com invariante do motivo), `RecompensaPorNotaSchema`, `AvaliacaoRatingEngineSchema` (fronteira da resposta do Rating Engine), `ResultadoConsolidadoDueloSchema` |
| `packages/shared/src/duelo/resultado-constantes.ts` | shared | novo | `LADO_JOGADOR_HUMANO`, `ESTRELAS_MINIMAS_GARANTIDAS`, `FAIXA_MINIMA_GARANTIDA`, `TIMEOUT_RATING_ENGINE_MS` |
| `packages/shared/src/duelo/resultado-codigos-erro.ts` | shared | novo | `CODIGOS_ERRO_RESULTADO_DUELO`: `resultado_motor_inconsistente`, `sessao_nao_encerrada`, `rating_engine_indisponivel`, `rating_engine_resposta_invalida` |
| `packages/shared/src/index.ts` | shared | alterado | Acrescenta os exports públicos de `duelo/resultado-*` |
| `packages/rules/src/resultado-duelo/obter-desfecho-jogador.ts` | rules | novo | `validarDesfechoMotor`, `obterDesfechoJogador` — mapeamento puro para vitória/derrota/empate |
| `packages/rules/src/resultado-duelo/montar-resultado-consolidado.ts` | rules | novo | `montarResultadoConsolidado` — monta a união discriminada, incluindo o ramo de recompensa mínima |
| `packages/rules/src/resultado-duelo/index.ts` | rules | novo | Export público do subsistema |
| `packages/rules/src/index.ts` | rules | alterado | Reexporta `resultado-duelo/` ao lado de `deck/` (criado por `free-duel` F02) |
| `packages/rules/src/resultado-duelo/obter-desfecho-jogador.test.ts` | rules | novo | Unitários + fast-check do mapeamento e da validação estrutural |
| `packages/rules/src/resultado-duelo/montar-resultado-consolidado.test.ts` | rules | novo | Unitários + fast-check da consolidação, incluindo o piso de recompensa mínima |
| `apps/web/lib/free-duel/porta-rating-engine.ts` | web | novo | Adaptador padrão que satisfaz `PortaRatingEngine` sinalizando indisponibilidade — placeholder funcional até o Rating Engine existir |
| `apps/web/lib/free-duel/apurar-resultado-duelo.ts` | web | novo | Orquestra: sessão encerrada → `ExtrairDesfechoMotor` → `obterDesfechoJogador` → (na vitória) `serializar` + `PortaRatingEngine.avaliarDuelo` com timeout → `montarResultadoConsolidado` |
| `apps/web/lib/free-duel/cache-resultado-duelo.ts` | web | novo | Cache em memória por `idSessaoDuelo` (Decisão 13) |
| `apps/web/lib/free-duel/mensagens-resultado.ts` | web | novo | Mapa desfecho/motivo → mensagem exata do PRD |
| `apps/web/hooks/use-resultado-duelo.ts` | web | novo | Hook fino: dispara `apurarResultadoDuelo` quando a sessão encerra e expõe o estado à UI |
| `apps/web/components/free-duel/resultado-duelo.tsx` | web | novo | Painel de resultado: desfecho, motivo e (na vitória) nota/estrelas; ponto de extensão para a carta de F06 |
| `apps/web/components/free-duel/painel-recompensa.tsx` | web | novo | Sub-painel exibido somente no ramo de vitória: nota (ou aviso de indisponibilidade) + estrelas |
| `apps/web/lib/free-duel/apurar-resultado-duelo.test.ts` | web | novo | Unitários: timeout, fallback, cache por sessão, indisponibilidade do motor |
| `apps/web/components/free-duel/resultado-duelo.test.tsx` | web | novo | Unitários de tela: mensagens, ausência de recompensa em derrota/empate |
| `.dependency-cruiser.cjs` | raiz | alterado | Regras de fronteira do subsistema `resultado-duelo` (§7 Análise estática) |

**Verificação da direção de dependências:**

- `packages/shared` continua sem importar nenhum pacote do monorepo.
- `packages/rules/src/resultado-duelo/**` importa **apenas** `packages/shared`. Recebe
  `DesfechoMotor` já extraído (a extração em si — a chamada à porta `ExtrairDesfechoMotor` — é
  feita na borda de `apps/web`, não aqui) e a `AvaliacaoRatingEngine` (quando houver) como
  argumentos; não importa `packages/engine` nem `packages/data`.
- `apps/web` importa `packages/shared`, `packages/rules` e `packages/engine` (para `serializar`,
  de `MotorDuelo/F05`). Nenhum import na direção contrária.
- Nenhum arquivo desta feature importa `packages/ai` ou `apps/server`. A direção
  `shared ← rules ← engine` de `arquitetura.md` §2 é respeitada; `web` aparece só como consumidor.
- Esta feature **não modifica `packages/engine`** — apenas **consome** a função `serializar` já
  especificada por `MotorDuelo/F05`. Nenhum novo estado de duelo, ação ou evento é introduzido.
- `packages/rules/src/resultado-duelo/**` **não** importa React, DOM, `fetch`, `AbortController`,
  Supabase, IndexedDB nem `console`; `apps/web/lib/free-duel/**` é a única borda com I/O (chamada
  assíncrona à porta do Rating Engine, cache em memória, log estruturado).

## 3. Design Técnico

### Estruturas de dados

**`MotivoEncerramentoDuelo`** (`packages/shared`) — união fechada de 4 literais, vocabulário
exato do PRD: `'lp_zerado' | 'deck_out' | 'rendicao' | 'empate'`.

**`DesfechoJogador`** — `'vitoria' | 'derrota' | 'empate'`, do ponto de vista do lado humano.

**`DesfechoMotor`** — a forma assumida do que `MotorDuelo/F12` produz, consumida por meio da
porta injetada (Decisão 2):

| Campo | Tipo | Semântica |
|---|---|---|
| `vencedor` | `JogadorId \| null` | `null` sse `motivo === 'empate'` |
| `perdedor` | `JogadorId \| null` | `null` sse `motivo === 'empate'`; distinto de `vencedor` caso contrário |
| `motivo` | `MotivoEncerramentoDuelo` | Motivo do encerramento |

**`NotaDuelo`** — `string` não-vazia opaca (Decisão 4). F05 nunca compara, ordena nem interpreta
o conteúdo — apenas repassa o que a porta do Rating Engine devolveu.

**`RecompensaPorNota`** — `{ estrelas: number; faixaRaridade: IdFaixaRaridade }` (`IdFaixaRaridade`
reusado de `packages/shared/src/duelista/tipos.ts`, Decisão 5). `estrelas` é inteiro `≥ 0` no
schema geral; o piso adicional `≥ 1` se aplica **apenas** à constante de recompensa mínima
garantida (Decisão 6), não ao schema genérico.

**`AvaliacaoRatingEngine`** — a resposta bruta da porta: `{ nota: NotaDuelo; recompensa:
RecompensaPorNota }`.

**`AvaliacaoConsolidada`** — união discriminada por `origem` (Decisão 7):

```
| { origem: 'rating_engine';   nota: NotaDuelo; recompensa: RecompensaPorNota }
| { origem: 'minima_garantida'; nota: null;      recompensa: RecompensaPorNota }
```

**`ResultadoConsolidadoDuelo`** — o que F05 **provê** a F06/F07/F08 (Decisão 8), união
discriminada por `desfecho`:

```
| { desfecho: 'vitoria';     motivo: 'lp_zerado' | 'deck_out' | 'rendicao';
    idSessaoDuelo: string;   avaliacao: AvaliacaoConsolidada }
| { desfecho: 'derrota';     motivo: 'lp_zerado' | 'deck_out' | 'rendicao';
    idSessaoDuelo: string }
| { desfecho: 'empate';      motivo: 'empate';
    idSessaoDuelo: string }
| { desfecho: 'indisponivel'; idSessaoDuelo: string | null;
    codigoErro: 'resultado_motor_inconsistente' | 'sessao_nao_encerrada' }
```

Somente o ramo `'vitoria'` tem `avaliacao`; os demais **não podem** carregar nota, estrelas ou
faixa — garantia de tipo, não convenção de runtime.

**`PortaRatingEngine`** — porta injetada (Decisão 4):

| Campo | Tipo | Semântica |
|---|---|---|
| `avaliarDuelo` | `(entrada: { snapshot: Snapshot }) => Promise<Result<AvaliacaoRatingEngine, DomainError>>` | Recebe o snapshot serializado (`Snapshot = EstadoDuelo`, `MotorDuelo/F05`); devolve nota + recompensa ou erro |

**`ExtrairDesfechoMotor`** — porta injetada (Decisão 2): `(estadoFinal: EstadoDuelo) =>
Result<DesfechoMotor, DomainError>`.

### Fluxo

**Interpretação e consolidação (`packages/rules`, puro):**

1. **Receber `DesfechoMotor` já extraído** (a extração em si acontece na borda, passo 8).
   `validarDesfechoMotor` confere o invariante estrutural (Decisão 15): `motivo === 'empate'` sse
   `vencedor`/`perdedor` ambos `null`; caso contrário ambos presentes e distintos. Violação ⇒
   `Result` de erro `resultado_motor_inconsistente`.
2. **Mapear para o desfecho do jogador.** `obterDesfechoJogador(desfechoMotor,
   LADO_JOGADOR_HUMANO)`: `vencedor === 'P1'` ⇒ `'vitoria'`; `perdedor === 'P1'` ⇒ `'derrota'`;
   `motivo === 'empate'` ⇒ `'empate'`. Função total e pura.
3. **Montar o resultado consolidado.** `montarResultadoConsolidado`:
   - `'derrota'`/`'empate'` ⇒ monta o ramo correspondente com `motivo` e `idSessaoDuelo`, **sem**
     campo `avaliacao` (Decisão 8).
   - `'vitoria'` **com** `AvaliacaoRatingEngine` disponível ⇒ ramo `'vitoria'` com `avaliacao:
     { origem: 'rating_engine', nota, recompensa }`.
   - `'vitoria'` **sem** avaliação disponível (Rating Engine indisponível) ⇒ ramo `'vitoria'` com
     `avaliacao: { origem: 'minima_garantida', nota: null, recompensa: { estrelas:
     ESTRELAS_MINIMAS_GARANTIDAS, faixaRaridade: FAIXA_MINIMA_GARANTIDA } }` (Decisão 6).

**Orquestração (`apps/web`, borda de I/O):**

4. **Entrar apenas quando a sessão encerra.** O hook `useResultadoDuelo` observa `SessaoDuelo`
   (de F03); `fase !== 'encerrada'` ⇒ não dispara nada (a tela de resultado não existe ainda).
5. **Checar o cache por sessão** (Decisão 13). Se já há `ResultadoConsolidadoDuelo` para o
   `idSessaoDuelo` corrente, devolve-o imediatamente, sem chamar a porta do Rating Engine de novo.
6. **`fase !== 'fim'` em `estadoFinal`** (inconsistência entre a sessão dizer "encerrada" e o
   estado do motor não estar em `fim`) ⇒ resultado `'indisponivel'` /
   `sessao_nao_encerrada`, registrado em log `error`. Não chega ao passo 7.
7. **Extrair o desfecho do motor.** Chama a porta `ExtrairDesfechoMotor(estadoFinal)`. Erro ou
   `Result` inconsistente (passo 1) ⇒ resultado `'indisponivel'` / `resultado_motor_inconsistente`,
   log `error` com `idSessaoDuelo` — **nenhuma recompensa é concedida** (PRD §6 F05 Error
   Handling, segunda regra).
8. **Mapear e ramificar.** `obterDesfechoJogador` decide `'derrota'`/`'empate'`/`'vitoria'`.
   `'derrota'`/`'empate'` ⇒ vai direto ao passo 11 (sem tocar o Rating Engine).
9. **Somente na vitória:** serializa o estado com `serializar(estadoFinal)` (`MotorDuelo/F05`) e
   chama `PortaRatingEngine.avaliarDuelo({ snapshot })` sob um `AbortController` com timeout
   `TIMEOUT_RATING_ENGINE_MS` (Decisão 12).
10. **Falha, timeout ou resposta fora do schema** (`AvaliacaoRatingEngineSchema.safeParse` falha)
    ⇒ trata como indisponibilidade: usa `origem: 'minima_garantida'` no passo 3, registra
    `warn` estruturado `rating_engine_indisponivel` (ou `rating_engine_resposta_invalida`) com
    `idSessaoDuelo` e a causa (Decisão 6, 11, 12) — **não** propaga exceção, **não** deixa a
    vitória sem recompensa.
11. **Montar e cachear.** Chama `montarResultadoConsolidado` (passo 3), grava no cache por
    `idSessaoDuelo` (Decisão 13), devolve à UI.
12. **Renderizar o painel.** `resultado-duelo.tsx` exibe desfecho + motivo (mensagem de
    `mensagens-resultado.ts`); no ramo `'vitoria'`, `painel-recompensa.tsx` mostra a nota (ou o
    aviso "Não foi possível avaliar a nota; recompensa mínima aplicada." quando `nota === null`)
    e as estrelas — ponto onde F06 insere a carta conquistada e F07 mostra o novo saldo.

### Regras de negócio

- **Só a vitória tem nota/estrelas/faixa** — nunca em derrota ou empate (PRD §6 F05
  Capabilities; garantido por tipo, Decisão 8).
- **Rating Engine é chamado no máximo uma vez por sessão** — mesmo que a tela de resultado
  remonte (Decisão 13).
- **Rating Engine indisponível na vitória nunca resulta em ausência de recompensa** — sempre
  aplica o piso `ESTRELAS_MINIMAS_GARANTIDAS`/`FAIXA_MINIMA_GARANTIDA` e registra o incidente
  (Decisão 6; PRD §6 F05 Error Handling).
- **Resultado do motor ausente ou inconsistente nunca concede recompensa** — mesmo que o
  desfecho pareça favorável; sem `DesfechoMotor` válido, não há como saber se houve vitória
  (PRD §6 F05 Error Handling, segunda regra).
- **F05 nunca calcula estatística do duelo** (turnos, fusões, cartas usadas) — isso é
  responsabilidade do próprio Rating Engine a partir do snapshot já serializado (Decisão 3).

**Não-regras (explicitamente ausentes):** F05 não decide como o duelo terminou, não sorteia
carta, não credita estrelas em carteira nenhuma, não oferece revanche, e não persiste nada em
Postgres ou IndexedDB.

### Eventos

Esta feature não emite nem consome eventos do motor ou do Effect System (`onSummon`,
`onAttackDeclared` etc. não se aplicam aqui — o duelo já terminou quando F05 age). O único
"evento" é a transição de `SessaoDuelo.fase` para `'encerrada'`, observada pelo hook, e a saída
consolidada consumida por F06/F07/F08.

### Determinismo e pureza

Não se aplica a `packages/engine` diretamente — F05 não produz nem muta `EstadoDuelo`, apenas
**lê** o estado final já produzido pelo motor e **usa** a função `serializar` já especificada por
`MotorDuelo/F05`. As garantias relevantes são:

- `obterDesfechoJogador` e `montarResultadoConsolidado`, em `packages/rules`, são **puras e
  totais**: nenhuma função executa I/O, lê relógio, sorteia ou lança para entrada bem tipada.
- `apurarResultadoDuelo`, em `apps/web`, é a **única** função assíncrona/impura desta feature —
  concentra a chamada à porta do Rating Engine, o timeout e o cache. Isola I/O de regra
  (guidelines §7.3, §19.2).
- `PortaRatingEngine.avaliarDuelo` recebe `unknown` implícito na fronteira (a resposta é validada
  por `AvaliacaoRatingEngineSchema` antes de qualquer uso — guidelines §18.3).

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`MotivoEncerramentoDueloSchema`** — `z.enum(['lp_zerado', 'deck_out', 'rendicao', 'empate'])`.
- **`DesfechoMotorSchema`** — objeto estrito com `.superRefine` aplicando o invariante da
  Decisão 15: `motivo === 'empate'` ⟺ `vencedor === null && perdedor === null`; caso contrário,
  `vencedor` e `perdedor` são `JogadorIdSchema` (reusado de `motor-duelo-1x1` F01) distintos entre
  si.
- **`NotaDueloSchema`** — string mínima 1 caractere.
- **`RecompensaPorNotaSchema`** — objeto estrito: `estrelas` inteiro `≥ 0`; `faixaRaridade` via
  `IdFaixaRaridadeSchema` (reusado de `free-duel` F01).
- **`AvaliacaoRatingEngineSchema`** — objeto estrito: `nota` via `NotaDueloSchema`; `recompensa`
  via `RecompensaPorNotaSchema`. Valida a **resposta bruta** da porta antes de qualquer uso —
  fronteira não confiável (guidelines §18.3).
- **`ResultadoConsolidadoDueloSchema`** — união discriminada por `desfecho`, espelhando a forma de
  `ResultadoConsolidadoDuelo`, usada em testes de contrato e em log estruturado.
- **`CODIGOS_ERRO_RESULTADO_DUELO`** — `resultado_motor_inconsistente`, `sessao_nao_encerrada`,
  `rating_engine_indisponivel`, `rating_engine_resposta_invalida`.
- **Reusados sem redefinir:** `JogadorId`, `EstadoDuelo`, `Fase` (`motor-duelo-1x1` F01);
  `Snapshot` (`motor-duelo-1x1` F05); `IdFaixaRaridade` (`free-duel` F01); `Result`, `DomainError`
  (`banco-de-cartas` F01).

### Funções públicas

```
// packages/rules/src/resultado-duelo — núcleo puro, sem I/O

validarDesfechoMotor(bruto: DesfechoMotor): Result<DesfechoMotor, DomainError>
  // pós: ok ⇒ invariante motivo/vencedor/perdedor satisfeito (Decisão 15)
  //      erro ⇒ code 'resultado_motor_inconsistente'
  // total: nunca lança

obterDesfechoJogador(
  desfechoMotor: DesfechoMotor,
  ladoJogador: JogadorId,
): DesfechoJogador
  // pré: desfechoMotor já validado por validarDesfechoMotor
  // pós: 'vitoria' sse vencedor === ladoJogador; 'derrota' sse perdedor === ladoJogador;
  //      'empate' sse motivo === 'empate'
  // total: nunca lança

montarResultadoConsolidado(entrada: {
  idSessaoDuelo: string;
  desfechoJogador: DesfechoJogador;
  motivo: MotivoEncerramentoDuelo;
  avaliacao?: AvaliacaoRatingEngine; // presente só quando o Rating Engine respondeu com sucesso
}): ResultadoConsolidadoDuelo
  // pós: desfecho 'derrota'/'empate' ⇒ sem campo avaliacao
  //      desfecho 'vitoria' com avaliacao ⇒ origem 'rating_engine'
  //      desfecho 'vitoria' sem avaliacao ⇒ origem 'minima_garantida', nota null,
  //        recompensa = { estrelas: ESTRELAS_MINIMAS_GARANTIDAS, faixaRaridade: FAIXA_MINIMA_GARANTIDA }
  // total: nunca lança; pura
```

```
// apps/web/lib/free-duel — bordas de I/O

apurarResultadoDuelo(deps: {
  sessao: SessaoDuelo; // de F03
  extrairDesfechoMotor: ExtrairDesfechoMotor;
  portaRatingEngine: PortaRatingEngine;
  cache: CacheResultadoDuelo;
}): Promise<ResultadoConsolidadoDuelo>
  // pós: 'indisponivel' quando sessao.fase !== 'encerrada' ou estadoFinal.fase !== 'fim'
  //        ou a extração do desfecho falhar
  //      chama portaRatingEngine somente quando desfechoJogador === 'vitoria'
  //      idempotente por sessao.idSessaoDuelo (Decisão 13); nunca lança
```

### Exemplo — vitória, Rating Engine disponível

```json
{
  "desfecho": "vitoria",
  "motivo": "lp_zerado",
  "idSessaoDuelo": "sessao-a1b2c3",
  "avaliacao": {
    "origem": "rating_engine",
    "nota": "a-definir",
    "recompensa": { "estrelas": 0, "faixaRaridade": "a-definir" }
  }
}
```

`nota` e `recompensa` acima são **ilustrativos de formato**, não valores reais — a escala de
notas e a tabela nota→recompensa são pendência do Rating Engine (Decisões 4 e 6; PRD Seção 9).

### Exemplo — vitória, Rating Engine indisponível (recompensa mínima garantida)

```json
{
  "desfecho": "vitoria",
  "motivo": "deck_out",
  "idSessaoDuelo": "sessao-a1b2c3",
  "avaliacao": {
    "origem": "minima_garantida",
    "nota": null,
    "recompensa": { "estrelas": 1, "faixaRaridade": "comum" }
  }
}
```

### Exemplo — derrota (sem recompensa)

```json
{
  "desfecho": "derrota",
  "motivo": "rendicao",
  "idSessaoDuelo": "sessao-a1b2c3"
}
```

### Exemplo — resultado do motor inconsistente

```json
{
  "desfecho": "indisponivel",
  "idSessaoDuelo": "sessao-a1b2c3",
  "codigoErro": "resultado_motor_inconsistente"
}
```

### Contratos externos (cross-PRD)

**A ser fornecido por Motor de Duelo 1x1 (`MotorDuelo/F12`, sem spec):**

- **`ExtrairDesfechoMotor`** — a porta que, dado o `EstadoDuelo` final (`fase: 'fim'`), devolve
  vencedor/perdedor/motivo. F05 não assume onde/como esses campos ficam guardados dentro de
  `EstadoDuelo`; isso é decisão de `MotorDuelo/F12` quando existir. *A ser fornecido por Motor de
  Duelo 1x1.*

**A ser fornecido por Motor de Duelo 1x1 (`MotorDuelo/F05`, spec já publicada):**

- **`serializar(estado: EstadoDuelo): Snapshot`** — `packages/engine/src/serializacao/`. F05
  (free-duel) o consome literalmente como insumo do Rating Engine.

**A ser fornecido pelo Rating Engine (cross-PRD, sem PRD, sem spec):**

- **`PortaRatingEngine.avaliarDuelo`** — recebe o `Snapshot` e devolve `AvaliacaoRatingEngine`.
  A escala de notas, a fórmula de cálculo e a tabela nota→recompensa são inteiramente do Rating
  Engine; F05 só depende do **formato** de entrada/saída da porta. F05 não assume protocolo de
  transporte (função local, WASM, ou chamada remota) — apenas o contrato de tipos. Dada a
  restrição de "100% offline" (Decisão 11), recomenda-se fortemente que a implementação futura
  seja local.

**Fornecido por F03 (interno, spec já publicada):**

- **`SessaoDuelo`** — união discriminada por `fase`; no ramo `'encerrada'`, `estadoFinal:
  EstadoDuelo` e `idSessaoDuelo: string` (Decisão 10, confirmada contra
  `docs/specs/free-duel/F03-orquestracao-da-partida/spec.md`, Decisão 22).

## 5. Modelo de Dados

### Postgres / Supabase

**Nenhuma tabela nova e nenhuma escrita** (Decisão 14). F05 não é dona de `wallets`,
`collections` nem `reward_ledger` — essas tabelas pertencem a F07, `build-deck` F03 e ao handler
`onVictory` unificado (`arquitetura.md` §5.2–5.3), respectivamente. `ResultadoConsolidadoDuelo` é
o valor que **alimenta** essas escritas em F06/F07, mas F05 em si não grava nada.

### Cache local / fila offline

Não há store de IndexedDB nesta feature. O único cache é **em memória de processo**
(Decisão 13):

| Cache | Chave | Conteúdo | Política |
|---|---|---|---|
| `cacheResultadoDuelo` (módulo, não persistido) | `idSessaoDuelo` | `ResultadoConsolidadoDuelo` | Escrito na primeira apuração bem-sucedida da sessão; lido em toda chamada subsequente para o mesmo `idSessaoDuelo`; nunca sobrevive a reload da página (mesma limitação da sessão de duelo em si, herdada de F03) |

- **Não participa da fila de mutações** com `idempotencyKey` (`arquitetura.md` §5.4): F05 não
  muta dado de jogador. A idempotência de F06/F07 usa o `idSessaoDuelo` que F05 expõe, mas a
  fila/ledger em si é delas.

### Arquivos de dados versionados

Nenhum. F05 não produz nem consome arquivo de dados versionado — os únicos "dados pendentes"
tocados por esta feature (nota, tabela de recompensa, piso de contingência) são configuração de
código (`resultado-constantes.ts`), não um bundle como o roster ou o catálogo.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| `SessaoDuelo.fase !== 'encerrada'` quando algo tenta ler o resultado | Guarda no hook `useResultadoDuelo` | Não dispara `apurarResultadoDuelo`; a tela de resultado não é exibida ainda | nenhuma (tela de duelo continua) |
| `estadoFinal.fase !== 'fim'` apesar de `SessaoDuelo.fase === 'encerrada'` | `apurarResultadoDuelo`, passo 6 | `'indisponivel'` / `sessao_nao_encerrada`; log `error` com `idSessaoDuelo` | `Não foi possível apurar o resultado do duelo.` |
| `ExtrairDesfechoMotor` devolve erro ou `DesfechoMotor` viola o invariante estrutural | `validarDesfechoMotor` | `'indisponivel'` / `resultado_motor_inconsistente`; **nenhuma recompensa concedida** mesmo que pareça favorável; log `error` | `Não foi possível apurar o resultado do duelo.` |
| Derrota ou empate | `obterDesfechoJogador` | Monta ramo sem `avaliacao`; Rating Engine **nunca** é chamado | `Derrota` / `Empate`, com o motivo (ex.: "Seus LP chegaram a 0") |
| Rating Engine indisponível na vitória (erro de rede/execução) | `catch` em `apurarResultadoDuelo` | Ramo `'vitoria'` com `origem: 'minima_garantida'`; log `warn` `rating_engine_indisponivel` com `idSessaoDuelo` | `Vitória! Não foi possível avaliar a nota; recompensa mínima aplicada.` |
| Rating Engine expira (timeout) na vitória | `AbortController` estoura `TIMEOUT_RATING_ENGINE_MS` | Idêntico ao cenário acima — timeout é tratado como indisponibilidade, não como erro à parte | idêntica |
| Rating Engine responde, mas fora de `AvaliacaoRatingEngineSchema` | `safeParse` falha | Idêntico ao cenário de indisponibilidade, código `rating_engine_resposta_invalida`; log `error` com os problemas do zod (sem vazar para a UI) | idêntica |
| Chamada repetida para a mesma sessão já apurada (tela remonta) | `cacheResultadoDuelo` | Devolve o resultado cacheado; Rating Engine **não** é chamado de novo | idêntica ao resultado original |
| Nova sessão (revanche via F08) | `idSessaoDuelo` muda | Cache antigo não é reaproveitado; nova apuração ocorre do zero | conforme o novo desfecho |
| `estadoFinal` ausente/`null` apesar de `fase === 'encerrada'` | Guarda de tipo em `apurarResultadoDuelo` | Mesmo tratamento de `sessao_nao_encerrada` | `Não foi possível apurar o resultado do duelo.` |
| `desfechoMotor.vencedor` e `perdedor` iguais (ambos `'P1'` ou ambos `'P2'`) | `validarDesfechoMotor` | `resultado_motor_inconsistente` | `Não foi possível apurar o resultado do duelo.` |

Nenhuma falha é silenciosa: todo incidente do Rating Engine e toda inconsistência do motor são
**registrados** em log estruturado com `idSessaoDuelo` e o código, sem dado sensível (guidelines
§8.3, §23.1–23.3). O núcleo puro de `packages/rules` **retorna** os desfechos; quem **loga** é a
borda em `apps/web`.

## 7. Estratégia de Testes

### Unitários (Vitest)

`validarDesfechoMotor` — table-driven:

- `validarDesfechoMotor aceita vencedor e perdedor distintos com motivo diferente de empate`
- `validarDesfechoMotor aceita vencedor e perdedor nulos com motivo empate`
- `validarDesfechoMotor rejeita motivo empate com vencedor nao nulo`
- `validarDesfechoMotor rejeita motivo diferente de empate com vencedor nulo`
- `validarDesfechoMotor rejeita vencedor e perdedor iguais`

`obterDesfechoJogador`:

- `obterDesfechoJogador devolve vitoria quando o vencedor e o lado do jogador`
- `obterDesfechoJogador devolve derrota quando o perdedor e o lado do jogador`
- `obterDesfechoJogador devolve empate quando o motivo e empate`

`montarResultadoConsolidado`:

- `montarResultadoConsolidado monta derrota sem campo avaliacao`
- `montarResultadoConsolidado monta empate sem campo avaliacao`
- `montarResultadoConsolidado monta vitoria com origem rating_engine quando a avaliacao e fornecida`
- `montarResultadoConsolidado monta vitoria com origem minima_garantida quando a avaliacao esta ausente`
- `montarResultadoConsolidado usa nota nula no ramo minima_garantida`
- `montarResultadoConsolidado usa as constantes de piso no ramo minima_garantida`
- `montarResultadoConsolidado preserva o idSessaoDuelo em todos os ramos`

`apurarResultadoDuelo` (com dependências falsas, guidelines §12.1):

- `apurarResultadoDuelo chama a porta do rating engine somente quando o desfecho e vitoria`
- `apurarResultadoDuelo nao chama a porta do rating engine em derrota`
- `apurarResultadoDuelo nao chama a porta do rating engine em empate`
- `apurarResultadoDuelo aplica a recompensa minima quando a porta falha`
- `apurarResultadoDuelo aplica a recompensa minima quando a porta expira por timeout`
- `apurarResultadoDuelo aplica a recompensa minima quando a resposta da porta e invalida`
- `apurarResultadoDuelo registra o incidente quando aplica a recompensa minima`
- `apurarResultadoDuelo devolve indisponivel quando a sessao nao esta encerrada`
- `apurarResultadoDuelo devolve indisponivel quando o estado final nao esta na fase fim`
- `apurarResultadoDuelo devolve indisponivel quando a extracao do desfecho do motor falha`
- `apurarResultadoDuelo nao concede recompensa quando o resultado do motor e inconsistente`
- `apurarResultadoDuelo e idempotente por sessao e nao chama a porta duas vezes`
- `apurarResultadoDuelo nao reaproveita o cache de uma sessao anterior`

Tela (`resultado-duelo`):

- `resultado de duelo exibe vitoria com nota e estrelas`
- `resultado de duelo exibe aviso de nota indisponivel quando a origem e minima_garantida`
- `resultado de duelo exibe derrota com o motivo`
- `resultado de duelo exibe empate com o motivo`
- `resultado de duelo nunca exibe secao de recompensa em derrota ou empate`
- `resultado de duelo exibe mensagem de indisponibilidade quando o resultado nao pode ser apurado`

### Property-based (fast-check)

- **Bicondicional do invariante estrutural:** para todo `DesfechoMotor` gerado,
  `validarDesfechoMotor` aceita **se e somente se** (`motivo === 'empate'` e `vencedor === null`
  e `perdedor === null`) ou (`motivo !== 'empate'` e `vencedor`/`perdedor` são `JogadorId`
  distintos). 1.000 execuções.
- **Correção do mapeamento:** para todo `DesfechoMotor` válido, `obterDesfechoJogador` devolve
  `'vitoria'` sse `vencedor === 'P1'`, `'derrota'` sse `perdedor === 'P1'`, e `'empate'` sse
  `motivo === 'empate'` — exatamente um dos três, nunca ambíguo.
- **Exclusividade da avaliação:** para todo `ResultadoConsolidadoDuelo` gerado por
  `montarResultadoConsolidado`, o campo `avaliacao` está presente **se e somente se**
  `desfecho === 'vitoria'`.
- **Não-ausência da recompensa mínima:** para toda vitória em que `avaliacao` não é fornecida ao
  `montarResultadoConsolidado`, o resultado tem `origem: 'minima_garantida'` e
  `recompensa.estrelas >= 1` — nunca `0`, nunca ausente. É a prova de que o requisito do PRD
  ("não a ausência de recompensa") é estruturalmente impossível de violar por este código.
- **Pureza e totalidade:** para qualquer combinação de entradas bem tipadas,
  `montarResultadoConsolidado` nunca lança e duas chamadas com a mesma entrada produzem
  resultados profundamente iguais.
- **Idempotência do cache por sessão:** para qualquer sequência de chamadas de
  `apurarResultadoDuelo` com o mesmo `idSessaoDuelo` e as mesmas dependências, a porta do Rating
  Engine é invocada no máximo uma vez, e todas as chamadas devolvem o mesmo
  `ResultadoConsolidadoDuelo`.

### Integração

`apps/web/lib/free-duel/apurar-resultado-duelo.integration.test.ts`, com um `EstadoDuelo` real
(fixture na fase `fim`) e um `ExtrairDesfechoMotor`/`PortaRatingEngine` falsos:

- `apurarResultadoDuelo contra um EstadoDuelo real de vitoria produz um resultado consumivel sem transformacao pelo contrato de F06/F07`
- `apurarResultadoDuelo serializa o EstadoDuelo real com a funcao serializar de MotorDuelo F05 antes de chamar a porta do rating engine`
- `apurarResultadoDuelo contra um EstadoDuelo real de derrota nunca invoca a porta do rating engine`

### Análise estática

- `packages/rules/src/resultado-duelo/**` não importa `packages/engine`, React, DOM, `fetch`,
  `AbortController`, IndexedDB nem Supabase — o núcleo é puro e testável sem I/O (guidelines
  §3.3).
- `packages/rules` importa apenas `packages/shared` — nenhum import de `data`, `engine`, `ai`,
  `web` ou `server` (`arquitetura.md` §2).
- **Nenhum arquivo desta feature escreve** em `wallets`, `collections`, `reward_ledger` ou na fila
  de mutações offline (Decisão 14) — verificado por revisão da fronteira, já que não há acesso a
  Supabase em nenhum arquivo listado na Seção 2.
- **Nenhum arquivo de `packages/rules/src/resultado-duelo/**` declara a escala de notas nem os
  pesos nota→recompensa** — `NotaDuelo` permanece opaco em todo o pacote (Decisão 4).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1, incluindo
  `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` (o que obriga o compilador a provar
  que `avaliacao` só existe no ramo `'vitoria'`).

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F05) | Teste |
|---|---|
| Exibe desfecho (vitória/derrota/empate) e motivo (`lp_zerado`, `deck_out`, `rendicao`, `empate`) vindos do `MotorDuelo/F12` | `obterDesfechoJogador devolve vitoria quando o vencedor e o lado do jogador` + `obterDesfechoJogador devolve derrota...` + `obterDesfechoJogador devolve empate...` + `resultado de duelo exibe derrota com o motivo` + `resultado de duelo exibe empate com o motivo` |
| Apenas na vitória obtém a nota e a tabela nota→recompensa do Rating Engine (a partir do snapshot `MotorDuelo/F05`); derrota/empate não geram estrelas nem drop | `apurarResultadoDuelo chama a porta do rating engine somente quando o desfecho e vitoria` + `apurarResultadoDuelo nao chama a porta do rating engine em derrota` + `apurarResultadoDuelo nao chama a porta do rating engine em empate` + propriedade `Exclusividade da avaliação` + `resultado de duelo nunca exibe secao de recompensa em derrota ou empate` |
| O resultado consolidado disponibiliza a F06/F07/F08 o desfecho, a nota, as estrelas e a faixa de raridade | Teste de contrato: `ResultadoConsolidadoDueloSchema` valida a forma provida; `apurarResultadoDuelo contra um EstadoDuelo real de vitoria produz um resultado consumivel sem transformacao pelo contrato de F06/F07` |
| Rating Engine indisponível na vitória aplica a recompensa mínima garantida (sem punir o jogador) e registra o incidente | `apurarResultadoDuelo aplica a recompensa minima quando a porta falha` + `...quando a porta expira por timeout` + `...quando a resposta da porta e invalida` + `apurarResultadoDuelo registra o incidente...` + propriedade `Não-ausência da recompensa mínima` + `resultado de duelo exibe aviso de nota indisponivel...` |
| **(Pendente — cross-PRD)** Quando o Rating Engine definir a escala de notas e a tabela nota→recompensa, F05 reflete esses valores; critério a validar após a definição | **Caminho neutro/mínimo, sem valores inventados:** `montarResultadoConsolidado monta vitoria com origem rating_engine quando a avaliacao e fornecida` (repasse fiel, sem reinterpretar `nota`) + propriedade `Não-ausência da recompensa mínima` (prova do piso estrutural). O critério de fidelidade ao valor oficial fica bloqueado até a definição chegar (`arquitetura.md` §10) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: fluxo completo de vitória — F03 conduz o duelo → **F05 apura resultado + nota** → F06/F07 consomem, sem estado inconsistente | `apurarResultadoDuelo contra um EstadoDuelo real de vitoria produz um resultado consumivel sem transformacao pelo contrato de F06/F07` |
| Cross-Feature: em derrota/empate (inclusive por rendição/abandono de F04), F06 e F07 não disparam e a tela de resultado não exibe recompensa | `apurarResultadoDuelo contra um EstadoDuelo real de derrota nunca invoca a porta do rating engine` + `resultado de duelo nunca exibe secao de recompensa em derrota ou empate` + análise estática de que `packages/rules/resultado-duelo` nunca produz `avaliacao` fora do ramo `vitoria` |
| Cross-Feature: uma mesma vitória nunca concede carta ou estrelas em duplicidade (idempotência compartilhada por identificador de duelo entre F06 e F07) | `apurarResultadoDuelo e idempotente por sessao e nao chama a porta duas vezes` + propriedade `Idempotência do cache por sessão` — F05 garante que o `idSessaoDuelo` que alimenta o ledger de F06/F07 é estável e não se reprocessa silenciosamente |
| Cross-PRD (Motor de Duelo): todo o desfecho e o snapshot vêm de `MotorDuelo/F12`/`F05`; o Free Duel não reimplementa regras | Análise estática: nenhuma função de `packages/rules/resultado-duelo` recalcula LP, turno ou combate — apenas interpreta o que `ExtrairDesfechoMotor` e `serializar` entregam + `apurarResultadoDuelo serializa o EstadoDuelo real com a funcao serializar de MotorDuelo F05...` |
| Cross-PRD (Rating Engine): a nota e a tabela nota→recompensa consumidas por F05 refletem as definições oficiais assim que fornecidas — pendência registrada até a definição | `montarResultadoConsolidado monta vitoria com origem rating_engine quando a avaliacao e fornecida` (repasse fiel, sem transformação) + Decisões 4 e 6 documentam o formato provisório explicitamente |
