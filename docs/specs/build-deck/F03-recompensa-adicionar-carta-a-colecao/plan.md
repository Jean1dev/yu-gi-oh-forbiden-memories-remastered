# Plano de Implementação — Recompensa: Adicionar Carta à Coleção

> Spec: `./spec.md`

## Pré-requisitos

- **F01 — Coleção do Jogador (Baú)**, já com spec e plano
  (`docs/specs/build-deck/F01-colecao-do-jogador-bau/`). Fornece a tabela `collections`, o
  contrato `ConsultaCatalogo`, o pacote `packages/rules/src/colecao/` já aberto e o snapshot
  local da coleção que esta feature estende — nada disso é recriado aqui.
- **Contrato externo — Free Duel/F06 (Concessão de Carta).** Tem PRD, ainda sem spec nem
  implementação. O evento de recompensa esperado está descrito na Seção 4 da spec; enquanto F06
  não existe, o desenvolvimento usa um evento falso equivalente.
- **Contrato externo — Online Duel e Campanha.** Nenhum dos dois tem PRD neste repositório ainda.
  Assumem o mesmo contrato de entrada de Free Duel/F06.
- **Contrato externo — Serviço de Catálogo (`banco-de-cartas`/F03)** e **Auth/Cadastro** — os
  mesmos já assumidos por F01, reusados sem alteração.
- **Pendência de arquitetura registrada, não resolvida aqui:** a unificação do handler `onVictory`
  e da carteira de estrelas entre `free-duel` e `password` (`arquitetura.md` §5.3/§10, ADR-006
  needs-input). Esta feature cria a tabela `reward_ledger` e reserva a coluna `stars`, mas não
  implementa o crédito de estrelas.
- **Projeto Supabase acessível**, com a migração de F01 (`0001_create_collections.sql`) já
  aplicada e um caminho de migração local para os testes de integração desta feature.

## Fase 1: Contratos da recompensa

**1. Tipos e schema do evento** — Definir a forma do evento de recompensa recebido dos módulos de
duelo e do resultado devolvido por esta feature, reaproveitando os contratos de carta e coleção já
existentes de F01 em vez de redefini-los.

**2. Novos códigos de erro de domínio** — Registrar os erros específicos desta feature (recompensa
inválida, evento malformado) ao lado dos já existentes em `packages/shared`.

## Fase 2: Regra pura de incremento e validação

**3. Incremento puro da coleção** — Implementar a função que soma uma cópia a uma carta da
coleção, criando a entrada quando ainda não existir, sem tocar em I/O e sem mutar a coleção
recebida.

**4. Validação do número contra o catálogo** — Implementar a checagem que impede que uma carta
inexistente no catálogo siga adiante, reusando a mesma interface de catálogo injetada por F01.

## Fase 3: Persistência atômica e idempotente

**5. Tabela de idempotência da recompensa** — Criar a tabela que registra cada recompensa
aplicada, com a chave que torna um identificador de recompensa/duelo repetido inofensivo por
construção.

**6. Rotina de aplicação atômica** — Criar a rotina de banco que, numa única transação, registra a
recompensa e incrementa a coleção apenas quando o identificador ainda não havia sido processado,
devolvendo ao chamador se aplicou e a quantidade atual da carta.

**7. Política de acesso à tabela nova** — Restringir a tabela de recompensas à leitura das
próprias linhas do jogador, deixando toda escrita exclusivamente a cargo da rotina de banco.

## Fase 4: Orquestração no app web e fila offline

**8. Chamada remota da recompensa** — Implementar o acesso que invoca a rotina de banco a partir
da sessão autenticada e traduz a resposta em sucesso, já-aplicada ou falha.

**9. Fila local de recompensas pendentes** — Implementar o armazenamento local que guarda
recompensas ainda não confirmadas pelo servidor, usando a mesma chave de idempotência da rotina de
banco, e capaz de listar, enfileirar e remover pendências por jogador.

**10. Orquestração do registro da recompensa** — Combinar a validação, a checagem da fila local, a
tentativa remota e a atualização otimista do cache local da coleção numa única entrada, garantindo
que o incremento local e o enfileiramento aconteçam de forma atômica entre si quando a rede falhar.

**11. Sincronização ao reconectar** — Implementar o processo que percorre a fila local na ordem em
que foi preenchida, reenvia cada pendência para a rotina de banco, remove as confirmadas e
preserva as demais, revalidando o número da carta contra o catálogo antes de cada tentativa.
