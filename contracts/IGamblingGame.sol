pragma solidity 0.4.21;

contract IGamblingGame {
	function createGame(uint256 _betAmount, uint256 _endGame) public returns (bool);
	function addPlayer(address _player) public returns (bool);
	function bet(address _player, bytes32 _bet) public payable returns (bool);
	function widthdrawal(uint256 _amount) public returns (bool);
	event LogNewGame(uint256 _betAmount, uint256 _endGame);
	event LogNewPlayer(address _player);
	event LogBet(address _player, bytes32 _value);
	event LogWidthdrawal(address _player, uint256 _amount);
}
