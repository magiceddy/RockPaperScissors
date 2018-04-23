const Promise = require('bluebird');
const UpdateBalancesTest = artifacts.require("./UpdateBalancesTest.sol");

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.personal, { suffix: "Promise" });

let player1;
let player2;

contract('UpdateBalancesTest', accounts => {

	const amount = 1;
	player1 = accounts[1];
	player2 = accounts[2];
	let balancePlayer1;
	let balancePlater2;

	it('should update balances', async() => {
		let instance = await UpdateBalancesTest.new();
		await instance.test(0, amount, player1, player2);

		balancePlayer1 = await instance.balances(player1);
		balancePlayer2 = await instance.balances(player2);


		assert.equal(balancePlayer1.toString(10), 0, 'wrong balance player1');
		assert.equal(balancePlayer2.toString(10), 0, 'wrong balance player2');

		await instance.test(1, amount, player1, player2);
		balancePlayer1 = await instance.balances(player1);
		balancePlayer2 = await instance.balances(player2);

		assert.equal(balancePlayer1.toString(10), 2, 'wrong balance player1');
		assert.equal(balancePlayer2.toString(10), 0, 'wrong balance player2');

		await instance.test(2, amount, player1, player2);
		balancePlayer1 = await instance.balances(player1);
		balancePlayer2 = await instance.balances(player2);

		assert.equal(balancePlayer1.toString(10), 2, 'wrong balance player1');
		assert.equal(balancePlayer2.toString(10), 2, 'wrong balance player2');

		await instance.test(3, amount, player1, player2);
		balancePlayer1 = await instance.balances(player1);
		balancePlayer2 = await instance.balances(player2);

		assert.equal(balancePlayer1.toString(10), 3, 'wrong balance player1');
		assert.equal(balancePlayer2.toString(10), 3, 'wrong balance player2');
	});
});
