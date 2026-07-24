# ADR-007: Servidor de duelo online stateful e autoritativo
**Status:** Aceito
**Data:** 24-07-2026
**ADRs Relacionados:** ADR-001, ADR-002, ADR-003, ADR-005, ADR-009

## 1. Contexto e Declaracao do Problema

O produto exige modo online com validacao
servidor-autoritativa para evitar trapaças. Um duelo e uma
sessao stateful: possui estado em memoria, fluxo de acoes,
janelas de reacao, reconexao e sincronismo. Esse perfil nao
combina com tratar todo o online como funcoes stateless de
persistencia.

A arquitetura decide criar um processo Node.js 24 LTS separado
para duelos online, usando o mesmo motor e o mesmo dataset
autoritativo. Supabase continua responsavel por conta,
persistencia e recursos complementares, enquanto o processo
de duelo mantem a sessao viva e transmite estado ou eventos
autoritativos aos clientes por WebSocket dedicado.

## 2. Direcionadores de Decisao

- O servidor precisa validar cada acao com a mesma regra do
  cliente offline.
- O estado de partida precisa sobreviver ao fluxo interativo
  de uma sessao.
- O cliente nao pode ser autoridade sobre cartas, atributos
  ou resultado.
- Datasets divergentes precisam ser recusados antes do
  duelo.
- Reconexao precisa se apoiar em estado serializavel.
- O transporte da partida precisa suportar conexao persistente,
  baixa latencia e ordenacao explicita das acoes.
- O servidor online deve usar o mesmo runtime LTS fixado pela
  plataforma: Node.js 24 LTS.
- O online deve chegar depois do MVP offline para reutilizar
  motor e dados maduros.

## 3. Opcoes Consideradas

1. Processo Node.js 24 LTS stateful separado com WebSocket
   dedicado para duelo online autoritativo.
2. Funcoes stateless de backend para cada acao de duelo.
3. Supabase Realtime como transporte principal da partida.
4. Modelo peer-to-peer ou cliente-autoritativo.

## 4. Resultado da Decisao

Opcao escolhida: processo Node.js 24 LTS stateful separado
com WebSocket dedicado para duelo online autoritativo, porque
duelos precisam de estado vivo, baixa latencia de validacao,
ordenacao controlada das acoes e uso direto do motor
compartilhado. Essa opcao tambem preserva Supabase para
persistencia, sem forcar o duelo para um modelo inadequado.

O servidor online valida intencoes recebidas por WebSocket,
usa dataset autoritativo, sincroniza os clientes pelo mesmo
canal persistente e rejeita sessoes com versao de dados
divergente. A experiencia offline continua existindo
localmente; o online e uma camada autoritativa sobre o mesmo
dominio.

## 5. Pros e Contras das Opcoes

- Opcao 1: processo Node.js 24 LTS stateful autoritativo com
  WebSocket dedicado.
- Pros: combina com sessoes longas e estado de duelo.
- Pros: reutiliza motor e dados compartilhados.
- Pros: reduz superficie de trapaça do cliente.
- Pros: mantem ordem, reconexao e broadcast de estado sob
  controle do servidor de partida.
- Pros: usa o runtime LTS fixado pela plataforma do monorepo.
- Contras: adiciona um componente operacional alem de
  Supabase.
- Contras: exige desenho de reconexao e sincronismo.
- Contras: precisa gerenciar escala por partidas
  simultaneas.

- Opcao 2: funcoes stateless por acao.
- Pros: reduz operacao de processo dedicado.
- Pros: encaixa melhor em plataforma serverless.
- Contras: torna janelas e estado de duelo mais custosos.
- Contras: aumenta persistencia intermediaria e latencia.
- Contras: complica controle de ordem das acoes.

- Opcao 3: Supabase Realtime como transporte principal da
  partida.
- Pros: aproveita infraestrutura ja escolhida para conta e
  persistencia.
- Pros: pode servir bem a presenca, lobby e notificacoes.
- Contras: nao deve ser a fonte de autoridade da sessao de
  duelo.
- Contras: reduz controle fino sobre ciclo de vida, ordem e
  escala das partidas.
- Contras: mistura responsabilidades de persistencia/sync com
  validacao autoritativa de jogo.

- Opcao 4: peer-to-peer ou cliente-autoritativo.
- Pros: reduz custo de servidor.
- Pros: pode acelerar prototipos locais.
- Contras: nao atende anti-trapaça.
- Contras: dificulta resolver conflitos de estado.
- Contras: quebra confianca em partidas ranqueadas.

## 6. Consequencias

O online fica acoplado ao contrato do motor, ao pacote de
dados versionado e ao protocolo WebSocket da partida.
Mudancas em regras, dataset ou mensagens precisam considerar
compatibilidade de sessao, reconexao e recusa segura de
clientes desatualizados.

Supabase Realtime pode continuar sendo usado para recursos
complementares como lobby, presenca, notificacoes e reflexos
de persistencia, mas nao e o transporte autoritativo da
partida.

A decisao tambem confirma o faseamento: o servidor online
depende de motor, dados, persistencia e economia ja
estabilizados. Construir online cedo sem essas bases
aumentaria retrabalho e risco de divergencia.

## 7. Referencias

- docs/arquitetura.md:15
- docs/arquitetura.md:208
- docs/prds/banco-de-cartas.md:113
- docs/prds/motor-duelo-1x1.md:197
- product.md:183
