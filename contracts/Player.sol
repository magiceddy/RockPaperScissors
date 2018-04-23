pragma solidity 0.4.21;

import "./Ownable.sol";

contract Player is Ownable {

	address public playerAddress;
	bytes32 public hashBet;
	uint8 public bet;
	bool public hasBet;

	event LogPlayer(address _player);
	event LogHashbet(bytes32 _hashBet);
	event LogBet(uint8 _bet);

	function Player(address _player) public {
		playerAddress = _player;
		emit LogPlayer(_player);
	}

	function setHashBet(bytes32 _hashBet) public onlyOwner returns (bool) {
		require(!hasBet);

		hasBet = true;
		hashBet = _hashBet;

		emit LogHashbet(hashBet);
		return true;
	}

	function setBet(uint8 _bet) public onlyOwner returns (bool) {
		require(_bet >= 0 && _bet <= 3);
		require(bet == 0x0);
		require(hashBet != 0x0);

		bet = _bet;
		emit LogBet(bet);
		return true;
	}

	function() public payable {
		revert();
	}
}
