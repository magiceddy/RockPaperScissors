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

module.exports = {
	noValue
}
