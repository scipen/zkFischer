#!/bin/bash

cd circuits
mkdir -p build

if [ -f ./powersOfTau28_hez_final_12.ptau ]; then
    echo "powersOfTau28_hez_final_12.ptau already exists. Skipping."
else
    echo 'Downloading powersOfTau28_hez_final_12.ptau'
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau
fi

echo "Compiling: verifyMove..."

# compile verifyMove circuit
circom verifyMove.circom --r1cs --wasm --sym -o build
snarkjs r1cs info build/verifyMove.r1cs

# Start a new zkey and make a contribution
snarkjs groth16 setup build/verifyMove.r1cs powersOfTau28_hez_final_12.ptau build/verifyMove_0000.zkey
snarkjs zkey contribute build/verifyMove_0000.zkey build/verifyMove_final.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey build/verifyMove_final.zkey build/verifyMove_verification_key.json

# generate solidity contract
snarkjs zkey export solidityverifier build/verifyMove_final.zkey ../contracts/verifyMove_verifier.sol



echo "Compiling: verifyPlacement..."

# compile verifyPlacement circuit
circom verifyPlacement.circom --r1cs --wasm --sym -o build
snarkjs r1cs info build/verifyPlacement.r1cs

# Start a new zkey and make a contribution
snarkjs groth16 setup build/verifyPlacement.r1cs powersOfTau28_hez_final_12.ptau build/verifyPlacement_0000.zkey
snarkjs zkey contribute build/verifyPlacement_0000.zkey build/verifyPlacement_final.zkey --name="1st Contributor Name" -v -e="random text"
snarkjs zkey export verificationkey build/verifyPlacement_final.zkey build/verifyPlacement_verification_key.json

# generate solidity contract
snarkjs zkey export solidityverifier build/verifyPlacement_final.zkey ../contracts/verifyPlacement_verifier.sol