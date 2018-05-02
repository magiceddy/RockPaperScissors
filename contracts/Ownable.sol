pragma solidity 0.4.21;

contract Ownable {

	address public owner;

	event LogOwner(address owner);

	modifier onlyOwner() {
		require(msg.sender == owner);
		_;
	}

	function Ownable() public {
		owner = msg.sender;
		emit LogOwner(msg.sender);
	}

	function changeOwner(address newOwner) public onlyOwner returns (bool) {
		owner = newOwner;
		emit LogOwner(newOwner);
		return true;
	}

	function() public payable {
		revert();
	}
}
