const fs = require("fs");
const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/
const verifierRegex = /contract Verifier/

let content1 = fs.readFileSync("./contracts/verifyMove_verifier.sol", { encoding: 'utf-8' });
let bumped1 = content1.replace(solidityRegex, 'pragma solidity ^0.8.4');
bumped1 = bumped1.replace(verifierRegex, 'contract VerifyMoveVerifier');

fs.writeFileSync("./contracts/verifyMove_verifier.sol", bumped1);


let content2 = fs.readFileSync("./contracts/verifyPlacement_verifier.sol", { encoding: 'utf-8' });
let bumped2 = content2.replace(solidityRegex, 'pragma solidity ^0.8.4');
bumped2 = bumped2.replace(verifierRegex, 'contract VerifyPlacementVerifier');

fs.writeFileSync("./contracts/verifyPlacement_verifier.sol", bumped2);