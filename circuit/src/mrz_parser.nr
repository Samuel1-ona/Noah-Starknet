// MRZ Parser for TD3 Passport Format (ICAO 9303)
// TD3 MRZ: 2 lines x 44 characters = 88 bytes total
//
// Line 1 (0-43): P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<
//   [0]: Document type ('P')
//   [1-2]: '<' filler
//   [3-5]: Issuing country code (3 chars)
//   [6-43]: Name (surname << given names)
//
// Line 2 (44-87): L898902C36UTO7408122F1204159ZE184226B<<<<<10
//   [44-52]: Document number (9 chars)
//   [53]: Check digit
//   [54-56]: Nationality (3 chars)
//   [57-62]: Date of birth YYMMDD
//   [63]: Check digit
//   [64]: Sex (M/F/<)
//   [65-70]: Expiration date YYMMDD
//   [71]: Check digit
//   [72-85]: Optional data
//   [86]: Check digit
//   [87]: Composite check digit

pub struct PassportData {
    pub birth_year: u32,
    pub birth_month: u32,
    pub birth_day: u32,
    pub nationality_code: Field,
    pub expiry_year: u32,
    pub expiry_month: u32,
    pub expiry_day: u32,
}

// Parse full MRZ and extract passport data
pub fn parse_mrz(mrz: [u8; 88]) -> PassportData {
    // Extract date of birth from Line 2, positions 57-62 (YYMMDD)
    let birth_year = parse_two_digit_year(mrz[57], mrz[58]);
    let birth_month = parse_two_digits(mrz[59], mrz[60]);
    let birth_day = parse_two_digits(mrz[61], mrz[62]);
    
    // Extract nationality from Line 2, positions 54-56 (3 chars)
    let nationality_code = extract_country_code(mrz, 54);
    
    // Extract expiration date from Line 2, positions 65-70 (YYMMDD)
    let expiry_year = parse_two_digit_year_expiry(mrz[65], mrz[66]);
    let expiry_month = parse_two_digits(mrz[67], mrz[68]);
    let expiry_day = parse_two_digits(mrz[69], mrz[70]);
    
    PassportData {
        birth_year,
        birth_month,
        birth_day,
        nationality_code,
        expiry_year,
        expiry_month,
        expiry_day,
    }
}

// Convert 2-digit year (YY) to 4-digit year for birth dates
// Assumes 00-26 = 2000-2026, 27-99 = 1927-1999
fn parse_two_digit_year(tens: u8, ones: u8) -> u32 {
    let yy = parse_two_digits(tens, ones);
    if yy <= 26 {
        2000 + yy
    } else {
        1900 + yy
    }
}

// Convert 2-digit year (YY) to 4-digit year for expiry dates
// Expiry dates are always in the future, so 00-99 = 2000-2099
fn parse_two_digit_year_expiry(tens: u8, ones: u8) -> u32 {
    let yy = parse_two_digits(tens, ones);
    2000 + yy
}

// Parse two ASCII digits to u32
fn parse_two_digits(tens: u8, ones: u8) -> u32 {
    let t = (tens - 48) as u32;  // '0' = ASCII 48
    let o = (ones - 48) as u32;
    t * 10 + o
}

// Extract 3-character country code as Field
// Encodes ABC as (A * 256^2) + (B * 256) + C
fn extract_country_code(mrz: [u8; 88], start_idx: u32) -> Field {
    let c1 = mrz[start_idx] as Field;
    let c2 = mrz[start_idx + 1] as Field;
    let c3 = mrz[start_idx + 2] as Field;
    
    c1 * 65536 + c2 * 256 + c3
}

// Validate a single check digit
fn validate_check_digit_range(mrz: [u8; 88], start: u32, end: u32, check_digit_pos: u32) -> bool {
    let weights = [7, 3, 1];
    let mut sum: u32 = 0;
    
    for i in start..end {
        let val = if mrz[i] == 60 {  // '<' = 0
            0
        } else if (mrz[i] >= 48) & (mrz[i] <= 57) {  // '0'-'9'
            (mrz[i] - 48) as u32
        } else {  // 'A'-'Z' = 10-35
            (mrz[i] - 55) as u32
        };
        
        sum += val * weights[(i - start) % 3];
    }
    
    let check = (sum % 10) as u8;
    let expected = mrz[check_digit_pos];
    
    // Check digit should be ASCII '0'-'9'
    if (expected >= 48) & (expected <= 57) {
        check == (expected - 48)
    } else {
        false
    }
}

// Validate all MRZ check digits
pub fn validate_mrz_check_digits(mrz: [u8; 88]) -> bool {
    // Validate document number check digit (position 53)
    let doc_num_valid = validate_check_digit_range(mrz, 44, 53, 53);
    
    // Validate DOB check digit (position 63)
    let dob_valid = validate_check_digit_range(mrz, 57, 63, 63);
    
    // Validate expiry check digit (position 71)
    let expiry_valid = validate_check_digit_range(mrz, 65, 71, 71);
    
    // Validate optional data check digit (position 86)
    let optional_valid = validate_check_digit_range(mrz, 72, 86, 86);
    
    // Validate composite check digit (position 87)
    // Composite = doc_num + doc_check + dob + dob_check + expiry + expiry_check + optional + optional_check
    let weights = [7, 3, 1];
    let mut sum: u32 = 0;
    let mut composite_idx: u32 = 0;  // Continuous index for weight calculation
    
    // Document number (44-52) + check (53)
    for i in 44..54 {
        let val = if mrz[i] == 60 { 0 }
        else if (mrz[i] >= 48) & (mrz[i] <= 57) { (mrz[i] - 48) as u32 }
        else { (mrz[i] - 55) as u32 };
        sum += val * weights[composite_idx % 3];
        composite_idx += 1;
    }
    
    // DOB (57-62) + check (63)
    for i in 57..64 {
        let val = if mrz[i] == 60 { 0 }
        else if (mrz[i] >= 48) & (mrz[i] <= 57) { (mrz[i] - 48) as u32 }
        else { (mrz[i] - 55) as u32 };
        sum += val * weights[composite_idx % 3];
        composite_idx += 1;
    }
    
    // Expiry (65-70) + check (71)
    for i in 65..72 {
        let val = if mrz[i] == 60 { 0 }
        else if (mrz[i] >= 48) & (mrz[i] <= 57) { (mrz[i] - 48) as u32 }
        else { (mrz[i] - 55) as u32 };
        sum += val * weights[composite_idx % 3];
        composite_idx += 1;
    }
    
    // Optional data (72-85) + check (86)
    for i in 72..87 {
        let val = if mrz[i] == 60 { 0 }
        else if (mrz[i] >= 48) & (mrz[i] <= 57) { (mrz[i] - 48) as u32 }
        else { (mrz[i] - 55) as u32 };
        sum += val * weights[composite_idx % 3];
        composite_idx += 1;
    }
    
    let composite_check = (sum % 10) as u8;
    let expected_composite = mrz[87];
    let composite_valid = if (expected_composite >= 48) & (expected_composite <= 57) {
        composite_check == (expected_composite - 48)
    } else {
        false
    };
    
    doc_num_valid & dob_valid & expiry_valid & optional_valid & composite_valid
}
