pragma solidity 0.4.21;

import "./Ownable.sol";

contract Player is Ownable {

	address public playerAddress;

	function Player(address _player) public {
		playerAddress = _player;
	}
}
