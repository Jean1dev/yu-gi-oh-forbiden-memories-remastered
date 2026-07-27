# Validação de Integridade do Banco

> PRD: `docs/prds/banco-de-cartas.md` — F02
> Pacote-alvo: `packages/data` (+ `packages/shared`)

## 1. Contexto e Escopo

Esta feature é o portão de qualidade entre a ingestão (F01) e o serviço de catálogo (F03): recebe
o dataset canônico e o manifesto de artes emitidos por F01 e decide, sobre o **conjunto**, se eles
podem ser servidos. Onde F01 valida cada registro isoladamente e relata o que descartou, F02 dá o
**veredito**: contagem canônica (722, contígua), unicidade de `numero`, enum de `tipo`, classe
conhecida, coerência de campos por tipo, formato de `password` e cobertura de arte. Produz um
relatório de violações (para o mantenedor) e um selo válido/inválido (para F03) — nenhum dataset
que falhe uma regra de bloqueio chega a ser servido (ADR-003, "fail-safe").

F02 **não confia** que F01 rodou corretamente sobre os artefatos que recebe: como
`packages/data/generated/` não é versionado (F01 Decisão 5) e um `cards.json` pode ser editado à
mão localmente, F02 revalida o conjunto inteiro a partir do zero — reparseando cada carta contra o
schema canônico — em vez de confiar no `ingestion-report.json` de F01. Esse é exatamente o papel
de portão que a spec de F01 já atribuiu a esta feature (F01 §1, Decisão 5).

O desenho segue o mesmo padrão de F01 (`arquitetura.md` §4.1, ADR-003, ADR-008): núcleo puro de
checagens sobre dados já lidos, com todo I/O confinado a um adaptador CLI fino na borda
(`TypeScript-development-guidelines.md` §3.3, §12, §19.2).

### Incluído

- Recontagem e verificação de contiguidade do intervalo `numero` 001–722 (PRD F02 Capabilities)
- Verificação de unicidade de `numero` sobre o dataset emitido
- Reparse de cada carta contra o schema canônico (`CartaSchema` de F01), capturando violações de
  `tipo` fora do enum, guardião fora dos 10 conhecidos e `password` fora do formato de quatro
  grupos — sem confiar no relatório de F01
- Verificação de `classe` contra o conjunto conhecido, com bloqueio em classe desconhecida
- Verificação de coerência por tipo: `monstro` exige `atk`/`def`/`guardiao1`/`guardiao2`
  preenchidos; qualquer outro tipo (incluindo `ritual`) exige os quatro campos vazios
- Verificação de cobertura de arte: carta presente no manifesto, **ou** placeholder padrão
  confirmadamente existente no disco
- Montagem do relatório de integridade (violações por categoria) e do selo válido/inválido
- Resumo legível no stdout ao final da execução (PRD F02 Experience)

### Fronteiras

- **Leitura e normalização da origem** → **F01**. F02 não lê `cards-data/dados/*.json`; consome
  apenas os artefatos já emitidos por F01. — PRD §6 F01
- **Carregamento em memória, índices e API de consulta** → **F03**. F02 não expõe consulta, só o
  selo e o relatório. F03 é quem recusa subir sem selo válido. — PRD §6 F03
- **Resolução de arte em runtime e definição do próprio arquivo de placeholder** → **F04**. F02
  apenas *verifica a existência* do arquivo de placeholder num caminho contratado; não resolve
  arte para telas nem decide o fallback em runtime. — PRD §6 F04
- **Valores das tabelas auxiliares** (fusões, guardiões, terreno, drops) → F05–F08. Nenhum deles é
  tocado aqui. — PRD §7

### Contratos externos assumidos

Nenhum contrato cross-PRD. F02 depende apenas de F01 (mesma PRD `banco-de-cartas`), que já tem
spec e define os dois artefatos consumidos aqui (`cards.json`, `arts-manifest.json`). Não há
dependência cross-PRD nem contrato externo pendente de outro módulo.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | **`ritual` é excluído da exigência de `atk`/`def`/guardiões preenchidos.** A coerência por tipo passa a ser: `monstro` exige os quatro campos preenchidos; **qualquer outro tipo** (`armadilha`, `equipamento`, `magica`, `ritual`) exige os quatro campos vazios. Isso **substitui** o critério de aceite 3 do PRD §9 F02 ("monstro/ritual sem atk/def numéricos... são reportados como violação"), que reprovaria o dataset real (os 24 rituais têm esses 4 campos vazios na origem). | entrevista (confirmado pelo usuário); `arquitetura.md` §4.2 e §10; ADR-003 `[PRECISA DE ENTRADA]`; F01 spec Decisão 13 | **confirmada — substitui PRD §9 F02, critério 3** |
| 2 | Classe fora do conjunto conhecido **bloqueia** o dataset (mesmo tratamento das demais regras de bloqueio). O PRD deixava esse comportamento "configurável" sem fixar o default; não é exposto nenhum parâmetro de runtime para alternar — é uma regra fixa, simplificando o que o PRD chamava de "configurável". | entrevista (confirmado pelo usuário) | confirmada |
| 3 | O conjunto de classes conhecidas (`CLASSES_CONHECIDAS`) é fixado como constante em `packages/shared`, com as 24 classes verificadas na origem real (mesma lista do exemplo `classesObservadas` da spec de F01): `Aqua, Beast, Beast-Warrior, Dinosaur, Dragon, Equip, Fairy, Fiend, Fish, Insect, Machine, Magic, Plant, Pyro, Reptile, Ritual, Rock, Sea Serpent, Spellcaster, Thunder, Trap, Warrior, Winged Beast, Zombie`. Não é o mesmo conceito do campo `classe` em si (que continua `string` livre, não um enum fechado, F01 Decisão 8) — é uma lista de referência que F02 usa só para detectar drift/erro de digitação em builds futuros da origem. | `arquitetura.md` §4.2; F01 spec (exemplo de `ingestion-report.json`) | confirmada |
| 4 | Coerência por tipo é **simétrica**: além de bloquear `monstro` sem os 4 campos preenchidos, também bloqueia qualquer não-monstro **com** algum desses campos indevidamente preenchido. O PRD só descreve o sentido "monstro precisa ter" e cita o sentido inverso como "padrão do schema" (implícito); tratá-lo como violação ativa é uma extensão razoável e consistente com o espírito de fail-safe do ADR-003, sinalizada aqui por não ser 100% literal do texto do PRD. | ADR-003 (fail-safe); extensão de PRD §6 F02 Capabilities "Coerência por tipo" | confirmada — extensão documentada |
| 5 | Cobertura de arte **verifica a existência real do arquivo de placeholder no disco** antes de aceitar "arte ausente" como coberta. O caminho do placeholder (`CAMINHO_PLACEHOLDER_ARTE_PADRAO`) é fixado agora como constante em `packages/shared` — **contrato antecipado que F04 herda** quando especificar a resolução de arte em runtime, em vez de F04 redefini-lo. O **arquivo de imagem em si ainda não existe no repositório** (nenhum asset de placeholder foi encontrado em `cards-data/`) — é um insumo gráfico pendente, análogo em espírito às tabelas de dado externo da Fase 0.4, mas é um asset, não uma tabela de regra. Enquanto ausente, qualquer carta sem arte no manifesto invalidaria o dataset; com os dados reais verificados por F01 (722 cartas ↔ 722 artes, 0 ausentes), esse caminho **nunca dispara na prática hoje**. | entrevista (confirmado pelo usuário); PRD §6 F02 Error Handling; F01 spec (722/722 artes verificado) | confirmada — pendência de asset registrada |
| 6 | F02 **não lê nem confia** em `ingestion-report.json` de F01 para o veredito. Consome apenas `cards.json` e `arts-manifest.json` (os dois itens do bloco Consumes do PRD), reparseando tudo de forma independente, para servir de portão real contra um artefato adulterado ou desatualizado — exatamente o papel que a spec de F01 já reservou para F02. | PRD §6 F02 Consumes; F01 spec §1 ("revalida o conjunto inteiro... inclusive contra um `generated/cards.json` editado à mão") | confirmada |
| 7 | `validation-report.json` e `dataset-seal.json` ficam fora do bundle de F09 e do hash de F10 — são evidência de processo, não dado de domínio, mesmo tratamento dado a `ingestion-report.json` em F01 (Decisão 12 daquela spec). | F01 spec Decisão 12; `arquitetura.md` §4.1 | confirmada |
| 8 | Arte **órfã** (arquivo de arte sem carta correspondente) não invalida o dataset em F02 — já é reportada por F01 (`artesOrfas`) e não aparece nos critérios de veredito de F02 no PRD. F02 não a repete. | PRD §6 F02 Capabilities (não menciona artes órfãs); F01 spec (`artesOrfas`) | confirmada |
| 9 | O "Selo de dataset válido/inválido" (Provides #2 do PRD, consumido por F03) e o "Relatório de integridade" (Provides #1, consumido pelo mantenedor) são **dois artefatos distintos**: o selo é minimalista (`valido` + `geradoEm`), pensado para F03 checar rápido sem parsear o relatório inteiro; o relatório carrega a lista completa de violações. | PRD §6 F02 Provides (lista os dois separadamente) | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/shared/src/carta/constantes.ts` | shared | alterado | Acrescenta `CLASSES_CONHECIDAS` (24 valores) e `CAMINHO_PLACEHOLDER_ARTE_PADRAO` |
| `packages/shared/src/carta/relatorio-validacao.ts` | shared | novo | Tipos e schemas zod: `CategoriaViolacao`, `ViolacaoValidacao`, `RelatorioValidacao`, `SeloDataset` |
| `packages/shared/src/index.ts` | shared | alterado | Exporta os novos símbolos de `relatorio-validacao.ts` e as constantes novas |
| `packages/data/src/validacao/reparsear-dataset.ts` | data | novo | Reparse defensivo de cada carta bruta contra `CartaSchema`, sem abortar no primeiro erro |
| `packages/data/src/validacao/checar-contagem.ts` | data | novo | Contagem canônica (722) e contiguidade do intervalo `numero` |
| `packages/data/src/validacao/checar-unicidade.ts` | data | novo | Detecção de `numero` duplicado |
| `packages/data/src/validacao/checar-classe-conhecida.ts` | data | novo | Classe fora de `CLASSES_CONHECIDAS` |
| `packages/data/src/validacao/checar-coerencia-por-tipo.ts` | data | novo | Coerência simétrica monstro/não-monstro (Decisão 4) |
| `packages/data/src/validacao/checar-cobertura-arte.ts` | data | novo | Carta sem arte e sem placeholder confirmadamente existente |
| `packages/data/src/validacao/montar-relatorio-validacao.ts` | data | novo | Agrega violações por categoria e decide o veredito |
| `packages/data/src/validacao/validar-dataset.ts` | data | novo | Orquestrador puro: entradas já lidas → `{ relatorio, selo }` |
| `packages/data/src/validacao/index.ts` | data | novo | Export público do subsistema de validação |
| `packages/data/scripts/validate-cards.ts` | data | novo | Adaptador CLI: lê os artefatos de F01, verifica o placeholder no disco, chama o núcleo puro, escreve `validation-report.json` e `dataset-seal.json`, imprime resumo, define exit code |
| `packages/data/generated/validation-report.json` | data | gerado | Relatório de integridade (não versionado) |
| `packages/data/generated/dataset-seal.json` | data | gerado | Selo válido/inválido consumido por F03 (não versionado) |
| `packages/data/tests/fixtures/validacao/` | data | novo | Datasets sintéticos: válido, contagem errada, lacuna, duplicata, classe desconhecida, coerência quebrada (nos dois sentidos), arte ausente com/sem placeholder |
| `packages/data/src/validacao/reparsear-dataset.test.ts` | data | novo | Unitários de reparse |
| `packages/data/src/validacao/checar-contagem.test.ts` | data | novo | Unitários de contagem/contiguidade |
| `packages/data/src/validacao/checar-unicidade.test.ts` | data | novo | Unitários de duplicata |
| `packages/data/src/validacao/checar-classe-conhecida.test.ts` | data | novo | Unitários de classe conhecida |
| `packages/data/src/validacao/checar-coerencia-por-tipo.test.ts` | data | novo | Unitários de coerência simétrica |
| `packages/data/src/validacao/checar-cobertura-arte.test.ts` | data | novo | Unitários de cobertura de arte + placeholder |
| `packages/data/src/validacao/validar-dataset.test.ts` | data | novo | Unitários do orquestrador + propriedades fast-check |
| `packages/data/tests/validate-cards.integration.test.ts` | data | novo | Integração contra a saída real de F01 |
| `turbo.json` | raiz | alterado | Nova tarefa `data:validate`, `dependsOn: ["data:ingest"]`, cacheada por `inputs`/`outputs` |

**Verificação da direção de dependências:** `packages/data` continua importando **apenas**
`packages/shared` (nenhum import novo de `rules`, `engine`, `ai`, `web` ou `server`), preservando
`shared ← data` de `arquitetura.md` §2.

Esta feature **não toca `packages/engine`** — as garantias de pureza/PRNG do motor não se aplicam.
A fronteira de I/O segue o mesmo padrão de F01:

- `packages/data/src/validacao/**` **não** importa `node:fs`, `node:path`, `fetch` nem `process` —
  recebe conteúdo já lido (o array bruto de `cards.json`, o manifesto já parseado, e um booleano
  `placeholderExiste`) e devolve estruturas em memória.
- `packages/data/scripts/validate-cards.ts` é o único ponto com I/O: lê os dois artefatos de F01
  do disco, verifica a existência do arquivo de placeholder, e escreve os dois artefatos de saída.

## 3. Design Técnico

### Estruturas de dados

**`CategoriaViolacao`** — union fechado: `contagem`, `unicidade`, `tipo`, `classe`, `coerencia`,
`password`, `arte`.

**`ViolacaoValidacao`** (`packages/shared`):

| Campo | Tipo | Semântica |
|---|---|---|
| `categoria` | `CategoriaViolacao` | Bucket usado em `violacoesPorCategoria` |
| `numero` | `NumeroCarta \| undefined` | Ausente só para violações de conjunto (ex.: contagem total) |
| `codigo` | `string` | Identificador estável da regra violada, ver lista em Contratos |
| `mensagem` | `string` | Texto legível, segue os templates do PRD §6 F02 Error Handling |

**`RelatorioValidacao`** — evidência de processo consumida pelo mantenedor:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `totalValidado` | `number` | Cartas efetivamente reparseadas com sucesso |
| `violacoes` | `ViolacaoValidacao[]` | Lista completa, na ordem em que as checagens rodam |
| `violacoesPorCategoria` | `Record<CategoriaViolacao, number>` | Contagem por categoria, sempre com as 7 chaves presentes (0 quando não há violação) |
| `classesDesconhecidas` | `string[]` | Subconjunto de classes fora de `CLASSES_CONHECIDAS`, ordenado |
| `valido` | `boolean` | `true` sse `violacoes` está vazio |
| `geradoEm` | `string` | ISO 8601, não entra em nenhuma garantia de determinismo byte-a-byte |

**`SeloDataset`** — o que F03 checa antes de subir o catálogo:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `valido` | `boolean` | Espelha `relatorio.valido` |
| `geradoEm` | `string` | Mesmo carimbo do relatório correspondente |

**`CLASSES_CONHECIDAS`** (`packages/shared`, constante `readonly string[]`) — as 24 classes
verificadas na origem (Decisão 3).

**`CAMINHO_PLACEHOLDER_ARTE_PADRAO`** (`packages/shared`, constante `string`) — caminho relativo
canônico do placeholder de arte, contrato antecipado para F04 (Decisão 5).

### Fluxo

1. **Ler os artefatos de F01.** O adaptador CLI lê `generated/cards.json` (array bruto, `unknown`)
   e `generated/arts-manifest.json` (objeto `numero → caminho`) do diretório gerado por F01.
   Arquivo ausente ou JSON ilegível → aborta antes de qualquer checagem (PRD F02 Error Handling
   estendido; ver Seção 6).
2. **Verificar o placeholder.** O adaptador checa a existência do arquivo em
   `CAMINHO_PLACEHOLDER_ARTE_PADRAO` no disco e passa o booleano ao núcleo — o núcleo nunca toca
   filesystem (Decisão 5).
3. **Reparsear cada carta.** `reparsearCartas` aplica `CartaSchema.safeParse` a cada elemento do
   array bruto, sem abortar no primeiro erro: cartas válidas alimentam as checagens seguintes;
   cartas inválidas geram uma `ViolacaoValidacao` (categoria `tipo` quando o campo culpado é
   `tipo`/guardião, `password` quando é `password`, ou o código genérico
   `schema_canonico_invalido` para os demais campos) e **não** entram no conjunto usado pelas
   checagens de conjunto.
4. **Checar contagem e contiguidade.** Sobre as cartas reparseadas com sucesso: total ≠ 722 gera
   violação `contagem`; qualquer `numero` ausente no intervalo 001–722 gera uma violação
   `contagem` por lacuna, citando o `numero`.
5. **Checar unicidade.** `numero` duplicado entre dois registros reparseados com sucesso gera
   violação `unicidade` citando o `numero` repetido.
6. **Checar classe conhecida.** Toda `classe` fora de `CLASSES_CONHECIDAS` gera violação `classe`
   e entra em `classesDesconhecidas`.
7. **Checar coerência por tipo.** `tipo === 'monstro'` exige `atk`, `def`, `guardiao1` e
   `guardiao2` não-nulos — falta de qualquer um gera violação `coerencia`
   (`coerencia_monstro_incompleta`). Qualquer outro tipo (incluindo `ritual`, Decisão 1) exige os
   quatro campos nulos — presença de qualquer um gera violação `coerencia`
   (`coerencia_nao_monstro_com_stats`, Decisão 4).
8. **Checar cobertura de arte.** Para cada carta reparseada: presente no manifesto → coberta, sem
   violação. Ausente do manifesto e `placeholderExiste === true` → coberta (o fallback existe).
   Ausente do manifesto e `placeholderExiste === false` → violação `arte`.
9. **Montar o relatório.** Agrega todas as violações das etapas 3–8 em `violacoes`, preenche
   `violacoesPorCategoria` (todas as 7 chaves, mesmo zeradas), deriva `classesDesconhecidas` e
   decide `valido = violacoes.length === 0`.
10. **Derivar o selo.** `{ valido: relatorio.valido, geradoEm: relatorio.geradoEm }` — artefato
    minimalista, mesmo carimbo de tempo do relatório da mesma execução.
11. **Serializar e escrever.** O adaptador grava `validation-report.json` e `dataset-seal.json` no
    mesmo diretório gerado por F01.
12. **Imprimir o resumo** no stdout: total validado, contagem por categoria, veredito final
    (PRD F02 Experience). Exit code `0` quando `valido`, diferente de zero caso contrário.

### Determinismo e pureza

Não se aplica a `packages/engine`. As funções de checagem em
`packages/data/src/validacao/**` são puras (mesma entrada → mesma lista de violações, sem I/O);
`geradoEm` é o único campo não determinístico, e por isso `validation-report.json` e
`dataset-seal.json` ficam fora da garantia de bytes idênticos (Decisão 7), do mesmo jeito que
`ingestion-report.json` fica em F01.

## 4. Contratos

### Tipos e schemas (`packages/shared`)

- **`CategoriaViolacaoSchema`** — enum dos 7 valores. Tipo derivado `CategoriaViolacao`.
- **`ViolacaoValidacaoSchema`** — objeto com `categoria`, `numero` opcional, `codigo`, `mensagem`.
- **`RelatorioValidacaoSchema`** — objeto com os 6 campos da tabela de estruturas.
- **`SeloDatasetSchema`** — objeto `{ valido: boolean; geradoEm: string }`. F03 usa este schema
  para parsear `dataset-seal.json` com segurança antes de decidir se sobe o catálogo.
- **`CLASSES_CONHECIDAS`** — `readonly string[]` de 24 valores (Decisão 3).
- **`CAMINHO_PLACEHOLDER_ARTE_PADRAO`** — `string`, caminho relativo canônico (Decisão 5).

Códigos de violação usados: `contagem_invalida`, `numero_ausente`, `numero_duplicado`,
`tipo_invalido`, `guardiao_invalido`, `password_formato_invalido`, `schema_canonico_invalido`,
`classe_desconhecida`, `coerencia_monstro_incompleta`, `coerencia_nao_monstro_com_stats`,
`arte_ausente_sem_placeholder`.

### Funções públicas

```
// packages/data/src/validacao — núcleo puro, sem I/O

reparsearCartas(bruto: unknown): { cartas: readonly Carta[]; violacoes: readonly ViolacaoValidacao[] }
  // pré: bruto é o conteúdo já parseado de JSON.parse(cards.json), tipo unknown
  // pós: cartas contém só os elementos que passaram em CartaSchema; violacoes cobre os demais,
  //      sem abortar no primeiro erro

checarContagemEContiguidade(cartas: readonly Carta[]): readonly ViolacaoValidacao[]
checarUnicidade(cartas: readonly Carta[]): readonly ViolacaoValidacao[]
checarClasseConhecida(cartas: readonly Carta[]): readonly ViolacaoValidacao[]
checarCoerenciaPorTipo(cartas: readonly Carta[]): readonly ViolacaoValidacao[]

checarCoberturaDeArte(
  cartas: readonly Carta[],
  manifesto: ManifestoArtes,
  placeholderExiste: boolean,
): readonly ViolacaoValidacao[]

montarRelatorioValidacao(entrada: {
  totalValidado: number;
  violacoes: readonly ViolacaoValidacao[];
  agora: () => string;
}): RelatorioValidacao

validarDataset(entrada: {
  cardsBruto: unknown;
  manifesto: ManifestoArtes;
  placeholderExiste: boolean;
  agora: () => string;
}): { relatorio: RelatorioValidacao; selo: SeloDataset }
  // orquestra reparse + as 4 checagens de conjunto + montagem do relatório/selo
```

```
// packages/data/scripts/validate-cards.ts — adaptador de I/O

executarValidacao(opcoes: { dirGerado: string; caminhoPlaceholder: string }): Promise<number>
  // lê cards.json e arts-manifest.json de dirGerado, verifica caminhoPlaceholder no disco,
  // chama validarDataset, escreve validation-report.json e dataset-seal.json,
  // imprime o resumo, retorna o exit code (0 sse selo.valido)
  // aborta antes de qualquer checagem se cards.json ou arts-manifest.json não existir/não parsear
```

### Exemplos de artefato

`generated/dataset-seal.json` — caso válido (dataset real de F01):

```json
{
  "valido": true,
  "geradoEm": "2026-07-27T12:05:00.000Z"
}
```

`generated/validation-report.json` — caso válido:

```json
{
  "totalValidado": 722,
  "violacoes": [],
  "violacoesPorCategoria": {
    "contagem": 0,
    "unicidade": 0,
    "tipo": 0,
    "classe": 0,
    "coerencia": 0,
    "password": 0,
    "arte": 0
  },
  "classesDesconhecidas": [],
  "valido": true,
  "geradoEm": "2026-07-27T12:05:00.000Z"
}
```

`generated/validation-report.json` — caso com violações, ilustrando a forma de `violacoes` e o
efeito em `valido`:

```json
{
  "totalValidado": 722,
  "violacoes": [
    {
      "categoria": "coerencia",
      "numero": "045",
      "codigo": "coerencia_monstro_incompleta",
      "mensagem": "Carta 045: tipo monstro sem atk/def ou guardiões preenchidos."
    },
    {
      "categoria": "arte",
      "numero": "310",
      "codigo": "arte_ausente_sem_placeholder",
      "mensagem": "Carta 310: arte ausente e sem placeholder."
    }
  ],
  "violacoesPorCategoria": {
    "contagem": 0,
    "unicidade": 0,
    "tipo": 0,
    "classe": 0,
    "coerencia": 1,
    "password": 0,
    "arte": 1
  },
  "classesDesconhecidas": [],
  "valido": false,
  "geradoEm": "2026-07-27T12:05:00.000Z"
}
```

### Contratos externos (cross-PRD)

Nenhum consumido. O selo e o relatório produzidos aqui são o contrato **fornecido** a F03 (que
recusa subir sem `selo.valido === true`) e, por transitividade, aos módulos cross-PRD listados no
PRD §3 — todos consomem F03, nunca F02 diretamente.

## 5. Modelo de Dados

Esta feature não cria tabelas Postgres nem estruturas IndexedDB — não há estado por jogador. A
persistência de `dataset_versions` (`arquitetura.md` §5.1) pertence a F10.

### Arquivos de dados gerados

| Arquivo | Formato | Determinístico | Consumidor |
|---|---|---|---|
| `packages/data/generated/validation-report.json` | Objeto JSON `RelatorioValidacao` | não (contém `geradoEm`) | mantenedor de dados |
| `packages/data/generated/dataset-seal.json` | Objeto JSON `SeloDataset` | não (contém `geradoEm`) | F03 |

**Versionamento em git:** ambos ficam em `packages/data/generated/`, já coberto pelo `.gitignore`
de F01 — nenhuma alteração adicional nesse arquivo. A tarefa Turborepo `data:validate` declara
`inputs: ["packages/data/generated/cards.json", "packages/data/generated/arts-manifest.json"]` e
`outputs: ["packages/data/generated/validation-report.json",
"packages/data/generated/dataset-seal.json"]`, com `dependsOn: ["data:ingest"]`.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem |
|---|---|---|---|
| `cards.json` ausente ou ilegível | Adaptador CLI, antes de qualquer checagem | **Aborta.** Nenhum artefato de saída escrito, exit code ≠ 0 | `Catálogo não encontrado ou ilegível em {caminho} — validação cancelada.` |
| `arts-manifest.json` ausente ou ilegível | Adaptador CLI | **Aborta.** Idem acima | `Manifesto de artes não encontrado ou ilegível em {caminho} — validação cancelada.` |
| Contagem ≠ 722 ou range não contíguo | `checarContagemEContiguidade` | Não aborta; violação `contagem`, `valido = false` | `Dataset com {N} cartas (esperado 722) — verificar ingestão.` |
| `tipo` fora do enum de 5 valores | `reparsearCartas` (via `CartaSchema`) | Não aborta; violação `tipo`, `valido = false` | `Carta {numero}: tipo '{valor}' não permitido.` |
| Guardião fora dos 10 conhecidos | `reparsearCartas` | Não aborta; violação `tipo` | `Carta {numero}: guardião '{valor}' não reconhecido.` |
| `password` fora do formato de 4 grupos | `reparsearCartas` | Não aborta; violação `password` | `Carta {numero}: password '{valor}' fora do formato esperado.` |
| `classe` fora de `CLASSES_CONHECIDAS` | `checarClasseConhecida` | Não aborta; violação `classe`, `valido = false` (Decisão 2) | `Carta {numero}: classe '{valor}' fora do conjunto conhecido.` |
| `monstro` sem `atk`/`def`/guardiões preenchidos | `checarCoerenciaPorTipo` | Não aborta; violação `coerencia` | `Carta {numero}: tipo monstro sem atk/def ou guardiões preenchidos.` |
| Não-monstro (incl. `ritual`) com algum desses campos preenchido | `checarCoerenciaPorTipo` | Não aborta; violação `coerencia` (Decisão 4) | `Carta {numero}: tipo {tipo} não deveria ter atk/def/guardiões preenchidos.` |
| `numero` duplicado entre dois registros reparseados | `checarUnicidade` | Não aborta; violação `unicidade`, `valido = false` | `Numero {N} duplicado — integridade não garantida.` |
| Carta sem arte no manifesto e placeholder ausente no disco | `checarCoberturaDeArte` | Não aborta; violação `arte`, `valido = false` | `Carta {numero}: arte ausente e sem placeholder.` |
| Carta sem arte no manifesto e placeholder presente no disco | `checarCoberturaDeArte` | Coberta, sem violação | — |
| Falha ao escrever `validation-report.json`/`dataset-seal.json` | `catch` no adaptador | Propaga com `cause` preservada, exit code ≠ 0 | `Falha ao escrever artefatos de validação em {dirGerado}.` |

Todo descarte/violação é **registrado**, nunca silencioso (guidelines §8.3, ADR-003). O único
caminho que aborta antes de produzir qualquer relatório é a ausência/ilegibilidade dos artefatos
de entrada — nesse caso não há "veredito", há falha de pré-condição.

## 7. Estratégia de Testes

### Unitários (Vitest)

`reparsearCartas` — table-driven (guidelines §11.2):
- `reparsearCartas aceita carta válida sem violação`
- `reparsearCartas rejeita tipo fora do enum de cinco valores com código tipo_invalido`
- `reparsearCartas rejeita guardião fora dos dez conhecidos`
- `reparsearCartas rejeita password fora do formato de quatro grupos numéricos`
- `reparsearCartas rejeita elemento que não é um objeto válido`
- `reparsearCartas não aborta no primeiro elemento inválido e processa o array inteiro`

`checarContagemEContiguidade`:
- `checarContagemEContiguidade não gera violação para 722 cartas contíguas`
- `checarContagemEContiguidade gera violação quando o total é diferente de 722`
- `checarContagemEContiguidade gera violação por numero ausente quando há lacuna no intervalo`

`checarUnicidade`:
- `checarUnicidade não gera violação sem numero duplicado`
- `checarUnicidade gera violação citando os dois registros de numero duplicado`

`checarClasseConhecida`:
- `checarClasseConhecida não gera violação para as 24 classes conhecidas`
- `checarClasseConhecida gera violação e lista a classe em classesDesconhecidas`

`checarCoerenciaPorTipo`:
- `checarCoerenciaPorTipo aprova monstro com atk def e guardiões preenchidos`
- `checarCoerenciaPorTipo reprova monstro sem atk`
- `checarCoerenciaPorTipo reprova monstro sem guardiao2`
- `checarCoerenciaPorTipo aprova ritual com atk def e guardiões vazios`
- `checarCoerenciaPorTipo aprova armadilha equipamento e magica com campos vazios`
- `checarCoerenciaPorTipo reprova não-monstro com atk preenchido indevidamente`

`checarCoberturaDeArte`:
- `checarCoberturaDeArte aprova carta presente no manifesto`
- `checarCoberturaDeArte aprova carta ausente do manifesto quando o placeholder existe`
- `checarCoberturaDeArte reprova carta ausente do manifesto quando o placeholder não existe`

`validarDataset`:
- `validarDataset resulta em selo válido quando nenhuma violação ocorre`
- `validarDataset resulta em selo inválido quando qualquer categoria tem violação`
- `validarDataset agrega violacoesPorCategoria com violações de múltiplas categorias`
- `validarDataset preenche as 7 chaves de violacoesPorCategoria mesmo quando zeradas`

### Property-based (fast-check)

- **Contiguidade completa:** para qualquer subconjunto de `numero` removido do intervalo
  001–722, `checarContagemEContiguidade` reporta violação de lacuna sse o subconjunto removido for
  não vazio, e a lista de números ausentes é exatamente esse subconjunto. 1.000 execuções.
- **Unicidade sob duplicação arbitrária:** injetar um número arbitrário de duplicatas em posições
  arbitrárias sempre produz exatamente uma violação por `numero` duplicado, nunca mais nem menos.
- **Coerência simétrica:** para todo tipo ≠ `monstro` gerado com `atk`/`def`/guardiões
  aleatoriamente nulos ou preenchidos, `checarCoerenciaPorTipo` reporta violação sse pelo menos um
  desses campos for não-nulo.
- **Idempotência do veredito:** rodar `validarDataset` duas vezes com a mesma entrada produz o
  mesmo `relatorio.violacoes` (ignorando `geradoEm`).

### Integração

`packages/data/tests/validate-cards.integration.test.ts`, rodando após a ingestão real de F01:
- `validação real aprova o dataset gerado pela ingestão real`
- `validação real reporta violacoesPorCategoria zerada em todas as categorias no dataset real`
- `validação real detecta classe desconhecida quando cards.json é adulterado manualmente`
- `validação real detecta numero duplicado quando cards.json é adulterado manualmente`
- `validação real recusa o selo quando o placeholder padrão está ausente e há carta sem arte simulada`
- `validação real aborta sem escrever artefatos quando cards.json não existe`

### Análise estática

- `packages/data/src/validacao/**` não importa `node:fs`, `node:path`, `node:process` nem
  `fetch` — o núcleo de validação é puro e testável sem filesystem, mesma regra de F01.
- `packages/data` continua importando apenas `packages/shared` (`arquitetura.md` §2).
- `tsc --noEmit` passa com o baseline strict de guidelines §6.1.

### Testes de aceitação (critérios do PRD, com a correção da Decisão 1)

| Critério (PRD §9, F02) | Teste |
|---|---|
| Contagem ≠ 722 ou range não contíguo → inválido, não selado | `checarContagemEContiguidade gera violação quando o total é diferente de 722` + `validação real...` |
| `tipo` fora do enum invalida com mensagem apontando a carta | `reparsearCartas rejeita tipo fora do enum de cinco valores...` |
| **(corrigido pela Decisão 1)** `monstro` sem `atk`/`def`/guardiões é violação de coerência; `ritual` segue a regra dos demais não-monstro (campos vazios esperados) | `checarCoerenciaPorTipo reprova monstro sem atk` + `checarCoerenciaPorTipo aprova ritual com atk def e guardiões vazios` |
| Carta sem arte no manifesto e sem placeholder invalida o dataset | `checarCoberturaDeArte reprova carta ausente do manifesto quando o placeholder não existe` + `validação real recusa o selo quando o placeholder padrão está ausente...` |
| `numero` duplicado invalida o dataset | `checarUnicidade gera violação citando os dois registros...` |
| Relatório lista cada carta/campo em violação; veredito final explícito | `validarDataset agrega violacoesPorCategoria com violações de múltiplas categorias` + exemplos JSON da Seção 4 |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: o dataset produzido por F01 e selado por F02 é o único servido por F03 | Contrato declarado nesta spec (`SeloDatasetSchema`, `dataset-seal.json`); F03 (spec futura) deve recusar subir sem `selo.valido === true` — verificado quando F03 for especificada |
| Cross-Feature: a contagem canônica de F03 (722) é consistente sem reaparecer o "821" | `validação real aprova o dataset gerado pela ingestão real` reforça que só 722 cartas reparseadas com sucesso chegam ao veredito |

Nenhum critério de **Cross-PRD Integration** do PRD §9 cita F02 diretamente — os efeitos cross-PRD
passam por F03, que consome o selo e o relatório produzidos aqui.
