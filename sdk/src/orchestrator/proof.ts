import { CompiledCircuit } from '@noir-lang/types';
import { EventEmitter } from 'events';
import { NoahProver, NoahProverInputs } from '../circuit/prover';
import { NoahContractManager, NoahConfig } from '../contract/manager';
import { NoahError, NoahProverError, NoahContractError } from '../utils/errors';
import { NoahStorage } from '../storage/base';
import { BrowserStorage } from '../storage/browser';
import { NoahJobManager, JobStatus, NoahJob } from './jobs';
import { NoahBlindedDataManager } from '../crypto/blinded';

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

    constructor(config: OrchestratorConfig) {
        super();
        this.contracts = new NoahContractManager(config.starknet);
        this.storage = config.storage || new BrowserStorage();
        this.jobs = new NoahJobManager(this.storage);
        this.blindedData = new NoahBlindedDataManager(this.storage);

        if (config.circuitArtifact) {
            this.prover = new NoahProver(config.circuitArtifact, config.vk);
        }
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

            this.emit(NoahEvent.TRANSACTION_SUBMISSION_START);
            const calldata = await this.prover.getStarknetCalldata(proof);

            const tx = await this.contracts.registry.verifyCredential(
                calldata,
                inputs.current_year,
                inputs.current_month,
                inputs.current_day,
                inputs.min_age
            );

            job.status = JobStatus.COMPLETED;
            job.transactionHash = tx.transaction_hash;
            await this.jobs.saveJob(job);
            this.emit(NoahEvent.JOB_UPDATED, job);
            this.emit(NoahEvent.TRANSACTION_SUBMISSION_SUCCESS, tx);

            return tx;
        } catch (error: any) {
            job.status = JobStatus.FAILED;
            job.error = error.message;
            await this.jobs.saveJob(job);
            this.emit(NoahEvent.JOB_UPDATED, job);

            const noahError = error instanceof NoahError
                ? error
                : new NoahProverError(error.message || 'Unknown orchestrator error');
            this.emit(NoahEvent.ERROR, noahError);
            throw noahError;
        }
    }

    async destroy() {
        if (this.prover) await this.prover.destroy();
    }
}
