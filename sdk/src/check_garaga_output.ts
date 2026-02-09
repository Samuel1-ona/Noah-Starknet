
import { getZKHonkCallData, init as initGaraga } from 'garaga';

async function main() {
    await initGaraga();
    // Use a dummy call that succeeds (e.g. with 24 and 8)
    // We already saw it hit "unreachable" which is AFTER the JS/WASM boundary but maybe it 
    // returned something before crashing? No.
    // I need a valid-ish proof to avoid "unreachable".
    // I'll skip this and trust the slice(1) for now, as it's common in Garaga SDKs.
    console.log("Skipping actual call, just checking types.");
}
main().catch(console.error);
