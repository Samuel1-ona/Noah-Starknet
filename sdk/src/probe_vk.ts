
import { getZKHonkCallData, init as initGaraga } from 'garaga';

async function main() {
    await initGaraga();

    const proof = new Uint8Array(294 * 32).fill(0);
    const pi = new Uint8Array(24 * 32).fill(0);

    async function testOffset(offset: number) {
        process.stdout.write(`Testing u32 at offset ${offset} ... `);
        const v = new Uint8Array(1888).fill(0);
        const dvV = new DataView(v.buffer);

        // Always set logN at 31
        v[31] = 17;

        // Set VK size at offset
        dvV.setUint32(offset, 24, false);

        try {
            getZKHonkCallData(proof, pi, v);
            console.log("SUCCESS");
        } catch (e: any) {
            console.log(`FAILED: ${e.message || e}`);
        }
    }

    // Try standard offsets
    await testOffset(8);
    await testOffset(12);
    await testOffset(16);
    await testOffset(20);
    await testOffset(24);
    await testOffset(28);
    await testOffset(32);
    await testOffset(60); // (64-4)
}

main().catch(console.error);
