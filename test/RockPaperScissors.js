const Promise = require('bluebird');
const RPS = artifacts.require("./RockPaperScissors.sol");

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.personal, { suffix: "Promise" });

let instance;
let txCost = ``;

contract('RockPaperScissors',  accounts => {

	const owner = accounts[0];
	const player1 = accounts[1];
	const player2 = accounts[2];

	const id = "My Game";
	const amount = 10;
	const initialStatus = 1;

	beforeEach(async() => {
		instance = await RPS.new({ from: owner });
	});

	describe('Contructor', () => {

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await noValue(RPS.new({ from: owner, value: 1}), 'constructor');
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
				await noValue(instance.createGame(
					id, initialStatus, amount,
					{ value: 1, from: player1 })
				 );
			});

			it('should fail with zero id', async() => {
				try {
					const txObj = await instance.createGame(
						0, initialStatus, amount,
						{ from: player1 }
					);
					assert.isUndefined(txObj, 'game created with zero id');
				} catch(err) {
					assert.include(err.message, 'revert', 'no revert with zero id');
				}
			})

			it('should fail with same game ongoing', async() => {
				await await instance.createGame(
					id, initialStatus, amount,
					{ from: player1 }
				);

				try {
					const txObj = await instance.createGame(id, 1, amount,
						{ from: player1 }
					);
					assert.isUndefined(txObj, 'game created with same id');
				} catch(err) {
					assert.include(err.message, 'revert', 'no revert with same id');
				}
			});

			it('should fail with zero amount', async() => {
				try {
					const txObj = await instance.createGame(
						id, initialStatus, 0,
						{ from: player1 }
					);
					assert.isUndefined(txObj, 'game created with zero amount');
				} catch(err) {
					assert.include(err.message, 'revert', 'no revert with zero amount');
				}
			});

			it('should fail with wrong status code', async() => {
				try {
					const txObj = await instance.createGame(
						id, 3, amount,
						{ from: player1 }
					);
					assert.isUndefined(txObj, 'game created with wrong status code');
				} catch(err) {
					assert.include(
						err.message,
						'revert',
						'no invalid opcode with wrong status code'
					);
				}
			});
		});

		describe('success case', async() => {

			describe('it should create the match and join msg.sender', () => {
				beforeEach(async() => {
					const txObj = await instance.createGame(
						id, initialStatus, amount,
						{ from: player1 }
					);
				});

				it('should create the match', async() => {
					const match = await instance.games(id);
					assert.equal(match[0].toString(10), amount, 'save wrong amount');
					assert.equal(match[1].toString(10), 1, 'wrong state');
					assert.equal(match[2].toString(10), 1, 'wrong players number');
					assert.equal(match[3].toString(10), 0, 'field is not zero');
					assert.equal(match[4].toString(10), 0, 'field is not zero');
					assert.equal(match[5], player1, 'set incorrect player');
					assert.equal(match[6].toString(10), 0, 'set incorrect player');
				});

				it('should create the first player', async() => {
					const firstPlayer = await instance.playersByGame(id, player1);
					assert.equal(firstPlayer[0].toString(10), 0, 'bet is present');
					assert.isTrue(firstPlayer[1], 'not joined');
					assert.equal(firstPlayer[2].toString(10), 0, 'move is present');
				});

				it('should not create second player', async() => {
					const secondPlayer = await instance.playersByGame(id, player2);
					assert.isFalse(secondPlayer[1], 'secondPlayer joined match');
				});
			});

			describe('it should create the match without players', () => {

				beforeEach(async() => {
					const txObj = await instance.createGame(
						id, 0, amount,
						{ from: player1 }
					);
				});

				it('should create the match', async() => {
					const match = await instance.games(id);
					assert.equal(match[0].toString(10), amount, 'save wrong amount');
					assert.equal(match[1].toString(10), 0, 'wrong state');
					assert.equal(match[2].toString(10), 0, 'field is not zero');
					assert.equal(match[3].toString(10), 0, 'field is not zero');
					assert.equal(match[4].toString(10), 0, 'field is not zero');
					assert.equal(match[5].toString(10), 0, 'field is not zero');
					assert.equal(match[6].toString(10), 0, 'field is not zero');
				});

				it('should not create the first player', async() => {
					const firstPlayer = await instance.playersByGame(id, player1);
					assert.isFalse(firstPlayer[1], 'firstPlayer joined match');
				});

				it('should not create second player', async() => {
					const secondPlayer = await instance.playersByGame(id, player2);
					assert.isFalse(secondPlayer[1], 'secondPlayer joined match');
				});
			});
		});
	});

	describe('joinMatch', () => {

		describe('fail case', () => {

			it('should fail with value in transaction', async() => {
				await noValue(instance.joinMatch(
					id, { value: amount, from: player2 })
				);
			});

			it('should fail without match created', async() => {
				try {
					const txObj = await instance.joinMatch(id);
					assert.isUndefined(txObj, 'join a non created match');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert with non created match'
					);
				}
			});

			it('should fail for third player [Created Status]', async() => {
				await instance.createGame(
					id, 0, 10,
					{ from: player1 }
				);

				await instance.startGame(id, { from: player1 });

				await instance.joinMatch(id, { from: player1 });
				await instance.joinMatch(id, { from: player2 });

				try {
					txObj = await instance.joinMatch(id, { from: accounts[3] });
					assert.isUndefined(txObj, 'third player joined the match');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert for third player joined the match'
					);
				}
			});

			it('should fail for third player [Start Status]', async() => {
				await instance.createGame(
					id, 1, 10,
					{ from: player1 }
				);

				await instance.joinMatch(id, { from: player2 });

				try {
					txObj = await instance.joinMatch(id, { from: accounts[3] });
					assert.isUndefined(txObj, 'third player joined the match');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'no revert for third player joined the match'
					);
				}
			});
		});

		describe('success case', () => {

			describe('Start Status', () => {

				it('should add player to match', async() => {
					const txObj = await  instance.createGame(
						id, 1, amount,
						{ from: player1 }
					);
					await instance.joinMatch(id, { from: player2 });

					const firstPlayer = await instance.playersByGame(id, player1);
					assert.equal(firstPlayer[0].toString(10), 0, 'bet is present');
					assert.isTrue(firstPlayer[1], 'not joined');
					assert.equal(firstPlayer[2].toString(10), 0, 'move is present');

					const secondPlayer = await instance.playersByGame(id, player2);
					assert.equal(secondPlayer[0].toString(10), 0, 'bet is present');
					assert.isTrue(secondPlayer[1], 'not joined');
					assert.equal(secondPlayer[2].toString(10), 0, 'move is present');

					const match = await instance.games(id);
					assert.equal(match[1].toString(10), 2, 'status not equal PlayersReached');
					assert.equal(match[2].toString(10), 2, 'invalid number of players');
					assert.equal(match[5], player1, 'not corrct player');
					assert.equal(match[6], player2, 'not correct player');
				});
			});

			describe('Created Status', () => {

				it('should add player to match', async() => {
					const txObj = await  instance.createGame(
						id, 0, amount,
						{ from: player1 }
					);
					await instance.startGame(id);
					await instance.joinMatch(id, { from: player1 });
					await instance.joinMatch(id, { from: player2 });

					const firstPlayer = await instance.playersByGame(id, player1);
					assert.equal(firstPlayer[0].toString(10), 0, 'bet is present');
					assert.isTrue(firstPlayer[1], 'not joined');
					assert.equal(firstPlayer[2].toString(10), 0, 'move is present');

					const secondPlayer = await instance.playersByGame(id, player2);
					assert.equal(secondPlayer[0].toString(10), 0, 'bet is present');
					assert.isTrue(secondPlayer[1], 'not joined');
					assert.equal(secondPlayer[2].toString(10), 0, 'move is present');

					const match = await instance.games(id);
					assert.equal(match[1].toString(10), 2, 'status not equal PlayersReached');
					assert.equal(match[2].toString(10), 2, 'invalid number of players');
					assert.equal(match[5], player1, 'not corrct player');
					assert.equal(match[6], player2, 'not correct player');
				});
			});
		});
	});

	describe('startGame', () => {

		describe('fail case', () => {

			it('should fail for invalid Pre State', async() => {
				await instance.createGame(
					id, initialStatus, amount,
					{ from: player1 }
				);

				try {
					txObj = await instance.startGame(id);
					assert.isUndefined(txObj, 'start a non Created status match');
				} catch (err) {
					assert.include(
						err.message,
						'revert',
						'a non Created status match'
					);
				}
			});
		});

		describe('success case', () => {

			it('should start a game', async() => {
				await instance.createGame(
					id, 0, amount,
					{ from: player1 }
				);

				let match = await instance.games(id);
				assert.equal(match[1].toString(10), 0, 'wrong state');

				await instance.startGame(id);

				match = await instance.games(id);
				assert.equal(match[1].toString(10), 1, 'wrong state');
			});
		});
	});

	// make function public and test It
	// describe('nextMatchState', () => {
	//
	// 	it('should move forward the state', async() => {
	// 		await instance.createGame(id, 0, amount, { from: player1 });
	//
	// 		let match = await instance.games(id);
	// 		assert.equal(match[1], 0, 'no Created status');
	//
	// 		await instance.nextMatchState(id);
	// 		match = await instance.games(id);
	// 		assert.equal(match[1], 1, 'no Start status');
	//
	// 		await instance.nextMatchState(id);
	// 		match = await instance.games(id);
	// 		assert.equal(match[1], 2, 'no PlayersReached status');
	//
	// 		await instance.nextMatchState(id);
	// 		match = await instance.games(id);
	// 		assert.equal(match[1], 3, 'no BettingEnd status');
	//
	// 		try {
	// 			const txObj = await instance.nextMatchState(id);
	// 			assert.isUndefined(txObj, 'move in unknow state');
	// 		} catch(err) {
	// 			assert.include(
	// 				err.message,
	// 				'revert',
	// 				'no revert for unknow state'
	// 			);
	// 		}
	// 	});
	// });
});

const logTransactionCost = (txObject = {}, txName = '') => {
    const gasUsed = txObject.receipt.gasUsed;
    const transaction = web3.eth.getTransaction(txObject.tx);
    const gasPrice = transaction.gasPrice;
    const txFee = gasPrice.times(gasUsed);

	txCost = txCost + `${txName}: gasUsed: ${gasUsed} --- txFee: ${txFee}\n`;
	console.log(txCost);
}

const noValue = async (promise, type = 'function') => {
	try {
		const txObject = await promise;
		assert.isUndefined(txObject, `${type} accept value`);
	} catch (err) {
		assert.equal(
			err.message,
			`Cannot send value to non-payable ${type}`,
			'No error passing value in contructor transaction'
		);
	}

}
