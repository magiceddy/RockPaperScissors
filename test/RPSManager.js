const Promise = require('bluebird');
const RPSManager = artifacts.require("./RPSManager.sol");
const Player = artifacts.require("./Player.sol");
const TestUtils = require('../TestUtils.js');
const Web3Utils = require('web3-utils');

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.personal, { suffix: "Promise" });

let instance;

contract('RPSManager', accounts => {

	const owner = accounts[0];
	const player1 = accounts[1];
	const player2 = accounts[2];
	const amount = 10;
	const gameId = 'my game';
	const secretKey = web3.sha3('secret Key');
	const bet = 2;
	const end = 3;
	const hashGameId = Web3Utils.soliditySha3({t: 'bytes32', v: gameId });
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
		instance = await RPSManager.new({ from : owner });
	});

	describe('constructor', () => {

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(
					RPSManager.new({ from: owner, value: amount}),
					'constructor'
				);
			});
		});

		describe('success case', () => {

			it('should set the contract owner', async() => {
				const contractOwner = await instance.owner();
				assert.strictEqual(contractOwner, owner, 'Invalid Owner');
			});
		});
	});

	describe('createGame', () => {

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(
					instance.createNewGame(
						hashGameId, amount, end, false,
						{ from: owner, value: amount}
					));
			});

			it('should fail with already created game', async() => {
				await instance.createNewGame(hashGameId, amount, end, false, { from: owner});

				try {
					const txObject = await instance.createNewGame(
						hashGameId, amount, end, false,
						{ from: owner}
					);
					assert.isUndefined(txObject, 'create already created game');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert already created game'
					);
				}
			});
		});

		describe('success case', () => {

			it('should create a game without player', async() => {
				await instance.createNewGame(hashGameId, amount, end, false, { from: owner});
				const game = await instance.games(hashGameId);
				assert.isDefined(game, 'wrong instance address');
			});

			it('should create a game with player', async() => {
				const txObject = await instance.createNewGame(hashGameId, amount, end, true, { from: player1});
				const rpsAddress = await instance.getGame(hashGameId);
				const { logs } = txObject;

				assert.equal(logs[0].event, 'LogNewGame');
				assert.equal(logs[1].event, 'LogAddPlayerToGame');
				assert.equal(logs[0].args.gameId, hashGameId, 'wrong gameId');
				assert.equal(logs[0].args.rpsAddress, rpsAddress, 'wrong address rps');
				assert.equal(logs[1].args.gameId, hashGameId, 'wrong gameId');
				assert.equal(logs[1].args.player, player1, 'wrong address player');
			});
		});
	});

	describe('addPlayer', () => {

		beforeEach(async() => {
			await instance.createNewGame(
				hashGameId, amount, end, true,
				{ from: player1 }
			);
		});

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(instance.addPlayer(
					hashGameId,
					{ from: player2, value: 1 }
				));
			});

			it('should fail on third attempt for same game', async() => {
				await instance.addPlayer(hashGameId, { from: player2 });

				try {
					const txObject = await instance.addPlayer(
						hashGameId,
						{ from: accounts[3] }
					);
					assert.isUndefined(txObject, 'add third player on match');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert on third attempt'
					);
				}
			});

			it('should fail on undefined game', async() => {
				try {
					const txObject = await instance.addPlayer(
						'fake game',
						{ from: player2 }
					);
					assert.isUndefined(txObject, 'add player on undefined game');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert on undefined game');
				}
			});
		});

		describe('success case', () => {

			it('should add player', async() => {
				const txObject = await instance.addPlayer(
					hashGameId,
					{ from: player2 }
				);

				const { logs } = txObject;
				assert.equal(
					logs[0].event,
					'LogAddPlayerToGame',
					'no LogAddPlayerToGame event'
				);
				assert.equal(logs[0].args.gameId, hashGameId, 'worng gameid');
				assert.equal(logs[0].args.player, player2, 'worng player');
			});
		});
	});

	describe('setBet', () => {

		beforeEach(async() => {
			await instance.createNewGame(
				hashGameId, amount, end, true,
				{ from: player1 }
			);

			const txObject = await instance.addPlayer(
				hashGameId,
				{ from: player2 }
			);
		});

		describe('fail case', () => {

			it('should fail transaction by no player', async() => {
				try {
					const txObject = await instance.setBet(
						hashGameId, hashBet,
						{ from: accounts[3], value: amount }
					);
					assert.isUndefined(txObject, 'bet from non player');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert bet non player');
				}
			});

			it('shoulf fail with wrong value', async() => {
				try {
					const txObject = await instance.setBet(
						hashGameId, hashBet,
						{ from: player1, value: 567 }
					);
					assert.isUndefined(txObject, 'bet with wrong amount');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert with wrong amount');
				}
			});
		});

		describe('success case', () => {

			it('should set the bet', async() => {
				const txObject = await instance.setBet(
					hashGameId, hashBet,
					{ from: player1, value: amount }
				);
				const instanceBalance = await web3.eth.getBalance(instance.address);
				assert.equal(instanceBalance, amount, 'worng balance');
			});
		});
	});

	describe('revealBet', () => {

		beforeEach(async() => {
			await instance.createNewGame(
				hashGameId, amount, end, true,
				{ from: player1 }
			);
			await instance.addPlayer(hashGameId, { from: player2 });
			await instance.setBet(hashGameId, hashBet, { from: player1, value: amount });
			await instance.setBet(hashGameId, hashBet, { from: player2, value: amount });
		});

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(instance.revealBet(
					hashGameId, bet, secretKey,
					{ from: player1, value: amount }
				));
			});

			it('should fail reveal from non player', async() => {
				try {
					const txObject = await instance.revealBet(
						hashGameId, bet, secretKey,
						{ from: accounts[3] }
					);
					assert.isUndefined(txObject, 'reveal from non player');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert from non player');
				}
			});
		});

		describe('success case', async() => {

			it('should reveal', async() => {
				const txObject = await instance.revealBet(
					hashGameId, bet, secretKey,
					{ from: player1 }
				);

				const txObject2 = await instance.revealBet(
					hashGameId, bet, secretKey,
					{ from: player2 }
				);
				assert.isDefined(txObject, 'no revealBet for player1');
				assert.isDefined(txObject2, 'no revealBet for player2');
			});
		});
	});

	describe('revealWinner', () => {

		beforeEach(async() => {
			await instance.createNewGame(
				hashGameId, amount, end, true,
				{ from: player1 }
			);
			await instance.addPlayer(hashGameId, { from: player2 });
			await instance.setBet(hashGameId, hashBet, { from: player1, value: amount });
			await instance.setBet(hashGameId, hashBet, { from: player2, value: amount });
			await instance.revealBet(hashGameId, bet, secretKey, { from: player1 });
			await instance.revealBet(hashGameId, bet, secretKey, { from: player2 });
		});

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(instance.revealWinner(
					hashGameId,
					{ from: player1, value: amount }
				));
			});

			it('should fail on non player transaction', async() => {
				try {
					const txObject = await instance.revealWinner(
						hashGameId,
						{ from: accounts[3] }
					);
					assert.isUndefined(txObject, 'reveal by non player');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert on reveal by non player'
					);
				}
			});
		});

		describe('success case', async() => {

			it('should update balances', async() => {
				const oldPlayer1Balance = await instance.balances(player1);
				const oldPlayer2Balance = await instance.balances(player2)
				await instance.revealWinner(hashGameId, { from: player1 });

				const newPlayer1Balance = await instance.balances(player1);
				const newPlayer2Balance = await instance.balances(player2)
				const _amount = web3.toBigNumber(amount);

				assert.equal(
					newPlayer1Balance.minus(_amount).toString(10),
					oldPlayer1Balance.toString(10),
					'wrong player1 balance'
				);

				assert.equal(
					newPlayer2Balance.minus(_amount).toString(10),
					oldPlayer2Balance.toString(10),
					'wrong player1 balance'
				);
			});
		});
	});

	describe('getGame', () => {

		beforeEach(async() => {
			await instance.createNewGame(
				hashGameId, amount, end, false,
				{ from: player1 }
			);
		});

		describe('fail case', () => {

			it('should fail with not existing game', async() => {
				try {
					const txObject = await instance.getGame(0xaaa, { from: player1 });
					assert.isUndefined(txObject, 'return game with not existing game');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert with not existing game');
				}
			});
		});

		describe('success case', async() => {

			it('should return rps address', async() => {
				const rpsAddress = instance.getGame.call(hashGameId, { from: player1 });
				assert.isDefined(rpsAddress, 'game not exixts');
			});
		});
	});
});
