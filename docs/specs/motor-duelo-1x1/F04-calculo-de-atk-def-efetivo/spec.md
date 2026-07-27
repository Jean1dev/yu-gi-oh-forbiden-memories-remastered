# Cálculo de ATK/DEF Efetivo

> PRD: `docs/prds/motor-duelo-1x1.md` — F04
> Pacote-alvo: `packages/engine` (+ `packages/shared`, `packages/rules`)

## 1. Contexto e Escopo

Esta feature entrega a função pura que compõe o poder de combate real de um monstro: `atk`/`def`
**base** do schema (`banco-de-cartas`/F01) somados aos modificadores de Guardião Estelar, Terreno e
Equipamento — três subsistemas que `arquitetura.md` §2 já reserva em `packages/rules` ("Guardian
Star / Terrain / Fusion / Effect System... Hoje: tabelas vazias → modificador 0") mas que ainda não
têm PRD próprio (PRD §7, Fora de Escopo). F04 é o ponto onde essa composição acontece; F11
(Declaração e Resolução de Ataque) é o único consumidor direto hoje, mas o cálculo é puro e
determinístico o suficiente para ser consultado também por IA/UI para prever resultados (PRD F04
Experience).

**Lacuna identificada entre `product.md` e o PRD:** `product.md` descreve dois mecanismos que não
aparecem em nenhuma Capability deste PRD — "durante a invocação, o jogador escolhe um dos dois
[guardiões]" e "cartas mágicas de equipamento aumentam o poder de ataque de **determinados**
monstros" (ou seja, miram um monstro específico). Nem F04, nem F08 (Invocar e Posicionar Monstro),
nem F09 (Jogar Magia/Armadilha/Terreno) deste PRD mencionam "escolher guardião" ou "mirar
equipamento". Como o modificador real de ambos é **0 hoje** (as tabelas não existem), essa lacuna
não tem efeito prático imediato — mas ela significa que **nem F01 nem F08/F09 têm onde guardar**
"qual guardião foi escolhido" ou "qual monstro um equipamento mira". Resolução adotada (ver
Decisões 1, 2 e 10): F04 usa apenas os dados já existentes hoje (os dois guardiões da carta, sem
conceito de "escolhido"; a carta do monstro, sem rastrear equipamentos anexados) e registra a
pendência explicitamente para quando GuardianStar Engine e Effect System ganharem PRD próprio —
esses futuros PRDs é que vão precisar estender `EstadoDuelo` (F01), mesmo padrão já usado por F02
(`pendente`) e F03 (`seed`).

### Incluído

- `calcularAtkDefEfetivo`: ATK/DEF efetivo = base + modificador de Guardião + modificador de
  Terreno + modificador de Equipamento, composição aditiva (PRD F04 Capabilities; critério de
  aceite 1)
- Três **portas** (interfaces injetáveis) para os modificadores cross-PRD, cada uma retornando um
  delta independente de ATK e DEF — não um único número aplicado igualmente aos dois eixos
- Três **implementações neutras** dessas portas (sempre `{ atk: 0, def: 0 }`), o fallback que
  satisfaz "enquanto as tabelas não existirem, o modificador é 0 e o cálculo não quebra" (PRD F04
  Capabilities; critério de aceite 2)
- Parâmetro **oponente opcional**, para dar ao provedor de Guardião a informação relacional de que
  precisa (vantagem/desvantagem depende dos dois lados); ausente quando não há combate em curso
  (ex.: UI mostrando o poder de um monstro isolado)
- Garantia de **pureza total**: nenhuma mutação do estado, apenas leitura e retorno de valores (PRD
  F04 Capabilities; critério de aceite 1)
- Criação dos três subsistemas placeholder em `packages/rules` (`guardian-star/`, `terrain/`,
  `effect-system/`), cada um só com a implementação neutra — as tabelas reais e a lógica de
  resolução completa pertencem aos PRDs futuros desses subsistemas

### Fronteiras

- **Definição real das tabelas** (matriz 10×10 de Guardião, matriz terreno × ~24 classes) →
  **GuardianStar Engine / Terrain Engine, PRDs futuros (cross-PRD)**. F04 não inventa nenhum valor
  — Fase 0.4 deste skill. — PRD §7
- **Resolução concreta dos efeitos de equipamento** (o que cada carta de equipamento faz, quanto
  bonifica) → **Effect System, cross-PRD**. F04 só soma o delta que a porta devolver. — PRD §7
- **Mecanismo de "guardião escolhido na invocação" e "qual monstro um equipamento mira"** — **não
  resolvido aqui.** Fica registrado como pendência (Decisão 10) para quando aqueles PRDs
  existirem e precisarem estender `EstadoDuelo`.
- **Aplicação do resultado ao combate** (quem vence, quanto de dano) → **F11**, que consome o
  retorno desta função; F04 não decide nada sobre o resultado da batalha.
- **Fusão** → Fusion System, cross-PRD, não toca F04.

### Contratos externos assumidos

- **GuardianStar Engine, Terrain Engine, Effect System (cross-PRD, sem PRD ainda).** F04 declara as
  três portas que essas engines deverão implementar quando existirem, e usa implementações neutras
  enquanto isso. *A ser fornecido por esses módulos futuros.*
- **`EstadoDuelo`, `Carta`** — de F01 e de `banco-de-cartas`/F01, reusados sem redefinir.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A lacuna produt.md-vs-PRD (escolha de guardião; alvo do equipamento) é resolvida com **portas neutras usando só os dados já existentes** hoje: os dois guardiões da carta (`guardiao1`/`guardiao2`, sem conceito de "escolhido") e a `Carta` do monstro (sem rastrear qual equipamento está anexado). Nenhuma capacidade nova é antecipada em F01/F08/F09. | Entrevista (recomendação aceita) | confirmada |
| 2 | `calcularAtkDefEfetivo` aceita um **oponente opcional** no `contexto`, para que o provedor de Guardião tenha a informação relacional de que precisa (vantagem/desvantagem depende do guardião do adversário — `product.md`: "conforme a tabela clássica do jogo"). Ausente ⇒ o provedor de Guardião recebe `null` como oponente, sem inventar um adversário fictício. | Entrevista (recomendação aceita) | confirmada |
| 3 | Cada provedor devolve um **delta independente `{ atk: number; def: number }`**, não um único número aplicado igualmente aos dois eixos. `product.md` descreve o bônus de Guardião como "bônus de **ataque**" (só um eixo), enquanto a fórmula aditiva do PRD trata os três modificadores simetricamente sobre ATK e DEF. A forma de delta por eixo é compatível com os dois: hoje devolve `{0,0}` para todos; quando a tabela real existir, ela pode ser assimétrica (ex.: só `atk`) sem precisar redesenhar a porta. | `product.md` ("bônus de ataque"); PRD F04 Capabilities (fórmula aditiva); resolvido a favor da forma mais flexível | confirmada |
| 4 | `ProvedorModificadorEquipamento` recebe **só a `Carta` do monstro** — não o `EstadoDuelo` inteiro nem uma referência de zona. Quem construir a implementação real (futuro Effect System) fecha sobre o contexto adicional que precisar (ex.: estado, zona) no momento de **montar** a função injetada, fora da assinatura de `calcularAtkDefEfetivo`. Mantém a assinatura confirmada na entrevista sem inflar o contrato hoje. | Entrevista (assinatura confirmada) | confirmada |
| 5 | `packages/rules` ganha **três subsistemas placeholder** (`guardian-star/`, `terrain/`, `effect-system/`), cada um só com a implementação neutra (sempre `{0,0}`) — não uma "tabela vazia carregada de arquivo", porque o **formato** dessas matrizes ainda não está definido (isso é decisão do PRD futuro de cada subsistema). | `arquitetura.md` §2 ("Hoje: tabelas vazias → modificador 0"); Fase 0.4 deste skill | confirmada |
| 6 | `Carta.atk`/`Carta.def` nulos (teoricamente possível para tipos não-monstro, `banco-de-cartas`/F01) são tratados como `0` **defensivamente** dentro desta função. `calcularAtkDefEfetivo` aceita `Carta` genérica, não um tipo estreito "carta de monstro" — mantém a função total mesmo fora do caminho esperado (quem chama sempre passa um monstro de fato, F11). | Guidelines §7.2 (funções totais); guidelines §6.3 | confirmada |
| 7 | O resultado **não é limitado a um piso** (ex.: nenhum clamp em 0 para ATK/DEF efetivo negativo). Nada no PRD exige isso hoje e os modificadores reais ainda não existem para forçar a decisão. Registrado como ponto a revisitar quando GuardianStar/Terrain tiverem tabelas reais. | Ausência de menção no PRD | **a confirmar** — reavaliar quando as tabelas reais existirem |
| 8 | `provedoresNeutros` é exportado como um **bundle de conveniência** (os três provedores neutros juntos), pronto para quem for injetar em `calcularAtkDefEfetivo` antes das engines reais existirem — hoje, ninguém ainda (F11 não tem spec). | Fase 0.4 deste skill (fallback neutro pronto para uso) | confirmada |
| 9 | `calcularAtkDefEfetivo` vive em `packages/engine` (não `packages/rules`) — é a feature F04 **deste** PRD, chamada diretamente por F11 (também `engine`). Os **provedores** concretos (hoje neutros, amanhã reais) vivem em `packages/rules`, consistente com `arquitetura.md` §2. | `arquitetura.md` §2; PRD F04 Provides ("usado por F11") | confirmada |
| 10 | **Pendência registrada explicitamente:** quando GuardianStar Engine e Effect System ganharem PRD próprio, eles precisarão estender `EstadoDuelo` (F01) — um campo de "guardião escolhido" por monstro em campo, e uma referência de "qual zona de monstro um equipamento mira". Não é resolvido por esta spec. Mesmo padrão de extensão por alteração já usado por `pendente` (F02) e `seed` (F03). | Entrevista; PRD §7 | pendente — aguarda PRD futuro |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|----------------|-------------------|
| `packages/shared/src/duelo/modificadores.ts` | shared | novo | `AtkDefEfetivo`, `ProvedorModificadorGuardiao`, `ProvedorModificadorTerreno`, `ProvedorModificadorEquipamento` |
| `packages/shared/src/index.ts` | shared | alterado | Reexporta os novos tipos de modificador |
| `packages/rules/src/guardian-star/modificador-neutro.ts` | rules | novo | `modificadorGuardiaoNeutro` — sempre `{ atk: 0, def: 0 }` |
| `packages/rules/src/guardian-star/index.ts` | rules | novo | Export público do subsistema placeholder |
| `packages/rules/src/terrain/modificador-neutro.ts` | rules | novo | `modificadorTerrenoNeutro` — sempre `{ atk: 0, def: 0 }` |
| `packages/rules/src/terrain/index.ts` | rules | novo | Export público do subsistema placeholder |
| `packages/rules/src/effect-system/modificador-equipamento-neutro.ts` | rules | novo | `modificadorEquipamentoNeutro` — sempre `{ atk: 0, def: 0 }` |
| `packages/rules/src/effect-system/index.ts` | rules | novo | Export público do subsistema placeholder |
| `packages/rules/src/combate/provedores-neutros.ts` | rules | novo | `provedoresNeutros` — bundle de conveniência dos três provedores neutros |
| `packages/rules/src/combate/index.ts` | rules | novo | Export público |
| `packages/rules/src/index.ts` | rules | alterado | Reexporta `guardian-star/`, `terrain/`, `effect-system/` e `combate/` ao lado dos subsistemas já criados por outras specs (`colecao/`, `deck/`) |
| `packages/engine/src/combate/calcular-atk-def-efetivo.ts` | engine | novo | `calcularAtkDefEfetivo` — composição pura dos quatro termos |
| `packages/engine/src/combate/index.ts` | engine | novo | Export público do subsistema `combate` |
| `packages/engine/src/index.ts` | engine | alterado | Reexporta `combate` ao lado de `eventos` (F02), `prng` e `inicializacao` (F03) |
| `packages/engine/README.md` | engine | alterado | Acrescenta o subsistema `combate` ao propósito e aos exports públicos |
| `packages/rules/src/guardian-star/modificador-neutro.test.ts` | rules | novo | Unitário: sempre devolve `{0,0}` |
| `packages/rules/src/terrain/modificador-neutro.test.ts` | rules | novo | Unitário: sempre devolve `{0,0}` |
| `packages/rules/src/effect-system/modificador-equipamento-neutro.test.ts` | rules | novo | Unitário: sempre devolve `{0,0}` |
| `packages/engine/src/combate/calcular-atk-def-efetivo.test.ts` | engine | novo | Unitários table-driven da composição aditiva |
| `packages/engine/src/combate/calcular-atk-def-efetivo.propriedades.test.ts` | engine | novo | Propriedades fast-check: pureza, neutralidade, composição |
| `.dependency-cruiser.cjs` | raiz | alterado | Confirma que `packages/rules/src/guardian-star`, `terrain`, `effect-system` não importam `data`, `engine`, `ai`, `web`, `server` nem bibliotecas de UI/IO |

**Verificação da direção de dependências:** `packages/engine/src/combate/**` importa de
`packages/shared` (tipos) e de `packages/rules` (`provedoresNeutros`, quando o chamador optar por
usá-lo — não é uma dependência obrigatória de `calcularAtkDefEfetivo`, que recebe os provedores
como parâmetro e não os importa diretamente). `packages/rules/src/guardian-star`, `terrain` e
`effect-system` importam **apenas** `packages/shared` — nenhum deles importa `data`, `engine` ou
`ai`, respeitando `shared ← data ← rules ← engine ← ai` (`arquitetura.md` §2). Nenhum arquivo desta
feature importa React, DOM, `fetch` ou Supabase.

## 3. Design Técnico

### Estruturas de dados

**`AtkDefEfetivo`** (`packages/shared`) — `{ atk: number; def: number }`. Usado tanto como retorno
final de `calcularAtkDefEfetivo` quanto como forma do delta de cada provedor individual.

**`ProvedorModificadorGuardiao`** — `(monstro: Carta, oponente: Carta | null) => AtkDefEfetivo`.
Recebe as duas cartas inteiras (não só os guardiões) porque a tabela real, quando existir, pode
precisar de mais contexto do monstro do que só `guardiao1`/`guardiao2` (ex.: `classe`).

**`ProvedorModificadorTerreno`** — `(monstro: Carta, terrenoAtivo: Carta | null) =>
AtkDefEfetivo`. `terrenoAtivo` já vem de `EstadoDuelo` (F01); o provedor não lê o estado sozinho.

**`ProvedorModificadorEquipamento`** — `(monstro: Carta) => AtkDefEfetivo`. Assinatura mínima
(Decisão 4) — a implementação real fecha sobre o contexto adicional que precisar fora daqui.

### Fluxo

1. **Base.** Lê `monstro.atk` e `monstro.def`; `null` vira `0` (Decisão 6).
2. **Guardião.** Chama `provedores.guardiao(monstro, contexto.oponente ?? null)`.
3. **Terreno.** Chama `provedores.terreno(monstro, contexto.terrenoAtivo)`.
4. **Equipamento.** Chama `provedores.equipamento(monstro)`.
5. **Soma.** `atk = base.atk + guardiao.atk + terreno.atk + equipamento.atk`; mesma composição para
   `def`. Nenhum arredondamento, nenhum clamp (Decisão 7).
6. **Retorna** `{ atk, def }` — não altera `monstro`, `contexto` nem nenhum provedor.

### Regras de negócio

- **Composição aditiva dos quatro termos** (Fase 0.3; critério de aceite 1) — nunca multiplicativa,
  nunca com prioridade entre modificadores.
- **`atk`/`def` base da carta nunca são sobrescritos** (F01 Decisão já estabelecida; critério de
  aceite 1 de F04) — `calcularAtkDefEfetivo` só **lê** `monstro.atk`/`monstro.def`, nunca escreve
  de volta em nenhuma zona ou carta.
- **Modificador neutro nunca quebra o cálculo** (critério de aceite 2) — os três provedores neutros
  são funções totais, sempre devolvem `{0,0}`, nunca lançam.
- **Oponente ausente é um caso legítimo**, não um erro — usado por IA/UI para prever o poder de um
  monstro sem alvo definido (PRD F04 Experience).

### Eventos

Não aplicável. `calcularAtkDefEfetivo` não emite nem consome eventos — é uma consulta pura, sem
efeito colateral algum (nem mudança de estado, nem evento).

### Determinismo e pureza

- `calcularAtkDefEfetivo` e os três provedores neutros são **puros e totais**: nenhum I/O, nenhuma
  UI, nenhum `Math.random()`, nenhuma mutação de `monstro`, `contexto` ou dos próprios provedores.
- Mesma entrada (monstro, contexto, provedores) ⇒ mesmo resultado, sempre — propriedade central
  desta feature (critério de aceite 1: "sem mutar o estado").
- Nenhuma estrutura envolvida quebra a serializabilidade em JSON de `EstadoDuelo` — esta feature
  não altera nenhum tipo de estado, só consulta.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`AtkDefEfetivo`** — `{ atk: number; def: number }`. Sem schema zod: não cruza fronteira
  externa (é um valor de retorno interno entre funções puras do monorepo).
- **`ProvedorModificadorGuardiao`**, **`ProvedorModificadorTerreno`**,
  **`ProvedorModificadorEquipamento`** — tipos de função (portas injetáveis), sem schema — funções
  não são serializáveis e não cruzam fronteira de rede nesta feature.
- **Reusados sem redefinir:** `Carta` (`banco-de-cartas`/F01); `EstadoDuelo`, `terrenoAtivo` (F01).

### Funções públicas

```
// packages/engine/src/combate — núcleo puro

calcularAtkDefEfetivo(
  monstro: Carta,
  contexto: { terrenoAtivo: Carta | null; oponente?: Carta | null },
  provedores: {
    guardiao: ProvedorModificadorGuardiao;
    terreno: ProvedorModificadorTerreno;
    equipamento: ProvedorModificadorEquipamento;
  },
): AtkDefEfetivo
  // pós: atk/def = base (0 se null) + soma dos três deltas dos provedores
  // total: nunca lança; puro: nenhuma mutação de nenhum argumento
```

```
// packages/rules/src/guardian-star | terrain | effect-system — implementações placeholder

modificadorGuardiaoNeutro: ProvedorModificadorGuardiao       // sempre { atk: 0, def: 0 }
modificadorTerrenoNeutro: ProvedorModificadorTerreno         // sempre { atk: 0, def: 0 }
modificadorEquipamentoNeutro: ProvedorModificadorEquipamento // sempre { atk: 0, def: 0 }
```

```
// packages/rules/src/combate — conveniência

provedoresNeutros: {
  guardiao: ProvedorModificadorGuardiao;
  terreno: ProvedorModificadorTerreno;
  equipamento: ProvedorModificadorEquipamento;
}
  // bundle dos três provedores neutros, pronto para injetar em calcularAtkDefEfetivo
```

### Endpoints / RPC / mensagens de rede

Não aplicável — mesma justificativa de F01–F03. Função de biblioteca, sem borda de rede própria.

### Contratos externos (cross-PRD)

**A ser fornecido por GuardianStar Engine, Terrain Engine e Effect System (PRDs futuros):** cada um
deverá implementar a porta correspondente (`ProvedorModificadorGuardiao`,
`ProvedorModificadorTerreno`, `ProvedorModificadorEquipamento`) com a tabela/lógica real, e — se
precisarem de "guardião escolhido" ou "alvo do equipamento" — estender `EstadoDuelo` (F01) por
alteração dos arquivos existentes (Decisão 10). F04 não bloqueia nem antecipa essa extensão.

### Exemplo — cálculo com provedores neutros

```json
{
  "entrada": {
    "monstro": { "numero": "001", "atk": 3000, "def": 2500, "guardiao1": "Sun", "guardiao2": "Mars", "classe": "Dragon" },
    "contexto": { "terrenoAtivo": null, "oponente": null },
    "provedores": "provedoresNeutros"
  },
  "saida": { "atk": 3000, "def": 2500 }
}
```

## 5. Modelo de Dados

Não aplicável. F04, como F01–F03, não cria tabela Postgres nem estrutura IndexedDB/fila offline —
é uma função pura sobre estruturas já em memória. As tabelas de Guardião (10×10) e Terreno (~24
classes) mencionadas em `arquitetura.md` §4.3 como "dado externo pendente" **não são criadas por
esta feature** — pertencem aos PRDs futuros de GuardianStar Engine e Terrain Engine, que decidirão
seu formato de armazenamento quando existirem.

## 6. Tratamento de Erros e Casos de Borda

F04 não tem bloco de Error Handling no PRD (é uma consulta pura, sem ação de jogador a recusar).

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| `monstro.atk` ou `monstro.def` é `null` | Leitura em `calcularAtkDefEfetivo` | Tratado como `0` na base (Decisão 6); cálculo continua normalmente | — (não é erro) |
| Nenhum dos três provedores reais existe ainda | Padrão do projeto hoje | Chamador injeta `provedoresNeutros`; resultado = só o valor base | — (não é erro, é o caminho neutro esperado) |
| `contexto.oponente` ausente | Assinatura opcional | Provedor de Guardião recebe `null`; delta de guardião é o que aquele provedor decidir para "sem oponente" (hoje sempre `{0,0}`) | — (não é erro) |
| Um provedor real (futuro) lançar uma exceção | Fora do controle desta feature | `calcularAtkDefEfetivo` não captura — a exceção propaga ao chamador (F11), que decide como tratar | — |

## 7. Estratégia de Testes

### Unitários (Vitest)

Provedores neutros — table-driven:
- `modificadorGuardiaoNeutro sempre devolve atk 0 e def 0, com ou sem oponente`
- `modificadorTerrenoNeutro sempre devolve atk 0 e def 0, com ou sem terreno ativo`
- `modificadorEquipamentoNeutro sempre devolve atk 0 e def 0`

`calcularAtkDefEfetivo`:
- `calcularAtkDefEfetivo devolve a base da carta quando todos os provedores são neutros`
- `calcularAtkDefEfetivo soma os deltas dos três provedores à base`
- `calcularAtkDefEfetivo trata atk base nulo como zero`
- `calcularAtkDefEfetivo trata def base nulo como zero`
- `calcularAtkDefEfetivo passa null ao provedor de guardiao quando oponente está ausente`
- `calcularAtkDefEfetivo passa o oponente informado ao provedor de guardiao`
- `calcularAtkDefEfetivo não muta o objeto monstro recebido`
- `calcularAtkDefEfetivo não muta o objeto contexto recebido`

### Property-based (fast-check)

- **Neutralidade preserva a base:** para qualquer `Carta` válida gerada por arbitrário e qualquer
  `contexto` (com ou sem terreno/oponente), `calcularAtkDefEfetivo(monstro, contexto,
  provedoresNeutros)` sempre devolve exatamente `{ atk: monstro.atk ?? 0, def: monstro.def ?? 0
  }`. 1.000 execuções.
- **Composição aditiva:** para qualquer combinação de deltas arbitrários `{atk, def}` devolvidos
  por três provedores dublês, o resultado de `calcularAtkDefEfetivo` é sempre a soma exata dos
  quatro termos (base + 3 deltas) — nenhuma composição diferente de soma simples.
- **Pureza:** para qualquer entrada arbitrária, os objetos `monstro` e `contexto` passados são
  estruturalmente idênticos antes e depois da chamada.

### Integração

Não aplicável — mesma justificativa de F01–F03. A integração real (F04 chamada de dentro de F11
durante a resolução de combate) só é testável quando F11 existir.

### Análise estática

- `packages/engine/src/combate/**` importa apenas `packages/shared` — não importa `data`, `ai`,
  `web`, `server`, React, DOM, `fetch` nem Supabase.
- `packages/rules/src/guardian-star/**`, `terrain/**` e `effect-system/**` importam apenas
  `packages/shared` — nenhum deles importa `engine`, `data`, `ai`, `web` ou `server` (regra
  reforçada em `.dependency-cruiser.cjs`).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F04) | Teste |
|---|---|
| ATK/DEF efetivo = base + guardião + terreno + equip (composição aditiva), sem mutar o estado | `calcularAtkDefEfetivo soma os deltas dos três provedores à base` + `calcularAtkDefEfetivo não muta o objeto monstro recebido` + `calcularAtkDefEfetivo não muta o objeto contexto recebido` + propriedade `Composição aditiva` |
| Enquanto as tabelas de Guardião/Terreno não existirem, o modificador correspondente é 0 e o cálculo não quebra | `calcularAtkDefEfetivo devolve a base da carta quando todos os provedores são neutros` + propriedade `Neutralidade preserva a base` |
| (Pendente — cross-PRD) Quando GuardianStar/Terrain fornecerem as tabelas, F04 aplica os modificadores corretos | Não testável hoje — as portas (`ProvedorModificadorGuardiao`, `ProvedorModificadorTerreno`) já estão prontas para receber a implementação real sem mudança de assinatura; critério fica pendente até aquelas tabelas existirem (Decisão 10) |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: F04 é consumida por F11 na resolução de combate | Não testável até F11 existir; a assinatura de `calcularAtkDefEfetivo` já está estável para esse consumo (Contratos, Seção 4) |
| Cross-PRD: "Guardian Star Engine / Terrain Engine: os modificadores consumidos por F04 refletem as tabelas oficiais assim que forem fornecidas — pendência registrada até a definição das tabelas" | Decisão 10 registra a pendência explicitamente; as três portas são o contrato que essas engines vão implementar sem exigir mudança em F04 |
