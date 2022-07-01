import { ethers } from "ethers";
import address from './artifacts/address.json';
import { generateCalldata } from './circuit_js/generate_calldata';
import zkFischer from './artifacts/zkFischer.json';
import { buildPoseidon } from "./poseidon";
import * as gameUtils from "./gameUtils";

let poseidon;
export let gameContract: ethers.Contract;

export async function connectContract() {
    const { ethereum } = window;

    let provider = new ethers.providers.Web3Provider(ethereum);
    let signer = provider.getSigner();
    let signerAddress = await signer.getAddress();
    console.log('signer: ', signerAddress);

    gameContract = new ethers.Contract(address['devnet_zkFischer'], zkFischer.abi, signer);
    console.log("Connected to Game Contract:", zkFischer);
    return signerAddress;
}

export async function register() {
    console.log("Calling contract.register");
    await connectContract();
    try {
        // TODO
        let tx = await gameContract.register();
        console.log(tx);
        
        let receipt = await tx.wait();
        console.log(receipt);

        let sumEvent = receipt.events.pop();
        console.log(sumEvent);
        return "Registration successful.";
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export async function getPlayerId() {
    console.log("Calling contract.players");
    let signerAddress = await connectContract();
    try {
        let p0 = await gameContract.players(0);
        let p1 = await gameContract.players(1);
        console.log(`Players: [${p0}, ${p1}]`);
        if (signerAddress == p0) {
            return 0;
        } else if (signerAddress == p1) {
            return 1;
        } else {
            throw "Caller isn't a registered player.";
        }
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export async function getSetupHash(idx: number) {
    console.log("Calling contract.setupHashes");
    await connectContract();
    try {
        return await gameContract.setupHashes(idx);
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export async function getStartingFile(i: number, j: number) {
    console.log("Calling contract.setupHashes");
    await connectContract();
    return await gameContract.startingFiles(i, j);
}

export async function getPhase() {
    console.log("Calling contract.phase");
    await connectContract();
    return await gameContract.phase();
}

export async function readBoard() {
    console.log("Calling contract.board");
    await connectContract();
    let pieceCode;
    let boardState : gameUtils.Position = {};  // eg {'a1': 'bQ'}
    for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
            pieceCode = await gameContract.board(i, j);
            pieceCode = Number(pieceCode);
            if (pieceCode != 0) {
                boardState[gameUtils.coordsToSq(i, j)] = gameUtils.codeToPc[pieceCode];
            }
        }
    }
    return boardState;
}

export async function pubSubmitSetup(position: gameUtils.Position, boardSetupKey: any, playerId: 0 | 1) {
    console.log("Calling contract.setupBoard");

    let boardSetup = gameUtils.posToBoardSetupInput(position, playerId);
    let kingFile = gameUtils.posToKingCol(position, playerId);
    boardSetupKey = parseInt(boardSetupKey);
    let gameKey = 0;  // TODO

    console.log("Computing board setup hash...")
    poseidon = await buildPoseidon();
    const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
    const setupHash = poseidon.F.toString(poseidonHash, 10);

    return await submitSetup({
        "setupHash": setupHash,
        "kingFile": kingFile,
        "gameKey": gameKey,
        "boardSetup": boardSetup,
        "boardSetupKey": boardSetupKey
    });
}

export async function pubSubmitMove(pubInput: any) {
    console.log("Calling contract.move");

    let requiredHash = await getSetupHash(pubInput["playerId"]);
    requiredHash = BigInt(requiredHash["_hex"]).toString();

    let piece = pubInput["piece"];
    let startingFile = pubInput["pcStartingFile"]["_hex"];
    let startingFileBin = (parseInt(startingFile, 16) - 1).toString(2);
    // -1 above because we added one in the contract to attempt bytecode shrink but didn't update all interfaces
    startingFileBin = startingFileBin.padStart(3, '0');

    let pieceFile = [parseInt(startingFileBin[0]), parseInt(startingFileBin[1]), parseInt(startingFileBin[2])];
    let gameKey = 0;
    
    let input = {
        "fromSq": pubInput["fromSq"],
        "toSq": pubInput["toSq"],
        "pieceFile": pieceFile,
        "requiredHash": requiredHash,
        "allowedPieces": pubInput["allowedPieces"],
        "gameKey": gameKey,
        "boardSetup": pubInput["boardSetupInput"],
        "boardSetupKey": pubInput["boardSetupKey"]
    };

    let response;
    console.log("Moving piece: ", piece);
    if (piece[1] == 'K' || piece[1] == 'P') {
        // public inputs dont need proofs. call contract directly
        try {
            response = await gameContract.move(pubInput["fromSq"], pubInput["toSq"],
                [0, 0],
                [[0, 0], [0, 0]],
                [0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0]);
        } catch(error) {
            throw JSON.stringify(error);
        }
    } else {
        response = await submitMove(input);
    }
    if (response) {
        if (pubInput["capturedPiece"] == 'wK' || pubInput["capturedPiece"] == 'bK') {
            return "You win! Click Reset Game to play again.";
        } else {
            return "Move successful. Your opponent can click Read Board once your move has propagated."
        }
    } else {
        throw "Invalid proof."
    }
}

export async function submitSetup(input: any) {
    await connectContract();
    console.log(input);
    let calldata = await generateCalldata(input, 'verifyPlacement_final.zkey', 'verifyPlacement.wasm');
    if (calldata) {
        try {
            let response = await gameContract.setupBoard(calldata[0], calldata[1], calldata[2], calldata[3]);
            if (response) {
                return JSON.stringify(input["boardSetup"]);
            }
            else {
                throw "Invalid proof for setupBoard.";
            }
        } catch(error) {
            throw JSON.stringify(error);
        }
    }
    else {
        throw "Witness generation failed. Check if your setup is valid (2 rooks, 2 knights, etc).";
    }
}

export async function submitMove(input: any) {
    await connectContract();
    console.log(input);
    let fromSq = input["fromSq"];
    let toSq = input["toSq"];
    delete input["fromSq"]; 
    delete input["toSq"];
    input["boardSetup"] = JSON.parse(input["boardSetup"]);
    let calldata = await generateCalldata(input, 'verifyMove_final.zkey', 'verifyMove.wasm');
    if (calldata) {
        try {
            let response = await gameContract.move(fromSq, toSq, calldata[0], calldata[1], calldata[2], calldata[3]);
            if (response) {
                return "Move successful.";
            }
            else {
                throw "Invalid proof for move.";
            }
        } catch(error) {
            throw JSON.stringify(error);
        }
    }
    else {
        throw "Witness generation failed. Check if your move is valid.";
    }
}

export async function resetGame() {
    console.log("Calling contract.resetGame");
    await connectContract();
    try {
        await gameContract.resetGame();
        return "Game reset.";
    } catch(error) {
        throw JSON.stringify(error);
    }
}