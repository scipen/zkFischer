pragma circom 2.0.3;

include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux3.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "./utils.circom";

template VerifyMove() {
    // piece ids
    // {"R": 1, "N": 2, "B": 3, "Q": 4, "K": 5} with 0 as filler value
    
    // number of pieces that can make this move.
    // instead of parameterizing this and requiring multiple circuits, hardcode to max for simplicity
    var n = 3;

    // public
    signal input pieceFile[3];  // binary 0-7 (big endian) to represent starting files a-g of the current moving piece
    signal input requiredHash;  // hash(boardSetup, boardSetupKey, gameKey)
    signal input allowedPieces[n];
    signal input gameKey;  // unique for each game. e.g. concat contributions from each player
    
    // private
    signal input boardSetup[8];
    signal input boardSetupKey;

    // output
    signal output ok;


    // input validation
    component pieceFileConstraint[3];
    for (var i=0; i<3; i++) {
         pieceFileConstraint[i] = RangeProof(1);
         pieceFileConstraint[i].in <== pieceFile[i];
         pieceFileConstraint[i].range[0] <== 0;
         pieceFileConstraint[i].range[1] <== 1;
         pieceFileConstraint[i].out === 1;
    }

    component allowedPiecesConstraint[n];
    for (var i=0; i<n; i++) {
         allowedPiecesConstraint[i] = RangeProof(3);
         allowedPiecesConstraint[i].in <== allowedPieces[i];
         allowedPiecesConstraint[i].range[0] <== 0;
         allowedPiecesConstraint[i].range[1] <== 5;
         allowedPiecesConstraint[i].out === 1;
    }
    
    component boardSetupConstraint[8];
    for (var i=0; i<8; i++) {
        boardSetupConstraint[i] = RangeProof(3);
        boardSetupConstraint[i].in <== boardSetup[i];
        boardSetupConstraint[i].range[0] <== 1;
        boardSetupConstraint[i].range[1] <== 5;
        boardSetupConstraint[i].out === 1;
    }

    var piece_cts[5] = [0, 0, 0, 0, 0];  // [ct_R, ct_N, ct_B, ct_Q, ct_K]
    component boardSetupBits[8];  // convert input into little-endian bits
    component pieceMux[8];  // determine value to add to `piece_cts`
    for (var i=0; i<8; i++) {
        pieceMux[i] = MultiMux3(8);
        
        // filler (invalid)
        pieceMux[i].c[0][0] <== 0;
        pieceMux[i].c[1][0] <== 0;
        pieceMux[i].c[2][0] <== 0;
        pieceMux[i].c[3][0] <== 0;
        pieceMux[i].c[4][0] <== 0;
        pieceMux[i].c[5][0] <== 0;
        pieceMux[i].c[6][0] <== 0;
        pieceMux[i].c[7][0] <== 0;

        // R
        pieceMux[i].c[0][1] <== 1;
        pieceMux[i].c[1][1] <== 0;
        pieceMux[i].c[2][1] <== 0;
        pieceMux[i].c[3][1] <== 0;
        pieceMux[i].c[4][1] <== 0;
        pieceMux[i].c[5][1] <== 0;
        pieceMux[i].c[6][1] <== 0;
        pieceMux[i].c[7][1] <== 0;

        // B
        pieceMux[i].c[0][2] <== 0;
        pieceMux[i].c[1][2] <== 1;
        pieceMux[i].c[2][2] <== 0;
        pieceMux[i].c[3][2] <== 0;
        pieceMux[i].c[4][2] <== 0;
        pieceMux[i].c[5][2] <== 0;
        pieceMux[i].c[6][2] <== 0;
        pieceMux[i].c[7][2] <== 0;

        // B
        pieceMux[i].c[0][3] <== 0;
        pieceMux[i].c[1][3] <== 0;
        pieceMux[i].c[2][3] <== 1;
        pieceMux[i].c[3][3] <== 0;
        pieceMux[i].c[4][3] <== 0;
        pieceMux[i].c[5][3] <== 0;
        pieceMux[i].c[6][3] <== 0;
        pieceMux[i].c[7][3] <== 0;

        // Q
        pieceMux[i].c[0][4] <== 0;
        pieceMux[i].c[1][4] <== 0;
        pieceMux[i].c[2][4] <== 0;
        pieceMux[i].c[3][4] <== 1;
        pieceMux[i].c[4][4] <== 0;
        pieceMux[i].c[5][4] <== 0;
        pieceMux[i].c[6][4] <== 0;
        pieceMux[i].c[7][4] <== 0;

        // K
        pieceMux[i].c[0][5] <== 0;
        pieceMux[i].c[1][5] <== 0;
        pieceMux[i].c[2][5] <== 0;
        pieceMux[i].c[3][5] <== 0;
        pieceMux[i].c[4][5] <== 1;
        pieceMux[i].c[5][5] <== 0;
        pieceMux[i].c[6][5] <== 0;
        pieceMux[i].c[7][5] <== 0;

        // unused
        pieceMux[i].c[0][6] <== 0;
        pieceMux[i].c[1][6] <== 0;
        pieceMux[i].c[2][6] <== 0;
        pieceMux[i].c[3][6] <== 0;
        pieceMux[i].c[4][6] <== 0;
        pieceMux[i].c[5][6] <== 0;
        pieceMux[i].c[6][6] <== 0;
        pieceMux[i].c[7][6] <== 0;

        // unused
        pieceMux[i].c[0][7] <== 0;
        pieceMux[i].c[1][7] <== 0;
        pieceMux[i].c[2][7] <== 0;
        pieceMux[i].c[3][7] <== 0;
        pieceMux[i].c[4][7] <== 0;
        pieceMux[i].c[5][7] <== 0;
        pieceMux[i].c[6][7] <== 0;
        pieceMux[i].c[7][7] <== 0;

        // both MultiMux3 selector and Num2Bits output are little-endian
        boardSetupBits[i] = Num2Bits(3);
        boardSetupBits[i].in <== boardSetup[i];
        pieceMux[i].s[0] <== boardSetupBits[i].out[0];
        pieceMux[i].s[1] <== boardSetupBits[i].out[1];
        pieceMux[i].s[2] <== boardSetupBits[i].out[2];
        
        for (var j=0; j<5; j++) {
            piece_cts[j] += pieceMux[i].out[j];
        }
    }
    
    var expected_cts[5] = [2, 2, 2, 1, 1];  // [ct_R, ct_N, ct_B, ct_Q, ct_K]
    component boardSetupCounter[5];
    for (var i=0; i<5; i++) {
        boardSetupCounter[i] = IsEqual();
        boardSetupCounter[i].in[0] <== piece_cts[i];
        boardSetupCounter[i].in[1] <== expected_cts[i];
        boardSetupCounter[i].out === 1;
    }


    // check that a valid hash can be generated when an allowed piece is at `boardSetup[int(pieceFile)]`
    component setupMux[n];
    for (var i=0; i<n; i++) {
        setupMux[i] = MultiMux3(8);
        for (var j=0; j<3; j++) {
            setupMux[i].s[j] <== pieceFile[2-j];  // MultiMux3 selector is little endian
        }
    }

    component boardHashes[n];
    component hashesEqual[n];
    component isValid = MultiOR(n);
    for (var i=0; i<n; i++) {
        setupMux[i].c[0][0] <== allowedPieces[i];
        setupMux[i].c[1][0] <== boardSetup[1];
        setupMux[i].c[2][0] <== boardSetup[2];
        setupMux[i].c[3][0] <== boardSetup[3];
        setupMux[i].c[4][0] <== boardSetup[4];
        setupMux[i].c[5][0] <== boardSetup[5];
        setupMux[i].c[6][0] <== boardSetup[6];
        setupMux[i].c[7][0] <== boardSetup[7];
        
        setupMux[i].c[0][1] <== boardSetup[0];
        setupMux[i].c[1][1] <== allowedPieces[i];
        setupMux[i].c[2][1] <== boardSetup[2];
        setupMux[i].c[3][1] <== boardSetup[3];
        setupMux[i].c[4][1] <== boardSetup[4];
        setupMux[i].c[5][1] <== boardSetup[5];
        setupMux[i].c[6][1] <== boardSetup[6];
        setupMux[i].c[7][1] <== boardSetup[7];

        setupMux[i].c[0][2] <== boardSetup[0];
        setupMux[i].c[1][2] <== boardSetup[1];
        setupMux[i].c[2][2] <== allowedPieces[i];
        setupMux[i].c[3][2] <== boardSetup[3];
        setupMux[i].c[4][2] <== boardSetup[4];
        setupMux[i].c[5][2] <== boardSetup[5];
        setupMux[i].c[6][2] <== boardSetup[6];
        setupMux[i].c[7][2] <== boardSetup[7];

        setupMux[i].c[0][3] <== boardSetup[0];
        setupMux[i].c[1][3] <== boardSetup[1];
        setupMux[i].c[2][3] <== boardSetup[2];
        setupMux[i].c[3][3] <== allowedPieces[i];
        setupMux[i].c[4][3] <== boardSetup[4];
        setupMux[i].c[5][3] <== boardSetup[5];
        setupMux[i].c[6][3] <== boardSetup[6];
        setupMux[i].c[7][3] <== boardSetup[7];

        setupMux[i].c[0][4] <== boardSetup[0];
        setupMux[i].c[1][4] <== boardSetup[1];
        setupMux[i].c[2][4] <== boardSetup[2];
        setupMux[i].c[3][4] <== boardSetup[3];
        setupMux[i].c[4][4] <== allowedPieces[i];
        setupMux[i].c[5][4] <== boardSetup[5];
        setupMux[i].c[6][4] <== boardSetup[6];
        setupMux[i].c[7][4] <== boardSetup[7];

        setupMux[i].c[0][5] <== boardSetup[0];
        setupMux[i].c[1][5] <== boardSetup[1];
        setupMux[i].c[2][5] <== boardSetup[2];
        setupMux[i].c[3][5] <== boardSetup[3];
        setupMux[i].c[4][5] <== boardSetup[4];
        setupMux[i].c[5][5] <== allowedPieces[i];
        setupMux[i].c[6][5] <== boardSetup[6];
        setupMux[i].c[7][5] <== boardSetup[7];

        setupMux[i].c[0][6] <== boardSetup[0];
        setupMux[i].c[1][6] <== boardSetup[1];
        setupMux[i].c[2][6] <== boardSetup[2];
        setupMux[i].c[3][6] <== boardSetup[3];
        setupMux[i].c[4][6] <== boardSetup[4];
        setupMux[i].c[5][6] <== boardSetup[5];
        setupMux[i].c[6][6] <== allowedPieces[i];
        setupMux[i].c[7][6] <== boardSetup[7];

        setupMux[i].c[0][7] <== boardSetup[0];
        setupMux[i].c[1][7] <== boardSetup[1];
        setupMux[i].c[2][7] <== boardSetup[2];
        setupMux[i].c[3][7] <== boardSetup[3];
        setupMux[i].c[4][7] <== boardSetup[4];
        setupMux[i].c[5][7] <== boardSetup[5];
        setupMux[i].c[6][7] <== boardSetup[6];
        setupMux[i].c[7][7] <== allowedPieces[i];

        boardHashes[i] = Poseidon(10);
        for (var j=0; j<8; j++) {
            boardHashes[i].inputs[j] <== setupMux[i].out[j];
        }
        boardHashes[i].inputs[8] <== boardSetupKey;
        boardHashes[i].inputs[9] <== gameKey;
        hashesEqual[i] = IsEqual();
        hashesEqual[i].in[0] <== boardHashes[i].out;
        hashesEqual[i].in[1] <== requiredHash;
        isValid.in[i] <== hashesEqual[i].out;
    }

    ok <== isValid.out;
}

component main {public [pieceFile, requiredHash, allowedPieces, gameKey]} = VerifyMove();