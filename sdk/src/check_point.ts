
const p = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

function checkPoint(xHex: string, yHex: string) {
    const x = BigInt(xHex);
    const y = BigInt(yHex);

    console.log(`Checking point:`);
    console.log(`x: ${x} (0x${x.toString(16)})`);
    console.log(`y: ${y} (0x${y.toString(16)})`);

    const lhs = (y * y) % p;
    const rhs = (x * x * x + 3n) % p;

    console.log(`LHS (y^2): ${lhs}`);
    console.log(`RHS (x^3 + 3): ${rhs}`);

    if (lhs === rhs) {
        console.log("Point IS on the curve (BN254).");
    } else {
        console.log("Point is NOT on the curve (BN254).");
    }
}

const xHex = "1d4aa3d49300627d36e4b7d3dc7521f77e6ad51e8df6ddbfd5fd6290c8c5355e";
const yHex = "c212f928896fa2ac68426fd60539268823939c4f180579e55054e73d27546f3";

function reverseBytes(hex: string): string {
    const cleanHex = hex.replace(/^0x/, '');
    const pairs = cleanHex.match(/.{1,2}/g) || [];
    return "0x" + pairs.reverse().join('');
}

console.log("Checking standard (Big Endian) interpretation:");
checkPoint("0x" + xHex, "0x" + yHex);

console.log("\nChecking reversed (Little Endian) interpretation:");
const xLe = reverseBytes(xHex);
const yLe = reverseBytes(yHex);
checkPoint(xLe, yLe);
