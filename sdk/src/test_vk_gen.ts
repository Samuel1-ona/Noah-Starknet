
import { UltraHonkBackend, Barretenberg } from '@aztec/bb.js';
import { CompiledCircuit } from '@noir-lang/types';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log("Loading circuit artifact...");
    const circuitPath = path.resolve('../circuit/target/circuit.json');
    const circuit: CompiledCircuit = JSON.parse(fs.readFileSync(circuitPath, 'utf8'));

    console.log("Initializing Barretenberg...");
    const api = await Barretenberg.new({ threads: 1 });

    console.log("Creating Backend...");
    const backend = new UltraHonkBackend(circuit.bytecode, api);

    console.log("Generating VK...");
    const vk = await backend.getVerificationKey();
    console.log("VK Length:", vk.length);

    console.log("\n--- First 320 bytes (Hex dump) ---");
    for (let i = 0; i < 320; i += 32) {
        console.log(`${i.toString().padStart(3, ' ')}: ${Buffer.from(vk.slice(i, i + 32)).toString('hex')}`);
    }

    console.log("\n--- Interpreted as u32 BE ---");
    const u32view = new DataView(vk.buffer);
    for (let i = 0; i < 160; i += 4) {
        const val = u32view.getUint32(i, false);
        if (val !== 0) {
            console.log(`Offset ${i}: ${val} (0x${val.toString(16)})`);
        }
    }

    console.log("\n--- Interpreted as u64 BE ---");
    for (let i = 0; i < 160; i += 8) {
        try {
            const val = u32view.getBigUint64(i, false);
            if (val !== 0n) {
                console.log(`Offset ${i}: ${val} (0x${val.toString(16)})`);
            }
        } catch (e) { }
    }

    await api.destroy();
}

main().catch(console.error);
