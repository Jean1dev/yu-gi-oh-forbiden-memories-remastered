# Plano de Implementação — Modelo de Estado do Duelo

> Spec: `./spec.md`

## Pré-requisitos

- **Scaffolding do monorepo** criado por `banco-de-cartas`/F01 (pnpm workspaces, Turborepo,
  TypeScript strict, Node.js 24 LTS, `packages/shared` com o subsistema `carta/`). Esta feature
  acrescenta um novo subsistema a `packages/shared`; não recria o scaffolding.
- **Contrato externo — `Carta`/`CartaSchema` (`banco-de-cartas`/F01).** Tem spec, ainda sem
  implementação. É reusado sem redefinição — nenhuma cópia paralela do schema canônico de 12
  campos.
- **Nenhuma dependência interna do próprio PRD.** F01 tem `Dependências: None` na tabela do PRD
  §8 e é, junto de F02, a Foundation do módulo; F02–F12 dependem dela, não o contrário.
- **Decisões de desenho confirmadas na entrevista:** zonas como estrutura de tamanho fixo (5
  posições) com vazio/ocupado mutuamente exclusivos; zona de magia/armadilha com forma própria,
  mais simples que a de monstro; baralho com o topo no início da lista.
- **Sem pendência de dado externo.** Nenhuma tabela de guardiões, terrenos, fusões, drops, rating
  ou balanceamento é tocada por esta feature.

## Fase 1: Forma do estado

**1. Identidade dos jogadores, fase do turno e posição de monstro** — Definir os três vocabulários
fechados de valores que atravessam toda a feature: o identificador de cada lado do duelo, a fase
corrente do turno e as quatro combinações de ataque/defesa × face-cima/face-baixo, usando
exatamente os termos já travados pelo PRD e por `arquitetura.md`.

**2. Zonas de monstro e de magia/armadilha** — Modelar cada uma das duas zonas do campo como um
valor que só pode estar vazio ou ocupado, de forma que uma zona vazia nunca carregue carta,
posição ou flags de turno, e uma zona ocupada nunca deixe de carregá-los.

**3. Campo e estado por jogador** — Agrupar as cinco zonas de cada tipo numa estrutura de campo
com identidade fixa por posição, e reunir LP, mão, baralho e campo num único objeto por jogador.

**4. Estado global do duelo** — Agregar os dois jogadores, o terreno ativo, quem está com o turno,
o número do turno e a fase corrente num único objeto de estado, registrando explicitamente no
próprio arquivo quais campos ficam de fora desta feature e a qual feature futura cada um pertence.

## Fase 2: Validação e constantes

**5. Validação de fronteira espelhando a forma do estado** — Construir, para cada estrutura da
Fase 1, a validação correspondente capaz de aceitar um estado bem formado e rejeitar cada violação
das invariantes do jogo (contagem de zonas, obrigatoriedade dos campos de zona ocupada, limites de
LP e de turno).

**6. Constantes do domínio** — Extrair os números fixos do jogo usados por esta feature como
valores exportados e reutilizáveis, em vez de literais espalhados pelo código de quem vier a
consumi-los.

**7. Export público do pacote** — Tornar o novo subsistema acessível pelo ponto de entrada público
do pacote, na mesma convenção já usada pelos subsistemas existentes.

## Fase 3: Garantias e verificação

**8. Portão de análise estática** — Estender a verificação de fronteira de pacotes para impedir que
este novo subsistema importe de qualquer pacote além do próprio, ou de qualquer biblioteca de
interface/IO — adiantando a garantia de "motor sem UI" antes mesmo do pacote do motor existir.

**9. Testes unitários da validação** — Cobrir a aceitação de um estado bem formado e a rejeição
individual de cada violação de invariante descrita na spec.

**10. Testes de propriedade das invariantes estruturais** — Cobrir por geração aleatória a
invariante de contagem fixa de zonas e a preservação do valor original de ataque/defesa ao inserir
qualquer carta válida numa zona ocupada.
