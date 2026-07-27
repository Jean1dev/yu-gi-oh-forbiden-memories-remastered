# Busca por Nome/Número

> PRD: `docs/prds/library.md` — F03
> Pacote-alvo: `packages/rules` (+ `apps/web`)

## 1. Contexto e Escopo

Esta feature adiciona a busca textual da Library sobre a grade entregue por F02. O jogador digita
um termo no topo de `/library`, e a sequência de cartas visível é reduzida em tempo real por
correspondência parcial de nome ou por número de coleção, sem alterar posse, ordenação ou filtros
que outras features controlam. A busca pertence à Fase 2 do roadmap (`docs/arquitetura.md` §9) e
segue ADR-004: a UI só orquestra interação; a regra de filtragem fica em pacote compartilhado e
testável.

F03 depende diretamente de `library`/F02, que já tem spec em
`docs/specs/library/F02-grade-da-colecao/`. F02 fornece a rota, a grade e o contrato de que a grade
renderiza exatamente a sequência recebida. F03 preenche esse contrato com uma projeção filtrada e
mantém o termo de busca na URL para que a navegação até o detalhe preserve o estado atual, como F02
já antecipou.

### Incluído

- Regra pura em `packages/rules` para normalizar o termo de busca e filtrar `EntradaLibrary[]`
  preservando a ordem recebida (PRD §6 F03 Capabilities).
- Busca por nome com correspondência parcial, sem diferenciar maiúsculas/minúsculas nem acentos
  (PRD §9 F03).
- Busca por `numero` da coleção, tratando termos numéricos de 1 a 3 dígitos como número canônico
  com zero à esquerda (Decisão 3).
- Campo de busca no topo da Library, acima da grade, com atualização a cada tecla e ação de limpar
  (PRD §6 F03 Experience).
- Persistência do termo no query param `q`, sem criar armazenamento local e sem remover futuros
  filtros/ordenações de F04 (Decisão 4).
- Estado "sem resultados" com a mensagem exata `Nenhuma carta encontrada para '{termo}'.` quando
  a busca combinada com os demais recortes não encontra cartas (PRD §6 F03 Experience).
- Preservação dos query params ativos nos links para `/library/[numero]`, para que F05 possa
  reconstruir a sequência filtrada na navegação anterior/próxima.
- Testes de regra, componentes e integração cobrindo os critérios de aceite de F03 e a composição
  com F04/F05.

### Fronteiras

- **Carregamento do catálogo, coleção, status obtida/não-obtida, contagem e arte** → F01. F03
  consome `EntradaLibrary` e não consulta Supabase, IndexedDB, `cards-data/` nem resolvedor de
  artes.
- **Rota `/library`, grade, célula, indicador e estados de falha/vazio** → F02. F03 altera a
  composição da sequência enviada à grade e acrescenta o campo de busca; não reimplementa a grade.
- **Filtro por tipo, filtro de status, ordenação e ação "limpar filtros"** → F04. F03 reserva e
  preserva os query params de F04, mas só escreve/remove `q`.
- **Tela de detalhe e navegação anterior/próxima** → F05. F03 apenas garante que os links ao
  detalhe mantenham a query string atual.
- **Escrita na coleção, liberação por senha e recompensas** → Password / Campanha / Free Duel
  (PRD §7). A busca é somente-leitura.
- **Cálculos de Guardiões, terreno, fusões, drops e efeitos** → fora da Library nesta versão
  (PRD §7; `docs/arquitetura.md` §10). A busca não usa nenhuma tabela externa pendente.

### Contratos externos assumidos

F03 não adiciona dependência cross-PRD direta. Ela herda, por F01/F02, os contratos externos de
catálogo (`banco-de-cartas`/F03), resolução de artes (`banco-de-cartas`/F04), coleção do jogador
(`build-deck`/F01) e Auth/Cadastro. Esses contratos continuam "a ser fornecidos" pelos módulos
correspondentes; F03 não cria caminho alternativo para nenhum deles.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A busca vive como regra pura em `packages/rules/src/library/busca.ts`, não dentro do componente. A UI apenas lê/escreve `q`, chama a projeção e renderiza o resultado. | ADR-004; spec `library/F02` Decisão 1; guidelines §19.2 | confirmada |
| 2 | O escopo é completo e não há bloco Core/Full para F03. Nenhuma funcionalidade foi adiada. | PRD §6 F03; instrução do lote | confirmada |
| 3 | Termos exclusivamente numéricos de 1 a 3 dígitos são normalizados para comparação em 3 dígitos e comparados por igualdade. Ex.: `1` busca `001`; `67` busca `067`; `120` busca `120`; `0`/`000` não casam carta alguma. Correspondência parcial fica restrita a nome, porque o PRD só exige parcial para nome. | auto-aceite: especificação parcial no PRD → default consistente; PRD §9 F03 | a confirmar |
| 4 | O query param canônico da busca é `q`. O valor armazenado é o texto aparente do jogador após trim e limite técnico; a normalização para comparação não altera o texto exibido nem a mensagem de sem resultados. | auto-aceite: decisão técnica com recomendação clara; spec `library/F02` Decisão 4 | a confirmar |
| 5 | O limite técnico do termo é 80 caracteres. Termos maiores são truncados antes de entrar no estado e na URL para evitar query strings excessivas, sem gerar erro ao jogador. | auto-aceite: detalhe técnico omitido no PRD → default de mercado; guidelines §18.3 | a confirmar |
| 6 | A busca é aplicada imediatamente a cada alteração do campo; não há debounce obrigatório. Com 722 entradas, a filtragem O(n) sobre índice normalizado cabe no orçamento de ≤200 ms e mantém a sensação de resposta direta. Atualizações de URL usam substituição de histórico, não empilham uma entrada por tecla. | auto-aceite: detalhe técnico omitido no PRD → default consistente; PRD §4 Métricas | a confirmar |
| 7 | A regra prepara um índice de busca em memória por sequência recebida, com `nome` normalizado apenas nas entradas obtidas. A busca por nome nunca considera cartas bloqueadas, porque `EntradaLibrary` não carrega `carta` nessa variante e F04/F05 proíbem revelar atributos de não obtidas. | spec `library/F01` Decisão 2; PRD §6 F04/F05; guidelines §6.3 | confirmada |
| 8 | Cartas bloqueadas continuam pesquisáveis por `numero`, pois o número é o único dado visível nelas. Isso preserva o filtro de status de F04 sem vazar nome, tipo, classe, senha ou atributos. | PRD §6 F04/F05; spec `library/F02` Decisão 5 | confirmada |
| 9 | F03 não decide a ordem final da grade. `filtrarPorBuscaLibrary` preserva a ordem da entrada; F02 fornece `numero` crescente por padrão e F04 poderá ordenar antes ou depois da busca sem quebrar a semântica E. | PRD §6 F03/F04; spec `library/F02` Contratos | confirmada |
| 10 | A ação de limpar busca remove somente `q`; filtros de tipo/status e ordenação futuros permanecem na URL. O comando "limpar filtros" completo pertence a F04. | PRD §6 F03/F04; auto-aceite: decisão técnica com recomendação clara | confirmada |
| 11 | O estado de sem resultados é diferente do estado de coleção vazia de F02. Coleção vazia é ausência de cartas obtidas antes de buscar; sem resultados é uma sequência base não vazia que se tornou vazia após aplicar `q`. | PRD §6 F02/F03 Error/Experience; spec `library/F02` Estados da tela | confirmada |
| 12 | Nenhuma tabela de dado externo pendente é consumida. Guardiões aparecem apenas se já estiverem em uma carta obtida e a busca não calcula vantagem; fusões, drops, terreno, rating e balanceamento não participam. | PRD §7; `docs/arquitetura.md` §10; ADR-003 | não se aplica |
| 13 | O monorepo ainda não tem implementação. Esta spec assume o scaffolding, `packages/rules` e `apps/web` declarados pelas specs anteriores e não recria nenhum pacote. | ADR-001; specs `library/F01` e `library/F02` | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `packages/rules/src/library/busca.ts` | rules | novo | Normalização do termo, preparação do índice de busca e filtragem preservando ordem |
| `packages/rules/src/library/busca.test.ts` | rules | novo | Unitários de nome, número, acentos, caixa, termo vazio, bloqueadas e preservação de ordem |
| `packages/rules/src/library/busca.propriedades.test.ts` | rules | novo | Propriedades fast-check da normalização e da filtragem |
| `packages/rules/src/library/index.ts` | rules | alterado | Reexporta a busca no subsistema Library |
| `apps/web/src/lib/library/busca-url.ts` | web | novo | Validação zod e serialização do query param `q`, com preservação dos demais params |
| `apps/web/src/lib/library/busca-url.test.ts` | web | novo | Unitários de parse/serialização/truncamento e remoção isolada de `q` |
| `apps/web/src/components/library/campo-busca.tsx` | web | novo | Campo de busca controlado pela URL e botão/ação de limpar |
| `apps/web/src/components/library/campo-busca.test.tsx` | web | novo | Testes de digitação, limpeza, acessibilidade e preservação de filtros futuros |
| `apps/web/src/components/library/estado-sem-resultados.tsx` | web | novo | Mensagem de busca sem resultados com interpolação segura do termo |
| `apps/web/src/components/library/estado-sem-resultados.test.tsx` | web | novo | Testes da mensagem exata e da distinção em relação ao estado vazio |
| `apps/web/src/components/library/grade-colecao.tsx` | web | alterado | Aceita query string ativa para repassar aos links de detalhe sem filtrar internamente |
| `apps/web/src/components/library/celula-carta.tsx` | web | alterado | Preserva `q` e demais params no destino `/library/[numero]` |
| `apps/web/src/app/library/library-cliente.tsx` | web | alterado | Lê `q`, monta a sequência pesquisada, exibe campo/sem-resultados e envia a lista à grade |
| `apps/web/src/app/library/library-cliente.test.tsx` | web | alterado | Cobre a máquina de estados com busca e a mensagem de sem resultados |
| `apps/web/tests/library-busca.integration.test.tsx` | web | novo | Integração F01→F02→F03 com 722 entradas falsas/fixture e atualização da grade |
| `.dependency-cruiser.cjs` | raiz | alterado | Garante que `packages/rules/src/library/busca.ts` não importe UI, DOM, rede, Supabase, fs ou relógio |

**Verificação da direção de dependências:** `packages/rules` importa apenas `packages/shared` e
outros arquivos do próprio pacote. `apps/web` importa `shared` e `rules`, mas nenhum pacote abaixo
importa `apps/web`. A direção `shared ← data ← rules ← engine ← ai` de `docs/arquitetura.md` §2 é
respeitada, e esta feature não toca `engine`, `ai`, `server` nem `data`.

Esta feature **não toca `packages/engine`**: não produz estado de duelo, não usa PRNG, não emite
eventos do motor e não participa de replay. As garantias relevantes são:

- `packages/rules/src/library/busca.ts` é puro: sem React, DOM, Supabase, `fetch`, IndexedDB,
  `node:fs`, relógio ou logs.
- A UI não consulta catálogo nem coleção: recebe `EntradaLibrary` de F01/F02 e aplica uma projeção.
- Nenhum arquivo desta feature escreve em `collections`, lê `cards-data/` ou contém o literal
  `722` como fonte de verdade.
- Nenhuma função de busca acessa campos de carta em entrada bloqueada; esse acesso é impossível
  pelo tipo definido em F01.

## 3. Design Técnico

### Estruturas de dados

**`TermoBuscaLibrary`** representa o texto aparente do jogador depois de trim e limite de 80
caracteres. Ele preserva caixa e acentos para exibição; a comparação usa uma forma normalizada
derivada.

**`TermoBuscaNormalizado`** é a forma usada pela regra:

| Campo | Semântica |
|---|---|
| `textoOriginal` | Texto aparente usado no campo e na mensagem de sem resultados |
| `textoNome` | Forma `lowercase`, sem acentos e com espaços normalizados, usada para busca por nome |
| `numeroBusca` | String de comparação com 3 dígitos quando o termo contém apenas 1 a 3 dígitos válidos; ausente em `0`/`000` e nos demais casos |
| `vazio` | Verdadeiro quando o termo aparente fica vazio após trim |

**`EntradaBuscaLibrary`** é um item do índice em memória:

| Campo | Semântica |
|---|---|
| `entrada` | A `EntradaLibrary` original, sem cópia profunda |
| `numero` | Número canônico sempre disponível |
| `nomeNormalizado` | Presente apenas quando `entrada.obtida === true`; ausente em bloqueadas para evitar vazamento |

**`IndiceBuscaLibrary`** é a sequência preparada para busca. Ele mantém a mesma ordem das entradas
recebidas e só acrescenta dados derivados necessários para comparação rápida. Não é serializado,
não vai para IndexedDB e não cruza fronteira de rede.

### Fluxo

1. **Carregar F01/F02.** `library-cliente` recebe de F01 o `IndiceLibrary`; F02 aplica o recorte
   padrão `somenteObtidas` enquanto F04 não existe. A sequência resultante é a base inicial da
   busca.
2. **Ler URL.** O cliente lê `q` dos query params com `busca-url.ts`. Valor ausente, inválido,
   vazio ou só espaços vira termo vazio. Valores acima de 80 caracteres são truncados antes de
   serem usados.
3. **Preparar índice.** Quando a sequência base muda, `prepararBuscaLibrary` cria um
   `IndiceBuscaLibrary` em memória. Nomes são normalizados uma vez por mudança de sequência, não
   a cada tecla.
4. **Filtrar.** A cada alteração de `q`, `filtrarPorBuscaLibrary` recebe o índice preparado e o
   termo normalizado:
   - termo vazio devolve todas as entradas, na mesma ordem;
   - `numeroBusca` presente seleciona entradas cujo `numero` é igual à string de 3 dígitos;
   - `textoNome` não vazio seleciona entradas obtidas cujo nome normalizado contém o termo;
   - uma carta entra no resultado se qualquer um dos critérios aplicáveis casar.
5. **Renderizar grade.** A grade de F02 recebe o resultado filtrado e continua sem conhecer a regra
   de busca. Ela renderiza exatamente a sequência recebida.
6. **Sem resultados.** Se a sequência base não está vazia, o termo não está vazio e o resultado é
   vazio, F03 renderiza `Nenhuma carta encontrada para '{termo}'.` acima do espaço onde a grade
   ficaria. Se a coleção está vazia antes da busca, o estado vazio de F02 continua tendo prioridade.
7. **Atualizar URL.** Digitação substitui `q` na URL com navegação sem scroll e sem empilhar
   histórico por tecla. Limpar remove apenas `q`.
8. **Navegar para detalhe.** Links das células preservam a query string atual. F05 poderá ler `q`
   e os filtros futuros para reconstruir a mesma sequência usada pela grade.

### Regras de negócio

- **Busca por nome é parcial, case-insensitive e accent-insensitive.** `Blue-Eyes`, `blue`, `BLUE`
  e formas sem acento em nomes localizados devem casar depois da normalização.
- **Busca por número é canônica e exata.** Termos `1`, `01` e `001` buscam a carta `001`; `123`
  busca `123`; `0`/`000` e termos com mais de 3 dígitos não casam número.
- **Termo vazio não filtra.** Espaços em branco, `q` ausente ou `q=` devolvem a sequência base.
- **Bloqueadas não casam por nome.** A regra não tem acesso ao nome de uma carta não obtida; ela
  só pode casar pelo `numero` visível (Decisão 7 e 8).
- **A ordem é preservada.** Busca nunca ordena; F02/F04 são as fontes de ordem.
- **Semântica E com F04.** A busca filtra a sequência que já foi restringida por tipo/status, ou é
  composta com esses filtros em um pipeline único. Em ambos os casos, uma carta precisa satisfazer
  busca **e** filtros ativos.
- **Limpar busca não limpa filtros.** A ação remove só `q`; F04 continuará dona de tipo, status,
  ordenação e do comando "limpar filtros".
- **Nenhum dado de carta é criado ou alterado.** F03 não cria campos no schema canônico e não
  altera `EntradaLibrary`.

### Acessibilidade e experiência

- O campo de busca tem nome acessível explícito e fica antes da grade na ordem de foco.
- O botão de limpar é um controle por ícone com nome acessível; fica indisponível ou ausente
  quando o termo está vazio.
- A mensagem de sem resultados é anunciada em região viva educada, sem mover o foco do campo.
- O texto digitado permanece no campo ao navegar para o detalhe e voltar, porque vive na URL.
- A atualização da grade não remove foco do campo nem força rolagem ao topo.
- O campo não usa texto visível para explicar o módulo; placeholders ou rótulos visuais devem ser
  curtos e funcionais, seguindo ADR-004 e `docs/estetica-visual.md` §2.2.

### Performance

- A preparação do índice acontece apenas quando a sequência base muda. Digitar uma tecla normaliza
  só o termo e percorre até 722 entradas.
- A filtragem é O(n), com `n ≤ totalCanonico()` do catálogo; F03 não cria estruturas proporcionais
  ao número de teclas digitadas.
- O orçamento de aceitação é a grade refletir cada tecla em ≤200 ms sobre a coleção completa
  (PRD §4 e §9 F03). A spec mede a regra em teste automatizado e reserva verificação em navegador
  para a atualização percebida, porque jsdom não mede pintura real.

## 4. Contratos

### Tipos e schemas

Esta feature não acrescenta contrato novo a `packages/shared`: `EntradaLibrary`, `NumeroCarta` e
`DomainError` vêm de F01 e dos contratos canônicos de carta. Os tipos de busca são públicos apenas
no subsistema `packages/rules/src/library`, porque representam projeção em memória e não payload
persistido.

Em `apps/web`, `busca-url.ts` define a validação zod da fronteira de query string:

- `q`: opcional; string; após trim pode ficar vazia; máximo efetivo de 80 caracteres.
- Query params desconhecidos ou de F04 são preservados por serialização, não validados por F03.
- `q` vazio não é escrito na URL; limpar remove o parâmetro.

### Funções públicas

```
normalizarTermoBuscaLibrary(termo: string): TermoBuscaNormalizado
  // contrato: trim, limite de 80 caracteres, lowercase, remoção de acentos e normalização de espaços
  // pós: informa termo vazio e, quando aplicável, numeroBusca de 3 dígitos

prepararBuscaLibrary(entradas: readonly EntradaLibrary[]): IndiceBuscaLibrary
  // contrato: preserva ordem e referência das entradas recebidas
  // pós: nomeNormalizado existe somente para entradas obtidas

filtrarPorBuscaLibrary(indice: IndiceBuscaLibrary, termo: TermoBuscaNormalizado): readonly EntradaLibrary[]
  // contrato: puro e determinístico
  // pós: termo vazio devolve todas as entradas; resultado preserva ordem; bloqueadas só casam por numero
```

```
lerBuscaDaUrl(searchParams: URLSearchParams): TermoBuscaLibrary
  // contrato: lê apenas q; não interpreta filtros de F04

aplicarBuscaNaUrl(searchParams: URLSearchParams, termo: TermoBuscaLibrary): URLSearchParams
  // contrato: substitui ou remove q preservando os demais params

removerBuscaDaUrl(searchParams: URLSearchParams): URLSearchParams
  // contrato: remove apenas q
```

### Propriedades dos componentes

```
CampoBuscaLibrary({ termo, aoAlterar, aoLimpar })
  // termo: texto aparente vindo de q
  // aoAlterar: substitui q sem empilhar histórico por tecla
  // aoLimpar: remove apenas q

EstadoSemResultadosBusca({ termo })
  // renderiza exatamente: Nenhuma carta encontrada para '{termo}'.
```

F03 altera o contrato de F02 de forma compatível:

```
GradeColecao({ entradas, queryStringDetalhe? })
CelulaCarta({ entrada, queryStringDetalhe? })
  // queryStringDetalhe é opcional; ausente mantém o comportamento de F02
  // presente preserva q e futuros filtros nos links /library/[numero]
```

### Exemplos JSON

Busca por nome, ignorando caixa e acento:

```json
{
  "q": "blue",
  "entrada": {
    "obtida": true,
    "numero": "001",
    "carta": { "nome": "Blue-eyes White Dragon" }
  },
  "casa": true
}
```

Busca por número canônico:

```json
{
  "q": "7",
  "numeroBusca": "007",
  "resultado": ["007"]
}
```

Carta bloqueada pesquisável só por número:

```json
{
  "q": "dragon",
  "entrada": {
    "obtida": false,
    "numero": "001",
    "arte": { "tipo": "silhueta" }
  },
  "casa": false
}
```

Limpar busca preservando filtros futuros:

```json
{
  "antes": "?q=dragon&status=todas&tipo=monstro&ordem=nome",
  "depois": "?status=todas&tipo=monstro&ordem=nome"
}
```

### Contratos internos futuros

- **`library`/F04 — Filtros e Ordenação.** F04 deve compor `filtrarPorBuscaLibrary` com filtros de
  tipo/status em semântica E, preservar `q` ao alterar seus próprios params e não reimplementar a
  normalização de busca. *Contrato interno a ser consumido por F04.*
- **`library`/F05 — Tela de Detalhe.** F05 deve ler `q` e os params de F04 para reconstruir a
  sequência atual antes de calcular anterior/próxima. F03 garante que os links carregam a query
  string necessária. *Contrato interno a ser consumido por F05.*

### Contratos externos (cross-PRD)

Nenhum contrato cross-PRD novo. Os externos necessários para que a tela exista são herdados de F01
e F02: catálogo canônico, resolução de artes, coleção do jogador e sessão autenticada. F03 não
fala diretamente com esses módulos.

## 5. Modelo de Dados

### Postgres / Supabase

Esta feature **não cria nem altera tabelas, índices, constraints, migrações, RLS ou RPCs**.
Ela não lê nem escreve `collections`; todo estado de coleção chega já materializado por F01.

Consequência: o critério cross-PRD de que a Library nunca modifica a coleção continua protegido
pela mesma fronteira de F01/F02 — nenhum arquivo de F03 tem permissão lógica para emitir
`insert`, `update`, `upsert` ou `delete`.

### Cache local / fila offline

Nenhum store IndexedDB novo e nenhuma fila offline. O termo de busca é estado de navegação e vive
somente no query param `q`. Isso é deliberado: o PRD pede preservação durante a experiência da
Library, não preferência persistente entre sessões.

### URL

| Parâmetro | Dono | Tipo | Semântica |
|---|---|---|---|
| `q` | F03 | string opcional, até 80 caracteres após trim | Termo aparente da busca |
| `tipo` | F04 | reservado | F03 preserva sem interpretar |
| `status` | F04 | reservado | F03 preserva sem interpretar |
| `ordem` | F04 | reservado | F03 preserva sem interpretar |
| `direcao` | F04 | reservado | F03 preserva sem interpretar |

`q` vazio não deve permanecer na URL. O uso de `router.replace`/substituição equivalente evita
poluir o histórico com uma entrada por tecla; a navegação até o detalhe continua uma entrada real.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| `q` ausente | `busca-url.ts` | Termo vazio; grade base sem busca | — |
| `q` vazio ou só espaços | Trim resulta vazio | Remove/ignora `q`; grade base sem busca | — |
| `q` maior que 80 caracteres | Validação da URL ou digitação | Trunca para o limite efetivo antes de filtrar e escrever URL | — |
| Termo com acentos ou caixa diferente | Normalização Unicode | Compara sem acento e em minúsculas | — |
| Termo numérico de 1 a 3 dígitos | Normalização numérica | Busca string de 3 dígitos, exceto `0`/`000`, que não casam carta | — |
| Termo numérico com mais de 3 dígitos | Normalização numérica | Não casa por número; como não há letras, tende a resultado vazio | `Nenhuma carta encontrada para '{termo}'.` |
| Termo misto de letras e números | Normalização | Participa da busca por nome; não é tratado como número | Mensagem de sem resultados se nada casar |
| Carta bloqueada com termo de nome | Variante `obtida: false` sem `carta` | Não casa por nome e não revela atributo | — |
| Carta bloqueada com número correspondente | Comparação por `numero` | Pode aparecer como célula bloqueada, sem revelar nome/atributos | — |
| Sequência base vazia por coleção vazia | `progresso.obtidas === 0` antes da busca | Estado vazio de F02 tem prioridade; não exibe mensagem de sem resultados | Mensagem de F02 |
| Sequência base não vazia e resultado vazio | Resultado de `filtrarPorBuscaLibrary` | Exibe estado de sem resultados no lugar da grade | `Nenhuma carta encontrada para '{termo}'.` |
| Falha de catálogo ou coleção | Estado de F01/F02 | Campo de busca não tenta filtrar; estados de falha de F02 têm prioridade | Mensagens de F02 |
| Limpar busca com filtros futuros ativos | Ação de limpar | Remove apenas `q` e mantém os demais params | — |
| Digitação rápida | Substituição de URL em sequência | Vence o termo mais recente; não há fila de mutação nem estado parcial | — |
| Navegar ao detalhe com busca ativa | Link da célula | Mantém query string no destino | — |
| Voltar do detalhe | Histórico/URL | Campo e grade retomam o mesmo `q` | — |

Erros técnicos inesperados na leitura de query params são tratados como termo vazio e registrados
no limite da aplicação, sem interromper a Library. Nenhum valor de `q` é interpolado sem escape na
UI; React trata a mensagem como texto, não HTML (guidelines §18.3).

## 7. Estratégia de Testes

### Unitários (Vitest)

`normalizarTermoBuscaLibrary`:
- `normalizarTermoBuscaLibrary remove espacos externos e preserva texto aparente`
- `normalizarTermoBuscaLibrary remove acentos para comparacao`
- `normalizarTermoBuscaLibrary converte comparacao para minusculas`
- `normalizarTermoBuscaLibrary colapsa espacos internos na forma de comparacao`
- `normalizarTermoBuscaLibrary marca termo vazio quando q tem apenas espacos`
- `normalizarTermoBuscaLibrary trunca termo acima de oitenta caracteres`
- `normalizarTermoBuscaLibrary converte um digito em numero canonico`
- `normalizarTermoBuscaLibrary converte dois digitos em numero canonico`
- `normalizarTermoBuscaLibrary preserva tres digitos como numero canonico`
- `normalizarTermoBuscaLibrary nao gera numero canonico para zero ou mais de tres digitos`

`prepararBuscaLibrary`:
- `prepararBuscaLibrary preserva a ordem das entradas recebidas`
- `prepararBuscaLibrary preserva a referencia da entrada original`
- `prepararBuscaLibrary cria nome normalizado para carta obtida`
- `prepararBuscaLibrary nao cria nome normalizado para carta bloqueada`

`filtrarPorBuscaLibrary`:
- `filtrarPorBuscaLibrary devolve todas as entradas para termo vazio`
- `filtrarPorBuscaLibrary encontra carta obtida por parte do nome`
- `filtrarPorBuscaLibrary encontra nome ignorando maiusculas e minusculas`
- `filtrarPorBuscaLibrary encontra nome ignorando acentos`
- `filtrarPorBuscaLibrary encontra carta por numero canonico`
- `filtrarPorBuscaLibrary nao encontra carta bloqueada por nome`
- `filtrarPorBuscaLibrary encontra carta bloqueada por numero`
- `filtrarPorBuscaLibrary preserva a ordem relativa dos resultados`
- `filtrarPorBuscaLibrary devolve lista vazia quando nada casa`
- `filtrarPorBuscaLibrary combina numero e nome por criterio OU dentro da busca`

`busca-url.ts`:
- `lerBuscaDaUrl devolve termo vazio quando q esta ausente`
- `lerBuscaDaUrl devolve termo vazio quando q esta vazio`
- `lerBuscaDaUrl trunca q acima do limite`
- `aplicarBuscaNaUrl escreve q sem remover status tipo ordem ou direcao`
- `aplicarBuscaNaUrl remove q quando termo esta vazio`
- `removerBuscaDaUrl remove apenas q`
- `aplicarBuscaNaUrl preserva parametros desconhecidos`

### Property-based (fast-check)

- **Idempotência da normalização:** para qualquer string, normalizar a forma aparente resultante
  uma segunda vez produz a mesma forma de comparação.
- **Termo vazio é identidade:** para qualquer sequência de entradas, filtrar com termo vazio
  devolve a mesma sequência e as mesmas referências.
- **Preservação de ordem:** para qualquer sequência e qualquer termo, o resultado é uma
  subsequência na mesma ordem relativa.
- **Sem vazamento em bloqueadas:** para qualquer carta bloqueada e qualquer termo não numérico, a
  busca nunca inclui a entrada por dados que ela não carrega.
- **Número canônico seguro:** para qualquer inteiro entre 1 e 722 representado com 1 a 3 dígitos,
  a normalização produz uma string de 3 dígitos; zero e formatos fora desse intervalo textual não
  produzem `numeroBusca`.
- **Determinismo da busca:** mesmo índice e mesmo termo produzem resultados estruturalmente iguais
  em 1.000 execuções, sem depender de relógio, ordem de objeto ou ambiente.

### Componentes (Vitest + @testing-library/react)

`CampoBuscaLibrary`:
- `CampoBuscaLibrary renderiza o termo vindo da url`
- `CampoBuscaLibrary chama alteracao a cada tecla digitada`
- `CampoBuscaLibrary remove somente q ao limpar`
- `CampoBuscaLibrary nao empilha historico ao alterar o termo`
- `CampoBuscaLibrary mantem foco no campo depois de alterar a busca`
- `CampoBuscaLibrary expoe nome acessivel para o campo`
- `CampoBuscaLibrary expoe nome acessivel para o botao de limpar`

`EstadoSemResultadosBusca`:
- `EstadoSemResultadosBusca exibe a mensagem exata com o termo digitado`
- `EstadoSemResultadosBusca escapa o termo como texto`
- `EstadoSemResultadosBusca anuncia a mudanca em regiao viva`

`GradeColecao` / `CelulaCarta`:
- `CelulaCarta preserva q no link para o detalhe`
- `CelulaCarta preserva parametros de filtro futuros no link para o detalhe`
- `CelulaCarta mantem o destino sem query quando nao ha parametros ativos`

`LibraryCliente`:
- `LibraryCliente exibe campo de busca quando a library esta pronta`
- `LibraryCliente aplica busca antes de entregar entradas para a grade`
- `LibraryCliente exibe estado sem resultados para busca sem correspondencia`
- `LibraryCliente nao exibe estado sem resultados quando a colecao esta vazia`
- `LibraryCliente nao exibe campo de busca em falha de catalogo`
- `LibraryCliente nao exibe campo de busca em falha de colecao`
- `LibraryCliente preserva filtros futuros ao atualizar q`
- `LibraryCliente reflete a grade filtrada em ate duzentos milissegundos no fixture de 722 entradas`

### Integração

`apps/web/tests/library-busca.integration.test.tsx`:
- `Library busca por nome atravessa F01 F02 e F03 ate a grade`
- `Library busca por numero atravessa F01 F02 e F03 ate a grade`
- `Library busca sem resultados mostra a mensagem do PRD`
- `Library limpar busca restaura a grade ao estado dos demais filtros`
- `Library busca nao revela nome de cartas bloqueadas quando status futuro inclui todas`
- `Library links de detalhe preservam q para F05 reconstruir a sequencia`

### Análise estática

- `packages/rules/src/library/busca.ts` não importa React, DOM, Supabase, `fetch`, IndexedDB,
  `node:fs`, `node:process` ou relógio.
- Nenhum arquivo de F03 lê `cards-data/` ou monta caminho de arte.
- Nenhum arquivo de F03 executa escrita em `collections`.
- Nenhum arquivo de F03 contém o literal `722` como fonte de verdade; fixtures de teste podem
  declarar 722 explicitamente quando o caso de aceite exigir coleção completa.
- Nenhum componente de F03 acessa `entrada.carta` sem estreitar `entrada.obtida === true`.
- `tsc --noEmit` passa com `strict`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`
  conforme guidelines §6.1.

### Verificação de performance em navegador

Como jsdom não mede pintura, a atualização percebida da grade deve ser verificada em navegador
real sempre que a busca ou a grade mudar:

- Abrir `/library` com fixture de 722 entradas.
- Medir digitação de termos de nome e número em ambiente representativo.
- Confirmar que a grade reflete cada tecla em ≤200 ms e que o foco permanece no campo.
- Confirmar que limpar busca restaura a grade sem scroll inesperado.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F03) | Teste |
|---|---|
| Digitar parte do nome filtra a grade por correspondência parcial, ignorando maiúsculas/minúsculas e acentos | `filtrarPorBuscaLibrary encontra carta obtida por parte do nome` + `filtrarPorBuscaLibrary encontra nome ignorando maiusculas e minusculas` + `filtrarPorBuscaLibrary encontra nome ignorando acentos` + integração `Library busca por nome atravessa F01 F02 e F03 ate a grade` |
| Digitar um `numero` filtra a grade para a(s) carta(s) correspondente(s) | `normalizarTermoBuscaLibrary converte um digito em numero canonico` + `filtrarPorBuscaLibrary encontra carta por numero canonico` + integração `Library busca por numero atravessa F01 F02 e F03 ate a grade` |
| A grade atualiza em ≤200 ms por tecla sobre a coleção completa | `LibraryCliente reflete a grade filtrada em ate duzentos milissegundos no fixture de 722 entradas` + verificação de performance em navegador |
| A busca opera em conjunto (E) com os filtros de tipo/status ativos, sem resetá-los | `aplicarBuscaNaUrl escreve q sem remover status tipo ordem ou direcao` + `LibraryCliente preserva filtros futuros ao atualizar q` |
| Busca sem resultados exibe `Nenhuma carta encontrada para '{termo}'.` | `EstadoSemResultadosBusca exibe a mensagem exata com o termo digitado` + integração `Library busca sem resultados mostra a mensagem do PRD` |
| Limpar a busca restaura a grade ao estado dos demais filtros | `removerBuscaDaUrl remove apenas q` + integração `Library limpar busca restaura a grade ao estado dos demais filtros` |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: busca (F03) e filtros/ordenação (F04) aplicados na grade refletem-se na sequência de navegação anterior/próxima de F05 | `CelulaCarta preserva q no link para o detalhe` + `CelulaCarta preserva parametros de filtro futuros no link para o detalhe` + contrato interno de F05 na Seção 4 |
| Cross-Feature: cartas marcadas como obtidas em F01 aparecem na grade de F02 e abrem detalhe completo em F05 | F03 não altera esse caminho: `filtrarPorBuscaLibrary devolve todas as entradas para termo vazio` garante identidade quando `q` está vazio; F02/F05 cobrem renderização/detalhe |
| Cross-Feature: o filtro de status "não obtidas"/"todas" de F04 mostra bloqueadas sem revelar atributos | `filtrarPorBuscaLibrary nao encontra carta bloqueada por nome` + `filtrarPorBuscaLibrary encontra carta bloqueada por numero` + propriedade `Sem vazamento em bloqueadas` |
| Cross-Feature: o indicador "X de 722 obtidas" usa a contagem exposta por F01 | F03 não altera `ProgressoColecao`; análise estática garante que F03 não recalcula contagem nem escreve literal `722` |
| Cross-PRD: Password/Campanha/Free Duel atualizam a coleção e a Library reflete após recarregar | F03 é transparente ao recarregamento: `filtrarPorBuscaLibrary devolve todas as entradas para termo vazio` e os testes de F01/F02 continuam válidos; nenhuma escrita é adicionada |
| Cross-PRD: Library e Build Deck consomem o mesmo banco de cartas | F03 usa apenas `EntradaLibrary` já materializada; análise estática garante que não lê `cards-data/` nem reinterpreta carta |
