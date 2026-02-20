import React from 'react';
import { Typography, Box, Divider, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { CodeBlock } from '../CodeBlock';

export const Usage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
                Usage Guide
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 6 }}>
                Your First Zero-Knowledge Proof. Let's walk through how to scan an ID, generate a proof locally, and verify it on-chain in 3 simple steps.
            </Typography>

            <Typography variant="h5" fontWeight="bold" gutterBottom>
                Step 1: Initialize the Orchestrator
            </Typography>
            <Typography variant="body1" paragraph>
                The <code>NoahProofOrchestrator</code> is the heart of the SDK. It manages the download of the verification key, the instantiation of the local prover, and submitting to Starknet.
            </Typography>

            <CodeBlock
                language="typescript"
                title="src/App.tsx"
                code={`import { NoahProofOrchestrator } from 'noah-starknet';
import circuitArtifact from "./assets/circuit.json";
import vkUrl from './assets/vk.bin?url';

// Fetch the verifier key (VK)
const vkResponse = await fetch(vkUrl);
const vk = new Uint8Array(await vkResponse.arrayBuffer());

// Initialize Orchestrator
const orchestrator = await NoahProofOrchestrator.new({
  circuitArtifact: circuitArtifact,
  vk: vk,
  starknet: { network: 'sepolia', account: connectedAccount }
});`}
            />

            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mt: 6 }}>
                Step 2: Generate the Proof
            </Typography>
            <Typography variant="body1" paragraph>
                Once you have extracted the MRZ string from the passport (e.g., using a camera scanner), you pass the parsed biometric data into the Orchestrator. The SDK handles generating the massive cryptographic signature directly inside the browser.
            </Typography>

            <CodeBlock
                language="typescript"
                title="generateProof.ts"
                code={`const inputs = {
  mrz: mrzBytesArray, // The scanned Passport string converted to bytes
  pub_key_x: Array(32).fill(0), // Passport PubKey X
  pub_key_y: Array(32).fill(0), // Passport PubKey Y
  signature: Array(64).fill(0), // RSA Signature from Passport NFC
  hashed_mrz: hashedMrzBytes,
  
  // What are we proving?
  current_year: "2024",
  current_month: "5",
  current_day: "20",
  min_age: "18", // Prove user is an adult
  nullifier: Math.floor(Math.random() * 1000000000).toString(), // Sybil Resistance
  user_secret: "12345"
};

// ⏳ This takes a few seconds—it's running cryptography entirely offline!
await orchestrator.proveAndVerify(inputs);`}
            />

            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mt: 6 }}>
                Step 3: Listen for Events
            </Typography>
            <Typography variant="body1" paragraph>
                You can listen for Orchestrator events to keep your UI updated and inform the user of the progress.
            </Typography>

            <CodeBlock
                language="typescript"
                title="events.ts"
                code={`import { NoahEvent } from 'noah-starknet';

orchestrator.on(NoahEvent.PROOF_GENERATION_START, () => {
    console.log("Locally computing witness...");
});

orchestrator.on(NoahEvent.TRANSACTION_SUBMISSION_START, () => {
    console.log("Proof generated. Sending to Starknet...");
});

orchestrator.on(NoahEvent.TRANSACTION_SUBMISSION_SUCCESS, () => {
    console.log("✅ Verified!");
});`}
            />

            <Divider sx={{ my: 6, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    size="large"
                    onClick={() => navigate('/docs/integration')}
                    sx={{ borderRadius: 2 }}
                >
                    Integration Examples
                </Button>
            </Box>
        </Box>
    );
};
