
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';
import * as fs from 'fs';

async function main() {
    const artifactPath = '../circuit/target/circuit.json';
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const bb = await Barretenberg.new();
    const backend = new UltraHonkBackend(artifact.bytecode, bb);

    const witnessPath = '../circuit/target/circuit.gz';
    const witness = fs.readFileSync(witnessPath);

    const configs = [
        { verifierTarget: 'evm' as any },
        { verifierTarget: 'evm-no-zk' as any }
    ];

    for (const config of configs) {
        console.log(`\nTesting config: ${JSON.stringify(config)}`);
        try {
            const proof = await backend.generateProof(witness, config);
            console.log(`Proof length (felts): ${proof.proof.length / 32}`);
            console.log('First 32 felts of proof:');
            for (let i = 0; i < 32; i++) {
                const felt = Buffer.from(proof.proof.slice(i * 32, (i + 1) * 32)).toString('hex').slice(-16);
                process.stdout.write(`${felt} `);
                if ((i + 1) % 4 === 0) process.stdout.write('\n');
            }
        } catch (e: any) {
            console.error(`Failed:`, e.message);
        }
    }

    await bb.destroy();
}

main().catch(console.error);
