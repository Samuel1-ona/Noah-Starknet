
import { NoahProver } from './circuit/prover';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
    console.log("Verifying synthetic proof: Strip 24 felts, Prepend 8 copies of w1...");

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
    const proofRaw = result.proof;

    // 1. Identify w1 (at offset 24 felts = 768 bytes)
    const w1 = proofRaw.slice(24 * 32, 26 * 32); // 2 felts

    // 2. create synthetic pairing object (8 copies of w1 = 16 felts)
    const pairingObj = new Uint8Array(16 * 32);
    for (let i = 0; i < 8; i++) {
        pairingObj.set(w1, i * 64);
    }

    // 3. Strip 24 felts from original proof
    const body = proofRaw.slice(24 * 32);

    // 4. Concat: [PairingObj] [Body]
    const syntheticProof = new Uint8Array(pairingObj.length + body.length);
    syntheticProof.set(pairingObj, 0);
    syntheticProof.set(body, pairingObj.length);

    // Also we need to pad to 294 felts if short?
    // body length = 294 - 24 = 270.
    // pairing = 16.
    // total = 286.
    // need 8 more felts.
    // Pad with zeros (or valid points?)
    // The tail usually contains points too. shplonk_q ?
    // If I stripped 24, I removed PIs (8) + Unknown (16).
    // Original had 294.
    // 294 - 24 = 270.
    // + 16 = 286.
    // Gap is 8 felts.
    // Garaga expects 294.
    // Let's pad with 8 zeros at the end.

    const finalProof = new Uint8Array(294 * 32);
    finalProof.set(syntheticProof, 0);
    // last 8 felts are zeros.

    result.proof = finalProof;

    try {
        const calldata = await prover.getStarknetCalldata(result);
        console.log("SUCCESS! Calldata generated.");
    } catch (e: any) {
        console.error("Verification FAILED:", e.message || e);
    } finally {
        await prover.destroy();
    }
}

main().catch(console.error);
