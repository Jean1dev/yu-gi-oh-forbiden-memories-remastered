# Plano de Implementação — Histórico de Liberações

> Spec: `./spec.md`

## Pré-requisitos

- **`password/F04` implementada** (`docs/specs/password/F04-liberacao-da-carta-pagamento-em-estrelas/`).
  É o pré-requisito duro: F05 lê a tabela de liberações, o índice cronológico, a política RLS
  `select`-own e a fila offline de intenções que F04 cria. Sem F04 não há o que listar, e a
  numeração da migração e da versão do banco local desta feature assume que as de F04 já existem
  (spec §1, Decisões 13 e 14).
- **`password/F03` implementada** — a rota `/password`, o payload de catálogo entregue por ela e o
  mapa único de mensagens do módulo. F05 acrescenta uma aba a essa tela; não cria rota nova.
- **Nota a aplicar na spec de `password/F03`** — a reconstrução do payload no cliente passa a
  expor também um índice por número de carta, que o extrato usa para nomear cada liberação
  (spec §1, Decisão 11). É uma alteração aditiva; se F03 ainda não tiver sido implementada, já
  pode nascer assim.
- **`password/F01`** — nenhuma API dela é consumida. F05 apenas honra a invariante de que a
  carteira é a fonte única de saldo e de que o extrato nunca deriva saldo (spec §1, Decisão 8).
- **Contrato externo (Save/persistência, cross-PRD)** — conta autenticada no Supabase com RLS
  ligada e o padrão de função remota privilegiada com verificação de identidade do chamador, já
  estabelecido pelas migrações existentes.
- **Nenhuma pendência de dado externo.** F05 não lê preço, saldo inicial, estrelas por vitória,
  limiar de liberação cara, nem qualquer tabela de guardiões, terrenos, fusões, drops ou rating.
- **Ambiente de teste de integração** — exportar as variáveis do Supabase local antes de confiar
  em um resultado verde: os testes de integração deste repositório passam sem rodar quando o
  ambiente não está configurado.

## Fase 1: Contratos e regras puras do extrato

**1. Contratos do extrato em `shared`** — Declarar os tipos e schemas que descrevem uma liberação
confirmada, uma entrada do extrato nos seus dois estados, os totais e o snapshot em cache, junto
do tamanho de página. Tudo que chega do banco, da função de totais ou do armazenamento local é
fronteira não confiável e ganha schema próprio.

**2. Fusão e totalização puras em `rules`** — Implementar, no subdomínio de senha, a união entre
as liberações confirmadas e as pendentes da fila, com a deduplicação por identificador de
tentativa, a ordenação total decrescente e a totalização que mantém confirmado e pendente como
números separados. Funções puras, sem I/O e sem relógio, alimentadas por valores injetados.

**3. Cobertura das invariantes do extrato** — Cobrir os ramos da fusão e da totalização com
testes table-driven e acrescentar as propriedades de ordenação total, não-duplicação,
idempotência sob remesclagem, invariância à ordem de entrada e separação entre gasto confirmado e
pendente, com geradores que produzam colisões de instante e de identificador de propósito.

## Fase 2: Autoridade de leitura no banco

**4. Migração do agregado de totais** — Acrescentar uma migração nova com a função de leitura
agregada das liberações do jogador, com verificação de identidade do chamador e privilégios
explícitos. Nenhuma migração anterior é editada e nenhuma tabela nova é criada.

**5. Adaptador de leitura no Supabase** — Implementar a porta de leitura do extrato com a
paginação por cursor descrita na spec e a chamada do agregado, validando cada linha e a resposta
da função antes de convertê-las para a forma interna, e cobrindo com um cliente falso a página
cheia, a curta, a vazia, o cursor aplicado, a resposta malformada e o erro de transporte.

**6. Guardas do banco** — Cobrir a função agregada e a paginação com os testes de integração
contra o Supabase local: leitura restrita ao dono, rejeição quando o chamador não é o dono, soma
que ultrapassa o limite de inteiro de 32 bits, e a travessia completa das páginas exatamente uma
vez mesmo com uma liberação inserida entre duas delas.

## Fase 3: Cache local e orquestração da carga

**7. Cache local do extrato** — Criar a store do snapshot do extrato no banco local do navegador,
subindo a versão compartilhada, e o adaptador que grava e lê esse snapshot validando o registro
recuperado.

**8. Porta de leitura da fila de pendentes** — Expor uma leitura da fila de intenções de F04 que
não ofereça nenhuma operação de escrita, de modo que a fronteira "o extrato lê e nunca drena"
seja verificável por tipo e não apenas por convenção.

**9. Orquestração do carregamento** — Compor servidor, cache e fila na carga inicial, aplicando a
fusão da Fase 1 e o recuo para o cache com aviso; e a carga das páginas seguintes, que consulta
apenas o servidor e não toca fila, totais nem cache.

**10. Cobertura da fronteira de I/O** — Cobrir o orquestrador com um cliente Supabase falso e um
armazenamento local falso: origem servidor e origem cache, fila vazia, pendente já confirmado,
snapshot corrompido, registro corrompido na fila, ausência de sessão, e falha de gravação de
cache que não invalida um resultado já obtido.

## Fase 4: Aba de histórico na tela

**11. Estado da aba** — Implementar o hook que carrega o extrato uma única vez por sessão de
tela, expõe a ação de carregar mais, preserva a lista já carregada quando a página seguinte
falha, e marca o extrato como obsoleto quando uma liberação é concluída.

**12. Alternância de abas e componentes do extrato** — Acrescentar o alternador acessível entre
liberar e histórico à tela existente, preservando o estado da busca de senha ao trocar de aba; e
construir o painel com resumo, lista, ação de carregar mais, estado vazio, aviso de cache e
estado de indisponibilidade, além da linha individual, que nomeia a carta pelo catálogo, marca as
pendentes e degrada para o número cru quando a carta não resolve.

**13. Mensagens e cobertura de tela** — Acrescentar as mensagens do extrato ao mapa único do
módulo, em Português, reaproveitando o tom já fixado para os estados equivalentes de carteira e
coleção; e cobrir cada estado dos componentes e do hook em ambiente jsdom.

**14. Trava de somente-leitura e fechamento contra os critérios de aceite** — Adicionar o teste
que falha se qualquer módulo do extrato tentar escrever em carteira, coleção ou na tabela de
liberações, ou chamar qualquer função remota além do agregado de totais; verificar por leitura de
imports a direção de dependências e a separação servidor/cliente, já que o verificador automático
do repositório não alcança as fronteiras entre pacotes; e percorrer os critérios da Seção 9 do
PRD para F05 e os de integração que a citam, confirmando que cada um tem um teste correspondente.
