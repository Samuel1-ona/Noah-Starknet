use dep::std;
mod mrz_parser;

fn main(
    // Passport MRZ data (TD3 format: 88 bytes = 2 lines x 44 chars)
    mrz: [u8; 88], 
    
    // ECDSA secp256r1 Signature of MRZ
    pub_key_x: [u8; 32],
    pub_key_y: [u8; 32],
    signature: [u8; 64],
    hashed_mrz: [u8; 32], // SHA256 of MRZ

    // Jurisdiction Merkle Root and Proof
    jurisdiction_root: pub Field,
    jurisdiction_index: Field,
    jurisdiction_hash_path: [Field; 2], 
    
    // Membership Merkle Root and Proof
    membership_root: pub Field,
    membership_index: Field,
    membership_hash_path: [Field; 2], 
    
    // Action ID and Nullifier
    action_id: pub Field,
    nullifier: pub Field,
    
    // User Secret (Salt) for Nullifier privacy
    user_secret: Field,

    // Current date for precise age check
    current_year: pub Field,
    current_month: pub Field,
    current_day: pub Field,
    
    // Configurable minimum age requirement
    min_age: pub Field
) {
    // 1. Verify Passport Signature (ECDSA secp256r1)
    let valid_signature = std::ecdsa_secp256r1::verify_signature(pub_key_x, pub_key_y, signature, hashed_mrz);
    assert(valid_signature);

    // 2. Parse MRZ to extract passport data
    let passport_data = mrz_parser::parse_mrz(mrz);
    
    // 3. Validate MRZ check digits
    let mrz_valid = mrz_parser::validate_mrz_check_digits(mrz);
    assert(mrz_valid);

    // 4. Attribute Check: Age >= min_age (Precise)
    let current_year_u32 = current_year as u32;
    let current_month_u32 = current_month as u32;
    let current_day_u32 = current_day as u32;
    let min_age_u32 = min_age as u32;

    let age_years = current_year_u32 - passport_data.birth_year;
    let mut age_ok = false;
    if age_years > min_age_u32 {
        age_ok = true;
    } else if age_years == min_age_u32 {
        if current_month_u32 > passport_data.birth_month {
            age_ok = true;
        } else if current_month_u32 == passport_data.birth_month {
            if current_day_u32 >= passport_data.birth_day {
                age_ok = true;
            }
        }
    }
    assert(age_ok);
    
    // 5. Check document hasn't expired
    let mut not_expired = false;
    if current_year_u32 < passport_data.expiry_year {
        not_expired = true;
    } else if current_year_u32 == passport_data.expiry_year {
        if current_month_u32 < passport_data.expiry_month {
            not_expired = true;
        } else if current_month_u32 == passport_data.expiry_month {
            if current_day_u32 <= passport_data.expiry_day {
                not_expired = true;
            }
        }
    }
    assert(not_expired);

    // 6. Jurisdiction Whitelist Check (Merkle Proof)
    // Use parsed nationality code from MRZ
    let computed_jurisdiction_root = std::merkle::compute_merkle_root(passport_data.nationality_code, jurisdiction_index, jurisdiction_hash_path);
    assert(computed_jurisdiction_root == jurisdiction_root);

    // 7. Membership Check (Merkle Proof)
    // Hash the full 64-byte signature properly
    let mut sig_fields: [Field; 8] = [0; 8];
    for i in 0..8 {
        let mut chunk: Field = 0;
        for j in 0..8 {
            chunk = chunk * 256 + (signature[i * 8 + j] as Field);
        }
        sig_fields[i] = chunk;
    }
    let sig_field = std::hash::poseidon::bn254::hash_8(sig_fields);
    
    let computed_membership_root = std::merkle::compute_merkle_root(sig_field, membership_index, membership_hash_path);
    assert(computed_membership_root == membership_root);

    // 8. Nullifier Generation (Salted)
    // Nullifier = Poseidon(user_secret, action_id, sig_field)
    // This allows unique nullifier per action, but same for same user+action
    let expected_nullifier = std::hash::poseidon::bn254::hash_3([user_secret, action_id, sig_field]);
    assert(nullifier == expected_nullifier);
}


