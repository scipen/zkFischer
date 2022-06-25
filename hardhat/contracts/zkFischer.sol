// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;

interface IPlacementVerifier {
    function verifyProof(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[3] memory input
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
    uint public phasingPlayer;

    uint constant NA = 99;
    mapping(string => uint) private pieces;  // values specific to contract
    mapping(string => uint8[3]) private allowedPieces;  // keys, values from in circuit

    // piece definitions are in `pieces`.
    uint[8][8] public board = [
        [19,19,19,19,19,19,19,19],
        [11,11,11,11,11,11,11,11],
        [99,99,99,99,99,99,99,99],
        [99,99,99,99,99,99,99,99],
        [99,99,99,99,99,99,99,99],
        [99,99,99,99,99,99,99,99],
        [ 1, 1, 1, 1, 1, 1, 1, 1],
        [ 9, 9, 9, 9, 9, 9, 9, 9]
    ];

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

    address[2] public players;
    uint[2] public setupHashes;

    address public placementVerifier;
    address public moveVerifier;

    enum GamePhase {
        Register,
        SetupBoard,
        Playing,
        Finish
    }
    GamePhase public phase = GamePhase.Register;
    modifier atPhase(GamePhase _phase) {
        require(phase == _phase, "Invalid call at phase.");
        _;
    }

    event PhaseChange(GamePhase phase);

    event Register(address indexed player);
    event SetupBoard(address indexed player);
    event Move(address indexed player);
    event GameEnd(address indexed winner);

    event TE(uint[2] param);

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

        // refer to circuits
        allowedPieces["diag"] = [3, 4, 0];  // diag
        allowedPieces["orthog"] = [1, 4, 0];  // orthog
        allowedPieces["knight"] = [2, 0, 0];  // knight

        // TODO
        gameKey = 0;
    }

    function pieceColor(uint x) private pure returns (int) {
        if (1 <= x && x <= 6 || x == 9) {
            return 0;
        } else if (11 <= x && x <= 16 || x == 19) {
            return 1;
        } else {
            return -1;
        }
    }

    function register() public { // atPhase(GamePhase.Register) {
        // uint[2] memory arr = [board[1][0], 9];
        // emit TE(arr);

        if (players[0] == address(0)) {
            players[0] = msg.sender;
            emit Register(msg.sender);
        } else {
            require(players[0] != msg.sender, "Player has already registered.");
            players[1] = msg.sender;
            emit Register(msg.sender);
            emit PhaseChange(GamePhase.SetupBoard);
        }
    }


    // Accepts a ZKP of a valid placement verification circuit call
    function setupBoard(
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[3] memory input
    ) public {  // atPhase(GamePhase.SetupBoard) {
        require(msg.sender == players[0] || msg.sender == players[1], "Caller is not a registered player.");
        uint _validSetup = input[0];
        uint _setupHash = input[1];
        uint _gameKey = input[2];
        require(_validSetup == 1, "Proof output doesn't assert that placement is valid.");
        require(_gameKey == gameKey, "gameKey input incorrect for this game.");
        require(
            IPlacementVerifier(placementVerifier).verifyProof(a, b, c, input),
            "Placement proof verification failed."
        );

        if (msg.sender == players[0]) {
            require(setupHashes[0] == 0, "Player 1 has already called setupBoard.");
            setupHashes[0] = _setupHash;
            emit SetupBoard(msg.sender);
        } else if (msg.sender == players[1]) {
            require(setupHashes[1] == 0, "Player 2 has already called setupBoard.");
            setupHashes[1] = _setupHash;
            emit SetupBoard(msg.sender);
        } else {
            revert("unexpected error");
        }

        if (setupHashes[0] != 0 && setupHashes[1] != 0) {
            emit PhaseChange(GamePhase.Playing);
        }
    }
    

    // Accepts a ZKP of a valid move verification circuit call
    function move(
        uint[2] memory fromSq,
        uint[2] memory toSq,
        uint[2] memory a,
        uint[2][2] memory b,
        uint[2] memory c,
        uint[9] memory input
    ) public { // atPhase(GamePhase.Playing) {
        require(msg.sender == players[0] || msg.sender == players[1], "Caller is not a registered player.");
        uint requiredSetupHash;
        bool whiteMove;
        if (msg.sender == players[0]) {
            require(phasingPlayer == 0, "It's not player 1's turn.");
            requiredSetupHash = setupHashes[0];
            whiteMove = true;
        } else if (msg.sender == players[1]) {
            require(phasingPlayer == 1, "It's not player 2's turn.");
            requiredSetupHash = setupHashes[0];
            whiteMove = false;
        } else {
            revert("unexpected error");
        }

        // contract parses move and gets correct piecefile and allowed pieces
        uint expectedPieceFile;
        uint8[3] memory expectedAllowedPieces;
        (expectedPieceFile, expectedAllowedPieces) = parseMove(fromSq, toSq, whiteMove);
        
        require(1 == input[0], "Proof output doesn't assert that move is valid.");
        uint _validSetup = input[0];
        uint _pieceFile = input[1]*4 + input[2]*2 + input[3];  // bin2dec
        uint _requiredHash = input[4];
        uint8[3] memory _allowedPieces;
        for (uint i=0; i<3; i++) {
            _allowedPieces[i] = uint8(input[5+i]);
        }
        uint _gameKey = input[8];
        require(_validSetup == 1, "Proof output doesn't assert that placement is valid.");
        require(_pieceFile == expectedPieceFile, "Circuit pieceFile input doesn't match expected.");
        require(_requiredHash == requiredSetupHash, "requiredHash input doesn't match earlier commitment.");
        for (uint i=0; i<3; i++) {
            require(_allowedPieces[i] == expectedAllowedPieces[i], "Circuit allowedPieces input doesn't match expected.");
        }
        require(_gameKey == gameKey, "gameKey input incorrect for this game.");
        require(
            IMoveVerifier(moveVerifier).verifyProof(a, b, c, input),
            "Move proof verification failed."
        );

        phasingPlayer = phasingPlayer == 0 ? 1 : 0;
        emit Move(msg.sender);
    }

    function parseMove(uint[2] memory fromSq, uint[2] memory toSq, bool whiteMove) public returns (uint, uint8[3] memory) {
        require(0 <= fromSq[0] &&
                0 <= fromSq[1] &&
                fromSq[0] < 8 &&
                fromSq[1] < 8, "Out of bounds fromSq.");
        require(0 <= toSq[0] &&
                0 <= toSq[1] &&
                toSq[0] < 8 &&
                toSq[1] < 8, "Out of bounds toSq.");
        require(fromSq[0] != toSq[0] || fromSq[1] != toSq[1], "fromSq same as toSq.");

        int fromColor = pieceColor(board[fromSq[0]][fromSq[1]]);
        int toColor = pieceColor(board[toSq[0]][toSq[1]]);
        require(fromColor != -1, "No piece at fromSq.");
        require(whiteMove ? fromColor == 0 : fromColor == 1, "Square doesn't contain correctly colored piece.");
        require(whiteMove ? toColor != 0 : toColor != 1, "toSq contains own piece.");

        // TODO: handle pawn moves

        int dr = abs(int(toSq[0]) - int(fromSq[0]));
        int dc = abs(int(toSq[1]) - int(fromSq[1]));

        // {0: diag, 1: orthog, 2: knight, 3: 1space (unused)}
        uint moveType;
        uint8[3] memory _allowedPieces;
        if (dr == 1 && dc == 2 || dr == 2 && dc == 1) {
            moveType = 2;
            _allowedPieces = allowedPieces["knight"];
        // } else if (dr <= 1 && dc <= 1) {
        //     moveType = 3;
        } else if (dr == 0 || dc == 0) {
            moveType = 1;
            _allowedPieces = allowedPieces["orthog"];
        } else if (dr == dc) {
            moveType = 0;
            _allowedPieces = allowedPieces["diag"];
        } else {
            revert("Invalid move");
        }

        // can't move through pieces unless knight
        if (moveType != 2) {
            uint minr;
            uint maxr;
            uint minc;
            uint maxc;
            if (fromSq[0] <= toSq[0]) {
                minr = fromSq[0];
                maxr = toSq[0];
            } else {
                minr = toSq[0];
                maxr = fromSq[0];
            }
            if (fromSq[1] <= toSq[1]) {
                minc = fromSq[1];
                maxc = toSq[1];
            } else {
                minc = toSq[1];
                maxc = fromSq[1];
            }

            for (uint i = minr; i <= maxr; i++) {
                for (uint j = minc; j <= maxc; j++) {
                    if (board[i][j] != NA) {
                        if (i != minr && j != minc) {
                            revert("Can't move through pieces as non-knight.");
                        }
                    }
                }
            }
        }

        // todo: check game end

        // accept move
        uint startingFile = startingFiles[fromSq[0]][fromSq[1]];
        board[toSq[0]][toSq[1]] = board[fromSq[0]][fromSq[1]];
        startingFiles[toSq[0]][toSq[1]] = startingFile;
        return (startingFile, _allowedPieces);
    }

    function abs(int x) private pure returns (int) {
        return x >= 0 ? x : -x;
    }
}