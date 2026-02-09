
import { UltraHonkBackend, Barretenberg } from '@aztec/bb.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        console.log('Starting reproduction script...');

        const circuitPath = path.resolve(__dirname, './assets/circuit.json');
        console.log(`Loading circuit from ${circuitPath}`);
        const circuit = JSON.parse(fs.readFileSync(circuitPath, 'utf-8'));

        console.log('Initializing Backend...');
        const backend = new UltraHonkBackend(circuit.bytecode);
        console.log('Backend initialized. Backend manages its own API instance.');

        console.log('Generating empty witness (mock)...');
        const rawWitness = new Uint8Array(1000).fill(0);
        const dummyWitness = gzipSync(rawWitness);

        const targets = [
            'starknet',
            'starknet-no-zk',
            'evm',
            'noir-recursive'
        ];

        for (const target of targets) {
            console.log(`\nCalling generateProof with { verifierTarget: "${target}" }...`);
            try {
                await backend.generateProof(dummyWitness, { verifierTarget: target } as any);
                console.log(`SUCCESS: ${target} worked!`);
            } catch (e: any) {
                console.log(`FAILED: ${target}`);
                console.log('Error:', e.message);
            }
        }

        console.log('\nCalling generateProof with no options...');
        try {
            await backend.generateProof(dummyWitness, {});
            console.log('SUCCESS: No options worked!');
        } catch (e: any) {
            console.log('FAILED: No options');
            console.log('Error:', e.message);
        }

        // In this version, backend manages API. We can call destroy on backend if available, or just exit.
        if (backend.destroy) await backend.destroy();


    } catch (error) {
        console.error('Fatal error:', error);
    }
}

main();
