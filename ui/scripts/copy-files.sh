cp ../hardhat/circuits/build/verifyPlacement_final.zkey public/
cp ../hardhat/circuits/build/verifyMove_final.zkey public/

cp ../hardhat/circuits/build/verifyPlacement_js/verifyPlacement.wasm public/
cp ../hardhat/circuits/build/verifyMove_js/verifyMove.wasm public/

cp ../hardhat/artifacts/contracts/verifyPlacement_verifier.sol/VerifyPlacementVerifier.json src/artifacts/
cp ../hardhat/artifacts/contracts/verifyMove_verifier.sol/VerifyMoveVerifier.json src/artifacts/
cp ../hardhat/artifacts/contracts/zkFischer.sol/zkFischer.json src/artifacts/