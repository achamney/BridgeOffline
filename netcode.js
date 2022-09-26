window.netService = {
    getGameState: function () { },
    setGameState: function (gs, callback) { }
}
function JsonBoxyService() {
    var MASTERURL = location.protocol+"//achamney.pythonanywhere.com/";
    var mainGame = "bridgedata";
    this.setGameState = function (gamestate, callback) {
        $.ajax({
            url: MASTERURL+"set/"+mainGame,
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
    this.makeNewGame = async function() {
        try {
          var data = await $.ajax({
              url: MASTERURL+"make",
              type: "POST",
              contentType: "application/json; charset=utf-8",
              dataType: "json",
              success: function (data, textStatus, jqXHR) {
              }
          });
        } catch (e) {
          console.log(e);
        }
        return data;
    }
}

window.netService = new JsonBoxyService();

function MockNetService() {
    this.getGameState = function () {

    }
    this.setGameState = function () {

    }
}
