# Plano de Implementação — Navegação e Filtro da Coleção

> Spec: `./spec.md`

## Pré-requisitos

- **`build-deck`/F01 — Coleção do Jogador (Baú).** Dependência interna direta, da wave anterior.
  Tem spec em `docs/specs/build-deck/F01-colecao-do-jogador-bau/`, ainda sem implementação.
  Fornece o carregamento da coleção, o enriquecimento com os dados do catálogo e o teto de cópias
  por carta. F04 não funciona sem ela e não reimplementa nada do que ela faz.
- **Contratos externos herdados de F01** — serviço de catálogo (`banco-de-cartas`/F03) e Auth/
  Cadastro. F04 não fala com nenhum deles diretamente; ambos chegam encapsulados por `useColecao`.
- **Contrato interno ainda não formalizado — quantidade no deck ativo.** Nenhuma feature deste
  lote ou de waves anteriores produz esse dado; F02 (semeadura do deck inicial), F05 (rascunho em
  edição) e F07 (deck persistido) são quem eventualmente vão fornecê-lo, e nenhuma delas tem
  implementação ainda. A implementação usa uma leitura injetada e cai num comportamento neutro de
  zero cópias para toda carta enquanto essa leitura real não existir, conforme a spec — nunca um
  valor inventado.
- **Scaffolding do monorepo e pacotes `rules`/`web`**, de `banco-de-cartas`/F01 e `build-deck`/F01.
  A configuração de teste de componente (`@testing-library/react`, jsdom) já foi introduzida por
  `library`/F02 e é reaproveitada sem nova devDependency.
- **Lacuna de cobertura assumida:** os critérios de responsividade de 320 px a 1920 px e a
  percepção de fluidez da busca **não têm teste automatizado**, por decisão de ferramenta (jsdom
  não faz layout). Ficam cobertos pelo roteiro de verificação manual descrito na spec, executado e
  registrado a cada mudança no painel ou no item.
- **Limitação herdada de F01:** `useColecao` não expõe recarregamento explícito, então uma carta
  creditada por F03 só aparece no painel ao reabrir a rota `/build-deck` — documentado na spec
  como decisão a confirmar quando F01 evoluir.
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é consumida por esta feature.

## Fase 1: Contratos e regra pura

**1. Contrato de quantidade no deck em `shared`** — Declarar a interface mínima pela qual o painel
lê quantas cópias de uma carta estão no deck, e o tipo do item já composto com esse dado, mantendo
os dois desacoplados de qualquer implementação concreta ainda inexistente.

**2. Busca por nome em `rules`** — Implementar o filtro puro de itens da coleção por substring do
nome, case-insensitive, preservando a ordem recebida, ao lado do subsistema de coleção que F01 já
criou.

**3. Composição com a quantidade no deck em `rules`** — Implementar a função pura que anexa a
quantidade no deck e a marca de limite atingido a cada item, usando o teto de cópias já calculado
por F01 em vez de reimplementá-lo.

## Fase 2: Rota e máquina de estados da tela

**4. Rota do Build Deck** — Criar a rota `/build-deck` como app shell servido estaticamente,
montando a fronteira de cliente onde o carregamento da coleção entra. É a primeira rota do módulo;
as features seguintes constroem sobre ela.

**5. Mensagens da tela** — Centralizar o mapeamento de cada código de erro e de cada estado sem
dado (vazio, sem resultado de busca) para o texto exibido ao jogador, reaproveitando a redação já
usada por F01 e por `library`/F02 para as mesmas situações.

**6. Leitura neutra da quantidade no deck** — Construir a implementação-fallback que devolve zero
cópias para qualquer carta, usada até que F02/F05/F07 substituam por uma leitura real do deck
ativo, sem alterar o contrato consumido pelo painel.

**7. Máquina de estados** — Implementar a fronteira de cliente que consome o carregamento da
coleção (F01) e decide entre esqueleto, falha, coleção vazia e painel pronto, incluindo o aviso
quando a coleção vier do cache local.

## Fase 3: Painel, busca e seleção

**8. Hook do painel** — Implementar o adaptador fino que combina a coleção carregada, a composição
com a quantidade no deck, o termo de busca e a seleção atual, expondo os itens já prontos para
renderização e as duas ações que o consumidor aciona (mudar o termo, selecionar uma carta).

**9. Campo de busca** — Construir o campo de texto controlado que atualiza o termo a cada tecla,
sem debounce, e que é ocultado quando a coleção está vazia.

**10. Item da carta** — Construir o item que mostra arte, nome, classe, tipo, ATK/DEF, quantidade
possuída, quantidade no deck e a marca de limite atingido, reagindo a seleção e ativação por
teclado e ponteiro com o mesmo tratamento de destaque.

**11. Painel fluido** — Montar o painel como lista que reflui sem scroll horizontal de 320 px a
1920 px, aplicando a mesma técnica de dispensa de layout fora da área visível que `library`/F02 já
validou, e resolvendo os estados de coleção vazia e de busca sem resultado.

## Fase 4: Fronteira e verificação

**12. Verificação de fronteira** — Acrescentar aos verificadores estáticos as regras que impedem
os arquivos desta feature de escrever em `collections` ou `active_decks`, de reimplementar o teto
de cópias ou o predicado de posse, e de declarar largura fixa na trilha responsiva do painel.

**13. Verificação manual** — Executar e registrar o roteiro de responsividade nas larguras de
referência e a checagem de percepção de fluidez da busca sob condições representativas de rede e
CPU, cobrindo os dois critérios sem teste automatizado.
