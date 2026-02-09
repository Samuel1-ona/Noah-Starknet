import { splitHonkProof } from '@aztec/bb.js';
import fs from 'fs';

async function main() {
    const proofBytes = fs.readFileSync('../circuit/target/proof');
    console.log(`Proof size: ${proofBytes.length} bytes`);

    try {
        const split = splitHonkProof(new Uint8Array(proofBytes), 0);
        console.log("Proof split successfully.");
        console.log("Public Inputs length:", split.publicInputs.length);
        console.log("Proof without public inputs length:", split.proof.length);

        // Log first few felts of split proof
        const proofFelts = split.proof.length / 32;
        console.log(`Proof felts: ${proofFelts}`);
    } catch (e) {
        console.error("Failed to split proof:", e);
    }
}

main().catch(console.error);
