
import { getZKHonkCallData, init as initGaraga } from 'garaga';

async function main() {
    await initGaraga();

    const proof = new Uint8Array(294 * 32).fill(0);
    const pi = new Uint8Array(24 * 32).fill(0);

    async function testOffsetLE(offset: number) {
        process.stdout.write(`Testing u32 LE at offset ${offset} ... `);
        const v = new Uint8Array(1888).fill(0);
        const dvV = new DataView(v.buffer);

        // logN at 31
        v[31] = 17;

        // Set VK size at offset, Little Endian
        dvV.setUint32(offset, 24, true);

        try {
            getZKHonkCallData(proof, pi, v);
            console.log("SUCCESS");
        } catch (e: any) {
            console.log(`FAILED: ${e.message || e}`);
        }
    }

    // Try standard offsets
    await testOffsetLE(8); // garaga_adapter suggests offset 8
    await testOffsetLE(12);
    await testOffsetLE(16);
    await testOffsetLE(20);
    await testOffsetLE(56); // Old value?
    await testOffsetLE(60);

}

main().catch(console.error);
