// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;

interface IPlacementVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) external view returns (bool);
}

interface IMoveVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[9] memory input
    ) external view returns (bool);
}

contract zkFischer {
    
    uint256 public gameKey;
    uint256[] public gameHistory;

    address[2] public players;
    uint256[2] public setupHashes;

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

    event Initialize();

    constructor(address _placementVerifier, address _moveVerifier) {
        placementVerifier = _placementVerifier;
        moveVerifier = _moveVerifier;
        
        // TODO
        gameKey = 0;
    }

    function register() public atPhase(GamePhase.Register) {
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
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) public {  // atPhase(GamePhase.SetupBoard) {
        require(msg.sender == players[0] || msg.sender == players[1], "Caller is not a registered player.");
        uint256 _validSetup = input[0];
        uint256 _setupHash = input[1];
        uint256 _gameKey = input[2];
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
        uint256 moveCmd,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[9] memory input
    ) public { // atPhase(GamePhase.Playing) {
        require(msg.sender == players[0] || msg.sender == players[1], "Caller is not a registered player.");
        uint256 requiredSetupHash;
        if (msg.sender == players[0]) {
            require(gameHistory.length % 2 == 0, "It's not player 1's turn.");
            requiredSetupHash = setupHashes[0];
        } else if (msg.sender == players[1]) {
            require(gameHistory.length % 2 == 1, "It's not player 2's turn.");
            requiredSetupHash = setupHashes[0];
        } else {
            revert("unexpected error");
        }

        // contract parses move and gets correct piecefile and allowedpieces
        uint256[3] memory expectedPieceFile;
        uint256[3] memory expectedAllowedPieces;
        parseMove(moveCmd);
        
        require(1 == input[0], "Proof output doesn't assert that move is valid.");
        uint256 _validSetup = input[0];
        uint256[3] memory _pieceFile;
        for (uint256 i=0; i<3; i++) {
            _pieceFile[i] = input[1+i];
        }
        uint256 _requiredHash = input[4];
        uint256[3] memory _allowedPieces;
        for (uint256 i=0; i<3; i++) {
            _allowedPieces[i] = input[5+i];
        }
        uint256 _gameKey = input[8];
        require(_validSetup == 1, "Proof output doesn't assert that placement is valid.");
        // require(_pieceFile == expectedPieceFile, "Circuit pieceFile input doesn't match expected.");
        require(_requiredHash == requiredSetupHash, "requiredHash input doesn't match earlier commitment.");
        // require(_allowedPieces == expectedAllowedPieces, "Circuit allowedPieces input doesn't match expected.");
        require(_gameKey == gameKey, "gameKey input incorrect for this game.");
        require(
            IMoveVerifier(moveVerifier).verifyProof(a, b, c, input),
            "Move proof verification failed."
        );

        gameHistory.push(moveCmd);
        emit Move(msg.sender);
    }

    function parseMove(uint256 moveCmd) private {
        // find expectedPieceFile and expectedAllowedPieces
        // reject invalid moves per chess logic
        // detect victory (king capture) and emit Finish() if proof valid
    }
}