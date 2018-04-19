pragma solidity 0.4.21;

import "./IGamblingGame.sol";

contract IRockPaperScissors is IGamblingGame {
	function checkWinner() public returns (bool);
	function revealBet() public returns (bool);
	event LogWinner(address player);
	event LogRevealBet();
}
