function runAI() {
  var gsPlayer = gamestate.players.filter(p => p.name == gamestate.curPlayerName)[0];
  if (gsPlayer.cards.length < gamestate.players[0].cards.length || isEndGame()) {
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
  var oppoId = getOppositePlayerIdByName(gsPlayer.name);
  if (gsPlayer.board) {
    if (!gamestate.players[oppoId].ai)
      return;
  }
  if (!leadingSuit) {
    var trumpSuit = gamestate.activeContract.suit;
    if (trumpCards.length > 0){
      playThisCard(trumpCards[0], gsPlayer);
    } else {
      playHighLowValueCard(gsPlayer, gsPlayer.cards);
    }
  } else {
    var followSuitCards = gsPlayer.cards.filter(c=>c.suit == leadingSuit.suit);
    var partnersCard = gamestate.center[oppoId];
    var centerCards = centerCardsToArray();
    var validCards = followSuitCards.length > 0 ? followSuitCards : gsPlayer.cards;
    if (partnersCard && centerCardIsWinning(oppoId)) {
      console.log("Partner's winning, play lowest");
      playHighLowValueCard(gsPlayer, validCards, true);
      return;
    }
    var winningCards = validCards.filter(c=>cardIsWinning(centerCards,c));
    if (centerCards.length == 3) {
      console.log("I'm last!");
      playHighLowValueCard(gsPlayer, winningCards, true);
    } else {
      console.log("Try to win!");
      playHighLowValueCard(gsPlayer, winningCards, false);
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
function cardIsWinning(cards, thisCard) {
  var isHighest = true;
  var trumpSuit = gamestate.activeContract.suit;
  cards.forEach((otherCard)=>{
    if (otherCard.suit == trumpSuit && thisCard.suit != trumpSuit) {
      isHighest = false;
    } else if (otherCard.suit == thisCard.suit && otherCard.value > thisCard.value) {
      isHighest = false;
    } else if (otherCard.suit != thisCard.suit && thisCard.suit != trumpSuit){
      isHighest = false;
    }
  })
  return isHighest;
}
function bidAI(gsPlayer) {
  var score = getScore(gsPlayer.cards);
  var diamonds = gsPlayer.cards.filter(c=>c.suit==0);
  var clubs = gsPlayer.cards.filter(c=>c.suit==1);
  var hearts = gsPlayer.cards.filter(c=>c.suit==2);
  var spades = gsPlayer.cards.filter(c=>c.suit==3);
  var derefSuitSize = {0:diamonds.length,1:clubs.length,2:hearts.length,3:spades.length};
  var myLastBid = getNthLatestBid(4);
  var partnerBid = getNthLatestBid(2);
  var opponentBid = getNthLatestBid(1);
  var double = false;
  if (score > 8 && !partnerBid) {
    var suit = -1;
    var bidnum = score < 12 ? 1 : 0;
    if (spades.length >= 5)
      suit = 3;
    else if (hearts.length >= 5)
      suit = 2;
    else if (diamonds.length >= 6)
      suit = 0;
    else if (clubs.length >= 6 && bidnum == 0)
      suit = 1;
    else
      suit = 4;
    if (opponentBid && derefSuitSize[opponentBid.suit] <=2 && lowestLengthSuitExcept(opponentBid.suit, derefSuitSize)>=3) { // takeout double
      double = true;
      window.bid = {suit: -1, val: -1, dbl: true, player: getPlayerIndByName(gamestate.curPlayerName),
        text: "Double", name: gamestate.curPlayerName};
    }
    else {
      window.bid = {suit: suit, val: bidnum, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
        text: suitToIcon[suit]+(bidnum+1), name: gamestate.curPlayerName};
    }
    if (!contractIsAvailable(suit, bidnum, double) || (bidnum == 1 && suit == 4))
      passAndAdvanceTurn();
    else
      bidAndAdvanceTurn();
  }
  else if (partnerBid && partnerBid.suit == 4 && partnerBid.val== 0) { // Jacoby Transfer
      signalJacobyTransfer(spades, hearts);
  }
  else if (partnerBid && (partnerBid.suit == 0 || partnerBid.suit == 2) && partnerBid.val == 1 &&
          myLastBid && myLastBid.val == 0 && myLastBid.suit == 4) { // Jacoby Transfer response
      completeJacobyTransfer(partnerBid);
  }
  else if (partnerBid && partnerBid.double && gamestate.contract.length <=3) { // Takeout double response
      completeTakeoutDouble(derefSuitSize, clubs,diamonds,hearts,spades);
  }
  else if (score > 5 && partnerBid) {
    var suit = partnerBid.suit;
    var bidnum = partnerBid.val+1;
    window.bid = {suit: suit, val: bidnum, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
      text: suitToIcon[suit]+(bidnum+1), name: gamestate.curPlayerName};


    if (contractIsAvailable(suit, bidnum) && ((bidnum == 1 && derefSuitSize[suit] >=4) ||
        (bidnum == 2 && derefSuitSize[suit] >=4 && score >= 8)))
      bidAndAdvanceTurn();
    else
      passAndAdvanceTurn();
  }
  else {
    passAndAdvanceTurn();
  }
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
function signalJacobyTransfer(spades, hearts) {
  var suit = -1;
  var transfer = false;
  if (spades.length >= 5) {
    suit = 2;
    transfer = true;
  }
  else if (hearts.length >= 5) {
    suit = 0;
    transfer = true;
  }
  else if (score >= 8) { // no transfer available, signal strong hand
    suit = 4;
  } else {
    passAndAdvanceTurn();
    return;
  }
  window.bid = {suit: suit, val: 1, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
    text: suitToIcon[suit]+2, name: gamestate.curPlayerName, transfer: transfer};
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
function playHighLowValueCard(gsPlayer, cards, playLow) {
  if (cards.length == 0) {
    var leadingSuit = gamestate.center[gamestate.roundPlayerStart];
    var followSuitCards = gsPlayer.cards.filter(c=>c.suit == leadingSuit.suit);
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
