const { network } = require("hardhat")
const { verify } = require("../utils/verify")


const devNetworks = ["hardhat", "localhost"]


module.exports = async({ getNamedAccounts, deployments }) => {

    const { deploy, log } = deployments

    const { deployer } = await getNamedAccounts()

    
    const multiSigWalletCreator = await deploy("MultiSigWalletCreator", {

        from: deployer,

        args: [],

        log: true
    })

    log("MultiSigWalletCreator deployed!")

    log("-------------------------------------------")


    if(!devNetworks.includes(network.name)) {

        await verify(multiSigWalletCreator.address, [])
    }
}


module.exports.tags = ["all", "multiSigWalletCreator"]