import { ethers } from "ethers";
import address from './artifacts/address.json';
import { generateCalldata } from './circuit_js/generate_calldata';
import ZkFischer from './artifacts/ZkFischer.json';
import { buildPoseidon } from "./poseidon";
import * as gameUtils from "./gameUtils";

let poseidon;
let signerAddress: any;
export let gameContract: ethers.Contract;

export async function connectContract() {
    const { ethereum } = window;

    let provider = new ethers.providers.Web3Provider(ethereum);
    let signer = provider.getSigner();
    let signerAddress = await signer.getAddress();
    console.log('signer: ', signerAddress);

    gameContract = new ethers.Contract(address['polygon_ZkFischer'], ZkFischer.abi, signer);
    console.log("Connected to Game Contract:", ZkFischer);
    return signerAddress;
}

export async function setup() {
    console.log("Setting up contract connection...");
    signerAddress = await connectContract();
}

export async function listen(
    gameId: number,
    acctAddress: string,
    eventName: string,
    callback: (acctAddress: string, eventAddress: string) => void
) {
    console.log(`Listening for ${eventName} for game ${gameId}...`);
    if (gameContract.listenerCount(eventName) == 0) {
        gameContract.on(eventName, (eventGameId, eventAddress) => {
            if (gameId == eventGameId) {
                callback(acctAddress, eventAddress);
            }
        });
    }
}

export async function clearListen() {
    console.log(`Removing all listeners...`);
    gameContract.removeAllListeners("Register");
    gameContract.removeAllListeners("SetupBoard");
    gameContract.removeAllListeners("Move");
    gameContract.removeAllListeners("GameEnd");
}

export async function register(gameId: number) {
    console.log("Calling contract.register");
    try {
        await gameContract.register(gameId);
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export async function getGame(gameId: number) {
    console.log("Calling contract.getGame");
    try {
        return await gameContract.games(gameId);
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export function getPlayer(game: any, idx: number) {
    console.log("Calling contract.getPlayer");
    try {
        if (idx == 0) {
            return game['player1'];
        } else {
            return game['player2'];
        }
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export function getPlayerId(game: any) {
    console.log("Calling contract.getPlayerId");
    try {
        const p0 = game['player1'];
        const p1 = game['player2'];

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

export function getSetupHash(game: any, idx: number) {
    console.log("Calling contract.getSetupHash");
    try {
        if (idx == 0) {
            return game['setupHash1'];
        } else {
            return game['setupHash2'];
        }
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export function getPhase(game: any) {
    console.log("Calling contract.phase");
    return game['phase'];
}

export async function getStartingFile(gameId: number, i: number, j: number) {
    console.log("Calling contract.getStartingFile");
    return await gameContract.getStartingFile(gameId, i, j);
}

export async function getBoard(gameId: number) {
    console.log("Calling contract.getBoard");
    let pieceCode;
    let boardState : gameUtils.Position = {};
    let board = await gameContract.getBoard(gameId);
    for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
            pieceCode = board[i][j];
            pieceCode = Number(pieceCode);
            if (pieceCode != 0) {
                boardState[gameUtils.coordsToSq(i, j)] = gameUtils.codeToPc[pieceCode];
            }
        }
    }
    return boardState;
}

export async function pubSubmitSetup(gameId: number, position: gameUtils.Position, boardSetupKey: any, playerId: 0 | 1) {
    console.log("Calling contract.setupBoard");

    let boardSetup = gameUtils.posToBoardSetupInput(position, playerId);
    let kingFile = gameUtils.posToKingCol(position, playerId);
    boardSetupKey = parseInt(boardSetupKey);
    let gameKey = 0;  // TODO

    console.log("Computing board setup hash...")
    poseidon = await buildPoseidon();
    const poseidonHash = poseidon.F.e(poseidon([...boardSetup, boardSetupKey, gameKey]));
    const setupHash = poseidon.F.toString(poseidonHash, 10);

    return await submitSetup(
        gameId,
        {
            "setupHash": setupHash,
            "kingFile": kingFile,
            "gameKey": gameKey,
            "boardSetup": boardSetup,
            "boardSetupKey": boardSetupKey
        }
    );
}

export async function pubSubmitMove(pubInput: any) {
    console.log("Calling contract.move");

    let requiredHash = pubInput["requiredHash"];
    let piece = pubInput["piece"];
    let startingFile = pubInput["pcStartingFile"]["_hex"];
    let startingFileBin = parseInt(startingFile, 16).toString(2);
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
            response = await gameContract.move(pubInput["gameId"], pubInput["fromSq"], pubInput["toSq"],
                {
                    a: [0, 0],
                    b: [[0, 0], [0, 0]],
                    c: [0, 0],
                    input: [0, 0, 0, 0, 0, 0, 0, 0, 0]
                });
        } catch(error) {
            throw JSON.stringify(error);
        }
    } else {
        response = await submitMove(pubInput["gameId"], input);
    }
    if (response) {
        if (pubInput["capturedPiece"] == 'wK' || pubInput["capturedPiece"] == 'bK') {
            return "You win! Click Reset Game to play again.";
        } else {
            return "Move successful. Board will refresh when your opponent has moved."
        }
    } else {
        throw "Invalid proof."
    }
}

export async function submitSetup(gameId: number, input: any) {
    console.log(input);
    let calldata = await generateCalldata(input, 'verifyPlacement_final.zkey', 'verifyPlacement.wasm');
    if (calldata) {
        try {
            let response = await gameContract.setupBoard(
                gameId,
                {
                    a: calldata[0],
                    b: calldata[1],
                    c: calldata[2],
                    input: calldata[3]
                }
            );
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

export async function submitMove(gameId: number, input: any) {
    console.log(input);
    let fromSq = input["fromSq"];
    let toSq = input["toSq"];
    delete input["fromSq"]; 
    delete input["toSq"];
    input["boardSetup"] = JSON.parse(input["boardSetup"]);
    let calldata = await generateCalldata(input, 'verifyMove_final.zkey', 'verifyMove.wasm');
    if (calldata) {
        try {
            let response = await gameContract.move(gameId, fromSq, toSq,
                {
                    a: calldata[0],
                    b: calldata[1],
                    c: calldata[2],
                    input: calldata[3]
                }
            );
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