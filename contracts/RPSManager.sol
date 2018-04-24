pragma solidity 0.4.21;

import "./Ownable.sol";
import "./RockPaperScissors.sol";
import "./Bank.sol";

contract RPSManager is Ownable, Bank {

	struct Game {
		address[] players;
		RockPaperScissors rps;
	}

	mapping(bytes32 => Game) public games;

	modifier isPlayer(bytes32 _id) {
		require(
			games[_id].players[0] == msg.sender ||
			games[_id].players[1] == msg.sender
		);
		_;
	}

	event LogNewGame(bytes32 indexed gameId, RockPaperScissors rpsAddress);
	event LogAddPlayerToGame(bytes32 indexed gameId, address indexed player);

	function createNewGame(
		bytes32 _gameId,
		uint256 _amount,
		uint256 _end,
		bool _addPlayer
	)
		public
		returns (bool)
	{
		require(games[_gameId].rps == address(0x0));

		games[_gameId] = Game(new address[](0), new RockPaperScissors());
		RockPaperScissors rps = getGame(_gameId);

		require(rps.createGame(_amount, _end));
		emit LogNewGame(_gameId, rps);

		if(_addPlayer) {
			require(addPlayer(_gameId));
		}
		return true;
	}

	function addPlayer(bytes32 _gameId) public returns (bool) {
		require(games[_gameId].players.length < 2);

		RockPaperScissors rps = getGame(_gameId);

		require(rps.addPlayer(msg.sender));
		games[_gameId].players.push(msg.sender);

		if(!accounts[msg.sender]) {
			addAccount(msg.sender);
		}

		emit LogAddPlayerToGame(_gameId, msg.sender);
		return true;
	}

	function setBet(bytes32 _gameId, bytes32 _hashBet, bool useBalance)
		public
		payable
		isPlayer(_gameId)
		returns (bool)
	{
		RockPaperScissors rps = getGame(_gameId);
		uint256 amount = rps.betAmount();

		if(useBalance && canUseBalance(amount, msg.value)) {
			debit(msg.sender, amount);
		} else {
			require(msg.value == amount);
		}

		require(rps.bet(msg.sender, _hashBet));
		return true;
	}

	function revealBet(bytes32 _gameId, uint8 _bet, bytes32 _secretKey)
		public
		isPlayer(_gameId)
		returns (bool)
	{
		RockPaperScissors rps = getGame(_gameId);
		require(rps.revealBet(msg.sender, _bet, _secretKey));
		return true;
	}

	function revealWinner(bytes32 _gameId)
		public
		isPlayer(_gameId)
		returns (bool)
	{
		RockPaperScissors rps = getGame(_gameId);
		address player1 = games[_gameId].players[0];
		address player2 = games[_gameId].players[1];
		uint256 betAmount = rps.betAmount();

		require(rps.revealWinner(player1, player2));
		uint8 winnerIndex = rps.winnerIndex();

		require(updateBalances(winnerIndex, betAmount, player1, player2));
		rps.setOver();
		return true;
	}

	function getGame(bytes32 _gameId) public view returns (RockPaperScissors) {
		require(games[_gameId].rps != address(0x0));
		return RockPaperScissors(games[_gameId].rps);
	}

	function updateBalances(
		uint8 winnerIndex,
		uint256 betAmount,
		address player1,
		address player2
	)
		internal
		returns (bool)
	{
		if (winnerIndex == 1) {
			credit(player1, betAmount * 2);
		} else if( winnerIndex == 2) {
			credit(player2, betAmount * 2);
		} else if( winnerIndex == 3){
			credit(player1, betAmount);
			credit(player2, betAmount);
		}
		return true;
	}

	function canUseBalance(uint256 amount, uint256 msgValue)
		public
		view
		returns (bool)
	{
		require(msgValue == 0);
		require(balances[msg.sender] >= amount);
		return true;
	}

	function claimBack(bytes32 _gameId)
		public
		isPlayer(_gameId)
		returns (bool)
	{
		RockPaperScissors rps = getGame(_gameId);
		require(uint(rps.state()) == 4);
		require(block.number > rps.end());
		require(rps.playerHasBet(msg.sender));

		uint8 opponentIndex = getOpponentIndex(_gameId, msg.sender);
		address opponentPlayer = games[_gameId].players[opponentIndex];

		require(!rps.playerHasBet(opponentPlayer));

		uint256 balance = rps.betAmount();
		require(credit(msg.sender, balance * 2));
		rps.setOver();
		return true;
	}

	function withdrawal(uint256 amount) public returns (bool) {
		require(balances[msg.sender] >= amount);
		debit(msg.sender, amount);

		require(msg.sender.send(amount));
		return true;
	}

	function getOpponentIndex(bytes32 _gameId, address player)
		public
		view
		returns (uint8)
	{
		if(games[_gameId].players[0] == player) {
			return 1;
		} else {
			return 0;
		}
	}

	function claimBack(bytes32 _gameId)
		public
		isPlayer(_gameId)
		returns (bool)
	{
		RockPaperScissors rps = getGame(_gameId);
		require(uint(rps.state()) == 4);
		require(block.number > rps.end());
		require(rps.playerHasBet(msg.sender));

		uint8 opponentIndex = getOpponentIndex(_gameId, msg.sender);
		address opponentPlayer = games[_gameId].players[opponentIndex];

		require(!rps.playerHasBet(opponentPlayer));

		uint256 balance = rps.betAmount();
		require(creaditPlayer(msg.sender, balance * 2));
		rps.setOver();
		return true;
	}

	function withdrawal(uint256 amount) public returns (bool) {
		require(balances[msg.sender] >= amount);
		balances[msg.sender] = balances[msg.sender].sub(amount);
		require(msg.sender.send(amount));
		return true;
	}

	function getOpponentIndex(bytes32 _gameId, address player)
		public
		view
		returns (uint8)
	{
		if(games[_gameId].players[0] == player) {
			return 1;
		} else {
			return 0;
		}
	}

	function() public payable {
		revert();
	}
}
