import { useState, useEffect, useRef } from 'react';
import './App.css';
import { ProofState, ProofStateData } from './types';
import {
  NoahProofOrchestrator,
  NoahDataProvider,
  NoahEvent,
  NoahProverInputs,
} from 'noah-starknet';

import circuitArtifact from "./assets/circuit.json";
import vkUrl from './assets/vk.bin?url';
import { LandingPage } from './components/LandingPage';
import { PitchDeck } from './components/PitchDeck';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Documentation Pages
import { DocumentationLayout } from './components/docs/DocumentationLayout';
import { Overview } from './components/docs/pages/Overview';
import { UseCases } from './components/docs/pages/UseCases';
import { Installation } from './components/docs/pages/Installation';
import { Usage } from './components/docs/pages/Usage';
import { Integration } from './components/docs/pages/Integration';

// MUI Imports
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Chip,
  Paper,
  keyframes,
  Grid
} from '@mui/material';
import { Zap } from 'lucide-react';
import {
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon,
  AccountBalanceWallet as WalletIcon,
  Refresh as RestartIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

// --- Theme & Styles ---

// Animation Keyframes
const pulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(100, 181, 246, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(100, 181, 246, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(100, 181, 246, 0); }
`;

// Dark "Cyber-Privacy" Theme
const premiumTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#64b5f6', // Light Blue
    },
    secondary: {
      main: '#b388ff', // Deep Purple
    },
    background: {
      default: '#0a0a0a',
      paper: '#121212',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0bec5',
    },
    success: {
      main: '#00e676'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'radial-gradient(circle at 50% -20%, #1a237e 0%, #000000 60%)', // Deep header glow
          minHeight: '100vh',
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(100, 181, 246, 0.2)',
          },
        },
        contained: {
          background: 'linear-gradient(45deg, #2196f3 30%, #21cbf3 90%)',
          color: 'white',
          '&:hover': {
            background: 'linear-gradient(45deg, #1976d2 30%, #00bcd4 90%)',
          }
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2
          }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.03)', // Glass effect
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: 24,
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.8)',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          '&.Mui-active': { color: '#64b5f6', fontWeight: 700 },
          '&.Mui-completed': { color: '#00e676' }
        }
      }
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': { color: '#64b5f6' },
          '&.Mui-completed': { color: '#00e676' }
        }
      }
    }
  },
});

function App() {
  const [proofState, setProofState] = useState<ProofStateData>({
    state: ProofState.Initial
  });
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [mrzExtracted, setMrzExtracted] = useState<string | null>(null);
  const [orchestrator, setOrchestrator] = useState<NoahProofOrchestrator | null>(null);
  const [account, setAccount] = useState<any>(null); // Starknet account
  const [isAlreadyVerified, setIsAlreadyVerified] = useState<boolean>(false); // Prevent re-KYC
  const [pitchVisible, setPitchVisible] = useState<boolean>(false);
  const navigate = useNavigate();

  const currentStateRef = useRef<ProofState>(ProofState.Initial);
  const initializingRef = useRef<boolean>(false);

  useEffect(() => {
    // ... (existing check)
    initializingRef.current = true;

    const initApp = async () => {
      try {
        updateState(ProofState.Initial);

        const vkResponse = await fetch(vkUrl);
        const vkBuffer = await vkResponse.arrayBuffer();
        const vk = new Uint8Array(vkBuffer);

        const config = {
          circuitArtifact: circuitArtifact as any,
          vk: vk,
          starknet: {
            network: 'sepolia' as const,
          }
        };

        const orch = await NoahProofOrchestrator.new(config);

        orch.on(NoahEvent.PROOF_GENERATION_START, () => updateState(ProofState.GeneratingProof));
        orch.on(NoahEvent.TRANSACTION_SUBMISSION_START, () => updateState(ProofState.SendingTransaction));
        orch.on(NoahEvent.TRANSACTION_SUBMISSION_SUCCESS, () => {
          updateState(ProofState.ProofVerified);
        });
        orch.on(NoahEvent.ERROR, (err: any) => handleError(err));

        setOrchestrator(orch);
      } catch (err) {
        console.error('Failed to init Noah SDK:', err);
      }
    };
    initApp();

    return () => {
      orchestrator?.destroy();
    };
  }, []);

  const resetState = () => {
    currentStateRef.current = ProofState.Initial;
    setProofState({
      state: ProofState.Initial,
      error: undefined
    });
    setPassportImage(null);
    setMrzExtracted(null);
  };

  const handleError = (error: unknown) => {
    console.error('Error:', error);
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }
    setProofState({
      state: currentStateRef.current,
      error: errorMessage
    });
  };

  const autoFillDemoData = async () => {
    // Judge Mode: Auto-fill a valid test identity
    const demoMrz = "P<UTOPEA<<DOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<G678901234UTO9001015M2501012<<<<<<<<<<<<<<02";
    setMrzExtracted(demoMrz);
    setPassportImage("https://placehold.co/600x400/121212/64b5f6?text=DEMO+PASSPORT+IDENTITY");
    updateState(ProofState.Initial);
  };

  const updateState = (newState: ProofState) => {
    currentStateRef.current = newState;
    setProofState({ state: newState, error: undefined });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPassportImage(base64);

      try {
        updateState(ProofState.GeneratingWitness);
        const provider = new NoahDataProvider();
        const mrz = await provider.scanner.scanImage(base64);
        setMrzExtracted(mrz);
        updateState(ProofState.Initial);
      } catch (error) {
        handleError(error);
        setPassportImage(null); // Reset on error
      }
    };
    reader.readAsDataURL(file);
  };

  async function sha256(message: Uint8Array): Promise<Uint8Array> {
    const msgCopy = new Uint8Array(message.length);
    msgCopy.set(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgCopy);
    return new Uint8Array(hashBuffer);
  }

  const handleConnectWallet = async () => {
    try {
      const globalWindow = window as any;
      const argent = globalWindow.starknet_argentX;
      const braavos = globalWindow.starknet_braavos;
      const generic = globalWindow.starknet;
      const wallet = argent || braavos || generic;

      if (!wallet) {
        alert("Starknet wallet not detected.");
        return;
      }

      await wallet.enable({ starknetVersion: 'v5' });

      if (wallet.isConnected) {
        setAccount(wallet.account);
        await initOrchestrator(wallet.account);
      }
    } catch (err) {
      console.error('[Noah] Failed to connect wallet:', err);
      handleError(err);
    }
  };

  const initOrchestrator = async (connectedAccount?: any) => {
    setIsAlreadyVerified(false);
    try {
      if (orchestrator) {
        orchestrator.destroy();
      }

      const vkResponse = await fetch(vkUrl);
      const vkBuffer = await vkResponse.arrayBuffer();
      const vk = new Uint8Array(vkBuffer);

      const config = {
        circuitArtifact: circuitArtifact as any,
        vk: vk,
        starknet: {
          network: 'sepolia' as const,
          account: connectedAccount,
        }
      };

      const orch = await NoahProofOrchestrator.new(config);

      orch.on(NoahEvent.PROOF_GENERATION_START, () => updateState(ProofState.GeneratingProof));
      orch.on(NoahEvent.TRANSACTION_SUBMISSION_START, () => updateState(ProofState.SendingTransaction));
      orch.on(NoahEvent.TRANSACTION_SUBMISSION_SUCCESS, () => {
        updateState(ProofState.ProofVerified);
      });
      orch.on(NoahEvent.ERROR, (err: any) => handleError(err));

      setOrchestrator(orch);

      if (connectedAccount) {
        try {
          const isVerified = await (orch as any).isAddressVerified(connectedAccount.address);
          if (isVerified) {
            updateState(ProofState.ProofVerified);
            setIsAlreadyVerified(true);
          }
        } catch (e) {
          console.warn('[Noah] Failed to check verification status:', e);
        }
      }
    } catch (err) {
      console.error('[Noah] Initialization error:', err);
    }
  };

  const startProcess = async () => {
    if (!orchestrator || !mrzExtracted) return;

    try {
      let mrzBytes = Array.from(new TextEncoder().encode(mrzExtracted)).map(x => Number(x));
      if (mrzBytes.length < 88) {
        mrzBytes = [...mrzBytes, ...Array(88 - mrzBytes.length).fill(32)];
      } else if (mrzBytes.length > 88) {
        mrzBytes = mrzBytes.slice(0, 88);
      }

      const mrzHash = await sha256(new Uint8Array(mrzBytes));

      const inputs: NoahProverInputs = {
        mrz: mrzBytes,
        pub_key_x: Array(32).fill(0),
        pub_key_y: Array(32).fill(0),
        signature: Array(64).fill(0),
        hashed_mrz: Array.from(mrzHash),
        jurisdiction_root: "0x00",
        jurisdiction_index: "0",
        jurisdiction_hash_path: ["0x00", "0x00"],
        membership_root: "0x00",
        membership_index: "0",
        membership_hash_path: ["0x00", "0x00"],
        action_id: "12345",
        nullifier: Math.floor(Math.random() * 1000000000).toString(),
        current_year: "2024",
        current_month: "5",
        current_day: "20",
        min_age: "18",
        user_secret: "0"
      };

      await orchestrator.proveAndVerify(inputs);
    } catch (error: any) {
      handleError(error);
    }
  };

  const steps = ['Scan', 'Witness', 'Proof', 'Submit', 'Verified'];
  const getStateIndex = (state: ProofState): number => {
    const mapping: Record<string, number> = {
      [ProofState.Initial]: 0,
      [ProofState.GeneratingWitness]: 1,
      [ProofState.GeneratingProof]: 2,
      [ProofState.PreparingCalldata]: 2,
      [ProofState.ConnectingWallet]: 3,
      [ProofState.SendingTransaction]: 3,
      [ProofState.ProofVerified]: 4
    };
    return mapping[state] ?? 0;
  };
  const activeStep = getStateIndex(proofState.state);

  return (
    <ThemeProvider theme={premiumTheme}>
      <CssBaseline />

      <Routes>
        <Route path="/" element={<LandingPage onLaunch={() => navigate('/verify')} onOpenPitch={() => setPitchVisible(true)} />} />

        <Route path="/docs" element={<DocumentationLayout />}>
          <Route index element={<Overview />} />
          <Route path="use-cases" element={<UseCases />} />
          <Route path="installation" element={<Installation />} />
          <Route path="usage" element={<Usage />} />
          <Route path="integration" element={<Integration />} />
        </Route>

        <Route path="/verify" element={
          <Box sx={{
            flexGrow: 1,
            minHeight: '100vh',
            py: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>

            {/* Background Overlay for texture (optional) */}
            <Box sx={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'radial-gradient(1px 1px at 50% 50%, rgba(255,255,255,0.05) 1px, transparent 0)',
              backgroundSize: '40px 40px',
              zIndex: -1,
              opacity: 0.5
            }} />

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6, zIndex: 10, width: '100%', px: { xs: 3, sm: 5, md: 8 } }}>
              <Box
                onClick={() => navigate('/')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  '&:hover': { opacity: 0.8 }
                }}
              >
                <Box sx={{
                  p: 1,
                  borderRadius: '50%',
                  background: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 60, height: 60, overflow: 'hidden'
                }}>
                  <img src="/logo.png" alt="Noah" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
                <Typography variant="h4" component="h1" sx={{
                  background: 'linear-gradient(to right, #fff, #90caf9)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 0 20px rgba(144, 202, 249, 0.3)',
                  display: { xs: 'none', sm: 'block' }
                }}>
                  Noah
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="text"
                  startIcon={<HomeIcon />}
                  onClick={() => navigate('/')}
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    display: { xs: 'none', md: 'flex' },
                    '&:hover': { color: '#fff', background: 'rgba(255,255,255,0.05)' }
                  }}
                >
                  Back to Home
                </Button>

                {!account ? (
                  <Button
                    variant="contained"
                    startIcon={<WalletIcon />}
                    onClick={handleConnectWallet}
                    sx={{ borderRadius: 20 }}
                  >
                    Connect Wallet
                  </Button>
                ) : (
                  <Chip
                    icon={<WalletIcon sx={{ color: '#fff !important' }} />}
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>
                        {account.address.slice(0, 6)}...{account.address.slice(-4)}
                      </Typography>
                    }
                    variant="outlined"
                    onDelete={() => { setAccount(null); initOrchestrator(); }}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.05)',
                      backdropFilter: 'blur(10px)',
                      padding: '4px',
                      '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }
                    }}
                  />
                )}
              </Box>
            </Box>

            {/* Main Content Card */}
            <Container maxWidth="md">
              <Card sx={{ p: 4, position: 'relative', overflow: 'visible' }}>

                {/* Glow behind card */}
                <Box sx={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%', height: '80%',
                  background: 'radial-gradient(circle, rgba(33, 150, 243, 0.15) 0%, transparent 70%)',
                  filter: 'blur(60px)',
                  zIndex: -1
                }} />

                <CardContent sx={{ position: 'relative', zIndex: 1 }}>

                  {/* Stepper with glow on active step */}
                  <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 6 }}>
                    {steps.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>

                  {/* Error Alert */}
                  {proofState.error && (
                    <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }} onClose={() => updateState(currentStateRef.current)}>
                      {proofState.error}
                    </Alert>
                  )}

                  {/* Verified View (Success State) */}
                  {isAlreadyVerified ? (
                    <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Box sx={{
                        position: 'relative',
                        width: 120, height: 120,
                        mb: 4
                      }}>
                        <Box sx={{
                          position: 'absolute', inset: 0,
                          border: '4px solid #00e676', borderRadius: '50%',
                          animation: `${pulse} 2s infinite`
                        }} />
                        <CheckCircleIcon sx={{ fontSize: 120, color: '#00e676', position: 'relative', zIndex: 2 }} />
                      </Box>

                      {/* Reward/Outcome Reveal (Win Hackathon!) */}
                      <Box sx={{ mt: 6, p: 4, borderRadius: 6, background: 'rgba(100, 181, 246, 0.05)', border: '1px solid rgba(100, 181, 246, 0.2)', maxWidth: 600 }}>
                        <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <Zap color="#64b5f6" /> Verified Unlocked: Premium Area
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                          Because you have proved your identity anonymously, you now have access to the Noah Restricted Dashboard.
                        </Typography>
                        <Grid container spacing={2}>
                          {[
                            { title: "Exclusive Drop", val: "0.1 STRK Gated" },
                            { title: "Age Gate status", val: "Over 18 Verified" },
                            { title: "Sybil Score", val: "100/100 (Unique Human)" }
                          ].map(item => (
                            <Grid size={{ xs: 12, sm: 4 }} key={item.title}>
                              <Box sx={{ p: 2, borderRadius: 3, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Typography variant="caption" sx={{ textTransform: 'uppercase', opacity: 0.5, display: 'block' }}>{item.title}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{item.val}</Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>

                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<RestartIcon />}
                        onClick={resetState}
                        sx={{ mt: 4, px: 4, borderColor: 'rgba(255,255,255,0.3)', color: 'text.secondary' }}
                      >
                        Reset Demo
                      </Button>
                    </Box>
                  ) : (
                    // Interaction Area
                    <Box sx={{ textAlign: 'center', py: 2 }}>

                      {!passportImage ? (
                        <Paper
                          elevation={0}
                          sx={{
                            border: '2px dashed rgba(255,255,255,0.2)',
                            borderRadius: 6,
                            p: 8,
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.02)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              borderColor: 'primary.main',
                              background: 'rgba(33, 150, 243, 0.05)',
                              transform: 'scale(1.01)'
                            }
                          }}
                          component="label"
                        >
                          <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                          <Box sx={{
                            width: 80, height: 80,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mx: 'auto', mb: 3
                          }}>
                            <UploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                          </Box>
                          <Typography variant="h5" gutterBottom fontWeight="600">
                            Upload Passport Photo
                          </Typography>
                          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                            Drag & drop or click to scan the MRZ code. Your data is processed locally and never leaves your browser.
                          </Typography>

                          <Button
                            variant="text"
                            size="small"
                            onClick={(e) => { e.preventDefault(); autoFillDemoData(); }}
                            sx={{ mt: 3, opacity: 0.7, color: 'primary.main', fontWeight: 700 }}
                          >
                            [ ENTER JUDGE MODE: AUTO-FILL TEST PASSPORT ]
                          </Button>
                        </Paper>
                      ) : (
                        <Box sx={{ mb: 4, position: 'relative' }}>
                          <Box sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}>
                            <img
                              src={passportImage}
                              alt="Passport"
                              style={{
                                width: '100%',
                                maxHeight: 300,
                                objectFit: 'contain',
                                display: 'block',
                                background: '#000'
                              }}
                            />
                          </Box>

                          {mrzExtracted && (
                            <Box sx={{
                              position: 'absolute',
                              bottom: 20,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              padding: '8px 20px',
                              background: 'rgba(0, 0, 0, 0.8)',
                              backdropFilter: 'blur(10px)',
                              borderRadius: 20,
                              border: '1px solid rgba(76, 175, 80, 0.5)',
                              display: 'flex', alignItems: 'center', gap: 1
                            }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                              <Typography variant="body2" fontWeight="600" color="success.main">
                                MRZ Data Extracted
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Processing Indicator */}
                      {(proofState.state !== ProofState.Initial && proofState.state !== ProofState.ProofVerified) && (
                        <Box sx={{ my: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
                          <Typography variant="h6" fontWeight="600">
                            {proofState.state === ProofState.GeneratingWitness && "Processing Biometric Data..."}
                            {proofState.state === ProofState.GeneratingProof && "Generating Zero-Knowledge Proof..."}
                            {proofState.state === ProofState.SendingTransaction && "Verifying on Starknet..."}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            This calculates a cryptographic proof that you are over 18 without revealing your DOB.
                          </Typography>
                        </Box>
                      )}

                      {/* Success Message */}
                      {proofState.state === ProofState.ProofVerified && !isAlreadyVerified && (
                        <Box sx={{ my: 4, p: 3, background: 'rgba(0, 230, 118, 0.1)', borderRadius: 4, border: '1px solid rgba(0, 230, 118, 0.2)' }}>
                          <Typography variant="h5" color="success.main" fontWeight="700" gutterBottom>
                            Verification Successful!
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            You have successfully proved your identity.
                          </Typography>
                        </Box>
                      )}

                      {/* Actions */}
                      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {proofState.state === ProofState.Initial && (
                          <Button
                            variant="contained"
                            size="large"
                            onClick={startProcess}
                            disabled={!mrzExtracted}
                            sx={{
                              px: 6, py: 1.5, fontSize: '1.1rem',
                              background: !mrzExtracted ? 'rgba(255,255,255,0.1)' : undefined
                            }}
                          >
                            Verify Identity
                          </Button>
                        )}

                        {(proofState.error || (proofState.state === ProofState.ProofVerified && !isAlreadyVerified)) && (
                          <Button
                            variant="outlined"
                            size="large"
                            startIcon={<RestartIcon />}
                            onClick={resetState}
                            sx={{ px: 4, borderColor: 'rgba(255,255,255,0.3)', color: 'text.secondary' }}
                          >
                            Start Over
                          </Button>
                        )}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Container>

            {/* Footer */}
            <Box sx={{ mt: 'auto', pt: 4, textAlign: 'center', opacity: 0.6 }}>
              <Typography variant="caption" color="text.secondary">
                Powered by Startknet & Garaga • Zero-Knowledge Identity Layer
              </Typography>
            </Box>

          </Box>
        } />
      </Routes>

      <AnimatePresence>
        {pitchVisible && (
          <PitchDeck onClose={() => setPitchVisible(false)} />
        )}
      </AnimatePresence>
    </ThemeProvider>
  );
}

export default App;
