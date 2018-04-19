const Promise = require('bluebird');
const Player = artifacts.require("./Player.sol");
const TestUtils = require('../testUtils.js');

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.personal, { suffix: "Promise" });

contract('Player', accounts => {

	const owner = accounts[1];
	const player = accounts[2];

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
});
