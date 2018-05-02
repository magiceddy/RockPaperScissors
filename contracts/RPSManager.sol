pragma solidity 0.4.21;

import "./Ownable.sol";
import "./SafeMath.sol";

contract RPSManager is Ownable {

	using SafeMath for uint256;

	enum RpsMapBet { Rock, Paper, Scissors }

	struct Player {
		bytes32 hashBet;
		uint8 bet;
	}

	struct Game {
		address[] playersAddress;
		mapping(address => Player) players;
		uint256 amount;
		uint256 end;
		uint8 betCount;
		uint8 revealCount;
		bool created;
	}

	mapping(bytes32 => Game) public games;
	mapping(address => uint256) public balances;
	mapping(address => bool) public lockedBalances;

	modifier isPlayer(bytes32 _id) {
		require(
			games[_id].playersAddress[0] == msg.sender ||
			games[_id].playersAddress[1] == msg.sender
		);
		_;
	}

	modifier gameRunning(bytes32 _id) {
		require(block.number < games[_id].end);
		_;
	}

	event LogNewGame(
		bytes32 indexed gameId,
		uint256 amount,
		uint256 end
	);
	event LogPlayerJoined(address player);
	event LogBet(bytes32 hashBet, uint8 betCount);
	event LogRevealBet(uint8 bet, uint8 revealCount);
	event LogLockBalance(address addressLocked);
	event LogUnlockBalance(address addressLocked);
	event LogWinnerIndex(uint8 index);
	event LogRestartGame(bytes32 gameId);
	event LogDeleteGame(bytes32 gameId);
	event LogWithdrawal(uint256 amount);
	event LogDebit(uint256 amount);
	event LogCredit(uint256 amount);

	function createNewGame(
		bytes32 _gameId,
		uint256 _amount,
		uint256 _end
	)
		public
		returns (bool)
	{
		require(!games[_gameId].created);
		require(_end > 0);

		Game memory game;
		game.playersAddress = new address[](0);
		game.amount = _amount;
		game.end = block.number + _end;
		game.created = true;
		games[_gameId] = game;

		joinGame(_gameId);

		emit LogNewGame(_gameId, _amount, _end);
		return true;
	}

	function joinGame(bytes32 _gameId)
		public
		returns (bool)
	{
		Game storage game = games[_gameId];
		require(game.created);
		require(game.playersAddress.length <= 2);

		game.playersAddress.push(msg.sender);
		game.players[msg.sender] = Player(0,0);

		emit LogPlayerJoined(msg.sender);
		return true;
	}

	function setBet(bytes32 _gameId, bytes32 _hashBet, bool useBalance)
		public
		payable
		isPlayer(_gameId)
		gameRunning(_gameId)
		returns (bool)
	{
		require(_hashBet != 0x0);

		Game storage game = games[_gameId];
		require(game.playersAddress.length == 2);
		require(game.betCount < 2);
		require(game.players[msg.sender].hashBet == 0x0);

		uint256 amount = game.amount;

		if(useBalance) {
			require(msg.value == 0);
			require(balances[msg.sender] >= amount);
		} else {
			require(msg.value == amount);
			credit(msg.sender, amount);
		}

		lockedBalances[msg.sender] = true;
		game.players[msg.sender].hashBet = _hashBet;
		game.betCount++;

		emit LogBet(_hashBet, game.betCount);
		emit LogLockBalance(msg.sender);
		return true;
	}

	function revealBet(bytes32 _gameId, uint8 _bet, bytes32 _secretKey)
		public
		isPlayer(_gameId)
		gameRunning(_gameId)
		returns (bool)
	{
		require(_bet >= 0 && _bet <= 2);

		Game storage game = games[_gameId];
		require(game.players[msg.sender].bet == 0x0);
		require(game.betCount == 2);
		require(game.revealCount < 2);
		require(keccak256(_bet, _secretKey) == game.players[msg.sender].hashBet);

		game.players[msg.sender].bet = _bet;
		game.revealCount++;

		emit LogRevealBet(_bet, game.revealCount);
        return true;
	}

	function revealWinner(bytes32 _gameId)
		public
		gameRunning(_gameId)
		returns (bool)
	{
		Game storage game = games[_gameId];
		require(game.revealCount == 2);

		address player1 = game.playersAddress[0];
		address player2 = game.playersAddress[1];
		uint8 player1Bet = game.players[player1].bet;
		uint8 player2Bet = game.players[player2].bet;
		uint256 amount = game.amount;

		uint8 winnerIndex = getWinnerIndex(player1Bet, player2Bet);

		if(winnerIndex != 0) {
		    updateBalances(winnerIndex, amount, player1, player2);
		}

        emit LogWinnerIndex(winnerIndex);

		lockedBalances[player1] = false;
		emit LogUnlockBalance(player1);

		lockedBalances[player2] = false;
		emit LogUnlockBalance(player2);

		restartGame(game, player1, player2);
		emit LogRestartGame(_gameId);
		return true;
	}

	function restartGame(Game storage game, address player1, address player2)
		internal
	{
		game.betCount = 0x0;
		game.revealCount = 0x0;
		game.players[player1].hashBet = 0x0;
		game.players[player2].hashBet = 0x0;
		game.players[player1].bet = 0x0;
		game.players[player2].bet = 0x0;
	}

	function claimBack(bytes32 _gameId)
		public
		isPlayer(_gameId)
		returns (bool)
	{
		Game storage game = games[_gameId];
		canClaimBack(game);

		uint256 betAmount = game.amount;
		address opponentPlayer = getOpponentAddress(game, msg.sender);

		debit(opponentPlayer, betAmount);
		credit(msg.sender, betAmount);

		lockedBalances[msg.sender] = false;
		emit LogUnlockBalance(msg.sender);

		delete games[_gameId];
		emit LogDeleteGame(_gameId);
		return true;
	}

	function canClaimBack(Game storage game) internal view {
		require(block.number > game.end);

		if (game.betCount == 1) {
			require(game.players[msg.sender].hashBet != 0x0);
		} else if (game.revealCount == 1) {
			require(game.players[msg.sender].bet > 0);
		} else {
			revert();
		}
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
		require(winnerIndex > 0 && winnerIndex <= 2);

		if (winnerIndex == 1) {
			debit(player2, betAmount);
			credit(player1, betAmount);
		} else {
			debit(player1, betAmount);
			credit(player2, betAmount);
		}
		return true;
	}

	function withdrawal(uint256 _amount) public returns (bool) {
		require(balances[msg.sender] >= _amount);
		require(!lockedBalances[msg.sender]);

		debit(msg.sender, _amount);

		require(msg.sender.send(_amount));
		emit LogWithdrawal(_amount);
		return true;
	}

	function getOpponentAddress(Game memory game, address player)
		internal
		pure
		returns (address)
	{
		return game.playersAddress[0] == player ?
		game.playersAddress[1] :
		game.playersAddress[0];
	}

	function debit(address _account, uint256 _amount)
		internal
		returns (bool)
	{
		require(balances[_account] >= _amount);
		balances[_account] = balances[_account].sub(_amount);

		emit LogDebit(_amount);
		return true;
	}

	function credit(address _account, uint256 _amount)
		internal
		returns (bool)
	{
		balances[_account] = balances[_account].add(_amount);
		emit LogCredit(_amount);
		return true;
	}

	function getWinnerIndex(uint8 _player1Bet, uint8 _player2Bet)
        public
        pure
        returns (uint8 index)
    {
        if (_player1Bet == _player2Bet) {
            index = 0;
        }
        index = betConverter(_player1Bet) == _player2Bet ? 1 : 2;
    }

	function betConverter(uint8 bet) public pure returns (uint8) {
		if (bet == uint(RpsMapBet.Rock)) {
			return 2;
		} else if (bet == uint(RpsMapBet.Paper)) {
			return 0;
		} else if (bet == uint(RpsMapBet.Scissors)) {
			return 1;
		} else {
			revert();
		}
	}


	function generateHashBet(uint8 _bet, bytes32 _secretKey)
        public
        pure
        returns (bytes32)
    {
        return keccak256(_bet, _secretKey);
    }

	function() public payable {
		revert();
	}
}
