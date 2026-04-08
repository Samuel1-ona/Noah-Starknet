import { describe, it, expect, vi } from 'vitest';
import { NoahProver } from '../src/circuit/prover';
import { NoahRegistry } from '../src/contract/registry';
import { NoahContractManager } from '../src/contract/manager';
import { NoahProofOrchestrator } from '../src/orchestrator/proof';
import circuitArtifact from '../assets/circuit.json';
import { readFileSync } from 'node:fs';

describe('Noah SDK Initialization', () => {
    it('should initialize NoahProver', async () => {
        const prover = await NoahProver.new(circuitArtifact as any);
        expect(prover).toBeDefined();
    });

    it('should initialize NoahContractManager', () => {
        const config = {
            providerUrl: 'http://localhost:5050',
            registryAddress: '0x123',
        };
        const manager = new NoahContractManager(config);
        expect(manager).toBeDefined();
        expect(manager.registry).toBeDefined();
    });

    it('should initialize NoahProofOrchestrator', async () => {
        const config = {
            circuitArtifact: circuitArtifact as any,
            vk: new Uint8Array([1, 2, 3]),
            starknet: {
                providerUrl: 'http://localhost:5050',
                registryAddress: '0x123',
            }
        };
        const orchestrator = await NoahProofOrchestrator.new(config);
        expect(orchestrator).toBeDefined();
    });

    it('should initialize with network defaults (Sepolia)', () => {
        const manager = new NoahContractManager({ network: 'sepolia' });
        expect(manager).toBeDefined();
        expect(manager.provider).toBeDefined();
        expect(manager.registry).toBeDefined();
    });

    it('accepts quoted env vars for sponsored signer config', () => {
        const previousAdminAddress = process.env.ADMIN_CONTRACT_ADDRESS;
        const previousAdminKey = process.env.ADMIN_PRIVATE_KEY;

        process.env.ADMIN_CONTRACT_ADDRESS = '"0x123"';
        process.env.ADMIN_PRIVATE_KEY = '"0x456"';

        try {
            const manager = new NoahContractManager({
                providerUrl: 'http://localhost:5050',
                registryAddress: '0x123',
            });

            expect(manager.adminAccount).toBeDefined();
        } finally {
            process.env.ADMIN_CONTRACT_ADDRESS = previousAdminAddress;
            process.env.ADMIN_PRIVATE_KEY = previousAdminKey;
        }
    });

    it('compacts the shipped 3680-byte VK into Garaga layout', () => {
        const vk = new Uint8Array(readFileSync(new URL('../assets/vk.bin', import.meta.url)));
        const { vk: sanitizedVk, logN } = (NoahProver as any).sanitizeVk(vk);

        expect(logN).toBe(15);
        expect(sanitizedVk).toHaveLength(1888);
        expect(Buffer.from(sanitizedVk.slice(0, 96)).equals(Buffer.from(vk.slice(0, 96)))).toBe(true);
        expect(Buffer.from(sanitizedVk.slice(96, 128)).toString('hex')).toBe(
            '20c9b115530e94cd4f6e048baa5479fdbf55ce545761ca1b9fbb39d94cb9db10'
        );
        expect(Buffer.from(sanitizedVk.slice(128, 160)).toString('hex')).toBe(
            '03655de9fc05554158bb675855c323c5a697daf2567ddee0f0383b166036d23f'
        );
    });

    it('strips Garaga leading length before Starknet span encoding', () => {
        const normalized = NoahProver.normalizeGaragaCallData([3n, 10n, 20n, 30n]);
        expect(normalized).toEqual([10n, 20n, 30n]);
        expect(NoahProver.normalizeGaragaCallData([10n, 20n, 30n])).toEqual([10n, 20n, 30n]);
    });
});
