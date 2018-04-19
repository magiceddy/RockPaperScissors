pragma solidity 0.4.21;

import "./Ownable.sol";

contract Player is Ownable {

	address public playerAddress;
	bytes32 public hashBet;
	bool public hasBet;

	function Player(address _player) public {
		playerAddress = _player;
	}

	function setHashBet(bytes32 _bet) public onlyOwner returns (bool) {
		require(!hasBet);

		hasBet = true;
		hashBet = _bet;
		return true;
	}
}
