# Plano de Implementação — Tela de Detalhe da Carta

> Spec: `./spec.md`

## Pré-requisitos

- **`library`/F01 — Acesso à Coleção do Jogador.** Dependência interna precedente, com spec em
  `docs/specs/library/F01-acesso-a-colecao-do-jogador/`. Fornece o índice, o status de posse, a
  referência de arte, o acesso por número e os estados de carregamento/falha que F05 consome.
- **`library`/F02 — Grade da Coleção.** Dependência interna precedente, com spec em
  `docs/specs/library/F02-grade-da-colecao/`. Fornece a rota `/library/[numero]`, os links das
  células, a variante interceptada em desktop e o padrão de retorno à grade.
- **Contratos externos herdados de F01:** catálogo canônico e resolução de artes
  (`banco-de-cartas`/F03/F04), leitura da coleção (`build-deck`/F01) e Auth/Cadastro. F05 não fala
  diretamente com esses módulos.
- **Contratos externos de mutação:** Password, Campanha, Free Duel e Save escrevem a coleção; F05
  apenas reflete o resultado quando F01 recarrega.
- **F03/F04 da Library** são contratos internos futuros apenas para o Full Scope adiado de
  navegação anterior/próxima. O Core preserva query params no retorno, mas não calcula sequência.
- **Auto-Aceite aplicado:** somente Core Scope. Cópia da senha e navegação anterior/próxima ficam
  adiadas.
- **Pendências de dados externas:** fusões, drops, bônus de terreno e matrizes de guardiões seguem
  fora desta versão; a tela só mostra campos canônicos e guardiões como rótulos.
- **Assets pendentes:** placeholder e silhueta usam o contrato visual já assumido por F01/F02 até
  a direção de arte fornecer versões finais.

## Fase 1: Rota e Estados do Detalhe

**1. Conteúdo das rotas de detalhe** — Preencher a página `/library/[numero]` e a rota interceptada
de desktop com o mesmo conteúdo funcional, mantendo a distinção definida por F02 entre página
cheia em telas pequenas e painel/modal em telas largas.

**2. Fronteira de cliente** — Criar a fronteira que recebe o número da rota, consome o estado da
Library vindo de F01 e decide entre carregando, falha, carta encontrada, carta bloqueada e carta
não encontrada. Essa camada só orquestra estados; os contratos de posse e índice continuam em F01.

**3. Retorno à grade** — Implementar a ação de voltar para a Library, preservando os parâmetros
da URL quando eles existirem e usando `/library` como destino neutro quando não houver origem
específica.

## Fase 2: Apresentação da Carta

**4. Detalhe da carta obtida** — Construir a apresentação completa da carta obtida com arte em
destaque e blocos de identificação, combate, Guardiões Estelares e liberação. Os valores vêm do
schema canônico recebido; a tela não calcula regra nem inventa campos.

**5. Campos vazios e valores indisponíveis** — Tratar valores vazios sem renderizar linhas em
branco e expor estados claros quando senha ou estrelas vierem indisponíveis do catálogo. O objetivo
é preservar a leitura do detalhe sem mascarar problemas de dado.

**6. Estado bloqueado** — Construir a versão para carta não obtida mostrando apenas silhueta,
número e a mensagem de bloqueio. Esse estado não recebe a carta canônica e não pode revelar nome,
tipo, classe, atributos, guardiões, senha ou estrelas.

**7. Responsividade e acessibilidade** — Ajustar o detalhe para 320–1920 px, com foco visível,
alvos de toque adequados, ordem semântica dos blocos e textos que não estouram o contêiner. O
mesmo conteúdo precisa funcionar na página cheia e no painel/modal.

## Fase 3: Integração de Estados e Fronteiras

**8. Mensagens e falhas** — Integrar as mensagens já usadas pela Library para falha de catálogo,
falha de coleção, sessão ausente e cache, acrescentando o estado de carta não encontrada. Nenhum
detalhe parcial deve aparecer quando a fonte de dados falhar.

**9. Portões de fronteira** — Atualizar as verificações estáticas para impedir que F05 acesse
banco, armazenamento local, rede, origem bruta de cartas, tabelas pendentes, engine ou qualquer
operação de escrita/economia.

**10. Cobertura de comportamento** — Cobrir os estados de rota, detalhe completo, detalhe
bloqueado, retorno à grade e critérios Core do PRD com testes de componente e integração. Registrar
também a verificação manual de responsividade e do modal/página cheia, porque jsdom não cobre
layout real.
