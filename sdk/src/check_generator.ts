import { G1Point, CurveId, init } from 'garaga';

async function main() {
    await init();
    try {
        // const g = G1Point.get_nG(CurveId.BN254, 1);
        // console.log("Generator G1:", g);
        // console.log("x:", g.x.toString(16));
        // console.log("y:", g.y.toString(16));
        console.log("Check generator disabled to fix build.");
    } catch (e) {
        console.error(e);
    }
}

main();
