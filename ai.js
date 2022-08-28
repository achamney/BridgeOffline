function runAI() {
  var gsPlayer = gamestate.players.filter(p => p.name == gamestate.curPlayerName)[0];
  if (gamestate.playStage == 0){
    var score = 0;
    var diamonds = gsPlayer.cards.filter(c=>c.suit==0);
    var clubs = gsPlayer.cards.filter(c=>c.suit==1);
    var hearts = gsPlayer.cards.filter(c=>c.suit==2);
    var spades = gsPlayer.cards.filter(c=>c.suit==3);
    var derefSuitSize = {0:diamonds.length,1:clubs.length,2:hearts.length,3:spades.length};
    var partnerBid = getPartnersLatestBid();
    gsPlayer.cards.forEach(c=>score+=Math.max(0,c.value-10));
    if (score > 8 && noOpeningBids()) {
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
      if (bidnum == 1 && suit == 4)
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
  else {
    var leadingSuit = gamestate.center[gamestate.roundPlayerStart];
    var trumpCards = gsPlayer.cards.filter(c=>c.suit == trumpSuit);
    if (gsPlayer.board) {
      if (!gamestate.players[getOppositePlayerIdByName(gsPlayer.name)].ai)
        return;
    }
    if (!leadingSuit) {
      var trumpSuit = gamestate.activeContract.suit;
      if (trumpCards.length > 0){
        playThisCard(trumpCards[trumpCards.length-1], gsPlayer);
      } else {
        playHighestValueCard(gsPlayer);
      }
    } else {
      var followSuitCards = gsPlayer.cards.filter(c=>c.suit == leadingSuit.suit);
      if (followSuitCards.length > 0) {
        playThisCard(followSuitCards[followSuitCards.length-1], gsPlayer);
      } else if (trumpCards.length > 0) {
        playThisCard(trumpCards[trumpCards.length-1], gsPlayer);
      } else {
        playHighestValueCard(gsPlayer);
      }
    }
  }
}
function playHighestValueCard(gsPlayer) {
  var card = gsPlayer.cards[0];
  gsPlayer.cards.forEach(c=>{
    if (c.value > card.value) {
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
