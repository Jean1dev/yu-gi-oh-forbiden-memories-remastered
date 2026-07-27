# Plano de Implementação — Salvar e Persistir o Deck Ativo

> Spec: `./spec.md`

## Pré-requisitos

- **`build-deck`/F01 — Coleção do Jogador (Baú).** Fornece `serializarColecao` e o padrão de
  cache IndexedDB reaproveitado por esta feature. Tem spec, ainda sem implementação.
- **`build-deck`/F02 — Geração do Deck Inicial no Cadastro.** Cria a tabela `active_decks` que
  esta feature herda sem redesenhar. Tem spec, ainda sem implementação.
- **`build-deck`/F05 — Edição do Deck Ativo.** Fornece o rascunho (`RascunhoDeck`) a ser salvo.
  Tem spec, ainda sem implementação.
- **`build-deck`/F06 — Validação em Tempo Real do Deck.** Fornece `validarDeck`, revalidado
  internamente antes de qualquer save. Tem spec, ainda sem implementação.
- **Projeto Supabase acessível**, com as migrações de F01 e F02 já aplicadas e um caminho de
  migração local para os testes de integração desta feature.
- Nenhuma pendência de dado externo bloqueia esta feature.
- Decisão de escopo já fechada na entrevista: Core + fila offline básica, deixando fora a
  resolução de conflito multi-dispositivo mais ativa e a sincronização em segundo plano fora do
  app aberto (ver spec, seção "Adiado").

## Fase 1: Contratos da persistência

**1. Tipos do resultado de salvar e carregar** — Definir a forma do resultado de salvar (salvo,
salvo offline, recusado, sessão expirada) e do deck carregado (origem, conflito detectado), ao
lado dos tipos de deck já existentes em `packages/shared`.

**2. Novo código de erro de domínio** — Registrar o erro reservado para quando nem rede nem
armazenamento local estão disponíveis, ao lado dos já existentes.

## Fase 2: RPC de salvar o deck

**3. Validação estrutural na RPC** — Criar a função de banco que recusa qualquer `cartas` que não
some 40 ou tenha alguma quantidade fora de 1 a 3, espelhando a mesma checagem que a RPC de F02 já
faz.

**4. Validação de posse na RPC** — Acrescentar, na mesma função, a checagem de que nenhuma
quantidade solicitada excede o que o jogador realmente possui na coleção.

**5. Upsert em `active_decks` e liberação de acesso** — Fazer a função sobrescrever a linha única
do jogador e conceder a permissão de execução ao próprio jogador autenticado, diferente da RPC
mais restrita de F02.

## Fase 3: Persistência local

**6. Cache do deck ativo** — Criar o armazenamento local que guarda o deck confirmado por
jogador, com a marca de sincronizado ou pendente.

**7. Pendência de save** — Criar o armazenamento local de slot único por jogador para o save
ainda não confirmado pelo servidor, substituído a cada nova tentativa offline.

## Fase 4: Orquestração no app web

**8. Carregar o deck ativo** — Implementar a leitura que tenta o servidor primeiro, cai para o
cache em falha de rede, e detecta divergência de versão quando não há pendência em aberto.

**9. Salvar o deck ativo** — Implementar a orquestração que revalida com F06, tenta a chamada
online, e cai para cache mais pendência de forma atômica em falha de rede ou de sessão.

**10. Sincronizar a pendência ao reconectar** — Implementar o processo que reenvia a pendência
existente, removendo-a em sucesso ou em recusa definitiva, e mantendo-a em falha de rede.

## Fase 5: Integração de UI

**11. Indicador de salvar** — Construir o botão de salvar (habilitado só com o deck válido de F06)
e o indicador de status, incluindo o aviso de conflito.

**12. Fiação da página do Build Deck** — Conectar o carregamento inicial do deck ativo, o botão de
salvar e a sincronização em segundo plano à página existente, sem alterar o comportamento de F05.
