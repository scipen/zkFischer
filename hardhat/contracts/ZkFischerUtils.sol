// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;


contract ZkFischerUtils {

    uint constant NA_FILE = 0;
    uint constant NOCOLOR = 0;
    uint constant WHITE = 1;
    uint constant BLACK = 2;

    function isPawnPromotion(
        uint[8][8] calldata board,
        uint[2] calldata fromSq,
        uint[2] calldata toSq
    ) external pure returns (bool) {
        // assume validate was already called
        uint piece = board[fromSq[0]][fromSq[1]];
        // if (piece == pieces['wP'] || piece == pieces['bP'])
        if (piece == 6 || piece == 16) {
            if (toSq[0] == 0 || toSq[0] == 7) {
                return true;
            }
        }
        return false;
    }

    function validateRevealedMove(
        uint[8][8] calldata board,
        uint[2] calldata fromSq,
        uint[2] calldata toSq,
        bool isWhiteMove
    ) external pure {
        validateMoveCommon(board, fromSq, toSq, isWhiteMove);

        uint piece = board[fromSq[0]][fromSq[1]];
        int dr = int(toSq[0]) - int(fromSq[0]);
        int dc = int(toSq[1]) - int(fromSq[1]);

        // TODO: impl pawn promotions, en passant
        // if (piece == pieces['wK'] || piece == pieces['bK']) {
        if (piece == 5 || piece == 15) {
            require(abs(dr) <= 1 && abs(dc) <= 1, "Bad king move");
        // } else if (piece == pieces['wP'] || piece == pieces['bP']) {
        } else if (piece == 6 || piece == 16) {
            if (abs(dc) == 1) {
                // capture
                if (isWhiteMove) {
                    require(dr == -1, "Bad pawn move");
                    require(pieceColor(board[toSq[0]][toSq[1]]) == BLACK, "Bad pawn move");
                } else {
                    require(dr == 1, "Bad pawn move");
                    require(pieceColor(board[toSq[0]][toSq[1]]) == WHITE, "Bad pawn move");
                }                
            } else if (dc == 0) {
                // move fwd
                int expectedRowChange = isWhiteMove ? -1 : int(1);
                uint startingPawnRank = isWhiteMove ? 6 : 1;
                if (dr == 2*expectedRowChange) {
                    // starting pawn move
                    require(fromSq[0] == startingPawnRank, "Bad pawn move");
                    require(board[uint(int(fromSq[0])+expectedRowChange)][fromSq[1]] == 0, "Piece in pawn path");
                    require(board[uint(int(fromSq[0])+2*expectedRowChange)][fromSq[1]] == 0, "Piece in pawn path");
                    // require(board[uint(int(fromSq[0])+1*expectedRowChange)][fromSq[1]] == pieces['NA'], "Piece in pawn path.");
                    // require(board[uint(int(fromSq[0])+2*expectedRowChange)][fromSq[1]] == pieces['NA'], "Piece in pawn path.");
                } else {
                    require(dr == expectedRowChange, "Bad pawn move");
                    require(board[uint(int(fromSq[0])+expectedRowChange)][fromSq[1]] == 0, "Piece in pawn path");
                    // require(board[uint(int(fromSq[0])+1*expectedRowChange)][fromSq[1]] == pieces['NA'], "Piece in pawn path.");
                }
            } else {
                revert("Bad pawn move");
            }
        } else if (piece == 4 || piece == 14) {  // wQ or bQ
            // check for invalid movement through pieces
            uint adr = abs(dr);
            uint adc = abs(dc);
            require(adr == adc || adr == 0 || adc == 0, "Bad queen move");
            int rStep = sign(dr);
            int cStep = sign(dc);
        
            // iterate over path excluding endpoints
            for (int i=1; i < int(max(adr, adc)); i++) {
                require(
                    board[uint(int(fromSq[0]) + rStep*i)][uint(int(fromSq[1]) + cStep*i)] == 0,
                    "Can't move through pieces"
                );
            }
        } else {
            revert("Unsupported piece");
        }
    }

    function validateHiddenMove(
        uint[8][8] calldata board,
        uint[2] calldata fromSq,
        uint[2] calldata toSq,
        bool isWhiteMove
    ) external pure returns (uint8[3] memory) {
        validateMoveCommon(board, fromSq, toSq, isWhiteMove);

        int dr = int(toSq[0]) - int(fromSq[0]);
        int dc = int(toSq[1]) - int(fromSq[1]);
        uint adr = abs(dr);
        uint adc = abs(dc);

        // {0: diag, 1: orthog, 2: knight, 3: 1space (unused)}
        uint moveType;
        uint8[3] memory _allowedPieces;
        
        if (adr == 1 && adc == 2 || adr == 2 && adc == 1) {
            moveType = 2;
            // allowedPieces["knight"] = [2, 0, 0];  // knight
            _allowedPieces = [2, 0, 0];
        // } else if (dr <= 1 && dc <= 1) {
        //     moveType = 3;
        } else if (adr == 0 || adc == 0) {
            moveType = 1;
            // allowedPieces["orthog"] = [1, 4, 0];  // orthog
            _allowedPieces = [1, 4, 0];
        } else if (adr == adc) {
            moveType = 0;
            // allowedPieces["diag"] = [3, 4, 0];  // diag
            _allowedPieces = [3, 4, 0];
        } else {
            revert("Invalid move");
        }

        // knight moves at this point don't need more checks
        if (moveType == 2) {
            return _allowedPieces;
        }

        // check for invalid movement through pieces
        assert(adr == adc || adr == 0 || adc == 0);
        int rStep = sign(dr);
        int cStep = sign(dc);
    
        // iterate over path excluding endpoints
        for (int i=1; i < int(max(adr, adc)); i++) {
            require(
                board[uint(int(fromSq[0]) + rStep*i)][uint(int(fromSq[1]) + cStep*i)] == 0,
                "Can't move through pieces"
            );
            // require(
            //     board[uint(int(fromSq[0]) + rStep*i)][uint(int(fromSq[1]) + cStep*i)] == pieces['NA'],
            //     "Can't move through pieces as non-knight."
            // );
        }
        return _allowedPieces;
    }

    function validateMoveCommon(
        uint[8][8] calldata board,
        uint[2] calldata fromSq,
        uint[2] calldata toSq,
        bool isWhiteMove
    ) private pure {
        require(0 <= fromSq[0] &&
                0 <= fromSq[1] &&
                fromSq[0] < 8 &&
                fromSq[1] < 8, "Out-of-bounds fromSq");
        require(0 <= toSq[0] &&
                0 <= toSq[1] &&
                toSq[0] < 8 &&
                toSq[1] < 8, "Out-of-bounds toSq");
        require(fromSq[0] != toSq[0] || fromSq[1] != toSq[1], "No change");

        uint fromColor = pieceColor(board[fromSq[0]][fromSq[1]]);
        uint toColor = pieceColor(board[toSq[0]][toSq[1]]);
        require(fromColor != NOCOLOR, "fromSq empty");
        require(isWhiteMove ? fromColor == WHITE : fromColor == BLACK, "fromSq wrong color");
        require(isWhiteMove ? toColor != WHITE : toColor != BLACK, "toSq wrong color");
    }

    function pieceColor(uint x) private pure returns (uint) {
        if (1 <= x && x <= 6 || x == 9) {
            return WHITE;
        } else if (11 <= x && x <= 16 || x == 19) {
            return BLACK;
        }
        return NOCOLOR;
    }

    function abs(int x) private pure returns (uint) {
        return x >= 0 ? uint(x) : uint(-x);
    }

    function sign(int x) private pure returns (int) {
        return x == 0 ? int(0) : (x > 0 ? int(1) : -1);
    }

    function max(uint a, uint b) private pure returns (uint) {
        return a > b ? a : b;
    }
}