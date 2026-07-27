# Plano de Implementação — Resolução de Artes das Cartas

> Spec: `./spec.md`

## Pré-requisitos

- **Depende de F03 (Serviço de Catálogo de Cartas)**, que já tem spec em
  `docs/specs/banco-de-cartas/F03-servico-de-catalogo-de-cartas/`. A implementação assume que
  `criarCatalogo`/`carregarCatalogoDoDisco` já existem e que `CatalogoCartas.obterManifestoArtes()`
  já devolve o `ManifestoArtes` carregado por F01.
- **Nenhum contrato externo cross-PRD é consumido.** F04 é fornecedora para F09 (interno) e,
  cross-PRD, para Library, Build Deck e Motor de Duelo 1x1.
- **Compatibilidade a preservar, não um bloqueio:** `docs/specs/library/F01-.../spec.md` já
  assumiu uma interface provisória `ResolucaoArte` para esta feature, antes de ela existir. O
  contrato real definido na spec (`ResolvedorArtes`) foi desenhado como superconjunto estrutural
  compatível — nenhuma edição na spec da Library é necessária ou está no escopo deste plano.
- **Pendência de asset herdada de F02:** o arquivo de imagem do placeholder padrão ainda não
  existe no repositório. Não bloqueia a implementação de código desta feature — o dataset real
  (722 cartas ↔ 722 artes) nunca exercita o caminho de fallback hoje; os testes cobrem esse
  caminho com fixtures sintéticas.
- **Nenhuma tabela de dado externo pendente (F05–F08) é tocada.**

## Fase 1: Núcleo puro de resolução em `packages/data`

**1. Tipos do resolvedor de arte** — Declarar a estrutura de referência de arte resolvida e a
interface pública de resolução, reaproveitando os tipos de carta e a constante de placeholder já
existentes em `packages/shared`, sem alterar nada lá.

**2. Função pura de resolução por número** — Implementar a resolução que aceita a carta inteira ou
apenas o seu número, consulta o manifesto de artes já carregado e devolve sempre uma referência
utilizável, caindo no placeholder padrão sem exceção quando a arte não estiver presente.

**3. Fábricas de resolvedor** — Implementar a fábrica que fecha sobre um manifesto de artes já
carregado, e a variante de conveniência que extrai esse manifesto diretamente do catálogo de F03,
seguindo o mesmo padrão de fábrica imutável já usado no serviço de catálogo.

## Fase 2: Verificação de fronteira e aceite

**4. Verificação de fronteira de pacote** — Estender a análise estática de F01/F02/F03 para cobrir
o novo subsistema de artes, confirmando que ele não importa nenhuma API de I/O nem qualquer pacote
acima de `data` na direção de dependências.

**5. Verificação de compatibilidade cross-PRD** — Confirmar que a assinatura pública do resolvedor
é estruturalmente compatível com a interface já assumida pela spec de `library/F01`, deixando
essa checagem registrada para quando Build Deck e Motor de Duelo 1x1 também consumirem esta
feature.

**6. Verificação de aceite contra o catálogo real** — Executar a resolução sobre o dataset real
carregado via F01+F02+F03 e confrontar com os critérios de aceite do PRD: paridade 722↔722 sem
nenhuma carta caindo em placeholder, ausência total de I/O no núcleo, e o comportamento de
fallback simulado com uma carta removida artificialmente do manifesto em memória.
