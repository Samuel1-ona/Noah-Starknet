import { NoahProver } from './circuit/prover';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
    // Assuming run from sdk root
    const circuitPath = resolve(process.cwd(), '../circuit/target/circuit.json');
    const circuit = JSON.parse(readFileSync(circuitPath, 'utf-8'));

    const prover = await NoahProver.new(circuit);

    // Mock inputs
    // mrz: 88 bytes
    // pub_key_x: 32 bytes (first byte 0 to trigger test bypass)
    const inputs = {
        mrz: Array(88).fill(0),
        pub_key_x: Array(32).fill(0), // Trigger test bypass
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

    console.log("Generating proof (target: default/evm)...");
    try {
        // Try without explicit option, or 'evm' if default fails?
        // Let's try explicit 'evm' first as that corresponds to keccak.
        const result = await prover.generateProof(inputs, { verifierTarget: 'evm' });
        console.log("Proof generated!");
        console.log("Proof size (bytes):", result.proof.length);
        console.log("Public inputs:", result.publicInputs);

        if (result.proof.length > 10000) {
            console.error("FAIL: Proof size too large! Expected ~9024 bytes.");
        } else {
            console.log("SUCCESS: Proof size is within expected range.");
        }
    } catch (e) {
        console.error("Error generating proof:", e);
    } finally {
        await prover.destroy();
    }
}

main();
