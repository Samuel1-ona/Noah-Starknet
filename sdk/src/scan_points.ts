import fs from 'fs';

async function main() {
    const proofBytes = fs.readFileSync('../circuit/target/proof_test/proof');
    const p = 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47n;

    console.log("Scanning proof for valid G1 points...");

    for (let i = 0; i <= proofBytes.length - 64; i += 32) {
        // Big Endian
        let xBE = 0n;
        for (let j = 0; j < 32; j++) xBE = (xBE << 8n) | BigInt(proofBytes[i + j]);
        let yBE = 0n;
        for (let j = 0; j < 32; j++) yBE = (yBE << 8n) | BigInt(proofBytes[i + 32 + j]);

        // Little Endian
        let xLE = 0n;
        for (let j = 0; j < 32; j++) xLE |= BigInt(proofBytes[i + j]) << BigInt(j * 8);
        let yLE = 0n;
        for (let j = 0; j < 32; j++) yLE |= BigInt(proofBytes[i + 32 + j]) << BigInt(j * 8);

        const check = (x: bigint, y: bigint, label: string) => {
            if (x === 0n && y === 0n) return;
            if (x >= p || y >= p) return;
            const left = (y * y) % p;
            const right = (x * x * x + 3n) % p;
            if (left === right) {
                console.log(`Valid G1 point found at felt offset ${i / 32} (${label}): (${x.toString(16)}, ${y.toString(16)})`);
            }
        };

        check(xBE, yBE, "BE");
        check(xLE, yLE, "LE");
    }
}

main().catch(console.error);
