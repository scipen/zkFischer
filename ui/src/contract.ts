import { ethers } from "ethers";
import address from './artifacts/address.json';
import VerifyPlacementVerifier from './artifacts/VerifyPlacementVerifier.json';
import { generateCalldata } from './circuit_js/generate_calldata';

import zkFischer from './artifacts/zkFischer.json';

let verifier: ethers.Contract;
let gameContract: ethers.Contract;

export async function connectContract() {
    const { ethereum } = window;

    let provider = new ethers.providers.Web3Provider(ethereum);
    let signer = provider.getSigner();
    console.log('signer: ', await signer.getAddress());

    verifier = new ethers.Contract(address['VerifyPlacementVerifier'], VerifyPlacementVerifier.abi, signer);
    console.log("Connect to Verifier Contract:", VerifyPlacementVerifier);

    gameContract = new ethers.Contract(address['zkFischer'], zkFischer.abi, signer);
    console.log("Connect to Game Contract:", VerifyPlacementVerifier);
}

export async function register() {
    await connectContract();
    
    try {
        return await gameContract.register();
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export async function submitSetup(input: string) {
    await connectContract();

    console.log(input);
    input = JSON.parse(input);

    let calldata = await generateCalldata(input, 'verifyPlacement_final.zkey', 'verifyPlacement.wasm');
    console.log(calldata);

    if (calldata) {
        try {
            let valid = await gameContract.setupBoard("16362932092467779236188667745398721008062465179344094948620141050502887252044", calldata[0], calldata[1], calldata[2], calldata[3]);
            if (valid) {
                return calldata[3];
            }
            else {
                throw "Invalid proof.";
            }
        } catch(error) {
            throw JSON.stringify(error);
        }
    }
    else {
        throw "Witness generation failed.";
    }
}

export async function submitMove(input: string) {
    await connectContract();

    console.log(input);
    input = JSON.parse(input);

    let calldata = await generateCalldata(input, 'verifyMove_final.zkey', 'verifyMove.wasm');
    console.log(calldata);

    if (calldata) {
        try {
            let valid = await gameContract.move("16362932092467779236188667745398721008062465179344094948620141050502887252044", calldata[0], calldata[1], calldata[2], calldata[3]);
            if (valid) {
                return calldata[3];
            }
            else {
                throw "Invalid proof.";
            }
        } catch(error) {
            throw JSON.stringify(error);
        }
    }
    else {
        throw "Witness generation failed.";
    }
}

export async function verifyProof(input: string) {

    console.log(input);
    input = JSON.parse(input);
    console.log(input);

    await connectContract();

    let calldata = await generateCalldata(input);
    console.log(calldata);

    if (calldata) {
        let valid = await verifier.verifyProof(calldata[0], calldata[1], calldata[2], calldata[3]);
        if (valid) {
            return calldata[3];
        }
        else {
            throw "Invalid proof.";
        }
    }
    else {
        throw "Witness generation failed.";
    }
}