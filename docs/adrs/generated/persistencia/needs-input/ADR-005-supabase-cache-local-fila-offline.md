# ADR-005: Supabase com cache local e fila offline para progresso do jogador
**Status:** Aceito
**Data:** 24-07-2026
**ADRs Relacionados:** ADR-003, ADR-004, ADR-006, ADR-007, ADR-009

## 1. Contexto e Declaracao do Problema

O produto exige cadastro e login para salvar progresso, mas
tambem precisa funcionar offline. Build Deck, Library,
Password e Free Duel dependem de colecao, deck, saldo e
recompensas consistentes entre sessoes e dispositivos. Sem
persistencia em conta, o online autoritativo nao teria uma
fonte confiavel para validar decks e progresso.

A arquitetura escolhe Supabase com Postgres, Auth e Realtime
para persistencia, com politicas por jogador e cache local
no cliente. O desenho tambem inclui fila offline para
mutacoes idempotentes. A tensao principal esta nas operacoes
economicas sensiveis: credito offline e seguro quando
idempotente, mas debito offline pode abrir risco de gasto
duplicado entre dispositivos.

[PRECISA DE ENTRADA: Confirmar a politica final para debitos de estrelas offline: bloquear ate conexao, ou aceitar fila local com reconciliacao autoritativa.]

## 2. Direcionadores de Decisao

- O progresso precisa acompanhar a conta do jogador entre
  dispositivos.
- O jogo precisa continuar util quando a rede falhar.
- Dados privados de jogador precisam de isolamento por
  identidade.
- Modulos de duelo devem receber apenas deck salvo e valido.
- Mutacoes de recompensa e economia precisam ser
  idempotentes.
- Debitos de moeda exigem autoridade mais forte que escrita
  local simples.

## 3. Opcoes Consideradas

1. Supabase para conta e persistencia, com cache local e
   fila offline.
2. Persistencia local-only no navegador.
3. Backend customizado completo desde o inicio.

## 4. Resultado da Decisao

Opcao escolhida: Supabase para conta e persistencia, com
cache local e fila offline, porque essa opcao entrega
rapidamente autenticacao, armazenamento relacional,
isolamento por jogador e base para sincronizacao sem
construir toda a infraestrutura do zero.

Operacoes que apenas acumulam progresso podem usar fila
idempotente. Operacoes que gastam estrelas devem ser
tratadas como autoridade server-side ou reconciliadas por
registro transacional, conforme a politica final pendente.

## 5. Pros e Contras das Opcoes

- Opcao 1: Supabase com cache e fila.
- Pros: reduz esforco inicial de conta e persistencia.
- Pros: sustenta cache local e sincronizacao posterior.
- Pros: oferece base comum para Library, Build Deck,
  Password e Free Duel.
- Contras: exige desenho cuidadoso para conflitos offline.
- Contras: debitos economicos nao ficam resolvidos apenas
  com cache local.
- Contras: o modo online stateful ainda precisa de processo
  separado.

- Opcao 2: persistencia local-only.
- Pros: simplifica o primeiro prototipo offline.
- Pros: evita dependencia de servico externo no curto prazo.
- Contras: nao atende login, troca de dispositivo ou online
  autoritativo.
- Contras: aumenta risco de perda de progresso.
- Contras: dificulta economia confiavel.

- Opcao 3: backend customizado completo.
- Pros: controle total sobre persistencia e sincronizacao.
- Pros: pode modelar desde cedo todos os fluxos
  autoritativos.
- Contras: aumenta tempo ate o loop jogavel.
- Contras: desloca foco do motor e dados para
  infraestrutura.
- Contras: exige mais operacao antes de validar o produto.

## 6. Consequencias

Supabase passa a ser a fonte persistente de progresso de
conta, enquanto o navegador mantem uma copia operacional
para experiencia offline. Modulos de UI devem lidar com
estados sincronizado, pendente e falho sem assumir que
escrita local ja e verdade autoritativa.

A escolha cria uma fronteira clara para economia: creditos
podem ser enfileirados com identificadores estaveis, mas
debitos precisam de protecao contra concorrencia entre
dispositivos. Essa decisao se relaciona diretamente com a
unificacao da economia.

## 7. Referencias

- docs/arquitetura.md:14
- docs/arquitetura.md:163
- docs/arquitetura.md:198
- docs/prds/build-deck.md:57
- docs/prds/password.md:58
