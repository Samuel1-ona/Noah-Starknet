import React from 'react';
import {
    Box,
    Typography,
    Button,
    Container,
    Grid,
    Stack,
    alpha,
    useTheme
} from '@mui/material';
import { Hero } from './Hero';
import { ProcessFlow } from './ProcessFlow';

interface LandingPageProps {
    onLaunch: () => void;
    onOpenPitch: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunch, onOpenPitch }) => {
    const theme = useTheme();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', overflow: 'hidden' }}>
            <Hero onLaunchDemo={onLaunch} onOpenPitch={onOpenPitch} />

            <ProcessFlow />

            <Container maxWidth="lg" sx={{ py: 12 }}>
                <Grid container spacing={6} sx={{ mb: 8 }}>
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="h3" gutterBottom fontWeight="700">
                            Powerful Use Cases
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                            The infrastructure for building truly private, high-trust applications on Starknet.
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Stack spacing={4}>
                            {[
                                {
                                    title: "Gaming & Web3 E-Sports",
                                    desc: "Keep your leaderboards fair. Verify that each player is a unique human behind the keyboard, putting an end to multi-accounting and bots."
                                },
                                {
                                    title: "Consumer Applications",
                                    desc: "Age-gate your content or services effortlessly. Prove your user is over 18 without asking them to upload a photo of their ID card to your servers."
                                },
                                {
                                    title: "DeFi & RWA Platforms",
                                    desc: "Onboard users securely. Meet strict KYC requirements while preserving your users' on-chain privacy."
                                }
                            ].map((item) => (
                                <Box key={item.title}>
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Box sx={{ mt: 1, width: 8, height: 8, borderRadius: '50%', background: theme.palette.primary.main, flexShrink: 0 }} />
                                        <Box>
                                            <Typography variant="h6" fontWeight="600" gutterBottom>{item.title}</Typography>
                                            <Typography variant="body1" color="text.secondary">{item.desc}</Typography>
                                        </Box>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>
            </Container>

            <Box sx={{
                py: 10,
                textAlign: 'center',
                background: alpha(theme.palette.primary.main, 0.03),
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            }}>
                <Container maxWidth="sm">
                    <Typography variant="h4" gutterBottom fontWeight="700">
                        Ready to build the future of privacy?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        Get started with the Noah SDK today and join the movement for a more private Web3.
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={onLaunch}
                        sx={{ px: 6, py: 2, borderRadius: 4 }}
                    >
                        Get Started
                    </Button>
                </Container>
            </Box>

            <Box sx={{ py: 4, textAlign: 'center', opacity: 0.5 }}>
                <Typography variant="body2">
                    &copy; 2026 NOAH Protocol. Built with ❤️ for the Starknet ecosystem.
                </Typography>
            </Box>
        </Box>
    );
};
