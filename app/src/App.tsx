import { useState, useEffect, useRef } from 'react';
import './App.css';
import { ProofState, ProofStateData } from './types';
import {
  BrowserStorage,
  NoahBlindedDataManager,
  NoahProofOrchestrator,
  NoahDataProvider,
  NoahEvent,
  NoahScanError,
  type NoahMRZDocument,
  type NoahJob,
  type NoahProverInputs,
} from 'noah-starknet';
import { RpcProvider, WalletAccount, type AccountInterface } from 'starknet';
import type { StarknetWindowObject } from '@starknet-io/get-starknet';

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
  Grid,
  TextField
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

const SAMPLE_TD3_MRZ =
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10';

const DEMO_MERKLE_PATH = Array.from({ length: 20 }, () => '0');
const DEMO_IS_LEFT = Array.from({ length: 20 }, () => false);
const SEPOLIA_RPC_URL =
  'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/gu3D3rKyivv6bhmb3UbyUSYxThLz7C_c';

function App() {
  const [proofState, setProofState] = useState<ProofStateData>({
    state: ProofState.Initial
  });
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [mrzDocument, setMrzDocument] = useState<NoahMRZDocument | null>(null);
  const [mrzExtracted, setMrzExtracted] = useState<string | null>(null);
  const [manualMrz, setManualMrz] = useState<string>('');
  const [preparedInputs, setPreparedInputs] = useState<NoahProverInputs | null>(null);
  const [lastJob, setLastJob] = useState<NoahJob | null>(null);
  const [inputSource, setInputSource] = useState<'image' | 'manual' | null>(null);
  const [orchestrator, setOrchestrator] = useState<NoahProofOrchestrator | null>(null);
  const [account, setAccount] = useState<AccountInterface | null>(null);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState<boolean>(false); // Prevent re-KYC
  const [pitchVisible, setPitchVisible] = useState<boolean>(false);
  const navigate = useNavigate();

  const currentStateRef = useRef<ProofState>(ProofState.Initial);

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

  const updateState = (newState: ProofState) => {
    currentStateRef.current = newState;
    setProofState({ state: newState, error: undefined });
  };

  const loadVk = async (): Promise<Uint8Array> => {
    const vkResponse = await fetch(vkUrl);
    const vkBuffer = await vkResponse.arrayBuffer();
    return new Uint8Array(vkBuffer);
  };

  const attachOrchestratorListeners = (orch: NoahProofOrchestrator) => {
    orch.on(NoahEvent.PROOF_GENERATION_START, () => updateState(ProofState.GeneratingProof));
    orch.on(NoahEvent.TRANSACTION_SUBMISSION_START, () => updateState(ProofState.SendingTransaction));
    orch.on(NoahEvent.TRANSACTION_SUBMISSION_SUCCESS, () => {
      updateState(ProofState.ProofVerified);
    });
    orch.on(NoahEvent.JOB_UPDATED, (job: NoahJob) => {
      setLastJob(job);
    });
    orch.on(NoahEvent.ERROR, (err: unknown) => handleError(err));
  };

  const getUserSecret = async () => {
    if (orchestrator) {
      return orchestrator.blindedData.getOrCreateSecret();
    }

    const blindedData = new NoahBlindedDataManager(new BrowserStorage());
    return blindedData.getOrCreateSecret();
  };

  const prepareInputsForDocument = async (
    provider: NoahDataProvider,
    document: NoahMRZDocument,
    targetUser?: string
  ) => {
    const userSecret = await getUserSecret();

    return provider.prepareFromNFC(
      { mrz: document.mrz, docType: document.docType },
      {
        merklePath: DEMO_MERKLE_PATH,
        isLeft: DEMO_IS_LEFT,
        userSecret,
        userAddress: targetUser,
      }
    );
  };

  const resetState = () => {
    currentStateRef.current = ProofState.Initial;
    setProofState({
      state: ProofState.Initial,
      error: undefined
    });
    setPassportImage(null);
    setMrzDocument(null);
    setMrzExtracted(null);
    setManualMrz('');
    setPreparedInputs(null);
    setLastJob(null);
    setInputSource(null);
  };

  useEffect(() => {
    let activeOrchestrator: NoahProofOrchestrator | null = null;

    const initApp = async () => {
      try {
        updateState(ProofState.Initial);

        const orch = await NoahProofOrchestrator.new({
          circuitArtifact: circuitArtifact as any,
          vk: await loadVk(),
          starknet: {
            network: 'sepolia' as const,
          }
        });

        attachOrchestratorListeners(orch);
        activeOrchestrator = orch;
        setOrchestrator(orch);
      } catch (err) {
        console.error('Failed to init Noah SDK:', err);
      }
    };

    void initApp();

    return () => {
      if (activeOrchestrator) {
        void activeOrchestrator.destroy();
      }
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const provider = new NoahDataProvider();

      try {
        updateState(ProofState.GeneratingWitness);
        const document = await provider.scanner.scanDocument(base64);
        const inputs = await prepareInputsForDocument(provider, document, account?.address);

        setPassportImage(base64);
        setMrzDocument(document);
        setMrzExtracted(document.mrz);
        setManualMrz(document.mrz);
        setPreparedInputs(inputs);
        setInputSource('image');
        updateState(ProofState.Initial);
      } catch (error) {
        if (error instanceof NoahScanError && (error as any).rawText) {
          setPassportImage(base64);
          setManualMrz((error as any).rawText);
          setInputSource('manual');
          setProofState({
            state: ProofState.Initial,
            error: `OCR detected some characters but validation failed: ${
              (error as any).message
            }. Please verify and correct the MRZ below.`
          });
        } else {
          handleError(error);
          setPassportImage(null); // Reset on error
        }
      } finally {
        await provider.destroy();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualMrz = async (value: string = manualMrz) => {
    const provider = new NoahDataProvider();

    try {
      updateState(ProofState.GeneratingWitness);
      const document = provider.scanner.parseMRZ(value);
      const inputs = await prepareInputsForDocument(provider, document, account?.address);

      setPassportImage(null);
      setMrzDocument(document);
      setMrzExtracted(document.mrz);
      setManualMrz(document.mrz);
      setPreparedInputs(inputs);
      setInputSource('manual');
      updateState(ProofState.Initial);
    } catch (error) {
      handleError(error);
    } finally {
      await provider.destroy();
    }
  };

  const handleLoadSampleMrz = () => {
    setManualMrz(SAMPLE_TD3_MRZ);
    void handleManualMrz(SAMPLE_TD3_MRZ);
  };

  const connectWalletAccount = async (wallet: StarknetWindowObject): Promise<AccountInterface> => {
    const legacyAccount = (wallet as any).account;
    if (legacyAccount?.address) {
      return legacyAccount as AccountInterface;
    }

    const rpcProvider = new RpcProvider({
      nodeUrl: SEPOLIA_RPC_URL,
      chainId: 'SN_SEPOLIA' as any
    });

    const connectedAccount = await WalletAccount.connect(
      rpcProvider,
      wallet as any,
      undefined,
      undefined,
      true
    );

    if (!connectedAccount?.address) {
      throw new Error('Wallet connected, but no Starknet account address was returned.');
    }

    return connectedAccount;
  };

  const handleConnectWallet = async () => {
    try {
      const { connect } = await import('@starknet-io/get-starknet');
      const wallet = await connect({
        modalMode: 'alwaysAsk',
        modalTheme: 'dark'
      });

      if (!wallet) {
        return;
      }

      const connectedAccount = await connectWalletAccount(wallet);

      setAccount(connectedAccount);
      console.log(`[Noah] Connected Account: ${connectedAccount.address}`);
      await initOrchestrator(connectedAccount);
    } catch (err) {
      console.error('[Noah] Failed to connect wallet:', err);
      handleError(err);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      const { disconnect } = await import('@starknet-io/get-starknet');
      await disconnect({ clearLastWallet: true });
    } catch (err) {
      console.warn('[Noah] Failed to fully disconnect wallet:', err);
    } finally {
      setAccount(null);
      await initOrchestrator();
    }
  };

  const initOrchestrator = async (connectedAccount?: AccountInterface) => {
    setIsAlreadyVerified(false);
    try {
      if (orchestrator) {
        await orchestrator.destroy();
      }

      const orch = await NoahProofOrchestrator.new({
        circuitArtifact: circuitArtifact as any,
        vk: await loadVk(),
        starknet: {
          network: 'sepolia' as const,
          account: connectedAccount,
        }
      });

      attachOrchestratorListeners(orch);

      setOrchestrator(orch);
      setPreparedInputs((currentInputs) => currentInputs ? ({
        ...currentInputs,
        user_address: connectedAccount?.address
      }) : currentInputs);

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
    if (!orchestrator || !preparedInputs) return;

    try {
      if (!account) {
        throw new Error('Connect a Starknet wallet before submitting the proof.');
      }

      await orchestrator.proveAndVerify({
        ...preparedInputs,
        user_address: account.address
      });
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
        <Route path="/" element={<LandingPage onLaunch={() => navigate('/verify')} onOpenPitch={() => setPitchVisible(true)} onReadDocs={() => navigate('/docs')} />} />

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
                    onDelete={() => { void handleDisconnectWallet(); }}
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
                          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto' }}>
                            Scan a real document photo or skip OCR and paste a normalized MRZ below. The app now uses the SDK to derive the circuit inputs locally before any on-chain step.
                          </Typography>
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

                      <Box sx={{
                        mt: 4,
                        p: 3,
                        borderRadius: 4,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        textAlign: 'left'
                      }}>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                          Quick SDK Test
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Paste a TD3, TD1, or TD2 MRZ to exercise the SDK without relying on OCR. The sample button loads the same passport string used in the SDK tests.
                        </Typography>
                        <TextField
                          value={manualMrz}
                          onChange={(event) => setManualMrz(event.target.value.toUpperCase())}
                          placeholder={SAMPLE_TD3_MRZ}
                          multiline
                          rows={4}
                          fullWidth
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              fontFamily: '"IBM Plex Mono", "SFMono-Regular", monospace',
                              background: 'rgba(0,0,0,0.2)'
                            }
                          }}
                        />
                        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                          <Button
                            variant="outlined"
                            onClick={() => void handleManualMrz()}
                            disabled={!manualMrz.trim()}
                          >
                            Use Pasted MRZ
                          </Button>
                          <Button variant="text" onClick={handleLoadSampleMrz}>
                            Load Sample MRZ
                          </Button>
                        </Box>
                      </Box>

                      {mrzDocument && preparedInputs && (
                        <Box sx={{ mt: 4, textAlign: 'left' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                            <Typography variant="h6" fontWeight="600">
                              SDK Inputs Ready
                            </Typography>
                            <Chip
                              label={inputSource === 'image' ? 'Photo Scan' : 'Manual MRZ'}
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                          <Grid container spacing={2}>
                            {[
                              { title: 'Document Format', value: mrzDocument.format },
                              { title: 'Birth Year', value: preparedInputs.birth_year.toString() },
                              { title: 'Expiry Date', value: preparedInputs.expiry_date.toString() },
                              { title: 'Merkle Root', value: `${String(preparedInputs.passport_root).slice(0, 10)}...${String(preparedInputs.passport_root).slice(-8)}` },
                            ].map((item) => (
                              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.title}>
                                <Box sx={{ p: 2, borderRadius: 3, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                  <Typography variant="caption" sx={{ textTransform: 'uppercase', opacity: 0.6, display: 'block', mb: 0.5 }}>
                                    {item.title}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {item.value}
                                  </Typography>
                                </Box>
                              </Grid>
                            ))}
                          </Grid>

                          <Paper sx={{ mt: 2, p: 2.5, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Typography variant="caption" sx={{ textTransform: 'uppercase', opacity: 0.6, display: 'block', mb: 1 }}>
                              Normalized MRZ
                            </Typography>
                            <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: '"IBM Plex Mono", "SFMono-Regular", monospace', fontSize: '0.85rem' }}>
                              {mrzExtracted}
                            </Box>
                          </Paper>
                        </Box>
                      )}

                      {preparedInputs && !account && proofState.state === ProofState.Initial && (
                        <Alert severity="info" sx={{ mt: 4, borderRadius: 3, textAlign: 'left' }}>
                          Local SDK inputs are ready. Connect a Starknet wallet to submit the proof on Sepolia.
                        </Alert>
                      )}

                      {/* Processing Indicator */}
                      {(proofState.state !== ProofState.Initial && proofState.state !== ProofState.ProofVerified) && (
                        <Box sx={{ my: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
                          <Typography variant="h6" fontWeight="600">
                            {proofState.state === ProofState.GeneratingWitness && "Preparing SDK Inputs..."}
                            {proofState.state === ProofState.GeneratingProof && "Generating Zero-Knowledge Proof..."}
                            {proofState.state === ProofState.SendingTransaction && "Verifying on Starknet..."}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            This calculates the Noir-compatible public inputs locally, then generates a zero-knowledge proof without revealing the raw passport data.
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
                          {lastJob?.transactionHash && (
                            <Typography variant="body2" sx={{ mt: 1.5, fontFamily: '"IBM Plex Mono", "SFMono-Regular", monospace' }}>
                              Tx: {lastJob.transactionHash}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* Actions */}
                      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {proofState.state === ProofState.Initial && (
                          <Button
                            variant="contained"
                            size="large"
                            onClick={startProcess}
                            disabled={!preparedInputs || !account}
                            sx={{
                              px: 6, py: 1.5, fontSize: '1.1rem',
                              background: (!preparedInputs || !account) ? 'rgba(255,255,255,0.1)' : undefined
                            }}
                          >
                            {account ? 'Verify Identity' : 'Connect Wallet to Verify'}
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
