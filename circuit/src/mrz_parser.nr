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
}

// Parse full MRZ and extract passport data
pub fn parse_mrz(mrz: [u8; 88]) -> PassportData {
    // Extract date of birth from Line 2, positions 57-62 (YYMMDD)
    let birth_year = parse_two_digit_year(mrz[57], mrz[58]);
    let birth_month = parse_two_digits(mrz[59], mrz[60]);
    let birth_day = parse_two_digits(mrz[61], mrz[62]);
    
    // Extract nationality from Line 2, positions 54-56 (3 chars)
    let nationality_code = extract_country_code(mrz, 54);
    
    PassportData {
        birth_year,
        birth_month,
        birth_day,
        nationality_code,
    }
}

// Convert 2-digit year (YY) to 4-digit year
// Assumes 00-26 = 2000-2026, 27-99 = 1927-1999
fn parse_two_digit_year(tens: u8, ones: u8) -> u32 {
    let yy = parse_two_digits(tens, ones);
    if yy <= 26 {
        2000 + yy
    } else {
        1900 + yy
    }
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

// Optional: Validate MRZ check digit
// Check digit algorithm: weighted sum mod 10
// Weights: 7, 3, 1, 7, 3, 1, ...
pub fn validate_check_digit(data: [u8], expected: u8) -> bool {
    let weights = [7, 3, 1];
    let mut sum: u32 = 0;
    
    for i in 0..data.len() {
        let val = if data[i] == 60 {  // '<' = 0
            0
        } else if (data[i] >= 48) & (data[i] <= 57) {  // '0'-'9'
            (data[i] - 48) as u32
        } else {  // 'A'-'Z' = 10-35
            (data[i] - 55) as u32
        };
        
        sum += val * weights[i % 3];
    }
    
    let check = (sum % 10) as u8;
    check == (expected - 48)
}
