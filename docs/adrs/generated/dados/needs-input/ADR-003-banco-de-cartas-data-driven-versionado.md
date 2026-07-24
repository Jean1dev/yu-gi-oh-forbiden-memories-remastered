# ADR-003: Banco de cartas data-driven, canonico e versionado
**Status:** Aceito
**Data:** 24-07-2026
**ADRs Relacionados:** ADR-001, ADR-002, ADR-004, ADR-007, ADR-008

## 1. Contexto e Declaracao do Problema

O projeto parte de uma origem de cartas fragmentada e
parcialmente invalida. Os PRDs identificam a necessidade de
transformar essa origem em um catalogo mestre unico, com
contagem canonica, artes resolviveis, validacao explicita e
distribuicao identica para cliente offline e servidor
autoritativo. Sem isso, Library, Build Deck, Password, Motor
e Free Duel tenderiam a interpretar cartas de formas
diferentes.

As regras de fusao, drops, guardioes e terreno tambem sao
data-driven por natureza, mas seus valores ainda nao existem
no repositorio. A decisao arquitetural e criar schema,
loader, validacao e empacotamento versionado agora,
permitindo que tabelas vazias ou parciais viajem de forma
valida ate os valores oficiais serem fornecidos.

[PRECISA DE ENTRADA: Confirmar o ajuste da validacao de guardioes para cartas ritual, pois o dataset real nao contem guardioes para esse tipo.]

[PRECISA DE ENTRADA: Fornecer os valores oficiais de fusoes, drops por duelista, compatibilidade de guardioes e compatibilidade de terreno para fechar a fidelidade final.]

## 2. Direcionadores de Decisao

- Todos os modulos precisam consumir a mesma fonte canonica
  de cartas.
- Cliente offline e servidor autoritativo precisam usar o
  mesmo dataset versionado.
- Dados invalidos devem falhar explicitamente antes de serem
  servidos.
- Regras dependentes de tabelas nao podem ser codificadas
  dentro do motor ou da UI.
- Tabelas ausentes precisam ter comportamento neutro e
  rastreavel ate serem preenchidas.

## 3. Opcoes Consideradas

1. Pipeline de build com catalogo canonico, tabelas
   auxiliares versionadas e validacao.
2. Leitura direta dos arquivos de origem em runtime por cada
   modulo.
3. Regras e excecoes de cartas codificadas diretamente nos
   consumidores.

## 4. Resultado da Decisao

Opcao escolhida: pipeline de build com catalogo canonico,
tabelas auxiliares versionadas e validacao, porque essa
abordagem cria uma fonte unica de verdade, sustenta offline
e online com paridade e evita que regras de carta vazem para
consumidores.

O pacote de dados passa a conter catalogo, artes e tabelas
auxiliares com versao e hash. Enquanto valores externos
estiverem pendentes, os consumidores devem tratar a ausencia
de forma neutra e explicita.

## 5. Pros e Contras das Opcoes

- Opcao 1: catalogo canonico versionado.
- Pros: elimina divergencia entre modulos.
- Pros: detecta dados corrompidos antes da distribuicao.
- Pros: permite handshake de integridade no online.
- Contras: adiciona etapa de build obrigatoria para dados.
- Contras: exige governanca sobre versoes e compatibilidade.
- Contras: nao resolve sozinho a falta de valores oficiais.

- Opcao 2: leitura direta da origem em runtime.
- Pros: reduz processamento inicial.
- Pros: facilita inspecao manual da origem.
- Contras: espalha normalizacao e validacao por varios
  modulos.
- Contras: aumenta risco de contagens divergentes.
- Contras: torna offline e online mais dificeis de alinhar.

- Opcao 3: regras codificadas nos consumidores.
- Pros: pode acelerar casos isolados no curto prazo.
- Pros: reduz dependencia imediata de tabelas completas.
- Contras: contradiz o pilar data-driven.
- Contras: cria divergencia entre motor, UI e modos.
- Contras: torna manutencao de centenas de cartas inviavel.

## 6. Consequencias

O Banco de Cartas se torna infraestrutura fundacional.
Library, Build Deck, Password, Motor, Free Duel e Online
Duel devem consumir apenas o pacote validado, e nao a origem
bruta. A contagem canonica de cartas passa a ser a
referencia para progresso de colecao, validacao de deck,
senha e regras.

A estrategia permite progresso mesmo sem todas as tabelas
auxiliares fechadas, mas deixa uma restricao explicita:
mecanicas dependentes desses valores terao comportamento
neutro ou incompleto ate a entrada dos dados oficiais. A
fidelidade final do Forbidden Memories depende desses
insumos.

## 7. Referencias

- docs/arquitetura.md:29
- docs/arquitetura.md:135
- docs/arquitetura.md:156
- docs/prds/banco-de-cartas.md:5
- docs/prds/banco-de-cartas.md:290
