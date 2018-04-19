const Promise = require('bluebird');
const Player = artifacts.require("./Player.sol");
const TestUtils = require('../testUtils.js');

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.personal, { suffix: "Promise" });

contract('Player', accounts => {

	const owner = accounts[1];
	const player = accounts[2];
	const bet = web3.sha3(0);;
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
				await TestUtils.noValue(instance.setHashBet(bet, { from: owner, value: 1 }));
			});

			it('should fail with hash already setted', async() => {
				await instance.setHashBet(bet, { from: owner });
				try {
					const txObject = await instance.setHashBet(bet, { from: owner });
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
					const txObject = await instance.setHashBet(bet, { from: player });
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
				const txObject = await instance.setHashBet(bet, { from: owner });
				const hash = await instance.hashBet();
				assert.equal(hash, bet, 'wrong bet');
			});
		});
	});
});
