import { describe, it, expect, vi } from 'vitest';
import { NoahProver } from '../src/circuit/prover';
import { NoahRegistry } from '../src/contract/registry';
import { NoahContractManager } from '../src/contract/manager';
import { NoahProofOrchestrator } from '../src/orchestrator/proof';
import circuitArtifact from '../assets/circuit.json';

describe('Noah SDK Initialization', () => {
    it('should initialize NoahProver', () => {
        const prover = new NoahProver(circuitArtifact as any);
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

    it('should initialize NoahProofOrchestrator', () => {
        const config = {
            circuitArtifact: circuitArtifact as any,
            vk: new Uint8Array([1, 2, 3]),
            starknet: {
                providerUrl: 'http://localhost:5050',
                registryAddress: '0x123',
            }
        };
        const orchestrator = new NoahProofOrchestrator(config);
        expect(orchestrator).toBeDefined();
    });
});
