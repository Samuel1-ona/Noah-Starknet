// MRZ Parser for ICAO 9303 Document Formats (TD1, TD2, TD3)
// TD1 (ID): 3 lines x 30 characters = 90 bytes total
// TD2 (ID/License): 2 lines x 36 characters = 72 bytes total
// TD3 (Passport): 2 lines x 44 characters = 88 bytes total

pub struct DocumentData {
    pub name: [u8; 38],             // Max length from TD3
    pub document_number: [u8; 9],   // Standard 9 chars
    pub birth_year: u32,
    pub expiry_date: u32,           // YYMMDD for on-chain comparison
}

// Unified parser based on document type: 0=TD3, 1=TD1, 2=TD2
pub fn parse_document(mrz: [u8; 90], doc_type: u8) -> DocumentData {
    if doc_type == 0 {
        parse_td3(mrz)
    } else if doc_type == 1 {
        parse_td1(mrz)
    } else {
        parse_td2(mrz)
    }
}

fn parse_td3(mrz: [u8; 90]) -> DocumentData {
    let mut name = [0; 38];
    for i in 0..38 { name[i] = mrz[6 + i]; }

    let mut doc_num = [0; 9];
    for i in 0..9 { doc_num[i] = mrz[44 + i]; }

    DocumentData {
        name,
        document_number: doc_num,
        birth_year: parse_year(mrz[57], mrz[58]),
        expiry_date: parse_six_digits(mrz[65], mrz[66], mrz[67], mrz[68], mrz[69], mrz[70]),
    }
}

fn parse_td1(mrz: [u8; 90]) -> DocumentData {
    // Line 3 is Name
    let mut name = [0; 38];
    for i in 0..30 { name[i] = mrz[60 + i]; }

    // Line 1 contains doc number at 5-13
    let mut doc_num = [0; 9];
    for i in 0..9 { doc_num[i] = mrz[5 + i]; }

    DocumentData {
        name,
        document_number: doc_num,
        birth_year: parse_year(mrz[30], mrz[31]), // Line 2 starts at 30
        expiry_date: parse_six_digits(mrz[38], mrz[39], mrz[40], mrz[41], mrz[42], mrz[43]),
    }
}

fn parse_td2(mrz: [u8; 90]) -> DocumentData {
    // Line 1 contains Name at 5-35 (31 chars)
    let mut name = [0; 38];
    for i in 0..31 { name[i] = mrz[5 + i]; }

    // Line 2 contains doc number at 44-52
    let mut doc_num = [0; 9];
    for i in 0..9 { doc_num[i] = mrz[36 + i]; }

    DocumentData {
        name,
        document_number: doc_num,
        birth_year: parse_year(mrz[49], mrz[50]), // Line 2, pos 13-18
        expiry_date: parse_six_digits(mrz[57], mrz[58], mrz[59], mrz[60], mrz[61], mrz[62]),
    }
}

fn parse_year(tens: u8, ones: u8) -> u32 {
    let yy = ((tens - 48) as u32) * 10 + ((ones - 48) as u32);
    if yy <= 26 { 2000 + yy } else { 1900 + yy }
}

fn parse_six_digits(y1: u8, y2: u8, m1: u8, m2: u8, d1: u8, d2: u8) -> u32 {
    let year = ((y1 - 48) as u32) * 10 + ((y2 - 48) as u32);
    let month = ((m1 - 48) as u32) * 10 + ((m2 - 48) as u32);
    let day = ((d1 - 48) as u32) * 10 + ((d2 - 48) as u32);
    year * 10000 + month * 100 + day
}

pub fn validate_document(mrz: [u8; 90], doc_type: u8) -> bool {
    if doc_type == 0 {
        validate_td3_checksums(mrz)
    } else if doc_type == 1 {
        validate_td1_checksums(mrz)
    } else {
        validate_td2_checksums(mrz)
    }
}

fn validate_check_digit(mrz: [u8; 90], start: u32, len: u32, expected: u8) -> bool {
    let weights = [7, 3, 1];
    let mut sum: u32 = 0;
    for i in 0..len {
        let val = char_to_val(mrz[start + i]);
        sum += val * weights[i % 3];
    }
    ((sum % 10) as u8) == (expected - 48)
}

fn char_to_val(c: u8) -> u32 {
    if c == 60 { 0 }
    else if (c >= 48) & (c <= 57) { (c - 48) as u32 }
    else { (c - 55) as u32 }
}

fn validate_td3_checksums(mrz: [u8; 90]) -> bool {
    validate_check_digit(mrz, 44, 9, mrz[53]) & // Doc Num
    validate_check_digit(mrz, 57, 6, mrz[63]) & // DOB
    validate_check_digit(mrz, 65, 6, mrz[71])    // Expiry
}

fn validate_td1_checksums(mrz: [u8; 90]) -> bool {
    validate_check_digit(mrz, 5, 9, mrz[14]) &  // Doc Num
    validate_check_digit(mrz, 30, 6, mrz[36]) & // DOB
    validate_check_digit(mrz, 38, 6, mrz[44])    // Expiry
}

fn validate_td2_checksums(mrz: [u8; 90]) -> bool {
    validate_check_digit(mrz, 36, 9, mrz[45]) & // Doc Num
    validate_check_digit(mrz, 49, 6, mrz[55]) & // DOB
    validate_check_digit(mrz, 57, 6, mrz[63])    // Expiry
}
