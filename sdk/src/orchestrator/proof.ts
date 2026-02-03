import { CompiledCircuit } from '@noir-lang/types';
import { EventEmitter } from 'events';
import { NoahProver, NoahProverInputs } from '../circuit/prover';
import { NoahContractManager, NoahConfig } from '../contract/manager';
import { NoahError, NoahProverError, NoahContractError } from '../utils/errors';

export interface OrchestratorConfig {
    circuitArtifact: CompiledCircuit;
    vk: Uint8Array;
    starknet: NoahConfig;
}

export enum NoahEvent {
    PROOF_GENERATION_START = 'proof_generation_start',
    PROOF_GENERATION_SUCCESS = 'proof_generation_success',
    TRANSACTION_SUBMISSION_START = 'transaction_submission_start',
    TRANSACTION_SUBMISSION_SUCCESS = 'transaction_submission_success',
    ERROR = 'error'
}

export class NoahProofOrchestrator extends EventEmitter {
    private prover: NoahProver;
    private contracts: NoahContractManager;

    constructor(config: OrchestratorConfig) {
        super();
        this.prover = new NoahProver(config.circuitArtifact, config.vk);
        this.contracts = new NoahContractManager(config.starknet);
    }

    /**
     * Generates a proof and submits it to Starknet
     * @param inputs The circuit inputs
     * @returns The transaction result
     */
    async proveAndVerify(inputs: NoahProverInputs) {
        try {
            this.emit(NoahEvent.PROOF_GENERATION_START);
            console.log('Generating proof...');
            const proof = await this.prover.generateProof(inputs);
            this.emit(NoahEvent.PROOF_GENERATION_SUCCESS, proof);

            this.emit(NoahEvent.TRANSACTION_SUBMISSION_START);
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
            this.emit(NoahEvent.TRANSACTION_SUBMISSION_SUCCESS, tx);

            return tx;
        } catch (error: any) {
            const noahError = error instanceof NoahError
                ? error
                : new NoahProverError(error.message || 'Unknown orchestrator error');
            this.emit(NoahEvent.ERROR, noahError);
            throw noahError;
        }
    }

    async destroy() {
        await this.prover.destroy();
    }
}
