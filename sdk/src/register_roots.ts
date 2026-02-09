
import { RpcProvider, Account, constants } from "starknet";
import { NoahRegistry } from "./contract/registry";
// @ts-ignore
import { abi as registryAbi } from "../../contracts/target/dev/credential_registry_CredentialRegistry.contract_class.json";

async function main() {
    const provider = new RpcProvider({
        nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/gu3D3rKyivv6bhmb3UbyUSYxThLz7C_c'
    });

    const registryAddress = '0x00107bca4ea84b0d540a44454a94ebf10e4b0181da34eb8b4c3eea134605730b';

    // Admin account from App.tsx
    const privateKey = '0x05e70cc9452d833070d9954ce05322216ab0e743b214004fd195349e411d7071';
    const accountAddress = '0x02Bc02AE26B75e9dc7db44d2F38A4778b909Ba05d4A41129544baD3F55F30Dbe';

    // Fix: Ensure provider is passed correctly. Starknet.js Account(provider, address, pk)
    // If the error 'toLowerCase of undefined' happens, it usually means 'address' is undefined or not a string.
    console.log('Key:', privateKey ? 'Present' : 'Missing');
    console.log('Addr:', accountAddress);

    const account = new Account({ provider, address: accountAddress, signer: privateKey });

    console.log('Account connected:', account.address);

    const registry = new NoahRegistry(
        registryAddress,
        registryAbi,
        provider,
        account
    );

    const root = "0x0"; // The dummy root used in App.tsx

    console.log(`Registering Jurisdiction Root: ${root}...`);
    try {
        const tx = await registry.addJurisdictionRoot(root);
        console.log('Jurisdiction Root registered. Tx Hash:', tx.transaction_hash);
        await provider.waitForTransaction(tx.transaction_hash);
        console.log('Confirmed.');
    } catch (e: any) {
        console.log('Error registering jurisdiction root (might already exist):', e.message);
    }

    console.log(`Registering Membership Root: ${root}...`);
    try {
        const tx = await registry.addMembershipRoot(root);
        console.log('Membership Root registered. Tx Hash:', tx.transaction_hash);
        await provider.waitForTransaction(tx.transaction_hash);
        console.log('Confirmed.');
    } catch (e: any) {
        console.log('Error registering membership root (might already exist):', e.message);
    }

    console.log('Registry init complete.');
}

main().catch(console.error);
