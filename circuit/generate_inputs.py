
import toml
import os
from Crypto.PublicKey import ECC
from Crypto.Signature import DSS
from Crypto.Hash import SHA256
import random

def calculate_check_digit(data_str):
    """Calculate MRZ check digit using weighted sum mod 10"""
    weights = [7, 3, 1]
    total = 0
    
    for i, char in enumerate(data_str):
        if char == '<':
            val = 0
        elif char.isdigit():
            val = int(char)
        else:  # A-Z
            val = ord(char) - ord('A') + 10
        
        total += val * weights[i % 3]
    
    return str(total % 10)

def generate_mrz():
    """Generate valid TD3 passport MRZ (88 bytes)"""
    # Line 1: Document type, issuing country, name (44 chars)
    line1 = "P<"  # Document type
    line1 += "UTO"  # Issuing country (Utopia)
    line1 += "ERIKSSON<<ANNA<MARIA"  # Surname << Given names
    line1 += "<" * (44 - len(line1))  # Pad to 44 chars
    
    # Line 2: Document details (44 chars)
    doc_num = "L898902C3"
    doc_check = calculate_check_digit(doc_num)
    
    nationality = "UTO"
    
    # Date of birth: 2006-05-15 (age 20 in 2026)
    dob = "060515"  # YYMMDD
    dob_check = calculate_check_digit(dob)
    
    sex = "F"
    
    # Expiration: 2041-04-15
    expiry = "410415"  # YYMMDD
    expiry_check = calculate_check_digit(expiry)
    
    # Optional data (14 chars)
    optional = "ZE184226B<<<<<" # Exactly 14 chars
    optional_check = calculate_check_digit(optional)
    
    # Composite check digit (over doc_num + doc_check + dob + dob_check + expiry + expiry_check + optional + optional_check)
    composite_data = doc_num + doc_check + dob + dob_check + expiry + expiry_check + optional + optional_check
    composite_check = calculate_check_digit(composite_data)
    
    
    # Line 2 format: doc_num(9) + check(1) + nationality(3) + dob(6) + check(1) + sex(1) + expiry(6) + check(1) + optional(14) + check(1) + composite(1) = 44
    line2 = doc_num + doc_check + nationality + dob + dob_check + sex + expiry + expiry_check + optional + optional_check + composite_check
    
    # Verify line 2 is exactly 44 characters
    assert len(line2) == 44, f"Line 2 length is {len(line2)}, expected 44"
    
    mrz = line1 + line2
    assert len(mrz) == 88, f"MRZ length is {len(mrz)}, expected 88"
    
    return mrz.encode('ascii')

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
    
    # 2. Generate MRZ Data
    mrz_bytes = generate_mrz()
    print(f"Generated MRZ: {mrz_bytes.decode('ascii')}")
    print(f"  Line 1: {mrz_bytes[:44].decode('ascii')}")
    print(f"  Line 2: {mrz_bytes[44:].decode('ascii')}")
    
    # 3. Hash MRZ
    h = SHA256.new(mrz_bytes)
    hashed_mrz_bytes = h.digest()
    
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
    min_age = 18  # Configurable age requirement
    
    user_secret = 12345
    action_id = 1
    
    # Updated values from circuit execution (with full signature hashing)
    jurisdiction_root = "0x1d31974bce36c646af5c1fa1720603f6a2cd125f4813dea12e242fe282342f4c"
    membership_root = "0x0287ded0ce965b2a8d709cb3466c947bed3861d43ca11fb0ce6f2422ea042d5b"
    nullifier = "0x1a4b0d42039726743da976828632ca170b3fa84a15c3567d63bd877aa11b296b"
    
    inputs = {
        "mrz": [b for b in mrz_bytes],
        "pub_key_x": [0] + [b for b in pub_x_bytes][1:],
        "pub_key_y": [b for b in pub_y_bytes],
        "signature": [b for b in signature],
        "hashed_mrz": [b for b in hashed_mrz_bytes],
        
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
        "current_day": str(current_day),
        "min_age": str(min_age)
    }
    
    with open("Prover.toml", "w") as f:
        toml.dump(inputs, f)
        
    print("Generated Prover.toml")
    print(f"Pub X: {pub_x_bytes.hex()}")
    print(f"Pub Y: {pub_y_bytes.hex()}")

if __name__ == "__main__":
    generate_inputs()
