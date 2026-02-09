
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const artifactPath = '../circuit/target/circuit.json';
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bb = await Barretenberg.new();
    const backend = new UltraHonkBackend(artifact.bytecode, bb);

    const witnessPath = '../circuit/target/circuit.gz';
    const witness = fs.readFileSync(witnessPath);

    console.log('Generating SDK EVM proof...');
    const sdkProofData = await backend.generateProof(witness, { verifierTarget: 'evm' });
    const sdkProof = sdkProofData.proof;

    const goodPath = '../circuit/target/proof_test/proof';
    const goodProof = fs.readFileSync(goodPath);

    console.log(`SDK Length: ${sdkProof.length / 32} felts`);
    console.log(`Good Length: ${goodProof.length / 32} felts`);

    let matched = true;
    for (let i = 0; i < Math.min(sdkProof.length, goodProof.length); i++) {
        if (sdkProof[i] !== goodProof[i]) {
            console.log(`Divergence found at byte ${i} (felt ${Math.floor(i / 32)})`);
            console.log(`SDK (hex):  ${sdkProof.slice(Math.floor(i / 32) * 32, (Math.floor(i / 32) + 1) * 32).toString('hex').slice(-16)}`);
            console.log(`Good (hex): ${goodProof.slice(Math.floor(i / 32) * 32, (Math.floor(i / 32) + 1) * 32).toString('hex').slice(-16)}`);
            matched = false;
            break;
        }
    }
    if (matched) console.log('Proofs are identical!');

    // Try prepending public inputs
    const piBytes = Buffer.alloc(sdkProofData.publicInputs.length * 32);
    sdkProofData.publicInputs.forEach((pi, i) => {
        const hex = pi.replace('0x', '').padStart(64, '0');
        piBytes.set(Buffer.from(hex, 'hex'), i * 32);
    });

    const combined = Buffer.concat([piBytes, sdkProof]);
    console.log(`Combined (PI + SDK) Length: ${combined.length / 32} felts`);

    if (combined.length === goodProof.length) {
        let matchCount = 0;
        for (let i = 0; i < combined.length / 32; i++) {
            if (combined.slice(i * 32, (i + 1) * 32).equals(goodProof.slice(i * 32, (i + 1) * 32))) {
                matchCount++;
            }
        }
        console.log(`Combined proof matches Good proof at ${matchCount} / ${combined.length / 32} positions`);
    }

    await bb.destroy();
}

main().catch(console.error);
