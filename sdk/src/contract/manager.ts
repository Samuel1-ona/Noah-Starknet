import { Account, RpcProvider, AccountInterface } from 'starknet';
import { NoahRegistry } from './registry';
import registryAbi from '../../assets/abis/CredentialRegistry.json';

export interface NoahConfig {
    providerUrl: string;
    registryAddress: string;
    account?: AccountInterface; // Support existing Account or Wallet interface
    accountAddress?: string; // Legacy / Direct support
    privateKey?: string;
}

export class NoahContractManager {
    public provider: RpcProvider;
    public account?: AccountInterface;
    public registry: NoahRegistry;

    constructor(config: NoahConfig) {
        this.provider = new RpcProvider({ nodeUrl: config.providerUrl });

        if (config.account) {
            this.account = config.account;
        } else if (config.accountAddress && config.privateKey) {
            this.account = new Account(this.provider, config.accountAddress, config.privateKey);
        }

        this.registry = new NoahRegistry(
            config.registryAddress,
            (registryAbi as any).abi,
            this.provider,
            this.account as any
        );
    }
}
