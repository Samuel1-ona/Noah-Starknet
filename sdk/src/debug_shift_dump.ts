
import { NoahProver } from './circuit/prover';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
    console.log("Generating and dumping shifted proof...");

    const circuitPath = resolve(process.cwd(), '../circuit/target/circuit.json');
    const circuit = JSON.parse(readFileSync(circuitPath, 'utf-8'));
    const vkPath = resolve(process.cwd(), '../app/src/assets/vk.bin');
    const vkBytes = new Uint8Array(readFileSync(vkPath));

    const prover = await NoahProver.new(circuit);
    prover.setVk(vkBytes);

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

    // Simulate the Logic in Prover (Shift 8, Pad 8)
    const piSize = result.publicInputs.length; // 8
    const proofRaw = result.proof;
    const proofWithoutPIs = proofRaw.slice(piSize * 32);
    const targetLen = 9408;
    const finalProof = new Uint8Array(targetLen);
    finalProof.set(proofWithoutPIs, 0);

    console.log("Searching for pattern in shifted proof...");
    const pattern = "19a5390a7e4854e76aa8bfe5be9f336f77dc7bcd6b03c7c5c71fa5eebba39b9";
    const xHex = "0x" + pattern;

    const hex = Buffer.from(finalProof).toString('hex');
    const index = hex.indexOf(pattern);

    if (index !== -1) {
        const byteOffset = index / 2;
        const feltOffset = byteOffset / 32;
        console.log(`FOUND at byte offset ${byteOffset}, felt offset ${feltOffset}`);

        // Let's identify what this point is.
        // Garaga layout:
        // 0-15: Pairing Object (16 felts)
        // 16-17: w1
        // 18-19: w2
        // 20-21: w3
        // 22-23: lookup_read_counts
        // 24-25: lookup_read_tags
        // 26-27: w4
        // 28-29: lookup_inverses
        // 30-31: z_perm
        // 32-33: libra_ch_comm0

        // If feltOffset is e.g. 32, then it's libra_ch_comm0.x

    } else {
        console.log("Not found in shifted proof either.");
    }

    // Also, let's dump the first 64 felts of the shifted proof to verify alignment
    console.log("Dump of shifted proof head (0-32 felts):");
    for (let i = 0; i < 32; i++) {
        const val = Buffer.from(finalProof.slice(i * 32, (i + 1) * 32)).toString('hex');
        console.log(`Felt ${i}: ${val}`);
    }

    await prover.destroy();
}

main().catch(console.error);
