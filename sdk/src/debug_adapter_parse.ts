
import { NoahProver } from './circuit/prover';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parseVk, parseProof } from './circuit/garaga_adapter';
import { flattenFieldsAsArray } from './utils/conversions';

async function main() {
    console.log("Analyzing proof with garaga_adapter parser...");

    const circuitPath = resolve(process.cwd(), '../circuit/target/circuit.json');
    const circuit = JSON.parse(readFileSync(circuitPath, 'utf-8'));
    const prover = await NoahProver.new(circuit);

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

    const result = await prover.generateProof(inputs, { verifierTarget: 'evm' });
    const vkBytes = await (prover as any).backend.getVerificationKey({ verifierTarget: 'evm' });

    // We need to use the sanitized and adapted VK that we would pass to Garaga
    // but first let's see if the raw VK is even parsable by parseVk
    console.log("Parsing VK...");
    const vk = parseVk(vkBytes);

    console.log("Parsing proof...");
    try {
        // We know bb.js proof has PIs at head. Let's see if parseProof fails on w1, etc.
        const zkhonkProof = parseProof(result.proof, flattenFieldsAsArray(result.publicInputs).map(pi => BigInt(pi)) as any, vk);
        console.log("SUCCESS! Proof parsed by garaga_adapter.");
    } catch (e: any) {
        console.error("FAILED to parse proof:", e.message || e);
    }

    await prover.destroy();
}

main().catch(console.error);
