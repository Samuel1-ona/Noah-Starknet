
const p = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

function checkPoint(xHex: string, yHex: string) {
    const x = BigInt("0x" + xHex);
    const y = BigInt("0x" + yHex);
    const lhs = (y * y) % p;
    const rhs = (x * x * x + 3n) % p;
    if (lhs === rhs) {
        console.log(`Point on curve: (0x${xHex}, 0x${yHex})`);
    } else {
        console.log(`Point NOT on curve: (0x${xHex}, 0x${yHex})`);
    }
}

console.log("Checking Felt 290/291 (potential shplonk_q):");
checkPoint("092d71bc58f70aee8a27eaccb973268cd6effab6006831b8bb482a869519b959", "0184113659e72cd5f5b4fa501310c0d4b97d60a5b0628b0947aadcdcbfc8cdbe");

console.log("\nChecking Felt 292/293 (potential kzg_quotient):");
checkPoint("11aac2ba7d218141e8fd4f5836024a592ad40198b4fb17064bd704039920f9b9", "0ddfd11d42324c5718e587d3f1179309684bd00d43f997468aa221f2da192eb6");

// Also check if they are in the FIRST 16 felts (after PIs 0-7)
// Felts 8-9, 10-11, etc.
