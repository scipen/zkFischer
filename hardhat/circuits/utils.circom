pragma circom 2.0.3;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";

template MultiOR(n) {
    signal input in[n];
    signal output out;
    component or1;
    component or2;
    component ors[2];
    if (n==1) {
        out <== in[0];
    } else if (n==2) {
        or1 = OR();
        or1.a <== in[0];
        or1.b <== in[1];
        out <== or1.out;
    } else {
        or2 = OR();
        var n1 = n\2;
        var n2 = n-n\2;
        ors[0] = MultiOR(n1);
        ors[1] = MultiOR(n2);
        var i;
        for (i=0; i<n1; i++) ors[0].in[i] <== in[i];
        for (i=0; i<n2; i++) ors[1].in[i] <== in[n1+i];
        or2.a <== ors[0].out;
        or2.b <== ors[1].out;
        out <== or2.out;
    }
}

template RangeProof(n) {
    assert(n <= 252);
    signal input in;
    signal input range[2];
    signal output out;

    component low = LessEqThan(n);
    component high = GreaterEqThan(n);
    low.in[0] <== in;
    low.in[1] <== range[1];
    high.in[0] <== in;
    high.in[1] <== range[0];
    
    out <== low.out * high.out;
}