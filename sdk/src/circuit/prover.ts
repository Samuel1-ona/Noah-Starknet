
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend, Barretenberg } from '@aztec/bb.js';
import { CompiledCircuit } from '@noir-lang/types';
import { flattenFieldsAsArray } from '../utils/conversions.js';
import { getZKHonkCallData, init as initGaraga } from 'garaga';
import type { NoahDocumentType } from '../data/mrz.js';

export interface NoahProverInputs {
    mrz: number[];
    doc_type: NoahDocumentType;
    user_secret: string | number | bigint;
    merkle_path: string[] | number[] | bigint[];
    is_left: boolean[];
    passport_root: string | number | bigint;
    nullifier: string | number | bigint;
    name_hash: string | number | bigint;
    doc_num_hash: string | number | bigint;
    birth_year: string | number | bigint;
    expiry_date: string | number | bigint;
    user_address?: string; // Optional target address for sponsored verification
}

export interface NoahVerificationPublicInputs {
    passportRoot: string | number | bigint;
    nullifier: string | number | bigint;
    nameHash: string | number | bigint;
    docNumHash: string | number | bigint;
    birthYear: string | number | bigint;
    expiryDate: string | number | bigint;
}

export class NoahProver {
    private static readonly RAW_VK_SIZE = 1760;
    private static readonly COMPACT_VK_SIZE = 1888;
    private static readonly WIDE_VK_SIZE = 3680;
    private static readonly GARAGA_HEADER_SIZE = 96;
    private static readonly WIDE_WORD_SIZE = 32;
    private static readonly COORD_LOW_OFFSET = 15;
    private static readonly COORD_HIGH_OFFSET = 17;
    private static readonly LEGACY_POINT_SECTION_SIZE = 1728;

    private noir: Noir;
    private backend: UltraHonkBackend;
    private api: Barretenberg;
    private vk: Uint8Array | null = null;
    private extractedLogN: number = 17; // Default to 17 if not found

    private constructor(circuitArtifact: CompiledCircuit, backend: UltraHonkBackend, api: Barretenberg, vk?: Uint8Array) {
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

        // Re-include the public inputs in the Garaga proof builder. 
        // This is required to match the VK's expected input count, 
        // while our u256 formatting in the registry handles the contract-level alignment.
        const appPublicInputs = flattenFieldsAsArray(proof.publicInputs);
        const garagaInputs = appPublicInputs;
        
        const callData = getZKHonkCallData(
            proof.proof,
            garagaInputs,
            garagaVk
        );

        console.log('[Noah] Garaga Raw CallData Length:', callData.length);
        console.log('[Noah] Garaga Raw First 2:', callData.slice(0, 2).map(x => x.toString()));

        const normalizedCallData = NoahProver.normalizeGaragaCallData(callData);

        // We convert to string[] for Starknet.js
        return normalizedCallData.map(x => x.toString());

    }

    static normalizeGaragaCallData(callData: bigint[]): bigint[] {
        if (callData.length > 0 && callData[0] === BigInt(callData.length - 1)) {
            return callData.slice(1);
        }

        return callData;
    }

    static extractVerificationPublicInputs(publicInputs: Array<string | number | bigint>): NoahVerificationPublicInputs {
        if (publicInputs.length !== 6) {
            throw new Error(`Expected 6 public inputs, received ${publicInputs.length}`);
        }

        return {
            passportRoot: publicInputs[0],
            nullifier: publicInputs[1],
            nameHash: publicInputs[2],
            docNumHash: publicInputs[3],
            birthYear: publicInputs[4],
            expiryDate: publicInputs[5]
        };
    }

    setVk(vk: Uint8Array) {
        const { vk: sanitizedVk, logN } = NoahProver.sanitizeVk(vk);
        this.vk = sanitizedVk;
        this.extractedLogN = logN;
    }

    /**
     * Normalizes the VK into the 1888-byte layout expected by Garaga and extracts log_n.
     */
    private static sanitizeVk(vk: Uint8Array): { vk: Uint8Array, logN: number } {
        const logN = vk[31] ?? 17;

        if (vk.length === NoahProver.COMPACT_VK_SIZE) {
            return { vk: vk.slice(), logN };
        }

        if (vk.length === NoahProver.WIDE_VK_SIZE) {
            return { vk: NoahProver.compactWideVk(vk), logN };
        }

        if (vk.length === NoahProver.RAW_VK_SIZE) {
            return { vk: vk.slice(), logN };
        }

        return { vk: vk.slice(), logN };
    }

    /**
     * Compacts the 3680-byte bb.js VK into the 1888-byte Garaga layout.
     * The widened format stores each 32-byte coordinate chunk in a padded 32-byte word.
     * We strip the padding and reassemble the 32-byte BN254 coordinates.
     */
    private static compactWideVk(vk: Uint8Array): Uint8Array {
        const compactVk = new Uint8Array(NoahProver.COMPACT_VK_SIZE);
        compactVk.set(vk.slice(0, NoahProver.GARAGA_HEADER_SIZE), 0);

        let targetOffset = NoahProver.GARAGA_HEADER_SIZE;
        for (let sourceOffset = NoahProver.GARAGA_HEADER_SIZE; sourceOffset < vk.length; sourceOffset += NoahProver.WIDE_WORD_SIZE * 4) {
            const xLow = vk.slice(sourceOffset, sourceOffset + NoahProver.WIDE_WORD_SIZE);
            const xHigh = vk.slice(sourceOffset + NoahProver.WIDE_WORD_SIZE, sourceOffset + (NoahProver.WIDE_WORD_SIZE * 2));
            const yLow = vk.slice(sourceOffset + (NoahProver.WIDE_WORD_SIZE * 2), sourceOffset + (NoahProver.WIDE_WORD_SIZE * 3));
            const yHigh = vk.slice(sourceOffset + (NoahProver.WIDE_WORD_SIZE * 3), sourceOffset + (NoahProver.WIDE_WORD_SIZE * 4));

            const xHighBytes = xHigh.slice(NoahProver.COORD_HIGH_OFFSET);
            const xLowBytes = xLow.slice(NoahProver.COORD_LOW_OFFSET);
            const yHighBytes = yHigh.slice(NoahProver.COORD_HIGH_OFFSET);
            const yLowBytes = yLow.slice(NoahProver.COORD_LOW_OFFSET);

            compactVk.set(xHighBytes, targetOffset);
            targetOffset += xHighBytes.length;
            compactVk.set(xLowBytes, targetOffset);
            targetOffset += xLowBytes.length;

            compactVk.set(yHighBytes, targetOffset);
            targetOffset += yHighBytes.length;
            compactVk.set(yLowBytes, targetOffset);
            targetOffset += yLowBytes.length;
        }

        return compactVk;
    }

    /**
     * Adapts legacy VK layouts to the 1888-byte format expected by Garaga.
     */
    private adaptVkForGaraga(vk: Uint8Array, numPublicInputs: number): Uint8Array {
        if (vk.length === NoahProver.COMPACT_VK_SIZE) {
            const updatedVk = vk.slice();
            const dataView = new DataView(updatedVk.buffer, updatedVk.byteOffset, updatedVk.byteLength);
            dataView.setUint32(28, this.extractedLogN, false); // log_circuit_size
            dataView.setUint32(60, numPublicInputs + 16, false); // public_inputs_size
            dataView.setUint32(92, 1, false); // public_inputs_offset
            return updatedVk;
        }

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

        // Copy 1728 bytes of points (27 G1 points) from the legacy 1760-byte VK.
        newVk.set(vk.slice(NoahProver.RAW_VK_SIZE - NoahProver.LEGACY_POINT_SECTION_SIZE), 96);

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
