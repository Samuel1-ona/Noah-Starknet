
export type NoahNetwork = 'mainnet' | 'sepolia' | 'devnet';

export interface NetworkConfig {
    registryAddress: string;
    providerUrl: string;
    chainId: string;
}

export const NETWORKS: Record<NoahNetwork, NetworkConfig> = {
    mainnet: {
        registryAddress: '', // To be added
        providerUrl: '',
        chainId: 'SN_MAIN'
    },
    sepolia: {
        registryAddress: '0x00107bca4ea84b0d540a44454a94ebf10e4b0181da34eb8b4c3eea134605730b',
        providerUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/gu3D3rKyivv6bhmb3UbyUSYxThLz7C_c',
        chainId: 'SN_SEPOLIA'
    },
    devnet: {
        registryAddress: '',
        providerUrl: 'http://localhost:5050',
        chainId: 'SN_SEPOLIA' // Devnet usually mimics Sepolia or has its own
    }
};

export const DEFAULT_NETWORK: NoahNetwork = 'sepolia';
