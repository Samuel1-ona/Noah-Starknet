
import { getZKHonkCallData, init as initGaraga } from 'garaga';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    await initGaraga();

    const vkPath = '../app/src/assets/vk.bin';
    const vk = new Uint8Array(fs.readFileSync(vkPath));
    console.log("Loaded VK from assets, size:", vk.length);

    async function test(proofFelts: number, piFelts: number) {
        process.stdout.write(`Testing: Proof=${proofFelts}, PI=${piFelts} ... `);
        const proof = new Uint8Array(proofFelts * 32).fill(0);
        const pi = new Uint8Array(piFelts * 32).fill(0);

        try {
            getZKHonkCallData(proof, pi, vk);
            console.log("SUCCESS");
        } catch (e: any) {
            console.log(`FAILED: ${e.message || e}`);
        }
    }

    await test(294, 8);
    await test(294, 24);
}

main().catch(console.error);
