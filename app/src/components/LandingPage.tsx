import {
    Container,
    Typography,
    Button,
    Box,
    Grid,
    Card,
    CardContent,
    Stack,
    useTheme,
    alpha,
    Chip
} from '@mui/material';
import {
    Security as PrivacyIcon,
    Bolt as FastIcon,
    Lock as SecureIcon,
    GitHub as GitHubIcon,
    RocketLaunch as RocketIcon,
    ContentCopy as ContentCopyIcon,
    MenuBook as MenuBookIcon
} from '@mui/icons-material';
import { ProcessFlow } from './ProcessFlow';
import { Link } from 'react-router-dom';

interface LandingPageProps {
    onLaunch: () => void;
}

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <Card sx={{
        height: '100%',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 4,
        transition: 'transform 0.3s ease, border-color 0.3s ease',
        '&:hover': {
            transform: 'translateY(-8px)',
            borderColor: 'primary.main',
            background: 'rgba(255,255,255,0.05)',
        }
    }}>
        <CardContent sx={{ p: 4 }}>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2,
                background: 'rgba(100, 181, 246, 0.1)',
                mb: 2,
                color: 'primary.main'
            }}>
                <Icon />
            </Box>
            <Typography variant="h6" gutterBottom fontWeight="700">
                {title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {description}
            </Typography>
        </CardContent>
    </Card>
);

export const LandingPage = ({ onLaunch }: LandingPageProps) => {
    const theme = useTheme();

    return (
        <Box sx={{ overflowX: 'hidden' }}>
            {/* Hero Section */}
            <Container maxWidth="xl" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 8, md: 10 } }}>
                <Grid container spacing={4} alignItems="center" sx={{ mb: 8 }}>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Box sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                            <Chip
                                label="Live on Starknet Sepolia"
                                color="primary"
                                variant="outlined"
                                size="small"
                                sx={{ mb: 3, borderRadius: 2, borderColor: alpha(theme.palette.primary.main, 0.3), background: alpha(theme.palette.primary.main, 0.05) }}
                            />
                            <Typography variant="h1" sx={{
                                background: 'linear-gradient(90deg, #fff 0%, #64b5f6 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 2,
                                fontSize: { xs: '2.5rem', md: '5rem' },
                                lineHeight: 1.1,
                                fontWeight: 800
                            }}>
                                Noah
                            </Typography>
                            <Typography variant="h2" sx={{
                                fontSize: { xs: '1.8rem', md: '3rem' },
                                fontWeight: 700,
                                color: theme.palette.text.secondary,
                                mb: 3
                            }}>
                                Identity Verified. <span style={{ color: theme.palette.primary.main }}>Privacy Preserved.</span>
                            </Typography>
                            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: { xs: 'auto', md: 0 }, lineHeight: 1.6, fontWeight: 400, mb: 6 }}>
                                A privacy-first identity layer for Starknet. Prove facts about yourself like age or residency using your physical e-Passport **without revealing personal data** to the blockchain.
                            </Typography>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent={{ xs: 'center', md: 'flex-start' }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={onLaunch}
                                    startIcon={<RocketIcon />}
                                    sx={{
                                        px: 5,
                                        py: 1.8,
                                        fontSize: '1.1rem',
                                        borderRadius: 4,
                                        boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
                                    }}
                                >
                                    Launch Demo
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    component="a"
                                    href="https://github.com/Samuel1-ona/Noah-Starknet"
                                    target="_blank"
                                    startIcon={<GitHubIcon />}
                                    sx={{
                                        px: 4,
                                        borderRadius: 4,
                                        borderColor: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        '&:hover': {
                                            borderColor: 'white',
                                            background: 'rgba(255,255,255,0.05)'
                                        }
                                    }}
                                >
                                    View GitHub
                                </Button>
                                <Button
                                    variant="text"
                                    size="large"
                                    component={Link}
                                    to="/docs"
                                    startIcon={<MenuBookIcon />}
                                    sx={{
                                        px: 3,
                                        color: 'rgba(255,255,255,0.7)',
                                        '&:hover': {
                                            color: '#fff',
                                            background: 'rgba(255,255,255,0.05)'
                                        }
                                    }}
                                >
                                    Read Docs
                                </Button>
                            </Stack>

                            <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                                <Box
                                    onClick={() => navigator.clipboard.writeText('npm install noah-starknet')}
                                    sx={{
                                        py: 1.5,
                                        px: 3,
                                        borderRadius: 2,
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            background: 'rgba(255,255,255,0.05)',
                                            borderColor: theme.palette.primary.main,
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <Typography sx={{ fontFamily: 'monospace', color: theme.palette.primary.light, fontWeight: 600 }}>
                                        npm install noah-starknet
                                    </Typography>
                                    <ContentCopyIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                </Box>
                            </Box>
                        </Box>
                    </Grid>

                    <Grid size={{ xs: 12, md: 5 }} sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
                        <Box
                            component="img"
                            src="/logo.png"
                            alt="Noah Logo"
                            sx={{
                                width: '100%',
                                maxWidth: 400,
                                height: 'auto',
                                filter: `drop-shadow(0 0 40px ${alpha(theme.palette.primary.main, 0.4)})`,
                                animation: 'pulse 3s infinite ease-in-out',
                                '@keyframes pulse': {
                                    '0%': { transform: 'scale(1)' },
                                    '50%': { transform: 'scale(1.05)' },
                                    '100%': { transform: 'scale(1)' }
                                }
                            }}
                        />
                    </Grid>
                </Grid>

                {/* Process Flow Visualization */}
                <Box sx={{ mt: 4 }}>
                    <ProcessFlow />
                </Box>

            </Container>

            {/* Why Noah Section */}
            <Box sx={{ background: 'rgba(255,255,255,0.01)', py: 10, borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Container maxWidth="lg">
                    <Typography variant="h3" align="center" gutterBottom fontWeight="700">
                        Why Noah?
                    </Typography>
                    <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6, maxWidth: 800, mx: 'auto' }}>
                        Traditional KYC creates honeypots of sensitive data. Noah uses Zero-Knowledge Proofs to bridge the physical and digital worlds securely.
                    </Typography>

                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FeatureCard
                                icon={PrivacyIcon}
                                title="Privacy-First"
                                description="Your passport stays in your hand. Only a mathematical proof is sent to the blockchain."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FeatureCard
                                icon={SecureIcon}
                                title="Stop Data Leaks"
                                description="Eliminate the risk of centralized server hacks by never sharing your raw Identity documents."
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FeatureCard
                                icon={FastIcon}
                                title="Instant Verification"
                                description="Fast, on-chain verification powered by Starknet and Garaga optimized SNARKs."
                            />
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            {/* Use Cases Section */}
            <Container maxWidth="lg" sx={{ py: 12 }}>
                <Grid container spacing={4} alignItems="center" sx={{ mb: 8 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="h3" gutterBottom fontWeight="700">
                            Powerful Use Cases
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                            The infrastructure for building truly private, high-trust applications on Starknet.
                        </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Grid container spacing={2}>
                            {[
                                "Private Age Gating",
                                "Sybil-Resistant Airdrops",
                                "Anonymous Voting",
                                "Jurisdiction Compliance",
                                "Bot Prevention",
                                "On-chain Proof of Personhood"
                            ].map((item) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={item}>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: theme.palette.primary.main }} />
                                        <Typography variant="body1" fontWeight="500">{item}</Typography>
                                    </Stack>
                                </Grid>
                            ))}
                        </Grid>
                    </Grid>
                </Grid>

                {/* Tech Stack */}
                <Box sx={{
                    p: 6,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, rgba(26, 35, 126, 0.2) 0%, rgba(0, 0, 0, 0.4) 100%)',
                    border: '1px solid rgba(100, 181, 246, 0.1)'
                }}>
                    <Typography variant="h5" gutterBottom fontWeight="700" align="center">
                        How it Works
                    </Typography>
                    <Grid container spacing={4} sx={{ mt: 2 }}>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="subtitle1" color="primary.main" fontWeight="700" gutterBottom>
                                01. Scanning
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Scan your passport MRZ code or NFC chip locally. All data stays encrypted on your device.
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="subtitle1" color="primary.main" fontWeight="700" gutterBottom>
                                02. Proving
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Generate a ZK proof locally in your browser using Noir and bb.js. No private info is revealed.
                            </Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 4 }}>
                            <Typography variant="subtitle1" color="primary.main" fontWeight="700" gutterBottom>
                                03. Verifying
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Submit the proof to our Starknet contracts. If valid, you are verified instantly and anonymously.
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>
            </Container>

            {/* Footer */}
            <Box sx={{ py: 6, textAlign: 'center', opacity: 0.6 }}>
                <Typography variant="caption" color="text.secondary">
                    Powered by Noah Starknet • Built with ❤️ using Starknet, Noir, and Garaga
                </Typography>
            </Box>
        </Box>
    );
};
