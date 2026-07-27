# Plano de Implementação — Orquestração da Partida

> Spec: `./spec.md`

## Pré-requisitos

- **Dependências internas satisfeitas:** `free-duel`/F01 (Seleção de Oponente) e `free-duel`/F02
  (Verificação do Deck Ativo) já têm spec — este plano assume as saídas de duelista escolhido e
  deck do jogador pronto descritas por elas.
- **Contrato externo já especificado, a implementar:** a inicialização do duelo do motor de regras
  (`motor-duelo-1x1`/F03) — spec existe, código não. Este plano trata o pacote do motor como
  dependência a materializar antes da fase 4 rodar contra a implementação real; até lá, usa os
  fakes da fase 3.
- **Contratos externos ainda sem spec, tratados como pendência:** o dispatcher de ações do motor e
  o vocabulário de ações (ciclo de turno do motor de regras, ainda não especificado) e a
  implementação real do agente de IA de NPCs (módulo próprio, sem PRD ainda). A implementação desta
  feature usa fakes documentados até esses módulos existirem.
- **Dependência nova:** uma biblioteca de gerenciamento de estado (Zustand) precisa ser adicionada
  à aplicação web — primeiro uso no monorepo.

## Fase 1: Contratos compartilhados de sessão e visibilidade

**1. Vocabulário de estado público** — Declarar os tipos que espelham o estado do duelo ocultando o
que um jogador não deveria ver (mão e identidade de carta virada para baixo do adversário, ordem do
próprio baralho), com os schemas de validação correspondentes.

**2. Constante de segurança do avanço automático** — Declarar o limite de iterações que protege o
avanço do lado CPU contra um agente sem progresso.

**3. Contratos de orquestração e exports públicos** — Declarar o tipo da porta que representa o
agente de decisão da CPU, o tipo da porta que produz o estado público, a forma da entrada que monta
uma partida, a união que representa os desfechos possíveis da sessão de duelo e o vocabulário
fechado de motivos de falha, reexportando tudo pelo índice público do pacote.

## Fase 2: Regras puras de composição e visibilidade

**4. Agrupamento do deck do oponente** — Implementar a conversão da lista de cartas do duelista
escolhido para a mesma forma de composição usada pelo deck do jogador, provando por teste que a
operação é o inverso exato da expansão já existente.

**5. Projeção de estado público** — Implementar a função que, a partir do estado interno completo e
de um jogador de referência, produz a visão pública correspondente: lado do próprio jogador sempre
revelado, lado do adversário com mão e cartas viradas para baixo ocultas, baralho restante de ambos
os lados reduzido a uma contagem, e o valor de semente nunca exposto.

**6. Cobertura da projeção** — Cobrir a função de projeção com casos que isolam cada regra de
ocultação e com propriedades que provam, de forma ampla, que nenhuma informação oculta escapa para
o resultado e que a visão do próprio jogador nunca perde nem reordena suas cartas.

## Fase 3: Geração de semente e montagem da entrada da partida

**7. Gerador de semente e de identificador de sessão** — Implementar a fonte concreta de semente
aleatória usando a API de criptografia da plataforma, satisfazendo a porta injetável já
especificada pela inicialização do motor, e uma fonte irmã de identificador único de sessão,
independente da semente — a semente serve à reprodutibilidade, o identificador serve à idempotência
de recompensa que features futuras vão precisar.

**8. Montagem da entrada da partida** — Implementar a função que recombina o deck do jogador e o
deck do oponente escolhido na forma exigida pela inicialização do motor, sem revalidar o que F01 e
F02 já validaram.

**9. Duplos de teste do motor e da IA** — Criar as implementações de teste que imitam a
inicialização do motor, o dispatcher de ações e o agente de decisão da CPU, documentando-as como
caminho provisório até que os módulos reais existam.

## Fase 4: Sessão de duelo e condução do lado CPU

**10. Criação da sessão** — Implementar a montagem da sessão de duelo a partir da entrada da
partida, atribuindo o identificador único de sessão antes de qualquer validação para que ele exista
mesmo no caminho em que o motor recusa a inicialização apesar da verificação prévia.

**11. Determinação do próximo decisor** — Implementar a função que resolve, a partir do estado
corrente, se a próxima decisão pertence ao jogador ou à CPU, considerando tanto o turno normal
quanto uma janela de reação aberta.

**12. Condução automática do lado CPU** — Implementar o avanço que consulta o agente de decisão e
submete a ação retornada enquanto a vez for da CPU — em turno normal ou em reação —, com a guarda
contra loop sem progresso e o tratamento uniforme de falha do agente.

**13. Submissão de ação do jogador** — Implementar a submissão de uma ação vinda da interface,
recusando silenciosamente quando não é a vez do jogador e encadeando automaticamente a condução do
lado CPU em seguida. Implementar também um segundo canal, sem essa checagem de vez, reservado a
ações de interrupção que o jogador pode disparar a qualquer momento (ex.: a rendição de F04) — as
duas vias convergem no mesmo dispatcher do motor, nunca duplicando a lógica de aplicação.

**14. Estado compartilhado da sessão** — Criar o armazenamento de estado que expõe a sessão corrente
e as duas operações de início e submissão de ação aos componentes de interface.

**15. Ponto único de integração com a IA real** — Isolar num único módulo o lugar que importará a
implementação real do agente de decisão quando ela existir, mantendo o restante da feature
desacoplado dela.

## Fase 5: Tela de duelo

**16. Rota e composição da tela** — Criar a rota da tela de duelo e o componente que inicia a
sessão ao entrar, tratando os quatro desfechos possíveis dela (não iniciada, em andamento,
encerrada, falha).

**17. Componentes visuais do tabuleiro** — Criar os componentes que exibem o tabuleiro, a mão do
jogador, o indicador de pontos de vida de cada lado e o aviso de falha, consumindo apenas o que a
sessão já expõe, sem lógica de regra.

**18. Guardas de navegação** — Tratar a entrada direta na tela sem os dados que F01/F02 deveriam ter
entregado, e a revalidação de um oponente que deixou de estar disponível.

**19. Cobertura de tela e integração ponta a ponta** — Cobrir os estados da tela de duelo e o
percurso de ponta a ponta desde a escolha do oponente até a sessão em andamento.

**20. Nova dependência e regras de fronteira** — Adicionar a biblioteca de gerenciamento de estado à
aplicação web e atualizar as regras de análise estática com o novo subsistema de visibilidade e o
armazenamento de estado da sessão.
