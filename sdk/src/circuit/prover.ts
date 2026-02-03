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
    jurisdiction_root: string | bigint;
    jurisdiction_index: number | bigint;
    jurisdiction_hash_path: string[] | bigint[];
    membership_root: string | bigint;
    membership_index: number | bigint;
    membership_hash_path: string[] | bigint[];
    action_id: string | bigint;
    nullifier: string | bigint;
    user_secret: string | bigint;
    current_year: number | bigint;
    current_month: number | bigint;
    current_day: number | bigint;
    min_age: number | bigint;
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
