import { Account, RpcProvider, AccountInterface } from 'starknet';
import { NoahRegistry } from './registry.js';
import registryAbi from '../../assets/abis/CredentialRegistry.json' with { type: 'json' };
import { NETWORKS, NoahNetwork, DEFAULT_NETWORK } from '../constants.js';
import pkg from 'dotenv';
const { config: loadEnv } = pkg;

// Load environment variables for Node.js environments
if (typeof process !== 'undefined' && process.env) {
    loadEnv({ quiet: true });
}

export interface NoahConfig {
    network?: NoahNetwork;
    providerUrl?: string;
    registryAddress?: string;
    verifierAddress?: string;
    chainId?: string;
    specVersion?: string;
    blockIdentifier?: 'latest' | 'pending';
    account?: AccountInterface;
    accountAddress?: string;
    privateKey?: string;
    // Admin credentials for sponsored gas (KYC)
    adminAddress?: string;
    adminPrivateKey?: string;
}

export class NoahContractManager {
    public provider: RpcProvider;
    public account?: AccountInterface;
    public adminAccount?: AccountInterface;
    public registryAddress: string;
    public verifierAddress?: string;
    public registry: NoahRegistry;
    public blockIdentifier: 'latest' | 'pending';

    constructor(config: NoahConfig) {
        const network = config.network || DEFAULT_NETWORK;
        const networkConfig = NETWORKS[network];

        const providerUrl =
            config.providerUrl || getEnvVar(getRpcEnvKey(network)) || networkConfig.providerUrl;
        const registryAddress =
            config.registryAddress || getEnvVar('REGISTRY_ADDRESS') || networkConfig.registryAddress;
        const chainId = config.chainId || networkConfig.chainId;
        const verifierAddress =
            config.verifierAddress || getEnvVar('VERIFIER_ADDRESS') || networkConfig.verifierAddress;

        if (!providerUrl) {
            throw new Error(`Provider URL is required for network ${network}`);
        }
        if (!registryAddress) {
            throw new Error(`Registry address is required for network ${network}`);
        }

        this.registryAddress = registryAddress;
        this.verifierAddress = verifierAddress;

        // Initialize provider
        this.provider = new RpcProvider({
            nodeUrl: providerUrl,
            chainId: chainId as any
        });

        this.blockIdentifier = config.blockIdentifier || 'latest';

        // 1. Initialize primary account (usually the user's wallet)
        if (config.account) {
            this.account = config.account;
        } else if (config.accountAddress && config.privateKey) {
            this.account = this.createAccount(config.accountAddress, config.privateKey);
        }

        // 2. Initialize admin account for sponsored gas (KYC)
        // Check config first, then fall back to environment variables (for backend/relay usage)
        const adminAddr = config.adminAddress || getEnvVar('ADMIN_CONTRACT_ADDRESS');
        const adminKey = config.adminPrivateKey || getEnvVar('ADMIN_PRIVATE_KEY');

        if (adminAddr && adminKey) {
            this.adminAccount = this.createAccount(adminAddr, adminKey);
        }

        const abi = (registryAbi as any).abi || (registryAbi as any);

        this.registry = new NoahRegistry(
            registryAddress,
            abi,
            this.provider,
            this.account as any,
            this.adminAccount as any,
            this.verifierAddress
        );
    }

    private createAccount(address: string, privateKey: string): Account {
        const account = new Account({
            provider: this.provider,
            address,
            signer: privateKey
        });

        const originalGetNonce = account.getNonce.bind(account);
        account.getNonce = async (blockIdentifier?: any) => {
            return originalGetNonce(blockIdentifier || this.blockIdentifier);
        };

        return account;
    }
}

function getEnvVar(key: string): string | undefined {
    if (typeof process === 'undefined' || !process.env) {
        return undefined;
    }

    const value = process.env[key];
    return value && value.length > 0 ? value : undefined;
}

function getRpcEnvKey(network: NoahNetwork): string {
    if (network === 'mainnet') {
        return 'MAINNET_RPC';
    }

    if (network === 'devnet') {
        return 'DEVNET_RPC';
    }

    return 'SEPOLIA_RPC';
}
