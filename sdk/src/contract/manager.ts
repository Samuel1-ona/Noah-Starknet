import { Account, RpcProvider, AccountInterface, Signer } from 'starknet';
import { NoahRegistry } from './registry.js';
import registryAbi from '../../assets/abis/CredentialRegistry.json' with { type: 'json' };
import { NETWORKS, NoahNetwork, DEFAULT_NETWORK } from '../constants.js';
// Noah SDK uses standard process.env checks for cross-platform compatibility.
// If using in a Node.js backend relayer, call dotenv.config() in your application's entry point.

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
            console.log(`[Noah] Admin Account (Sponsored) initialized: ${adminAddr}`);
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
        const normalizedAddress = normalizeEnvValue(address);
        const normalizedPrivateKey = normalizeEnvValue(privateKey);

        if (!normalizedAddress || !normalizedPrivateKey) {
            throw new Error('Account address and private key are required to create a Starknet signer');
        }

        const account = new Account({
            provider: this.provider,
            address: normalizedAddress,
            signer: new Signer(normalizedPrivateKey)
        });

        const originalGetNonce = account.getNonce.bind(account);
        account.getNonce = async (blockIdentifier?: any) => {
            return originalGetNonce(blockIdentifier || this.blockIdentifier);
        };

        return account;
    }
}

function getEnvVar(key: string): string | undefined {
    // 1. Check direct process.env (Node or Vite defined)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        const val = normalizeEnvValue(process.env[key]);
        if (val && val !== 'undefined' && val !== 'null') return val;
    }

    // 2. Check for VITE_ prefix (standard for Vite apps)
    const viteKey = `VITE_${key}`;
    // @ts-ignore
    const metaEnv = typeof import.meta !== 'undefined' && import.meta.env;
    if (metaEnv && metaEnv[viteKey]) {
        return normalizeEnvValue(metaEnv[viteKey]);
    }
    if (typeof process !== 'undefined' && process.env && process.env[viteKey]) {
        return normalizeEnvValue(process.env[viteKey]);
    }

    return undefined;
}

function normalizeEnvValue(value: unknown): string | undefined {
    if (value == null) {
        return undefined;
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
        return undefined;
    }

    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1).trim();
    }

    return trimmed;
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
