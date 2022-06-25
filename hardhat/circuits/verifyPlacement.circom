pragma circom 2.0.3;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/mux3.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "./utils.circom";

template VerifyPlacement() {
    // piece ids
    // {"R": 1, "N": 2, "B": 3, "Q": 4, "K": 5} with 0 as filler value

    // public
    signal input setupHash;  // hash(boardSetup, boardSetupKey, gameKey)
    signal input kingFile;
    signal input gameKey;  // unique for each game. e.g. concat contributions from each player
    
    // private
    signal input boardSetup[8];
    signal input boardSetupKey;

    // output
    signal output ok;


    // board input range validation
    component boardSetupConstraint[8];
    for (var i=0; i<8; i++) {
        boardSetupConstraint[i] = RangeProof(3);
        boardSetupConstraint[i].in <== boardSetup[i];
        boardSetupConstraint[i].range[0] <== 1;
        boardSetupConstraint[i].range[1] <== 5;
        boardSetupConstraint[i].out === 1;
    }

    // validate board piece counts
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


    // validate kingFile matches position in setup
    component kingFileMux = Mux3();
    kingFileMux.c[0] <== boardSetup[0];
    kingFileMux.c[1] <== boardSetup[1];
    kingFileMux.c[2] <== boardSetup[2];
    kingFileMux.c[3] <== boardSetup[3];
    kingFileMux.c[4] <== boardSetup[4];
    kingFileMux.c[5] <== boardSetup[5];
    kingFileMux.c[6] <== boardSetup[6];
    kingFileMux.c[7] <== boardSetup[7];

    component kingFileBits = Num2Bits(3);
    kingFileBits.in <== kingFile;
    kingFileMux.s[0] <== kingFileBits.out[0];
    kingFileMux.s[1] <== kingFileBits.out[1];
    kingFileMux.s[2] <== kingFileBits.out[2];

    component kingCheck = IsEqual();
    kingCheck.in[0] <== 5;  // K
    kingCheck.in[1] <== kingFileMux.out;
    kingCheck.out === 1;


    // validate `setupHash` = hash(boardSetup, boardSetupKey, gameKey)
    component boardHash = Poseidon(10);
    component hashesEqual = IsEqual();
    for (var j=0; j<8; j++) {
        boardHash.inputs[j] <== boardSetup[j];
    }
    boardHash.inputs[8] <== boardSetupKey;
    boardHash.inputs[9] <== gameKey;
    hashesEqual.in[0] <== boardHash.out;
    hashesEqual.in[1] <== setupHash;

    ok <== hashesEqual.out;
}

component main {public [setupHash, gameKey]} = VerifyPlacement();