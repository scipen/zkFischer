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

describe("verifyMove circuit test", function () {
    before(async () => {
        circuit = await wasm_tester("circuits/verifyMove.circom");
        await circuit.loadConstraints();

        poseidon = await buildPoseidon();  // default BN128
        assert(poseidon.F.p == Fr.p, "Poseidon configured with field of same order");
    });

    it("verifyMove passes for valid move", async () => {
        const moveType = "diag-2+";
        const pieceFile = [0, 1, 1];  // 0b011 = 3 = bishop

        const boardSetup = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        const boardSetupKey = 1000;
        const gameKey = 0;
        const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
        const requiredHash = poseidon.F.toString(poseidonHash, 10);
        
        const INPUT = {
            "pieceFile": pieceFile,
            "requiredHash": requiredHash,
            "allowedPieces": ALLOWED_PIECES[moveType],
            "gameKey": gameKey,
            "boardSetup": boardSetup,
            "boardSetupKey": boardSetupKey,
        }
        const witness = await circuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)), "proof is valid");
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(1)), "output signals success");
    });

    it("verifyMove fails for invalid move", async () => {
        const moveType = "diag-2+";
        const pieceFile = [0, 0, 0];  // 0b000 = 0 = rook

        const boardSetup = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        const boardSetupKey = 1000;
        const gameKey = 0;
        const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
        const requiredHash = poseidon.F.toString(poseidonHash, 10);
        
        const INPUT = {
            "pieceFile": pieceFile,
            "requiredHash": requiredHash,
            "allowedPieces": ALLOWED_PIECES[moveType],
            "gameKey": gameKey,
            "boardSetup": boardSetup,
            "boardSetupKey": boardSetupKey,
        }
        const witness = await circuit.calculateWitness(INPUT, true);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)), "proof is valid");
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(0)), "output signals failure");
    });

    it("verifyMove fails for invalid setup", async () => {
        const moveType = "diag-2+";
        const pieceFile = [0, 1, 1];  // 0b011 = 3 = queen

        // 2 queens
        const boardSetup = [PIECES["Q"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        const boardSetupKey = 1000;
        const gameKey = 0;
        const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
        const requiredHash = poseidon.F.toString(poseidonHash, 10);
        
        const INPUT = {
            "pieceFile": pieceFile,
            "requiredHash": requiredHash,
            "allowedPieces": ALLOWED_PIECES[moveType],
            "gameKey": gameKey,
            "boardSetup": boardSetup,
            "boardSetupKey": boardSetupKey,
        }
        await expect(circuit.calculateWitness(INPUT, true)).to.be.rejected;
    });
});


describe("verifyMove verifier contract test", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("VerifyMoveVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proofs", async function () {
        poseidon = await buildPoseidon();  // default BN128
        assert(poseidon.F.p == Fr.p, "Poseidon configured with field of same order");

        const moveType = "diag-2+";
        const pieceFile = [0, 1, 1];  // 0b011 = 3 = queen

        const boardSetup = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        const boardSetupKey = 1000;
        const gameKey = 0;
        const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
        const requiredHash = poseidon.F.toString(poseidonHash, 10);
        
        const INPUT = {
            "pieceFile": pieceFile,
            "requiredHash": requiredHash,
            "allowedPieces": ALLOWED_PIECES[moveType],
            "gameKey": gameKey,
            "boardSetup": boardSetup,
            "boardSetupKey": boardSetupKey,
        }

        const { proof, publicSignals } = await groth16.fullProve(INPUT, "circuits/build/verifyMove_js/verifyMove.wasm","circuits/build/verifyMove_final.zkey");

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
        let d = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});