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


describe("verifyPlacement circuit test", function () {
    before(async () => {
        circuit = await wasm_tester("circuits/verifyPlacement.circom");
        await circuit.loadConstraints();

        poseidon = await buildPoseidon();  // default BN128
        assert(poseidon.F.p == Fr.p, "Poseidon configured with field of same order");
    });

    it("verifyPlacement passes for valid placement", async () => {
        const boardSetup = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        const boardSetupKey = 1000;
        const gameKey = 0;
        const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
        const setupHash = poseidon.F.toString(poseidonHash, 10);
        const kingFile = 4;
        
        const INPUT = {
            "setupHash": setupHash,
            "kingFile": kingFile,
            "gameKey": gameKey,
            "boardSetup": boardSetup,
            "boardSetupKey": boardSetupKey,
        }
        const witness = await circuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)), "proof is valid");
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(1)), "output signals success");
    });

    it("verifyPlacement fails for invalid placement", async () => {
        // 2 queens
        const boardSetup = [PIECES["Q"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        const boardSetupKey = 1000;
        const gameKey = 0;
        const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
        const setupHash = poseidon.F.toString(poseidonHash, 10);
        const kingFile = 4;
        
        const INPUT = {
            "setupHash": setupHash,
            "kingFile": kingFile,
            "gameKey": gameKey,
            "boardSetup": boardSetup,
            "boardSetupKey": boardSetupKey,
        }
        await expect(circuit.calculateWitness(INPUT, true)).to.be.rejected;
    });

    it("verifyPlacement fails for invalid king file", async () => {
        // 2 queens
        const boardSetup = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        const boardSetupKey = 1000;
        const gameKey = 0;
        const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
        const setupHash = poseidon.F.toString(poseidonHash, 10);
        const kingFile = 0;
        
        const INPUT = {
            "setupHash": setupHash,
            "kingFile": kingFile,
            "gameKey": gameKey,
            "boardSetup": boardSetup,
            "boardSetupKey": boardSetupKey,
        }
        await expect(circuit.calculateWitness(INPUT, true)).to.be.rejected;
    });
});


describe("verifyPlacement verifier contract test", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("VerifyPlacementVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proofs", async function () {
        poseidon = await buildPoseidon();  // default BN128
        assert(poseidon.F.p == Fr.p, "Poseidon configured with field of same order");

        const boardSetup = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        const boardSetupKey = 1000;
        const gameKey = 0;
        const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
        const setupHash = poseidon.F.toString(poseidonHash, 10);
        const kingFile = 4;
        
        const INPUT = {
            "setupHash": setupHash,
            "kingFile": kingFile,
            "gameKey": gameKey,
            "boardSetup": boardSetup,
            "boardSetupKey": boardSetupKey,
        }

        const { proof, publicSignals } = await groth16.fullProve(INPUT, "circuits/build/verifyPlacement_js/verifyPlacement.wasm","circuits/build/verifyPlacement_final.zkey");

        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
    
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        const Input = argv.slice(8);

        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0, 0, 0];
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});