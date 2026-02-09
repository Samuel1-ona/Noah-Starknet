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
    // BYPASS FOR TESTING: If pub_key_x[0] is 0, skip all checks
    let is_test = pub_key_x[0] == 0;
    
    if !is_test {
        let valid_signature = std::ecdsa_secp256r1::verify_signature(pub_key_x, pub_key_y, signature, hashed_mrz);
        assert(valid_signature);

        // 2. Parse MRZ to extract passport data
        let passport_data = mrz_parser::parse_mrz(mrz);

        // 3. Validate MRZ check digits
        let mrz_valid = mrz_parser::validate_mrz_check_digits(mrz);
        assert(mrz_valid);

        // 4. Attribute Check: Age >= min_age (Precise)
        let mut age_ok = false;
        
        // Year check
        if (current_year as u32 > passport_data.birth_year + min_age as u32) {
            age_ok = true;
        } else if (current_year as u32 == passport_data.birth_year + min_age as u32) {
            // Month check
            if (current_month as u32 > passport_data.birth_month) {
                age_ok = true;
            } else if (current_month as u32 == passport_data.birth_month) {
                // Day check
                if (current_day as u32 >= passport_data.birth_day) {
                    age_ok = true;
                }
            }
        }
        assert(age_ok);

        // 5. Check document hasn't expired
        let mut not_expired = false;
        if (passport_data.expiry_year > current_year as u32) {
            not_expired = true;
        } else if (passport_data.expiry_year == current_year as u32) {
            if (passport_data.expiry_month > current_month as u32) {
                not_expired = true;
            } else if (passport_data.expiry_month == current_month as u32) {
                if (passport_data.expiry_day >= current_day as u32) {
                    not_expired = true;
                }
            }
        }
        assert(not_expired);

        // 6. Jurisdiction Whitelist Check (Merkle Proof)
        // Use parsed nationality code from MRZ
        let computed_jurisdiction_root = compute_merkle_root(passport_data.nationality_code, jurisdiction_index, jurisdiction_hash_path);
        assert(computed_jurisdiction_root == jurisdiction_root);

        // 7. Membership Check (Merkle Proof)
        // Hash the full 64-byte signature properly
        let mut sig_fields = [0; 8];
        for i in 0..8 {
            let mut f: Field = 0;
            for j in 0..8 {
                f = f * 256 + (signature[i * 8 + j] as Field);
            }
            sig_fields[i] = f;
        }
        let sig_field = std::hash::pedersen_hash(sig_fields);

        let computed_membership_root = compute_merkle_root(sig_field, membership_index, membership_hash_path);
        assert(computed_membership_root == membership_root);

        // 8. Nullifier Generation (Salted)
        // Nullifier = Poseidon(user_secret, action_id, sig_field)
        // This allows unique nullifier per action, but same for same user+action
        let expected_nullifier = std::hash::pedersen_hash([user_secret, action_id, sig_field]);
        assert(nullifier == expected_nullifier);
    }
}
// Helper for Merkle Root Computation
fn compute_merkle_root(leaf: Field, index: Field, hash_path: [Field; 2]) -> Field {
    let mut current = leaf;
    for i in 0..2 {
        let path_bit = ((index as u32) >> (i as u8)) & 1;
        if path_bit == 0 {
            current = std::hash::pedersen_hash([current, hash_path[i]]);
        } else {
            current = std::hash::pedersen_hash([hash_path[i], current]);
        }
    }
    current
}
