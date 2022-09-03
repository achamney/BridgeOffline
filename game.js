
var gamestate = {
    deck: [],
    center: {},
    discards: [],
    players: [],
    log: [],
    curPlayerName: "",
    contract: [],
    playStage:0
}, myPlayer;
var suitToIcon={1:"&clubs;",0:"&diamond;",2:"&hearts;", 3:"&spades;", 4:"NT"};
var suitToColor={1:"black",0:"red",2:"red", 3:"black"};
var valueToCardNum={2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:"J",12:"Q",13:"K",14:"A"};

window.onload = function () {
    $("#newName").keyup(function (event) {
        if (event.keyCode === 13) {
            $("#addButton").click();
        }
    });
    $("#myName").keyup(function (event) {
        if (event.keyCode === 13) {
            $("#joinButton").click();
        }
    });
    var name = getParams().name;
    if (name) {
      get("myName").value = name;
      joinGame();
    }
}
function addName() {
    var newName = get('newName');
    if (newName.value.length == 0)
        return;
    gamestate.players.push({ cards: [], name: newName.value, tricks: 0 });
    get("nameHolder").innerHTML += `<li>${newName.value}</li>`;
    newName.value = "";
}
function addComputer() {
    var newName = get('newName');
    if (newName.value.length == 0)
        return;
    gamestate.players.push({ cards: [], name: newName.value, ai: true, tricks: 0 });
    get("nameHolder").innerHTML += `<li>${newName.value}</li>`;
    newName.value = "";
}
async function joinGame() {
    window.gamestate = await netService.getGameState();
    window.gamestate = JSON.parse(window.gamestate);
    var myPlayerName = get("myName").value;
    var fetchedPlayer = gamestate.players.filter(p => p.name == myPlayerName)[0];
    if (!fetchedPlayer) {
        alert("Cannot Find Player, Refresh and Try Again");
        return;
    }
    myPlayer = clone(fetchedPlayer);

    watchGameState();
    drawGameState();
}
function makeGameState() {
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 13; j++) {
            gamestate.deck.push({ value: j+2, suit: i });
        }
    }
    for (var i = 0; i < 10; i++) {
        gamestate.deck.sort((a, b) => { return Math.random() * 3 - 1; });
    }
    myPlayer = clone(gamestate.players[0]);
    gamestate.curPlayerName = myPlayer.name;
    var humanPlayerNum = gamestate.players.length;
    for(var i=0;i<4-humanPlayerNum;i++) {
      gamestate.players.push({ cards: [], name: "AI"+(i+1), ai: true, tricks: 0 });
    }
    var numCardsToDraw = 13;
    for (var player of gamestate.players) {
      for (var i = 0; i < numCardsToDraw; i++) {
        var card = gamestate.deck.pop();
        player.cards.push(card);
      }
      player.cards.sort((a, b)=>(b.suit*13+b.value)-(a.suit*13+a.value));
    }
    netService.setGameState(gamestate);
    drawGameState();

    watchGameState();
}
function watchGameState() {
    window.watchInterval = window.watchInterval || window.setInterval(async function () {
      var curPlayer = gamestate.players.filter(p => p.name == gamestate.curPlayerName)[0];
      if (gamestate.players[0].name == myPlayer.name && curPlayer.ai) {
        runAI();
      }
      if (gamestate.curPlayerName != myPlayer.name) {
          if(curPlayer.ai && gamestate.players[0].name==myPlayer.name){
            //runAI();
          } else {
            window.gamestate = await netService.getGameState();
            window.gamestate = JSON.parse(window.gamestate);
            drawGameState();
          }

      }
    }, 2000);
}
function drawGameState() {
    var main = get("main");
    var curPlayerId = getPlayerIndByName(gamestate.curPlayerName);
    get("playerButtons").style['display']=
      (gamestate.curPlayerName==myPlayer.name ||
        (gamestate.players[curPlayerId].board && gamestate.players[getOppositePlayerIdByName(gamestate.curPlayerName)].name == myPlayer.name))
      &&gamestate.playStage==1?"block":"none";
    get("aiRunButton").style['display']=gamestate.players[0].name==myPlayer.name?"block":"none";
    main.innerHTML = "";

    var center = makesq("div", main, "block centerboard", "160px", "120px", "590px", "340px");
    for (var i = 0; i < gamestate.deck.length; i++) {
        var card = gamestate.deck[i];
        makeCard(card, center, i * 0.5 + 450, (i * -1) + 120, false);
    }
    myPlayer.cardDoms = [];
    var translatePos = [{ x: "250px", y: "500px", rot: 0 },
    { x: "-150px", y: "200px", rot: "90deg" },
    { x: "250px", y: 0, rot: "0" },
    { x: "600px", y: "200px", rot: "90deg" }];
    var startInd = gamestate.players.indexOf(gamestate.players.filter(p => p.name == myPlayer.name)[0]);
    for (var i = 0; i < gamestate.players.length; i++) {
        var player = gamestate.players[startInd];
        var playerBoard = makesq("div", main, "block playerboard board"+player.name, 0, 0, "480px", "120px");
        if (player.name == gamestate.curPlayerName) {
            playerBoard.style["background-color"] = "#FFA";
        }
        make("span", playerBoard, "playerName").innerHTML = player.name;
        playerBoard.style.transform = `translate(${translatePos[i].x},${translatePos[i].y}) rotate(${translatePos[i].rot})`

        for (var j = 0; j < player.cards.length; j++) {
            var pcard = player.cards[j];
            var pcarddom = makeCard(pcard, playerBoard,j*30, 0, player.name == myPlayer.name || player.board);
            pcarddom.card = pcard;
            if (player.name == myPlayer.name || player.board) {
                myPlayer.cardDoms.push(pcarddom);
                pcarddom.onclick = clickPlayerCard;
            }
        }
        var centerOffset = [{l:0,t:50},{l:-100,t:0},{l:0,t:-50},{l:100,t:0}];
        var centerCard = gamestate.center[startInd];
        if (centerCard) {
          makeCard(centerCard, main, centerOffset[i].l + 400,centerOffset[i].t+ 230, true);
        }
        startInd++;
        if (startInd == gamestate.players.length) {
            startInd = 0;
        }
    }
    var logBody = makesq("div", main, "block playerboard logbody", "1000px", "100px", "250px", "440px");
    for (var log of gamestate.log) {
        logBody.innerHTML += `${log}<br>`;
    }
    logBody.scrollTop = logBody.scrollHeight;
    if (gamestate.playStage == 0) {
      drawContract(main);
    }
}
function drawContract(main) {
  drawContractState(main);
  var contractButtons = makesq("div", main, "block playerboard contractbuttons", "220px", "320px", "500px", "100px");
  if (myPlayer.name == gamestate.curPlayerName) {
    var passBtn = makesq("button", main,"block btn btn-secondary","640px", "320px", "60px", "30px");
    passBtn.innerHTML = "PASS";
    passBtn.onclick = passAndAdvanceTurn;
    var bidbtn = makesq("button", main,"block btn btn-primary","640px", "370px", "60px", "30px");
    bidbtn.innerHTML = "Bid";
    bidbtn.onclick = bidAndAdvanceTurn;
  }
  for(var j=0;j<5;j++) {
    for(var i=0;i<7;i++) {
      makeContractButton(contractButtons, i,j);
    }
    make("br",contractButtons);
  }
  var dbl = makeContractButton(contractButtons,10,10);
  dbl.innerHTML = "DBL";

}
function drawContractState(main) {
  var contractState = makesq("div", main, "block playerboard", "220px", "140px", "500px", "170px");
  gamestate.players.forEach((p,i)=>{
    makesq("span", contractState, "playerName", i*120).innerHTML = p.name;
  });
  gamestate.contract.forEach((c, i) => {
    makesq("span", contractState, "block bid", (i%4)*120,30+30*Math.floor((i+1)/4)).innerHTML = c.text;
  });
}
function makeContractButton(contractButtons,i,j) {
  var btn = make("button", contractButtons,"btn btn-secondary");
  btn.suit = j;
  btn.contractVal = i;
  btn.innerHTML = suitToIcon[j]+(i+1);
  btn.style.color=suitToColor[j];
  if(contractIsAvailable(j,i)) {
    btn.onclick = function(){
      $(".contractbuttons .btn").removeClass("selected");
      btn.classList.add("selected");
      window.bid = {suit: j, val: i, dbl: i==10, player: getPlayerIndByName(gamestate.curPlayerName),
        text: i==10?"DBL":suitToIcon[j]+(i+1), name: gamestate.curPlayerName};
    }
  } else {
    btn.style['background-color']="#444";
  }
  return btn;
}
function contractIsAvailable(suit, val) {
  for (var c of gamestate.contract) {
    if(c.pass) continue;
    if (val < c.val) {
      return false;
    } else if (c.val == val && c.suit==4){
      return false;
    } else if (c.val == val && c.suit==3){
      if (suit <=3)
        return false;
    } else if (c.val == val && c.suit == 2) {
      if (suit ==0 || suit ==1 || suit==2)
        return false;
    } else if (c.val == val && c.suit == 1) {
      if (suit ==1)
        return false;
    } else if (c.val == val && c.suit == 0) {
      if (suit ==0 || suit ==1)
        return false;
    }
  }
  return true;
}
function getOppositePlayerIdByName(name) {
  var ind = getPlayerIndByName(name);
  ind +=2;
  if (ind >=4) {
    ind-=4;
  }
  return ind;
}
function getParams() {
  var search = window.location.search;
  search = search.substr(1,search.length); // remove ?
  var split = search.split("=");
  var ret = {};
  ret[split[0]]=split[1];
  return ret;
}
function clickPlayerCard() {
    for (var card of myPlayer.cardDoms) {
        card.selected = false;
        card.style.outline = "none";
    }
    $(".playcard").removeClass("selected");
    this.selected = true;
    this.classList.add("selected");
    this.style.outline = "4px solid blue";
}
function openContract() {
    var modal = get("myModal");
    modal.style.display = "block";
    drawContractState(get("modaltext"));
}
function playCard() {
    var carddom = $(".board"+gamestate.curPlayerName+" .playcard.selected")[0];
    if (!carddom ) {
        return;
    }
    var gsPlayer = gamestate.players.filter(p => p.name == gamestate.curPlayerName)[0];
    playThisCard(carddom.card, gsPlayer);
}
function playThisCard(card,gsPlayer) {
  var playerInd = gamestate.players.indexOf(gsPlayer);
  gsPlayer.cards.splice(gsPlayer.cards.indexOf(card), 1);
  gamestate.center[playerInd] = card;
  gamestate.log.push(`${gamestate.curPlayerName} plays ${suitToIcon[card.suit]}${valueToCardNum[card.value]}`);

  window.setTimeout(function(){
    var allplayed = 0,
      winningCard,
      winningPlayer;
    foreachCenter((plind,i)=>{
      var card = gamestate.center[plind];
      if (!card) {
        return;
      }
      allplayed++;
      if (!winningCard) {
        winningCard = card;
        winningPlayer = plind;
      } else {
        if (betterSuit(card, winningCard) || (winningCard.suit == card.suit && card.value>winningCard.value)) {
          winningCard = card;
          winningPlayer = plind;
        }
      }
    }, gamestate.roundPlayerStart)
    if (allplayed == 4) {
      foreachCenter((plind,i)=>gamestate.discards.push(gamestate.center[i]));
      gamestate.players[winningPlayer].tricks++;
      gamestate.curPlayerName = gamestate.players[winningPlayer].name;
      gamestate.roundPlayerStart = getPlayerIndByName(gamestate.curPlayerName);
      gamestate.center = {};
      var teamPoints = gamestate.players[winningPlayer].tricks + gamestate.players[getOppositePlayerIdByName(gamestate.curPlayerName)].tricks;
      gamestate.log.push(`${gamestate.curPlayerName} wins the trick. TP (${teamPoints})`);
    } else {
      advanceTurn();
    }
    netService.setGameState(gamestate);
    drawGameState();
  },1);
}
function betterSuit(newCard, winningCard) {
  if (newCard.suit != winningCard.suit && gamestate.activeContract.suit == newCard.suit){
    return true;
  }
  return false;
}
function foreachCenter(fn, order) {
  var centers=[];
  var start = order | 0;
  for(var playerInd in gamestate.center) {
    if (gamestate.center[start]) {
      centers.push(start);
    }
    start = getNextPlayerInd(gamestate.players[start].name);
  }
  centers.forEach(fn)
}
function bidAndAdvanceTurn() {
    gamestate.log.push(`${gamestate.curPlayerName} Bid ${bid.text}`);
    gamestate.contract.push(bid);
    window.setTimeout(function(){
      advanceTurn();
      netService.setGameState(gamestate);
      drawGameState();
    },1);
}
function passAndAdvanceTurn() {
    var dontAdvance = false;
    gamestate.log.push(`${gamestate.curPlayerName} Passed`);
    gamestate.contract.push({name:gamestate.curPlayerName, pass:true, text: "PASS"});
    if (gamestate.contract.length >= 4) {
      var passcount = 0,
        fourthLastBid = gamestate.contract[gamestate.contract.length-4];
      for(var i=gamestate.contract.length-1;i>gamestate.contract.length-4;i--) {
        if (gamestate.contract[i].pass) {
          passcount++;
        } else {
          passcount = 0;
        }
      }
      if (passcount>=3) {
        gamestate.playStage = 1;
        gamestate.activeContract = fourthLastBid;
        gamestate.curPlayerName = gamestate.players[getNextPlayerInd(fourthLastBid.name)].name;
        gamestate.players[getNextPlayerInd(gamestate.curPlayerName)].board = true;
        gamestate.roundPlayerStart = getPlayerIndByName(gamestate.curPlayerName);
        dontAdvance = true;
      }
    }
    window.setTimeout(function(){
      if (!dontAdvance) {
        advanceTurn();
      }
      netService.setGameState(gamestate);
      drawGameState();
    },1);
}
function getPlayerIndByName(name) {
  return gamestate.players.indexOf(gamestate.players.filter(p=>p.name == name)[0]);
}
function getNextPlayerInd(playerName) {
  var nextPlayerInd = gamestate.players.indexOf(gamestate.players.filter(p => p.name == playerName)[0]) + 1;
  if (nextPlayerInd == gamestate.players.length) {
      nextPlayerInd = 0;
  }
  return nextPlayerInd;
}
function getPrevPlayerInd(playerName) {
  var prevPlayerInd = gamestate.players.indexOf(gamestate.players.filter(p => p.name == playerName)[0]) - 1;
  if (prevPlayerInd == -1) {
      prevPlayerInd = gamestate.players.length-1;
  }
  return prevPlayerInd;
}
function advanceTurn() {
    gamestate.curPlayerName = gamestate.players[getNextPlayerInd(gamestate.curPlayerName)].name;
}
function redeal() {
  gamestate.log = [];
  gamestate.players.forEach(p=>{
    p.cards = [];
    p.tricks = 0;
    delete p.board;
  });
  gamestate.discards = [];
  gamestate.playStage=0;
  gamestate.contract = [];
  gamestate.center = {};
  makeGameState();
}
function endGame() {
    get("endModal").style.display = "block";
    var score = 0;
    for (var key in gamestate.center) {
        score += gamestate.center[key].length;
    }
    get("endmodaltext").innerHTML += score;
}
function makeCard(card, parent, left, top, visible) {
    var carddom = make("div", parent, "block playcard");
    carddom.style.transform = `translate(${left}px,${top}px)`;
    if (visible) {
        var cardLabel = suitToIcon[card.suit]+valueToCardNum[card.value];
        carddom.style.border = "3px solid " + suitToColor[card.suit];
        carddom.style.color = suitToColor[card.suit];
        carddom.innerHTML = cardLabel;
        var upNum = make("div", carddom, "upnumber");
        upNum.innerHTML = cardLabel;
    } else {
        var col = card.clueColor ? card.clueColor : "#999";
        carddom.style.color = col;
        carddom.style.border = "3px solid " + col;
        if (card.clueNumber) {
            carddom.innerHTML = card.clueNumber;
            var upNum = make("div", carddom, "upnumber");
            upNum.innerHTML = card.clueNumber;
        }

    }
    return carddom;
}
function resetClueData() {
    var playerInd = gamestate.players.indexOf(gamestate.players.filter(p => p.name == clueData.name)[0]);
    clueData = deepClone(gamestate.players[playerInd]);
}
function clueColor(color) {
    resetClueData();
    var matchingCards = clueData.cards.filter(c => c.color == color);
    for (var card of matchingCards) {
        card.clueColor = color;
    }
    myPlayer.cluedNumber = "";
    myPlayer.cluedColor = color;
    drawClueCards();
}
function clueNumber(number) {
    resetClueData();
    var matchingCards = clueData.cards.filter(c => c.num == number);
    for (var card of matchingCards) {
        card.clueNumber = number;
    }
    myPlayer.cluedColor = "";
    myPlayer.cluedNumber = number;
    drawClueCards();
}
window.setupModal = function (id) {
    var modal = document.getElementById(id);
    // Get the <span> element that closes the modal
    var span = $(modal).find(".close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
        modal.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    document.addEventListener("click", function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });
}
setupModal("myModal");
