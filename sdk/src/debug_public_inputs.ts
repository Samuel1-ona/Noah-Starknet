
// import { NoahProver, NoahProverInputs } from './circuit/prover';
// import { UltraHonkBackend } from '@aztec/bb.js';
// import circuitArtifact from '../../app/src/assets/circuit.json';
// import * as fs from 'fs';
// import * as path from 'path';
// import { getZKHonkCallData, init as initGaraga } from 'garaga';
// import { flattenFieldsAsArray } from './utils/conversions';

// async function main() {
//     console.log('Starting Public Input Debug...');

//     // Load VK from target (where bb just generated it)
//     const vkPath = path.join(process.cwd(), '../circuit/target/vk');
//     let vk = new Uint8Array(fs.readFileSync(vkPath));
//     console.log('Original VK Length:', vk.length);
//     console.log('Original VK Header (first 32 bytes):', Buffer.from(vk.slice(0, 32)).toString('hex'));

//     // Test with log_n = 16 to see if expected length changes
//     const testLogN = 16;

//     if (vk.length === 1760) {
//         console.log(`Expanding VK header to 1888 bytes (LogN=${testLogN})...`);
//         const newVk = new Uint8Array(1888);

//         // Field 0: log_n (forced to testLogN)
//         newVk[31] = testLogN;

//         // Field 1: size
//         const size = vk.slice(0, 8);
//         newVk.set(size, 64 - 8);

//         // Field 2: offset
//         const offset = vk.slice(24, 32);
//         newVk.set(offset, 96 - 8);

//         // Field 3: num_pub
//         const num_pub = vk.slice(16, 24);
//         newVk.set(num_pub, 128 - 8);

//         // Field 4: contains_recursive_proof (0)

//         // Copy the points
//         newVk.set(vk.slice(32), 160);
//         vk = newVk;
//     }

//     const prover = new NoahProver(circuitArtifact as any, vk);
//     // Manually override backend for testing different flavors if needed
//     (prover as any).backend = new UltraHonkBackend(circuitArtifact.bytecode as any, { threads: 1 }, { recursive: false });

//     // Mock inputs
//     const inputs: NoahProverInputs = {
//         mrz: new Array(88).fill(0),
//         pub_key_x: new Array(32).fill(0),
//         pub_key_y: new Array(32).fill(0),
//         signature: new Array(64).fill(0),
//         hashed_mrz: new Array(32).fill(0),
//         jurisdiction_root: "0x123",
//         jurisdiction_index: 0,
//         jurisdiction_hash_path: ["0x0", "0x0"],
//         membership_root: "0x456",
//         membership_index: 0,
//         membership_hash_path: ["0x0", "0x0"],
//         action_id: "0x789",
//         nullifier: "0xabc",
//         user_secret: "0xdef",
//         current_year: 2024,
//         current_month: 2,
//         current_day: 3,
//         min_age: 18
//     };

//     console.log('Generating Proof (recursive: false, starknet: true)...');
//     const proof = await prover.generateProof(inputs);

//     console.log('Generating CallData...');
//     try {
//         const calldata = await prover.getStarknetCalldata(proof);
//         console.log('Calldata Length:', calldata.length);
//     } catch (e: any) {
//         console.error('Error during calldata generation:', e);
//     }
// }

// main().catch(console.error);
