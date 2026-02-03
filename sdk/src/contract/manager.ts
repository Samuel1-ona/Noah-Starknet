import { Account, RpcProvider, ec } from 'starknet';
import { NoahRegistry } from './registry';
import registryAbi from '../../assets/abis/CredentialRegistry.json';

export interface NoahConfig {
    providerUrl: string;
    registryAddress: string;
    accountAddress?: string;
    privateKey?: string;
}

export class NoahContractManager {
    public provider: RpcProvider;
    public account?: Account;
    public registry: NoahRegistry;

    constructor(config: NoahConfig) {
        this.provider = new RpcProvider({ nodeUrl: config.providerUrl });

        if (config.accountAddress && config.privateKey) {
            this.account = new Account(this.provider, config.accountAddress, config.privateKey);
        }

        this.registry = new NoahRegistry(
            config.registryAddress,
            (registryAbi as any).abi,
            this.provider,
            this.account
        );
    }
}
