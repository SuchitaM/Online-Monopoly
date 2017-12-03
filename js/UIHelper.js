function movePlayerInUi(playerId,moveTo)
{   
    document.getElementById(moveTo).appendChild( document.getElementById('player'+playerId));
}

function animateMovement(playerId,diceNumber) {
  var elem = document.getElementById("player1"); 
  elem.classList.add("animation_down");
  var pos = 0;
  var id = setInterval(frame, 5);
  function frame() {
    if (pos == 350) {
      clearInterval(id);
      elem.classList.remove("animation_down");
      elem.style.top = '0px'; 
      elem.style.left = '0px'; 
      movePlayerInUi(playerId,diceNumber)
    } else {
      pos++; 
      elem.style.top = pos + 'px'; 
      elem.style.left = pos + 'px'; 
    }
  }
}

function toggleRollButton()
{
  if(dbResponse.nextTurn == sessionStorage.playerId)
        {
          return false;
        }
        else
        {
          return true;
        }
}

function getNextTurn(isNotMyTurn){
if(isNotMyTurn)
    return "player" + dbResponse.nextTurn+"'s" ;
else
    return "your";
}

function rotateBoard(div,deg){
  div.style.webkitTransform = 'rotate('+deg+'deg)'; 
    div.style.mozTransform    = 'rotate('+deg+'deg)'; 
    div.style.msTransform     = 'rotate('+deg+'deg)'; 
    div.style.oTransform      = 'rotate('+deg+'deg)'; 
    div.style.transform       = 'rotate('+deg+'deg)'; 
}
