import { ethers } from "ethers";
import address from './artifacts/address.json';
import { generateCalldata } from './circuit_js/generate_calldata';
import zkFischer from './artifacts/zkFischer.json';
import { buildPoseidon } from "./poseidon";

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
    await connectContract();
    
    try {
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

const pc_to_int = {
    'wR': 1,
    'wN': 2,
    'wB': 3,
    'wQ': 4,
    'wK': 5,
    'wP': 6,
    'wZ': 9,
    'bR': 11,
    'bN': 12,
    'bB': 13,
    'bQ': 14,
    'bK': 15,
    'bP': 16,
    'bZ': 19
}
const int_to_pc = {
    1: 'wR',
    2: 'wN',
    3: 'wB',
    4: 'wQ',
    5: 'wK',
    6: 'wP',
    9: 'wZ',
    11: 'bR',
    12: 'bN',
    13: 'bB',
    14: 'bQ',
    15: 'bK',
    16: 'bP',
    19: 'bZ',
};

export async function playerId() {
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

export async function setupHashes(idx: number) {
    await connectContract();
    try {
        return await gameContract.setupHashes(idx);
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export async function readBoard() {
    await connectContract();
    let ij;
    let boardState : { [key:string] : string } = {};  // eg { 'a1' : 'bQ' }
    for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
            ij = await gameContract.board(i,j);
            if (Number(ij) != 0) {
                boardState[coordsToSq(i, j)] = int_to_pc[Number(ij) as keyof typeof int_to_pc];
                // console.log(i, j, ij, boardState);
            }
        }
    }
    return boardState;
}

export async function diffBoard(clientState: any) {
    let chainState = await readBoard();
    console.log(chainState);
    console.log(clientState);
    // a1: wQ

    let fromSqs = [];
    let toSqs = [];
    let piece;
    for (let [key, value] of Object.entries(chainState)) {
        if (!clientState.hasOwnProperty(key)) {
            fromSqs.push(key);
        }
    }
    for (let [key, value] of Object.entries(clientState)) {
        if (chainState[key] != value) {
            toSqs.push(key);
            piece = value;
        }
    }

    if (fromSqs.length != 1) {
        throw `Board transition unexpected, found fromSqs: ${fromSqs}. Try ReadBoard again?`;
    }
    if (toSqs.length != 1) {
        throw `Board transition unexpected, found toSqs: ${toSqs}. Try ReadBoard again?`;
    }
    let fromSq = sqToCoords(fromSqs[0][0], Number(fromSqs[0][1]));
    let toSq = sqToCoords(toSqs[0][0], Number(toSqs[0][1]));
    let pcStartingFile = await readStartingFile(fromSq[0]!, fromSq[1]!);

    let dx = Math.abs(fromSq[0]!-toSq[0]!);
    let dy = Math.abs(fromSq[1]!-toSq[1]!);
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

export async function readStartingFile(i: number, j: number) {
    await connectContract();
    let res = await gameContract.startingFiles(i,j);
    console.log(res);
    return res;;
}

function sqToCoords(file: string, rank: number) {
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

function coordsToSq(r: number, c: number) {
    let rank = 7-r + 1;
    let file = {
        0: 'a',
        1: 'b',
        2: 'c',
        3: 'd',
        4: 'e',
        5: 'f',
        6: 'g',
        7: 'h'
    }[c];
    return file + rank.toString();
}

function posToSetup(position: any, pid: number) {
    let boardSetup;
    if (pid == 0) {
        boardSetup = [
            pc_to_int[position['a1'] as keyof typeof pc_to_int],
            pc_to_int[position['b1'] as keyof typeof pc_to_int],
            pc_to_int[position['c1'] as keyof typeof pc_to_int],
            pc_to_int[position['d1'] as keyof typeof pc_to_int],
            pc_to_int[position['e1'] as keyof typeof pc_to_int],
            pc_to_int[position['f1'] as keyof typeof pc_to_int],
            pc_to_int[position['g1'] as keyof typeof pc_to_int],
            pc_to_int[position['h1'] as keyof typeof pc_to_int]
        ];
    } else {
        boardSetup = [
            pc_to_int[position['a8'] as keyof typeof pc_to_int]-10,
            pc_to_int[position['b8'] as keyof typeof pc_to_int]-10,
            pc_to_int[position['c8'] as keyof typeof pc_to_int]-10,
            pc_to_int[position['d8'] as keyof typeof pc_to_int]-10,
            pc_to_int[position['e8'] as keyof typeof pc_to_int]-10,
            pc_to_int[position['f8'] as keyof typeof pc_to_int]-10,
            pc_to_int[position['g8'] as keyof typeof pc_to_int]-10,
            pc_to_int[position['h8'] as keyof typeof pc_to_int]-10
        ];
    }
    return boardSetup;   
}

function posToKingFile(position: any, pid: number) {
    let targetVal;
    if (pid == 0) {
        targetVal = 'wK';
    } else if (pid == 1) {
        targetVal = 'bK';
    }
    for (const [key, value] of Object.entries(position)) {
        if (value == targetVal) {
            return sqToCoords(key[0], parseInt(key[1]))[1];
        }
    }
}

export async function pubSubmitSetup(position: any, boardSetupKey: any) {
    let pid = await playerId();
    if (pid == -1) {
        throw "Caller not registered."
    }
    let boardSetup = posToSetup(position, pid);
    let kingFile = posToKingFile(position, pid);
    boardSetupKey = parseInt(boardSetupKey);
    let gameKey = 0;
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


// TODO
export async function pubSubmitMove(
    boardSetup: any, boardSetupKey: any,
    move: any,
) {
    let pid = await playerId();
    if (pid == -1) {
        throw "Caller not registered."
    }
    let requiredHash = await setupHashes(pid);
    console.log(requiredHash);
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
    await connectContract();

    try {
        await gameContract.resetGame();
        return "Game reset.";
    } catch(error) {
        throw JSON.stringify(error);
    }
}