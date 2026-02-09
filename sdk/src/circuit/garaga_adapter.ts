
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';

export interface G1Point {
    x: bigint;
    y: bigint;
}

export interface HonkVk {
    circuit_size: number;
    log_circuit_size: number;
    public_inputs_size: number;
    qm: G1Point;
    qc: G1Point;
    ql: G1Point;
    qr: G1Point;
    qo: G1Point;
    q4: G1Point;
    q_lookup: G1Point;
    q_arith: G1Point;
    q_delta_range: G1Point;
    q_memory: G1Point;
    q_nnf: G1Point;
    q_elliptic: G1Point;
    q_poseidon2_external: G1Point;
    q_poseidon2_internal: G1Point;
    s1: G1Point;
    s2: G1Point;
    s3: G1Point;
    s4: G1Point;
    id1: G1Point;
    id2: G1Point;
    id3: G1Point;
    id4: G1Point;
    t1: G1Point;
    t2: G1Point;
    t3: G1Point;
    t4: G1Point;
    lagrange_first: G1Point;
    lagrange_last: G1Point;
}

export interface ZKHonkProof {
    pairing_point_object: bigint[];
    public_inputs: bigint[];
    w1: G1Point;
    w2: G1Point;
    w3: G1Point;
    w4: G1Point;
    z_perm: G1Point;
    lookup_read_counts: G1Point;
    lookup_read_tags: G1Point;
    lookup_inverses: G1Point;
    libra_commitments: G1Point[];
    libra_sum: bigint;
    sumcheck_univariates: bigint[][];
    sumcheck_evaluations: bigint[];
    libra_evaluation: bigint;
    gemini_masking_poly: G1Point;
    gemini_masking_eval: bigint;
    gemini_fold_comms: G1Point[];
    gemini_a_evaluations: bigint[];
    libra_poly_evals: bigint[];
    shplonk_q: G1Point;
    kzg_quotient: G1Point;
}

export interface GaragaProofCalldata {
    proof: bigint[];
    public_inputs: bigint[];
}

function readBigInt(dv: DataView, offset: number): bigint {
    let res = 0n;
    for (let i = 0; i < 32; i++) {
        res = (res << 8n) | BigInt(dv.getUint8(offset + i));
    }
    return res;
}

function parseG1PointAt(dv: DataView, offset: number): G1Point {
    return {
        x: readBigInt(dv, offset),
        y: readBigInt(dv, offset + 32)
    };
}

export function parseVk(vkBytes: Uint8Array): HonkVk {
    const dv = new DataView(vkBytes.buffer, vkBytes.byteOffset, vkBytes.byteLength);
    let cursor = 0;

    const circuit_size = dv.getUint32(cursor, false); cursor += 4;
    const log_circuit_size = dv.getUint32(cursor, false); cursor += 4;
    // In BB 3.x, public_inputs_size is at offset 8.
    const public_inputs_size = dv.getUint32(cursor, false); cursor += 4;

    // ADJUST: In Garaga context, pairing points (16) are counted in public inputs.
    const adjustedPublicInputsSize = public_inputs_size + 16;

    const qm = parseG1PointAt(dv, cursor); cursor += 64;
    const qc = parseG1PointAt(dv, cursor); cursor += 64;
    const ql = parseG1PointAt(dv, cursor); cursor += 64;
    const qr = parseG1PointAt(dv, cursor); cursor += 64;
    const qo = parseG1PointAt(dv, cursor); cursor += 64;
    const q4 = parseG1PointAt(dv, cursor); cursor += 64;
    const q_lookup = parseG1PointAt(dv, cursor); cursor += 64;
    const q_arith = parseG1PointAt(dv, cursor); cursor += 64;
    const q_delta_range = parseG1PointAt(dv, cursor); cursor += 64;
    const q_memory = parseG1PointAt(dv, cursor); cursor += 64;
    const q_nnf = parseG1PointAt(dv, cursor); cursor += 64;
    const q_elliptic = parseG1PointAt(dv, cursor); cursor += 64;
    const q_poseidon2_external = parseG1PointAt(dv, cursor); cursor += 64;
    const q_poseidon2_internal = parseG1PointAt(dv, cursor); cursor += 64;
    const s1 = parseG1PointAt(dv, cursor); cursor += 64;
    const s2 = parseG1PointAt(dv, cursor); cursor += 64;
    const s3 = parseG1PointAt(dv, cursor); cursor += 64;
    const s4 = parseG1PointAt(dv, cursor); cursor += 64;
    const id1 = parseG1PointAt(dv, cursor); cursor += 64;
    const id2 = parseG1PointAt(dv, cursor); cursor += 64;
    const id3 = parseG1PointAt(dv, cursor); cursor += 64;
    const id4 = parseG1PointAt(dv, cursor); cursor += 64;
    const t1 = parseG1PointAt(dv, cursor); cursor += 64;
    const t2 = parseG1PointAt(dv, cursor); cursor += 64;
    const t3 = parseG1PointAt(dv, cursor); cursor += 64;
    const t4 = parseG1PointAt(dv, cursor); cursor += 64;
    const lagrange_first = parseG1PointAt(dv, cursor); cursor += 64;
    const lagrange_last = parseG1PointAt(dv, cursor); cursor += 64;

    return {
        circuit_size,
        log_circuit_size,
        public_inputs_size: adjustedPublicInputsSize,
        qm, qc, ql, qr, qo, q4, q_lookup, q_arith, q_delta_range, q_memory, q_nnf, q_elliptic, q_poseidon2_external, q_poseidon2_internal,
        s1, s2, s3, s4, id1, id2, id3, id4, t1, t2, t3, t4, lagrange_first, lagrange_last
    };
}

function checkOnCurve(x: bigint, y: bigint, name: string) {
    const p = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const left = (y * y) % p;
    const right = (x * x * x + 3n) % p;
    if (left !== right) {
        console.error(`Invalid point ${name}: (${x.toString(16)}, ${y.toString(16)})`);
    }
}

export function parseProof(proofBytes: Uint8Array, publicInputs: bigint[], vk: HonkVk): ZKHonkProof {
    const dv = new DataView(proofBytes.buffer, proofBytes.byteOffset, proofBytes.byteLength);
    let cursor = 0;

    const pairing_point_object: bigint[] = [];
    for (let i = 0; i < 16; i++) {
        pairing_point_object.push(readBigInt(dv, cursor));
        cursor += 32;
    }

    // BB 3.x Layout (from Solidity Verifier)
    const w1 = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(w1.x, w1.y, "w1");
    const w2 = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(w2.x, w2.y, "w2");
    const w3 = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(w3.x, w3.y, "w3");

    // Commitments to logup witness polynomials
    const lookup_read_counts = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(lookup_read_counts.x, lookup_read_counts.y, "lookup_read_counts");
    const lookup_read_tags = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(lookup_read_tags.x, lookup_read_tags.y, "lookup_read_tags");

    const w4 = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(w4.x, w4.y, "w4");
    const lookup_inverses = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(lookup_inverses.x, lookup_inverses.y, "lookup_inverses");
    const z_perm = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(z_perm.x, z_perm.y, "z_perm");

    const libra_comm_0 = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(libra_comm_0.x, libra_comm_0.y, "libra_commitments[0]");
    const libra_commitments = [libra_comm_0];

    const libra_sum = readBigInt(dv, cursor); cursor += 32;

    const ZK_BATCHED_RELATION_PARTIAL_LENGTH = 9;
    const sumcheck_univariates: bigint[][] = [];
    for (let i = 0; i < vk.log_circuit_size; i++) {
        const univariate: bigint[] = [];
        for (let j = 0; j < ZK_BATCHED_RELATION_PARTIAL_LENGTH; j++) {
            univariate.push(readBigInt(dv, cursor));
            cursor += 32;
        }
        sumcheck_univariates.push(univariate);
    }

    const NUMBER_OF_ENTITIES = 41;
    const sumcheck_evaluations: bigint[] = [];
    for (let i = 0; i < NUMBER_OF_ENTITIES; i++) {
        sumcheck_evaluations.push(readBigInt(dv, cursor));
        cursor += 32;
    }

    const libra_evaluation = readBigInt(dv, cursor); cursor += 32;

    const libra_comm_1 = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(libra_comm_1.x, libra_comm_1.y, "libra_commitments[1]");
    const libra_comm_2 = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(libra_comm_2.x, libra_comm_2.y, "libra_commitments[2]");
    libra_commitments.push(libra_comm_1, libra_comm_2);

    const gemini_masking_poly = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(gemini_masking_poly.x, gemini_masking_poly.y, "gemini_masking_poly");
    const gemini_masking_eval = readBigInt(dv, cursor); cursor += 32;

    const gemini_fold_comms: G1Point[] = [];
    for (let i = 0; i < vk.log_circuit_size - 1; i++) {
        const pt = parseG1PointAt(dv, cursor); cursor += 64;
        checkOnCurve(pt.x, pt.y, `gemini_fold_comms[${i}]`);
        gemini_fold_comms.push(pt);
    }

    const gemini_a_evaluations: bigint[] = [];
    for (let i = 0; i < vk.log_circuit_size; i++) {
        gemini_a_evaluations.push(readBigInt(dv, cursor));
        cursor += 32;
    }

    const libra_poly_evals: bigint[] = [];
    for (let i = 0; i < 4; i++) {
        libra_poly_evals.push(readBigInt(dv, cursor));
        cursor += 32;
    }

    const shplonk_q = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(shplonk_q.x, shplonk_q.y, "shplonk_q");
    const kzg_quotient = parseG1PointAt(dv, cursor); cursor += 64; checkOnCurve(kzg_quotient.x, kzg_quotient.y, "kzg_quotient");

    return {
        public_inputs: publicInputs,
        pairing_point_object,
        w1, w2, w3, w4,
        z_perm,
        lookup_read_counts,
        lookup_read_tags,
        lookup_inverses,
        libra_commitments,
        libra_sum,
        sumcheck_univariates,
        sumcheck_evaluations,
        libra_evaluation,
        gemini_masking_poly,
        gemini_masking_eval,
        gemini_fold_comms,
        gemini_a_evaluations,
        libra_poly_evals,
        shplonk_q,
        kzg_quotient
    };
}

export function getUltraHonkCalldata(vk: HonkVk, proof: ZKHonkProof): bigint[] {
    const calldata: bigint[] = [];
    calldata.push(BigInt(vk.log_circuit_size));
    calldata.push(BigInt(vk.public_inputs_size));

    calldata.push(...proof.pairing_point_object);

    calldata.push(vk.qm.x, vk.qm.y);
    calldata.push(vk.qc.x, vk.qc.y);
    calldata.push(vk.ql.x, vk.ql.y);
    calldata.push(vk.qr.x, vk.qr.y);
    calldata.push(vk.qo.x, vk.qo.y);
    calldata.push(vk.q4.x, vk.q4.y);
    calldata.push(vk.q_lookup.x, vk.q_lookup.y);
    calldata.push(vk.q_arith.x, vk.q_arith.y);
    calldata.push(vk.q_delta_range.x, vk.q_delta_range.y);
    calldata.push(vk.q_memory.x, vk.q_memory.y);
    calldata.push(vk.q_nnf.x, vk.q_nnf.y);
    calldata.push(vk.q_elliptic.x, vk.q_elliptic.y);
    calldata.push(vk.q_poseidon2_external.x, vk.q_poseidon2_external.y);
    calldata.push(vk.q_poseidon2_internal.x, vk.q_poseidon2_internal.y);

    calldata.push(vk.s1.x, vk.s1.y);
    calldata.push(vk.s2.x, vk.s2.y);
    calldata.push(vk.s3.x, vk.s3.y);
    calldata.push(vk.s4.x, vk.s4.y);
    calldata.push(vk.id1.x, vk.id1.y);
    calldata.push(vk.id2.x, vk.id2.y);
    calldata.push(vk.id3.x, vk.id3.y);
    calldata.push(vk.id4.x, vk.id4.y);
    calldata.push(vk.t1.x, vk.t1.y);
    calldata.push(vk.t2.x, vk.t2.y);
    calldata.push(vk.t3.x, vk.t3.y);
    calldata.push(vk.t4.x, vk.t4.y);
    calldata.push(vk.lagrange_first.x, vk.lagrange_first.y);
    calldata.push(vk.lagrange_last.x, vk.lagrange_last.y);

    calldata.push(proof.w1.x, proof.w1.y);
    calldata.push(proof.w2.x, proof.w2.y);
    calldata.push(proof.w3.x, proof.w3.y);
    calldata.push(proof.w4.x, proof.w4.y);
    calldata.push(proof.z_perm.x, proof.z_perm.y);
    calldata.push(proof.lookup_read_counts.x, proof.lookup_read_counts.y);
    calldata.push(proof.lookup_read_tags.x, proof.lookup_read_tags.y);
    calldata.push(proof.lookup_inverses.x, proof.lookup_inverses.y);

    for (const pt of proof.libra_commitments) {
        calldata.push(pt.x, pt.y);
    }
    calldata.push(proof.libra_sum);

    for (const univ of proof.sumcheck_univariates) {
        calldata.push(...univ);
    }
    calldata.push(...proof.sumcheck_evaluations);
    calldata.push(proof.libra_evaluation);

    calldata.push(proof.gemini_masking_poly.x, proof.gemini_masking_poly.y);
    calldata.push(proof.gemini_masking_eval);

    for (const pt of proof.gemini_fold_comms) {
        calldata.push(pt.x, pt.y);
    }
    calldata.push(...proof.gemini_a_evaluations);
    calldata.push(...proof.libra_poly_evals);
    calldata.push(proof.shplonk_q.x, proof.shplonk_q.y);
    calldata.push(proof.kzg_quotient.x, proof.kzg_quotient.y);

    calldata.push(...proof.public_inputs);

    return calldata;
}

export async function generateGaragaProof(witness: Uint8Array, circuitArtifact: any): Promise<GaragaProofCalldata> {
    const bb = await Barretenberg.new();
    // In downgraded bb.js, UltraHonkBackend is initialized with just bytecode (or bytecode + options)
    // and it manages its own API instance.
    const backend = new UltraHonkBackend(circuitArtifact.bytecode, { threads: 1 });


    console.log('Generating proof with evm target...');
    const proofData = await backend.generateProof(witness, { verifierTarget: 'starknet' } as any);
    const vkBytes = await backend.getVerificationKey({ verifierTarget: 'starknet' } as any);


    const vk = parseVk(vkBytes);

    // Convert public inputs to bigint[]
    const publicInputs: bigint[] = proofData.publicInputs.map(pi => BigInt(pi));

    console.log('Parsing proof with 3.x layout...');
    const zkhonkProof = parseProof(proofData.proof, publicInputs, vk);

    console.log('Generating calldata...');
    const calldata = getUltraHonkCalldata(vk, zkhonkProof);

    await bb.destroy();
    return {
        proof: calldata,
        public_inputs: publicInputs
    };
}
