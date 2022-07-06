module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const verifyPlacementVerifier = await deploy('VerifyPlacementVerifier', {
        from: deployer,
        log: true
    });

    const verifyMoveVerifier = await deploy('VerifyMoveVerifier', {
        from: deployer,
        log: true
    });

    const zkFischerUtils = await deploy('ZkFischerUtils', {
        from: deployer,
        log: true
    });

    await deploy('ZkFischer', {
        from: deployer,
        log: true,
        args: [verifyPlacementVerifier.address, verifyMoveVerifier.address, zkFischerUtils.address],
        contract: 'ZkFischer'
    });
};
module.exports.tags = ['complete'];
