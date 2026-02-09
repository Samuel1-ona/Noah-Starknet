
import { UltraHonkBackend, Barretenberg } from '@aztec/bb.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const api = await Barretenberg.new({ threads: 1 });
    const circuitPath = path.resolve('../circuit/target/circuit.json');
    const circuit = JSON.parse(fs.readFileSync(circuitPath, 'utf8'));
    const backend = new UltraHonkBackend(circuit.bytecode, api);
    const vk = await backend.getVerificationKey();

    console.log("Raw VK Length:", vk.length);
    console.log("First 128 bytes (hex):");
    console.log(Buffer.from(vk.slice(0, 128)).toString('hex').match(/.{1,64}/g)?.join('\n'));

    // Look for '08' in the first 128 bytes
    for (let i = 0; i < 128; i++) {
        if (vk[i] === 8) {
            console.log(`Found Byte 8 at offset ${i}`);
        }
    }

    await api.destroy();
}

main().catch(console.error);
