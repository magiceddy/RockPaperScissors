const Promise = require('bluebird');
const Ownable = artifacts.require("./Ownable.sol");
const TestUtils = require('../testUtils.js');

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.personal, { suffix: "Promise" });

contract('Owner', accounts => {
	const owner = accounts[1];
	const newOwner = accounts[2];
	let instance;

	beforeEach(async() => {
		instance = await Ownable.new({ from: owner });
	});

	it('should fail with value in contructor', async() => {
		await TestUtils.noValue(Ownable.new({ value: 1 }), 'constructor');
	});

	it('should set the correct owner', async() => {
		const contractOwner = await instance.owner();
		assert.equal(owner, contractOwner, 'incorrect owner');
	});

	it('should change the owner', async() => {
		await instance.changeOwner(newOwner, { from: owner });
		const contractOwner = await instance.owner();
		assert.equal(contractOwner, newOwner, 'incorrect owner');
	});

	it('should fail to change owner from non owner', async() => {
		try {
			const txObject = await instance.changeOwner(newOwner, { from: newOwner });
			assert.isUndefined(txObject, 'accept transaction by no owner');
		} catch (err) {
			assert.include(err.message, 'revert', 'no revert by no owner');
		}
	});

	it('should fail sending value to contract', async() => {
		try {
			await instance.send(web3.toWei(1, "wei"));
		} catch (err) {
			assert.include(err.message, 'revert');
		}
	});
})
