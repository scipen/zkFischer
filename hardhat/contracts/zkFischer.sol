// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;

interface IPlacementVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) external view returns (bool);
}

interface IMoveVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[9] memory input
    ) external view returns (bool);
}

contract zkFischer {
    
    uint public gameKey;
    uint public phasingPlayer = 0;

    uint constant NA_FILE = 99;
    uint constant NOCOLOR = 0;
    uint constant WHITE = 1;
    uint constant BLACK = 2;
    mapping(string => uint) private pieces;  // values specific to contract
    mapping(uint => uint) private pieceColor;  // see constructor
    // mapping(string => uint8[3]) private allowedPieces;  // keys, values from in circuit

    // keep track of each piece's initial file throughout game.
    uint[8][8] public startingFiles = [
        [ 0, 1, 2, 3, 4, 5, 6, 7],
        [ 0, 1, 2, 3, 4, 5, 6, 7],
        [99,99,99,99,99,99,99,99],
        [99,99,99,99,99,99,99,99],
        [99,99,99,99,99,99,99,99],
        [99,99,99,99,99,99,99,99],
        [ 0, 1, 2, 3, 4, 5, 6, 7],
        [ 0, 1, 2, 3, 4, 5, 6, 7]
    ];

    // compare with constructor
    uint[8][8] public board = [
        [19,19,19,19,19,19,19,19],
        [16,16,16,16,16,16,16,16],
        [ 0, 0, 0, 0, 0, 0, 0, 0],
        [ 0, 0, 0, 0, 0, 0, 0, 0],
        [ 0, 0, 0, 0, 0, 0, 0, 0],
        [ 0, 0, 0, 0, 0, 0, 0, 0],
        [ 6, 6, 6, 6, 6, 6, 6, 6],
        [ 9, 9, 9, 9, 9, 9, 9, 9]
    ];

    address[2] public players;
    uint[2] public setupHashes;

    address public placementVerifier;
    address public moveVerifier;

    enum GamePhase {
        Register,
        SetupBoard,
        Playing,
        Ended
    }
    GamePhase public phase = GamePhase.Register;
    modifier atPhase(GamePhase _phase) {
        require(phase == _phase, "Function can't be called at this game phase.");
        _;
    }

    event PhaseChange(GamePhase phase);

    event Register(address indexed player);
    event SetupBoard(address indexed player);
    event Move(address indexed player);
    event GameEnd(address indexed winner);

    event Initialize();

    constructor(address _placementVerifier, address _moveVerifier) {
        placementVerifier = _placementVerifier;
        moveVerifier = _moveVerifier;
        
        // Z corresponds to unknown piece
        pieces['wR'] = 1;
        pieces['wN'] = 2;
        pieces['wB'] = 3;
        pieces['wQ'] = 4;
        pieces['wK'] = 5;
        pieces['wP'] = 6;
        pieces['wZ'] = 9;
        pieces['bR'] = 11;
        pieces['bN'] = 12;
        pieces['bB'] = 13;
        pieces['bQ'] = 14;
        pieces['bK'] = 15;
        pieces['bP'] = 16;
        pieces['bZ'] = 19;
        pieces['NA'] = 0;
        pieceColor[pieces['wR']] = WHITE;
        pieceColor[pieces['wN']] = WHITE;
        pieceColor[pieces['wB']] = WHITE;
        pieceColor[pieces['wQ']] = WHITE;
        pieceColor[pieces['wK']] = WHITE;
        pieceColor[pieces['wP']] = WHITE;
        pieceColor[pieces['wZ']] = WHITE;
        pieceColor[pieces['bR']] = BLACK;
        pieceColor[pieces['bN']] = BLACK;
        pieceColor[pieces['bB']] = BLACK;
        pieceColor[pieces['bQ']] = BLACK;
        pieceColor[pieces['bK']] = BLACK;
        pieceColor[pieces['bP']] = BLACK;
        pieceColor[pieces['bZ']] = BLACK;

        // board = [
        //     [pieces['bZ'],pieces['bZ'],pieces['bZ'],pieces['bZ'],pieces['bZ'],pieces['bZ'],pieces['bZ'],pieces['bZ']],
        //     [pieces['bP'],pieces['bP'],pieces['bP'],pieces['bP'],pieces['bP'],pieces['bP'],pieces['bP'],pieces['bP']],
        //     [pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA']],
        //     [pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA']],
        //     [pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA']],
        //     [pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA'],pieces['NA']],
        //     [pieces['wP'],pieces['wP'],pieces['wP'],pieces['wP'],pieces['wP'],pieces['wP'],pieces['wP'],pieces['wP']],
        //     [pieces['wZ'],pieces['wZ'],pieces['wZ'],pieces['wZ'],pieces['wZ'],pieces['wZ'],pieces['wZ'],pieces['wZ']]
        // ];

        // refer to circuits
        // {"R": 1, "N": 2, "B": 3, "Q": 4, "K": 5} with 0 as filler value
        // allowedPieces["diag"] = [3, 4, 0];  // diag
        // allowedPieces["orthog"] = [1, 4, 0];  // orthog
        // allowedPieces["knight"] = [2, 0, 0];  // knight

        // TODO
        gameKey = 0;
    }

    function register() public atPhase(GamePhase.Register) {
        if (players[0] == address(0)) {
            players[0] = msg.sender;
            emit Register(msg.sender);
        } else {
            require(players[0] != msg.sender, "Already registered.");
            players[1] = msg.sender;
            emit Register(msg.sender);
            phase = GamePhase.SetupBoard;
            emit PhaseChange(GamePhase.SetupBoard);
        }
    }

    // Accepts a ZKP of a valid placement verification circuit call
    function setupBoard(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[4] memory input
    ) public atPhase(GamePhase.SetupBoard) {
        require(msg.sender == players[0] || msg.sender == players[1], "Caller not registered.");
        // input: [isValid, setupHash, kingFile, gameKey]
        require(input[0] == 1, "Proof output wrong assertion.");
        require(input[3] == gameKey, "gameKey input incorrect.");
        require(
            IPlacementVerifier(placementVerifier).verifyProof(a, b, c, input),
            "Placement proof verification failed."
        );

        if (msg.sender == players[0]) {
            require(setupHashes[0] == 0, "P1 already setup.");
            setupHashes[0] = input[1];
            board[7][input[2]] = pieces['wK'];
            emit SetupBoard(msg.sender);
        } else if (msg.sender == players[1]) {
            require(setupHashes[1] == 0, "P2 already setup.");
            setupHashes[1] = input[1];
            board[0][input[2]] = pieces['bK'];
            emit SetupBoard(msg.sender);
        } else {
            revert("Unexpected setup error.");
        }

        if (setupHashes[0] != 0 && setupHashes[1] != 0) {
            phase = GamePhase.Playing;
            emit PhaseChange(GamePhase.Playing);
        }
    }

    // Pass move verification circuit proof parameters if you're moving a hidden piece (wZ or bZ).
    // Otherwise (e..g. if moving pawn), pass dummy inputs which will be ignored (TODO: refactor)
    function move(
        uint[2] memory fromSq,
        uint[2] memory toSq,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[9] memory input
    ) public atPhase(GamePhase.Playing) {
        // input: [isValid, pieceFile[3], requiredHash, allowedPieces[3], gameKey]

        // validate caller
        uint calculatedRequiredSetupHash;
        bool isWhiteMove;
        if (msg.sender == players[0]) {
            require(phasingPlayer == 0, "It's not player 1's turn.");
            calculatedRequiredSetupHash = setupHashes[0];
            isWhiteMove = true;
        } else if (msg.sender == players[1]) {
            require(phasingPlayer == 1, "It's not player 2's turn.");
            calculatedRequiredSetupHash = setupHashes[1];
            isWhiteMove = false;
        } else {
            revert("Caller is not a registered player.");
        }

        // validate move
        uint piece = board[fromSq[0]][fromSq[1]];
        if (piece != pieces['wZ'] && piece != pieces['bZ']) {
            validateRevealedMove(fromSq, toSq, isWhiteMove);
        } else {
            uint8[3] memory calculatedAllowedPieces;
            calculatedAllowedPieces = validateHiddenMove(fromSq, toSq, isWhiteMove);
        
            // validate proof if moving hidden piece
            uint _pieceFile = input[1]*4 + input[2]*2 + input[3];  // bin2dec
            uint8[3] memory _allowedPieces;
            for (uint i=0; i<3; i++) {
                _allowedPieces[i] = uint8(input[5+i]);
            }
            require(input[0] == 1, "Proof output doesn't assert placement is valid.");
            require(_pieceFile == startingFiles[fromSq[0]][fromSq[1]], "Circuit pieceFile input wrong.");
            require(input[4] == calculatedRequiredSetupHash, "requiredHash input wrong.");
            for (uint i=0; i<3; i++) {
                require(_allowedPieces[i] == calculatedAllowedPieces[i], "Circuit allowedPieces input wrong.");
            }
            require(input[8] == gameKey, "gameKey input wrong.");
            require(
                IMoveVerifier(moveVerifier).verifyProof(a, b, c, input),
                "Move proof verification failed."
            );
        }

        // check winner
        bool isWinning = (board[toSq[0]][toSq[1]] == pieces['wK'] || board[toSq[0]][toSq[1]] == pieces['bK']);

        // accept move
        board[toSq[0]][toSq[1]] = board[fromSq[0]][fromSq[1]];
        board[fromSq[0]][fromSq[1]] = pieces['NA'];
        startingFiles[toSq[0]][toSq[1]] = startingFiles[fromSq[0]][fromSq[1]];
        startingFiles[fromSq[0]][fromSq[1]] = NA_FILE;
        phasingPlayer = phasingPlayer == 0 ? 1 : 0;
        emit Move(msg.sender);

        // end game
        if (isWinning) {
            phase = GamePhase.Ended;
            emit GameEnd(msg.sender);
        }
    }

    function validateRevealedMove(uint[2] memory fromSq, uint[2] memory toSq, bool isWhiteMove) private view {
        validateMoveCommon(fromSq, toSq, isWhiteMove);

        uint piece = board[fromSq[0]][fromSq[1]];
        int dr = int(toSq[0]) - int(fromSq[0]);
        int dc = int(toSq[1]) - int(fromSq[1]);

        // TODO: impl pawn promotions, en passant
        if (piece == pieces['wK'] || piece == pieces['bK']) {
            require(abs(dr) <= 1 && abs(dc) <= 1, "Invalid king move.");
        } else if (piece == pieces['wP'] || piece == pieces['bP']) {
            if (abs(dc) == 1) {
                // capture
                if (isWhiteMove) {
                    require(dr == -1, "Invalid pawn move.");
                    require(pieceColor[board[toSq[0]][toSq[1]]] == BLACK, "Invalid pawn capture (no en passant yet).");
                } else {
                    require(dr == 1, "Invalid pawn move.");
                    require(pieceColor[board[toSq[0]][toSq[1]]] == WHITE, "Invalid pawn capture (no en passant yet).");
                }                
            } else if (dc == 0) {
                // move fwd
                int expectedRowChange = isWhiteMove ? -1 : int(1);
                uint startingPawnRank = isWhiteMove ? 6 : 1;
                if (dr == 2*expectedRowChange) {
                    // starting pawn move
                    require(fromSq[0] == startingPawnRank, "Pawn can only move 2 spaces from starting position.");
                    require(board[uint(int(fromSq[0])+1*expectedRowChange)][fromSq[1]] == pieces['NA'], "Piece in pawn path.");
                    require(board[uint(int(fromSq[0])+2*expectedRowChange)][fromSq[1]] == pieces['NA'], "Piece in pawn path.");
                } else {
                    require(dr == expectedRowChange, "Invalid pawn move.");
                    require(board[uint(int(fromSq[0])+1*expectedRowChange)][fromSq[1]] == pieces['NA'], "Piece in pawn path.");
                }
            } else {
                revert("Invalid pawn move.");
            }
        } else {
            revert("Unsupported piece.");
        }
    }

    function validateHiddenMove(uint[2] memory fromSq, uint[2] memory toSq, bool isWhiteMove) private view returns (uint8[3] memory) {
        validateMoveCommon(fromSq, toSq, isWhiteMove);

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
                board[uint(int(fromSq[0]) + rStep*i)][uint(int(fromSq[1]) + cStep*i)] == pieces['NA'],
                "Can't move through pieces as non-knight."
            );
        }
        return _allowedPieces;
    }

    function validateMoveCommon(uint[2] memory fromSq, uint[2] memory toSq, bool isWhiteMove) private view {
        require(0 <= fromSq[0] &&
                0 <= fromSq[1] &&
                fromSq[0] < 8 &&
                fromSq[1] < 8, "OOB fromSq.");
        require(0 <= toSq[0] &&
                0 <= toSq[1] &&
                toSq[0] < 8 &&
                toSq[1] < 8, "OOB toSq.");
        require(fromSq[0] != toSq[0] || fromSq[1] != toSq[1], "fromSq same as toSq.");

        uint fromColor = pieceColor[board[fromSq[0]][fromSq[1]]];
        uint toColor = pieceColor[board[toSq[0]][toSq[1]]];
        require(fromColor != NOCOLOR, "No piece at fromSq.");
        require(isWhiteMove ? fromColor == WHITE : fromColor == BLACK, "fromSq doesn't contain own piece.");
        require(isWhiteMove ? toColor != WHITE : toColor != BLACK, "toSq contains own piece.");
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