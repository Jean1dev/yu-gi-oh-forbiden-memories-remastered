# Plano de Implementação — Grade da Coleção

> Spec: `./spec.md`

## Pré-requisitos

- **`library`/F01 — Acesso à Coleção do Jogador.** Dependência interna direta, da wave anterior.
  Tem spec em `docs/specs/library/F01-acesso-a-colecao-do-jogador/`, ainda sem implementação.
  Fornece o índice das cartas do jogo com status de posse, o par de contagens do indicador, a
  referência de arte já resolvida por carta e o adaptador React que expõe carregando, pronta,
  falha e a ação de recarregar. F02 não funciona sem ela e não reimplementa nada do que ela faz.
- **Contratos externos herdados de F01** — serviço de catálogo e resolução de artes
  (`banco-de-cartas`/F03 e F04), coleção do jogador (`build-deck`/F01) e Auth/Cadastro. F02 não
  fala com nenhum deles diretamente; todos chegam encapsulados pelo carregamento de F01.
- **Scaffolding do monorepo e pacotes `rules` e `web`**, de `banco-de-cartas`/F01 e
  `build-deck`/F01. Esta feature acrescenta a eles a configuração de teste de componente.
- **Novas dependências de desenvolvimento:** biblioteca de teste de componentes React e seus
  matchers de DOM, sobre o runner já travado. Nenhuma dependência de execução é adicionada, e
  nenhuma entra em conflito com ADR aceito.
- **Lacuna de cobertura assumida:** os critérios de responsividade de 320 px a 1920 px e de tempo
  de carga com as 722 cartas **não terão teste automatizado**, por decisão de ferramenta. Ficam
  cobertos pelo roteiro de verificação manual descrito na spec, que precisa ser executado e
  registrado a cada mudança na grade ou na célula.
- **Assets pendentes:** o desenho do placeholder de arte ausente e o da silhueta de carta não
  obtida seguem em aberto na direção de arte. A implementação usa marcadores neutros no lugar
  deles; a troca posterior não altera estrutura nem contrato.
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é consumida.

## Fase 1: Recorte por status

**1. Recorte de posse em `rules`** — Implementar, ao lado do subsistema Library já existente, o
recorte que seleciona apenas as cartas obtidas preservando a ordem recebida. É o padrão que a
grade aplica e a base que o filtro de status vai generalizar na wave seguinte, e fica no pacote de
regras para que a interface não decida posse.

## Fase 2: Rota e máquina de estados da tela

**2. Rota da Library** — Criar a rota da grade como app shell servido estaticamente, montando a
fronteira de cliente onde os dados do jogador entram. Nada é pré-renderizado no servidor, porque
tudo depende da conta autenticada e do armazenamento local.

**3. Mensagens da tela** — Centralizar o mapeamento de cada código de falha para o texto exibido
ao jogador num único módulo, para que as demais features do módulo reusem a mesma redação e uma
mudança de texto seja um só ponto.

**4. Máquina de estados** — Implementar a fronteira de cliente que consome o carregamento de F01 e
decide entre esqueleto, falha de catálogo, falha de coleção, coleção vazia e grade pronta. Falha de
catálogo não monta a grade; falha de coleção não exibe nenhuma carta como obtida.

**5. Estados auxiliares** — Construir o esqueleto de carregamento com a mesma métrica de célula da
grade, o estado vazio com a mensagem do PRD, os estados de falha com ação de recarregar e o aviso
de coleção vinda do armazenamento local, com o carimbo de quando ela veio do servidor.

## Fase 3: Grade e célula

**6. Indicador de progresso** — Exibir a contagem de cartas obtidas sobre o total do jogo no topo
do módulo, com o total vindo do índice e nunca de um número escrito no código, e anunciando a
mudança quando uma releitura traz cartas novas.

**7. Imagem da carta** — Implementar o componente de arte com proporção declarada de antemão,
carregamento preguiçoso e decodificação assíncrona, cobrindo as três situações possíveis de
imagem: arte resolvida, ausência de arquivo e carta bloqueada. Falha de carregamento no navegador
cai na mesma representação de ausência.

**8. Célula da carta** — Construir a célula única que serve às duas variantes de entrada. A
variante obtida mostra arte, nome, número e o rótulo de tipo e classe; a bloqueada mostra silhueta,
número e a marca de conteúdo oculto, sem qualquer atributo da carta — que ela nem carrega. A célula
inteira é o link para o detalhe, nos dois casos.

**9. Forma compacta e alvo de toque** — Fazer a célula reagir ao espaço que ela própria recebeu,
assumindo a forma compacta quando estreita, com nome truncado sem estourar a largura, alvo de toque
adequado em qualquer tamanho e destaque idêntico para ponteiro e teclado.

**10. Grade fluida** — Montar a grade como lista semântica cujas colunas se acomodam ao espaço
disponível, sem lista de pontos de quebra e sem largura fixa em pixel, renderizando exatamente a
sequência recebida, sem filtrar nem reordenar. É este contrato que a busca e os filtros vão
preencher depois sem reescrever a grade.

**11. Fluidez com o catálogo inteiro** — Aplicar por célula a dispensa de layout e pintura fora da
área visível, com o tamanho estimado declarado para manter a barra de rolagem correta. Nenhuma
medição de contêiner, nenhum índice de janela: rolagem, foco, busca do navegador e leitura de tela
permanecem os nativos.

## Fase 4: Navegação para o detalhe

**12. Rota do detalhe** — Criar a rota que recebe o número da carta e será preenchida por F05,
mais a variante interceptada que a apresenta sobre a grade em telas largas, preservando a posição
de rolagem. Em telas pequenas o destino é a página cheia.

**13. Verificação de fronteira e de acessibilidade** — Acrescentar aos verificadores estáticos as
regras que impedem os componentes de alcançar banco, armazenamento ou rede, de derivar posse ou
contagem por conta própria, de escrever o total do jogo como literal e de declarar largura fixa na
trilha da grade. Executar e registrar o roteiro manual de responsividade e de carga que cobre os
dois critérios sem teste automatizado.
