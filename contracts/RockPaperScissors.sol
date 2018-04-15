pragma solodity 0.4.21;


contract IGame {
    function newGame(address owner, uint256 gameEnd) public returns (address) {}
    function betOnGame(uint256 bet) {}
    function getGame() public {}
    function isGameEnd() public returns (bool) {}
    function enjoyGame() public {}
    function setPlayerNumber(uint8 _players) {}
    event LogNew(address indexed player1, uint256 gameEnd)
    event LogBetOn(uint256 bet)
    event LogEnjoy(address indexed player2)
    event LogMaxPlayer(uint256 players)
}
