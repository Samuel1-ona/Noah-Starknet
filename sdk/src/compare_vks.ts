
import fs from 'fs';
import path from 'path';
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';

async function main() {
    const api = await Barretenberg.new();
    const circuitPath = path.resolve('../circuit/target/circuit.json');
    const circuit = JSON.parse(fs.readFileSync(circuitPath, 'utf8'));
    const backend = new UltraHonkBackend(circuit.bytecode, api);

    console.log('Generating SDK VK...');
    const sdkVk = await backend.getVerificationKey();
    console.log(`SDK VK Length: ${sdkVk.length}`);

    const targetVkPath = path.resolve('../circuit/target/vk');
    const targetVk = fs.readFileSync(targetVkPath);
    console.log(`Target VK Length: ${targetVk.length}`);

    // The first 28 points in targetVk start at byte 96
    const targetPoints = targetVk.slice(96);
    console.log(`Target Points Length: ${targetPoints.length}`);

    const targetHex = Buffer.from(targetPoints).toString('hex');
    const sdkHex = Buffer.from(sdkVk).toString('hex');

    const index = sdkHex.indexOf(targetHex.slice(0, 128)); // Match the first 2 points
    if (index !== -1) {
        console.log(`FOUND Points in SDK VK at hex index ${index} (byte index ${index / 2})`);

        // Let's see if the whole 1792 bytes match
        const byteIndex = index / 2;
        const sdkPoints = sdkVk.slice(byteIndex, byteIndex + targetPoints.length);
        const matches = Buffer.compare(sdkPoints, targetPoints) === 0;
        console.log(`Full Points Match? ${matches}`);
    } else {
        console.log("Points NOT found as contiguous block in SDK VK.");

        // Try searching for individual points
        const firstPointHex = targetHex.slice(0, 128);
        const secondPointHex = targetHex.slice(128, 256);

        console.log(`First Point:  ${firstPointHex.slice(0, 16)}...`);
        console.log(`Second Point: ${secondPointHex.slice(0, 16)}...`);

        const firstIdx = sdkHex.indexOf(firstPointHex);
        const secondIdx = sdkHex.indexOf(secondPointHex);

        console.log(`First point at: ${firstIdx === -1 ? 'NOT FOUND' : firstIdx / 2}`);
        console.log(`Second point at: ${secondIdx === -1 ? 'NOT FOUND' : secondIdx / 2}`);

        if (firstIdx !== -1 && secondIdx !== -1) {
            console.log(`Stride: ${(secondIdx - firstIdx) / 2} bytes`);
        }
    }

    await api.destroy();
}

main().catch(console.error);
