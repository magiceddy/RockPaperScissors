pragma solidity 0.4.21;

import "./IRockPaperScissors.sol";
import "./Ownable.sol";
import "./Player.sol";

contract RockPaperScissors is IRockPaperScissors, Ownable {
    uint8 public constant MAX_PLAYERS = 2;

    uint256 public betAmount;
    uint256 public end;
    uint8 public playersCount;
    uint8 public betCount;
    uint8 public revealCount;
    uint8 public winnerIndex;

    enum GameState {
        Hanging,
        Created,
        PlayersReached,
        BettingEnd,
        RevealWinner,
        WinnerRevealed,
        Over
    }
    GameState public state;

    mapping(address => Player) public players;
    mapping(uint8 => uint8) public validBets;

    event LogStateChange(GameState gameState);
    event LogWinnerIndex(uint8 _winnerIndex);

    function RockPaperScissors() public {
        state = GameState.Hanging;
        validBets[1] = 3; // Rock
        validBets[2] = 1; // Paper
        validBets[3] = 2; // Scissors

        emit LogStateChange(state);
    }

    function createGame(
        uint256 _betAmount,
        uint256 _endGame
    )
        public
        onlyOwner
        returns (bool)
    {
        require(_endGame > 0);
        require(state == GameState.Hanging);

        betAmount = _betAmount;
	    end = _endGame;
	    emit LogNewGame(betAmount, end);

	    state = GameState.Created;
	    emit LogStateChange(state);
        return true;
    }

    function addPlayer(address _player) public  onlyOwner returns (bool) {
        require(state == GameState.Created);
        require(playersCount < 2);

        players[_player] = new Player(_player);
        playersCount++;

        emit LogNewPlayer(_player);

        if(playersCount == MAX_PLAYERS) {
            state = GameState.PlayersReached;
            emit LogStateChange(state);
        }
        return true;
    }

    function bet(address _player, bytes32 _bet)
	    public
        payable
        onlyOwner
        returns (bool)
    {
        require(msg.value == 0);
        require(state == GameState.PlayersReached);
        require(_bet != 0x0);

        Player player = getPlayer(_player);
        player.setHashBet(_bet);
        betCount++;

        emit LogBet(_player, _bet);

        if(betCount == MAX_PLAYERS) {
            state = GameState.BettingEnd;
            emit LogStateChange(state);
        }

        return true;
	}

    function revealWinner(address _player1, address _player2)
	    public
        onlyOwner
        returns (bool)
    {
        require(state == GameState.RevealWinner);

        Player player1 = getPlayer(_player1);
        Player player2 = getPlayer(_player2);

        uint8 player1Bet = player1.bet();
        uint8 player2Bet = player2.bet();
        winnerIndex = getWinnerIndex(player1Bet, player2Bet);

        require(winnerIndex > 0);
        emit LogWinnerIndex(winnerIndex);

        state = GameState.WinnerRevealed;
        emit LogStateChange(state);
        return true;
    }

    function revealBet(address _player, uint8 _bet, bytes32 _secretKey)
        public
        onlyOwner
        returns (bool)
    {
        require(_bet > 0 && _bet <= 3);
        require(state == GameState.BettingEnd);

        Player player = getPlayer(_player);
        require(keccak256(_bet, _secretKey) == player.hashBet());

        player.setBet(_bet);
        revealCount++;

        emit LogRevealBet(_player, _bet, revealCount);

        if (revealCount == MAX_PLAYERS) {
            state = GameState.RevealWinner;
            emit LogStateChange(state);
        }
        return true;
    }

    function getPlayer(address _player) public view returns (Player) {
        require(players[_player] != address(0x0));
        return Player(players[_player]);
    }

    function playerHasBet(address _player) public view returns (bool) {
        Player player = getPlayer(_player);
        return player.bet() > 0 ? true : false;
    }

    function getWinnerIndex(uint8 _player1Bet, uint8 _player2Bet)
        public
        view
        returns (uint8 index)
    {
        require(validBets[_player1Bet] != 0x0);
        require(validBets[_player2Bet] != 0x0);

        if (_player1Bet == _player2Bet) {
            index = 3;
        } else if (validBets[_player1Bet] == _player2Bet) {
            index = 1;
        } else {
            index = 2;
        }
    }

    function setOver() public onlyOwner returns (bool) {
        state = GameState.Over;
    }

    function() public payable {
        revert();
    }
}
