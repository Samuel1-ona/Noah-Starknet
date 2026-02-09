
const p = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

function checkPoint(xHex: string, yHex: string, label: string) {
    const x = BigInt("0x" + xHex);
    const y = BigInt("0x" + yHex);
    const lhs = (y * y) % p;
    const rhs = (x * x * x + 3n) % p;
    if (lhs === rhs) {
        console.log(`${label}: ON CURVE`);
    } else {
        console.log(`${label}: NOT on curve`);
    }
}

const tail = [
    "1cd54692b97518fde2c2494728e332ccfda99d383cd5edbc959e2abeb050f0cc", // 281
    "2f87806e91789c0fbf0d4b7fa344fa570cd0e1ef5204573f6755c949c7110b48", // 282
    "3030a107244c9786625abc3527f5dc9f0eab956d9d2ca9d0f5380a6721339b58", // 283
    "2381a42b186d99ca393544174053fac5955f72818314641f5f0e0b4ec60c11e4", // 284
    "0a7e2c98c63ed469db648e28e1bcf05d1b6b13f9c987564ac9bc07c1781840d4", // 285
    "01204c7bd91a267c30c43e01891c1c875e515d123d63e537c56cb3387a12ffac", // 286
    "0119ba356dad9cddb074bc3798f0e6025dea2259088852e133e9e2e7d381c5ae", // 287
    "2c21384b65c7bd926b872e078493ba812b2a620d0f75b5710052d3ad1869aaa8", // 288
    "11f5bab65c1ce5e988fee6386b56713e9f77272ac71c85baad5897d947315c54", // 289
    "030554be86179b7de01629c8643652a5fa7c4d5b45736342966c2b9f6bed7f2e", // 290
    "1735d591753cc7c8183b78bfac055ad87025501a7e38b9477e0935ed83c0eee6", // 291
    "2709c7944b25e7c16aa5fb8c32dfd3d4d107eede74dd4cfc1a59dbf2c1c1c5f4", // 292
    "22f8e3956d7457a219832fd379d3a6214886c7a8029c5902144e1d9078f08c54"  // 293
];

// Wait, the index starts at totalFelts - 32. 
// My loop above was for i = totalFelts - 32 < totalFelts.
// The first index in the output was 262? No, I only saw the end.

console.log("Checking tail points (end of proof):");
checkPoint(tail[tail.length - 4], tail[tail.length - 3], "Pt 290/291");
checkPoint(tail[tail.length - 2], tail[tail.length - 1], "Pt 292/293");
checkPoint(tail[tail.length - 6], tail[tail.length - 5], "Pt 288/289");
checkPoint(tail[tail.length - 8], tail[tail.length - 7], "Pt 286/287");
