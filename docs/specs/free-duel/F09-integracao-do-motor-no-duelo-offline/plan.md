# Plano de Implementação — Integração do Motor no Duelo Offline

> Spec: `./spec.md`

## Pré-requisitos

- **Dependências internas já implementadas:** `free-duel` F01 (roster e seleção de oponente), F02
  (verificação do deck ativo), F03 (orquestração e store da sessão), F04 (rendição), F05 (resultado e
  nota), F08 (navegação pós-duelo). Todas com spec em `docs/specs/free-duel/`.
- **Dependência cross-PRD já implementada:** `motor-duelo-1x1` F01–F12 (`packages/engine` completo,
  com `apply`, `initDuel`, `buildInitializationInput`, `closeReactionWindow`, `serialize` e o desfecho
  carimbado em `state.outcome`) e `banco-de-cartas` F03 (catálogo selado em disco).
- **Contrato externo assumido — IA de NPCs (`packages/ai`):** não existe e **não é criado**. O agente
  passivo desta feature satisfaz o mesmo contrato `AiAgent` e é o ponto de troca quando o pacote real
  chegar.
- **Contrato externo assumido — Rating Engine:** sem escala de notas nem tabela nota→recompensa. O
  fallback neutro adotado é `unavailableRatingEngine` + `MINIMUM_RATING_REWARD`, que faz toda vitória
  cair no `minimum_fallback` já implementado por F05.
- **Pendência de dado externo — composição do roster:** a composição definitiva (quais duelistas,
  decks e pools) segue pendente. O fallback adotado é um único **duelista de teste** gerado por script
  determinístico e commitado, suficiente para jogar e explicitamente não-final.
- **Lacuna declarada aceita antes de codar:** F06 (drop) e F07 (estrelas) permanecem **desligadas**;
  a vitória informa a recompensa como pendente.
- **Ambiente:** Node 24 (`nvm use`) e `packages/data/generated/` construído (`data:validate` grava o
  `dataset-seal.json` que o loader lê primeiro).

## Fase 1: Duelista de teste no roster

**1. Gerador do duelista de teste** — Criar um script em `packages/data/scripts/` que exponha uma
função pura de montagem do duelista e um ponto de entrada que lê o catálogo selado e grava o arquivo
de roster. O script fica em `scripts/` porque o núcleo do pacote é livre de I/O, e traz seu próprio
gerador pseudoaleatório semeado.

**2. Script de pacote e roster commitado** — Registrar o comando de geração em
`packages/data/package.json`, executá-lo uma única vez e **commitar** o `roster.json` resultante, de
modo que o dado em produção seja fixo e reproduzível.

**3. Verificação do dado** — Rodar o validador de roster já existente e confirmar um duelista
disponível e nenhum escondido, além de conferir que a tela de seleção de oponente passa a listá-lo com
retrato.

## Fase 2: Fronteira do motor aberta e verificada

**4. Portão de fronteira próprio** — Criar um script de verificação encadeado ao `lint` que garanta o
confinamento do motor a um único módulo do app e a ausência de acesso ao catálogo de disco a partir de
módulos de cliente. Este é o portão real; o dependency-cruiser não valida imports de workspace.

**5. Abertura da dependência** — Declarar `@yugioh/engine` como dependência de `apps/web`, incluí-lo
na transpilação do Next e acrescentar a rota do duelo à lista de arquivos rastreados em runtime, junto
com a atualização da regra correspondente no dependency-cruiser.

**6. Verificação negativa do portão** — Confirmar que o `lint` fica verde e, temporariamente,
introduzir um import do motor fora do módulo autorizado para observar o portão falhar, revertendo em
seguida.

## Fase 3: Porta `apply` em `Result` e liquidação da janela de reação

**7. Portas tipadas do orquestrador** — Reescrever as portas de `duel-session.ts` para refletirem o
contrato real do motor, substituindo também o validador de deck não tipado. Passar a tratar recusa
como valor: sessão intacta, motivo disponível, partida em andamento.

**8. Liquidação da janela** — Introduzir o helper privado que fecha toda janela de reação aberta
dentro do mesmo despacho, encadeando a resolução do ataque quando for o caso, e passar os dois
chamadores (jogador e CPU) a usá-lo.

**9. Publicação por passo e escopo do `try/catch`** — Acrescentar a notificação por ação da CPU às
dependências do laço e reduzir o tratamento de exceção a um único ponto de chamada, o do agente.

**10. Atualização dos consumidores e dos fakes** — Ajustar o fake do motor usado nos testes e as
suítes existentes que dependiam da assinatura antiga, incluindo o fluxo de rendição, sem alterar a
lógica do hook de rendição.

## Fase 4: Agente passivo e store da sessão

**11. Agente passivo da CPU** — Criar o agente que sempre devolve a vez, com o ritmo perceptível
dentro dele próprio e injetável, para que o laço permaneça determinístico nos testes. Remover o
registro global de agente, que é código morto.

**12. Store como escritor único** — Estender o store da sessão com o estado de ocupação, a última
recusa, a assinatura de eventos e um token de execução incrementado a cada início e a cada
interrupção, descartando resultados de laços obsoletos. É isso que fecha a corrida entre a rendição e
o laço da CPU.

**13. Verificação do runtime da CPU** — Cobrir um turno completo da CPU com motor fake, afirmando a
publicação por passo, e uma rendição no meio do laço, afirmando que a sessão encerrada sobrevive.

## Fase 5: Composition root e catálogo do servidor

**14. Ponto único de composição** — Criar o módulo que instancia o motor real e devolve o conjunto de
capacidades que a tela e o store consomem: início da partida, aplicação de ação, dependências do laço
da CPU e resolução do resultado. Este é o único módulo do app autorizado a importar o motor.

**15. Política de rating e desfecho** — Reunir num módulo próprio a leitura do desfecho a partir do
estado, o snapshot, o motor de nota indisponível e a recompensa mínima, esta última documentada como
dado de balanceamento pendente.

**16. Catálogo entregue pelo servidor** — Converter a rota do duelo em Server Component que carrega o
catálogo e o repassa como dado serializável, e criar o aviso próprio de catálogo indisponível com
opção de recarregar.

**17. Verificação contra o motor real** — Escrever o teste de integração que monta dois decks reais do
catálogo e conduz uma partida do início à rendição sem nenhum fake do motor.

## Fase 6: Sessão do duelo na tela

**18. Hook de sessão da tela** — Criar o hook que instancia o store por montagem, dispara o início da
partida e expõe à tela o estado de sessão, a ocupação e a última recusa.

**19. Tela ligada ao runtime** — Substituir os substitutos indisponíveis pela composição real,
**corrigir o travamento sob StrictMode** removendo o flag de cancelamento que convive com o guarda por
referência, acrescentar o controle temporário de avanço de fase e ligar a resolução do resultado.

**20. Verificação da experiência** — Atualizar a suíte da tela para as novas propriedades e validar
manualmente o caminho completo: seleção do duelista de teste, preparação, duelo com avanço de fases,
turno visível da CPU, pontos de vida renderizados e rendição encerrando com resultado e navegação
pós-duelo.
