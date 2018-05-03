pragma solidity 0.4.21;

import "./Ownable.sol";
import "./SafeMath.sol";

contract FoundManager is Ownable {

	using SafeMath for uint256;

	mapping(address => uint256) public publicBalances;
	mapping(bytes32 => uint256) public gameBalances;

	event LogCreditPublicBalance(uint256 amount);
	event LogDebitPublicBalance(uint256 _amount);
	event LogCreditGameBalance(uint256 amount);
	event LogDebitGameBalance(uint256 _amount);
	event LogCreditOwnerBalance(uint256 amount);
	event LogDebitOwnerBalance(uint256 _amount);


	uint256 public ownerBalance;

	modifier validAmount(uint256 _amount) {
		require(_amount > 0);
		_;
	}

	modifier validBeneficiary(address _beneficiaty) {
		require(_beneficiaty != address(0x0));
		_;
	}

	modifier validGame(bytes32 _game) {
		require(_game != 0x0);
		_;
	}

	function creditPublicBalance(address _beneficiaty, uint256 _amount)
		public
		onlyOwner
		validAmount(_amount)
		validBeneficiary(_beneficiaty)
		returns (bool)
	{
		publicBalances[_beneficiaty] = publicBalances[_beneficiaty].add(_amount);
		emit LogCreditPublicBalance(_amount);

		return true;
	}

	function debitPublicBalance(address _beneficiaty, uint256 _amount)
		public
		onlyOwner
		validAmount(_amount)
		validBeneficiary(_beneficiaty)
		returns (bool)
	{
		require(publicBalances[_beneficiaty] >= _amount);
		publicBalances[_beneficiaty] = publicBalances[_beneficiaty].sub(_amount);
		emit LogDebitPublicBalance(_amount);
		return true;
	}

	function creditGameBalance(bytes32 _game, uint256 _amount)
		public
		onlyOwner
		validAmount(_amount)
		validGame(_game)
		returns (bool)
	{
		gameBalances[_game] = gameBalances[_game].add(_amount);
		emit LogCreditGameBalance(_amount);
		return true;
	}

	function debitGameBalance(bytes32 _game, uint256 _amount)
		public
		onlyOwner
		validAmount(_amount)
		validGame(_game)
		returns (bool)
	{
		require(gameBalances[_game] >= _amount);
		gameBalances[_game] = gameBalances[_game].sub(_amount);
		emit LogDebitGameBalance(_amount);
		return true;
	}

	function creditOwner(uint256 _amount)
		public
		onlyOwner
		validAmount(_amount)
		returns (bool)
	{
		ownerBalance = ownerBalance.add(_amount);
		emit LogCreditOwnerBalance(_amount);
		return true;
	}

	function debitOwner(uint256 _amount)
		public
		onlyOwner
		validAmount(_amount)
		returns (bool)
	{
		require(ownerBalance >= _amount);
		ownerBalance = ownerBalance.sub(_amount);
		emit LogDebitOwnerBalance(_amount);
		return true;
	}
}
