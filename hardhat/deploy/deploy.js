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

    await deploy('zkFischer', {
        from: deployer,
        log: true,
        args: [verifyPlacementVerifier.address, verifyMoveVerifier.address]
    });
};
module.exports.tags = ['complete'];
