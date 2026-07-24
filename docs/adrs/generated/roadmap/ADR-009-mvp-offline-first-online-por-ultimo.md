# ADR-009: MVP offline-first antes do modo online
**Status:** Aceito
**Data:** 24-07-2026
**ADRs Relacionados:** ADR-002, ADR-003, ADR-004, ADR-005, ADR-007

## 1. Contexto e Declaracao do Problema

O produto quer recriar Forbidden Memories em formato web,
jogavel offline e online. A arquitetura, no entanto,
reconhece que online autoritativo depende de varias bases:
Banco de Cartas canonico, motor deterministico, persistencia
de conta, deck valido, economia idempotente e fluxo offline
jogavel.

A decisao e construir primeiro um MVP offline-first que
entrega ingestao de cartas, motor, conta, Library, Build
Deck, Password e Free Duel contra IA. O Online Duel fica por
ultimo, reutilizando o mesmo motor e dataset quando as bases
de regra, dados e progresso estiverem consolidadas.

## 2. Direcionadores de Decisao

- O jogador precisa experimentar valor jogavel cedo.
- Motor e dados precisam amadurecer antes de autoridade
  online.
- O loop offline ja valida deck, colecao, recompensa e
  senha.
- O online deve reutilizar contratos existentes, nao criar
  regras paralelas.
- Dados de balanceamento pendentes nao devem bloquear todo o
  progresso do MVP.
- A complexidade operacional do multiplayer deve entrar
  depois do nucleo de jogo.

## 3. Opcoes Consideradas

1. MVP offline-first com Online Duel na fase final.
2. Online-first com servidor autoritativo desde o inicio.
3. Desenvolvimento simultaneo de todas as areas principais.

## 4. Resultado da Decisao

Opcao escolhida: MVP offline-first com Online Duel na fase
final, porque esse caminho entrega um ciclo jogavel completo
mais cedo e reduz risco tecnico. O online passa a ser
consumidor de motor, dados e persistencia ja provados por
uso offline.

O marco minimo jogavel e cadastrar, receber deck inicial,
editar deck, duelar contra CPU, ganhar carta e estrelas, e
liberar carta por senha, tudo sem depender de rede durante a
partida.

## 5. Pros e Contras das Opcoes

- Opcao 1: offline-first.
- Pros: entrega valor jogavel antes do multiplayer.
- Pros: reduz risco ao provar motor e dados localmente.
- Pros: permite usar Free Duel como ambiente de validacao de
  regras.
- Contras: o online chega mais tarde ao produto.
- Contras: algumas decisoes de sincronismo ficam pendentes
  por mais tempo.
- Contras: exige cuidado para nao criar atalhos offline
  incompativeis com o servidor.

- Opcao 2: online-first.
- Pros: testa autoridade e sincronismo desde cedo.
- Pros: antecipa riscos de infraestrutura multiplayer.
- Contras: depende de motor e dados ainda instaveis.
- Contras: atrasa o primeiro loop jogavel solo.
- Contras: aumenta retrabalho se regras ou dados mudarem.

- Opcao 3: desenvolvimento simultaneo.
- Pros: revela dependencias entre areas rapidamente.
- Pros: pode acelerar descoberta de lacunas de produto.
- Contras: aumenta paralelismo sobre contratos ainda
  imaturos.
- Contras: dispersa foco entre gameplay, dados, UI, economia
  e online.
- Contras: dificulta medir conclusao real de cada fundacao.

## 6. Consequencias

As fases iniciais devem priorizar dados, motor, persistencia
basica e loop offline. Isso cria uma linha de validacao
concreta para regras e progresso antes de assumir
complexidade de matchmaking, reconexao e autoridade
multiplayer.

O online deve ser projetado desde ja por contrato, mas
implementado depois. Essa separacao evita retrabalho desde
que o motor, o Banco de Cartas e a persistencia sejam
construidos com a autoridade futura em mente.

## 7. Referencias

- docs/arquitetura.md:16
- docs/arquitetura.md:240
- docs/arquitetura.md:251
- docs/prds/free-duel.md:60
- product.md:5
