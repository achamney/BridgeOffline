function runAI() {
  var gsPlayer = gamestate.players.filter(p => p.name == gamestate.curPlayerName)[0];
  if (gsPlayer.cards.length < gamestate.players[0].cards.length) {
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
  var score = 0;
  var diamonds = gsPlayer.cards.filter(c=>c.suit==0);
  var clubs = gsPlayer.cards.filter(c=>c.suit==1);
  var hearts = gsPlayer.cards.filter(c=>c.suit==2);
  var spades = gsPlayer.cards.filter(c=>c.suit==3);
  var derefSuitSize = {0:diamonds.length,1:clubs.length,2:hearts.length,3:spades.length};
  var partnerBid = getPartnersLatestBid();
  gsPlayer.cards.forEach(c=>score+=Math.max(0,c.value-10));
  if (score > 8 && !partnerBid) {
    var suit = -1;
    var bidnum = score < 12 ? 1 : 0;
    if (spades.length == 5)
      suit = 3;
    else if (hearts.length == 5)
      suit = 2;
    else if (diamonds.length == 6)
      suit = 0;
    else if (clubs.length == 6 && bidnum == 0)
      suit = 1;
    else
      suit = 4;

    window.bid = {suit: suit, val: bidnum, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
      text: suitToIcon[suit]+(bidnum+1), name: gamestate.curPlayerName};
    if (!contractIsAvailable(suit, bidnum) || (bidnum == 1 && suit == 4))
      passAndAdvanceTurn();
    else
      bidAndAdvanceTurn();
  }
  else if (score > 5 && partnerBid) {
    var suit = partnerBid.suit;
    var bidnum = partnerBid.val+1;
    window.bid = {suit: suit, val: bidnum, dbl: false, player: getPlayerIndByName(gamestate.curPlayerName),
      text: suitToIcon[suit]+(bidnum+1), name: gamestate.curPlayerName};

    if ((bidnum == 1 && derefSuitSize[suit] >=4) ||
        (bidnum == 2 && derefSuitSize[suit] >=4 && score >= 8))
      bidAndAdvanceTurn();
    else
      passAndAdvanceTurn();
  }
  else {
    passAndAdvanceTurn();
  }
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
function getPartnersLatestBid() {
  if (gamestate.contract.length-2 >= 0 && !gamestate.contract[gamestate.contract.length-2].pass)
    return gamestate.contract[gamestate.contract.length-2];
  else {
    return null;
  }
}
function noOpeningBids() {
  return gamestate.contract.filter(c=>!c.pass).length == 0;
}
