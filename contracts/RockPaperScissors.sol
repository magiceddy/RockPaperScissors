pragma solidity 0.4.21;

import "./IRockPaperScissors.sol";
import "./Ownable.sol";
import "./Player.sol";

contract RockPaperScissors is IRockPaperScissors, Ownable {

	uint8 public constant MAX_PLAYERS = 2;

	uint256 public betAmount;
	uint256 public end;
    uint8 public playersCount;

	enum GameState {
        Hanging,
        Created,
        Start,
        PlayersReached,
        BettingEnd,
        RevealWinner,
        PendingReclaimed
    }
	GameState public state;
    mapping(address => Player) public players;

	event LogStateChange(GameState gameState);

	function RockPaperScissors() public {}

	function createGame(
        uint256 _betAmount,
        uint256 _endGame,
        uint8 _initialStatus
    )
		public
		returns (bool)
	{
		require(_endGame > 0);
        require(_initialStatus < 2);

		betAmount = _betAmount;
		end = _endGame;
		emit LogNewGame(betAmount, end);

		state = GameState(_initialStatus);
		emit LogStateChange(state);
		return true;
	}

	function addPlayer(address _player) public returns (bool) {
        require(state == GameState.Created);
        require(playersCount < 2);

        playersCount++;
		players[_player] = new Player(_player);
		return true;
	}

	function bet() public payable returns (bool) {
        return true;
    }

	function widthdrawal(uint256 _amount) public returns (bool) {
        return true;
    }

	function checkWinner() public returns (bool) {
        return true;
    }

	function revealBet() public returns (bool) {
        return true;
    }
}


/* contract RockPaperScissors {
    address public owner;
    bytes32 public id;
    uint256 public end;
    uint8 constant maxBets = 2;
    uint8 constant maxReveal = 2;
    uint8 constant maxPlayers = 2;

    enum GameState {
        Created,
        Start,
        PlayersReached,
        BettingEnd,
        RevealWinner,
        PendingReclaimed
    }

    struct Player {
        bytes32 hashBet;
        bool join;
        uint8 move;
        uint256 balance;
    }

    struct Match {
        uint256 amount;
        GameState state;
        uint8 playersCount;
        uint8 betCount;
        uint8 revealCount;
        address player1;
        address player2;
        uint256 gameEnd;
    }

    mapping(bytes32 => Match) public games;
    mapping(bytes32 => mapping(address => Player)) public playersByGame;
    mapping(uint8 => uint8) public validBets;
    mapping(address => uint256) public balance;

    function RockPaperScissors() public {
        owner = msg.sender;
        end = 5;
        validBets[1] = 3;
        validBets[2] = 1;
        validBets[3] = 2;
    }

    function createGame(bytes32 _id, uint8 _startState, uint256 _amount)
        public
        returns (bool)
    {
        require(_id != 0x0);
        require(games[_id].playersCount == 0);
        require(_amount > 0);
        require(_startState < 2);

        games[_id].amount = _amount;
        games[_id].state = GameState(_startState);

        if (_startState == 1) {
            require(joinMatch(_id));
        }
        return true;
    }

    function joinMatch(bytes32 _id)
        public
        returns (bool)
    {
        require(games[_id].state == GameState.Start);

        playersByGame[_id][msg.sender] = Player(0, true, 0, 0);
        games[_id].playersCount++;
        games[_id].player1 = msg.sender;

        if (games[_id].playersCount == maxPlayers) {
            games[_id].player2 = msg.sender;
            require(nextMatchState(_id));
        }
        return true;
    }

    function startGame(bytes32 _id) public returns (bool) {
        require(games[_id].state == GameState.Created);
        games[_id].state = GameState.Start;
    }

     function bet(bytes32 _id, bytes32 _bet)
        public
        returns (bool)
    {
        require(playersByGame[_id][msg.sender].join);
        require(games[_id].state == GameState.PlayersReached);
        require(_bet != 0x0);
        require(games[_id].betCount < maxBets);

        playersByGame[_id][msg.sender].hashBet = _bet;
        games[id].betCount++;

        if(games[_id].betCount == maxBets) {
            games[_id].gameEnd = block.number + end;
            require(nextMatchState(_id));
        }
        return true;
    }

    function nextMatchState(bytes32 _id) private returns (bool) {
        require(uint(games[_id].state) < uint(GameState.BettingEnd));
        games[_id].state = GameState(uint(games[_id].state) + 1);
        return true;
    }

    function reveal(bytes32 _id, uint8 _move, bytes32 _secretKey)
        public
        payable
        returns (bool)
    {
        if (msg.value != games[_id].amount) {
            revert();
        }

        require(games[_id].state == GameState.BettingEnd);
        require(validBets[_move] != 0);
        require(keccak256(_move, _secretKey) == playersByGame[_id][msg.sender].hashBet);

        games[_id].revealCount++;
        playersByGame[_id][msg.sender].balance = msg.value;
        playersByGame[_id][msg.sender].move = _move;

        if (games[_id].revealCount == maxReveal) {
            require(nextMatchState(_id));
            require(revealWinner(_id));
        }
        return true;
    }

    function revealWinner(bytes32 _id) public returns (bool) {
        require(games[_id].state == GameState.RevealWinner);

        address pl1 = games[_id].player1;
        address pl2 = games[_id].player2;
        uint8 pl1Move = validBets[playersByGame[_id][pl1].move];
        uint8 pl2Move = playersByGame[_id][pl2].move;
        uint256 amount = games[_id].amount;

        playersByGame[_id][pl1].balance -= amount;
        playersByGame[_id][pl2].balance -= amount;

        if(pl1Move == pl2Move) {
            balance[pl2] -= amount;
            balance[pl1] += amount;
        } else if (pl1Move == validBets[playersByGame[_id][pl2].move]) {
            balance[pl2] += amount;
            balance[pl1] += amount;
        } else {
            balance[pl1] -= amount;
            balance[pl2] += amount;
        }

        delete playersByGame[_id][pl1];
        delete playersByGame[_id][pl2];
        delete games[_id];
        return true;
    }

    function reclaimPending(bytes32 _id) public returns (bool) {
        require(games[_id].gameEnd < block.number);
        require(games[_id].state == GameState.BettingEnd);
        require(playersByGame[_id][msg.sender].balance > 0);

        uint256 amount = playersByGame[_id][msg.sender].balance;
        playersByGame[_id][msg.sender].balance = 0;

        balance[msg.sender] += amount;
        games[_id].state = GameState.PendingReclaimed;
        return true;
    }

    function widthdrawal(uint256 amount) public returns(bool)
    {
        require(balance[msg.sender] >= amount);
        balance[msg.sender] -= amount;

        if(!msg.sender.send(amount)) {
                balance[msg.sender] += amount;
                return false;
        }
        return true;
    }

    function setEnd(uint256 _end) public returns (bool) {
        require(msg.sender == owner);
        end = _end;
    }

    function() public {
        revert();
    }
} */
