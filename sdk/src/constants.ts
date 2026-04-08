export type NoahNetwork = 'mainnet' | 'sepolia' | 'devnet';

export interface NetworkConfig {
    registryAddress: string;
    verifierAddress?: string;
    providerUrl: string;
    chainId: string;
}

export const NETWORKS: Record<NoahNetwork, NetworkConfig> = {
    mainnet: {
        registryAddress: '', // To be added
        providerUrl: '',
        chainId: '0x534e5f4d41494e'
    },
    sepolia: {
        registryAddress: '0x00d101331e427be79937271a5c161d559387a28ef5719fd11351a88067ab5729',
        verifierAddress: '0x0229adcdb7e71ca136ccf30c8d6f1916e9b773588e7648cb8485a373901e2dbe',
        providerUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/gu3D3rKyivv6bhmb3UbyUSYxThLz7C_c',
        chainId: '0x534e5f5345504f4c4941'
    },
    devnet: {
        registryAddress: '',
        verifierAddress: '',
        providerUrl: 'http://localhost:5050',
        chainId: '0x534e5f5345504f4c4941' // Devnet usually mimics Sepolia or has its own
    }
};

export const DEFAULT_NETWORK: NoahNetwork = 'sepolia';
