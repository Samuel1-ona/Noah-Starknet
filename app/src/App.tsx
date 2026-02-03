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

// WASM Initializers for Noir
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
const acvm = "/acvm_js_bg.wasm";
const noirc = "/noirc_abi_wasm_bg.wasm";

function App() {
  const [proofState, setProofState] = useState<ProofStateData>({
    state: ProofState.Initial
  });
  const [passportImage, setPassportImage] = useState<string | null>(null);
  const [mrzExtracted, setMrzExtracted] = useState<string | null>(null);
  const [orchestrator, setOrchestrator] = useState<NoahProofOrchestrator | null>(null);

  // Use a ref to reliably track the current state across asynchronous operations
  const currentStateRef = useRef<ProofState>(ProofState.Initial);

  // Initialize SDK and WASM on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Initialize WASM with error checking
        const fetchWasm = async (url: string) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch WASM from ${url}: ${res.statusText}`);

          // Verify magic word
          const buffer = await res.clone().arrayBuffer();
          const bytes = new Uint8Array(buffer.slice(0, 4));
          const magic = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log(`Fetched ${url} (Magic: ${magic})`);

          if (magic !== '00 61 73 6d') {
            const text = await res.clone().text();
            throw new Error(`Invalid WASM at ${url}. Expected magic '00 61 73 6d', found '${magic}'. Content: ${text.substring(0, 100)}`);
          }
          return res;
        };

        await Promise.all([
          initACVM(fetchWasm(acvm)),
          initNoirC(fetchWasm(noirc))
        ]);
        console.log('WASM Modules Initialized');

        // 2. Initialize Orchestrator
        const response = await fetch(vkUrl);
        const vk = new Uint8Array(await response.arrayBuffer());

        const config = {
          circuitArtifact: circuitArtifact as any,
          vk,
          starknet: {
            providerUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_10/gu3D3rKyivv6bhmb3UbyUSYxThLz7C_c',
            registryAddress: '0x03711be4c162e3c29d65ca0e5cb2b97943bb69fcde4f570ebe18f6fb463f1273',
            accountAddress: '0x02Bc02AE26B75e9dc7db44d2F38A4778b909Ba05d4A41129544baD3F55F30Dbe',
            privateKey: ''
          }
        };

        const orch = new NoahProofOrchestrator(config);

        orch.on(NoahEvent.PROOF_GENERATION_START, () => updateState(ProofState.GeneratingProof));
        orch.on(NoahEvent.TRANSACTION_SUBMISSION_START, () => updateState(ProofState.SendingTransaction));
        orch.on(NoahEvent.ERROR, (err) => handleError(err));
        orch.on(NoahEvent.JOB_UPDATED, (job) => console.log('Job Update:', job));

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
