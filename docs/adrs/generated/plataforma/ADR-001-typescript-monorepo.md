# ADR-001: TypeScript em monorepo com Node.js 24 LTS para logica compartilhada
**Status:** Aceito
**Data:** 24-07-2026
**ADRs Relacionados:** ADR-002, ADR-003, ADR-004, ADR-007, ADR-008

## 1. Contexto e Declaracao do Problema

O jogo precisa rodar como uma experiencia web responsiva,
com suporte offline e online. Os PRDs tambem exigem que a
mesma regra de duelo seja usada no cliente offline e no
servidor autoritativo, sem divergencia entre modos. Essa
restricao cria uma pressao arquitetural clara: contratos,
dados e logica de regras precisam ser compartilhados sem
traducao manual entre runtimes.

A arquitetura consolidada trava TypeScript ponta-a-ponta e
organiza o projeto em um monorepo com pacotes separados por
responsabilidade. Essa escolha busca impedir duplicacao de
regras, tornar os pacotes puros testaveis isoladamente e
permitir evolucao incremental por fase. A alternativa de
separar stacks ou repositorios aumentaria a chance de drift
entre cliente, servidor, dados e motor.

O runtime de desenvolvimento, build, scripts de dados e
servidor online fica fixado em **Node.js 24 LTS**. Versoes
Current, EOL ou divergentes entre ambientes nao devem ser usadas
como alvo do projeto.

## 2. Direcionadores de Decisao

- A mesma logica de duelo precisa executar no navegador e no
  servidor autoritativo.
- Os contratos entre dados, regras, motor, IA, web e
  servidor devem evoluir juntos.
- O motor precisa permanecer isolado de UI, rede e
  persistencia.
- Builds e testes devem ser incrementais para suportar
  pacotes independentes.
- A equipe precisa reduzir traducao manual entre modelos de
  dados e regras.
- O runtime precisa ser LTS, estavel e compartilhado por CI,
  desenvolvimento local, pipeline de dados e servidor online.

## 3. Opcoes Consideradas

1. TypeScript ponta-a-ponta em monorepo com Node.js 24 LTS,
   workspaces e orquestracao de build.
2. Frontend em TypeScript e backend em outra linguagem.
3. Repositorios separados por aplicacao ou modulo.
4. TypeScript em monorepo sobre versao Current ou EOL do Node.

## 4. Resultado da Decisao

Opcao escolhida: TypeScript ponta-a-ponta em monorepo com
Node.js 24 LTS, workspaces e orquestracao de build, porque
essa estrutura preserva uma unica linguagem para o motor
compartilhado, contratos comuns para os modulos, runtime
estavel e isolamento fisico entre pacotes.

O monorepo passa a ser a unidade de arquitetura do produto.
As aplicacoes web e servidor consomem pacotes
compartilhados, enquanto regras, dados e motor mantem
fronteiras explicitas.

## 5. Pros e Contras das Opcoes

- Opcao 1: TypeScript em monorepo.
- Pros: reduz divergencia entre cliente e servidor.
- Pros: permite contratos compartilhados sem adaptadores
  duplicados.
- Pros: favorece testes isolados e build incremental.
- Pros: fixa Node.js 24 LTS como alvo comum para local, CI,
  scripts e servidor online.
- Contras: exige disciplina de dependencias entre pacotes.
- Contras: concentra a estrategia de tooling em um unico
  ecossistema.
- Contras: erros de fronteira podem se espalhar se o
  monorepo nao tiver verificacao automatica.

- Opcao 2: frontend TypeScript e backend em outra linguagem.
- Pros: permite escolher tecnologia backend por
  especialidade operacional.
- Pros: pode aproveitar bibliotecas maduras fora do
  ecossistema TypeScript.
- Contras: duplica contratos ou exige geracao de tipos.
- Contras: aumenta risco de divergencia no motor
  autoritativo.
- Contras: torna replays e validacao cruzada mais caros de
  manter.

- Opcao 3: repositorios separados por aplicacao ou modulo.
- Pros: ciclos de release independentes.
- Pros: fronteiras de ownership ficam mais rigidas.
- Contras: aumenta coordenacao entre mudancas de dados,
  regras e UI.
- Contras: dificulta mudancas atomicas em contratos
  compartilhados.
- Contras: eleva o custo de onboarding e validacao local.

- Opcao 4: TypeScript em monorepo sobre versao Current ou EOL
  do Node.
- Pros: pode acessar recursos novos mais cedo se usar Current.
- Pros: pode parecer conveniente em maquinas ja configuradas.
- Contras: aumenta risco de incompatibilidade entre local, CI
  e deploy.
- Contras: versoes EOL deixam de receber manutencao regular.
- Contras: versoes Current nao sao o alvo mais conservador para
  producao.

## 6. Consequencias

Todos os pacotes compartilhados precisam preservar direcao
de dependencia estavel. Dados e regras ficam abaixo do
motor; web e servidor ficam como consumidores. Esse desenho
torna facil detectar acoplamento indevido, mas exige
verificacoes regulares para impedir imports proibidos.

A decisao tambem torna TypeScript uma restricao para
qualquer componente que precise participar diretamente da
regra de duelo ou dos contratos de dados. Integracoes
externas continuam possiveis, mas entram pelas bordas e nao
dentro do nucleo compartilhado.

O repositorio deve declarar Node.js 24 LTS nos arquivos de
tooling aplicaveis, como `package.json` (`engines`),
`.nvmrc` ou `.node-version`, quando a implementacao do
monorepo for criada.

## 7. Referencias

- docs/arquitetura.md:12
- docs/arquitetura.md:36
- docs/arquitetura.md:39
- docs/arquitetura.md:61
- docs/prds/motor-duelo-1x1.md:60
