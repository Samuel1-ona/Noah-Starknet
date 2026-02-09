
import { getZKHonkCallData, init as initGaraga } from 'garaga';

async function main() {
    await initGaraga();

    const proof = new Uint8Array(294 * 32).fill(0);
    // Use a huge PI array so it doesn't fail on "mismatch" immediately but gives us the "vk X" message
    const pi = new Uint8Array(256 * 32).fill(0);

    const v = new Uint8Array(1888);
    for (let i = 0; i < 1888; i++) {
        v[i] = i % 256;
    }

    try {
        console.log("Calling with fingerprint VK and large PI array...");
        getZKHonkCallData(proof, pi, v);
    } catch (e: any) {
        // We expect "Public inputs length mismatch: proof 256, vk X"
        console.log(`Error output: ${e.message || e}`);
    }
}

main().catch(console.error);
