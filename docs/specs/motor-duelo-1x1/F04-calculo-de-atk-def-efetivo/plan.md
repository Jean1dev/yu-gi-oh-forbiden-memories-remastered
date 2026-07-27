# Plano de Implementação — Cálculo de ATK/DEF Efetivo

> Spec: `./spec.md`

## Pré-requisitos

- **Specs de `motor-duelo-1x1`/F01** (`EstadoDuelo`, `terrenoAtivo`), ainda sem implementação.
  Esta feature apenas lê esses contratos; não os altera.
- **`Carta`** de `banco-de-cartas`/F01, reusado sem redefinir.
- **Nenhuma dependência cross-PRD bloqueante.** GuardianStar Engine, Terrain Engine e Effect System
  ainda não têm PRD. Esta feature entrega apenas as portas e as implementações neutras — não
  bloqueia esperando aquelas engines.
- **Decisões de desenho confirmadas na entrevista:** a lacuna entre `product.md` e o PRD (escolha
  de guardião; alvo de equipamento) é resolvida com portas neutras usando só os dados já
  existentes, sem estender o estado agora; o cálculo aceita um oponente opcional para o
  modificador relacional de guardião.
- **Pendência de dado externo registrada, não bloqueante:** as tabelas de Guardião (10×10) e
  Terreno (~24 classes) não existem. O caminho neutro (modificador sempre 0) é o comportamento
  padrão desta feature, não uma exceção a tratar depois.

## Fase 1: Contratos das portas de modificador

**1. Forma do resultado e das três portas** — Definir o formato comum de um delta de ATK/DEF e a
assinatura de cada uma das três fontes de modificador (guardião, terreno, equipamento), cada uma
recebendo apenas os dados já disponíveis hoje, sem antecipar nenhum campo de estado que ainda não
existe.

## Fase 2: Implementações placeholder em rules

**2. Subsistemas placeholder por modificador** — Criar, dentro do pacote de regras, um subsistema
para cada uma das três fontes cross-PRD, cada um contendo por enquanto só a implementação neutra
que nunca altera o resultado — o comportamento padrão até que cada engine real exista.

**3. Bundle de conveniência** — Reunir as três implementações neutras num único agrupamento pronto
para ser injetado por quem for chamar o cálculo antes de qualquer engine real existir.

## Fase 3: Composição pura do cálculo

**4. Função de composição** — Implementar a função que lê o poder base do monstro, consulta as três
portas recebidas por injeção e soma os resultados, sem alterar nenhum dos argumentos recebidos e
sem exigir que o monstro tenha necessariamente valores base preenchidos.

## Fase 4: Garantias e verificação

**5. Portão de análise estática dos novos subsistemas** — Confirmar que os três subsistemas
placeholder do pacote de regras não importam nada além do pacote compartilhado, e que o novo
subsistema do motor continua livre de qualquer biblioteca de interface, rede ou persistência.

**6. Testes unitários das implementações neutras** — Cobrir que cada uma das três portas neutras
sempre devolve o resultado nulo, independentemente do que receber como entrada.

**7. Testes unitários da composição** — Cobrir a soma da base com os três deltas, o tratamento de
valores base ausentes, a passagem correta do oponente opcional ao provedor de guardião, e a
ausência de mutação nos argumentos recebidos.

**8. Testes de propriedade da neutralidade e da composição** — Cobrir por geração aleatória que o
conjunto de provedores neutros sempre preserva o valor base inalterado, e que a composição final é
sempre a soma exata dos quatro termos, para qualquer combinação de deltas informados pelos
provedores.
