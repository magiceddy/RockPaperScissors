pragma solidity 0.4.21;

import "./IGamblingGame.sol";

contract IRockPaperScissors is IGamblingGame {
	function checkWinner() public returns (bool);
	function revealBet(address _player, uint8 _bet, bytes32 _secretKey) public returns (bool);
	event LogWinner(address player);
	event LogRevealBet(address _player, uint8 _bet, uint8 _totalBet);
}
