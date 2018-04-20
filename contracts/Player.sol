pragma solidity 0.4.21;

import "./Ownable.sol";

contract Player is Ownable {

	address public playerAddress;
	bytes32 public hashBet;
	uint8 public bet;
	bool public hasBet;

	function Player(address _player) public {
		playerAddress = _player;
	}

	function setHashBet(bytes32 _hashBet) public onlyOwner returns (bool) {
		require(!hasBet);

		hasBet = true;
		hashBet = _hashBet;
		return true;
	}

	function setBet(uint8 _bet) public onlyOwner returns (bool) {
		require(_bet >= 0 && _bet <= 3);
		require(bet == 0x0);
		require(hashBet != 0x0);

		bet = _bet;
		return true;
	}
}
