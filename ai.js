var HEARTS = 2, SPADES = 3, DIAMONDS=0, CLUBS = 1, NOTRUMP=4;
var suitToGamePoints = {0: 28, 1: 28, 2: 25, 3: 25, 4: 25};
var suitToGameBid = {0: 4, 1: 4, 2: 3, 3: 3, 4: 2};
function runAI() {
  var gsPlayer = gamestate.players.filter(p => p.name == gamestate.curPlayerName)[0];
  if (gsPlayer.cards.length < gamestate.players[0].cards.length || isEndGame() || gamestate.dontPlayYet) {
    return; // Sometimes AI tries to play twice for some reason
  }
  if (gamestate.playStage == 0){
    bidAI(gsPlayer);
  }
  else {
    playCardAI(gsPlayer);
  }
}
function playCardAI(gsPlayer) {
  var leadingSuit = gamestate.center[gamestate.roundPlayerStart];
  var trumpCards = gsPlayer.cards.filter(c=>c.suit == trumpSuit);
  var boardPlayer = gamestate.players.filter(p=>p.board)[0];
  var boardId = gamestate.players.indexOf(boardPlayer)
  var partner = gamestate.players[getOppositePlayerIdByName(gamestate.curPlayerName)];
  var boardCards = boardPlayer.name != gamestate.curPlayerName && boardPlayer.name != partner.name && !gamestate.center[boardId]? boardPlayer.cards : [];
  var oppoId = getOppositePlayerIdByName(gsPlayer.name);
  if (gsPlayer.board) {
    if (!gamestate.players[oppoId].ai)
      return;
  }
  if (!leadingSuit) {
    var trumpSuit = gamestate.activeContract.suit;
    if (trumpCards.length > 0) {
      playHighLowValueCard(gsPlayer, trumpCards, boardCards);
    } else {
      playHighLowValueCard(gsPlayer, gsPlayer.cards, boardCards);
    }
  } else {
    var followSuitCards = gsPlayer.cards.filter(c=>c.suit == leadingSuit.suit);
    var partnersCard = gamestate.center[oppoId];
    var centerCards = centerCardsToArray();
    var validCards = followSuitCards.length > 0 ? followSuitCards : gsPlayer.cards;
    if (partnersCard && centerCardIsWinning(oppoId)) {
      console.log("Partner's winning, play lowest");
      playHighLowValueCard(gsPlayer, validCards, boardCards, true);
      return;
    }
    var winningCards = validCards.filter(c=>cardIsWinning(centerCards,c, true));
    if (centerCards.length == 3) {
      console.log("I'm last!");
      playHighLowValueCard(gsPlayer, winningCards, boardCards, true);
    } else {
      console.log("Try to win!");
      playHighLowValueCard(gsPlayer, winningCards, boardCards, false);
    }
  }
}
function centerCardsToArray() {
    var cards = [];
    foreachCenter((cnHandler)=>{
      cards.push(cnHandler.card);
    });
    return cards;
}
function centerCardIsWinning(cardId) {
  return cardIsWinning(centerCardsToArray(), gamestate.center[cardId]);
}
function cardIsWinning(cards, thisCard, isCenterCard) {
  var isHighest = true;
  var trumpSuit = gamestate.activeContract.suit;
  cards.forEach((otherCard)=>{
    if (otherCard.suit == trumpSuit && thisCard.suit != trumpSuit) {
      isHighest = false;
    } else if (otherCard.suit == thisCard.suit && otherCard.value > thisCard.value) {
      isHighest = false;
    } else if (otherCard.suit != thisCard.suit && thisCard.suit != trumpSuit && (otherCard.suit == trumpSuit || isCenterCard)){
      isHighest = false;
    }
  })
  return isHighest;
}
function bidAI(gsPlayer) {
  var score = getScore(gsPlayer.cards);
  var diamonds = gsPlayer.cards.filter(c=>c.suit==DIAMONDS);
  var clubs = gsPlayer.cards.filter(c=>c.suit==CLUBS);
  var hearts = gsPlayer.cards.filter(c=>c.suit==HEARTS);
  var spades = gsPlayer.cards.filter(c=>c.suit==SPADES);
  var derefSuitSize = {0:diamonds.length,1:clubs.length,2:hearts.length,3:spades.length};
  var myLastBid = getNthLatestBid(4);
  var partnerBid = getNthLatestBid(2);
  var opponentBid = getNthLatestBid(1);
  var double = false;
  if (score >= 8 && !partnerBid) {
    var suit = -1;
    var bidnum = score < 12 ? 1 : 0;
    if (spades.length >= 5)
      suit = SPADES;
    else if (hearts.length >= 5)
      suit = HEARTS;
    else if (diamonds.length >= 6)
      suit = DIAMONDS;
    else if (clubs.length >= 6 && bidnum == 0)
      suit = CLUBS;
    else
      suit = NOTRUMP;
    if (opponentBid && derefSuitSize[opponentBid.suit] <=2 && lowestLengthSuitExcept(opponentBid.suit, derefSuitSize)>=3) { // takeout double
      double = true;
      window.bid = {suit: -1, val: -1, dbl: true, player: getPlayerIndByName(gamestate.curPlayerName),
        text: "Double", name: gamestate.curPlayerName};
    }
    else {
      window.bid = {suit: suit, val: bidnum, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
        text: suitToIcon[suit]+(bidnum+1), name: gamestate.curPlayerName};
    }
    if (!contractIsAvailable(suit, bidnum, double) || (bidnum == 1 && suit == NOTRUMP))
      passAndAdvanceTurn();
    else
      bidAndAdvanceTurn();
  }
  else if (partnerBid && partnerBid.suit == NOTRUMP && partnerBid.val== 0) { // Jacoby Transfer
      signalJacobyTransfer(score, spades, hearts);
  }
  else if (partnerBid && partnerBid.suit <= HEARTS && partnerBid.val == 1 &&
          myLastBid && myLastBid.val == 0 && myLastBid.suit == NOTRUMP) { // Jacoby Transfer response
      if (partnerBid.suit == CLUBS) {
        staymanStepTwo(gsPlayer, derefSuitSize)
      } else {
        completeJacobyTransfer(partnerBid);
      }
  }
  else if (partnerBid && partnerBid.dbl && gamestate.contract.length <=6) { // Takeout double response
      completeTakeoutDouble(derefSuitSize, clubs,diamonds,hearts,spades);
  }
  else if (score > 5 && partnerBid) {
    var suit = partnerBid.suit,
      bidnum = partnerBid.val+(bidnum <= 1 && derefSuitSize[suit] >=4 ? 1 : 0),
      myId = getPlayerIndByName(gamestate.curPlayerName),
      partnerId = getOppositePlayerIdByName(gamestate.curPlayerName);
    if (potentialGame(myId, partnerId, partnerBid)) {
      bidnum = suitToGameBid[suit];
    }
    window.bid = {suit: suit, val: bidnum, dbl: false, player: myId,
      text: suitToIcon[suit]+(bidnum+1), name: gamestate.curPlayerName};

    if (contractIsAvailable(suit, bidnum))
      bidAndAdvanceTurn();
    else
      passAndAdvanceTurn();
  }
  else {
    passAndAdvanceTurn();
  }
}
function potentialGame(myId, partnerId, partnerBid) {
  var score = getScore(gamestate.players[myId].cards) + guessPartnerScore(myId, partnerId);
  if (score > suitToGamePoints[partnerBid.suit]) {
    return true;
  }
  return false;
}
function guessPartnerScore(myId, partnerId) {
  var score = 0;
  var iBidNoTrump = false;
  gamestate.contract.forEach((c,i)=> {
    if (c.player == partnerId) {
        if (c.val == 0 && c.suit < NOTRUMP) {
          score = 13;
        } else if (c.val == 0 && c.suit == NOTRUMP) {
          score = 15;
        } else if (c.val == 1) {
          if (iBidNoTrump && (c.suit == HEARTS || c.suit == DIAMONDS)) {
            return; // jacoby transfer doesn't assume points
          } else if ( i<=3 && c.suit == CLUBS) {
            score = 22; // Opening of two clubs
          }
          else if (c.suit == NOTRUMP) {
            score = 22; // Opening of two clubs
          }
          score = Math.max(score, 8);
        }
    } else if (c.player == myId) {
      if (c.suit == NOTRUMP) {
        iBidNoTrump = true;
      }
    }
  });
  return score;
}
function getScore(cards) {
  var score = 0;
  cards.forEach(c=>score+=Math.max(0,c.value-10));
  return score;
}
function completeJacobyTransfer(partnerBid) {
  var suit = partnerBid.suit == 0 ? 2 : 3;
  window.bid = {suit: suit, val: 1, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
    text: suitToIcon[suit]+2, name: gamestate.curPlayerName};
  if (contractIsAvailable(suit, 1)){
    bidAndAdvanceTurn();
  } else {
    passAndAdvanceTurn();
  }
}
function staymanStepTwo(gsPlayer, derefSuitSize) {
  var suit = -1;
  if (derefSuitSize[HEARTS]>=4) {
    suit = HEARTS;
  }
  else if (derefSuitSize[SPADES]>=4) {
    suit = SPADES;
  }
  else if (derefSuitSize[DIAMONDS]>=4) {
    suit = DIAMONDS;
  } else {
    suit = NOTRUMP;
  }
  window.bid = {suit: suit, val: 1, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
    text: suitToIcon[suit]+2, name: gamestate.curPlayerName};
  if (contractIsAvailable(suit, 1)){
    bidAndAdvanceTurn();
  } else {
    passAndAdvanceTurn();
  }
}
function completeTakeoutDouble(derefSuitSize,clubs,diamonds,hearts,spades) {
  var oppoBid = getNthLatestBid(3);
  var suitsByLength = [];
  var val=0;
  var scoreDeref = {0:getScore(diamonds),1:getScore(clubs),2:getScore(hearts),3:getScore(spades)}
  for (var i=0;i<4;i++) {
    if (i!=oppoBid.suit)
    suitsByLength.push({suit:i,length:derefSuitSize[i],score:scoreDeref[i]});
  }
  while(!contractIsAvailable(suitsByLength[0].suit,val)) {
    val ++;
  }
  suitsByLength.sort((a,b)=>b.length*10 - a.length*10 + (b.score - a.score));
  var suit = suitsByLength[0].suit;
  window.bid = {suit: suit, val: val, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
    text: suitToIcon[suit]+(val+1), name: gamestate.curPlayerName};
  if (contractIsAvailable(suit, val)){
    bidAndAdvanceTurn();
  } else {
    passAndAdvanceTurn();
  }
}
function signalJacobyTransfer(score, spades, hearts) {
  var suit = -1;
  if (spades.length >= 5) {
    suit = 2;
  }
  else if (hearts.length >= 5) {
    suit = 0;
  }
  else if ((hearts.length == 4 || spades.length == 4) && score >= 8) { //stayman
    suit = 1;
  }
  else if (score >= 8) { // no transfer available, signal strong hand
    suit = 4;
  } else {
    passAndAdvanceTurn();
    return;
  }
  window.bid = {suit: suit, val: 1, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
    text: suitToIcon[suit]+2, name: gamestate.curPlayerName};
  if (contractIsAvailable(suit, 1)){
    bidAndAdvanceTurn();
  } else {
    passAndAdvanceTurn();
  }
}
function lowestLengthSuitExcept(suit, derefSuitSize) {
  var lowest = 13;
  for (var i=0;i<4;i++){
    if (suit != i && derefSuitSize[i]<lowest){
      lowest = derefSuitSize[i];
    }
  }
  return lowest;
}
function playHighLowValueCard(gsPlayer, cards, boardCards, playLow) {
  if (cards.length == 0) {
    var leadingSuit = gamestate.center[gamestate.roundPlayerStart];
    var followSuitCards = leadingSuit ? gsPlayer.cards.filter(c=>c.suit == leadingSuit.suit) : [];
    cards = followSuitCards.length > 0 ? followSuitCards : gsPlayer.cards;
    playLow = true;
    console.log("no winning cards :(");
  }
  var card = cards[cards.length-1];
  cards.forEach(c=>{
    if (c.value > card.value && !playLow) {
      console.log("This card's better: " + c.suit + " " + c.value);
      card = c;
    } else if (c.value < card.value && playLow) {
      console.log("This card's worse: " + c.suit + " " + c.value);
      card = c;
    }
  });
  var boardFollowSuit = boardCards.filter(c=>c.suit == card.suit);
  boardCards = boardFollowSuit.length > 0 ? boardFollowSuit : boardCards; // Board is void vs not void
  if (!cardIsWinning(boardCards, card) && !playLow) {
    console.log("Found card that could win, but the board will beat me: " + card.suit + " " + card.value);
    var tryDifferentCards = cards.filter(c=>c!=card);
    return playHighLowValueCard(gsPlayer, tryDifferentCards, boardCards, tryDifferentCards.length >0);
  }
  playThisCard(card, gsPlayer);
}
function getNthLatestBid(nth) {
  if (gamestate.contract.length-nth >= 0 && !gamestate.contract[gamestate.contract.length-nth].pass)
    return gamestate.contract[gamestate.contract.length-nth];
  else {
    return null;
  }
}
function noOpeningBids() {
  return gamestate.contract.filter(c=>!c.pass).length == 0;
}
