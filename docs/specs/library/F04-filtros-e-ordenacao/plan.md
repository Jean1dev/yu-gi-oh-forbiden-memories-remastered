# Plano de Implementação — Filtros e Ordenação

> Spec: `./spec.md`

## Pré-requisitos

- **`library`/F02 — Grade da Coleção.** Dependência interna direta e precedente. Fornece a rota
  `/library`, a fronteira de cliente, `GradeColecao`, células bloqueadas e o contrato de que a
  grade renderiza a sequência recebida sem filtrar nem ordenar.
- **`library`/F01 — Acesso à Coleção do Jogador.** Dependência interna indireta via F02. Fornece
  `IndiceLibrary`, `EntradaLibrary` e a redação estrutural das cartas não obtidas.
- **Contrato interno paralelo — `library`/F03.** F04 assume que a busca fornecerá, pelo subsistema
  `rules`, um predicado puro sobre `EntradaLibrary`, ou ficará ausente até F03 existir. O pipeline
  de F04 deve funcionar nos dois cenários.
- **Contrato interno paralelo — `library`/F05.** F04 deve entregar a sequência final para que a
  navegação anterior/próxima percorra exatamente a mesma ordem exibida na grade.
- **Contratos cross-PRD herdados de F01:** catálogo e artes de `banco-de-cartas`, coleção do
  jogador de `build-deck` e sessão de Auth/Cadastro. F04 não acessa esses módulos diretamente.
- **Premissa a confirmar:** filtros de tipo não classificam cartas bloqueadas, porque F01 remove
  `carta.tipo` das entradas não obtidas para impedir vazamento de atributos.
- **Premissa a confirmar:** `ritual` não recebe filtro dedicado nesta feature, pois o PRD F04 não
  lista esse valor; cartas ritual seguem visíveis em tipo=todos.
- **Sem pendência de dado externo.** Guardiões, terreno, fusões, drops, rating e balanceamento não
  são consumidos.

## Fase 1: Contratos e estado de URL

**1. Contratos compartilhados de filtros** — Definir em `shared` os tipos e schemas do estado de
filtros, status, seleção de tipos, ordenação e resultado da consulta. Reusar `EntradaLibrary` e os
contratos precedentes sem redefinir carta, coleção ou progresso; o predicado de busca vem do
contrato público de F03 em `rules`.

**2. Fronteira de query params** — Criar o parse e a serialização canônica dos parâmetros da
Library, com defaults seguros, descarte de valores inválidos e preservação dos parâmetros de F03.
O estado normalizado da URL passa a ser a fonte de verdade dos filtros dentro da rota.

**3. Hook de filtros da Library** — Expor à fronteira de cliente um adaptador fino para ler e
atualizar os filtros na URL. Esse hook não consulta dados da coleção e não executa regra de
filtragem; ele apenas traduz interação em estado validado.

## Fase 2: Consulta pura em `rules`

**4. Filtro de status** — Generalizar o recorte de posse criado por F02 para os três status do
PRD, mantendo a ordem relativa da sequência recebida e preservando o contrato antigo de
`somenteObtidas`.

**5. Filtro por tipo** — Implementar a seleção de tipos com semântica OU dentro do grupo e tipo
todos quando a seleção estiver vazia. A regra deve tratar cartas bloqueadas como sem tipo público,
mantendo a redação definida por F01.

**6. Ordenação** — Implementar os comparadores por número, nome, ATK, DEF e estrelas, com direção
crescente/decrescente, valores ausentes no fim e desempate estável por número. A regra não deve
mutar a sequência recebida nem buscar dados fora da entrada.

**7. Pipeline de consulta** — Compor status, tipo, busca opcional e ordenação em uma única função
pública que devolve a sequência final e as contagens de consulta. O predicado de busca deve ser
opcional para permitir que F04 rode antes de F03.

## Fase 3: Controles na Library

**8. Barra de filtros** — Inserir acima da grade uma barra de controles que funcione no layout
existente de F02, sem envolver a página em uma nova estrutura de card. Em mobile, a mesma superfície
de controles deve ficar recolhível pela ação "Filtros".

**9. Controles de status e tipo** — Construir controles acessíveis para status exclusivo e
multiseleção de tipos, refletindo o estado atual da URL e aplicando mudanças imediatamente.
Selecionar ou limpar tipos deve manter os demais filtros e a busca.

**10. Controle de ordenação** — Construir a seleção de campo e a alternância de direção, com nome
acessível para a direção atual e atualização imediata da URL. A escolha precisa sobreviver à ida e
volta do detalhe.

**11. Limpar filtros e sem resultados** — Implementar a ação que restaura apenas os filtros de
F04 para o padrão e preserva a busca. Adicionar o estado de nenhum resultado por filtros, distinto
do estado de coleção vazia e da mensagem de busca de F03.

## Fase 4: Integração com grade e navegação

**12. Fronteira de cliente da Library** — Alterar `LibraryCliente` para aplicar o pipeline de F04
sobre `indice.entradas` antes de chamar `GradeColecao`. Estados de carregamento e erro de F01/F02
continuam prevalecendo sobre os controles.

**13. Sequência para o detalhe** — Garantir que a rota de detalhe preserve os query params e que a
sequência filtrada/ordenada seja a mesma superfície consumida por F05 para anterior/próxima. Cartas
bloqueadas continuam abrindo somente o detalhe bloqueado.

**14. Portões de qualidade** — Acrescentar os testes e verificadores estáticos que protegem a
pureza de `rules`, a validação dos query params, a ausência de escrita em coleção, a preservação da
redação das bloqueadas e a integração da sequência final com a grade.
