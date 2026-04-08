import { CompiledCircuit } from '@noir-lang/types';
import { EventEmitter } from 'eventemitter3';
import { NoahProver, NoahProverInputs } from '../circuit/prover.js';
import { NoahContractManager, NoahConfig } from '../contract/manager.js';
import { NoahError, NoahProverError, NoahContractError } from '../utils/errors.js';
import { NoahStorage } from '../storage/base.js';
import { BrowserStorage } from '../storage/browser.js';
import { NoahJobManager, JobStatus, NoahJob } from './jobs.js';
import { NoahBlindedDataManager } from '../crypto/blinded.js';

export interface OrchestratorConfig {
    circuitArtifact?: CompiledCircuit; // Optional if loading from remote
    vk?: Uint8Array;
    starknet: NoahConfig;
    storage?: NoahStorage;
}

export enum NoahEvent {
    PROOF_GENERATION_START = 'proof_generation_start',
    PROOF_GENERATION_SUCCESS = 'proof_generation_success',
    TRANSACTION_SUBMISSION_START = 'transaction_submission_start',
    TRANSACTION_SUBMISSION_SUCCESS = 'transaction_submission_success',
    ERROR = 'error',
    JOB_UPDATED = 'job_updated'
}

export class NoahProofOrchestrator extends EventEmitter {
    private prover: NoahProver | null = null;
    private contracts: NoahContractManager;
    private storage: NoahStorage;
    public jobs: NoahJobManager;
    public blindedData: NoahBlindedDataManager;

    private constructor(config: OrchestratorConfig, prover: NoahProver | null = null) {
        super();
        this.contracts = new NoahContractManager(config.starknet);
        this.storage = config.storage || new BrowserStorage();
        this.jobs = new NoahJobManager(this.storage);
        this.blindedData = new NoahBlindedDataManager(this.storage);
        this.prover = prover;
    }

    /**
     * Creates a new NoahProofOrchestrator instance
     */
    static async new(config: OrchestratorConfig): Promise<NoahProofOrchestrator> {
        let prover: NoahProver | null = null;
        if (config.circuitArtifact) {
            prover = await NoahProver.new(config.circuitArtifact, config.vk);
        }
        const orchestrator = new NoahProofOrchestrator(config, prover);
        return orchestrator;
    }

    /**
     * Initializes a remote prover
     */
    async initRemote(circuitUrl: string, vkUrl?: string) {
        this.prover = await NoahProver.fromRemote(circuitUrl, vkUrl);
    }

    /**
     * Generates a proof and submits it to Starknet
     * @param inputs The circuit inputs
     * @returns The transaction result
     */
    async proveAndVerify(inputs: NoahProverInputs) {
        const jobId = Math.random().toString(36).substring(7);
        const job: NoahJob = { id: jobId, status: JobStatus.PENDING, timestamp: Date.now() };
        let failedDuring: 'proving' | 'submission' = 'proving';

        try {
            if (!this.prover) throw new NoahProverError('Prover not initialized');

            // Automatically manage user secret if not provided
            if (!inputs.user_secret) {
                inputs.user_secret = await this.blindedData.getOrCreateSecret();
            }

            job.status = JobStatus.PROVING;
            await this.jobs.saveJob(job);
            this.emit(NoahEvent.JOB_UPDATED, job);

            this.emit(NoahEvent.PROOF_GENERATION_START);
            const proof = await this.prover.generateProof(inputs);
            this.emit(NoahEvent.PROOF_GENERATION_SUCCESS, proof);

            failedDuring = 'submission';
            this.emit(NoahEvent.TRANSACTION_SUBMISSION_START);
            const calldata = await this.prover.getStarknetCalldata(proof);
            const publicInputs = NoahProver.extractVerificationPublicInputs(proof.publicInputs);

            // If we are using an adminAccount (sponsored), we can verify for ANY user address.
            // If we are a user-only setup, we verify for ourselves.
            const targetUser = inputs.user_address || (this.contracts.account ? this.contracts.account.address : undefined);

            const tx = await this.contracts.registry.verifyCredential(
                calldata,
                publicInputs,
                targetUser
            );

            console.log('[Noah] Transaction Calldata Length:', calldata.length);
            console.log('[Noah] Public Inputs:', publicInputs);

            job.status = JobStatus.COMPLETED;
            job.transactionHash = tx.transaction_hash;
            job.publicInputs = proof.publicInputs;
            await this.jobs.saveJob(job);
            this.emit(NoahEvent.JOB_UPDATED, job);
            this.emit(NoahEvent.TRANSACTION_SUBMISSION_SUCCESS, tx);

            return tx;
        } catch (error: any) {
            console.error('[Noah] Error in proveAndVerify:', error?.message || error);

            let errorMessage = 'Unknown orchestrator error';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                errorMessage = error.message || error.details || error.code || JSON.stringify(error, Object.getOwnPropertyNames(error));
            }

            job.status = JobStatus.FAILED;
            job.error = errorMessage;
            await this.jobs.saveJob(job);
            this.emit(NoahEvent.JOB_UPDATED, job);

            const noahError =
                error instanceof NoahError
                    ? error
                    : failedDuring === 'proving'
                        ? new NoahProverError(errorMessage)
                        : new NoahContractError(errorMessage);

            (noahError as any).originalError = error;

            this.emit(NoahEvent.ERROR, noahError);
            throw noahError;
        }
    }

    /**
     * Checks if an address is verified
     */
    async isAddressVerified(address: string): Promise<boolean> {
        return this.contracts.registry.isAddressVerified(address);
    }

    async destroy() {
        if (this.prover) await this.prover.destroy();
    }
}
