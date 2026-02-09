import { useState, useEffect, useRef } from 'react'
import './App.css'
import { ProofState, ProofStateData } from './types'
import {
  NoahProofOrchestrator,
  NoahDataProvider,
  NoahEvent,
  NoahProverInputs,
} from 'noah-sdk';

import circuitArtifact from "./assets/circuit.json";



import vkUrl from './assets/vk.bin?url';

function App() {
  const [proofState, setProofState] = useState<ProofStateData>({
    state: ProofState.Initial
  });
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [mrzExtracted, setMrzExtracted] = useState<string | null>(null);
  const [orchestrator, setOrchestrator] = useState<NoahProofOrchestrator | null>(null);
  const [account, setAccount] = useState<any>(null); // Starknet account

  // Use a ref to reliably track the current state across asynchronous operations
  const currentStateRef = useRef<ProofState>(ProofState.Initial);
  const initializingRef = useRef<boolean>(false);

  // Initialize SDK and WASM on mount
  useEffect(() => {
    // ... (existing check)
    initializingRef.current = true;

    const initApp = async () => {
      try {
        console.log('Initializing Noah SDK...');
        updateState(ProofState.Initial);

        console.log('Fetching VK from assets...');
        const vkResponse = await fetch(vkUrl);
        const vkBuffer = await vkResponse.arrayBuffer();
        const vk = new Uint8Array(vkBuffer);

        console.log('Initializing Orchestrator with pre-loaded VK...');

        const config = {
          circuitArtifact: circuitArtifact as any,
          vk: vk, // Pass the loaded VK
          starknet: {

            providerUrl: import.meta.env.VITE_STARKNET_PROVIDER_URL,
            registryAddress: import.meta.env.VITE_STARKNET_REGISTRY_ADDRESS,
            accountAddress: import.meta.env.VITE_STARKNET_ACCOUNT_ADDRESS,
            // privateKey: import.meta.env.VITE_STARKNET_PRIVATE_KEY
          }
        };

        console.log('Creating orchestrator...');
        const orch = await NoahProofOrchestrator.new(config);
        console.log('Orchestrator created successfully!');

        orch.on(NoahEvent.PROOF_GENERATION_START, () => updateState(ProofState.GeneratingProof));
        orch.on(NoahEvent.TRANSACTION_SUBMISSION_START, () => updateState(ProofState.SendingTransaction));
        orch.on(NoahEvent.ERROR, (err: any) => handleError(err));
        orch.on(NoahEvent.JOB_UPDATED, (job: any) => console.log('Job Update:', job));

        setOrchestrator(orch);
        console.log('Noah SDK initialized successfully!');
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
        console.log('Extracted MRZ:', mrz);
      } catch (error) {
        handleError(error);
      }
    };
    reader.readAsDataURL(file);
  };

  async function sha256(message: Uint8Array): Promise<Uint8Array> {
    // Ensure we are passing a regular ArrayBuffer, not SharedArrayBuffer
    const msgCopy = new Uint8Array(message.length);
    msgCopy.set(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgCopy);
    return new Uint8Array(hashBuffer);
  }

  const handleConnectWallet = async () => {
    try {
      console.log('[Noah] Starting wallet connection...');
      const globalWindow = window as any;

      // Look for Starknet wallets in the window object
      const argent = globalWindow.starknet_argentX;
      const braavos = globalWindow.starknet_braavos;
      const generic = globalWindow.starknet;

      const wallet = argent || braavos || generic;

      if (!wallet) {
        console.error('[Noah] No Starknet wallet detected on window.');
        alert("Argent X or Braavos wallet not detected. Please make sure your extension is installed and you've refreshed the page.");
        return;
      }

      console.log('[Noah] Wallet found:', wallet.name || wallet.id);

      // Trigger connection popup
      console.log('[Noah] Calling wallet.enable()...');
      await wallet.enable({ starknetVersion: 'v5' });

      if (wallet.isConnected) {
        console.log('[Noah] Wallet connected successfully! Address:', wallet.account.address);
        setAccount(wallet.account);

        // Re-initialize orchestrator with the live account (this replaces the private key)
        await initOrchestrator(wallet.account);
      } else {
        console.warn('[Noah] Wallet enable returned, but isConnected is false.');
      }
    } catch (err) {
      console.error('[Noah] Failed to connect wallet:', err);
      handleError(err);
    }
  };

  const initOrchestrator = async (connectedAccount?: any) => {
    try {
      if (orchestrator) {
        console.log('[Noah] Destroying existing orchestrator...');
        orchestrator.destroy();
      }

      console.log('[Noah] Initializing Noah SDK with', connectedAccount ? 'browser wallet' : 'private key', '...');

      const vkResponse = await fetch(vkUrl);
      const vkBuffer = await vkResponse.arrayBuffer();
      const vk = new Uint8Array(vkBuffer);

      const config = {
        circuitArtifact: circuitArtifact as any,
        vk: vk,
        starknet: {
          providerUrl: import.meta.env.VITE_STARKNET_PROVIDER_URL,
          registryAddress: import.meta.env.VITE_STARKNET_REGISTRY_ADDRESS,
          // If we have a browser account, use it. Otherwise fall back to .env secret.
          account: connectedAccount,
          accountAddress: connectedAccount ? undefined : import.meta.env.VITE_STARKNET_ACCOUNT_ADDRESS,
          privateKey: connectedAccount ? undefined : import.meta.env.VITE_STARKNET_PRIVATE_KEY
        }
      };

      const orch = await NoahProofOrchestrator.new(config);

      orch.on(NoahEvent.PROOF_GENERATION_START, () => updateState(ProofState.GeneratingProof));
      orch.on(NoahEvent.TRANSACTION_SUBMISSION_START, () => updateState(ProofState.SendingTransaction));
      orch.on(NoahEvent.ERROR, (err: any) => handleError(err));
      orch.on(NoahEvent.JOB_UPDATED, (job: any) => console.log('Job Update:', job));

      setOrchestrator(orch);
      console.log('[Noah] SDK initialized successfully!');
    } catch (err) {
      console.error('[Noah] Initialization error:', err);
    }
  };

  const startProcess = async () => {
    if (!orchestrator || !mrzExtracted) return;

    try {
      console.log("Preparing inputs...");
      // Encode MRZ and ensure it's exactly 88 bytes
      let mrzBytes = Array.from(new TextEncoder().encode(mrzExtracted)).map(x => Number(x));
      if (mrzBytes.length < 88) {
        // Pad with spaces (ASCII 32) if too short
        mrzBytes = [...mrzBytes, ...Array(88 - mrzBytes.length).fill(32)];
      } else if (mrzBytes.length > 88) {
        mrzBytes = mrzBytes.slice(0, 88);
      }

      // Compute SHA256 of MRZ for the circuit
      const mrzHash = await sha256(new Uint8Array(mrzBytes));
      console.log("MRZ Hash computed:", Array.from(mrzHash).map(b => b.toString(16).padStart(2, '0')).join(''));

      const inputs: NoahProverInputs = {
        mrz: mrzBytes,

        // MOCK AUTHENTICITY (Trigger bypass in circuit by setting pub_key_x[0] to 0)
        pub_key_x: Array(32).fill(0),
        pub_key_y: Array(32).fill(0),
        signature: Array(64).fill(0),
        hashed_mrz: Array.from(mrzHash),

        // DUMMY MERKLE PROOFS (Bypassed in circuit if pub_key_x[0] is 0)
        jurisdiction_root: "0x00",
        jurisdiction_index: "0",
        jurisdiction_hash_path: ["0x00", "0x00"],

        membership_root: "0x00",
        membership_index: "0",
        membership_hash_path: ["0x00", "0x00"],

        action_id: "12345",
        nullifier: "0",
        current_year: "2024",
        current_month: "5",
        current_day: "20",
        min_age: "18",
        user_secret: "0"
      };

      console.log("Generating witness and proof...");
      await orchestrator.proveAndVerify(inputs);
      console.log("Verification successful!");
    } catch (error: any) {
      console.error("Detailed error in startProcess:", error);
      handleError(error);
    }
  };

  const renderStateIndicator = (state: ProofState, current: ProofState) => {
    let status = 'pending';
    if (current === state && proofState.error) status = 'error';
    else if (current === state) status = 'active';
    else if (getStateIndex(current) > getStateIndex(state)) status = 'completed';

    return (
      <div className={`state-indicator ${status}`}>
        <div className="state-dot"></div>
        <div className="state-label">{state}</div>
      </div>
    );
  };

  const getStateIndex = (state: ProofState): number => {
    const states = [
      ProofState.Initial,
      ProofState.GeneratingWitness,
      ProofState.GeneratingProof,
      ProofState.PreparingCalldata,
      ProofState.ConnectingWallet,
      ProofState.SendingTransaction,
      ProofState.ProofVerified
    ];
    return states.indexOf(state);
  };

  return (
    <div className="container">
      <h1>Noah: Anonymous Passport Verification</h1>

      <div className="wallet-section" style={{ position: 'absolute', top: 20, right: 20 }}>
        {!account ? (
          <button className="secondary-button" onClick={handleConnectWallet}>
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-connected">
            <span className="wallet-address">{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
            <button className="text-button" onClick={() => { setAccount(null); initOrchestrator(); }}>Disconnect</button>
          </div>
        )}
      </div>

      <div className="state-machine">
        <div className="input-section">
          {!passportImage ? (
            <div className="upload-group">
              <label htmlFor="passport-upload" className="upload-label">
                Tap to Upload Passport Photo
              </label>
              <input
                id="passport-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
              />
            </div>
          ) : (
            <div className="preview-area">
              <img src={passportImage} alt="Passport Preview" className="passport-preview" />
              {mrzExtracted && (
                <div className="mrz-badge success">
                  ✓ MRZ Detected
                </div>
              )}
            </div>
          )}
        </div>

        <div className="steps-container">
          {renderStateIndicator(ProofState.GeneratingWitness, proofState.state)}
          {renderStateIndicator(ProofState.GeneratingProof, proofState.state)}
          {renderStateIndicator(ProofState.SendingTransaction, proofState.state)}
          {renderStateIndicator(ProofState.ProofVerified, proofState.state)}
        </div>
      </div>

      {proofState.error && (
        <div className="error-message">
          {proofState.error}
        </div>
      )}

      <div className="controls">
        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: account ? '#4caf50' : '#ffa000' }}>
          Mode: {account ? `🌐 Wallet Connected (${account.address.slice(0, 6)}...)` : '🔑 Dev Mode (Private Key)'}
        </div>
        {proofState.state === ProofState.Initial && !proofState.error && (
          <button
            className="primary-button"
            onClick={startProcess}
            disabled={!mrzExtracted}
          >
            {mrzExtracted ? 'Verify Anonymously' : 'Waiting for Scan...'}
          </button>
        )}

        {(proofState.error || proofState.state === ProofState.ProofVerified) && (
          <button className="reset-button" onClick={resetState}>Restart</button>
        )}
      </div>
    </div>
  )
}

export default App
