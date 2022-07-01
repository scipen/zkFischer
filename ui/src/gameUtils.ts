export type Piece =
  'wP' | 'wN' | 'wB' | 'wR' | 'wQ' | 'wK' |
  'bP' | 'bN' | 'bB' | 'bR' | 'bQ' | 'bK' |
  'wZ' | 'bZ'
;

export type Position = { [key: string]: Piece };

function pieceColor(piece: Piece) {
    return piece[0];
}

// piece values from contract
export const pcToCode: {[piece in Piece]: number} = {
    'wR': 1, 'wN': 2, 'wB': 3, 'wQ': 4, 'wK': 5, 'wP': 6, 'wZ': 9,
    'bR': 11,'bN': 12,'bB': 13,'bQ': 14,'bK': 15,'bP': 16,'bZ': 19
}
export const codeToPc = Object.fromEntries(Object.entries(pcToCode).map(x => x.reverse()));

export const pcToCircuitCode: {[piece in Piece]: number} = {
    'wR': 1, 'wN': 2, 'wB': 3, 'wQ': 4, 'wK': 5, 'wP': 6, 'wZ': 9,
    'bR': 1, 'bN': 2, 'bB': 3, 'bQ': 4, 'bK': 5, 'bP': 6, 'bZ': 9
}

const fileToCol: {[file: string]: number} = {'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7};
const colToFile: {[col: number]: string} = Object.fromEntries(Object.entries(fileToCol).map(x => x.reverse()));

export function sqToCoords(square: string): [number, number] {
    // 'a1' -> [7,0]
    const file: string = square[0];
    const rank: number = Number(square[1]);
    
    const row = 8-rank;
    const col = fileToCol[file];
    return [row, col];
}

export function coordsToSq(row: number, col: number): string {
    // [0,0] -> 'a8'
    const rank = 8-row;
    const file = colToFile[col];
    return file + rank.toString();
}

export function posToBoardSetupInput(position: Position, playerId: 0 | 1): number[] {
    const playerColor = playerId == 0 ? 'White' : 'Black';
    let boardSetup;
    if (playerId == 0) {
        boardSetup = [
            pcToCircuitCode[position['a1']],
            pcToCircuitCode[position['b1']],
            pcToCircuitCode[position['c1']],
            pcToCircuitCode[position['d1']],
            pcToCircuitCode[position['e1']],
            pcToCircuitCode[position['f1']],
            pcToCircuitCode[position['g1']],
            pcToCircuitCode[position['h1']]
        ];
    } else {
        boardSetup = [
            pcToCircuitCode[position['a8']],
            pcToCircuitCode[position['b8']],
            pcToCircuitCode[position['c8']],
            pcToCircuitCode[position['d8']],
            pcToCircuitCode[position['e8']],
            pcToCircuitCode[position['f8']],
            pcToCircuitCode[position['g8']],
            pcToCircuitCode[position['h8']]
        ];
    }
    if (boardSetup.some(c => isNaN(c))) {
        throw `Setup for ${playerColor} is incomplete.`
    }
    return boardSetup;
}

export function posToKingCol(position: Position, playerId: number): number {
    const playerColor = playerId == 0 ? 'White' : 'Black';
    const targetPiece = playerId == 0 ? 'wK' : 'bK';
    for (const [square, piece] of Object.entries(position)) {
        if (piece == targetPiece) {
            return sqToCoords(square)[1];
        }
    }
    throw `King not found for ${playerColor}.`;
}

export function filterSetupPosition(
    clientPosition: Position,
    playerId: 0 | 1) {
    const playerColor = playerId == 0 ? 'w' : 'b';
    const setupPosition = Object.fromEntries(
        Object.entries(clientPosition).filter(
           ([square, pc]) => pc[0] == playerColor
        )
    );
    return setupPosition;
}

export function computePlayerPosition(
    clientPosition: Position,
    chainPosition: Position,
    playerId: 0 | 1) {
    const playerColor = playerId == 0 ? 'w' : 'b';
    const opponentColor = playerId == 0 ? 'b' : 'w';
    const computedPosition = Object.fromEntries(
        Object.entries(clientPosition).filter(
           ([square, pc]) => pc[0] == playerColor
        ).concat(
        Object.entries(chainPosition).filter(
            ([square, pc]) => pc[0] == opponentColor
        ))
    );
    return computedPosition
}

export function computePlayerMove(
    clientPosition: Position,
    chainPosition: Position) {
    let fromSqs = [];
    let toSqs = [];
    let piece: Piece;
    let capturedPiece: Piece | string = "";
    for (let [square, pc] of Object.entries(chainPosition)) {
        if (!clientPosition.hasOwnProperty(square)) {
            fromSqs.push(square);
        }
    }
    for (let [square, pc] of Object.entries(clientPosition)) {
        if (!chainPosition.hasOwnProperty(square)) {
            toSqs.push(square);
            piece = pc;
        } else if (pieceColor(chainPosition[square]) != pieceColor(pc)) {
            toSqs.push(square);
            piece = pc;
            capturedPiece = chainPosition[square];
        }
    }
    if (fromSqs.length != 1 || toSqs.length != 1) {
        throw `Game not started, invalid move, or client position corrupted. Try calling readBoard to sync state, then try moving again.\n
fromSqs: ${JSON.stringify(fromSqs)}, toSqs: ${JSON.stringify(toSqs)}`
    }
    return {
        "fromSq": fromSqs[0],
        "toSq": toSqs[0],
        "piece": piece!,
        "capturedPiece": capturedPiece
    }
}