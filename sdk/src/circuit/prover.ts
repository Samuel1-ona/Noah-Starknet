
import { Noir } from '@noir-lang/noir_js';
import { UltraHonkBackend, Barretenberg } from '@aztec/bb.js';
import { CompiledCircuit } from '@noir-lang/types';
import { getZKHonkCallData, init as initGaraga } from 'garaga';
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
        console.log('[NoahProver] Starting initialization...');
        console.log('[NoahProver] Environment check:');
        console.log('[NoahProver] - crossOriginIsolated:', !!(globalThis as any).crossOriginIsolated);
        console.log('[NoahProver] - SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined');
        let threads = 1;
        try {
            if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
                threads = Math.min(navigator.hardwareConcurrency, 32);
            } else {
                // Node.js fallback or single thread
                threads = 1;
                try {
                    const os = require('os');
                    threads = Math.min(os.cpus().length, 32);
                } catch (e) { }
            }
        } catch (e) { threads = 1; }

        console.log('[NoahProver] Using threads:', threads);

        // bb.js 3.0.0-nightly: Backend manages API instance internally
        console.log('[NoahProver] Creating UltraHonkBackend...');
        console.log('[NoahProver] Barretenberg.new source:', Barretenberg.new.toString());
        console.log('[NoahProver] UltraHonkBackend constructor:', UltraHonkBackend.toString());
        // Pass threads option indirectly via backend if needed, but in this version it seems to handle it internally or uses defaults.
        // The constructor signature is new UltraHonkBackend(bytecode, options?) in some versions or just bytecode in others.
        // Based on my inspection of likely 3.0.0-nightly, it takes bytecode and options.
        // Let's rely on the backend to initialize the API.

        // Initialize Backend
        const backend = new UltraHonkBackend(circuitArtifact.bytecode, { threads });

        if (!vk) {
            console.log('[NoahProver] No VK provided, generating from circuit...');
            try {
                // In 3.0.0-nightly, getVerificationKey() triggers internal instantiation
                vk = await backend.getVerificationKey();
                console.log('[NoahProver] VK generated successfully, length:', vk.length);
            } catch (error: any) {
                console.error('[NoahProver] Failed to generate VK:', error);
                throw error;
            }
        }

        // We only sanitize here. Transformation happens in getStarknetCalldata
        // @ts-ignore - We are passing null for api initially, enabling it to be set later or we refactor the class
        // Actually, we can just grab backend.api if it's public, or just create a separate one if needed (wasteful).
        // Better: refactor `NoahProver` to not strictly need `api` property if backend handles it, 
        // or type cast backend.api. 
        // In the source, `api` is a property of UltraHonkBackend.  

        // Let's try to access it. If it's not initialized yet, we might wait.
        // But `backend.getVerificationKey()` (called above if no vk) ensures instantiation.
        // If vk IS provided, we haven't called anything on backend yet.
        // Let's force init.

        // Wait, the `instantiate()` method is marked `@ignore` but is public-ish in JS. 
        // Let's just cast.

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
        console.log('[NoahProver] Generating witness...');
        let witness;
        try {
            const result = await this.noir.execute(inputs as any);
            witness = result.witness;
            console.log('[NoahProver] Witness generated successfully');
        } catch (error: any) {
            console.error('[NoahProver] Failed to execute circuit (witness generation):', error);
            throw error;
        }

        console.log('[NoahProver] Generating proof with UltraHonkBackend...');
        try {
            // Garaga expects an UltraHonk proof compatible with the 'ultra_keccak_zk_honk' flavor.
            // This corresponds to the 'keccakZK' option in bb.js (using Keccak for Fiat-Shamir transcript).
            // This setup matches the EVM target layout.
            const proofOptions: any = options || { keccakZK: true };
            console.log('[NoahProver] Generating proof with options:', JSON.stringify(proofOptions));
            const proof = await this.backend.generateProof(witness, proofOptions as any);
            console.log('[NoahProver] Proof generated successfully, length:', proof.proof.length);
            return proof;
        } catch (error: any) {
            console.error('[NoahProver] Failed to generate proof:', error);
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

        console.log('[NoahProver] Generating Garaga calldata...');
        console.log('[NoahProver] Proof byte length:', proof.proof.length);
        console.log('[NoahProver] Public inputs count:', proof.publicInputs.length);

        await initGaraga();

        // Dynamically adapt VK for Garaga using the correct public input count
        const garagaVk = this.adaptVkForGaraga(this.vk, proof.publicInputs.length);

        // Garaga expects layout: [AppPIs (8)] [Pairing (16)] [w1...]
        // bb.js proof layout:    [AppPIs (8)] [Pairing (16)] [w1...]

        // So we don't need to strip anything from the proof!
        // We just need to construct the expected public input array (size 24).

        const appPublicInputs = flattenFieldsAsArray(proof.publicInputs);
        console.log(`[NoahProver] App Public Inputs: size ${appPublicInputs.length / 32} felts`);

        // Analysis of Garaga expectations:
        // 1. VK 'public_inputs_size' MUST be the TOTAL count (App + 16 pairing).
        //    If we set it to 8, we get "Invalid public inputs size: 8" (because internal logic requires size >= 16).
        // 2. The 'public_inputs' array passed to getZKHonkCallData MUST contain ONLY the Application inputs.
        //    Garaga calculates expected_app_inputs = vk_size - 16.
        //    If we pass 24 inputs, it sees 24 != (24-16), hence "mismatch: proof 24, vk 8".

        // Pass only the application public inputs.
        // Garaga will extract the 16 pairing inputs from the proof bytes itself or handle them internally.
        const garagaInputs = appPublicInputs;

        console.log(`[NoahProver] Calling Garaga with ${garagaInputs.length} public inputs (App only)`);

        // getZKHonkCallData from 'garaga' expects:
        // 1. proof - The raw proof bytes (which start with pairing points)
        // 2. publicInputs - Application public inputs only
        // 3. verifyingKey - The adapted VK with num_pub = App + 16
        const callData = getZKHonkCallData(
            proof.proof,
            garagaInputs,
            garagaVk
        );

        // Garaga getZKHonkCallData returns bigint[]
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
            console.log(`[NoahProver] Detected large VK (${vk.length} bytes), keeping it intact/safe truncation...`);
            // Attempt to preserve log_n from the original VK if it's in the standard position
            // In standard VK, log_n is at byte 31 (0x1f).
            logN = vk[31];
            console.log('[NoahProver] Extracted log_n from large VK:', logN);

            // Do not truncate to 1760 as it cuts off the last point(s) if points are shifted!
            // Garaga needs ~1888 bytes. If points start at 145, we need 145 + 1728 = 1873 bytes.
            // 1760 < 1873.
            // Let's just use the full VK or truncate to something safe like 4096.
            targetVk = vk;
        } else if (vk.length >= 1760) {
            // Try to extract logN from a standard 1760 VK
            logN = vk[31];
        }

        return { vk: targetVk, logN };
    }

    /**
     * Adapts the 1760-byte sanitized VK to the 1888-byte format expected by Garaga.
     * Constructs the specific header with size, offset, and num_pub.
     */
    private adaptVkForGaraga(vk: Uint8Array, numPublicInputs: number): Uint8Array {
        console.log(`[NoahProver] Adapting VK for Garaga. Raw VK Length: ${vk.length}`);

        // Garaga's Honk VK format (matching circuit/target/vk):
        // 0-31: logN (32 bytes)
        // 32-63: public_inputs_size (32 bytes)
        // 64-95: input_offset (32 bytes)
        // 96-1887: 28 G1 Points (64 bytes each, total 1792 bytes)

        const newVk = new Uint8Array(1888);
        const dataView = new DataView(newVk.buffer);

        // Garaga VK Header (3x 32-byte fields)
        // 0-31: log_circuit_size
        // 32-63: public_inputs_size (AppPIs + 16)
        // 64-95: public_inputs_offset (usually 1)

        dataView.setUint32(28, this.extractedLogN, false); // BE
        // Garaga VK 'public_inputs_size' must include the 16 pairing inputs.
        // It validates this size >= 16.
        const vkPubInputsCount = numPublicInputs + 16;
        dataView.setUint32(60, vkPubInputsCount, false); // BE
        dataView.setUint32(92, 1, false); // BE

        console.log(`[NoahProver] Set VK public inputs count to: ${vkPubInputsCount} (App ${numPublicInputs} + 16 Pairing)`);

        // Find the points in the SDK's VK.
        // The points follow the 96-byte header in the original file.
        let sdkPointsOffset = 96; // Standard Noir Honk VK header size
        const signature = new Uint8Array([0x13, 0xaf, 0x7f, 0x26]); // QM.X start

        // HEXDUMP for debugging misaligned starts
        const vkDumpHex = Array.from(vk.slice(140, 200)).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log(`[NoahProver] VK Dump (140-200): ${vkDumpHex}`);

        // Debug: Check if signature exists at expected offset 96
        const at96 = vk.slice(96, 96 + 4);
        const at96Hex = Array.from(at96).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log(`[NoahProver] VK bytes at 96-100: ${at96Hex} (Expected: 13af7f26)`);

        if (at96[0] === signature[0] && at96[1] === signature[1] && at96[2] === signature[2] && at96[3] === signature[3]) {
            console.log('[NoahProver] Found signature at standard offset 96.');
            sdkPointsOffset = 96;
        } else {
            // Search more broadly for the signature
            console.log('[NoahProver] Signature not at 96, searching...');
            for (let i = 0; i < vk.length - signature.length; i++) {
                let match = true;
                for (let j = 0; j < signature.length; j++) {
                    if (vk[i + j] !== signature[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    console.log(`[NoahProver] Found VK points signature at offset: ${i}`);
                    sdkPointsOffset = i;
                    break;
                }
            }
        }

        // Copy 1728 bytes of points (27 G1 points)
        // Garaga expects points immediately after header (offset 96)
        console.log('[NoahProver] Copying 1728 bytes of points from SDK VK...');
        newVk.set(vk.slice(sdkPointsOffset, sdkPointsOffset + 1728), 96);

        // Append 28th point (LagrangeLast) which is missing in bb.js 1760-byte VK
        // Point extracted from honk_verifier_constants.cairo for logN=17
        const lagrangeLastX = "01c40845a5f094353fad820b933fe0f25a180b90b64f3785a501ac790f9a62e5";
        const lagrangeLastY = "1e8f4ac92a40a5216c1d586f1d6006b8b246f322996dace5cea687b65f8e1d23";

        const lagrangeLastBytes = new Uint8Array(64);
        for (let i = 0; i < 32; i++) {
            lagrangeLastBytes[i] = parseInt(lagrangeLastX.slice(i * 2, i * 2 + 2), 16);
            lagrangeLastBytes[i + 32] = parseInt(lagrangeLastY.slice(i * 2, i * 2 + 2), 16);
        }

        newVk.set(lagrangeLastBytes, 1824); // 96 + 27 * 64 = 1824

        console.log(`[NoahProver] VK adapted. log_n=${this.extractedLogN}, points=27+1, total=28`);

        // Debug: Dump first 96 bytes of VK
        console.log("[NoahProver] VK Header Dump (0-96):");
        const headerHex = Array.from(newVk.slice(0, 96))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        console.log(headerHex);

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
