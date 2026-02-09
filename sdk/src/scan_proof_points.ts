
import { NoahProver } from './circuit/prover';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const p = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

function checkPoint(xHex: string, yHex: string, label: string) {
    const x = BigInt("0x" + xHex);
    const y = BigInt("0x" + yHex);
    // basic field check
    if (x >= p || y >= p) return false;

    const lhs = (y * y) % p;
    const rhs = (x * x * x + 3n) % p;
    if (lhs === rhs) {
        console.log(`${label}: ON CURVE`);
        return true;
    }
    return false;
}

async function main() {
    console.log("Generating proof...");
    const circuitPath = resolve(process.cwd(), '../circuit/target/circuit.json');
    const circuit = JSON.parse(readFileSync(circuitPath, 'utf-8'));
    const prover = await NoahProver.new(circuit);

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

    const result = await prover.generateProof(inputs, { verifierTarget: 'evm' });
    const proof = result.proof;

    console.log("Scanning first 64 felts for valid points...");
    // Scan every felt pair
    for (let i = 0; i < 64; i++) {
        const xHex = Buffer.from(proof.slice(i * 32, (i + 1) * 32)).toString('hex');
        const yHex = Buffer.from(proof.slice((i + 1) * 32, (i + 2) * 32)).toString('hex');

        const valid = checkPoint(xHex, yHex, `Felt ${i}`);
        if (valid) {
            console.log(`Potential w1 found at offset ${i}: (${xHex}, ${yHex})`);
        }
    }

    await prover.destroy();
}

main().catch(console.error);
