
import { UltraHonkBackend, Barretenberg } from '@aztec/bb.js';
import fs from 'fs';
import path from 'path';

async function main() {
    const api = await Barretenberg.new({ threads: 1 });
    const circuitPath = path.resolve('../circuit/target/circuit.json');
    const circuit = JSON.parse(fs.readFileSync(circuitPath, 'utf8'));
    const backend = new UltraHonkBackend(circuit.bytecode, api);
    const vk = await backend.getVerificationKey();

    const failureX = "13a9ac972b283ad2ba6c2baf9471524c2a6ff774e598f739d6ae821af8660e79";
    const failureY = "2e64835d835c8ab4825f6566f0cd14cd85094f2c969769aebe643588a4cf270a";

    console.log(`Searching for X: ${failureX}`);

    let found = false;
    for (let i = 0; i < vk.length - 32; i++) {
        const chunk = vk.slice(i, i + 32);
        const hex = Buffer.from(chunk).toString('hex');
        if (hex === failureX) {
            console.log(`FOUND failure X at offset ${i}!`);
            found = true;
        }
        if (hex === failureY) {
            console.log(`FOUND failure Y at offset ${i}!`);
            found = true;
        }
    }

    if (!found) {
        console.log("Failure point NOT found in raw binary VK. Searching in 1888-byte adapted VK...");
        // Re-construct the logic from prover.ts
        const newVk = new Uint8Array(1888);
        newVk.set(vk.slice(32), 160);

        for (let i = 0; i < newVk.length - 32; i++) {
            const chunk = newVk.slice(i, i + 32);
            const hex = Buffer.from(chunk).toString('hex');
            if (hex === failureX) {
                console.log(`FOUND failure X in ADAPTED VK at offset ${i}!`);
                found = true;
            }
        }
    }

    await api.destroy();
}

main().catch(console.error);
