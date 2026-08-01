# Plano de Implementação — Liberação da Carta (pagamento em estrelas)

> Spec: `./spec.md`

## Pré-requisitos

**Dependências internas que precisam existir antes da camada de UI (Fases 3–5):**

- **`password/F03` — Entrada e Validação de Senha.** Tem spec
  (`docs/specs/password/F03-entrada-e-validacao-de-senha/`) e **nenhuma implementação**. F04
  consome o resultado da resolução da senha, a tela `/password` e o mapa de mensagens que F03
  cria. As Fases 1 e 2 deste plano são independentes dela; as Fases 3 a 5 não são.
- **`password/F01` — Carteira de Estrelas.** Tem spec e implementação **parcial**: a carteira, o
  crédito idempotente e o cache local vieram de `free-duel/F07` e estão no código, mas as quatro
  lacunas que F01 identificou não. F04 depende especificamente do **observável reativo de saldo**
  e do ponto por onde refletir um saldo já debitado pelo servidor, ambos entregas de F01 ainda
  não codadas. Consumir esses contratos exatamente como F01 os definiu; não recriá-los.

**Contratos externos assumidos (já materializados no repositório):**

- **`build-deck/F03`** — o sink de crescimento da coleção. A tabela de coleção e a semântica de
  incremento já existem e são reusadas; nenhuma coleção paralela é criada.
- **`free-duel/F07`** — a carteira única e o precedente de RPC de economia atômica e idempotente,
  que esta feature segue.
- **`banco-de-cartas/F03`/`F10`** — o catálogo selado e a versão/hash do dataset, dos quais a
  tabela de preços autoritativa é derivada.
- **Auth/Cadastro** — a sessão autenticada de onde sai a identidade verificada no banco.

**Decisões e pendências a confirmar com o usuário antes ou durante a implementação:**

- **Sincronização offline de liberações (spec, Decisão 8).** O PRD pede sincronização em segundo
  plano de liberações feitas offline; a arquitetura determina que débito prefira autoridade
  online. A spec resolve com uma fila de intenções **sem débito local especulativo**, e registra
  a divergência como premissa a confirmar. É a decisão que mais muda a Fase 4 caso o usuário
  decida o contrário.
- **Limiar de confirmação de liberação cara (spec, Decisão 7).** É pendência de balanceamento e
  entrada aberta de ADR-006. O mecanismo é implementado por completo, mas nasce **neutro**: sem
  valor definido, nenhuma liberação é considerada cara e a confirmação nunca é pedida. Nenhum
  valor de lore deve ser inventado ao implementar.
- **Numeração das migrações (spec, Decisão 15).** A spec de F01 reserva o próximo número livre
  para a sua própria migração. Se F01 for implementada antes, deslocar as migrações desta feature
  para os números seguintes; o que importa é que venham depois das já aplicadas, e que nenhuma
  migração existente seja editada.
- **Custo assumido da autoridade de preço (spec, Decisão 1).** A tabela de preços é uma projeção
  do dataset no Postgres e pode divergir dele. A guarda contra divergência é um teste de paridade
  obrigatório; se ele for pulado, o custo da decisão fica sem mitigação.

## Fase 1: Contratos e regras puras da liberação

**1. Constante do limiar de confirmação** — Acrescentar ao arquivo de constantes de economia de
`packages/shared` o limiar de liberação cara, declarado como ponto único de troca e nascendo no
estado neutro descrito na spec, com o comentário que o marca como pendência de balanceamento.
Não inventar valor.

**2. Tipos da liberação** — Declarar em `packages/shared` a intenção de liberação, o veredito de
elegibilidade, o desfecho da liberação, o registro de fila pendente e o modelo de estado do
livro-razão de liberações, conforme a Seção 4 da spec. São declarações puras, sem lógica.

**3. Schemas de fronteira** — Declarar em `packages/shared` os schemas de validação da intenção,
do registro lido do armazenamento local e da resposta da RPC. As três são fronteiras não
confiáveis e precisam falhar explicitamente em vez de corromper a economia.

**4. Regras puras de elegibilidade e débito** — Implementar em `packages/rules`, no subdomínio de
senha que F03 abre, as funções que decidem se uma liberação está pronta, bloqueada por saldo,
bloqueada por saldo desconhecido ou precisa de confirmação, e as que modelam o débito e a
aplicação de uma liberação ao livro-razão. Todas puras, totais e sem I/O — o saldo e o preço
entram como valores.

**5. Cobertura das invariantes de economia** — Cobrir as funções da etapa anterior com testes
table-driven dos ramos e com os testes de propriedade da Seção 7 da spec: saldo nunca negativo,
conservação da soma de preços, retry que não duplica cobrança, e liberar a mesma carta N vezes
cobrando N vezes. É o que o ADR-008 exige de qualquer superfície de economia.

## Fase 2: Autoridade de preço e transação no banco

**6. Gerador da semente de preços** — Escrever, em `packages/data/scripts/`, o gerador que lê o
catálogo selado do disco e emite a migração de semente da tabela de preços, incluindo apenas as
cartas com senha e carimbando a versão do dataset. Vive em `scripts/` porque faz I/O; deve ser
determinístico e reexecutável, e ganhar um script no `package.json` do pacote.

**7. Migração das tabelas e da RPC de liberação** — Criar a migração que estabelece a tabela de
preços autoritativa e a tabela de registro de liberações, com suas constraints, índices, RLS e
`GRANT`s explícitos, e a função transacional de liberação por senha descrita na Seção 4 da spec.
Escrever a migração já na sua forma final, como as migrações anteriores deste projeto fazem.

**8. Semente de preços comitada** — Executar o gerador e comitar a migração de semente
resultante. Nunca editá-la à mão: uma mudança de dataset gera uma migração nova.

**9. Guardas do banco e do dataset** — Cobrir a função transacional com os testes de integração
da Seção 7 da spec (atomicidade, bloqueio antes do débito, idempotência por tentativa, cobrança
dupla legítima sob tentativas distintas, recusa de identidade divergente, concorrência com o
crédito de vitória, RLS) e a semente com o teste de paridade contra o catálogo selado. Lembrar
que os testes de Supabase passam em verde sem rodar quando o ambiente não está configurado.

## Fase 3: Fronteira de I/O da liberação

**10. Adaptador da RPC de liberação** — Implementar em `apps/web` a porta de liberação e seu
adaptador Supabase, chamando a função transacional a partir da sessão do próprio jogador e
traduzindo cada desfecho devolvido pelo banco no desfecho de domínio, sem reinterpretar nenhum
deles como erro.

**11. Orquestração da liberação** — Implementar a função de entrada que valida a intenção antes
de qualquer I/O, dispara a chamada e decide o que fazer com cada desfecho, incluindo a distinção
entre falha de rede (que segue para a fila) e falha de sessão (que não segue). A geração do
identificador da tentativa e o relógio entram como portas injetadas.

**12. Reflexo do saldo debitado** — Ligar a orquestração ao observável de saldo entregue por
F01, empurrando o saldo que o servidor devolveu e nunca um saldo calculado localmente. É o ponto
que garante que a carteira continue com fonte única.

## Fase 4: Fila de intenções e sincronização offline

**13. Store local da fila de intenções** — Acrescentar ao banco local do navegador a store da
fila de liberações pendentes, subindo a versão do banco, e implementar seu adaptador com
validação do registro lido. Diferente do caminho de crédito, esta fila **não** escreve saldo nem
coleção locais.

**14. Enfileiramento sem débito especulativo** — Estender a orquestração para gravar a intenção
quando a rede falhar e devolver o desfecho de "pendente", preservando o identificador da
tentativa para que o reenvio seja reconhecido como a mesma liberação.

**15. Drenagem ao reconectar** — Implementar a rotina que reenvia as intenções pendentes em
ordem de enfileiramento e o gatilho que a dispara quando o navegador volta a ficar online,
espelhando o mecanismo já usado pela sincronização de recompensas. Definir o destino de cada
desfecho conforme a Seção 3 da spec: concluído sai da fila, inaplicável sai da fila com aviso,
falha de rede permanece.

**16. Cobertura do caminho offline** — Cobrir enfileiramento, drenagem parcial, intenção que
deixou de ser pagável e reenvio repetido, provando que nenhuma dessas situações cobra duas vezes
nem altera o saldo antes da confirmação do servidor.

## Fase 5: Experiência de liberação na tela

**17. Máquina de estados da liberação** — Implementar o hook que conduz a tela do estado ocioso
até o desfecho, passando pelo passo de confirmação quando a elegibilidade pedir, impedindo uma
segunda tentativa enquanto há uma em curso e preservando o identificador da tentativa quando o
jogador cancela a confirmação.

**18. Ação de liberar** — Substituir o botão desabilitado que F03 renderiza por uma ação
efetiva, com o preço no rótulo, o bloqueio por saldo insuficiente ou desconhecido, e o estado
inerte durante o envio.

**19. Confirmação de liberação cara** — Implementar o diálogo modal de confirmação exigido pelo
escopo completo, acessível por teclado e fechável sem efeito colateral. Com o limiar neutro ele
nunca é aberto, então cobrir tanto o caminho neutro quanto o caminho com limiar injetado.

**20. Feedback da liberação** — Implementar a superfície que comunica sucesso, bloqueio por
saldo, falha da transação, sessão expirada, inconsistência de dados, divergência de preview e
pendência offline, acrescentando ao mapa de mensagens de F03 os textos em Português exatamente
como o PRD os escreve.

**21. Abertura do módulo no menu** — Promover o item Password do menu principal para disponível,
apontando para a rota do módulo. É a pendência que a spec de F03 deixou explicitamente para esta
feature, e só faz sentido agora que a tela permite consultar **e** liberar.

**22. Fechamento contra os critérios de aceite** — Percorrer os critérios da Seção 9 do PRD para
F04, os de Cross-Feature Integration e os de Cross-PRD Integration que citam esta feature,
verificando que cada um tem o teste correspondente da Seção 7 da spec rodando de verdade — em
particular exportando as variáveis de ambiente do Supabase, sem as quais os testes de integração
da economia passam sem executar.
