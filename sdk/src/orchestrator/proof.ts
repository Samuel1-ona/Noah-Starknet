import { CompiledCircuit } from '@noir-lang/types';
import { EventEmitter } from 'eventemitter3';
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
        console.log('[NoahProofOrchestrator] Starting initialization...');
        let prover: NoahProver | null = null;
        if (config.circuitArtifact) {
            console.log('[NoahProofOrchestrator] Initializing prover...');
            prover = await NoahProver.new(config.circuitArtifact, config.vk);
            console.log('[NoahProofOrchestrator] Prover initialized successfully');
        }
        console.log('[NoahProofOrchestrator] Creating orchestrator instance...');
        const orchestrator = new NoahProofOrchestrator(config, prover);
        console.log('[NoahProofOrchestrator] Initialization complete');
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

        try {
            console.log(`[NoahProofOrchestrator] Starting proveAndVerify for job: ${jobId}`);
            if (!this.prover) throw new NoahProverError('Prover not initialized');

            // Automatically manage user secret if not provided
            if (!inputs.user_secret) {
                console.log('[NoahProofOrchestrator] User secret not provided, fetching or creating...');
                inputs.user_secret = await this.blindedData.getOrCreateSecret();
            }

            job.status = JobStatus.PROVING;
            await this.jobs.saveJob(job);
            this.emit(NoahEvent.JOB_UPDATED, job);

            this.emit(NoahEvent.PROOF_GENERATION_START);
            console.log('[NoahProofOrchestrator] Calling generateProof...');
            const proof = await this.prover.generateProof(inputs);
            console.log('[NoahProofOrchestrator] Proof generated successfully');
            this.emit(NoahEvent.PROOF_GENERATION_SUCCESS, proof);

            this.emit(NoahEvent.TRANSACTION_SUBMISSION_START);
            console.log('[NoahProofOrchestrator] Generating Starknet calldata...');
            const calldata = await this.prover.getStarknetCalldata(proof);
            console.log('[NoahProofOrchestrator] Calldata generated, length:', calldata.length);

            console.log('[NoahProofOrchestrator] Sending transaction to registry...', {
                address: this.contracts.registry.verifyCredential.name,
                args: {
                    calldata_len: calldata.length,
                    current_year: inputs.current_year,
                    current_month: inputs.current_month,
                    current_day: inputs.current_day,
                    min_age: inputs.min_age
                }
            });

            const tx = await this.contracts.registry.verifyCredential(
                calldata,
                inputs.current_year,
                inputs.current_month,
                inputs.current_day,
                inputs.min_age
            );
            console.log('[NoahProofOrchestrator] Transaction submitted:', tx.transaction_hash);

            job.status = JobStatus.COMPLETED;
            job.transactionHash = tx.transaction_hash;
            await this.jobs.saveJob(job);
            this.emit(NoahEvent.JOB_UPDATED, job);
            this.emit(NoahEvent.TRANSACTION_SUBMISSION_SUCCESS, tx);

            return tx;
        } catch (error: any) {
            console.error('[NoahProofOrchestrator] CRITICAL ERROR in proveAndVerify:', error);

            // Detailed logging of error properties for debugging "Unknown orchestrator error"
            if (error && typeof error === 'object') {
                console.error('[NoahProofOrchestrator] Error Keys:', Object.keys(error));
                console.error('[NoahProofOrchestrator] Error Proto:', Object.getPrototypeOf(error)?.constructor?.name);
                console.error('[NoahProofOrchestrator] Error details (aggressive):', JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error))));
            }

            let errorMessage = 'Unknown orchestrator error';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                // Use Object.getOwnPropertyNames to capture non-enumerable 'message' or 'details'
                errorMessage = error.message || error.details || error.code || JSON.stringify(error, Object.getOwnPropertyNames(error));
            }

            console.error('[NoahProofOrchestrator] Processed error message:', errorMessage);

            job.status = JobStatus.FAILED;
            job.error = errorMessage;
            await this.jobs.saveJob(job);
            this.emit(NoahEvent.JOB_UPDATED, job);

            const noahError = error instanceof NoahError
                ? error
                : new NoahProverError(errorMessage);

            // Attach original error for debugging in non-serializable cases
            (noahError as any).originalError = error;

            this.emit(NoahEvent.ERROR, noahError);
            throw noahError;
        }
    }

    async destroy() {
        if (this.prover) await this.prover.destroy();
    }
}
