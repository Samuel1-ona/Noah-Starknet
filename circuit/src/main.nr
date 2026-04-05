use dep::std;
mod mrz_parser;

fn main(
    mrz: [u8; 90],                   // Max size for TD1
    doc_type: u8,                    // 0=TD3, 1=TD1, 2=TD2
    user_secret: Field,
    merkle_path: [Field; 20],
    is_left: [bool; 20],
    passport_root: pub Field,        // Public 1: Merkle Root
    nullifier: pub Field,            // Public 2: Uniqueness
    name_hash: pub Field,            // Public 3: Simplified Name Hash
    doc_num_hash: pub Field,         // Public 4: Simplified Doc Num Hash
    birth_year: pub u32,             // Public 5: Year for Age Logic
    expiry_date: pub u32           // Public 6: YYMMDD for Expiry Logic
) {
    // 1. Parse and validate document
    assert(mrz_parser::validate_document(mrz, doc_type), "Invalid MRZ checksum");
    let doc_data = mrz_parser::parse_document(mrz, doc_type);

    // 2. Compute Hashes
    let computed_name_hash = std::hash::pedersen_hash(pack_38_bytes(doc_data.name));
    let computed_doc_num_hash = std::hash::pedersen_hash(pack_9_bytes(doc_data.document_number));

    // 3. Verify Public Signals
    assert(computed_name_hash == name_hash, "Invalid name hash");
    assert(computed_doc_num_hash == doc_num_hash, "Invalid document number hash");
    assert(doc_data.birth_year == birth_year, "Invalid birth year");
    assert(doc_data.expiry_date == expiry_date, "Invalid expiry date");

    // 4. Uniqueness (Nullifier)
    let computed_nullifier = std::hash::pedersen_hash([
        user_secret,
        computed_doc_num_hash
    ]);
    assert(computed_nullifier == nullifier, "Invalid nullifier");

    // 5. Membership (Merkle Proof)
    let leaf = std::hash::pedersen_hash([computed_name_hash, computed_doc_num_hash]);
    let computed_root = compute_merkle_root(leaf, merkle_path, is_left);
    assert(computed_root == passport_root, "Invalid membership proof");
}

fn pack_38_bytes(name: [u8; 38]) -> [Field; 2] {
    let mut f1: Field = 0;
    let mut f2: Field = 0;
    for i in 0..20 { f1 = f1 * 256 + (name[i] as Field); }
    for i in 0..18 { f2 = f2 * 256 + (name[20 + i] as Field); }
    [f1, f2]
}

fn pack_9_bytes(doc_num: [u8; 9]) -> [Field; 1] {
    let mut f: Field = 0;
    for i in 0..9 { f = f * 256 + (doc_num[i] as Field); }
    [f]
}

fn compute_merkle_root(leaf: Field, hash_path: [Field; 20], is_left: [bool; 20]) -> Field {
    let mut current = leaf;
    for i in 0..20 {
        if is_left[i] {
            current = std::hash::pedersen_hash([current, hash_path[i]]);
        } else {
            current = std::hash::pedersen_hash([hash_path[i], current]);
        }
    }
    current
}
