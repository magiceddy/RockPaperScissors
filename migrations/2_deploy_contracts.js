const RockpaperScissors = artifacts.require("./RockpaperScissors.sol");

module.exports = function(deployer) {
  deployer.deploy(RockpaperScissors);
};
