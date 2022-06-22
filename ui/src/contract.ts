import { ethers } from "ethers";
import address from './artifacts/address.json';
import { generateCalldata } from './circuit_js/generate_calldata';
import zkFischer from './artifacts/zkFischer.json';

let gameContract: ethers.Contract;

export async function connectContract() {
    const { ethereum } = window;

    let provider = new ethers.providers.Web3Provider(ethereum);
    let signer = provider.getSigner();
    console.log('signer: ', await signer.getAddress());

    gameContract = new ethers.Contract(address['zkFischer'], zkFischer.abi, signer);
    console.log("Connect to Game Contract:", zkFischer);
}

export async function register() {
    await connectContract();
    
    try {
        await gameContract.register();
        return "Registration successful.";
    } catch(error) {
        throw JSON.stringify(error);
    }
}

export async function submitSetup(input: any) {
    await connectContract();
    input = JSON.parse(input);
    let calldata = await generateCalldata(input, 'verifyPlacement_final.zkey', 'verifyPlacement.wasm');

    if (calldata) {
        try {
            let valid = await gameContract.setupBoard(calldata[0], calldata[1], calldata[2], calldata[3]);
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

export async function submitMove(input: any) {
    await connectContract();
    input = JSON.parse(input);
    let calldata = await generateCalldata(input, 'verifyMove_final.zkey', 'verifyMove.wasm');

    if (calldata) {
        try {
            let valid = await gameContract.move(input["moveCmd"], calldata[0], calldata[1], calldata[2], calldata[3]);
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