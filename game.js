
var gamestate = {
    deck: [],
    center: {},
    discards: [],
    players: [],
    log: [],
    boardIsVisible: false,
    curPlayerName: "",
    contract: [],
    playStage:0,
    dontPlayYet:false,
    firstBid:0
}, myPlayer;
var suitToIcon={1:"<img src='clubs.png' class='suit'/>",0:"<img src='diamonds.png' class='suit'/>",2:"<img src='hearts.png' class='suit'/>", 3:"<img src='spades.png' class='suit'/>", 4:"NT"};
var suitToColor={1:"black",0:"red",2:"red", 3:"black"};
var suitToLetter={1:"C",0:"D",2:"H",3:"S"};
var valueToCardNum={2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,11:"J",12:"Q",13:"K",14:"A"};
var suitToPoints={1:20,0:20,2:30,3:30,4:30};
var prevCardPositions = {};

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
    var humanPlayerNum = gamestate.players.length;
    for(var i=0;i<4-humanPlayerNum;i++) {
      gamestate.players.push({ cards: [], name: "AI"+(i+1), ai: true, tricks: 0 });
    }
    gamestate.curPlayerName = gamestate.players[gamestate.firstBid].name;
    var numCardsToDraw = 13,
      plid = 0;
    for (var player of gamestate.players) {
      for (var i = 0; i < numCardsToDraw; i++) {
        var card = gamestate.deck.pop();
        card.playerId = plid;
        player.cards.push(card);
      }
      sortPlayerCards(player);
      plid++;
    }
    netService.setGameState(gamestate);
    drawGameState();

    watchGameState();
}
function sortPlayerCards(player) {
  player.cards.sort((a, b)=>(b.suit*13+b.value)-(a.suit*13+a.value));
}
function watchGameState() {
    window.watchInterval = window.watchInterval || window.setInterval(async function () {
      var curPlayer = gamestate.players.filter(p => p.name == gamestate.curPlayerName)[0];
      if (gamestate.players[0].name == myPlayer.name && curPlayer.ai) {
        runAI();
      }
      if (gamestate.curPlayerName != myPlayer.name && (!curPlayer.board || curPlayer.ai)) {
          if(curPlayer.ai && gamestate.players[0].name==myPlayer.name){
            //runAI();
          } else {
            window.gamestate = await netService.getGameState();
            window.gamestate = JSON.parse(window.gamestate);
            drawGameState();
          }
      }
      isEndGame();
    }, 2000);
}
function drawGameState() {
    var main = get("main");
    var curPlayerId = getPlayerIndByName(gamestate.curPlayerName);
    var canPlayCards = (gamestate.curPlayerName==myPlayer.name ||
      (gamestate.players[curPlayerId].board && gamestate.players[getOppositePlayerIdByName(gamestate.curPlayerName)].name == myPlayer.name))
      && gamestate.playStage==1;
    get("playerButtons").style['display']=canPlayCards?"block":"none";
    get("aiRunButton").style['display']=gamestate.players[0].name==myPlayer.name?"block":"none";
    savePrevCardPositions();
    main.innerHTML = "";

    var center = makesq("div", main, "block centerboard", "160px", "120px", "590px", "340px");
    for (var i = 0; i < gamestate.deck.length; i++) {
        var card = gamestate.deck[i];
        makeCard(card, center, i * 0.5 + 450, (i * -1) + 120, false);
    }
    myPlayer.cardDoms = [];
    var translatePos = [{ x: "250px", y: "500px", rot: 0, cx:250, cy:500,xm:1,ym:0 },
    { x: "-150px", y: "200px", rot: "90deg", cx:50, cy:0,xm:0,ym:1 },
    { x: "250px", y: 0, rot: "0", cx:250, cy:0,xm:1,ym:0 },
    { x: "600px", y: "200px", rot: "90deg", cx:800, cy:0,xm:0,ym:1 }];
    var startInd = gamestate.players.indexOf(gamestate.players.filter(p => p.name == myPlayer.name)[0]);
    for (var i = 0; i < gamestate.players.length; i++) {
        var transPos = translatePos[i];
        var player = gamestate.players[startInd];
        var playerBoard = makesq("div", main, "block playerboard board"+player.name, 0, 0, "480px", "120px");
        if (player.name == gamestate.curPlayerName) {
            playerBoard.style["background-color"] = "#FFA";
        }
        make("span", playerBoard, "playerName").innerHTML = player.name;
        playerBoard.style.transform = `translate(${transPos.x},${transPos.y}) rotate(${transPos.rot})`

        for (var j = 0; j < player.cards.length; j++) {
            var pcard = player.cards[j];
            var pcarddom = makeCard(pcard, main,transPos.cx+j*30*transPos.xm, translatePos[i].cy+j*30*transPos.ym,
              player.name == myPlayer.name || (player.board && gamestate.boardIsVisible) || gamestate.playStage == 2, transPos.rot);
            if (canPlayCards && (player.name == myPlayer.name || player.board)) {
              pcarddom.style['background-color'] = validCard(pcard, player.cards)? "white" : "#AAA";
            }
            pcarddom.card = pcard;
            if (player.name == myPlayer.name || player.board) {
                myPlayer.cardDoms.push(pcarddom);
                if (validCard(pcard, player.cards)) {
                  pcarddom.onclick = clickPlayerCard;
                }
            }
        }
        var centerOffset = [{l:0,t:50},{l:-100,t:0},{l:0,t:-50},{l:100,t:0}];
        var centerCard = gamestate.center[startInd];
        if (centerCard) {
          makeCard(centerCard, main, centerOffset[i].l + 400,centerOffset[i].t+ 230, true, "0deg");
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
function savePrevCardPositions() {
  /*for (var i=2;i<=14;i++) {
    for (var j=0;j<4;j++) {
      var id=suitToLetter[j]+valueToCardNum[i];
      var dom = $("#"+id);
      prevCardPositions[id] = {left: dom.left()}
    }
  }*/
}
function validCard(card, otherCards) {
  var isValid = true;
  var leadingSuit = gamestate.center[gamestate.roundPlayerStart];
  if (!leadingSuit)
    return true;
  var followSuitCards = otherCards.filter(c=>c.suit == leadingSuit.suit);
  return followSuitCards.length == 0 ? true : card.suit == leadingSuit.suit;
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
  dbl.onclick = doubleAndAdvanceTurn;

}
function drawContractState(main) {
  var contractState = makesq("div", main, "block playerboard", "220px", "140px", "500px", "170px");
  gamestate.players.forEach((p,i)=>{
    makesq("span", contractState, "playerName", i*120).innerHTML = p.name;
  });
  var xPos = gamestate.firstBid;
  gamestate.contract.forEach((c, i) => {
    makesq("span", contractState, "block bid", (xPos%4)*120,30+30*Math.floor((xPos)/4)).innerHTML = c.text;
    xPos++;
  });
}
function isEndGame(){
  var cards = [];
  gamestate.players.forEach(p=>cards = cards.concat(p.cards));
  if (cards.length == 0 || gamestate.playStage == 2) {
    var teamPoints = getTeamPointsByPlayerId(gamestate.activeContract.player);
    var pointsToWin = gamestate.activeContract.val + 7;
    var gamePoints = (isGameContract() && teamPoints>=pointsToWin)?300:0;
    if (teamPoints >= pointsToWin) {
      gamePoints += suitToPoints[gamestate.activeContract.suit]*(teamPoints-6)*(hasDouble()?2:1);
    } else {
      gamePoints += 50*(teamPoints-pointsToWin)*(hasDouble()?2:1);
    }
    if (!window.closetimeoutendModal) {
      get("endModal").style.display = "block";
    }
    get("endmodalsummary").innerHTML =`Contract: ${gamestate.activeContract.text}<br/>
      Was contract successful: ${teamPoints>=pointsToWin?"Yes" : "No"}<br/>
      Points awarded to ${gamestate.activeContract.name}: ${gamePoints}`;
    for (var i=gamestate.discards.length-1;i>=0;i--) {
      var card = gamestate.discards[i];
      gamestate.players[card.playerId].cards.push(card);
      gamestate.discards.splice(i, 1);
      sortPlayerCards(gamestate.players[card.playerId]);
    }
    gamestate.playStage = 2;
    drawGameState();
    return true;
  } else {
    get("endModal").style.display = "none";
    return false;
  }
}
function hasDouble() {
  var hasDouble = false;
  gamestate.contract.forEach(c=>{
    if (c.dbl) {
      hasDouble = true;
    }
  });
  return hasDouble;
}
function isGameContract() {
  if (gamestate.activeContract.suit <=1) {
    return gamestate.activeContract.val >=4;
  }
  else if (gamestate.activeContract.suit <=3) {
    return gamestate.activeContract.val >=3;
  }
  else if (gamestate.activeContract.suit ==4) {
    return gamestate.activeContract.val >=2;
  }
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
function contractIsAvailable(suit, val, double) {
  if (double) {
    return true;
  }
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
    var contractModal = get("modaltext");
    contractModal.innerHTML = "";
    drawContractState(contractModal);
}
function playCard() {
    var carddom = $( ".playcard.selected")[0];
    if (!carddom ) {
        return;
    }
    var gsPlayer = gamestate.players.filter(p => p.name == gamestate.curPlayerName)[0];
    if (~gsPlayer.cards.indexOf(carddom.card)) {
      playThisCard(carddom.card, gsPlayer);
    }
}
function playThisCard(card,gsPlayer) {
  var playerInd = gamestate.players.indexOf(gsPlayer);
  gsPlayer.cards.splice(gsPlayer.cards.indexOf(card), 1);
  gamestate.boardIsVisible=true;
  gamestate.center[playerInd] = card;
  gamestate.log.push(`${gamestate.curPlayerName} plays ${suitToIcon[card.suit]}${valueToCardNum[card.value]}`);

  window.setTimeout(function(){
    var allplayed = 0,
      winningCard,
      winningPlayer;
    foreachCenter((cnHandler,i)=>{
      var card = cnHandler.card;
      if (!card) {
        return;
      }
      allplayed++;
      if (!winningCard) {
        winningCard = card;
        winningPlayer = cnHandler.ind;
      } else {
        if (betterSuit(card, winningCard) || (winningCard.suit == card.suit && card.value>winningCard.value)) {
          winningCard = card;
          winningPlayer = cnHandler.ind;
        }
      }
    }, gamestate.roundPlayerStart)
    if (allplayed == 4) {
      gamestate.dontPlayYet = true;
        window.setTimeout(function(){
          gamestate.dontPlayYet = false;
          foreachCenter((cnHandler,i)=>gamestate.discards.push(cnHandler.card));
          gamestate.players[winningPlayer].tricks++;
          gamestate.curPlayerName = gamestate.players[winningPlayer].name;
          gamestate.roundPlayerStart = getPlayerIndByName(gamestate.curPlayerName);
          gamestate.center = {};
          var teamPoints = getTeamPointsByPlayerId(winningPlayer);
          gamestate.log.push(`${gamestate.curPlayerName} wins the trick. TP (${teamPoints})`);
          netService.setGameState(gamestate);
          drawGameState();
          isEndGame();
        },1000);
    } else {
      advanceTurn();
    }
    netService.setGameState(gamestate);
    drawGameState();
  },1);
}
function getTeamPointsByPlayerId(plid) {
  var plidname = gamestate.players[plid].name;
  return gamestate.players[plid].tricks + gamestate.players[getOppositePlayerIdByName(plidname)].tricks;
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
  for(var i=0;i<4;i++) {
    var thisCard = gamestate.center[start];
    if (thisCard) {
      centers.push({card:thisCard,ind:start});
    }
    start ++;
    start = start % 4;
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
function doubleAndAdvanceTurn() {
    gamestate.log.push(`${gamestate.curPlayerName} Doubled`);
    gamestate.contract.push({name: gamestate.curPlayerName, dbl: true, text: "Double"});
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
        lastRealBid = getLastRealBid();

      for(var i=gamestate.contract.length-1;i>gamestate.contract.length-4;i--) {
        if (gamestate.contract[i].pass) {
          passcount++;
        } else {
          passcount = 0;
        }
      }
      if (passcount>=3) {
        var firstToBidSuit = findFirstToBidThisSuit(lastRealBid.suit, lastRealBid.player);
        gamestate.playStage = 1;
        gamestate.activeContract = firstToBidSuit;
        firstToBidSuit.val = lastRealBid.val;
        firstToBidSuit.text = lastRealBid.text;
        gamestate.curPlayerName = gamestate.players[getNextPlayerInd(gamestate.activeContract.name)].name;
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
function getLastRealBid() {
  var nonbidCount = 1,
    lastRealBid = gamestate.contract[gamestate.contract.length-nonbidCount];
  while(lastRealBid && (lastRealBid.pass || lastRealBid.dbl)) {
    nonbidCount++;
    if(gamestate.contract.length-nonbidCount <= -1) {
      break;
    }
    lastRealBid = gamestate.contract[gamestate.contract.length-nonbidCount];
  }
  return lastRealBid;
}
function findFirstToBidThisSuit(suit, plid) {
  var oppoId = (plid+2)%4;
  for(var i=0;i<gamestate.contract.length; i++) {
    var contract = gamestate.contract[i];
    if (contract.suit == suit && (contract.player == plid || contract.player == oppoId)) {
      return contract;
    }
  }
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
  gamestate.boardIsVisible = false;
  gamestate.firstBid = (gamestate.firstBid + 1)%4;
  gamestate.dontPlayYet = false;
  makeGameState();
}
function makeCard(card, parent, left, top, visible, rotateZ) {
    var carddom = make("div", parent, "block playcard");
    carddom.id=suitToLetter[card.suit]+""+valueToCardNum[card.value];
    if (prevCardPositions[carddom.id]) {
      var prevPos = prevCardPositions[carddom.id];
      carddom.style.left = `${prevPos.left}px`;
      carddom.style.top = `${prevPos.top}px`;
      carddom.style.transform = `rotateZ(${prevPos.rotZ}) rotateY(${prevPos.rotY}deg)`;
    }
    else {
      carddom.style.left = `0px`;
      carddom.style.top = `0px`;
    }
    window.setTimeout(()=>{
      var prevPos = {},
          rotateY = prevCardPositions[carddom.id] && prevCardPositions[carddom.id].rotY;
      if ((!rotateY || rotateY == 180) && visible) {
        rotateY = 0;
        window.setTimeout(()=>makeCardInside(card,carddom),250);
      } else {
        rotateY = 180;
      }
      prevCardPositions[carddom.id] = prevPos;
      prevPos.left = left;
      prevPos.top = top;
      prevPos.rotZ = rotateZ;
      prevPos.rotY = rotateY;
      carddom.style.left = `${left}px`;
      carddom.style.top = `${top}px`;
      carddom.style.transform = `rotateZ(${prevPos.rotZ}) rotateY(${prevPos.rotY}deg)`;
    },1)
    if (visible && (!prevPos || prevPos.rotY == 0)) {
        makeCardInside(card, carddom);
    } else {
        carddom.style.color = "#999";
        carddom.style.border = "3px solid #999";
    }
    return carddom;
}
function makeCardInside(card, carddom) {
  var cardLabel = suitToIcon[card.suit]+valueToCardNum[card.value];
  carddom.style.border = "3px solid " + suitToColor[card.suit];
  carddom.style.color = suitToColor[card.suit];
  carddom.innerHTML = cardLabel;
  var upNum = make("div", carddom, "upnumber");
  upNum.innerHTML = cardLabel;
}
function undo() {
  var curPlayerId = getPlayerIndByName(gamestate.curPlayerName);
  var prevPlayerId = curPlayerId == 0 ? 3 : curPlayerId - 1;
  gamestate.curPlayerName = gamestate.players[prevPlayerId].name;
  if (gamestate.playStage == 0) {
    gamestate.contract.splice(gamestate.contract.length -1, 1);
  } else if (gamestate.playStage == 1) {
    gamestate.players[prevPlayerId].cards.push(gamestate.center[prevPlayerId]);
    gamestate.center[prevPlayerId] = null;
  }
  gamestate.log.splice(gamestate.log.length-1, 1);
  drawGameState();
}
window.setupModal = function (id) {
    var modal = document.getElementById(id);
    // Get the <span> element that closes the modal
    var span = $(modal).find(".close")[0];
    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
        window["closetimeout"+id] = true;
        window.setTimeout(()=>window["closetimeout"+id] = false, 20000);
        modal.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    document.addEventListener("click", function (event) {
        if (event.target == modal) {
            window["closetimeout"+id] = true;
            window.setTimeout(()=>window["closetimeout"+id] = false, 20000);
            modal.style.display = "none";
        }
    });
}
setupModal("myModal");
setupModal("endModal");
