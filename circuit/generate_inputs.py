
import toml
import os
from Crypto.PublicKey import ECC
from Crypto.Signature import DSS
from Crypto.Hash import SHA256
import random

# Mock Poseidon for BN254 (Placeholder - will try to find real one or use dummy roots for logic test)
# Since we can't easily reproduce Noir's exact Poseidon in this script without the specific params,
# We will use "dummy" Merkle paths where we predict the root by invoking the hash function?
# No, let's just make the circuit print the expected values first!
# We will generate the KEYs and SIGNATURE correctly.
# We will providing "wrong" roots and nullifiers, run nargo, see the "println" output (if we add it), 
# and then fix the inputs. 
# Or better: We use nargo to compute the values. 

def generate_inputs():
    # 1. Generate Fixed ECDSA Key Pair (secp256r1 / P-256)
    # Fixed scalar d for reproducibility
    d_int = 1234567890123456789012345678901234567890
    key = ECC.construct(curve='P-256', d=d_int)
    pub_key = key.public_key()
    
    # Extract X and Y as bytes
    pub_x_int = int(pub_key.pointQ.x)
    pub_y_int = int(pub_key.pointQ.y)
    
    pub_x_bytes = pub_x_int.to_bytes(32, byteorder='big')
    pub_y_bytes = pub_y_int.to_bytes(32, byteorder='big')
    
    # 2. DG1 Data (Mock)
    # [Year(4), Month(2), Day(2), Code(2), ...]
    # Age 20: 2006 (assume current is 2026)
    # 2006 -> '2', '0', '0', '6'
    dg1 = bytearray(32)
    # Year 2006
    dg1[0] = 2
    dg1[1] = 0
    dg1[2] = 0
    dg1[3] = 6
    # Month 05
    dg1[4] = 0
    dg1[5] = 5
    # Day 15
    dg1[6] = 1
    dg1[7] = 5
    # Jurisdiction "FR" (Using mock ascii or just bytes)
    dg1[8] = 0
    dg1[9] = 1 # Code 1
    
    # 3. Hash DG1
    h = SHA256.new(dg1)
    hashed_dg1_bytes = h.digest()
    
    # 4. Sign (Deterministic)
    signer = DSS.new(key, 'deterministic-rfc6979')
    signature = signer.sign(h)
    
    # Normalize S (Low-S)
    n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
    r_int = int.from_bytes(signature[:32], 'big')
    s_int = int.from_bytes(signature[32:], 'big')
    if s_int > n // 2:
        s_int = n - s_int
        print("Normalized High S")
    
    # Reconstruct signature bytes
    signature = r_int.to_bytes(32, 'big') + s_int.to_bytes(32, 'big')
    
    # Verify in Python to be sure
    verifier = DSS.new(key, 'deterministic-rfc6979')
    try:
        verifier.verify(h, signature)
        print("Python Verification: Valid")
        r_int = int.from_bytes(signature[:32], 'big')
        s_int = int.from_bytes(signature[32:], 'big')
        print(f"R: {r_int}")
        print(f"S: {s_int}")
        n = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551
        if s_int > n // 2:
            print("WARNING: S is high!")
    except ValueError:
        print("Python Verification: Invalid")

    # 5. Other Inputs
    current_year = 2026
    current_month = 6
    current_day = 1
    
    user_secret = 12345
    action_id = 1
    
    # Updated Dummies from nargo execute output (Fixed Key)
    jurisdiction_root = "0x5f7d9c13cd4a4279e532c2c7a8e39bfb34d27cdfdd0ef06717b20bd141efb6"
    membership_root = "0x120a626edc2671922877ce4ddeb5e201c2afbbc793df255c03d6d5f19065f46e"
    nullifier = "0x033cff666a93511756c3e47ce4ee3aa7abd305c149c46447b0af94f359921683"
    
    # Dummies for Merkle (Will fail assertion, but we check println if we add it)
    # Or we construct a "trivial" tree where path is 0,0 and root = leaf (if possible? No, compute_merkle_root does hashing)
    # We will just put randoms and expect failure for now, unless we can script nargo to hash.
    
    inputs = {
        "dg1": [b for b in dg1],
        "pub_key_x": [b for b in pub_x_bytes],
        "pub_key_y": [b for b in pub_y_bytes],
        "signature": [b for b in signature],
        "hashed_dg1": [b for b in hashed_dg1_bytes],
        
        "jurisdiction_root": jurisdiction_root,
        "jurisdiction_index": 0,
        "jurisdiction_hash_path": ["0x0", "0x0"],
        
        "membership_root": membership_root,
        "membership_index": 0,
        "membership_hash_path": ["0x0", "0x0"],
        
        "action_id": str(action_id),
        "nullifier": nullifier,
        "user_secret": str(user_secret),
        
        "current_year": str(current_year),
        "current_month": str(current_month),
        "current_day": str(current_day)
    }
    
    with open("Prover.toml", "w") as f:
        toml.dump(inputs, f)
        
    print("Generated Prover.toml")
    print(f"Pub X: {pub_x_bytes.hex()}")
    print(f"Pub Y: {pub_y_bytes.hex()}")

if __name__ == "__main__":
    generate_inputs()
