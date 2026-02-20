import React from 'react';
import { Typography, Box, Paper, Divider, Button } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

export const Overview: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
                Welcome to Noah
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4, lineHeight: 1.6 }}>
                Noah is a Zero-Knowledge Identity Layer for Starknet. It lets you prove facts about your users—like their age, humanity, or jurisdiction—without ever touching or storing their sensitive personal data.
            </Typography>

            <Paper sx={{ p: 4, mb: 6, background: 'rgba(33, 150, 243, 0.05)', border: '1px solid rgba(33, 150, 243, 0.2)', borderRadius: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom color="primary.main">
                    Why developers love Noah
                </Typography>
                <Typography variant="body1" paragraph>
                    Traditional KYC is a nightmare for developers. It requires managing secure servers, complying with strict data privacy laws (like GDPR), and absorbing the massive liability of holding user data.
                </Typography>
                <Typography variant="body1" paragraph>
                    Noah changes this. We use the NFC chip inside a user’s e-Passport and a cryptographic concept called Zero-Knowledge Proofs (ZKPs) to verify the data locally on the user's phone.
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    You only receive the cryptographic absolute truth (e.g., "User is over 18"), not the data itself.
                </Typography>
            </Paper>

            <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Typography variant="h5" fontWeight="bold" gutterBottom>
                How it works
            </Typography>
            <Typography variant="body1" paragraph>
                1. <strong>Scan:</strong> The user scans the MRZ (Machine Readable Zone) of their e-Passport using their mobile device or webcam.
            </Typography>
            <Typography variant="body1" paragraph>
                2. <strong>Prove:</strong> The Noah SDK runs complex cryptographic circuits locally in the browser to prove the passport is valid and extracts only the required claims (e.g., minimum age).
            </Typography>
            <Typography variant="body1" paragraph>
                3. <strong>Verify:</strong> A tiny, anonymous proof is generated and sent to your Starknet Smart Contract, which verifies it mathematically in milliseconds.
            </Typography>

            <Box sx={{ mt: 6, display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    size="large"
                    onClick={() => navigate('/docs/use-cases')}
                    sx={{ borderRadius: 2 }}
                >
                    See Use Cases
                </Button>
            </Box>
        </Box>
    );
};
