import { NoahProver } from './circuit/prover';
import circuitArtifact from '../../app/src/assets/circuit.json';
import { getZKHonkCallData, init as initGaraga } from 'garaga';
import { flattenFieldsAsArray } from './utils/conversions';
import * as fs from 'fs';
import * as path from 'path';

function flipEndianness(bytes: Uint8Array): Uint8Array {
    const flipped = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 32) {
        for (let j = 0; j < 32; j++) {
            flipped[i + j] = bytes[i + 31 - j];
        }
    }
    return flipped;
}

async function main() {
    await initGaraga();

    const vkPath = path.join(process.cwd(), '../app/src/assets/vk.bin');
    const vk = new Uint8Array(fs.readFileSync(vkPath));
    console.log("Loaded VK from assets, size:", vk.length);

    const prover = await NoahProver.new(circuitArtifact as any);

    const inputs = {
        mrz: Array(88).fill(0),
        pub_key_x: Array(32).fill(0),
        pub_key_y: Array(32).fill(0),
        signature: Array(64).fill(0),
        hashed_mrz: Array(32).fill(0),
        jurisdiction_root: "0",
        jurisdiction_index: "0",
        jurisdiction_hash_path: ["0", "0"],
        membership_root: "0",
        membership_index: "0",
        membership_hash_path: ["0", "0"],
        action_id: "0",
        nullifier: "0",
        user_secret: "123",
        current_year: "2025",
        current_month: "1",
        current_day: "1",
        min_age: "18"
    };

    console.log("Generating proof with 'evm' target...");
    const result = await prover.generateProof(inputs as any, { verifierTarget: 'evm' } as any);

    const piBytes = flattenFieldsAsArray(result.publicInputs);

    const tests = [
        { name: "Original", p: result.proof, pi: piBytes, v: vk },
        { name: "Flipped Proof", p: flipEndianness(result.proof), pi: piBytes, v: vk },
        { name: "Flipped PI", p: result.proof, pi: flipEndianness(piBytes), v: vk },
        { name: "Flipped VK", p: result.proof, pi: piBytes, v: flipEndianness(vk) },
        { name: "All Flipped", p: flipEndianness(result.proof), pi: flipEndianness(piBytes), v: flipEndianness(vk) }
    ];

    for (const test of tests) {
        console.log(`\nTesting: ${test.name} (length: ${test.p.length})`);
        try {
            const calldata = getZKHonkCallData(test.p, test.pi, test.v);
            console.log("SUCCESS! Calldata length:", calldata.length);
        } catch (e: any) {
            console.log("FAILED:", JSON.stringify(e, Object.getOwnPropertyNames(e)));
        }
    }

    await prover.destroy();
}

main().catch(console.error);
