# Plano de Implementação — Geração do Deck Inicial no Cadastro

> Spec: `./spec.md`

## Pré-requisitos

- **`build-deck`/F01 — Coleção do Jogador.** Já tem spec em
  `docs/specs/build-deck/F01-colecao-do-jogador-bau/`. Esta feature reusa `Colecao`,
  `ColecaoSerializada`, `serializarColecao`/`desserializarColecao` e os códigos de
  `DomainError` já definidos por F01, sem redefini-los. Assume também a migração
  `0001_create_collections.sql` já aplicada.
- **Contrato externo — serviço de catálogo (`banco-de-cartas`/F03).** Ainda não existe. A regra
  pura consome `ConsultaCatalogo` (de F01) e a nova capacidade `ConsultaPoolCartas` por injeção;
  os testes usam um catálogo falso em memória. Sem ele, o deck inicial não pode ser gerado — o
  comportamento é falha explícita, nunca um deck parcial.
- **Contrato externo — Auth/Cadastro.** Ainda não existe. Espera-se que, ao criar uma conta,
  invoque o handler `aoContaCriada(playerId)` desta feature; o mecanismo exato de disparo
  (webhook, trigger, fila) é responsabilidade de Auth/Cadastro. F02 tolera reentrega.
- **Pendência de dado externo:** a composição exata do pool inicial de balanceamento
  (Fase 0.4 / PRD §7) não existe no repositório. O fallback neutro adotado — catálogo jogável
  inteiro — é o caminho exercitado enquanto o dado não chega; nenhum valor é inventado.
- **Projeto Supabase acessível**, com a migração de F01 aplicada e um caminho de migração local
  para rodar os testes de integração desta feature.
- **Premissa a confirmar:** o papel de execução (`GRANT EXECUTE`) restrito da RPC
  `persistir_deck_inicial` depende de como Auth/Cadastro vai efetivamente disparar
  `aoContaCriada` (contexto server-side confiável). Confirmar o papel exato antes ou junto da
  implementação, sem enfraquecer a restrição de que o cliente comum não pode chamá-la.

## Fase 1: Contratos do pool e do deck inicial (`packages/shared`)

**1. Tipos e schema do pool inicial** — Definir o formato opcional e tunável do pool de sorteio,
com sua validação de fronteira, preparado para receber o dado de balanceamento quando ele for
fornecido, sem exigir mudança de assinatura depois.

**2. Capacidade adicional de consulta ao catálogo** — Declarar a interface pela qual a regra
enumera todos os números do catálogo, distinta da consulta por número já publicada por F01,
marcada como implementada por `banco-de-cartas`/F03.

**3. Códigos de erro de domínio e reexport** — Introduzir os códigos de erro específicos desta
feature e reexportá-los, junto dos novos tipos, no ponto de export público do pacote.

## Fase 2: Regra pura de geração (`packages/rules`)

**4. Resolução do pool com fallback neutro** — Implementar a função que decide o pool efetivo:
usa a configuração quando presente e válida contra o catálogo, ou cai no catálogo inteiro na
ausência dela, e recusa explicitamente um pool pequeno demais para produzir 40 cartas com no
máximo 3 cópias.

**5. Sorteio determinístico por fonte injetada** — Implementar o algoritmo que expande o pool
até o teto de cópias, embaralha com a fonte de aleatoriedade recebida por parâmetro e recorta as
40 primeiras posições, garantindo as regras de Fase 0 pela própria construção do algoritmo.

**6. Rede de proteção do deck gerado** — Implementar a verificação independente que confirma as
mesmas regras sobre o resultado do sorteio, servindo como assertiva testável caso o algoritmo
mude no futuro.

**7. Composição pública** — Encadear resolução de pool, sorteio e verificação numa única função
pura que a camada de orquestração vai consumir, e documentar o subsistema no README do pacote.

## Fase 3: Persistência atômica e idempotente (Supabase)

**8. Migração da tabela de deck ativo** — Criar a tabela que guarda o deck único por jogador, com
a chave que sustenta a checagem de idempotência e o vínculo com a conta que remove o deck quando
a conta é removida.

**9. Política de leitura e ausência de escrita direta** — Habilitar a segurança em nível de linha
e conceder apenas a leitura da própria linha ao jogador autenticado, sem nenhuma política de
escrita — toda escrita chega exclusivamente pela função de persistência.

**10. Função de persistência transacional** — Implementar a função de banco que, numa única
transação, tenta criar a linha do deck ativo, só soma as quantidades na coleção quando essa
criação de fato acontece, e devolve o estado persistido (recém-criado ou já existente) sem nunca
deixar as duas tabelas em estados divergentes.

**11. Restrição do privilégio de execução** — Revogar a execução pública da função de
persistência e concedê-la apenas ao contexto de execução confiável que vai efetivamente chamá-la,
fechando o caminho de um cliente comum forjar seu próprio deck inicial.

## Fase 4: Orquestração, contrato externo e guarda defensiva (`apps/web`)

**12. Fonte de aleatoriedade de produção** — Implementar a implementação real da fonte injetável
usada pela regra pura, isolada da regra em si para que os testes de `packages/rules` continuem
livres de qualquer dependência de plataforma.

**13. Acesso à persistência e à leitura do deck ativo** — Implementar a chamada à função de banco
e a leitura da linha existente, validando a resposta na fronteira antes de expor o resultado ao
resto da aplicação.

**14. Orquestrador idempotente** — Combinar a checagem de existência, a geração pura e a
persistência numa única operação que pode ser chamada quantas vezes forem necessárias sem nunca
duplicar ou sobrescrever indevidamente o deck ou a coleção.

**15. Handler do contrato esperado por Auth/Cadastro** — Expor o ponto de entrada que o evento
externo de criação de conta deve chamar, documentando explicitamente que ele tolera entrega
duplicada.

**16. Guarda defensiva para pontos de entrada de duelo e do Build Deck** — Implementar a checagem
usada por qualquer tela que dependa de um deck ativo: quando ele ainda não existe, reaciona a
mesma operação idempotente e expõe o estado de preparação até ela concluir.
