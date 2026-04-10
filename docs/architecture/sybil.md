# Sybil Resistance via ZK Nullifiers

Noah ensures that each physical passport can only be used to verify one unique account on Starknet, preventing Sybil attacks while maintaining absolute user privacy.

## Professional Sybil Resistance Overview

![Noah Sybil Resistance Professional Architecture](/Users/machine/.gemini/antigravity/brain/eccb1236-d998-4b0b-881b-42fe5dd5b8f0/noah_sybil_resistance_professional_architecture_1775738751793.png)

## Sybil Resistance Architecture

```mermaid
graph TD
    classDef client fill:#f9f,stroke:#333,stroke-width:2px;
    classDef contract fill:#dfd,stroke:#333,stroke-width:2px;
    classDef reject fill:#fbb,stroke:#333,stroke-width:2px;

    subgraph "Client Side (Privacy Protected)"
        MRZ["Passport MRZ Data (Private)"] -- "Deterministic Hashing" --> Nullifier["Unique Nullifier (Public)"]
        MRZ -- "Generate ZK Proof" --> Proof["Proof of Validity"]
    end

    subgraph "Noah Registry Contract (On-Chain Storage)"
        Registry["CredentialRegistry.cairo"]
        Storage["Nullifier Mapping: nullifier -> owner_address"]
    end

    Proof -- "verify_credential(nullifier, ...)" --> Registry
    Nullifier -- "verify_credential(...) " --> Registry

    Registry -- "1. Check if Nullifier in Storage" --> Storage
    
    Storage -- "If NOT Present" --> Success["1. Map Nullifier to User<br/>2. Mark Address Verified"]
    Storage -- "If ALREADY Present" --> Fail["'Document already used'<br/>Transaction REJECTED"]

    class MRZ,Nullifier,Proof client;
    class Registry,Storage contract;
    class Fail reject;
```

## How It Works

### 1. The ZK Nullifier
The **Nullifier** is a deterministic hash of the passport’s unique identifiers (like the Passport Number) calculated strictly inside the ZK circuit. Because it's deterministic, the same passport always results in the same nullifier. Because it's a hash, the actual passport number is never revealed on-chain.

### 2. Double-Verification Prevention
When a user attempts to verify their account, the `CredentialRegistry` check for the submitted nullifier:
*   **Unique Use**: If the nullifier hasn't been seen before, the registry links it to the user's Starknet address and grants "Verified" status.
*   **Sybil Protection**: If the same nullifier is submitted again (even from a different Starknet address), the registry rejects the transaction because the "Document" has already been used.

### 3. Trustless Integrity
This system provides **Sybil Resistance** without requiring a central authority to track who has verified. The math (ZK) and the state (Starknet) work together to enforce uniqueness trustlessly.
