
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
    const proof = result.proof;
    const totalFelts = proof.length / 32;

    console.log("Tail felts of the proof:");
    for (let i = totalFelts - 32; i < totalFelts; i++) {
        const felt = Buffer.from(proof.slice(i * 32, (i + 1) * 32)).toString('hex');
        console.log(`Felt ${i}: ${felt}`);
    }

    await prover.destroy();
}

main().catch(console.error);
