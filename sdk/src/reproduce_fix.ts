
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';
import * as fs from 'fs';

async function main() {
    const artifactPath = '../circuit/target/circuit.json';
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bb = await Barretenberg.new();
    const backend = new UltraHonkBackend(artifact.bytecode, bb);

    const witnessPath = '../circuit/target/circuit.gz';
    const witness = fs.readFileSync(witnessPath);

    console.log('Generating proof with verifierTarget: evm...');
    const { proof } = await backend.generateProof(witness, { verifierTarget: 'evm' });

    console.log(`Proof length: ${proof.length / 32} felts`);
    const p = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n;

    console.log('Scanning for valid G1 points in proof...');
    for (let i = 0; i < proof.length / 32 - 1; i++) {
        const x = BigInt('0x' + Buffer.from(proof.slice(i * 32, (i + 1) * 32)).toString('hex')) % p;
        const y = BigInt('0x' + Buffer.from(proof.slice((i + 1) * 32, (i + 2) * 32)).toString('hex')) % p;
        const left = (y * y) % p;
        const right = (x * x * x + 3n) % p;
        if (left === right) {
            console.log(`Valid G1 point at felt ${i}, ${i + 1}`);
        }
    }

    console.log('\nLoading GOOD proof and scanning...');
    const goodProof = fs.readFileSync('../circuit/target/proof_test/proof');
    for (let i = 0; i < goodProof.length / 32 - 1; i++) {
        const x = BigInt('0x' + Buffer.from(goodProof.slice(i * 32, (i + 1) * 32)).toString('hex')) % p;
        const y = BigInt('0x' + Buffer.from(goodProof.slice((i + 1) * 32, (i + 2) * 32)).toString('hex')) % p;
        const left = (y * y) % p;
        const right = (x * x * x + 3n) % p;
        if (left === right) {
            console.log(`GOOD proof: Valid G1 point at felt ${i}, ${i + 1}`);
        }
    }

    await bb.destroy();
}

main().catch(console.error);
