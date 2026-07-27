# Tela de Detalhe da Carta

> PRD: `docs/prds/library.md` — F05
> Pacote-alvo: `apps/web`

## 1. Contexto e Escopo

Esta feature preenche o destino `/library/[numero]` definido por F02 com a tela/painel de detalhe
de uma carta. Ela consome o índice carregado por F01 e a seleção originada na grade de F02 para
exibir, em modo somente-leitura, os dados completos de cartas obtidas e um estado bloqueado para
cartas ainda não obtidas. O desenho pertence à Fase 2 do roadmap (`docs/arquitetura.md` §9;
ADR-009) e segue ADR-004: a UI apresenta dados e aceita navegação, mas não cria regra de jogo, não
lê persistência diretamente e não duplica contratos de dados.

Por Política de Auto-Aceite do modo batch, esta SPEC cobre **somente o Core Scope** de F05. As
adições Full Scope do PRD — navegação anterior/próxima e ação de copiar senha — ficam adiadas,
mesmo quando aparecem em critérios de aceite do PRD.

### Incluído

- Conteúdo da rota `/library/[numero]` para página cheia em mobile e painel/modal interceptado em
  desktop, reusando a estrutura de rota criada por F02.
- Carregamento do estado da Library via `useLibrary` de F01 e busca da entrada por `numero` via
  contrato `buscarEntrada`.
- Exibição de carta obtida com arte/placeholder, `nome`, `numero`, `classe`, `tipo`, `atk`, `def`,
  `guardiao1`, `guardiao2`, `password` e `estrelas`, sem alterar nem enriquecer o schema canônico.
- Ocultação de ATK/DEF vazios e de outros campos canônicos vazios que não se aplicam ao tipo da
  carta, sem renderizar linhas em branco.
- Estado bloqueado para carta não obtida: silhueta, `numero` e mensagem `Carta ainda não obtida`,
  sem revelar nome, arte real, classe, tipo, atributos, guardiões, senha ou estrelas.
- Retorno à grade por link/ação de voltar que preserva a URL da Library quando houver query params.
- Estados de carregamento, falha herdada de F01 e carta inexistente para abertura direta por URL.
- Testes de componente, rota e integração suficientes para provar os critérios Core e os critérios
  cross-feature/cross-PRD que ainda se aplicam sem Full Scope.

### Adiado

- Navegação anterior/próxima entre cartas respeitando a ordenação/filtros ativos.
- Ação de copiar `password` para a área de transferência e feedback `Senha copiada`.
- Tratamento da sequência atual da grade produzida por F03/F04 dentro do detalhe. O Core apenas
  preserva query params ao retornar para a grade.

### Fronteiras

- **Carregamento, cruzamento catálogo × coleção, status obtida/não-obtida, referência de arte e
  acesso por `numero`** são de F01. F05 consome `EntradaLibrary` e não consulta Supabase,
  IndexedDB, `cards-data/` ou resolvedor de artes diretamente.
- **Rota da grade, célula clicável, shell da Library e modal interceptado** são precedentes de F02.
  F05 preenche o conteúdo do detalhe e não altera a semântica da grade.
- **Busca, filtros, ordenação e filtro de status** são de F03/F04. F05 Core não interpreta seus
  parâmetros, exceto para preservá-los no retorno à grade.
- **Compra/liberação por senha** pertence ao módulo Password. A Library exibe a senha, mas não
  libera, debita estrelas nem chama RPC de economia.
- **Escrita na coleção, recompensas e drops** pertencem a Password, Campanha, Free Duel e Save. A
  Library continua somente-leitura, conforme PRD §7.
- **Fusões, drops de duelistas, bônus de terreno e cálculo de vantagem/desvantagem de Guardiões**
  ficam fora desta versão. Guardiões são rótulos, sem consulta a tabelas pendentes de
  `docs/arquitetura.md` §4.3 e §10.
- **Quantidade de cópias no trunk** pertence ao Build Deck. F05 não exibe quantidade, apenas o
  booleano de posse já derivado por F01.

### Contratos externos assumidos

- **`library`/F01 — Acesso à Coleção do Jogador.** Já tem spec em
  `docs/specs/library/F01-acesso-a-colecao-do-jogador/` e fornece `useLibrary`,
  `EntradaLibrary`, `IndiceLibrary`, `buscarEntrada`, `ReferenciaArte` e os estados de falha.
  Dependência interna precedente, não bloqueante.
- **`library`/F02 — Grade da Coleção.** Já tem spec em
  `docs/specs/library/F02-grade-da-colecao/` e define a rota `/library/[numero]`, o link de cada
  célula e o padrão de página cheia em telas pequenas/modal interceptado em telas largas.
  Dependência interna precedente, não bloqueante.
- **`banco-de-cartas`/F03 e F04, `build-deck`/F01 e Auth/Cadastro.** Contratos externos herdados
  de F01: catálogo canônico, resolução de artes, leitura da coleção e sessão autenticada. F05 não
  fala com eles diretamente.
- **Password, Campanha, Free Duel e Save.** Fornecem mutações futuras em `collections`; F05 apenas
  reflete o resultado quando F01 recarrega a Library.
- **F03/F04 da Library.** Contratos internos futuros para busca/filtros/ordenação e query params
  da grade. Necessários apenas para as adições adiadas de navegação anterior/próxima.

### Decisões e Premissas

| # | Decisão / Premissa | Origem | Status |
|---|--------------------|--------|--------|
| 1 | A spec cobre só o **Core Scope**. Navegação anterior/próxima e cópia da senha ficam em `Adiado`, mesmo que o PRD os mencione em Experience e critérios. | Auto-Aceite: Escopo Core vs Core+Full | a confirmar |
| 2 | F05 é **puramente de apresentação** em `apps/web`. Não cria tipos novos em `shared` nem funções novas em `rules`, porque F01 já fornece `EntradaLibrary` e `buscarEntrada`, dentro do monorepo TypeScript travado. | ADR-001; ADR-004; specs `library/F01` e `library/F02` | confirmada |
| 3 | O detalhe é a rota real `/library/[numero]`, herdada de F02, e não estado local da grade. Isso preserva botão voltar, deep link, foco e a mesma semântica mobile/desktop definida pela spec F02. | spec `library/F02` Decisão 4; PRD §6 F05 Experience | confirmada |
| 4 | Abertura direta da rota recarrega a Library via F01 e busca a carta no índice. Se a entrada não existir, F05 mostra estado de carta não encontrada, em vez de inventar uma carta vazia. | Auto-Aceite: especificação parcial do PRD; guidelines §8.3 | a confirmar |
| 5 | Campos canônicos vazios que não se aplicam ao tipo da carta não viram linhas em branco. ATK/DEF vazios são ocultados por exigência explícita do PRD; para `guardiao1`/`guardiao2` vazios, aplica-se o mesmo default de apresentação. | PRD §6 F05 Capabilities; Auto-Aceite: especificação parcial do PRD | a confirmar |
| 6 | Para cartas obtidas, os valores exibidos vêm de `entrada.carta` sem transformação de domínio. Formatação é apenas de apresentação: rótulos legíveis, agrupamento visual e ocultação de campos vazios. | ADR-003; ADR-004; product.md schema de carta | confirmada |
| 7 | Para cartas não obtidas, o estado bloqueado é parte do Core porque não está no bloco Full Scope e é necessário para o contrato F02/F04 de não revelar atributos. A variante bloqueada de F01 torna o vazamento impossível por tipo. | PRD §6 F05 Capabilities; spec `library/F01` Decisão 2; spec `library/F02` Decisão 6 | confirmada |
| 8 | O botão/link de retorno preserva a query string de origem quando ela existir; se não existir, retorna para `/library`. F05 Core não interpreta os parâmetros, apenas os mantém. | spec `library/F02` Decisão 4; Auto-Aceite: default de boa prática | a confirmar |
| 9 | A senha é exibida como texto porque faz parte do Core de consulta; a cópia para área de transferência não entra nesta SPEC por ser Full Scope. | PRD §5 F05; Auto-Aceite: Escopo Core | a confirmar |
| 10 | Guardiões são rótulos simples. Nenhuma matriz Guardião×Guardião, terreno×classe, fusão ou drop é consultada, e nenhum valor de lore é inventado. | PRD §7; `docs/arquitetura.md` §4.3 e §10; ADR-003 | confirmada |
| 11 | A tela de detalhe usa os padrões visuais e de acessibilidade definidos por F02 e `docs/estetica-visual.md`: foco visível, alvo de toque ≥ 44 px, contraste AA e layout responsivo 320–1920 px. | `docs/estetica-visual.md` §2.2; ADR-004 | confirmada |
| 12 | Testes de componente usam a configuração de Vitest + Testing Library já prevista por F02. Nenhuma dependência de execução nova é adicionada, e os portões estáticos seguem a estratégia de qualidade automatizada do projeto. | ADR-008; spec `library/F02` Decisão 9; guidelines §20.1 | confirmada |

## 2. Alocação no Monorepo

| Arquivo | Pacote | Novo/Alterado | Responsabilidade |
|---------|--------|---------------|------------------|
| `apps/web/src/app/library/[numero]/page.tsx` | web | alterado | Página cheia do detalhe, preenchendo a rota criada por F02 |
| `apps/web/src/app/library/@modal/(.)[numero]/page.tsx` | web | alterado | Variante interceptada do mesmo detalhe para desktop, sobre a grade |
| `apps/web/src/app/library/[numero]/detalhe-carta-cliente.tsx` | web | novo | Fronteira de cliente: consome `useLibrary`, resolve `numero`, escolhe carregando/falha/encontrada/bloqueada |
| `apps/web/src/components/library/detalhe-carta.tsx` | web | novo | Componente de apresentação da carta obtida, organizado em blocos de informação |
| `apps/web/src/components/library/detalhe-carta.module.css` | web | novo | Layout responsivo do detalhe, arte em destaque, blocos densos e foco visível |
| `apps/web/src/components/library/bloco-detalhe-carta.tsx` | web | novo | Bloco reutilizável de rótulo/valor para identificação, combate, guardiões e liberação |
| `apps/web/src/components/library/arte-detalhe-carta.tsx` | web | novo | Arte em destaque usando `ReferenciaArte`, placeholder e silhueta sem resolver caminho |
| `apps/web/src/components/library/detalhe-carta-bloqueada.tsx` | web | novo | Estado bloqueado: silhueta, `numero` e mensagem, sem atributos |
| `apps/web/src/components/library/acao-voltar-library.tsx` | web | novo | Retorno à grade preservando query params quando presentes |
| `apps/web/src/components/library/mensagens.ts` | web | alterado | Acrescenta mensagens de carta não encontrada e reaproveita mensagens de falha de F01/F02 |
| `apps/web/src/components/library/detalhe-carta.test.tsx` | web | novo | Testes da carta obtida, campos vazios, rótulos e ausência de cálculos |
| `apps/web/src/components/library/detalhe-carta-bloqueada.test.tsx` | web | novo | Testes de redação da carta não obtida |
| `apps/web/src/app/library/[numero]/detalhe-carta-cliente.test.tsx` | web | novo | Testes de estados da rota: carregando, falha, encontrada, bloqueada e não encontrada |

**Verificação da direção de dependências:** esta feature altera apenas `apps/web`. Ela importa
contratos de `packages/shared` e funções/estado expostos por F01/F02 conforme necessário, mas
nenhum pacote de domínio importa `apps/web`. A direção `shared ← data ← rules ← engine ← ai` de
`docs/arquitetura.md` §2 permanece intacta.

Esta feature **não toca `packages/engine`**: não produz estado de duelo, não usa PRNG, não altera
`atk`/`def` base e não participa de serialização/replay. Também não toca `packages/data` nem
`packages/rules`; o acesso ao índice vem pelos contratos já definidos por F01.

Portões de fronteira:

- Nenhum arquivo de F05 importa Supabase, IndexedDB, `fetch`, `node:fs`, `cards-data/` ou
  resolvedor de artes.
- Nenhum arquivo de F05 executa `insert`, `update`, `upsert` ou `delete` sobre `collections`.
- Nenhum arquivo de F05 consulta tabelas de fusão, drop, guardião ou terreno.
- Nenhum componente da carta bloqueada recebe ou renderiza `entrada.carta`.

## 3. Design Técnico

### Estruturas de dados

F05 **não cria estrutura de domínio nova**. Ela consome as estruturas de F01:

| Estrutura | Origem | Uso em F05 |
|---|---|---|
| `EntradaLibrary` | `library`/F01 | Define se o detalhe é completo (`obtida: true`) ou bloqueado (`obtida: false`) |
| `IndiceLibrary` | `library`/F01 | Fonte do lookup por `numero` via `buscarEntrada` |
| `ReferenciaArte` | `library`/F01 | Decide entre arte, placeholder e silhueta sem montar caminho localmente |
| `EstadoLibrary` / `LibraryCarregada` | `library`/F01 | Estados carregando/pronta/falha usados pela rota |
| `NumeroCarta` | `banco-de-cartas`/F01, via `shared` | Parâmetro canônico da rota `/library/[numero]` |

Estados locais da rota:

| Estado | Condição | Render |
|---|---|---|
| `carregando` | F01 ainda está carregando | Esqueleto compacto do detalhe, com a mesma área principal da tela final |
| `falha_catalogo` | F01 devolve `catalogo_indisponivel` | Mensagem de falha de cartas e ação de recarregar |
| `falha_colecao` | F01 devolve `colecao_indisponivel` ou `sessao_ausente` | Mensagem de falha da coleção/login e ação de recarregar |
| `nao_encontrada` | `numero` inválido ou ausente do índice | Estado de carta não encontrada e retorno à grade |
| `obtida` | `buscarEntrada` devolve entrada com `obtida: true` | Detalhe completo |
| `bloqueada` | `buscarEntrada` devolve entrada com `obtida: false` | Estado bloqueado |

### Fluxo

1. O jogador ativa uma célula da grade de F02 ou abre diretamente `/library/[numero]`.
2. A página do detalhe monta `detalhe-carta-cliente`, que consome `useLibrary` de F01. Enquanto o
   índice não está pronto, o esqueleto é exibido.
3. Se F01 falhar ao carregar catálogo ou coleção, F05 mostra a mesma família de mensagens definida
   por F01/F02 e não renderiza detalhe parcial.
4. Com o índice pronto, o `numero` da rota é validado como número canônico de carta. Valor inválido
   ou não encontrado no índice vira estado `nao_encontrada`.
5. Entrada obtida renderiza arte em destaque e blocos de informação: identificação, combate,
   Guardiões Estelares e liberação.
6. Entrada bloqueada renderiza apenas silhueta, `numero` e `Carta ainda não obtida`.
7. A ação de retorno leva o jogador de volta à Library. Se a URL de origem continha query params,
   eles são preservados; caso contrário, o destino é `/library`.

### Regras de negócio

- **Carta obtida mostra os campos canônicos**, sem inventar campo novo e sem ler dados fora de
  `entrada.carta`. — PRD §6 F05 Capabilities; product.md schema de carta
- **ATK/DEF vazios são ocultados.** Para cartas sem valores de combate, o bloco de combate não
  renderiza linhas vazias. — PRD §6 F05 Capabilities
- **Guardiões vazios também não viram linhas em branco.** Quando `guardiao1`/`guardiao2` existem,
  são exibidos como rótulos; quando ambos são vazios, o bloco é omitido. — Decisão 5
- **Senha e estrelas são consulta, não compra.** A senha aparece; copiar e qualquer liberação por
  Password ficam fora do Core. — PRD §7
- **Carta bloqueada não revela atributos.** A UI não recebe `carta`; só `numero` e `arte` de
  silhueta. — spec `library/F01` Decisão 2
- **Nenhum cálculo de regra.** `guardiao1` e `guardiao2` não disparam vantagem/desvantagem;
  `classe` não consulta terreno; `atk`/`def` não são modificados. — PRD §7; `docs/arquitetura.md`
  §4.3
- **Retorno não muda a coleção.** F05 não tem mutação nem fila offline. — PRD §7; ADR-005

### Responsividade e Acessibilidade

- Em telas pequenas, o detalhe ocupa a página inteira; em telas largas, o mesmo conteúdo pode ser
  exibido na rota interceptada como painel/modal sobre a grade, conforme F02.
- A arte mantém proporção estável para evitar deslocamento de layout; textos longos quebram ou
  truncam dentro do contêiner, sem scroll horizontal de 320 px a 1920 px.
- A ação de retorno tem alvo de toque ≥ 44 px, foco visível e nome acessível.
- O detalhe usa títulos e listas semânticas para que leitor de tela percorra os blocos de dados.
- O estado bloqueado não depende só de cor: silhueta, `numero` e texto explícito comunicam a
  condição.
- Feedback visual respeita `prefers-reduced-motion`.

### Determinismo e pureza

Não se aplica a `packages/engine`. As garantias relevantes são de fronteira:

- Os componentes são funções dos contratos recebidos de F01 e da rota.
- Nenhum componente lê relógio, sorteia, consulta banco ou resolve arte por conta própria.
- A mesma `EntradaLibrary` produz a mesma apresentação, permitindo testes determinísticos com
  fixtures em memória.

## 4. Contratos

F05 não acrescenta schemas zod em `packages/shared`; consome os contratos de F01. Os contratos
novos são de rota e de componentes.

### Contratos consumidos

- `useLibrary(): EstadoLibrary` — a ser fornecido por `library`/F01.
- `buscarEntrada(indice, numero): EntradaLibrary | undefined` — a ser fornecido por
  `library`/F01.
- `EntradaLibrary` — união discriminada por `obtida`, em que a variante bloqueada não possui
  `carta`.
- `ReferenciaArte` — arte resolvida, placeholder ou silhueta, também de F01.

### Contrato de rota

| Rota | Entrada | Comportamento |
|---|---|---|
| `/library/[numero]` | `numero` canônico de 3 dígitos | Página cheia do detalhe; carrega F01 e renderiza detalhe completo, bloqueado ou não encontrado |
| `/library/@modal/(.)[numero]` | mesmo `numero` | Variante interceptada sobre a grade; usa o mesmo conteúdo e os mesmos estados |

Query params existentes são preservados apenas no link de retorno. F05 Core não interpreta termo
de busca, filtros, status ou ordenação.

### Propriedades dos componentes

```
DetalheCartaCliente({ numero, destinoVoltar })
  // resolve o estado da Library, busca a entrada por numero e escolhe o estado renderizado

DetalheCarta({ entrada, destinoVoltar })
  // entrada: EntradaLibrary com obtida true
  // renderiza arte, identificação, combate, Guardiões e liberação

DetalheCartaBloqueada({ numero, arte, destinoVoltar })
  // renderiza silhueta, numero e "Carta ainda não obtida"
  // não recebe Carta, nome, tipo, classe, atributos, guardiões, senha ou estrelas

ArteDetalheCarta({ arte, rotulo })
  // renderiza arte, placeholder ou silhueta com proporção fixa

AcaoVoltarLibrary({ destinoVoltar })
  // retorna para a grade sem mutar estado
```

### Exemplos JSON

Entrada obtida consumida pelo detalhe:

```json
{
  "numero": "001",
  "obtida": true,
  "carta": {
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
  },
  "arte": { "tipo": "placeholder" }
}
```

Entrada bloqueada consumida pelo detalhe:

```json
{
  "numero": "380",
  "obtida": false,
  "arte": { "tipo": "silhueta" }
}
```

Estado de rota inexistente:

```json
{
  "numero": "999",
  "estado": "nao_encontrada",
  "mensagem": "Carta não encontrada."
}
```

### Contratos externos (cross-PRD)

- **Banco de Cartas (`banco-de-cartas`/F03 e F04).** Fornece catálogo canônico e arte por
  intermédio de F01. F05 nunca acessa o pacote diretamente.
- **Build Deck (`build-deck`/F01) e Save/Auth.** Fornecem leitura da coleção por intermédio de F01.
  F05 nunca escreve no trunk nem lê quantidade de cópias.
- **Password.** Consome a senha que o jogador lê na tela, mas não há chamada direta daqui para o
  Password no Core Scope.
- **Campanha/Free Duel.** Quando concedem carta e F01 recarrega a coleção, a entrada deixa de ser
  bloqueada e F05 passa a mostrar o detalhe completo. F05 não recebe evento direto desses módulos.

## 5. Modelo de Dados

### Postgres / Supabase

Nenhuma tabela, coluna, índice, constraint, policy RLS ou migração nova. F05 lê a coleção apenas
por meio de F01, que por sua vez herda a tabela `collections` de `build-deck`/F01 e o modelo de
RLS descrito em `docs/arquitetura.md` §5.1.

Consequências:

- A Library continua somente-leitura. Não há política de escrita, RPC nem ledger nesta feature.
- `quantity` não aparece na tela; posse é o booleano derivado por F01.
- A exibição da senha não debita estrelas nem cria registro em `password_releases`.

### Cache local / fila offline

Nenhum store IndexedDB novo e nenhuma fila de mutação. O detalhe usa o mesmo resultado de
`useLibrary` que F02 já consome. Se F01 carregar a coleção do cache, F05 mostra o detalhe com esse
snapshot e mantém o aviso/mensagem de procedência definido pela tela da Library.

### Arquivos de dados versionados

Nenhum arquivo de dados novo. F05 consome o bundle versionado do Banco de Cartas indiretamente por
F01 e não lê `cards-data/` nem `arts-manifest.json` diretamente. Tabelas de fusão, drops,
guardião e terreno não são consumidas.

## 6. Tratamento de Erros e Casos de Borda

| Cenário | Detecção | Comportamento | Mensagem ao jogador |
|---------|----------|---------------|---------------------|
| Carregamento em andamento | `useLibrary` em `carregando` | Esqueleto do detalhe; nenhum campo parcial é exibido | — |
| Falha ao carregar catálogo | `catalogo_indisponivel` de F01 | Estado de falha; detalhe não renderiza dados parciais | `Não foi possível carregar as cartas. Tente novamente.` |
| Falha ao carregar coleção | `colecao_indisponivel` de F01 | Estado de falha; nenhuma carta é assumida como obtida | `Não foi possível carregar sua coleção. Tente novamente.` |
| Sem sessão autenticada | `sessao_ausente` de F01 | Estado de falha de coleção/login | `Faça login para ver sua coleção.` |
| Coleção vinda do cache | `origemColecao === 'cache'` | Detalhe renderiza o snapshot em cache e mantém aviso de possível desatualização | `Coleção carregada do cache; algumas cartas podem estar desatualizadas.` |
| `numero` da URL inválido | Validação do parâmetro | Estado de carta não encontrada, com retorno à grade | `Carta não encontrada.` |
| `numero` válido ausente do índice | `buscarEntrada` retorna `undefined` | Estado de carta não encontrada, sem criar entrada falsa | `Carta não encontrada.` |
| Carta obtida sem arquivo de arte | `arte.tipo === 'placeholder'` | Placeholder em destaque; demais campos continuam visíveis | — |
| Imagem falha ao carregar no navegador | Evento de erro visual | Cai para placeholder sem quebrar o detalhe | — |
| Carta não obtida | `entrada.obtida === false` | Estado bloqueado; só silhueta, `numero` e mensagem | `Carta ainda não obtida.` |
| ATK/DEF vazios | Campo vazio no schema canônico | Linhas de combate omitidas; nenhum campo em branco aparece | — |
| Guardiões vazios | `guardiao1` e/ou `guardiao2` vazios | Rótulos vazios são omitidos; guardiões existentes continuam visíveis | — |
| Senha vazia ou inválida no dataset | Valor vindo do catálogo canônico | Exibe estado de dado indisponível sem inventar senha; a correção é do Banco de Cartas | `Senha indisponível.` |
| Estrelas vazias ou inválidas no dataset | Valor vindo do catálogo canônico | Exibe estado de dado indisponível sem calcular preço | `Preço indisponível.` |
| Rota modal fechada | Ação de voltar/fechar | Retorna à grade preservando query params | — |
| Retorno sem histórico navegável | Link explícito | Vai para `/library` | — |
| Full Scope solicitado implicitamente por critério do PRD | Critério de cópia ou anterior/próxima | Marcado como adiado; não há botão nem setas no Core | — |
| Tabelas de fusão/drop/terreno/guardião ausentes | Não consumidas | Nenhuma seção de fusão, drop, terreno ou cálculo aparece | — |

## 7. Estratégia de Testes

### Unitários / Componentes (Vitest + Testing Library)

`DetalheCarta`:
- `DetalheCarta exibe arte nome numero classe tipo password e estrelas para carta obtida`
- `DetalheCarta exibe atk e def quando os valores existem`
- `DetalheCarta oculta atk e def quando os valores estao vazios`
- `DetalheCarta exibe guardiao1 e guardiao2 como rotulos quando existem`
- `DetalheCarta omite o bloco de guardioes quando ambos estao vazios`
- `DetalheCarta nao calcula vantagem ou desvantagem de guardioes`
- `DetalheCarta nao exibe fusoes drops ou bonus de terreno`
- `DetalheCarta exibe placeholder quando a referencia de arte e placeholder`
- `DetalheCarta exibe a senha como texto mas nao renderiza acao de copiar`
- `DetalheCarta nao exibe quantidade de copias da colecao`

`DetalheCartaBloqueada`:
- `DetalheCartaBloqueada exibe silhueta numero e mensagem de carta ainda nao obtida`
- `DetalheCartaBloqueada nao expoe nome classe tipo atk def guardioes password ou estrelas`
- `DetalheCartaBloqueada nao recebe nem renderiza entrada carta`
- `DetalheCartaBloqueada oferece retorno para a grade`

`AcaoVoltarLibrary`:
- `AcaoVoltarLibrary retorna para library quando nao ha query params`
- `AcaoVoltarLibrary preserva query params no retorno quando eles existem`
- `AcaoVoltarLibrary possui nome acessivel e foco visivel`

`DetalheCartaCliente`:
- `DetalheCartaCliente exibe esqueleto enquanto useLibrary carrega`
- `DetalheCartaCliente exibe falha de catalogo sem renderizar detalhe`
- `DetalheCartaCliente exibe falha de colecao sem assumir carta obtida`
- `DetalheCartaCliente exibe login necessario quando a sessao esta ausente`
- `DetalheCartaCliente busca a entrada pelo numero da rota`
- `DetalheCartaCliente exibe carta nao encontrada para numero invalido`
- `DetalheCartaCliente exibe carta nao encontrada para numero ausente do indice`
- `DetalheCartaCliente renderiza detalhe completo para entrada obtida`
- `DetalheCartaCliente renderiza estado bloqueado para entrada nao obtida`

### Property-based (fast-check)

Não aplicável nesta feature. F05 não introduz transformação determinística de domínio, round-trip
de serialização, PRNG ou regra pura nova. As propriedades de redação e contagem da carta bloqueada
já pertencem a F01.

### Integração

- `rota /library/[numero] renderiza detalhe completo para carta obtida do indice carregado`
- `rota /library/[numero] renderiza estado bloqueado para carta nao obtida do indice carregado`
- `rota /library/[numero] renderiza carta nao encontrada para numero fora do catalogo`
- `rota modal interceptada usa o mesmo conteudo da pagina cheia`
- `retorno do detalhe preserva parametros de busca e filtros na URL`
- `detalhe nao emite escrita em collections ao montar, voltar ou recarregar`
- `detalhe reflete carta liberada por Password apos F01 recarregar a colecao`
- `detalhe reflete carta concedida por Campanha ou Free Duel apos F01 recarregar a colecao`

### Análise estática

- Nenhum arquivo de F05 importa Supabase, IndexedDB, `fetch`, `node:fs`, `cards-data/` ou
  resolvedor de artes.
- Nenhum arquivo de F05 executa escrita em `collections`, `wallets`, `password_releases` ou
  qualquer RPC de economia.
- Nenhum arquivo de F05 importa `packages/engine`, `packages/ai` ou `apps/server`.
- Nenhum arquivo de F05 referencia tabelas de fusão, drops, terreno ou matriz de guardiões.
- Nenhum componente bloqueado acessa `entrada.carta`.
- Nenhum botão ou item de UI de copiar senha/anterior/próxima aparece no Core Scope.
- `tsc --noEmit` passa com o baseline strict das guidelines §6.1.

### Verificação manual

jsdom não cobre layout real. O roteiro manual deve ser registrado quando o detalhe for alterado:

- Em 320, 375, 768, 1024, 1440 e 1920 px: sem scroll horizontal, retorno acessível e blocos de
  dados sem sobreposição.
- Em mobile: detalhe ocupa página inteira e a arte não empurra ações essenciais para fora do
  fluxo.
- Em desktop: variante interceptada abre sobre a grade, fecha/volta para a grade e preserva a
  rolagem.
- Com nomes e senhas longas: texto quebra/trunca sem vazar do contêiner.
- Com leitor de tela: blocos são anunciados em ordem lógica e a carta bloqueada não anuncia dados
  ocultos.

### Testes de aceitação (critérios do PRD)

| Critério (PRD §9, F05) | Teste |
|---|---|
| Para uma carta obtida, a tela exibe arte/placeholder, `nome`, `numero`, `classe`, `tipo`, `atk`, `def`, `guardiao1`, `guardiao2`, `password` e `estrelas` | `DetalheCarta exibe arte nome numero classe tipo password e estrelas para carta obtida` + `DetalheCarta exibe atk e def quando os valores existem` + `DetalheCarta exibe guardiao1 e guardiao2 como rotulos quando existem` |
| ATK/DEF vazios são ocultados, sem campos em branco | `DetalheCarta oculta atk e def quando os valores estao vazios` |
| Guardiões são exibidos apenas como rótulos, sem cálculo | `DetalheCarta exibe guardiao1 e guardiao2 como rotulos quando existem` + `DetalheCarta nao calcula vantagem ou desvantagem de guardioes` |
| A senha é exibida e a ação de copiar mostra `Senha copiada` | `DetalheCarta exibe a senha como texto mas nao renderiza acao de copiar`; a ação de copiar e o feedback ficam **adiados** por Auto-Aceite, pois pertencem ao Full Scope |
| Uma carta não obtida exibe estado bloqueado sem revelar campos | `DetalheCartaBloqueada exibe silhueta numero e mensagem de carta ainda nao obtida` + `DetalheCartaBloqueada nao expoe nome classe tipo atk def guardioes password ou estrelas` |
| Navegação anterior/próxima percorre a sequência atual da grade | **Adiado** por Auto-Aceite, pois pertence ao Full Scope |
| Fusões, drops e bônus de terreno não são exibidos nesta versão | `DetalheCarta nao exibe fusoes drops ou bonus de terreno` + análise estática sem imports de tabelas pendentes |

### Testes de integração cross-feature e cross-PRD

| Critério (PRD §9) | Teste |
|---|---|
| Cross-Feature: cartas obtidas em F01 aparecem na grade de F02 e abrem detalhe completo em F05 | `rota /library/[numero] renderiza detalhe completo para carta obtida do indice carregado` |
| Cross-Feature: busca e filtros/ordenação de F03/F04 refletem-se na sequência anterior/próxima de F05 | **Adiado** por Auto-Aceite junto da navegação anterior/próxima; o Core preserva query params no retorno com `retorno do detalhe preserva parametros de busca e filtros na URL` |
| Cross-Feature: filtro de status de F04 faz células bloqueadas aparecerem em F02, e elas mostram apenas estado bloqueado em F05 | `rota /library/[numero] renderiza estado bloqueado para carta nao obtida do indice carregado` + `DetalheCartaBloqueada nao expoe nome classe tipo atk def guardioes password ou estrelas` |
| Cross-Feature: indicador de progresso de F02 muda quando a coleção muda | Sem responsabilidade direta de F05; coberto por F01/F02. F05 apenas reflete a entrada após recarregamento |
| Cross-PRD: Password libera carta e ela consta como obtida na Library após recarregar | `detalhe reflete carta liberada por Password apos F01 recarregar a colecao` |
| Cross-PRD: Campanha/Free Duel concedem carta e ela aparece na próxima abertura da Library | `detalhe reflete carta concedida por Campanha ou Free Duel apos F01 recarregar a colecao` |
| Cross-PRD: Library nunca modifica estado de coleção mantido por Save/Password/Campanha | `detalhe nao emite escrita em collections ao montar, voltar ou recarregar` + análise estática sem operações de escrita |
| Cross-PRD: Library e Build Deck consomem o mesmo banco de cartas, exibindo `atk`/`def`/`classe`/`guardiões` de forma consistente | `DetalheCarta exibe arte nome numero classe tipo password e estrelas para carta obtida` usando fixture de `EntradaLibrary`; análise estática impede leitura alternativa de `cards-data/` |
