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
		});


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
});

// contract('RockPaperScissors',  accounts => {
//
// 	const owner = accounts[0];
// 	const player1 = accounts[1];
// 	const player2 = accounts[2];
//
// 	const id = "My Game";
// 	const amount = 10;
// 	const initialStatus = 1;
//
// 	beforeEach(async() => {
// 		instance = await RPS.new({ from: owner });
// 	});
//
// 	describe('Contructor', () => {
//
// 		describe('fail case', () => {
//
// 			it('should fail with value in transaction', async() => {
// 				await noValue(RPS.new({ from: owner, value: 1}), 'constructor');
// 			});
// 		});
//
// 		describe('success case', () => {
//
// 			it('should set the contract owner', async() => {
// 				const contractOwner = await instance.owner();
// 				assert.strictEqual(contractOwner, owner, 'Invalid Owner');
// 			});
// 		});
// 	});
//
// 	describe('createGame', () => {
//
// 		describe('fail case', () => {
//
// 			it('should fail with value in transaction', async() => {
// 				await noValue(instance.createGame(
// 					id, initialStatus, amount,
// 					{ value: 1, from: player1 })
// 				 );
// 			});
//
// 			it('should fail with zero id', async() => {
// 				try {
// 					const txObj = await instance.createGame(
// 						0, initialStatus, amount,
// 						{ from: player1 }
// 					);
// 					assert.isUndefined(txObj, 'game created with zero id');
// 				} catch(err) {
// 					assert.include(err.message, 'revert', 'no revert with zero id');
// 				}
// 			})
//
// 			it('should fail with same game ongoing', async() => {
// 				await await instance.createGame(
// 					id, initialStatus, amount,
// 					{ from: player1 }
// 				);
//
// 				try {
// 					const txObj = await instance.createGame(id, 1, amount,
// 						{ from: player1 }
// 					);
// 					assert.isUndefined(txObj, 'game created with same id');
// 				} catch(err) {
// 					assert.include(err.message, 'revert', 'no revert with same id');
// 				}
// 			});
//
// 			it('should fail with zero amount', async() => {
// 				try {
// 					const txObj = await instance.createGame(
// 						id, initialStatus, 0,
// 						{ from: player1 }
// 					);
// 					assert.isUndefined(txObj, 'game created with zero amount');
// 				} catch(err) {
// 					assert.include(err.message, 'revert', 'no revert with zero amount');
// 				}
// 			});
//
// 			it('should fail with wrong status code', async() => {
// 				try {
// 					const txObj = await instance.createGame(
// 						id, 3, amount,
// 						{ from: player1 }
// 					);
// 					assert.isUndefined(txObj, 'game created with wrong status code');
// 				} catch(err) {
// 					assert.include(
// 						err.message,
// 						'revert',
// 						'no invalid opcode with wrong status code'
// 					);
// 				}
// 			});
// 		});
//
// 		describe('success case', async() => {
//
// 			describe('it should create the match and join msg.sender', () => {
// 				beforeEach(async() => {
// 					const txObj = await instance.createGame(
// 						id, initialStatus, amount,
// 						{ from: player1 }
// 					);
// 				});
//
// 				it('should create the match', async() => {
// 					const match = await instance.games(id);
// 					assert.equal(match[0].toString(10), amount, 'save wrong amount');
// 					assert.equal(match[1].toString(10), 1, 'wrong state');
// 					assert.equal(match[2].toString(10), 1, 'wrong players number');
// 					assert.equal(match[3].toString(10), 0, 'field is not zero');
// 					assert.equal(match[4].toString(10), 0, 'field is not zero');
// 					assert.equal(match[5], player1, 'set incorrect player');
// 					assert.equal(match[6].toString(10), 0, 'set incorrect player');
// 				});
//
// 				it('should create the first player', async() => {
// 					const firstPlayer = await instance.playersByGame(id, player1);
// 					assert.equal(firstPlayer[0].toString(10), 0, 'bet is present');
// 					assert.isTrue(firstPlayer[1], 'not joined');
// 					assert.equal(firstPlayer[2].toString(10), 0, 'move is present');
// 				});
//
// 				it('should not create second player', async() => {
// 					const secondPlayer = await instance.playersByGame(id, player2);
// 					assert.isFalse(secondPlayer[1], 'secondPlayer joined match');
// 				});
// 			});
//
// 			describe('it should create the match without players', () => {
//
// 				beforeEach(async() => {
// 					const txObj = await instance.createGame(
// 						id, 0, amount,
// 						{ from: player1 }
// 					);
// 				});
//
// 				it('should create the match', async() => {
// 					const match = await instance.games(id);
// 					assert.equal(match[0].toString(10), amount, 'save wrong amount');
// 					assert.equal(match[1].toString(10), 0, 'wrong state');
// 					assert.equal(match[2].toString(10), 0, 'field is not zero');
// 					assert.equal(match[3].toString(10), 0, 'field is not zero');
// 					assert.equal(match[4].toString(10), 0, 'field is not zero');
// 					assert.equal(match[5].toString(10), 0, 'field is not zero');
// 					assert.equal(match[6].toString(10), 0, 'field is not zero');
// 				});
//
// 				it('should not create the first player', async() => {
// 					const firstPlayer = await instance.playersByGame(id, player1);
// 					assert.isFalse(firstPlayer[1], 'firstPlayer joined match');
// 				});
//
// 				it('should not create second player', async() => {
// 					const secondPlayer = await instance.playersByGame(id, player2);
// 					assert.isFalse(secondPlayer[1], 'secondPlayer joined match');
// 				});
// 			});
// 		});
// 	});
//
// 	describe('joinMatch', () => {
//
// 		describe('fail case', () => {
//
// 			it('should fail with value in transaction', async() => {
// 				await noValue(instance.joinMatch(
// 					id, { value: amount, from: player2 })
// 				);
// 			});
//
// 			it('should fail without match created', async() => {
// 				try {
// 					const txObj = await instance.joinMatch(id);
// 					assert.isUndefined(txObj, 'join a non created match');
// 				} catch (err) {
// 					assert.include(
// 						err.message,
// 						'revert',
// 						'no revert with non created match'
// 					);
// 				}
// 			});
//
// 			it('should fail for third player [Created Status]', async() => {
// 				await instance.createGame(
// 					id, 0, 10,
// 					{ from: player1 }
// 				);
//
// 				await instance.startGame(id, { from: player1 });
//
// 				await instance.joinMatch(id, { from: player1 });
// 				await instance.joinMatch(id, { from: player2 });
//
// 				try {
// 					txObj = await instance.joinMatch(id, { from: accounts[3] });
// 					assert.isUndefined(txObj, 'third player joined the match');
// 				} catch (err) {
// 					assert.include(
// 						err.message,
// 						'revert',
// 						'no revert for third player joined the match'
// 					);
// 				}
// 			});
//
// 			it('should fail for third player [Start Status]', async() => {
// 				await instance.createGame(
// 					id, 1, 10,
// 					{ from: player1 }
// 				);
//
// 				await instance.joinMatch(id, { from: player2 });
//
// 				try {
// 					txObj = await instance.joinMatch(id, { from: accounts[3] });
// 					assert.isUndefined(txObj, 'third player joined the match');
// 				} catch (err) {
// 					assert.include(
// 						err.message,
// 						'revert',
// 						'no revert for third player joined the match'
// 					);
// 				}
// 			});
// 		});
//
// 		describe('success case', () => {
//
// 			describe('Start Status', () => {
//
// 				it('should add player to match', async() => {
// 					const txObj = await  instance.createGame(
// 						id, 1, amount,
// 						{ from: player1 }
// 					);
// 					await instance.joinMatch(id, { from: player2 });
//
// 					const firstPlayer = await instance.playersByGame(id, player1);
// 					assert.equal(firstPlayer[0].toString(10), 0, 'bet is present');
// 					assert.isTrue(firstPlayer[1], 'not joined');
// 					assert.equal(firstPlayer[2].toString(10), 0, 'move is present');
//
// 					const secondPlayer = await instance.playersByGame(id, player2);
// 					assert.equal(secondPlayer[0].toString(10), 0, 'bet is present');
// 					assert.isTrue(secondPlayer[1], 'not joined');
// 					assert.equal(secondPlayer[2].toString(10), 0, 'move is present');
//
// 					const match = await instance.games(id);
// 					assert.equal(match[1].toString(10), 2, 'status not equal PlayersReached');
// 					assert.equal(match[2].toString(10), 2, 'invalid number of players');
// 					assert.equal(match[5], player1, 'not corrct player');
// 					assert.equal(match[6], player2, 'not correct player');
// 				});
// 			});
//
// 			describe('Created Status', () => {
//
// 				it('should add player to match', async() => {
// 					const txObj = await  instance.createGame(
// 						id, 0, amount,
// 						{ from: player1 }
// 					);
// 					await instance.startGame(id);
// 					await instance.joinMatch(id, { from: player1 });
// 					await instance.joinMatch(id, { from: player2 });
//
// 					const firstPlayer = await instance.playersByGame(id, player1);
// 					assert.equal(firstPlayer[0].toString(10), 0, 'bet is present');
// 					assert.isTrue(firstPlayer[1], 'not joined');
// 					assert.equal(firstPlayer[2].toString(10), 0, 'move is present');
//
// 					const secondPlayer = await instance.playersByGame(id, player2);
// 					assert.equal(secondPlayer[0].toString(10), 0, 'bet is present');
// 					assert.isTrue(secondPlayer[1], 'not joined');
// 					assert.equal(secondPlayer[2].toString(10), 0, 'move is present');
//
// 					const match = await instance.games(id);
// 					assert.equal(match[1].toString(10), 2, 'status not equal PlayersReached');
// 					assert.equal(match[2].toString(10), 2, 'invalid number of players');
// 					assert.equal(match[5], player1, 'not corrct player');
// 					assert.equal(match[6], player2, 'not correct player');
// 				});
// 			});
// 		});
// 	});
//
// 	describe('startGame', () => {
//
// 		describe('fail case', () => {
//
// 			it('should fail for invalid Pre State', async() => {
// 				await instance.createGame(
// 					id, initialStatus, amount,
// 					{ from: player1 }
// 				);
//
// 				try {
// 					txObj = await instance.startGame(id);
// 					assert.isUndefined(txObj, 'start a non Created status match');
// 				} catch (err) {
// 					assert.include(
// 						err.message,
// 						'revert',
// 						'a non Created status match'
// 					);
// 				}
// 			});
// 		});
//
// 		describe('success case', () => {
//
// 			it('should start a game', async() => {
// 				await instance.createGame(
// 					id, 0, amount,
// 					{ from: player1 }
// 				);
//
// 				let match = await instance.games(id);
// 				assert.equal(match[1].toString(10), 0, 'wrong state');
//
// 				await instance.startGame(id);
//
// 				match = await instance.games(id);
// 				assert.equal(match[1].toString(10), 1, 'wrong state');
// 			});
// 		});
// 	});
//
// 	// make function public and test It
// 	// describe('nextMatchState', () => {
// 	//
// 	// 	it('should move forward the state', async() => {
// 	// 		await instance.createGame(id, 0, amount, { from: player1 });
// 	//
// 	// 		let match = await instance.games(id);
// 	// 		assert.equal(match[1], 0, 'no Created status');
// 	//
// 	// 		await instance.nextMatchState(id);
// 	// 		match = await instance.games(id);
// 	// 		assert.equal(match[1], 1, 'no Start status');
// 	//
// 	// 		await instance.nextMatchState(id);
// 	// 		match = await instance.games(id);
// 	// 		assert.equal(match[1], 2, 'no PlayersReached status');
// 	//
// 	// 		await instance.nextMatchState(id);
// 	// 		match = await instance.games(id);
// 	// 		assert.equal(match[1], 3, 'no BettingEnd status');
// 	//
// 	// 		try {
// 	// 			const txObj = await instance.nextMatchState(id);
// 	// 			assert.isUndefined(txObj, 'move in unknow state');
// 	// 		} catch(err) {
// 	// 			assert.include(
// 	// 				err.message,
// 	// 				'revert',
// 	// 				'no revert for unknow state'
// 	// 			);
// 	// 		}
// 	// 	});
// 	// });
// });
//
// const logTransactionCost = (txObject = {}, txName = '') => {
//     const gasUsed = txObject.receipt.gasUsed;
//     const transaction = web3.eth.getTransaction(txObject.tx);
//     const gasPrice = transaction.gasPrice;
//     const txFee = gasPrice.times(gasUsed);
//
// 	txCost = txCost + `${txName}: gasUsed: ${gasUsed} --- txFee: ${txFee}\n`;
// 	console.log(txCost);
// }
//
// const noValue = async (promise, type = 'function') => {
// 	try {
// 		const txObject = await promise;
// 		assert.isUndefined(txObject, `${type} accept value`);
// 	} catch (err) {
// 		assert.equal(
// 			err.message,
// 			`Cannot send value to non-payable ${type}`,
// 			'No error passing value in contructor transaction'
// 		);
// 	}
// }
