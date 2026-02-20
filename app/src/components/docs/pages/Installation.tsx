import React from 'react';
import { Typography, Box, Divider, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { CodeBlock } from '../CodeBlock';

export const Installation: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
                Installation
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
                Getting started with Noah is incredibly fast. We provide a single NPM package that handles witness logic, proof generation, and smart contract orchestration.
            </Typography>

            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mt: 4 }}>
                1. Add the npm package
            </Typography>
            <Typography variant="body1" paragraph>
                Install the `noah-starknet` SDK via npm, yarn, or pnpm. This package is optimized for modern web browsers.
            </Typography>

            <CodeBlock
                language="bash"
                title="Terminal"
                code={`npm install noah-starknet`}
            />

            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mt: 6 }}>
                2. Setup Vite Polyfills (For React/Vue)
            </Typography>
            <Typography variant="body1" paragraph>
                Because Zero-Knowledge cryptography uses native Node.js streams and buffers, you will need to shim these for the browser. If you're using Vite, make sure `vite-plugin-node-polyfills` is installed and configured.
            </Typography>

            <CodeBlock
                language="typescript"
                title="vite.config.ts"
                code={`import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream'],
      globals: {
        Buffer: false,
        global: false,
        process: false,
      },
    })
  ]
});`}
            />

            <Divider sx={{ my: 6, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Typography variant="h5" fontWeight="bold" gutterBottom>
                You're ready!
            </Typography>
            <Typography variant="body1" paragraph>
                That's all the setup required. You can now start using `NoahProofOrchestrator` in your frontend application.
            </Typography>

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    size="large"
                    onClick={() => navigate('/docs/usage')}
                    sx={{ borderRadius: 2 }}
                >
                    Learn How To Use It
                </Button>
            </Box>
        </Box>
    );
};
