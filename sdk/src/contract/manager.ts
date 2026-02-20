import { Account, RpcProvider, AccountInterface } from 'starknet';
import { NoahRegistry } from './registry';
import registryAbi from '../../assets/abis/CredentialRegistry.json';
import { NETWORKS, NoahNetwork, DEFAULT_NETWORK } from '../constants';

export interface NoahConfig {
    network?: NoahNetwork;
    providerUrl?: string;
    registryAddress?: string;
    chainId?: string;
    specVersion?: string;
    blockIdentifier?: 'latest' | 'pending';
    account?: AccountInterface;
    accountAddress?: string;
    privateKey?: string;
}

export class NoahContractManager {
    public provider: RpcProvider;
    public account?: AccountInterface;
    public registry: NoahRegistry;
    public blockIdentifier: 'latest' | 'pending';

    constructor(config: NoahConfig) {
        const network = config.network || DEFAULT_NETWORK;
        const networkConfig = NETWORKS[network];

        const providerUrl = config.providerUrl || networkConfig.providerUrl;
        const registryAddress = config.registryAddress || networkConfig.registryAddress;
        const chainId = config.chainId || networkConfig.chainId;

        if (!providerUrl) {
            throw new Error(`Provider URL is required for network ${network}`);
        }
        if (!registryAddress) {
            throw new Error(`Registry address is required for network ${network}`);
        }

        // Initialize provider
        this.provider = new RpcProvider({
            nodeUrl: providerUrl,
            chainId: chainId as any
        });

        this.blockIdentifier = config.blockIdentifier || 'latest';

        if (config.account) {
            this.account = config.account;
        } else if (config.accountAddress && config.privateKey) {
            const account = new Account({
                provider: this.provider,
                address: config.accountAddress,
                signer: config.privateKey
            });
            this.account = account;

            const originalGetNonce = account.getNonce.bind(account);
            account.getNonce = async (blockIdentifier?: any) => {
                return originalGetNonce(blockIdentifier || this.blockIdentifier);
            };
        }

        const abi = (registryAbi as any).abi || (registryAbi as any);

        this.registry = new NoahRegistry(
            registryAddress,
            abi,
            this.provider,
            this.account as any
        );
    }
}
