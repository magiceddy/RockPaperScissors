pragma solidity 0.4.21;

import "./IGame.sol";

contract IGamblingGame is IGame {
	function bet() public payable returns (bool) {}
	function widthdrawal(uint256 amount) public returns (bool) {}
	event LogBet(uint256 value);
	event LogWidthdrawal(address player, uint256 amount);
}
