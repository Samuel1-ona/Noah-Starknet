import { parseVk, parseProof, getUltraHonkCalldata } from './circuit/garaga_adapter.js';
import { init } from 'garaga';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("Testing Garaga Adapter...");
    await init();

    const circuitDir = '../circuit/target';
    const vkBytes = fs.readFileSync(path.join(circuitDir, 'vk'));
    const proofBytes = fs.readFileSync(path.join(circuitDir, 'proof_test/proof'));
    const publicInputsBytes = fs.readFileSync(path.join(circuitDir, 'proof_test/public_inputs'));

    console.log(`Proof size: ${proofBytes.length} bytes`);
    console.log(`VK size: ${vkBytes.length} bytes`);
    console.log(`Public Inputs size: ${publicInputsBytes.length} bytes`);

    const vk = parseVk(new Uint8Array(vkBytes));
    console.log(`Log circuit size: ${vk.log_circuit_size}`);

    try {
        const proof = parseProof(new Uint8Array(proofBytes), new Uint8Array(publicInputsBytes), vk);
        console.log("Proof parsed successfully.");

        const calldata = getUltraHonkCalldata(vk, proof);
        console.log("Calldata generated successfully!");
        console.log(`Calldata length: ${calldata.length}`);
        console.log("First 10 elements:", calldata.slice(0, 10).map(x => x.toString(16)));
    } catch (e) {
        console.error("Failed to generate calldata:", e);
    }
}

main().catch(console.error);
