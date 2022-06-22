const chai = require("chai");
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;
const expect = chai.expect

const { ethers } = require("hardhat");
const { groth16 } = require("snarkjs");
const wasm_tester = require("circom_tester").wasm;
const buildPoseidon = require("circomlibjs").buildPoseidon;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

const PIECES = {"R": 1, "N": 2, "B": 3, "Q": 4, "K": 5}  // 0 as filler value

// there are 5 equivalence classes of chess moves
// all values are constrained to len 3 so we use 0 as the filler value
const ALLOWED_PIECES = {
    "diag-2+": [3, 4, 0],
    "orthog-2+": [1, 4, 0],
    "diag-1": [3, 4, 5],
    "orthog-1": [1, 4, 5],
    "knight": [2, 0, 0],
}

// describe("zkFischer contract test", function () {
//     let ZkFischer;
//     let zkFischer;

//     beforeEach(async function () {
//         ZkFischer = await ethers.getContractFactory("zkFischer");
//         zkFischer = await ZkFischer.deploy();
//         await zkFischer.deployed();
//     });

//     it("Should validate move", async function () {
//         await zkFischer.validate();
//     });
// });