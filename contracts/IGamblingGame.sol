pragma solidity 0.4.21;

contract IGamblingGame {
	function createGame(uint256 _betAmount, uint256 _endGame) public returns (bool);
	function addPlayer(address _player) public returns (bool);
	function bet() public payable returns (bool);
	function widthdrawal(uint256 amount) public returns (bool);
	event LogNewGame(uint256 _betAmount, uint256 _endGame);
	event LogAddPlayer(address _player);
	event LogBet(uint256 value);
	event LogWidthdrawal(address player, uint256 amount);
}
