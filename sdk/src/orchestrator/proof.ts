import { CompiledCircuit } from '@noir-lang/types';
import { NoahProver, NoahProverInputs } from '../circuit/prover';
import { NoahContractManager, NoahConfig } from '../contract/manager';

export interface OrchestratorConfig {
    circuitArtifact: CompiledCircuit;
    vk: Uint8Array;
    starknet: NoahConfig;
}

export class NoahProofOrchestrator {
    private prover: NoahProver;
    private contracts: NoahContractManager;

    constructor(config: OrchestratorConfig) {
        this.prover = new NoahProver(config.circuitArtifact, config.vk);
        this.contracts = new NoahContractManager(config.starknet);
    }

    /**
     * Generates a proof and submits it to Starknet
     * @param inputs The circuit inputs
     * @returns The transaction result
     */
    async proveAndVerify(inputs: NoahProverInputs) {
        console.log('Generating proof...');
        const proof = await this.prover.generateProof(inputs);

        console.log('Preparing Starknet calldata...');
        const calldata = await this.prover.getStarknetCalldata(proof);

        console.log('Submitting to Starknet...');
        const tx = await this.contracts.registry.verifyCredential(
            calldata,
            inputs.current_year,
            inputs.current_month,
            inputs.current_day,
            inputs.min_age
        );

        return tx;
    }

    async destroy() {
        await this.prover.destroy();
    }
}
