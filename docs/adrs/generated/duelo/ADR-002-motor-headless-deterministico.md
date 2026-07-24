# ADR-002: Motor de duelo headless, deterministico e orientado a eventos
**Status:** Aceito
**Data:** 24-07-2026
**ADRs Relacionados:** ADR-001, ADR-003, ADR-007, ADR-008

## 1. Contexto e Declaracao do Problema

O Motor de Duelo 1x1 e o nucleo de regras do jogo. Ele
precisa validar jogadas, resolver combate, expor resultado
de duelo e servir igualmente ao Free Duel, ao Online Duel, a
IA de NPCs e a futuros subsistemas de regras. Se cada modo
implementar regras proprias, o produto passa a ter
divergencias dificeis de reproduzir e explicar.

Os PRDs exigem determinismo por estado, sequencia e seed;
estado serializavel; desacoplamento completo de UI; e um
modelo de eventos que permita efeitos de cartas sem acoplar
cada efeito ao nucleo de combate. A decisao arquitetural e
tratar o motor como uma biblioteca headless, pura em termos
de dominio, com fluxo de eventos e janela de reacao
explicita.

## 2. Direcionadores de Decisao

- Uma unica fonte de regras precisa alimentar modos offline,
  online, campanha e IA.
- O mesmo estado inicial com a mesma entrada precisa
  produzir o mesmo resultado.
- O servidor autoritativo depende de revalidacao confiavel e
  reproduzivel.
- Efeitos de cartas precisam se conectar por gatilhos, sem
  crescer o nucleo por carta.
- A UI deve renderizar e encaminhar intencoes, nao decidir
  regra de jogo.
- Testes automatizados precisam exercitar o motor sem
  navegador ou servidor.

## 3. Opcoes Consideradas

1. Motor headless deterministico com estado serializavel e
   eventos de dominio.
2. Regras implementadas dentro das telas e modos de jogo.
3. Motor executado apenas no servidor, com cliente sem
   simulacao local.

## 4. Resultado da Decisao

Opcao escolhida: motor headless deterministico com estado
serializavel e eventos de dominio, porque essa abordagem
centraliza regras, permite replays e prepara a validacao
autoritativa do modo online sem sacrificar o offline.

O motor sera consumido pelos modos e pela IA por contrato de
dominio. A resolucao concreta de efeitos, fusoes, guardioes
e terrenos fica fora do nucleo, mas conectada por eventos e
por dados compartilhados.

## 5. Pros e Contras das Opcoes

- Opcao 1: motor headless deterministico.
- Pros: garante consistencia entre modos de jogo.
- Pros: torna bugs reproduziveis por snapshot e sequencia de
  acoes.
- Pros: facilita testes de regras em alta escala.
- Contras: exige desenho rigoroso de estado e eventos.
- Contras: aumenta disciplina sobre fronteiras com UI, rede
  e dados.
- Contras: subsistemas externos precisam respeitar o
  contrato do motor.

- Opcao 2: regras nas telas e modos.
- Pros: permite prototipos visuais rapidos.
- Pros: reduz trabalho inicial de separar contratos.
- Contras: duplica comportamento entre modos.
- Contras: dificulta testes automatizados de regras.
- Contras: inviabiliza uma base confiavel para o servidor
  autoritativo.

- Opcao 3: motor apenas no servidor.
- Pros: simplifica autoridade online.
- Pros: reduz risco de adulteracao no cliente online.
- Contras: quebra a experiencia offline.
- Contras: aumenta latencia percebida mesmo em interacoes
  locais.
- Contras: nao atende ao requisito de PWA jogavel sem rede.

## 6. Consequencias

Qualquer nova mecanica de duelo deve entrar pelo contrato do
motor ou pelos subsistemas de regra conectados a ele. Telas
e modos nao podem conter calculos de combate, decisao de
legalidade ou alteracao paralela de estado.

A serializacao do estado vira requisito transversal para
online, replays, depuracao e testes. Isso torna o desenho do
estado mais restritivo, mas tambem reduz ambiguidades e
permite que falhas sejam reencenadas com precisao.

## 7. Referencias

- docs/arquitetura.md:25
- docs/arquitetura.md:72
- docs/prds/motor-duelo-1x1.md:5
- docs/prds/motor-duelo-1x1.md:35
- docs/prds/motor-duelo-1x1.md:558
