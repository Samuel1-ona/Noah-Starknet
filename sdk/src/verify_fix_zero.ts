
import { NoahProver } from './circuit/prover';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
    console.log("Verifying fix: Zeroing first 16 felts...");

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

    // Manual fix application simulation
    const fixedProof = new Uint8Array(result.proof);
    // Zero out first 16 felts (16 * 32 = 512 bytes)
    fixedProof.fill(0, 0, 512);

    console.log("Calling getStarknetCalldata with fixed proof...");

    // We need to inject this fixed proof into the flow.
    // Since getStarknetCalldata takes the result object, we can modify it.
    result.proof = fixedProof;

    try {
        const calldata = await prover.getStarknetCalldata(result);
        console.log("SUCCESS! Calldata generated. Length:", calldata.length);
        console.log("First 5 elements:", calldata.slice(0, 5));
    } catch (e: any) {
        console.error("Verification FAILED:", e.message || e);
    } finally {
        await prover.destroy();
    }
}

main().catch(console.error);
