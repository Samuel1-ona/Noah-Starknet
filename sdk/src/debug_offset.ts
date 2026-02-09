import fs from 'fs';

const proof = fs.readFileSync('../circuit/target/proof_test/proof');
const offset = 512;
const chunk = proof.slice(offset, offset + 64);

function toBE(bytes: Uint8Array) {
    let res = 0n;
    for (let i = 0; i < 32; i++) res = (res << 8n) | BigInt(bytes[i]);
    return res;
}

function toLE(bytes: Uint8Array) {
    let res = 0n;
    for (let i = 0; i < 32; i++) res |= BigInt(bytes[i]) << BigInt(i * 8);
    return res;
}

console.log("X (BE):", toBE(chunk.slice(0, 32)).toString(16));
console.log("X (LE):", toLE(chunk.slice(0, 32)).toString(16));
console.log("Y (BE):", toBE(chunk.slice(32, 64)).toString(16));
console.log("Y (LE):", toLE(chunk.slice(32, 64)).toString(16));
