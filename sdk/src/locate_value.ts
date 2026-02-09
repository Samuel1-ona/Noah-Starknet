
import { NoahProver } from './circuit/prover';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
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
    const proof = Buffer.from(result.proof);

    // Pattern to searching for: 19a5390a7e4854e76aa8bfe5be9f336f77dc7bcd6b03c7c5c71fa5eebba39b9
    const pattern = "19a5390a7e4854e76aa8bfe5be9f336f77dc7bcd6b03c7c5c71fa5eebba39b9";

    console.log("Searching for pattern...");
    const hex = proof.toString('hex');
    const index = hex.indexOf(pattern);

    if (index !== -1) {
        // index is in hex chars (2 chars per byte)
        const byteOffset = index / 2;
        const feltOffset = byteOffset / 32;
        console.log(`FOUND at byte offset ${byteOffset}, felt offset ${feltOffset}`);
    } else {
        console.log("Not found in original proof");
        // Maybe it was in the SHIFTED proof?
        // Shifted proof stripped first 256 bytes.
        // So offset - 256?
    }

    await prover.destroy();
}

main().catch(console.error);
