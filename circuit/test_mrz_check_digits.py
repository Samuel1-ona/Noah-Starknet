#!/usr/bin/env python3
"""
Test MRZ check digit validation to debug circuit issues
"""

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

def test_mrz_check_digits():
    """Test the MRZ we're generating"""
    import sys
    sys.path.insert(0, '.')
    from generate_inputs import generate_mrz
    
    mrz_bytes = generate_mrz()
    mrz = mrz_bytes.decode('ascii')
    
    print(f"MRZ: {mrz}")
    print(f"Length: {len(mrz)}")
    print()
    
    # Line 2 starts at position 44
    line2 = mrz[44:]
    print(f"Line 2: {line2}")
    print(f"Line 2 length: {len(line2)}")
    print()
    
    # Test each check digit
    # Document number: positions 0-8 (line2), check at 9
    doc_num = line2[0:9]
    doc_check_actual = line2[9]
    doc_check_calc = calculate_check_digit(doc_num)
    print(f"Doc Number: '{doc_num}'")
    print(f"  Actual check digit: {doc_check_actual}")
    print(f"  Calculated: {doc_check_calc}")
    print(f"  Match: {doc_check_actual == doc_check_calc}")
    print()
    
    # DOB: positions 13-18 (line2), check at 19
    dob = line2[13:19]
    dob_check_actual = line2[19]
    dob_check_calc = calculate_check_digit(dob)
    print(f"DOB: '{dob}'")
    print(f"  Actual check digit: {dob_check_actual}")
    print(f"  Calculated: {dob_check_calc}")
    print(f"  Match: {dob_check_actual == dob_check_calc}")
    print()
    
    # Expiry: positions 21-26 (line2), check at 27
    expiry = line2[21:27]
    expiry_check_actual = line2[27]
    expiry_check_calc = calculate_check_digit(expiry)
    print(f"Expiry: '{expiry}'")
    print(f"  Actual check digit: {expiry_check_actual}")
    print(f"  Calculated: {expiry_check_calc}")
    print(f"  Match: {expiry_check_actual == expiry_check_calc}")
    print()
    
    # Optional data: positions 28-41 (line2), check at 42
    optional = line2[28:42]
    optional_check_actual = line2[42]
    optional_check_calc = calculate_check_digit(optional)
    print(f"Optional: '{optional}'")
    print(f"  Actual check digit: {optional_check_actual}")
    print(f"  Calculated: {optional_check_calc}")
    print(f"  Match: {optional_check_actual == optional_check_calc}")
    print()
    
    # Composite: doc+check+dob+check+expiry+check+optional+check, check at 43
    composite_data = doc_num + doc_check_actual + dob + dob_check_actual + expiry + expiry_check_actual + optional + optional_check_actual
    composite_check_actual = line2[43]
    composite_check_calc = calculate_check_digit(composite_data)
    print(f"Composite data: '{composite_data}'")
    print(f"  Actual check digit: {composite_check_actual}")
    print(f"  Calculated: {composite_check_calc}")
    print(f"  Match: {composite_check_actual == composite_check_calc}")
    print()
    
    # Overall result
    all_valid = (
        doc_check_actual == doc_check_calc and
        dob_check_actual == dob_check_calc and
        expiry_check_actual == expiry_check_calc and
        optional_check_actual == optional_check_calc and
        composite_check_actual == composite_check_calc
    )
    
    print(f"All check digits valid: {all_valid}")

if __name__ == "__main__":
    test_mrz_check_digits()
