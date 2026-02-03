import { Account, RpcProvider, AccountInterface } from 'starknet';
import { NoahRegistry } from './registry';
import registryAbi from '../../assets/abis/CredentialRegistry.json';

export interface NoahConfig {
    providerUrl: string;
    registryAddress: string;
    chainId?: string; // e.g., 'SN_MAIN', 'SN_SEPOLIA', or custom for devnet
    specVersion?: string; // e.g., '0.10' or '0.9'
    blockIdentifier?: 'latest' | 'pending'; // Default: 'latest'
    account?: AccountInterface; // Support existing Account or Wallet interface
    accountAddress?: string; // Legacy / Direct support
    privateKey?: string;
}

export class NoahContractManager {
    public provider: RpcProvider;
    public account?: AccountInterface;
    public registry: NoahRegistry;
    public blockIdentifier: 'latest' | 'pending';

    constructor(config: NoahConfig) {
        console.log('[NoahContractManager] Initializing with:', {
            providerUrl: config.providerUrl,
            registryAddress: config.registryAddress
        });

        // Initialize provider with nodeUrl
        // In v9, passing nodeUrl in options object is standard.
        // We'll let it auto-detect the specVersion.
        this.provider = new RpcProvider({
            nodeUrl: config.providerUrl,
            chainId: config.chainId as any
        });

        // Store blockIdentifier for use in method calls
        this.blockIdentifier = config.blockIdentifier || 'latest';

        if (config.account) {
            this.account = config.account;
        } else if (config.accountAddress && config.privateKey) {
            console.log('[NoahContractManager] Creating account for address:', config.accountAddress);

            // V9 style Account initialization MUST use a single options object.
            // Passing positional arguments causes 'toLowerCase' error because 
            // the constructor tries to find 'address' on the first argument.
            const account = new Account({
                provider: this.provider,
                address: config.accountAddress,
                signer: config.privateKey
            });
            this.account = account;

            // Override getNonce to always use 'latest' block identifier
            const originalGetNonce = account.getNonce.bind(account);
            account.getNonce = async (blockIdentifier?: any) => {
                return originalGetNonce(blockIdentifier || this.blockIdentifier);
            };

            console.log('[NoahContractManager] Account created successfully');
        }

        // Handle case where registryAbi might be a full contract class artifact
        const abi = (registryAbi as any).abi || (registryAbi as any);

        this.registry = new NoahRegistry(
            config.registryAddress,
            abi,
            this.provider,
            this.account as any
        );
    }
}
