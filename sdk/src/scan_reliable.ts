
import { NoahProver } from './circuit/prover';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Known good constant
const p = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

function check(xHex: string, yHex: string, i: number) {
    try {
        const x = BigInt("0x" + xHex);
        const y = BigInt("0x" + yHex);

        if (x >= p || y >= p) return;

        const y2 = (y * y) % p;
        const x3_3 = (x * x * x + 3n) % p;

        if (y2 === x3_3) {
            console.log(`MATCH at offset ${i}: (${xHex}, ${yHex})`);
        }
    } catch (e) { }
}

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

    console.log("Reliable scan of first 64 felts...");
    for (let i = 0; i < 64; i++) {
        // Ensure full hex string
        const xHex = Buffer.from(proof.slice(i * 32, (i + 1) * 32)).toString('hex');
        const yHex = Buffer.from(proof.slice((i + 1) * 32, (i + 2) * 32)).toString('hex');
        check(xHex, yHex, i);
    }

    await prover.destroy();
}

main().catch(console.error);
