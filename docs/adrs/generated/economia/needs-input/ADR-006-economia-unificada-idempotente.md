# ADR-006: Economia unificada, idempotente e atomica
**Status:** Proposto
**Data:** 24-07-2026
**ADRs Relacionados:** ADR-003, ADR-005, ADR-009

## 1. Contexto e Declaracao do Problema

Free Duel e Password descrevem recompensas e carteira de
estrelas a partir de pontos diferentes do produto. Free Duel
concede carta e estrelas por vitoria; Password consome
estrelas para liberar cartas por senha. A arquitetura
identifica que manter esses conceitos duplicados cria risco
de saldo divergente, credito duplicado e inconsistencia
entre debito de moeda e concessao de carta.

A decisao proposta e unificar a economia em uma carteira
unica, com evento de vitoria aplicado uma vez e liberacao
por senha tratada como transacao atomica. A colecao segue
como fonte unica para cartas possuidas, e Password escreve
nela por meio do mesmo mecanismo de crescimento usado por
recompensas de duelo.

[PRECISA DE ENTRADA: Confirmar formalmente que Free Duel e Password nao manterao carteiras independentes.]

[PRECISA DE ENTRADA: Definir saldo inicial, estrelas por vitoria e tabela de recompensa por nota quando o Rating Engine estiver fechado.]

[PRECISA DE ENTRADA: Definir se liberacoes por senha acima de um limite exigem confirmacao adicional do jogador.]

## 2. Direcionadores de Decisao

- Vitoria deve conceder carta e estrelas sem duplicar
  recompensa.
- O saldo nunca pode ficar negativo ou divergir entre
  dispositivos.
- Debito de estrelas e concessao de carta precisam acontecer
  como uma unidade.
- A colecao nao deve ser duplicada por Password, Free Duel
  ou outros modulos.
- Valores de balanceamento precisam ser externos a regra
  arquitetural.

## 3. Opcoes Consideradas

1. Carteira unica, recompensa idempotente e liberacao
   atomica.
2. Carteiras e fluxos economicos separados por modulo.
3. Economia otimista controlada principalmente pelo cliente.

## 4. Resultado da Decisao

Opcao escolhida: carteira unica, recompensa idempotente e
liberacao atomica, porque essa opcao minimiza duplicidade de
saldo, protege o jogador contra perda de estrelas e cria uma
base comum para futuras fontes e gastos de economia.

Enquanto as entradas pendentes nao forem fechadas, a decisao
fica como proposta. A direcao tecnica, no entanto, ja
orienta os PRDs: uma unica carteira, um unico registro
idempotente de vitoria e uma transacao indivisivel para
compra por senha.

## 5. Pros e Contras das Opcoes

- Opcao 1: economia unificada e atomica.
- Pros: evita credito duplicado de uma mesma vitoria.
- Pros: protege contra debito sem entrega de carta.
- Pros: mantem colecao e saldo como fontes unicas.
- Contras: exige coordenacao entre modulos de duelo, deck e
  senha.
- Contras: pede autoridade server-side para operacoes
  sensiveis.
- Contras: depende de valores de balanceamento ainda
  pendentes.

- Opcao 2: economia separada por modulo.
- Pros: cada modulo evolui com menos dependencia inicial.
- Pros: pode simplificar prototipos isolados.
- Contras: cria risco direto de saldos paralelos.
- Contras: dificulta auditoria de recompensas.
- Contras: aumenta probabilidade de duplicar cartas ou
  estrelas.

- Opcao 3: economia otimista no cliente.
- Pros: melhor resposta percebida offline.
- Pros: reduz viagens ao servidor no fluxo local.
- Contras: expande superficie de fraude e conflito.
- Contras: dificulta impedir gasto simultaneo em
  dispositivos.
- Contras: torna reversao de falhas mais complexa para o
  jogador.

## 6. Consequencias

Todos os modulos que concedem ou gastam estrelas devem falar
com a mesma fonte economica. Free Duel calcula ou recebe o
resultado de recompensa, mas nao mantem uma carteira
propria; Password valida senha e solicita a liberacao, mas
nao cria colecao paralela.

Essa decisao centraliza integridade em troca de maior rigor
transacional. O offline continua importante, mas qualquer
fluxo de debito precisa reconhecer que a autoridade final
nao pode ser apenas o estado local.

## 7. Referencias

- docs/arquitetura.md:181
- docs/arquitetura.md:189
- docs/prds/free-duel.md:7
- docs/prds/password.md:5
- docs/prds/build-deck.md:149
