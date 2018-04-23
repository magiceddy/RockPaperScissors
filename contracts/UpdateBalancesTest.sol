pragma solidity 0.4.21;

import "./RPSManager.sol";

contract UpdateBalancesTest is RPSManager {

	function test(
		uint8 winnerIndex,
		uint256 betAmount,
		address player1,
		address player2
	)
		public
	{
		updateBalances(winnerIndex, betAmount, player1, player2);
	}
}
