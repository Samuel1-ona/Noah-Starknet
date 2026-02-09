import { NoahProver } from './circuit/prover';
import circuitArtifact from '../../app/src/assets/circuit.json';

async function main() {
    console.log("Starting check_size script...");
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

    const targets = [
        'evm',
        'evm-no-zk',
        'starknet',
        'starknet-no-zk',
        'noir-recursive',
        'noir-recursive-no-zk',
        'noir-rollup',
        'noir-rollup-no-zk'
    ];

    for (const target of targets) {
        console.log(`\n--- Testing target: ${target} ---`);
        try {
            const result = await prover.generateProof(inputs as any, { verifierTarget: target } as any);
            console.log(`[${target}] Success!`);
            console.log(`[${target}] Proof size: ${result.proof.length} bytes (${result.proof.length / 32} fields)`);
        } catch (e: any) {
            console.error(`[${target}] Failed: ${e.message}`);
        }
    }

    await prover.destroy();
}

main().catch(console.error);
