
import { NoahProver } from './circuit/prover';
import { CompiledCircuit } from '@noir-lang/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock inputs that match the circuit's expectations
const mockInputs = {
    mrz: Array(88).fill(0),
    pub_key_x: Array(32).fill(0),
    pub_key_y: Array(32).fill(0),
    signature: Array(64).fill(0),
    hashed_mrz: Array(32).fill(0),
    jurisdiction_root: "0",
    jurisdiction_index: "0",
    jurisdiction_hash_path: Array(2).fill("0"),
    membership_root: "0",
    membership_index: "0",
    membership_hash_path: Array(2).fill("0"),
    action_id: "0",
    nullifier: "0",
    user_secret: "12345",
    current_year: "2024",
    current_month: "10",
    current_day: "10",
    min_age: "18"
};

async function main() {
    console.log("Starting reproduction script...");

    try {
        const __dirname = path.dirname(new URL(import.meta.url).pathname);
        const circuitPath = path.resolve(__dirname, '../../app/src/assets/circuit.json');
        if (!fs.existsSync(circuitPath)) {
            console.error(`Circuit file not found at ${circuitPath}`);
            process.exit(1);
        }
        const circuitArtifact: CompiledCircuit = JSON.parse(fs.readFileSync(circuitPath, 'utf8'));

        // Use disk VK to match expected working state
        const vkPath = path.resolve(__dirname, '../../app/src/assets/vk.bin');
        let vk: Uint8Array | undefined;
        if (fs.existsSync(vkPath)) {
            vk = new Uint8Array(fs.readFileSync(vkPath));
            console.log(`Loaded VK from ${vkPath} (length: ${vk.length})`);
        } else {
            console.log("VK not found, will generate (slow)...");
        }

        // Initialize Prover
        console.log("Initializing NoahProver...");
        const prover = await NoahProver.new(circuitArtifact, vk);

        const optionsToTest = [
            // { name: "default", options: {} },
            { name: "keccakZK: true", options: { keccakZK: true } },
            // { name: "keccak: true", options: { keccak: true } },
            // { name: "starknetZK: true", options: { starknetZK: true } },
            // { name: "starknet: true", options: { starknet: true } },
        ];

        console.log("\nStarting Option Loop Tests...");
        for (const testCase of optionsToTest) {
            console.log(`\nTesting options: ${testCase.name}`);
            try {
                const proof = await prover.generateProof(mockInputs, testCase.options);
                console.log(`Proof generated. Length: ${proof.proof.length}`);

                // Verify with Garaga (this triggers getZKHonkCallData)
                console.log("Verifying with Garaga...");
                const calldata = await prover.getStarknetCalldata(proof);
                console.log("SUCCESS: Garaga calldata generated.");
            } catch (e: any) {
                console.log(`FAILED with error:`, e);
                if (e?.message && e.message.includes("Invalid proving options")) {
                    console.log("-> Confirmed Invalid Options");
                }
            }
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

main();
