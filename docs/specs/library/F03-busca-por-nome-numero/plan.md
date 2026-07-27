# Plano de Implementação — Busca por Nome/Número

> Spec: `./spec.md`

## Pré-requisitos

- **`library`/F02 — Grade da Coleção.** Dependência interna direta, já especificada em
  `docs/specs/library/F02-grade-da-colecao/`. F03 consome a rota, a grade, as células e o contrato
  de que a grade renderiza a sequência recebida sem filtrar nem ordenar por conta própria.
- **`library`/F01 — Acesso à Coleção do Jogador.** Dependência interna transitiva, já especificada
  em `docs/specs/library/F01-acesso-a-colecao-do-jogador/`. Fornece `EntradaLibrary`,
  `IndiceLibrary`, status de posse, progresso e carregamento; F03 não redefine esses contratos.
- **Contratos externos herdados de F01/F02:** catálogo canônico (`banco-de-cartas`/F03), resolução
  de artes (`banco-de-cartas`/F04), coleção do jogador (`build-deck`/F01) e Auth/Cadastro. F03 não
  fala diretamente com eles, mas a tela só funciona quando F01 conseguir materializar a Library.
- **Scaffolding do monorepo e pacotes `rules` e `web`** assumidos das specs anteriores. Esta
  feature acrescenta módulos a esses pacotes; não cria o monorepo.
- **Configuração de testes de componente** introduzida por F02. F03 reusa Vitest,
  @testing-library/react e jsdom para os componentes da busca.
- **Premissas a confirmar por auto-aceite:** busca numérica canônica/exata para 1 a 3 dígitos
  válidos, `0`/`000` sem correspondência, query param `q`, limite de 80 caracteres, filtragem
  imediata sem debounce e substituição de histórico a cada alteração.
- **Sem pendência de dado externo.** Nenhuma matriz de Guardiões, terreno, fusão, drops, rating ou
  balanceamento é consumida; cartas bloqueadas não são pesquisadas por nome.

## Fase 1: Regra de Busca

**1. Normalização do termo** — Criar no subsistema Library de `rules` a normalização responsável
por preparar o texto digitado para comparação, incluindo trim, limite técnico, remoção de acentos,
comparação sem caixa e conversão de termos numéricos curtos para número canônico.

**2. Índice de busca em memória** — Preparar uma visão derivada da sequência recebida pela grade,
mantendo a ordem e as referências originais. O índice deve armazenar nomes normalizados apenas para
cartas obtidas, preservando a redação estrutural definida por F01 para cartas bloqueadas.

**3. Filtragem preservando ordem** — Implementar a projeção que recebe o índice preparado e o termo
normalizado, devolvendo a subsequência correspondente por nome ou número. Termo vazio deve ser
identidade, e cartas bloqueadas só podem casar por número.

## Fase 2: Estado de URL e Controles Web

**4. Contrato de query string** — Criar a fronteira de URL da busca em `apps/web`, validando e
serializando apenas `q` e preservando qualquer parâmetro de F04 ou desconhecido. Limpar busca deve
remover somente `q`.

**5. Campo de busca** — Adicionar o controle no topo da Library, ligado ao estado de URL e com
ação de limpar. A digitação deve atualizar a grade a cada tecla sem remover foco, sem rolar a tela
e sem empilhar histórico por alteração.

**6. Estado de sem resultados** — Acrescentar o estado visual específico da busca sem
correspondência, usando a mensagem do PRD e mantendo a distinção em relação ao estado de coleção
vazia e aos estados de falha herdados de F02.

## Fase 3: Integração com Grade e Navegação

**7. Composição em `library-cliente`** — Integrar a busca ao fluxo existente da tela: carregar a
Library por F01, aplicar o recorte padrão de F02, preparar a busca, filtrar pelo termo de `q` e
entregar a sequência resultante à grade. A composição deve continuar pronta para os filtros de F04
em semântica E.

**8. Navegação e portões de fronteira** — Estender a grade e a célula de forma compatível para
preservar `q` e futuros filtros nos destinos `/library/[numero]`, preparando o contrato de F05.
Atualizar também os portões estáticos para manter a busca sem UI/I/O no pacote de regras, impedir
leituras diretas de `cards-data/`, impedir escritas em `collections`, proteger campos de carta
bloqueada e registrar a verificação de performance em navegador com 722 entradas.
