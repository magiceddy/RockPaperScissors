const Promise = require('bluebird');
const Player = artifacts.require("./Player.sol");
const TestUtils = require('../testUtils.js');

Promise.promisifyAll(web3, { suffix: "Promise" });
Promise.promisifyAll(web3.personal, { suffix: "Promise" });

contract('Player', accounts => {

	const owner = accounts[1];
	const player = accounts[2];
	const hashBet = web3.sha3('3', 'secretKey');
	const bet = 3;

	let instance;

	beforeEach(async() => {
		instance = await Player.new(player, { from: owner });
	});

	describe('contructor', () => {

		describe('fail case', () => {

			it('should fail with value in contructor', async() => {
				await TestUtils.noValue(
					Player.new(owner, { value: 1 }),
					'constructor'
				);
			});
		});

		describe('success case', () => {

			it('should set the player and the owner', async() => {
				const instance = await Player.new(player, { from: owner });
				const playerAddress = await instance.playerAddress();
				const contractOwner = await instance.owner();

				assert.equal(playerAddress, player, 'incorrect player');
				assert.equal(contractOwner, owner, 'incorrect owner');
			});
		});
	});

	describe('setHashBet', () => {

		describe('fail case', () => {

			it('hould fail with value in transaction', async() => {
				await TestUtils.noValue(instance.setHashBet(hashBet, { from: owner, value: 1 }));
			});

			it('should fail with hash already setted', async() => {
				await instance.setHashBet(hashBet, { from: owner });
				try {
					const txObject = await instance.setHashBet(hashBet, { from: owner });
					assert.isUndefined(txObject, 'set already setted hash');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert with already setted hash'
					);
				}
			});

			it('should fail with no owner transaction', async() => {
				try {
					const txObject = await instance.setHashBet(hashBet, { from: player });
					assert.isUndefined(txObject, 'set already setted hash');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert with no owner transaction'
					);
				}
			});

			it('should fail with zero bet', async() => {
				try {
					const txObject = await instance.setHashBet(0x0, { from: player });
					assert.isUndefined(txObject, 'set zero hash');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert with zero hash'
					);
				}
			});
		});

		describe('success case', () => {

			it('should set hash', async() => {
				const txObject = await instance.setHashBet(hashBet, { from: owner });
				const hash = await instance.hashBet();
				assert.equal(hash, hashBet, 'wrong bet');
			});
		});
	});

	describe('setBet', () => {

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await TestUtils.noValue(instance.setBet(bet, { from: owner, value: 1}));
			});

			it('should fail without owner', async() => {
				try {
					const txObject = await instance.setBet(bet, { from: player });
					assert.isUndefined(txObject, 'bet allowed by non owner');
				} catch (err) {
					assert.include(err.message, 'revert', 'no revert for non owner bet');
				}
			});

			it('should fail with not in range bet', async() => {
				try {
					const txObject = await instance.setBet(4, { from: owner });
					assert.isUndefined(txObject, 'bet not in range allowed');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert for not in range bet'
					);
				}
			});

			it('should fail if bet exists', async() => {
				await instance.setHashBet(hashBet, { from: owner });
				await instance.setBet(bet, { from: owner });

				try {
					const txObject = await instance.setBet(bet, { from: owner });
					assert.isUndefined(txObject, 'second bet allowed');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert for second bet'
					);
				}
			});

			it('should fail if hashBet doesn\'t exists', async() => {
				try {
					const txObject = await instance.setBet(bet, { from: owner });
					assert.isUndefined(txObject, 'bet allowed without hashBet');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert if hashBet not set'
					);
				}
			});
		});

		describe('success case', async() => {

			it('should set bet', async() => {
				await instance.setHashBet(hashBet, { from: owner });
				await instance.setBet(bet, { from: owner });

				const _bet = await instance.bet();
				assert.equal(_bet, bet, 'wrong bet');
			});
		});
	});

	describe('fallback function', () => {

		it('should revert', async() => {
			try {
				await instance.send(web3.toWei(1, "wei"));
			} catch (err) {
				assert.include(err.message, 'revert');
			}
		});
	});
});
