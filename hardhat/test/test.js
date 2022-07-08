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

const DUMMY_MOVE_ARGS = [
    [0, 0],
    [[0, 0], [0, 0]],
    [0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
];

function sqToCoords(file, rank) {
    let row = 7-rank + 1;
    let col = {
        'a': 0,
        'b': 1,
        'c': 2,
        'd': 3,
        'e': 4,
        'f': 5,
        'g': 6,
        'h': 7
    }[file];
    return [row, col]
}

describe("zkFischer contract test", function () {
    let ZkFischer;
    let zkFischer;
    let p0;
    let p1;
    let p2;
    let poseidon;

    before(async function () {
        poseidon = await buildPoseidon();  // default BN128
        assert(poseidon.F.p == Fr.p, "Poseidon configured with field of same order");
    });

    beforeEach(async function () {
        let placementVerifier = await ethers.getContractFactory("VerifyPlacementVerifier");
        let placementverifier = await placementVerifier.deploy();
        await placementverifier.deployed();

        let moveVerifier = await ethers.getContractFactory("VerifyMoveVerifier");
        let moveverifier = await moveVerifier.deploy();
        await moveverifier.deployed();

        ZkFischerUtils = await ethers.getContractFactory("ZkFischerUtils");
        zkFischerUtils = await ZkFischerUtils.deploy();
        await zkFischerUtils.deployed();

        ZkFischer = await ethers.getContractFactory("ZkFischer");
        zkFischer = await ZkFischer.deploy(placementverifier.address, moveverifier.address, zkFischerUtils.address);
        await zkFischer.deployed();

        let signers = await ethers.getSigners();
        p0 = zkFischer.connect(signers[0]);
        p1 = zkFischer.connect(signers[1]);
        p2 = zkFischer.connect(signers[2]);
    });

    it("2 different players can register each game", async function () {
        const gameId = 0;
        await p0.register(gameId);
        await expect(p0.register(gameId)).to.be.reverted;
        await p1.register(gameId);
        await expect(p2.register(gameId)).to.be.reverted;

        await p2.register(gameId+1);
    });

    it("Fool's mate", async function () {
        const gameId = 0;
        await p0.register(gameId);
        await p1.register(gameId);

        let p0_board = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        let p0_setupKey = 1000;
        let p0_gameKey = 0;
        let p0_kingFile = 4;
        let p0_setup = await genSetupArgs(p0_board, p0_setupKey, p0_gameKey, p0_kingFile);
        await p0.setupBoard(gameId, p0_setup);

        let p1_board = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        let p1_setupKey = 2000;
        let p1_gameKey = 0;
        let p1_kingFile = 4;
        let p1_setup = await genSetupArgs(p1_board, p1_setupKey, p1_gameKey, p1_kingFile);
        await p1.setupBoard(gameId, p1_setup);

        let p0_move, p0_moveType, p0_pieceFile, p0_fromSq, p0_toSq;
        let p1_move, p1_moveType, p1_pieceFile, p1_fromSq, p1_toSq;

        // f3
        p0_fromSq = sqToCoords('f', 2);
        p0_toSq = sqToCoords('f', 3);
        await p0.move(gameId, p0_fromSq, p0_toSq, DUMMY_MOVE_ARGS);

        // ..e6
        p1_fromSq = sqToCoords('e', 7);
        p1_toSq = sqToCoords('e', 6);
        await p1.move(gameId, p1_fromSq, p1_toSq, DUMMY_MOVE_ARGS);

        // g4
        p0_fromSq = sqToCoords('g', 2);
        p0_toSq = sqToCoords('g', 4);
        await p0.move(gameId, p0_fromSq, p0_toSq, DUMMY_MOVE_ARGS);

        // ..Qh4# (more moves below since need king capture to end game)
        p1_moveType = "diag-2+";
        p1_pieceFile = [0, 1, 1];
        p1_fromSq = sqToCoords('d', 8);
        p1_toSq = sqToCoords('h', 4);
        p1_move = await genMoveArgs(p1_moveType, p1_pieceFile, p1_board, p1_setupKey, p1_gameKey);
        await p1.move(gameId, p1_fromSq, p1_toSq, p1_move);

        // Na3
        p0_moveType = "knight";
        p0_pieceFile = [0, 0, 1];
        p0_fromSq = sqToCoords('b', 1);
        p0_toSq = sqToCoords('a', 3);
        p0_move = await genMoveArgs(p0_moveType, p0_pieceFile, p0_board, p0_setupKey, p0_gameKey);
        await p0.move(gameId, p0_fromSq, p0_toSq, p0_move);

        // ..Qg6 (error: not how queen moves)
        p1_moveType = "diag-2+";
        p1_pieceFile = [0, 1, 1];
        p1_fromSq = sqToCoords('h', 4);
        p1_toSq = sqToCoords('g', 6);
        p1_move = await genMoveArgs(p1_moveType, p1_pieceFile, p1_board, p1_setupKey, p1_gameKey);
        await expect(p1.move(gameId, p1_fromSq, p1_toSq, p1_move)).to.be.reverted;

        // ..Qxh1 (error: can't move through pieces)
        p1_moveType = "orthog-2+";
        p1_pieceFile = [0, 1, 1];
        p1_fromSq = sqToCoords('h', 4);
        p1_toSq = sqToCoords('h', 1);
        p1_move = await genMoveArgs(p1_moveType, p1_pieceFile, p1_board, p1_setupKey, p1_gameKey);
        await expect(p1.move(gameId, p1_fromSq, p1_toSq, p1_move)).to.be.reverted;

        // ..Qxe1
        p1_moveType = "diag-2+";
        p1_pieceFile = [0, 1, 1];
        p1_fromSq = sqToCoords('h', 4);
        p1_toSq = sqToCoords('e', 1);
        p1_move = await genMoveArgs(p1_moveType, p1_pieceFile, p1_board, p1_setupKey, p1_gameKey);
        await p1.move(gameId, p1_fromSq, p1_toSq, p1_move);

        // b3 (error: game already over)
        p0_fromSq = sqToCoords('b', 2);
        p0_toSq = sqToCoords('b', 3);
        await expect(p0.move(gameId, p0_fromSq, p0_toSq, DUMMY_MOVE_ARGS)).to.be.reverted;
    });

    it("Pawn promotion", async function () {
        const gameId = 0;
        await p0.register(gameId);
        await p1.register(gameId);

        let p0_board = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        let p0_setupKey = 1000;
        let p0_gameKey = 0;
        let p0_kingFile = 4;
        let p0_setup = await genSetupArgs(p0_board, p0_setupKey, p0_gameKey, p0_kingFile);
        await p0.setupBoard(gameId, p0_setup);

        let p1_board = [PIECES["R"], PIECES["N"], PIECES["B"], PIECES["Q"], PIECES["K"], PIECES["B"], PIECES["N"], PIECES["R"]];
        let p1_setupKey = 2000;
        let p1_gameKey = 0;
        let p1_kingFile = 4;
        let p1_setup = await genSetupArgs(p1_board, p1_setupKey, p1_gameKey, p1_kingFile);
        await p1.setupBoard(gameId, p1_setup);

        let p0_move, p0_moveType, p0_pieceFile, p0_fromSq, p0_toSq;
        let p1_move, p1_moveType, p1_pieceFile, p1_fromSq, p1_toSq;

        // a4
        p0_fromSq = sqToCoords('a', 2);
        p0_toSq = sqToCoords('a', 4);
        await p0.move(gameId, p0_fromSq, p0_toSq, DUMMY_MOVE_ARGS);
        // ..h5
        p1_fromSq = sqToCoords('h', 7);
        p1_toSq = sqToCoords('h', 5);
        await p1.move(gameId, p1_fromSq, p1_toSq, DUMMY_MOVE_ARGS);

        // a5
        p0_fromSq = sqToCoords('a', 4);
        p0_toSq = sqToCoords('a', 5);
        await p0.move(gameId, p0_fromSq, p0_toSq, DUMMY_MOVE_ARGS);
        // ..h4
        p1_fromSq = sqToCoords('h', 5);
        p1_toSq = sqToCoords('h', 4);
        await p1.move(gameId, p1_fromSq, p1_toSq, DUMMY_MOVE_ARGS);

        // a6
        p0_fromSq = sqToCoords('a', 5);
        p0_toSq = sqToCoords('a', 6);
        await p0.move(gameId, p0_fromSq, p0_toSq, DUMMY_MOVE_ARGS);
        // ..h3
        p1_fromSq = sqToCoords('h', 4);
        p1_toSq = sqToCoords('h', 3);
        await p1.move(gameId, p1_fromSq, p1_toSq, DUMMY_MOVE_ARGS);

        // axb7
        p0_fromSq = sqToCoords('a', 6);
        p0_toSq = sqToCoords('b', 7);
        await p0.move(gameId, p0_fromSq, p0_toSq, DUMMY_MOVE_ARGS);
        // ..hxg2
        p1_fromSq = sqToCoords('h', 3);
        p1_toSq = sqToCoords('g', 2);
        await p1.move(gameId, p1_fromSq, p1_toSq, DUMMY_MOVE_ARGS);

        // bxa8=Q
        p0_fromSq = sqToCoords('b', 7);
        p0_toSq = sqToCoords('a', 8);
        await p0.move(gameId, p0_fromSq, p0_toSq, DUMMY_MOVE_ARGS);
        // ..gxh1=Q
        p1_fromSq = sqToCoords('g', 2);
        p1_toSq = sqToCoords('h', 1);
        await p1.move(gameId, p1_fromSq, p1_toSq, DUMMY_MOVE_ARGS);

        // Qxh1 (newly promoted queen)
        p0_fromSq = sqToCoords('a', 8);
        p0_toSq = sqToCoords('h', 1);
        await p0.move(gameId, p0_fromSq, p0_toSq, DUMMY_MOVE_ARGS);
    });

    async function genSetupArgs(boardSetup, boardSetupKey, gameKey, kingFile) {
        const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
        const setupHash = poseidon.F.toString(poseidonHash, 10);
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
        return {
            a: a, b: b, c: c, input: Input
        };
    }

    async function genMoveArgs(moveType, pieceFile, boardSetup, boardSetupKey, gameKey) {
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
        return {
            a: a, b: b, c: c, input: Input
        };
    }
});