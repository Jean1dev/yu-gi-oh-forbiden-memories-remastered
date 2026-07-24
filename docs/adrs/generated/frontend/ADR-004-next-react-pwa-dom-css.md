# ADR-004: Next.js, React e PWA para a experiencia web
**Status:** Aceito
**Data:** 24-07-2026
**ADRs Relacionados:** ADR-001, ADR-002, ADR-003, ADR-005, ADR-009

## 1. Contexto e Declaracao do Problema

O produto precisa ser uma recriacao web jogavel offline e
online, responsiva de telas pequenas a desktop. Os PRDs de
Library, Build Deck, Password e Free Duel descrevem fluxos
de interface ricos, mas que dependem de dados e motor
desacoplados. A UI deve organizar interacoes, renderizar
cartas e estado, e preservar a experiencia offline, sem se
tornar fonte de regra.

A arquitetura trava Next.js com App Router, React e PWA. O
tabuleiro sera renderizado com DOM/CSS, pois o produto e um
jogo de cartas com forte interface de informacao, e nao um
jogo que exige uma engine visual dedicada. A aplicacao web
consome o motor localmente para partidas offline e usa cache
para shell, cartas e artes.

## 2. Direcionadores de Decisao

- A experiencia precisa funcionar de 320 px a 1920 px sem
  scroll horizontal indevido.
- O jogo precisa carregar app shell, cartas e artes para uso
  offline.
- Telas de catalogo e deck precisam lidar com centenas de
  cartas sem perder fluidez.
- A UI deve refletir o estado do motor, nao implementar
  regras.
- O menu e as telas fora do duelo se beneficiam de
  renderizacao web convencional.

## 3. Opcoes Consideradas

1. Next.js App Router, React, PWA e tabuleiro em DOM/CSS.
2. SPA sem framework de roteamento full-stack.
3. Engine visual dedicada para todo o jogo.

## 4. Resultado da Decisao

Opcao escolhida: Next.js App Router, React, PWA e tabuleiro
em DOM/CSS, porque essa combinacao atende responsividade,
cache offline, telas de consulta e integracao com pacotes
TypeScript sem introduzir complexidade visual desnecessaria.

A camada web sera uma consumidora do motor e dos dados. Ela
mantem adaptadores finos para renderizacao e interacao,
preservando as regras em pacotes compartilhados.

## 5. Pros e Contras das Opcoes

- Opcao 1: Next.js, React, PWA e DOM/CSS.
- Pros: atende telas ricas de catalogo, deck, senha e duelo.
- Pros: simplifica responsividade e acessibilidade web.
- Pros: permite cache offline de app shell e assets.
- Contras: exige cuidado para nao misturar regra de dominio
  na UI.
- Contras: requer estrategia clara para listas grandes e
  imagens.
- Contras: pode ser menos expressivo para animacoes
  complexas que uma engine visual.

- Opcao 2: SPA sem framework full-stack.
- Pros: reduz algumas convencoes de framework.
- Pros: pode ter setup inicial simples.
- Contras: deixa mais decisoes de roteamento, build e
  distribuicao para o projeto.
- Contras: perde beneficios diretos para telas estaticas ou
  hibridas.
- Contras: aumenta trabalho para uma PWA completa.

- Opcao 3: engine visual dedicada para todo o jogo.
- Pros: favorece animacoes e cenas altamente customizadas.
- Pros: pode centralizar renderizacao do tabuleiro.
- Contras: torna Library e Build Deck mais custosos que uma
  UI web comum.
- Contras: dificulta formularios, filtros, acessibilidade e
  responsividade fina.
- Contras: aumenta risco de acoplar regra a ciclo visual.

## 6. Consequencias

As telas precisam ser desenhadas como interfaces web de
produto, com foco em clareza, busca, filtros, responsividade
e estado offline. O motor segue como fonte de verdade do
duelo, enquanto a UI apresenta eventos e aceita intencoes do
jogador.

O uso de PWA transforma assets e pacote de cartas em parte
do contrato de experiencia. Mudancas no Banco de Cartas e
nas artes precisam respeitar versionamento e cache para
evitar divergencia entre o que o jogador ve e o que o motor
valida.

## 7. Referencias

- docs/arquitetura.md:13
- docs/arquitetura.md:220
- docs/prds/library.md:56
- docs/prds/build-deck.md:35
- product.md:5
