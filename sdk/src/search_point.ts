import fs from 'fs';
import path from 'path';

async function main() {
    const proofBytes = fs.readFileSync('../circuit/target/proof');
    const targetX = BigInt("0x38c75b0f8d573a77010680dd6b8ec53846");
    const targetY = BigInt("0x19449198be1d54bef1c11e17f7ba75");

    console.log(`Searching for X: ${targetX.toString(16)}`);
    console.log(`Searching for Y: ${targetY.toString(16)}`);

    for (let i = 0; i <= proofBytes.length - 32; i += 32) {
        let valBE = 0n;
        for (let j = 0; j < 32; j++) valBE = (valBE << 8n) | BigInt(proofBytes[i + j]);
        if (valBE === targetX) console.log(`X found at felt offset ${i / 32} (BE)`);
        if (valBE === targetY) console.log(`Y found at felt offset ${i / 32} (BE)`);

        let valLE = 0n;
        for (let j = 0; j < 32; j++) valLE |= BigInt(proofBytes[i + j]) << BigInt(j * 8);
        if (valLE === targetX) console.log(`X found at felt offset ${i / 32} (LE)`);
        if (valLE === targetY) console.log(`Y found at felt offset ${i / 32} (LE)`);
    }
}

main().catch(console.error);
