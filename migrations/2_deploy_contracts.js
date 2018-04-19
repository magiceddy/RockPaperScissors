const RockPaperScissors = artifacts.require("./RockPaperScissors.sol");
const Ownable = artifacts.require("./Ownable.sol");
const Player = artifacts.require("./Player.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Ownable);
    deployer.deploy(Player, accounts[1]);
    deployer.deploy(RockPaperScissors);
};
