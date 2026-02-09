
const p = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

// Point from error message
const xHex = "20239cfd67693a172b4e93ec5cbb4233b1a315f7b1a418a7b69e2e929738304f";
const yHex = "55670a141b6c9397951a5679d0bef5488821edcecf6c8368f303bf0272a809";

const x = BigInt("0x" + xHex);
const y = BigInt("0x" + yHex);

console.log(`Checking Point:\nx: ${x.toString(16)}\ny: ${y.toString(16)}`);

const y2 = (y * y) % p;
const x3_3 = (x * x * x + 3n) % p;

console.log(`y^2      = ${y2.toString(16)}`);
console.log(`x^3 + 3  = ${x3_3.toString(16)}`);

if (y2 === x3_3) {
    console.log("RESULT: ON CURVE");
} else {
    console.log("RESULT: NOT ON CURVE");
}
