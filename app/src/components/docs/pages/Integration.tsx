import React from 'react';
import { Typography, Box, Divider, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from 'react-router-dom';
import { CodeBlock } from '../CodeBlock';

export const Integration: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
                Integration Examples
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 6 }}>
                Noah is designed to be highly compositional. Here is how you can integrate the SDK both on the frontend and deep within your smart contracts.
            </Typography>

            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary.main">
                Smart Contract Integration
            </Typography>
            <Typography variant="body1" paragraph>
                The true power of Noah comes from verifying identity entirely on-chain. Your smart contract can securely check if a wallet has been verified without ever seeing their personal data.
            </Typography>

            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4 }}>
                1. Checking via the Credential Registry
            </Typography>
            <Typography variant="body1" paragraph>
                The overarching `CredentialRegistry` contract on Starknet maintains a mapping of verified wallet addresses to their nullifiers (to prevent double-claiming) and the trusted timestamp of their verification.
                You can easily interface with this registry.
            </Typography>

            <CodeBlock
                language="rust"
                title="YourContract.cairo"
                code={`#[starknet::contract]
mod ExclusiveAirdrop {
    use starknet::ContractAddress;
    use noah::interfaces::ICredentialRegistry;

    #[storage]
    struct Storage {
        registry_address: ContractAddress,
    }

    #[external(v0)]
    fn claim_airdrop(ref self: ContractState, user: ContractAddress) {
        let registry = ICredentialRegistryDispatcher { 
            contract_address: self.registry_address.read() 
        };

        // Ensure the user is human and over 18!
        let is_verified = registry.is_verified(user);
        assert(is_verified == true, 'User is not verified by Noah');

        // ... distribute tokens ...
    }
}`}
            />

            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 6 }}>
                2. Writing a Custom Verifier
            </Typography>
            <Typography variant="body1" paragraph>
                If you need to verify absolute specific claims (e.g., verifying a user is a citizen of Japan, rather than just simply checking if they are over 18), you can implement a custom `UltraKeccakZKHonkVerifier` in Cairo directly inside your contract.
            </Typography>

            <Divider sx={{ my: 6, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Typography variant="h4" fontWeight="bold" gutterBottom color="secondary.main" sx={{ mt: 6 }}>
                Frontend Wallet / Account Plug-ins
            </Typography>
            <Typography variant="body1" paragraph>
                Noah is strictly agnostic to how you connect your users. You can plug in standard wallets, session-key controllers (Cartridge), or embedded wallets (Privy).
            </Typography>

            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4 }}>
                1. Cartridge Controller (Session Keys)
            </Typography>
            <Typography variant="body1" paragraph>
                By passing the Cartridge <code>Controller</code> account as the `account` in the SDK, you can enable a session-based identity flow where the user only clicks "Verify" once.
            </Typography>

            <CodeBlock
                language="typescript"
                title="cartridge_integration.ts"
                code={`import Controller from '@cartridge/controller';
import { NoahProofOrchestrator } from 'noah-starknet';

const controller = new Controller();
const { account } = await controller.connect();

// The Noah SDK treats the Controller exactly like a standard Argent/Braavos wallet
const orchestrator = await NoahProofOrchestrator.new({
    circuitArtifact,
    vk,
    starknet: { network: 'sepolia', account: account }
});`}
            />

            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 6 }}>
                2. Privy (Embedded Wallets)
            </Typography>
            <Typography variant="body1" paragraph>
                For non-crypto native users, you can use Privy to generate an embedded Starknet wallet and pass its signer to the Noah SDK.
            </Typography>

            <CodeBlock
                language="typescript"
                title="privy_integration.ts"
                code={`import { usePrivy, useWallets } from '@privy-io/react-auth';
const { wallets } = useWallets();

// Find the Starknet wallet and convert to AccountInterface
const starknetAccount = convertPrivyToStarknet(wallets[0]); 

const orchestrator = await NoahProofOrchestrator.new({
    circuitArtifact,
    vk,
    starknet: { network: 'sepolia', account: starknetAccount }
});`}
            />

            <Box sx={{ mt: 6, display: 'flex', gap: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={<HomeIcon />}
                    size="large"
                    onClick={() => navigate('/')}
                    sx={{ borderRadius: 2 }}
                >
                    Back to Home
                </Button>
            </Box>
        </Box>
    );
};
