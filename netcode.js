window.netService = {
    getGameState: function () { },
    setGameState: function (gs, callback) { }
}
window.setInterval(()=>{
  //netService.getGameState();
},5000);
function JsonBoxyService() {
    var MASTERURL = location.protocol+"//achamney.pythonanywhere.com/";
    var mainGame = "";
    this.setGameState = function (gamestate, callback) {
        $.ajax({
            url: MASTERURL+"set",
            type: "POST",
            data: JSON.stringify(gamestate),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                var uri = data["_id"];
                console.log(uri);
                if (callback)
                    callback();
            }
        });
    }
    this.getGameState = async function() {
        return await $.get(MASTERURL+mainGame);
    }
    this.makeNewGame = function() {
        $.ajax({
            url: MASTERURL+"set",
            type: "POST",
            data: JSON.stringify({}),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data, textStatus, jqXHR) {
                var uri = data["_id"];
                console.log(uri);
            }
        });
    }
}

window.netService = new JsonBoxyService();

function MockNetService() {
    this.getGameState = function () {
        if (gamestate.curPlayerName != myPlayer.name) {
            var player = gamestate.players.filter(p => p.name == gamestate.curPlayerName)[0];
            if (gamestate.time > 0) {
                var clueCard = gamestate.players[0].cards[0],
                    clueType = "clueColor",
                    clueDereference = "color",
                    cardInd = 0;
                while (clueCard[clueType]) {
                    if (clueType == "clueColor") {
                        clueType = "clueNumber";
                        clueDereference = "num";
                    } else {
                        clueType = "clueColor";
                        clueDereference = "color";
                        cardInd++;
                        if (cardInd == 4) {
                            break;
                        }
                        clueCard = gamestate.players[0].cards[cardInd];
                    }
                }
                for (var card of gamestate.players[0].cards) {
                    if (card[clueType] == clueCard[clueType]) {
                        card[clueType] = card[clueDereference];
                    }
                }
                gamestate.time--;
                advanceTurn();
            } else {
                var discardCard = player.cards[0];
                discardThisCard(discardCard);
            }

        }
        return gamestate;
    }
    this.setGameState = function () {

    }
}
