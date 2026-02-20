import React from 'react';
import { Typography, Box, Grid, Card, CardContent, Divider, Button } from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

export const UseCases: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
                Use Cases
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 6 }}>
                Identity isn't just about banks anymore. Web3 and modern consumer apps need proof of humanity and compliance without the friction. Here is what you can build with Noah.
            </Typography>

            <Grid container spacing={4}>
                {/* Gaming & Web3 E-Sports */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }}>
                        <CardContent sx={{ p: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 80, height: 80, borderRadius: 4, background: 'rgba(179, 136, 255, 0.1)' }}>
                                <SportsEsportsIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight="bold" gutterBottom>
                                    Gaming & Web3 E-Sports
                                </Typography>
                                <Typography variant="body1" paragraph>
                                    Keep your leaderboards fair. Prevent multi-accounting and botting in your competitive games or airdrop campaigns.
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    By using Noah's "Unique Humanity" circuit, you can mathematically guarantee that one wallet equals one real human, entirely anonymously. Gamers won't have to upload their driver's licenses to a gaming server they don't trust.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Consumer Applications & Age-Gating */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }}>
                        <CardContent sx={{ p: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 80, height: 80, borderRadius: 4, background: 'rgba(33, 150, 243, 0.1)' }}>
                                <ShoppingBagIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight="bold" gutterBottom>
                                    Consumer Apps & Age-Gating
                                </Typography>
                                <Typography variant="body1" paragraph>
                                    Age-gate your content, adult services, or restricted products effortlessly without storing a single date of birth.
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    The Noah ZK circuit proves "Age {'>'} 18" or "Age {'>'} 21". Your smart contract instantly verifies this binary true/false statement, totally removing the liability of storing PII (Personally Identifiable Information).
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* DeFi Onboarding */}
                <Grid size={{ xs: 12 }}>
                    <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4 }}>
                        <CardContent sx={{ p: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 80, height: 80, borderRadius: 4, background: 'rgba(0, 230, 118, 0.1)' }}>
                                <AccountBalanceIcon sx={{ fontSize: 40, color: 'success.main' }} />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight="bold" gutterBottom>
                                    DeFi & RWA Platforms
                                </Typography>
                                <Typography variant="body1" paragraph>
                                    Onboard users securely and meet jurisdictional compliance requirements while strictly maintaining on-chain privacy.
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Verify that users are not from restricted jurisdictions (e.g., US citizens for certain token offerings) by proving their passport's issuing country against a Merkle Tree of allowed regions.
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Divider sx={{ my: 6, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    size="large"
                    onClick={() => navigate('/docs/installation')}
                    sx={{ borderRadius: 2 }}
                >
                    Let's Install the SDK
                </Button>
            </Box>
        </Box>
    );
};
