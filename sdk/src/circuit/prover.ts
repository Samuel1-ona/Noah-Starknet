import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend } from '@aztec/bb.js';
import { CompiledCircuit } from '@noir-lang/types';
import { getHonkCallData, init as initGaraga } from 'garaga';
import { flattenFieldsAsArray } from '../utils/conversions';

export interface NoahProverInputs {
    mrz: number[];
    pub_key_x: number[];
    pub_key_y: number[];
    signature: number[];
    hashed_mrz: number[];
    jurisdiction_root: string | number | bigint;
    jurisdiction_index: string | number | bigint;
    jurisdiction_hash_path: string[] | number[] | bigint[];
    membership_root: string | number | bigint;
    membership_index: string | number | bigint;
    membership_hash_path: string[] | number[] | bigint[];
    action_id: string | number | bigint;
    nullifier: string | number | bigint;
    user_secret: string | number | bigint;
    current_year: string | number | bigint;
    current_month: string | number | bigint;
    current_day: string | number | bigint;
    min_age: string | number | bigint;
}

export class NoahProver {
    private noir: Noir;
    private backend: UltraHonkBackend;
    private bytecode: string;
    private vk: Uint8Array | null = null;

    constructor(circuitArtifact: CompiledCircuit, vk?: Uint8Array) {
        this.bytecode = circuitArtifact.bytecode;
        this.backend = new UltraHonkBackend(this.bytecode);
        this.noir = new Noir(circuitArtifact);
        if (vk) this.vk = vk;
    }

    /**
     * Factory method to load a prover from remote artifacts
     */
    static async fromRemote(circuitUrl: string, vkUrl?: string): Promise<NoahProver> {
        const artifactResponse = await fetch(circuitUrl);
        const artifact = await artifactResponse.json();

        let vk: Uint8Array | undefined;
        if (vkUrl) {
            const vkResponse = await fetch(vkUrl);
            const vkBuffer = await vkResponse.arrayBuffer();
            vk = new Uint8Array(vkBuffer);
        }

        return new NoahProver(artifact, vk);
    }

    /**
     * Generates a proof for the given inputs
     * @param inputs The circuit inputs
     * @returns The generated proof and public inputs
     */
    async generateProof(inputs: NoahProverInputs) {
        const { witness } = await this.noir.execute(inputs as any);
        const proof = await this.backend.generateProof(witness, { starknet: true });
        return proof;
    }

    /**
     * Generates the Garaga calldata for Starknet verification
     * @param proof The generated proof object
     * @returns The calldata as a string array for Starknet.js
     */
    async getStarknetCalldata(proof: { proof: Uint8Array; publicInputs: string[] }) {
        if (!this.vk) {
            throw new Error('Verifying key (VK) is required to generate Starknet calldata');
        }

        await initGaraga();
        const callData = getHonkCallData(
            proof.proof,
            flattenFieldsAsArray(proof.publicInputs),
            this.vk,
            1 // HonkFlavor.STARKNET
        );

        // Garaga getHonkCallData returns bigint[]
        // We convert to string[] for Starknet.js
        return callData.slice(1).map(x => x.toString());
    }

    setVk(vk: Uint8Array) {
        this.vk = vk;
    }

    async destroy() {
        await this.backend.destroy();
    }
}
