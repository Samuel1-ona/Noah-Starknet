import * as garaga from 'garaga';

async function main() {
    console.log("Garaga exports:");
    const keys = Object.keys(garaga);
    for (const key of keys) {
        console.log(`- ${key} (${typeof (garaga as any)[key]})`);
    }
}

main().catch(console.error);
