import math
import sys


RAW_BB_VK_SIZE = 1760
GARAGA_VK_SIZE = 1888
RAW_HEADER_SIZE = 32
GARAGA_HEADER_SIZE = 96
G1_POINT_SIZE = 64
RAW_POINT_BYTES = 27 * G1_POINT_SIZE
ZERO_POINT = b"\x00" * G1_POINT_SIZE


def patch_vk(input_path, output_path):
    with open(input_path, "rb") as f:
        data = f.read()

    if len(data) == GARAGA_VK_SIZE:
        patched = data
        log_circuit_size = int.from_bytes(data[0:32], "big")
        public_inputs_size = int.from_bytes(data[32:64], "big")
        public_inputs_offset = int.from_bytes(data[64:96], "big")
    else:
        if len(data) != RAW_BB_VK_SIZE:
            raise ValueError(
                f"Unsupported VK length {len(data)} bytes. Expected {RAW_BB_VK_SIZE} "
                f"(raw bb VK) or {GARAGA_VK_SIZE} (Garaga-compatible VK)."
            )

        fields = [
            int.from_bytes(data[i * 8 : (i + 1) * 8], "big")
            for i in range(4)
        ]

        circuit_size, log_circuit_size, public_inputs_size, public_inputs_offset = fields

        expected_log = int(math.log2(circuit_size)) if circuit_size > 0 else 0
        if expected_log != log_circuit_size:
            raise ValueError(
                f"Inconsistent VK header: circuit_size={circuit_size}, "
                f"log_circuit_size={log_circuit_size}, expected {expected_log}."
            )

        raw_points = data[RAW_HEADER_SIZE:]
        if len(raw_points) != RAW_POINT_BYTES:
            raise ValueError(
                f"Unexpected raw VK point section length {len(raw_points)} bytes; "
                f"expected {RAW_POINT_BYTES}."
            )

        patched = (
            log_circuit_size.to_bytes(32, "big")
            + public_inputs_size.to_bytes(32, "big")
            + public_inputs_offset.to_bytes(32, "big")
            + raw_points
            + ZERO_POINT
        )

    if len(patched) != GARAGA_VK_SIZE:
        raise ValueError(
            f"Patched VK has invalid length {len(patched)} bytes; expected {GARAGA_VK_SIZE}."
        )

    with open(output_path, "wb") as f:
        f.write(patched)

    print(f"Patched VK written to {output_path}")
    print(f"Log Circuit Size: {log_circuit_size}")
    print(f"Public Inputs Size: {public_inputs_size}")
    print(f"Public Inputs Offset: {public_inputs_offset}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 patch_vk.py <input_vk> <output_vk>")
        sys.exit(1)

    patch_vk(sys.argv[1], sys.argv[2])
