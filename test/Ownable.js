const Promise = require('bluebird');
const Ownable = artifacts.require("./Ownable.sol");
const TestUtils = require('../testUtils.js');

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.personal, { suffix: "Promise" });

contract('Owner', accounts => {
	const owner = accounts[1];

	it('should fail with value in contructor', async() => {
		await TestUtils.noValue(Ownable.new({ value: 1 }), 'constructor');
	});

	it('should set the correct owner', async() => {
		const instance = await Ownable.new({ from: owner });
		const contractOwner = await instance.owner();
		assert.equal(owner, contractOwner, 'incorrect owner');
	});
})
