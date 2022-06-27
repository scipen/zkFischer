require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require('dotenv').config();

// Replace this private key with your Harmony account private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Be aware of NEVER putting real Ether into testing accounts
const HARMONY_PRIVATE_KEY = process.env["HARMONY_PRIVATE_KEY"];

module.exports = {
    solidity: {
        version: "0.8.4",
        optimizer: {
            enabled: true,
            runs: 1
        }
    },
    networks: {
        hardhat: {
            gas: 100000000,
            blockGasLimit: 0x1fffffffffffff,
            chainId: 1337
        },
        devnet: {
            url: "https://api.s0.ps.hmny.io",
            chainId: 1666900000,
            accounts: [`${HARMONY_PRIVATE_KEY}`]
        },
        testnet: {
            url: "https://api.s0.b.hmny.io",
            chainId: 1666700000,
            accounts: [`${HARMONY_PRIVATE_KEY}`]
        },
        mainnet: {
            url: "https://api.s0.t.hmny.io",
            chainId: 1666600000,
            accounts: [`${HARMONY_PRIVATE_KEY}`]
        },
    },
    namedAccounts: {
        deployer: 0,
    },
    paths: {
        deploy: "deploy",
        deployments: "deployments",
    },
    mocha: {
        timeout: 1000000
    }
};
