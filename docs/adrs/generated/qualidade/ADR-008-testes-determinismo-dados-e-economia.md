# ADR-008: Testes de determinismo, dados e economia
**Status:** Aceito
**Data:** 24-07-2026
**ADRs Relacionados:** ADR-002, ADR-003, ADR-006

## 1. Contexto e Declaracao do Problema

O produto depende de tres superficies de alto risco: regras
de duelo, integridade do Banco de Cartas e economia do
jogador. O motor precisa ser deterministico e fiel ao
Forbidden Memories; o catalogo precisa descartar dados
invalidos e manter contagem canonica; e a economia precisa
impedir credito duplicado ou debito sem entrega.

A arquitetura escolhe Vitest, fast-check, analise estatica
de dependencias e testes especificos de dados e economia. A
decisao trata testes como parte da arquitetura, nao como
atividade acessoria, porque o offline, o online autoritativo
e a progressao do jogador dependem diretamente desses
invariantes.

## 2. Direcionadores de Decisao

- O mesmo estado e a mesma sequencia precisam produzir o
  mesmo resultado.
- A tabela de combate possui ramos sutis com alto risco de
  regressao.
- O motor nao pode importar UI, rede ou persistencia.
- O catalogo precisa rejeitar dados invalidos antes de ser
  servido.
- Operacoes economicas precisam provar atomicidade e
  idempotencia.

## 3. Opcoes Consideradas

1. Vitest, fast-check, analise estatica e testes focados em
   dados/economia.
2. Testes unitarios manuais por exemplo, sem property-based.
3. QA manual jogando fluxos principais.

## 4. Resultado da Decisao

Opcao escolhida: Vitest, fast-check, analise estatica e
testes focados em dados/economia, porque essa combinacao
cobre determinismo, ramos de combate, fronteiras de pacote,
ingestao de dados e integridade economica com verificacao
automatizada.

Os testes serao parte do criterio de aceitacao arquitetural
dos pacotes criticos. Um fluxo visual funcionando nao basta
para validar regra, dados ou economia.

## 5. Pros e Contras das Opcoes

- Opcao 1: estrategia automatizada ampla.
- Pros: captura regressao de determinismo em varias
  sequencias.
- Pros: protege a fronteira entre motor e UI.
- Pros: valida dados e economia antes de afetarem jogador.
- Contras: exige investimento inicial em fixtures e
  propriedades.
- Contras: falhas property-based podem demandar boa reducao
  de caso.
- Contras: aumenta a disciplina de manter testes junto das
  mudancas.

- Opcao 2: unit tests por exemplo.
- Pros: simples de escrever e entender.
- Pros: bom para casos de regra documentados.
- Contras: cobre menos combinacoes de estado e sequencia.
- Contras: pode deixar determinismo quebrado passar.
- Contras: nao verifica fronteiras de pacote sozinho.

- Opcao 3: QA manual.
- Pros: encontra problemas de experiencia real.
- Pros: valida fluxos completos do ponto de vista do
  jogador.
- Contras: nao escala para combinacoes de combate e dados.
- Contras: nao prova reproducibilidade.
- Contras: e insuficiente para economia idempotente.

## 6. Consequencias

O pacote de motor deve nascer com uma suite que cobre
combate, serializacao e determinismo. O pacote de dados deve
validar contagem canonica, descarte de registros invalidos e
ausencia de duplicidade. A economia deve ter testes que
demonstrem uma unica aplicacao por recompensa e ausencia de
estado parcial em liberacoes.

Essa decisao aumenta o custo de mudancas em regras, dados e
economia, mas torna o custo previsivel. A confianca do modo
online e dos replays depende desses testes antes de existir
infraestrutura multiplayer completa.

## 7. Referencias

- docs/arquitetura.md:18
- docs/arquitetura.md:230
- docs/prds/motor-duelo-1x1.md:66
- docs/prds/banco-de-cartas.md:431
- docs/prds/password.md:322
