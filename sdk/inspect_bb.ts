
import { UltraHonkBackend, Barretenberg } from '@aztec/bb.js';

console.log('Barretenberg:', Barretenberg);
console.log('UltraHonkBackend:', UltraHonkBackend);

try {
    console.log('UltraHonkBackend length:', UltraHonkBackend.length);
} catch (e) {
    console.log('Error inspecting UltraHonkBackend:', e);
}
