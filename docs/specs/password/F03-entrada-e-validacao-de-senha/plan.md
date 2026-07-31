# Plano de Implementação — Entrada e Validação de Senha

> Spec: `./spec.md`

## Pré-requisitos

- **Banco de cartas (infra Fase 0) — pronto.** `CardCatalog.findByPassword`, o índice `byPassword` e
  o sentinela `"Indisponível"` já resolvido para `null` estão implementados em `packages/data`.
  `packages/data/generated/` precisa estar construído (`data:validate` grava o selo que o loader lê
  antes de tudo), o que as tarefas turbo de `dev`/`build`/`test` já garantem.
- **Carteira de estrelas (`password` F01 e F02) — pronta.** Implementadas por `free-duel/F07` sob a
  unificação de `docs/arquitetura.md` §5.3: tabela `wallets`, RPC `apply_victory_reward`
  (migração `0008`), `loadWalletBalance` com fallback servidor→cache e o cache IndexedDB de saldo.
  Esta feature apenas lê; nenhuma migração nova.
- **Resolução de artes (`banco-de-cartas` F04) — pronta.** O `CardArtLookup` já composto é reusado
  para o preview.
- **Correção do PRD assumida (Decisão 4 da spec):** são **698** cartas resolvíveis por senha e
  **24** sem senha, não "722 e 99". O critério de aceite correspondente da Seção 9 do
  `docs/prds/password.md` está desatualizado e deve ser lido conforme a spec.
- **Regra do PRD inalcançável por esta tela (Decisão 5):** o fallback de `999999⭐` para preço
  ausente é implementado como função total, mas nenhuma carta chega a ele por senha, porque as 24
  sem preço são exatamente as 24 sem senha.
- **Pendência deixada para F04:** promover o item `password` do menu principal de `"soon"` para
  `"ready"` com `href: "/password"`, e habilitar o botão "Liberar".
- **Pendência de balanceamento (não bloqueia):** `N` estrelas por vitória e saldo inicial seguem
  indefinidos. F03 exibe o saldo que existir e não depende desses valores.

## Fase 1: Contratos e regras puras

**1. Constantes e tipos de economia em `shared`** — Declarar o preço de fallback, o número de
dígitos de uma senha e o teto defensivo do campo, junto das uniões que descrevem a entrada
normalizada, o preço resolvido, o veredito de pagamento e o resultado da resolução. Incluir o port
de lookup por senha, para que as regras nunca precisem conhecer o catálogo.

**2. Normalização da entrada** — Implementar a função pura que transforma o que o jogador digitou
no código canônico que o catálogo aceita, distinguindo entrada vazia, caractere inválido e
quantidade errada de dígitos. É o que faz o PRD ("com ou sem espaços") conversar com o formato
rígido publicado por `banco-de-cartas`.

**3. Precificação da carta** — Implementar a função total que deriva o preço em estrelas do campo
`estrelas`, marcando explicitamente quando o valor veio do catálogo e quando veio do fallback.
Preservar preço zero como valor legítimo, distinto de ausência.

**4. Veredito de poder de compra** — Implementar a comparação entre preço e saldo com três
desfechos, incluindo o estado explícito de saldo desconhecido, que existe para que a tela nunca
anuncie que o jogador pode pagar quando a carteira não pôde ser lida.

**5. Composição da resolução** — Encadear normalização, consulta ao port, precificação e veredito
numa única função pura, garantindo que uma entrada malformada nunca chegue a consultar o índice.
Exportar o subdomínio pelo barril de `rules`.

## Fase 2: Fronteira servidor→cliente

**6. Forma serializável do catálogo de senhas** — Declarar, em módulo próprio e sem qualquer
import de filesystem, a forma que atravessa a fronteira como prop, para que os módulos de cliente
possam nomeá-la sem arrastar `node:fs` para o bundle.

**7. Montagem e reidratação do payload** — Escrever a função de servidor que achata o catálogo
selado, mantendo apenas as cartas que têm senha e resolvendo a arte de cada uma, e a contraparte de
cliente que reconstrói o índice de busca e o resolvedor de arte. Memoizar o payload por catálogo,
como a Library já faz, e tratar chave herdada e arte ausente sem quebrar o preview.

**8. Leitura do catálogo selado para esta rota** — Compor o acesso ao catálogo memoizado do
processo com o resolvedor de artes, num módulo explicitamente server-only, sem introduzir uma
segunda leitura de disco.

## Fase 3: Tela `/password`

**9. Adaptador React da carteira** — Criar o hook que carrega o saldo pela camada já existente de
F01 e reporta carregando, pronto (com a origem servidor ou cache) e indisponível, sem jamais
assumir saldo zero quando a leitura falha.

**10. Estado da busca** — Criar o hook que guarda o texto digitado, executa a resolução no envio
explícito e expõe a resolução corrente, substituindo integralmente a anterior a cada nova busca.

**11. Mensagens do módulo** — Reunir num mapa único, em Português, os textos das duas rejeições de
senha, do aviso de cache, das falhas de catálogo e carteira e dos rótulos do preview, seguindo o
padrão já adotado por Library e Build Deck.

**12. Componentes da tela** — Construir o cabeçalho persistente de saldo com o aviso de
sincronização, o campo de senha com envio por botão e por tecla, o preview da carta com arte, nome,
tipo, classe, preço, saldo e o botão de liberar renderizado desabilitado, além dos estados de
falha. Garantir refluxo sem scroll horizontal de 320 a 1920 px.

**13. Rota e composição** — Criar o Server Component que monta o payload e o componente de cliente
que orquestra os estados da tela, mantendo o cabeçalho de saldo visível inclusive nos estados de
erro de busca. Não alterar o item do menu principal — isso é entrega de F04.

## Fase 4: Verificação

**14. Testes das regras puras** — Cobrir os casos e as propriedades da normalização, da
precificação, do veredito e da composição, incluindo as fronteiras que a spec nomeia: igualdade
entre saldo e preço, preço zero, saldo desconhecido e entrada que nunca deve alcançar o índice.

**15. Testes da fronteira e da tela** — Cobrir o round-trip do payload, os estados dos dois hooks e
o render dos estados da tela, e afirmar por análise de imports que as regras não alcançam o
catálogo e que o cliente não alcança o filesystem.

**16. Integração contra o catálogo real** — Verificar o fluxo digitar→resolver→preview sobre o
catálogo selado em disco, provar que todas as cartas com senha resolvem sem colisão, que as cartas
sem senha nunca aparecem nem resolvem, e medir o tempo de resposta da busca.
