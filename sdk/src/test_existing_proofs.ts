import { getZKHonkCallData, init as initGaraga } from 'garaga';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    await initGaraga();

    const vkPath = path.join(process.cwd(), '../app/src/assets/vk.bin');
    const vk = new Uint8Array(fs.readFileSync(vkPath));
    console.log("Loaded VK from assets, size:", vk.length);

    const variantsDir = path.join(process.cwd(), '../circuit/target/proof_variants');
    const variants = fs.readdirSync(variantsDir);

    for (const variant of variants) {
        const variantPath = path.join(variantsDir, variant);
        if (!fs.statSync(variantPath).isDirectory()) continue;

        const proofPath = path.join(variantPath, 'proof');
        const piPath = path.join(variantPath, 'public_inputs');

        if (!fs.existsSync(proofPath) || !fs.existsSync(piPath)) continue;

        const proof = new Uint8Array(fs.readFileSync(proofPath));
        const pi = new Uint8Array(fs.readFileSync(piPath));

        console.log(`\n--- Testing variant: ${variant} ---`);
        console.log(`Proof size: ${proof.length} bytes (${proof.length / 32} fields)`);
        console.log(`PI size: ${pi.length} bytes (${pi.length / 32} fields)`);

        try {
            const calldata = getZKHonkCallData(proof, pi, vk);
            console.log(`[${variant}] SUCCESS! Calldata length: ${calldata.length}`);
        } catch (e: any) {
            console.error(`[${variant}] FAILED: ${e.message || JSON.stringify(e, Object.getOwnPropertyNames(e))}`);
        }
    }
}

main().catch(console.error);
