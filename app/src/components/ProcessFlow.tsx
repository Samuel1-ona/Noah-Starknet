import React from 'react';
import { Box, Typography, Stack, alpha, useTheme, keyframes } from '@mui/material';
import {
    Badge as IdCardIcon,
    Public as LocationIcon,
    AccountBalance as BankIcon,
    Verified as VerifiedIcon,
    Security as PrivacyIcon,
    GppGood as ComplianceIcon,
    Fingerprint as FingerprintIcon,
    ArrowForward as ArrowIcon
} from '@mui/icons-material';

// Animations
const flowAnimation = keyframes`
  0% { opacity: 0.3; transform: translateX(0); }
  50% { opacity: 1; transform: translateX(10px); }
  100% { opacity: 0.3; transform: translateX(0); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(77, 182, 172, 0.4); }
  70% { box-shadow: 0 0 0 15px rgba(77, 182, 172, 0); }
  100% { box-shadow: 0 0 0 0 rgba(77, 182, 172, 0); }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

// Types
interface FlowItemProps {
    icon: React.ReactNode;
    label: string;
    delay?: number;
    color?: string;
}

// Styled specific item component
const FlowItem = ({ icon, label, delay = 0, color }: FlowItemProps) => {
    const theme = useTheme();
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 4,
                background: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.3s ease',
                animation: `${float} 6s ease-in-out infinite`,
                animationDelay: `${delay}s`,
                '&:hover': {
                    transform: 'translateX(5px)',
                    background: alpha(theme.palette.background.paper, 0.8),
                    borderColor: color || theme.palette.primary.main,
                    boxShadow: `0 8px 20px ${alpha(color || theme.palette.primary.main, 0.15)}`
                }
            }}
        >
            <Box sx={{
                p: 1.5,
                borderRadius: '50%',
                background: alpha(color || theme.palette.primary.main, 0.1),
                color: color || theme.palette.primary.main,
                display: 'flex'
            }}>
                {icon}
            </Box>
            <Typography variant="subtitle1" fontWeight="600" sx={{ color: '#fff' }}>
                {label}
            </Typography>
        </Box>
    );
};

export const ProcessFlow = () => {
    const theme = useTheme();

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 6, md: 4 },
            width: '100%',
            py: 4
        }}>

            {/* Left Column: Data Sources */}
            <Stack spacing={3} sx={{ flex: 1, width: '100%', maxWidth: 300 }}>
                <FlowItem
                    icon={<IdCardIcon />}
                    label="ID Card"
                    delay={0}
                    color="#29b6f6"
                />
                <FlowItem
                    icon={<LocationIcon />}
                    label="Location"
                    delay={1}
                    color="#42a5f5"
                />
                <FlowItem
                    icon={<BankIcon />}
                    label="Bank Account"
                    delay={2}
                    color="#64b5f6"
                />
            </Stack>

            {/* Center: Connection Arrows (Left) */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, color: alpha(theme.palette.text.secondary, 0.3) }}>
                <ArrowIcon sx={{ fontSize: 40, animation: `${flowAnimation} 2s infinite` }} />
            </Box>

            {/* Center: ZK Machine */}
            <Box sx={{
                position: 'relative',
                mx: 2
            }}>
                {/* Glow Effect */}
                <Box sx={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 200, height: 200,
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.2)} 0%, transparent 70%)`,
                    filter: 'blur(40px)',
                    zIndex: 0
                }} />

                {/* 3D-ish Block */}
                <Box sx={{
                    position: 'relative',
                    width: 220,
                    height: 220,
                    borderRadius: 8,
                    background: 'linear-gradient(145deg, rgba(30,30,30,0.9), rgba(10,10,10,0.95))',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: `0 20px 50px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.02)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                    backdropFilter: 'blur(20px)',
                    animation: `${pulseGlow} 3s infinite`
                }}>
                    <Box sx={{
                        width: 100, height: 100,
                        borderRadius: '50%',
                        background: `conic-gradient(from 0deg, transparent 0deg, ${theme.palette.primary.main} 360deg)`,
                        mb: 2,
                        p: '2px', // Border width
                        animation: 'spin 4s linear infinite', // Define spin globally or inline
                    }}>
                        <Box sx={{
                            width: '100%', height: '100%',
                            borderRadius: '50%',
                            background: '#121212',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <FingerprintIcon sx={{ fontSize: 60, color: theme.palette.primary.main }} />
                        </Box>
                    </Box>

                    <Typography variant="h6" fontWeight="700" sx={{ color: '#fff' }}>
                        ZK Proof
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Zero-Knowledge Circuit
                    </Typography>
                </Box>
            </Box>

            {/* Center: Connection Arrows (Right) */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, color: alpha(theme.palette.text.secondary, 0.3) }}>
                <ArrowIcon sx={{ fontSize: 40, animation: `${flowAnimation} 2s infinite`, animationDelay: '1s' }} />
            </Box>

            {/* Right Column: Verified Outputs */}
            <Stack spacing={3} sx={{ flex: 1, width: '100%', maxWidth: 300 }}>
                <FlowItem
                    icon={<VerifiedIcon />}
                    label="Verified Credential"
                    delay={0.5}
                    color="#00e676"
                />
                <FlowItem
                    icon={<PrivacyIcon />}
                    label="Privacy Preserved"
                    delay={1.5}
                    color="#69f0ae"
                />
                <FlowItem
                    icon={<ComplianceIcon />}
                    label="Compliance Approved"
                    delay={2.5}
                    color="#b9f6ca"
                />
            </Stack>

        </Box>
    );
};
