pragma solidity 0.4.21;

import "./Ownable.sol";
import "./SafeMath.sol";

contract Bank is Ownable {

	using SafeMath for uint256;

	mapping(address => uint256) public balances;
	mapping(address => bool) public accounts;

	event LogCredit(address indexed account, uint256 balance);
	event LogDebit(address indexed account, uint256 balance);
	event LogNewAccount(address indexed account);
	event LogDeleteAccount(address indexed account);

	modifier isAccount(address account) {
		require(accounts[account]);
		_;
	}

	function addAccount(address account)
		internal
		onlyOwner
		returns (bool)
	{
		require(!accounts[account]);

		accounts[account] = true;
		emit LogNewAccount(account);
		return true;
	}

	function deleteAccount(address account)
		internal
		onlyOwner
		isAccount(account)
		returns (bool)
	{
		require(balances[account] == 0);

		delete balances[account];
		emit LogDeleteAccount(account);
		return true;
	}

	function credit(address account, uint256 amount)
		internal
		onlyOwner
		isAccount(account)
		returns (bool)
	{
		require(amount > 0);

		balances[account] = balances[account].add(amount);
		emit LogCredit(account, balances[account]);
		return true;
	}

	function debit(address account, uint256 amount)
		internal
		onlyOwner
		isAccount(account)
		returns (bool)
	{
		require(balances[account] >= amount);

		balances[account] = balances[account].sub(amount);
		emit LogDebit(account, balances[account]);
		return true;
	}
}
