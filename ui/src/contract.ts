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
        if (signerAddress == p0) {
            return 0;
        } else if (signerAddress == p1) {
            return 1;
        } else {
            return -1;
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

export async function readBoard() {
    console.log("Calling contract.board");
    await connectContract();
    let pieceCode;
    let boardState : { [square: string] : gameUtils.Piece } = {};  // eg {'a1': 'bQ'}
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

export async function diffBoard(clientState: {[key: string]: gameUtils.Piece}) {
    console.log("Computing board diff...");

    let chainState = await readBoard();
    console.log("chainState: ", chainState);
    console.log("clientState: ", clientState);

    let fromSqs = [];
    let toSqs = [];
    let piece;
    for (let [square, pc] of Object.entries(chainState)) {
        if (!clientState.hasOwnProperty(square)) {
            fromSqs.push(square);
        }
    }
    for (let [square, pc] of Object.entries(clientState)) {
        if (chainState[square] != pc) {
            toSqs.push(square);
            piece = pc;
        }
    }

    if (fromSqs.length != 1) {
        throw `Board transition unexpected, found fromSqs: ${fromSqs}. Try ReadBoard again?`;
    }
    if (toSqs.length != 1) {
        throw `Board transition unexpected, found toSqs: ${toSqs}. Try ReadBoard again?`;
    }
    let fromSq = gameUtils.sqToCoords(fromSqs[0]);
    let toSq = gameUtils.sqToCoords(toSqs[0]);
    let pcStartingFile = await getStartingFile(fromSq[0], fromSq[1]);

    let dx = Math.abs(fromSq[0]-toSq[0]);
    let dy = Math.abs(fromSq[1]-toSq[1]);
    let allowedPieces = [0, 0, 0];
    if (dx == 2 && dy == 1 || dx == 1 && dy == 2) {
        allowedPieces = [2, 0, 0]; // knight
    } else if (dx == 0 || dy == 0) {
        allowedPieces = [1, 4, 0]; // rook/queen
    } else if (dx == dy) {
        allowedPieces = [3, 4, 0]; // bishop/queen
    }

    console.log([fromSq, toSq, pcStartingFile, piece, allowedPieces]);
    return [fromSq, toSq, pcStartingFile, piece, allowedPieces];
}


export async function pubSubmitSetup(position: {[key: string]: gameUtils.Piece}, boardSetupKey: any) {
    console.log("Calling contract.setupBoard");

    let playerId = await getPlayerId();
    if (playerId == -1) {
        throw "Caller not registered."
    }
    let boardSetup = gameUtils.posToBoardSetupInput(position, playerId);
    let kingFile = gameUtils.posToKingCol(position, playerId);
    boardSetupKey = parseInt(boardSetupKey);
    let gameKey = 0;  // TODO

    console.log("Computing board setup hash...")
    poseidon = await buildPoseidon();
    const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
    const setupHash = poseidon.F.toString(poseidonHash, 10);

    return await submitSetup(JSON.stringify({
        "setupHash": setupHash,
        "kingFile": kingFile,
        "gameKey": gameKey,
        "boardSetup": boardSetup,
        "boardSetupKey": boardSetupKey
    }));
}


export async function pubSubmitMove(
    boardSetup: any, boardSetupKey: any,
    move: any,
) {
    console.log("Calling contract.move");

    let playerId = await getPlayerId();
    if (playerId == -1) {
        throw "Caller not registered."
    }
    let requiredHash = await getSetupHash(playerId);
    requiredHash = BigInt(requiredHash["_hex"]).toString();
    console.log(requiredHash);

    let piece = move[3];

    let startingFile = move[2]["_hex"];
    let startingFileBin = (parseInt(startingFile, 16) - 1).toString(2);
    // -1 above because we added one in the contract to attempt bytecode shrink but didn't update all interfaces
    startingFileBin = startingFileBin.padStart(3, '0');

    let pieceFile = [parseInt(startingFileBin[0]), parseInt(startingFileBin[1]), parseInt(startingFileBin[2])];
    let gameKey = 0;
    
    let imp = {
        "fromSq": move[0],
        "toSq": move[1],
        "pieceFile": pieceFile,
        "requiredHash": requiredHash,
        "allowedPieces": move[4],
        "gameKey": gameKey,
        "boardSetup": boardSetup,
        "boardSetupKey": boardSetupKey
    };
    console.log(imp);

    console.log(piece);
    if (piece[1] == 'K' || piece[1] == 'P') {
        // public inputs dont need proofs. call contract directly
        try {
            let valid = await gameContract.move(move[0], move[1],
                [0, 0],
                [[0, 0], [0, 0]],
                [0, 0],
                [0, 0, 0, 0, 0, 0, 0, 0, 0]);
            if (valid) {
                return "Move successful.";
            }
            else {
                throw "Invalid proof.";
            }
        } catch(error) {
            throw JSON.stringify(error);
        }
    } else {
        return await submitMove(JSON.stringify(imp));
    }
}

export async function submitSetup(input: any) {
    await connectContract();
    input = JSON.parse(input);
    let calldata = await generateCalldata(input, 'verifyPlacement_final.zkey', 'verifyPlacement.wasm');

    console.log(input);
    console.log(calldata);
    if (calldata) {
        try {
            let valid = await gameContract.setupBoard(calldata[0], calldata[1], calldata[2], calldata[3]);
            if (valid) {
                return JSON.stringify(input["boardSetup"]);
                // return calldata[3];
            }
            else {
                throw "Invalid proof.";
            }
        } catch(error) {
            throw JSON.stringify(error);
        }
    }
    else {
        throw "Witness generation failed.";
    }
}

export async function submitMove(input: any) {
    await connectContract();
    input = JSON.parse(input);
    console.log(JSON.stringify(input));
    let fromSq = input["fromSq"];
    let toSq = input["toSq"];
    delete input["fromSq"]; 
    delete input["toSq"];

    if (typeof(input["boardSetup"]) == 'string') {
        input["boardSetup"] = JSON.parse(input["boardSetup"]);
    }
    console.log(input);

    let calldata = await generateCalldata(input, 'verifyMove_final.zkey', 'verifyMove.wasm');
    console.log(calldata);

    if (calldata) {
        try {
            let valid = await gameContract.move(fromSq, toSq, calldata[0], calldata[1], calldata[2], calldata[3]);
            if (valid) {
                return calldata[3];
            }
            else {
                throw "Invalid proof.";
            }
        } catch(error) {
            throw JSON.stringify(error);
        }
    }
    else {
        throw "Witness generation failed.";
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