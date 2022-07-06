// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;

import "./ZkFischerUtils.sol";

struct PlacementVerifierInput {
    uint[2] a;
    uint[2][2] b;
    uint[2] c;
    uint[4] input;
}

struct MoveVerifierInput {
    uint[2] a;
    uint[2][2] b;
    uint[2] c;
    uint[9] input;
}

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

enum GamePhase {
    Register,
    SetupBoard,
    Playing,
    Ended
}

struct Game {
    uint gameKey;
    uint phasingPlayer;
    uint[8][8] startingFiles;
    uint[8][8] board;

    address[2] players;
    uint[2] setupHashes;
    GamePhase phase;
}

contract ZkFischer {

    address public zkFischerUtilsAddr;
    ZkFischerUtils public zkFischerUtils;
    
    // uint public gameKey;
    // uint public phasingPlayer;
    uint constant NA_FILE = 0;
    uint constant NOCOLOR = 0;
    uint constant WHITE = 1;
    uint constant BLACK = 2;

    // mapping(string => uint) private pieces;  // values specific to contract
    // mapping(uint => uint) private pieceColor;  // see constructor
    // mapping(string => uint8[3]) private allowedPieces;  // keys, values from in circuit

    // uint[8][8] public startingFiles;
    // uint[8][8] public board;
    // address[2] public players;
    // uint[2] public setupHashes;

    address public placementVerifier;
    address public moveVerifier;

    mapping(uint => Game) public games;
        
    modifier atPhase(uint gameId, GamePhase _phase) {
        require(games[gameId].phase == _phase, "Wrong phase.");
        _;
    }

    event PhaseChange(GamePhase phase);
    event Register(address indexed player);
    event SetupBoard(address indexed player);
    event Move(address indexed player);
    event GameEnd(address indexed winner);
    event Initialize();

    constructor(address _placementVerifier, address _moveVerifier, address _zkFischerUtilsAddr) {
        placementVerifier = _placementVerifier;
        moveVerifier = _moveVerifier;
        // todo: is calling via interface/addr better?
        zkFischerUtilsAddr = _zkFischerUtilsAddr;
        zkFischerUtils = ZkFischerUtils(zkFischerUtilsAddr);

        // Z corresponds to unknown piece
        // pieces['wR'] = 1;
        // pieces['wN'] = 2;
        // pieces['wB'] = 3;
        // pieces['wQ'] = 4;
        // pieces['wK'] = 5;
        // pieces['wP'] = 6;
        // pieces['wZ'] = 9;
        // pieces['bR'] = 11;
        // pieces['bN'] = 12;
        // pieces['bB'] = 13;
        // pieces['bQ'] = 14;
        // pieces['bK'] = 15;
        // pieces['bP'] = 16;
        // pieces['bZ'] = 19;
        // pieces['NA'] = 0;
        // pieceColor[pieces['wR']] = WHITE;
        // pieceColor[pieces['wN']] = WHITE;
        // pieceColor[pieces['wB']] = WHITE;
        // pieceColor[pieces['wQ']] = WHITE;
        // pieceColor[pieces['wK']] = WHITE;
        // pieceColor[pieces['wP']] = WHITE;
        // pieceColor[pieces['wZ']] = WHITE;
        // pieceColor[pieces['bR']] = BLACK;
        // pieceColor[pieces['bN']] = BLACK;
        // pieceColor[pieces['bB']] = BLACK;
        // pieceColor[pieces['bQ']] = BLACK;
        // pieceColor[pieces['bK']] = BLACK;
        // pieceColor[pieces['bP']] = BLACK;
        // pieceColor[pieces['bZ']] = BLACK;
        // resetGame();
    }

    // todo: free() for gas refund
    function initGame(uint gameId) private {
        games[gameId].startingFiles = [
            [ 0, 1, 2, 3, 4, 5, 6, 7],
            [ 0, 1, 2, 3, 4, 5, 6, 7],
            [99,99,99,99,99,99,99,99],
            [99,99,99,99,99,99,99,99],
            [99,99,99,99,99,99,99,99],
            [99,99,99,99,99,99,99,99],
            [ 0, 1, 2, 3, 4, 5, 6, 7],
            [ 0, 1, 2, 3, 4, 5, 6, 7]
        ];

        games[gameId].board = [
            [19,19,19,19,19,19,19,19],
            [16,16,16,16,16,16,16,16],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 0, 0, 0, 0, 0, 0, 0, 0],
            [ 6, 6, 6, 6, 6, 6, 6, 6],
            [ 9, 9, 9, 9, 9, 9, 9, 9]
        ];
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
        // gameKey = 0;
        games[gameId].phase = GamePhase.Register;
        emit Initialize();
    }

    function register(uint gameId) external atPhase(gameId, GamePhase.Register) {
        if (games[gameId].players[0] == address(0)) {
            initGame(gameId);
            games[gameId].players[0] = msg.sender;
            emit Register(msg.sender);
        } 
        else {
            require(games[gameId].players[0] != msg.sender, "Already reg");
            require(games[gameId].players[1] == address(0), "Game full");
            games[gameId].players[1] = msg.sender;
            emit Register(msg.sender);
            games[gameId].phase = GamePhase.SetupBoard;
            emit PhaseChange(GamePhase.SetupBoard);
        }
    }

    // Accepts a ZKP of a valid placement verification circuit call
    function setupBoard(
        uint gameId,
        PlacementVerifierInput memory verifierInput
    ) external atPhase(gameId, GamePhase.SetupBoard) {
        require(msg.sender == games[gameId].players[0] || msg.sender == games[gameId].players[1], "Not registered for gameId");

        // verifierInput.input: [isValid, setupHash, kingFile, gameKey]
        require(verifierInput.input[0] == 1, "Proof asserts failure");
        // require(verifierInput.input[3] == games[gameId].gameKey, "gameKey X");  // needed, but tmp remove for golf
        require(
            IPlacementVerifier(placementVerifier).verifyProof(
                verifierInput.a,
                verifierInput.b,
                verifierInput.c,
                verifierInput.input),
            "Bad proof"
        );

        if (msg.sender == games[gameId].players[0]) {
            require(games[gameId].setupHashes[0] == 0, "P1 already setup");
            games[gameId].setupHashes[0] = verifierInput.input[1];
            // board[7][input[2]] = pieces['wK'];
            games[gameId].board[7][verifierInput.input[2]] = 5;
            emit SetupBoard(msg.sender);
        } else if (msg.sender == games[gameId].players[1]) {
            require(games[gameId].setupHashes[1] == 0, "P2 already setup");
            games[gameId].setupHashes[1] = verifierInput.input[1];
            games[gameId].board[0][verifierInput.input[2]] = 15;
            // board[0][input[2]] = pieces['bK'];
            emit SetupBoard(msg.sender);
        } else {
            revert("Unexpected error");
        }

        if (games[gameId].setupHashes[0] != 0 && games[gameId].setupHashes[1] != 0) {
            games[gameId].phase = GamePhase.Playing;
            emit PhaseChange(GamePhase.Playing);
        }
    }

    // Pass move verification circuit proof parameters if you're moving a hidden piece (wZ or bZ).
    // Otherwise (e..g. if moving pawn), pass dummy inputs which will be ignored (TODO: refactor)
    function move(
        uint gameId,
        uint[2] calldata fromSq,
        uint[2] calldata toSq,
        MoveVerifierInput memory verifierInput
    ) external atPhase(gameId, GamePhase.Playing) {
        // verifierInput.input: [isValid, pieceFile[3], requiredHash, allowedPieces[3], gameKey]

        // validate caller
        uint calculatedRequiredSetupHash;
        bool isWhiteMove;
        if (msg.sender == games[gameId].players[0]) {
            require(games[gameId].phasingPlayer == 0, "It's P2's turn");
            calculatedRequiredSetupHash = games[gameId].setupHashes[0];
            isWhiteMove = true;
        } else if (msg.sender == games[gameId].players[1]) {
            require(games[gameId].phasingPlayer == 1, "It's P1's turn");
            calculatedRequiredSetupHash = games[gameId].setupHashes[1];
            isWhiteMove = false;
        } else {
            revert("Not registered for gameId");
        }

        // validate move
        uint piece = games[gameId].board[fromSq[0]][fromSq[1]];
        // if (piece != pieces['wZ'] && piece != pieces['bZ']) {
        if (piece != 9 && piece != 19) {
            zkFischerUtils.validateRevealedMove(games[gameId].board, fromSq, toSq, isWhiteMove);
        } else {
            uint8[3] memory calculatedAllowedPieces;
            calculatedAllowedPieces = zkFischerUtils.validateHiddenMove(games[gameId].board, fromSq, toSq, isWhiteMove);
        
            // validate proof if moving hidden piece
            uint _pieceFile = verifierInput.input[1]*4 + verifierInput.input[2]*2 + verifierInput.input[3];  // bin2dec
            uint8[3] memory _allowedPieces;
            for (uint i=0; i<3; i++) {
                _allowedPieces[i] = uint8(verifierInput.input[5+i]);
            }
            require(verifierInput.input[0] == 1, "Proof asserts failure");
            require(_pieceFile == games[gameId].startingFiles[fromSq[0]][fromSq[1]], "Wrong pieceFile");
            require(verifierInput.input[4] == calculatedRequiredSetupHash, "Wrong requiredHash");
            for (uint i=0; i<3; i++) {
                require(_allowedPieces[i] == calculatedAllowedPieces[i], "Wrong allowedPieces");
                // require(uint8(verifierInput.input[5+i]) == calculatedAllowedPieces[i], "allowedPieces X");
            }
            // require(input[8] == gameKey, "gameKey X");  // needed, but remove for golf
            require(
                IMoveVerifier(moveVerifier).verifyProof(
                    verifierInput.a,
                    verifierInput.b,
                    verifierInput.c,
                    verifierInput.input),
                "Bad proof"
            );
        }

        // check winner
        bool isWinning = (games[gameId].board[toSq[0]][toSq[1]] == 5 || games[gameId].board[toSq[0]][toSq[1]] == 15);
        // bool isWinning = (board[toSq[0]][toSq[1]] == pieces['wK'] || board[toSq[0]][toSq[1]] == pieces['bK']);

        // accept move
        games[gameId].board[toSq[0]][toSq[1]] = games[gameId].board[fromSq[0]][fromSq[1]];
        games[gameId].board[fromSq[0]][fromSq[1]] = 0;
        // board[fromSq[0]][fromSq[1]] = pieces['NA'];
        games[gameId].startingFiles[toSq[0]][toSq[1]] = games[gameId].startingFiles[fromSq[0]][fromSq[1]];
        games[gameId].startingFiles[fromSq[0]][fromSq[1]] = NA_FILE;
        games[gameId].phasingPlayer = games[gameId].phasingPlayer == 0 ? 1 : 0;
        emit Move(msg.sender);

        // end game
        if (isWinning) {
            games[gameId].phase = GamePhase.Ended;
            emit GameEnd(msg.sender);
        }
    }
}