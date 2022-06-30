export type Piece =
  'wP' | 'wN' | 'wB' | 'wR' | 'wQ' | 'wK' |
  'bP' | 'bN' | 'bB' | 'bR' | 'bQ' | 'bK' |
  'wZ' | 'bZ'
;

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
    let file: string = square[0];
    let rank: number = Number(square[1]);
    
    let row = 8-rank;
    let col = fileToCol[file];
    return [row, col];
}

export function coordsToSq(row: number, col: number): string {
    // [0,0] -> 'a8'
    let rank = 8-row;
    let file = colToFile[col];
    return file + rank.toString();
}

export function posToBoardSetupInput(position: {[key: string]: Piece}, playerId: number): number[] {
    if (playerId == 0) {
        return [
            pcToCircuitCode[position['a1']],
            pcToCircuitCode[position['b1']],
            pcToCircuitCode[position['c1']],
            pcToCircuitCode[position['d1']],
            pcToCircuitCode[position['e1']],
            pcToCircuitCode[position['f1']],
            pcToCircuitCode[position['g1']],
            pcToCircuitCode[position['h1']]
        ];
    } else if (playerId == 1) {
        return [
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
    throw `Bad playerId ${playerId}`;
}

export function posToKingCol(position: {[key: string]: Piece}, playerId: number): number {
    let targetPiece = playerId == 0 ? 'wK' : 'bK';
    for (const [square, piece] of Object.entries(position)) {
        if (piece == targetPiece) {
            return sqToCoords(square)[1];
        }
    }
    throw `King not found for player ${playerId}`;
}