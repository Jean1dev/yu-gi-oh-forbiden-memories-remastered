YuGiOh Forbiden memories remastered

Context: YuGiOh Forbiden memories foi um jogo de ps1,

iremos recriar o jogo no formato web podendo ser jogavel offline e online, deve ser totalmente responsivo em todo o tipo de tela

funcionamento do jogo

usuario fara cadastro e login para salvar seu processo
O jogo de cartas yugioh (antiga geracao)
    regras do jogo:
        os duelos sao feitos 1x1 e futuramente expandidos para 2x2
        o campo de batalha, consiste em 5 espacos para monstros e 5 espacos para cartas magicas e armadilhas
        cartas de terreno, essa carta muda o tipo do campo que pode ser, campo negro, campo gramado, campo montanha...
        os jogadores devem sempre ter 5 cartas na mao no comeco do turno
        os jogadores devem ter um total de 40 cartas no baralho
        os jogadores tem 8000 pontos de vida, os pontos do jogador que chegar a 0 primeiro o outro jogador ganha
        caso algum jogador zere as cartas do baralho esse jogador perdera a partida
        cada jogador so podera jogar 1 carta por vez, podendo ser um monstro invocado, uma armadilha colocada, uma carta magica ativada ou uma carta de campo
        monstros so podem atacar 1x por turno
        monstros so podem ser colocados em moto de atack e defesa, virado para cima ou virado para baixo
        cartas de monstros podem ser fundidas para formar outras cartas
        os jogadores so poderam ter ate 3 cartas iguais no baralho
        o jogador que jogar o primeiro turno nao eh permitido atacar

tipos de carta:
    cartas monstro: "card": {
        "id": 1, `id da carta`
        "numero": "001", `numero da colecao na library`
        "nome": "Blue-eyes White Dragon", `nome da carta`
        "img": null, `imagem da carta`
        "classe": "Dragon", `classe da carta que eh utilizada para as bonificacoes de terreno, equips, e fusoes`
        "atk": "3000", `pontos de ataque`
        "def": "2500", `pontos de defesa`
        "guardiao1": "Sun", 
        "guardiao2": "Mars",
        "password": "89 63 11 39", `senha para ser liberada na aba passwords`
        "estrelas": "999999", `preco de compra`
        "tipo": "monstro" `tipo de carta`
    }

    cartas armadilhas: elas sao ativadas quando estao no campo e ocorre algum evento, como monstro atacou, monstro foi invado... {
        "id": 681,
        "numero": "681",
        "nome": "House of Adhesive Tape",
        "img": null,
        "classe": "Trap",
        "atk": "",
        "def": "",
        "guardiao1": "",
        "guardiao2": "",
        "password": "15 08 37 28",
        "estrelas": "999999",
        "tipo": "armadilha"
    }

    cartas magicas de equipamento: aumentam o pode de atack de determinados monstros
      "card": {
        "id": 303,
        "numero": "303",
        "nome": "Dark Energy",
        "img": null,
        "classe": "Equip",
        "atk": "",
        "def": "",
        "guardiao1": "",
        "guardiao2": "",
        "password": "04 61 41 16",
        "estrelas": "800",
        "tipo": "equipamento"
    }

    cartas magicas de terreno, auteram o tipo de campo
       "card": {
        "id": 333,
        "numero": "333",
        "nome": "Sogen",
        "img": null,
        "classe": "Magic",
        "atk": "",
        "def": "",
        "guardiao1": "",
        "guardiao2": "",
        "password": "86 31 83 56",
        "estrelas": "55",
        "tipo": "magica"
    }

    cartas magicas de efeito, realizam algum efeito no campo
     "card": {
        "id": 337,
        "numero": "337",
        "nome": "Raigeki",
        "img": null,
        "classe": "Magic",
        "atk": "",
        "def": "",
        "guardiao1": "",
        "guardiao2": "",
        "password": "12 58 04 77",
        "estrelas": "999999",
        "tipo": "magica"
    }


O menu do jogo tera as seguintes opcoes, cada uma delas tera sua propria sessao
    Campanha
    Free Duel
    Online Duel
    Build Deck
    Library
    Password
    Save