
import { NoahProver } from './circuit/prover';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseVk, parseProof, getUltraHonkCalldata } from './circuit/garaga_adapter';
import { flattenFieldsAsArray } from './utils/conversions';

async function main() {
    console.log("Debugging with TS Adapter...");

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

    // Generate proof without options (Native)
    console.log("Generating Native Proof (no EVM target)...");
    const result = await prover.generateProof(inputs);

    // Preparation for Adapter
    // Adapter expects VK in Sparse BE layout (matches current NoahProver logic, but let's verify)
    // Actually NoahProver logic generates newVk.
    // Let's use the newVk directly from prover method? 
    // prover.adaptVkForGaraga is protected? No, checking prover.ts ... it is public inside?
    // It's not exported.
    // I can modify Prover to return it or just reimplement.

    // Let's assume NoahProver implementation (sparse BE) is correct for adapter.
    // NoahProver.adaptVkForGaraga logic:
    // logN at 31.
    // size at 63.
    // offset at 95.
    // points at 96.

    // Let's manually construct it to be sure.
    // Garaga ADAPTER expects Packed BE (offsets 0, 4, 8).
    const newVk = new Uint8Array(1888);
    const dv = new DataView(newVk.buffer);
    const logN = 17;
    dv.setUint32(0, 1 << logN, false); // circuit size
    dv.setUint32(4, logN, false);
    dv.setUint32(8, 24, false); // size 24
    dv.setUint32(12, 1, false);  // offset 1

    // Copy points at 16
    newVk.set(vkBytes.slice(96, 96 + 1728), 16);

    // Lagrange Last
    const lagrangeLastX = "01c40845a5f094353fad820b933fe0f25a180b90b64f3785a501ac790f9a62e5";
    const lagrangeLastY = "1e8f4ac92a40a5216c1d586f1d6006b8b246f322996dace5cea687b65f8e1d23";
    const ll = new Uint8Array(64);
    for (let i = 0; i < 32; i++) {
        ll[i] = parseInt(lagrangeLastX.slice(i * 2, i * 2 + 2), 16);
        ll[i + 32] = parseInt(lagrangeLastY.slice(i * 2, i * 2 + 2), 16);
    }
    newVk.set(ll, 1744); // 16 + 1728

    // Parse VK
    console.log("Parsing VK...");
    const parsedVk = parseVk(newVk);
    console.log("VK Parsed:", parsedVk.log_circuit_size, parsedVk.public_inputs_size);

    // Prepare Proof
    // Strip 8 PIs (256 bytes)
    const proofWithoutPIs = result.proof.slice(256);

    // Check Pairing Object values (first 16 x 32 bytes)
    const p = 21888242871839275222246405745257275088548364400416034343698204186575808495617n; // BN254Scalar
    console.log("Checking Pairing Object values...");
    for (let i = 0; i < 16; i++) {
        const chunk = proofWithoutPIs.slice(i * 32, (i + 1) * 32);
        let val = 0n;
        for (let j = 0; j < 32; j++) val = (val << 8n) | BigInt(chunk[j]);
        console.log(`Val ${i}: ${val.toString(16)} (Valid < r? ${val < p})`);
    }

    // Prepare PIs (BigInt[])
    const pisBigInt = Array.from(result.publicInputs).map((x: any) => BigInt(x));

    console.log("Parsing Proof...");
    try {
        const parsedProof = parseProof(proofWithoutPIs, pisBigInt, parsedVk);
        console.log("Proof Parsed Successfully!");
        console.log("w1:", parsedProof.w1.x.toString(16), parsedProof.w1.y.toString(16));

        console.log("Generating Calldata...");
        const cd = getUltraHonkCalldata(parsedVk, parsedProof);
        console.log("Calldata generated. Length:", cd.length);

    } catch (e: any) {
        console.error("Adapter FAILED:", e);
    }

    await prover.destroy();
}

main().catch(console.error);
