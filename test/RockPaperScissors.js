const Promise = require('bluebird');
const RockPaperScissors = artifacts.require("./RockPaperScissors.sol");
const Player = artifacts.require("./Player.sol");
const TestUtils = require('../TestUtils.js');
const Web3Utils = require('web3-utils');

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.personal, { suffix: "Promise" });

let instance;
let txCost = ``;

contract('RockPaperScissors', accounts => {

	const owner = accounts[0];
	const player1 = accounts[1];
	const player2 = accounts[2];

	const amount = 10;
	const end = 3;
	const secretKey = web3.sha3('secretKey');
	const bet = 2;

	const hashBet = Web3Utils.soliditySha3(
		{
			t: 'uint8',
			v: bet
		},
		{
			t: 'bytes32',
			v: secretKey
		}
	);


	beforeEach(async() => {
		instance = await RockPaperScissors.new({ from: owner });
	});

	describe('contructor', () => {

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(
					RockPaperScissors.new({ from: owner, value: amount}),
					'constructor'
				);
			});
		});

		describe('success case', () => {

			it('should set the contract owner', async() => {
				const contractOwner = await instance.owner();
				const state = await instance.state();
				assert.strictEqual(contractOwner, owner, 'Invalid Owner');
				assert.equal(state, 0, 'wrong state');
			});
		});
	});

	describe('createGame', () => {

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(
					instance.createGame(
						amount, end,
						{ from : owner, value: amount }
					)
				);
			});

			it('should revert with zero end', async() => {
				try {
					const txObject = await instance.createGame(
						amount, 0,
						{ from: owner }
					);
					assert.isUndefined(txObject, 'game created with zero end');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert zero end');
				}
			});

			it('should fail with no owner calling', async() => {
				try {
					const txObject = await instance.createGame(
						amount, end,
						{ from: player1 }
					);
					assert.isUndefined(txObject, 'no owner create a game');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert incorrect owner calling'
					);
				}
			});
		});

		describe('success case', () => {
			let txObject;

			it('should create the game', async() => {
				txObject = await instance.createGame(
					amount, end,
					{ from: owner }
				);
				const betAmount = await instance.betAmount();
				const _end = await instance.end();
				const state = await instance.state();

				assert.equal(betAmount, amount, 'wrong amount');
				assert.equal(_end, end, 'wrong end');
				assert.equal(state, 1, 'wrong state');
			});

			it('should log all event', () => {
				const logs = txObject.logs;
				assert.equal(logs[0].event, 'LogNewGame', 'wrong LogNewGame');
				assert.equal(logs[1].event, 'LogStateChange', 'wrong LogStateChange');

				const LogNewGameArgs = logs[0].args;
				const LogStateChangeArgs = logs[1].args;

				assert.equal(
					LogNewGameArgs._betAmount.toString(10),
					amount,
					'worng log amount'
				);
				assert.equal(
					LogNewGameArgs._endGame.toString(10),
					end,
					'wrong log end'
				);
			});
		});
	});

	describe('addPlayer', () => {

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(
					instance.addPlayer(player1, { value: amount })
				);
			});

			it('should revert without game creation', async() => {
				try {
					const txObject = await instance.addPlayer(player1, { from: owner });
					assert.isUndefined(txObject, 'add player on no initialized game');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert on no initialized game')
				}
			});

			it('should fail with more than two players', async() => {
				await instance.createGame(amount, end, { from: owner });
				await instance.addPlayer(player1, { from : owner });
				await instance.addPlayer(player2, { from : owner });

				try {
					const txObject = await instance.addPlayer(accounts[3], { from : owner });
					assert.isUndefined(txObject, 'add third player');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert adding third player'
					);
				}
			});

			it('should fail with no owner call', async() => {
				await instance.createGame(amount, end, { from: owner });
				try {
					const txObject = await instance.addPlayer(accounts[3], { from : player1 });
					assert.isUndefined(txObject, 'no owner add player');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert when no owner add a player'
					);
				}
			});
		});

		describe('success case', () => {

			it('should add player to game', async() => {
				await instance.createGame(amount, end, { from: owner });
				await instance.addPlayer(player1, { from : owner });

				const playerAddress = await instance.players(player1);
				const playerInstance = Player.at(playerAddress);
				const _player = await playerInstance.playerAddress();
				assert.equal(_player, player1, 'add wrong player');
			});

			it('should chage state to PlayersReached', async() => {
				await instance.createGame(amount, end, { from: owner });
				await instance.addPlayer(player1, { from : owner });

				const txObject = await instance.addPlayer(player2, { from : owner });
				const state = await instance.state();

				assert.equal(state.toString(10), 2, 'no PlayersReached state');
				assert.equal(txObject.logs[0].event, 'LogNewPlayer', 'no LogNewPlayer');
				assert.equal(txObject.logs[1].event, 'LogStateChange', 'no LogStateChange');
			});
		});
	});

	describe('bet', () => {

		beforeEach(async() => {
			await instance.createGame(amount, end, { from: owner });
			await instance.addPlayer(player1, { from: owner });
			await instance.addPlayer(player2, { from: owner });
		});

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				try {
					const txObject = await instance.bet(
						player1, hashBet,
						{ from: owner, value: amount }
					);
					assert.isUndefined(txObject, 'bet with value in transaction');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert for value in transactin'
					);
				}
			});

			it('should fail from no owner', async() => {
				try {
					const txObject = await instance.bet(
						player1, hashBet,
						{ from: player2, value: 0 }
					);
					assert.isUndefined(txObject, 'bet from no owner');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert from no owner transaction'
					);
				}
			});

			it('should fail if state isn\'t PlayersReached', async() => {
				const thisInstance = await RockPaperScissors.new({ from: owner });
				await thisInstance.createGame(amount, end, { from: owner });
				await thisInstance.addPlayer(player1, { from: owner });

				try {
					const txObject = await instance.bet(
						owner, hashBet,
						{ from: player2, value: 0 }
					);
					assert.isUndefined(txObject, 'bet in no PlayersReached state');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert in no PlayersReached state'
					);
				}
			});

			it('should fail for zero bet', async() => {
				try {
					const txObject = await instance.bet(
						owner, 0x0,
						{ from: player2, value: 0 }
					);
					assert.isUndefined(txObject, 'bet with zero');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert bet with zero'
					);
				}
			});
		});

		describe('success case', () => {

			let txObject;

			it('should bet', async() => {
				await instance.bet(player1, hashBet, { from: owner });
				txObject = await instance.bet(player2, hashBet, { from: owner });

				const betCount = await instance.betCount();
				assert.equal(betCount, 2, 'wrong bet count');

				const state = await instance.state();
				assert.equal(state.toString(10), 3, 'wrong state');

				const player1Address = await instance.players(player1);
				const player2Address = await instance.players(player2);
				const Player1 = Player.at(player1Address);
				const Player2 = Player.at(player1Address);
				const Player1Bet = await Player1.hashBet();
				const Player2Bet = await Player2.hashBet();

				assert.equal(Player1Bet, hashBet, 'register wrong bet');
				assert.equal(Player2Bet, hashBet, 'register wrong bet');
			});

			it('should log', () => {
				const { logs } = txObject;
				assert.equal(logs[0].event, 'LogBet', 'wrong Log');
				assert.equal(logs[0].args._player, player2, 'wrong player');
				assert.equal(logs[0].args._value, hashBet, 'wrong player');
				assert.equal(logs[1].event, 'LogStateChange', 'wrong Log');
			});
		});
	});

	describe('revealBet', () => {

		beforeEach(async() => {
			await instance.createGame(amount, end, { from: owner });
			await instance.addPlayer(player1, { from: owner });
			await instance.addPlayer(player2, { from: owner });
			await instance.bet(player1, hashBet, { from: owner });
		});

		describe('fail case', () => {

			it('shoul fail with value in transaction', async() => {
				await TestUtils.noValue(instance.revealBet(
					player1, bet, secretKey,
					{ from: owner, value: 1 }
				));
			});

			it('should fail transaction no owner', async() => {
				try {
					const txObject = await instance.revealBet(
						player1, bet, secretKey,
						{ from: player1 }
					);
					assert.isUndefined(txObject, 'no owner transaction');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert no owner tx');
				}
			});

			it('should fail if state not equal BettingEnd', async() => {
				try {
					const txObject = await instance.revealBet(
						player1, bet, secretKey,
						{ from: owner }
					);
					assert.isUndefined(txObject, 'bet without betting end state');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert without betting end state'
					);
				}
			});

			it('should fail for invalid reveal', async() => {
				await instance.bet(player2, hashBet, { from: owner });
				try {
					const txObject = await instance.revealBet(
						player1, 0xaa, secretKey,
						{ from: owner }
					);
					assert.isUndefined(txObject, 'bet without bettingEnd state');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert without bettingEnd state'
					);
				}
			});

			it('should fail with double reveal', async() => {
				await instance.bet(player2, hashBet, { from: owner });
				await instance.revealBet(
					player1, bet, secretKey,
					{ from: owner }
				);
				 try {
					 const txObject = await await instance.revealBet(
	 					player1, bet, secretKey,
	 					{ from: owner }
	 				);
					assert.isUndefined(txObject, 'double reveal');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert double reveal');
				}
			});

			it('should fail on invalid bet', async() => {
				await instance.bet(player2, hashBet, { from: owner });
				 try {
					 const txObject = await await instance.revealBet(
	 					player1, 5, secretKey,
	 					{ from: owner }
	 				);
					assert.isUndefined(txObject, 'accept invalid bet');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert with invalid bet');
				}
			});
		});

		describe('success case', () => {

			let txObject;

			it('should set state to RevealWinner', async() => {
				await instance.bet(player2, hashBet, { from: owner });
				await instance.revealBet(
					player1, bet, secretKey,
					{ from: owner }
				);
				txObject = await instance.revealBet(
					player2, bet, secretKey,
					{ from: owner }
				);

				const revealCount = await instance.revealCount();
				assert.equal(revealCount, 2, 'wrong revealCount');

				const player1Address = await instance.players(player1);
				const Player1 = Player.at(player1Address);
				const Player1Bet = await Player1.bet();
				assert.equal(Player1Bet, bet, 'wrong bet');

				const state = await instance.state();
				assert.equal(state, 4, 'wrong state');
			});

			it('should log', () => {
				const logs = txObject.logs;
				assert.equal(logs[0].event, 'LogRevealBet', 'no LogRevealBet');
				assert.equal(logs[1].event, 'LogStateChange', 'no LogStateChange');
				assert.equal(logs[0].args._player, player2, 'wrong player in log');
				assert.equal(logs[0].args._bet, bet, 'wrong bet in log');
				assert.equal(logs[0].args._totalBet, 2, 'wrong totalBet in log');
				assert.equal(logs[1].args.gameState, 4, 'wrong state in log');
			});
		});
	});

	describe('revealWinner', () => {

		beforeEach(async() => {
			await instance.createGame(amount, end, { from: owner });
			await instance.addPlayer(player1, { from: owner });
			await instance.addPlayer(player2, { from: owner });
			await instance.bet(player1, hashBet, { from: owner });
			await instance.bet(player2, hashBet, { from: owner });
			await instance.revealBet(player1, bet, secretKey, { from: owner });
		});

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(instance.revealWinner(
					player1, player2,
					{ from: owner, value: 1 }
				));
			});

			it('should fail no owner transaction', async() => {
				await instance.revealBet(player2, bet, secretKey, { from: owner });

				try {
					const txObject = await instance.revealWinner(
						player1, player2,
						{ from: player1 }
					);
					assert.isUndefined(txObject, 'transaction by no owner');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert on no owner transaction'
					);
				}
			});

			it('should fail on state not equal RevealWinner', async() => {

				try {
					const txObject = await instance.revealWinner(
						player1, player2,
						{ from: owner }
					);
					assert.isUndefined(txObject, 'reveal accepted on wrong state');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert on wrong state'
					);
				}
			});

			it('should fail if player does not exist', async () => {
				await instance.revealBet(player2, bet, secretKey, { from: owner });

				try {
					const txObject = await instance.revealWinner(
						accounts[4], player2,
						{ from: owner }
					);
					assert.isUndefined(txObject, 'undefined player');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert for undefined player'
					);
				}
			});
		});

		describe('success case', () => {

			let txObject;

			it('should change the state', async() => {
				await instance.revealBet(player2, bet, secretKey, { from: owner });
				txObject = await instance.revealWinner(
					player2, player2,
					{ from: owner }
				);

				const winnerIndex = await instance.winnerIndex();
				assert.equal(winnerIndex.toString(10), 3, 'wrong index');

				const state = await instance.state();
				assert.equal(state, 5, 'wrong state');
			});

			it('should emit logs', () => {
				const { logs } = txObject;
				assert.equal(logs[0].event, 'LogWinnerIndex', 'no LogWinnerIndex');
				assert.equal(logs[1].event, 'LogStateChange', 'no LogStateChange');
				assert.equal(logs[0].args._winnerIndex, 3, 'wrong index in log');
				assert.equal(logs[1].args.gameState, 5, 'wrong state in log');
			});
		});
	});

	describe('getWinnerIndex', () => {

		describe('fail case', () => {

			it('should revert on invalid values', async() => {
				try {
					const txObject = await instance.getWinnerIndex(
						1, 4,
						{ from: owner }
					);
					assert.isUndefined(txObject, 'accept invalid value');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert invalid value');
				}
			});
		});

		describe('success case', async() => {

			it('should win ROCK vs SCISSORS', async() => {
				const winIndex = await instance.getWinnerIndex(1, 3, { from: owner });
				assert.equal(winIndex.toString(10), 1, 'wrong index');
			});

			it('should loose ROCK vs PAPER', async() => {
				const winIndex = await instance.getWinnerIndex(1, 2, { from: owner });
				assert.equal(winIndex.toString(10), 2, 'wrong index');
			});

			it('should loose PAPER vs SCISSORS', async() => {
				const winIndex = await instance.getWinnerIndex(2, 3, { from: owner });
				assert.equal(winIndex.toString(10), 2, 'wrong index');
			});

			it('should draw PAPER vs PAPER', async() => {
				const winIndex = await instance.getWinnerIndex(2, 2, { from: owner });
				assert.equal(winIndex.toString(10), 3, 'wrong index');
			});

			it('should draw ROCK vs ROCK', async() => {
				const winIndex = await instance.getWinnerIndex(1, 1, { from: owner });
				assert.equal(winIndex.toString(10), 3, 'wrong index');
			});

			it('should draw SCISSORS vs SCISSORS', async() => {
				const winIndex = await instance.getWinnerIndex(3, 3, { from: owner });
				assert.equal(winIndex.toString(10), 3, 'wrong index');
			});
		});
	});
});
