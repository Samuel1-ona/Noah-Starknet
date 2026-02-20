
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend, Barretenberg } from '@aztec/bb.js';
import { CompiledCircuit } from '@noir-lang/types';
import { getZKHonkCallData, init as initGaraga } from 'garaga';
import { flattenFieldsAsArray } from '../utils/conversions.js';

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
    private api: Barretenberg;
    private bytecode: string;
    private vk: Uint8Array | null = null;
    private extractedLogN: number = 17; // Default to 17 if not found

    private constructor(circuitArtifact: CompiledCircuit, backend: UltraHonkBackend, api: Barretenberg, vk?: Uint8Array) {
        this.bytecode = circuitArtifact.bytecode;
        this.backend = backend;
        this.api = api;
        this.noir = new Noir(circuitArtifact);
        if (vk) this.setVk(vk);
    }

    static async new(circuitArtifact: CompiledCircuit, vk?: Uint8Array): Promise<NoahProver> {
        let threads = 1;
        try {
            if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
                threads = Math.min(navigator.hardwareConcurrency, 32);
            } else {
                threads = 1;
                try {
                    const os = require('os');
                    threads = Math.min(os.cpus().length, 32);
                } catch (e) { }
            }
        } catch (e) { threads = 1; }

        const backend = new UltraHonkBackend(circuitArtifact.bytecode, { threads });

        if (!vk) {
            try {
                vk = await backend.getVerificationKey();
            } catch (error: any) {
                console.error('[Noah] Failed to generate VK:', error);
                throw error;
            }
        }

        return new NoahProver(circuitArtifact, backend, (backend as any).api, vk);
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

        return NoahProver.new(artifact, vk);
    }

    /**
     * Generates a proof for the given inputs
     * @param inputs The circuit inputs
     * @returns The generated proof and public inputs
     */
    async generateProof(inputs: NoahProverInputs, options?: any) {
        let witness;
        try {
            const result = await this.noir.execute(inputs as any);
            witness = result.witness;
        } catch (error: any) {
            console.error('[Noah] Failed to execute circuit:', error);
            throw error;
        }

        try {
            const proofOptions: any = options || { keccakZK: true };
            const proof = await this.backend.generateProof(witness, proofOptions as any);
            return proof;
        } catch (error: any) {
            console.error('[Noah] Failed to generate proof:', error);
            throw error;
        }
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

        // Dynamically adapt VK for Garaga using the correct public input count
        const garagaVk = this.adaptVkForGaraga(this.vk, proof.publicInputs.length);

        const appPublicInputs = flattenFieldsAsArray(proof.publicInputs);

        // Pass only the application public inputs.
        // Garaga will extract the 16 pairing inputs from the proof bytes itself.
        const garagaInputs = appPublicInputs;

        const callData = getZKHonkCallData(
            proof.proof,
            garagaInputs,
            garagaVk
        );

        // Starknet.js automatically adds a length prefix when passing an array to a function expecting a Span.
        // If Garaga returns [len, ...data], we need to strip 'len' to avoid [len, len, ...data].
        if (callData.length > 0 && callData[0] === BigInt(callData.length - 1)) {
            callData.shift();
        }

        // We convert to string[] for Starknet.js
        return callData.map(x => x.toString());

    }

    setVk(vk: Uint8Array) {
        const { vk: sanitizedVk, logN } = NoahProver.sanitizeVk(vk);
        this.vk = sanitizedVk;
        this.extractedLogN = logN;
    }

    /**
     * Sanitizes the VK by truncating it if it's too large (e.g. 3680 bytes from bb.js).
     * Returns the 1760-byte VK and the extracted log_n.
     */
    private static sanitizeVk(vk: Uint8Array): { vk: Uint8Array, logN: number } {
        let targetVk = vk;
        let logN = 17; // Default to 17 (standard for UltraHonk)

        // Handle the larger VK format from newer bb.js (3680 bytes)
        if (vk.length >= 3680) {
            logN = vk[31];
            targetVk = vk;
        } else if (vk.length >= 1760) {
            logN = vk[31];
        }

        return { vk: targetVk, logN };
    }

    /**
     * Adapts the 1760-byte sanitized VK to the 1888-byte format expected by Garaga.
     * Constructs the specific header with size, offset, and num_pub.
     */
    private adaptVkForGaraga(vk: Uint8Array, numPublicInputs: number): Uint8Array {
        const newVk = new Uint8Array(1888);
        const dataView = new DataView(newVk.buffer);

        // Garaga VK Header (3x 32-byte fields)
        // 0-31: log_circuit_size
        // 32-63: public_inputs_size (AppPIs + 16)
        // 64-95: public_inputs_offset (usually 1)
        dataView.setUint32(28, this.extractedLogN, false); // BE
        const vkPubInputsCount = numPublicInputs + 16;
        dataView.setUint32(60, vkPubInputsCount, false); // BE
        dataView.setUint32(92, 1, false); // BE

        // Find the points in the SDK's VK.
        let sdkPointsOffset = 96; // Standard Noir Honk VK header size
        const signature = new Uint8Array([0x13, 0xaf, 0x7f, 0x26]); // QM.X start

        const at96 = vk.slice(96, 96 + 4);

        if (at96[0] === signature[0] && at96[1] === signature[1] && at96[2] === signature[2] && at96[3] === signature[3]) {
            sdkPointsOffset = 96;
        } else {
            // Search more broadly for the signature
            for (let i = 0; i < vk.length - signature.length; i++) {
                let match = true;
                for (let j = 0; j < signature.length; j++) {
                    if (vk[i + j] !== signature[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    sdkPointsOffset = i;
                    break;
                }
            }
        }

        // Copy 1728 bytes of points (27 G1 points)
        newVk.set(vk.slice(sdkPointsOffset, sdkPointsOffset + 1728), 96);

        // Append 28th point (LagrangeLast) which is missing in bb.js 1760-byte VK
        const lagrangeLastX = "01c40845a5f094353fad820b933fe0f25a180b90b64f3785a501ac790f9a62e5";
        const lagrangeLastY = "1e8f4ac92a40a5216c1d586f1d6006b8b246f322996dace5cea687b65f8e1d23";

        const lagrangeLastBytes = new Uint8Array(64);
        for (let i = 0; i < 32; i++) {
            lagrangeLastBytes[i] = parseInt(lagrangeLastX.slice(i * 2, i * 2 + 2), 16);
            lagrangeLastBytes[i + 32] = parseInt(lagrangeLastY.slice(i * 2, i * 2 + 2), 16);
        }

        newVk.set(lagrangeLastBytes, 1824); // 96 + 27 * 64 = 1824

        return newVk;
    }

    async destroy() {
        // If backend manages API, we can destroy backend
        if (this.backend && typeof (this.backend as any).destroy === 'function') {
            await (this.backend as any).destroy();
        } else if (this.api) {
            await this.api.destroy();
        }
    }
}
