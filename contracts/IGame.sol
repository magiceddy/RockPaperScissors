pragma solidity 0.4.21;

contract IGame {
	function createGame(bytes32 id) public returns (bool) {}
	function startGame(bytes32 id) public returns (bool) {}
	function addPlayer(address player) public returns (bool) {}
	event LogCreateGame(bytes32 id);
	event LogStart(bytes32 _id);
	event LogAddPlayer(bytes32 player);
}
