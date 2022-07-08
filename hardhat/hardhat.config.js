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
const DEPLOYER_PRIVATE_KEY = process.env["DEPLOYER_PRIVATE_KEY"];

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
        harmonyDevnet: {
            url: "https://api.s0.ps.hmny.io",
            chainId: 1666900000,
            accounts: [`${DEPLOYER_PRIVATE_KEY}`]
        },
        harmonyTestnet: {
            url: "https://api.s0.b.hmny.io",
            chainId: 1666700000,
            accounts: [`${DEPLOYER_PRIVATE_KEY}`]
        },
        harmonyMainnet: {
            url: "https://api.harmony.one",
            chainId: 1666600000,
            accounts: [`${DEPLOYER_PRIVATE_KEY}`]
        },
        polygonMainnet: {
            url: "https://polygon-rpc.com",
            chainId: 137,
            accounts: [`${DEPLOYER_PRIVATE_KEY}`]
        }
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
