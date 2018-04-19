pragma solidity 0.4.21;

contract Ownable {

	address public owner;

	modifier onlyOwner() {
		require(msg.sender == owner);
		_;
	}

	function Ownable() public {
		owner = msg.sender;
	}
}
