const RockPaperScissors = artifacts.require("./RockPaperScissors.sol");
const Ownable = artifacts.require("./Ownable.sol");
const Player = artifacts.require("./Player.sol");
const SafeMath = artifacts.require("./SafeMath.sol");
const RPSManager = artifacts.require("./RPSManager.sol");
const UpdateBalancesTest = artifacts.require("./UpdateBalancesTest.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Ownable);
    deployer.deploy(Player, accounts[1]);
    deployer.deploy(RockPaperScissors);
    deployer.deploy(SafeMath);
    deployer.link(SafeMath, RPSManager);
    deployer.deploy(RPSManager);

    if (network != 'live' || network != 'ropsten') {
        deployer.deploy(UpdateBalancesTest);
    }
};
