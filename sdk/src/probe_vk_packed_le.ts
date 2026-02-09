
import { getZKHonkCallData, init as initGaraga } from 'garaga';

async function main() {
    await initGaraga();

    const proof = new Uint8Array(294 * 32).fill(0);
    const pi = new Uint8Array(24 * 32).fill(0);

    async function testPackedLE(circuitSize: number, logN: number, piSize: number, piOffset: number) {
        console.log(`\nTesting packed LE: CS=${circuitSize}, logN=${logN}, PIS=${piSize}, PIO=${piOffset}`);
        const v = new Uint8Array(1888).fill(0);
        const dvV = new DataView(v.buffer);

        dvV.setUint32(0, circuitSize, true);
        dvV.setUint32(4, logN, true);
        dvV.setUint32(8, piSize, true);
        dvV.setUint32(12, piOffset, true);

        try {
            getZKHonkCallData(proof, pi, v);
            console.log("SUCCESS (Header parsed)");
        } catch (e: any) {
            console.log(`FAILED: ${e.message || e}`);
        }
    }

    await testPackedLE(1 << 17, 17, 24, 1);
    await testPackedLE(1 << 17, 17, 8, 1);
}

main().catch(console.error);
