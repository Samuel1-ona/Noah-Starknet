
import { CallData, hash } from 'starknet';

async function main() {
    console.log('Testing CallData serialization for Span<felt252>');

    // Dummy ABI mocking the registry function
    const abi = [
        {
            "type": "function",
            "name": "verify_credential",
            "inputs": [
                {
                    "name": "proof",
                    "type": "core::array::Span::<core::felt252>"
                },
                {
                    "name": "current_year",
                    "type": "core::integer::u256"
                },
                {
                    "name": "current_month",
                    "type": "core::integer::u256"
                },
                {
                    "name": "current_day",
                    "type": "core::integer::u256"
                },
                {
                    "name": "min_age",
                    "type": "core::integer::u256"
                }
            ],
            "outputs": [],
            "state_mutability": "external"
        }
    ];

    const myCallData = new CallData(abi);

    const dummyProof = ["100", "200", "300"]; // 3 elements
    const year = 2024;
    const month = 10;
    const day = 15;
    const minAge = 18;

    // Test 1: Passing array directly (starknet.js should add length)
    const calldata1 = myCallData.compile("verify_credential", [
        dummyProof,
        year,
        month,
        day,
        minAge
    ]);

    console.log('--- Test 1: Passing ["100", "200", "300"] ---');
    console.log('Calldata:', calldata1);
    console.log('Length:', calldata1.length);
    // Expectation: [3, 100, 200, 300, 2024, 0, 10, 0, 15, 0, 18, 0] (u256 are 2 felts)
    // Indexes:
    // 0: 3 (len)
    // 1: 100
    // 2: 200
    // 3: 300
    // 4: 2024 (low)
    // 5: 0 (high)
    // ...

    // Test 2: Passing array with logic that mimics what I thought happened (if I stripped it)
    // If I stripped the length prefix from Garaga, I am passing just data.
    // This matches Test 1.

    // Test 3: Passing array WITH length prefix in it
    const dummyProofWithLen = ["3", "100", "200", "300"];
    const calldata2 = myCallData.compile("verify_credential", [
        dummyProofWithLen,
        year,
        month,
        day,
        minAge
    ]);

    console.log('--- Test 3: Passing ["3", "100", "200", "300"] ---');
    console.log('Calldata:', calldata2);
    // If starknet.js treats this as data, it will prepend length (4).
    // Result: [4, 3, 100, 200, 300, ...] -> Incorrect for Span logic if 3 was meant to be len.

}

main().catch(console.error);
