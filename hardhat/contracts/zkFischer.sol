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
        require(phase == _phase, "invalid call at phase");
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
            require(players[0] != msg.sender, "player has already registered");
            players[1] = msg.sender;
            emit Register(msg.sender);
            emit PhaseChange(GamePhase.SetupBoard);
        }
    }

    // Call with a board setupHash along with a ZKP that the hash is valid.
    function setupBoard(
        uint256 setupHash,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) public {  // atPhase(GamePhase.SetupBoard)
        require(msg.sender == players[0] || msg.sender == players[1], "caller is not a registered player");

        if (msg.sender == players[0]) {
            require(setupHashes[0] == 0, "player 1/2 has already called setupBoard");
            validatePlacementProof(setupHash, a, b, c, input);
            setupHashes[0] = setupHash;
            emit SetupBoard(msg.sender);
        } else if (msg.sender == players[1]) {
            require(setupHashes[1] == 0, "player 2/2 has already called setupBoard");
            validatePlacementProof(setupHash, a, b, c, input);
            setupHashes[1] = setupHash;
            emit SetupBoard(msg.sender);
        } else {
            revert("unexpected error");
        }

        if (setupHashes[0] != 0 && setupHashes[1] != 0) {
            emit PhaseChange(GamePhase.Playing);
        }
    }
    

    // Call with a move along with a ZKP that the move is valid.
    function move(
        uint256 moveCmd,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[9] memory input
    ) public atPhase(GamePhase.Playing) {
        require(msg.sender == players[0] || msg.sender == players[1], "caller is not a registered player");

        if (msg.sender == players[0]) {
            require(gameHistory.length % 2 == 0, "it's player 2/2's turn");
            validateMoveProof(0, a, b, c, input);
            gameHistory.push(moveCmd);
            emit Move(msg.sender);
        } else if (msg.sender == players[1]) {
            require(gameHistory.length % 2 == 1, "it's player 1/2's turn");
            validateMoveProof(1, a, b, c, input);
            gameHistory.push(moveCmd);
            emit Move(msg.sender);
        } else {
            revert("unexpected error");
        }

    }

    function validatePlacementProof(
        uint256 setupHash,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory input
    ) private view {
        require(input[1] == setupHash, "public setupHash input doesn't match");
        require(input[2] == gameKey, "public gameKey input doesn't match");
        require(
            IPlacementVerifier(placementVerifier).verifyProof(a, b, c, input),
            "placement proof verification error"
        );
    }


    function validateMoveProof(
        uint256 playerIdx,
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[9] memory input
    ) private view {
        // TODO: validate other public inputs

        assert(playerIdx == 0 || playerIdx == 1);
        require(input[4] == setupHashes[playerIdx], "public requiredHash input doesn't match");
        require(input[8] == gameKey, "public gameKey input doesn't match");
        require(
            IMoveVerifier(moveVerifier).verifyProof(a, b, c, input),
            "move proof verification error"
        );
    }
}