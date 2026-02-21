import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Github, Zap } from 'lucide-react';
import { Box, Typography, Button, Container, Stack, alpha, useTheme } from '@mui/material';

interface HeroProps {
    onLaunchDemo: () => void;
    onOpenPitch: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onLaunchDemo, onOpenPitch }) => {
    const theme = useTheme();

    return (
        <Container maxWidth="xl" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 8, md: 10 }, position: 'relative' }}>
            {/* Background Glow */}
            <Box className="bg-glow" sx={{
                position: 'absolute',
                top: '-20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80%',
                height: '100%',
                background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
                filter: 'blur(100px)',
                zIndex: -1
            }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Typography variant="h1" sx={{
                        fontSize: { xs: '3rem', md: '5rem' },
                        fontWeight: 800,
                        lineHeight: 1.1,
                        marginBottom: '1.5rem',
                        letterSpacing: '-0.02em',
                        background: 'linear-gradient(90deg, #fff 0%, #64b5f6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        The Privacy Layer for <br />
                        <Typography component="span" variant="inherit" sx={{ color: theme.palette.primary.main, WebkitTextFillColor: 'initial' }}>
                            Starknet Identity
                        </Typography>
                    </Typography>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    style={{ marginBottom: '3rem' }}
                >
                    <Typography variant="h6" sx={{
                        color: 'text.secondary',
                        maxWidth: '650px',
                        lineHeight: 1.6,
                        fontWeight: 400
                    }}>
                        Securely verify your identity using Zero-Knowledge Proofs.
                        Verified once, reusable across Gaming, Consumer Apps, and DeFi on Starknet.
                    </Typography>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                        <Button
                            variant="contained"
                            size="large"
                            onClick={onLaunchDemo}
                            endIcon={<ArrowRight size={20} />}
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
                            onClick={onOpenPitch}
                            startIcon={<Zap size={18} />}
                            sx={{
                                px: 4,
                                borderRadius: 4,
                                borderColor: alpha(theme.palette.primary.main, 0.5),
                                color: theme.palette.primary.main,
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    background: alpha(theme.palette.primary.main, 0.05)
                                }
                            }}
                        >
                            View Pitch Deck
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            component="a"
                            href="https://github.com/Samuel1-ona/Noah-Starknet"
                            target="_blank"
                            startIcon={<Github size={20} />}
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
                            GitHub
                        </Button>
                    </Stack>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    style={{ marginTop: '5rem', width: '100%', maxWidth: '800px' }}
                >
                    <Box sx={{
                        padding: '2rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 6,
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.8)',
                        textAlign: 'left'
                    }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
                            <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary', fontFamily: 'monospace', opacity: 0.5 }}>
                                noah-starknet-sdk
                            </Typography>
                        </Stack>
                        <code style={{ color: '#fff', fontFamily: '"Fira Code", monospace', fontSize: '1.1rem' }}>
                            <span style={{ color: '#64b5f6' }}>npm install</span> noah-starknet
                        </code>
                    </Box>
                </motion.div>
            </Box>
        </Container>
    );
};
