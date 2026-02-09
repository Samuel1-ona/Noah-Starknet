import sys
from garaga.precompiled_circuits.zk_honk import G2_POINT_KZG_1, G2_POINT_KZG_2

def print_g2(name, p):
    print(f"{name}:")
    print(f"  x0: {hex(p.x[0])}")
    print(f"  x1: {hex(p.x[1])}")
    print(f"  y0: {hex(p.y[0])}")
    print(f"  y1: {hex(p.y[1])}")

print_g2("G2_POINT_KZG_1", G2_POINT_KZG_1)
print_g2("G2_POINT_KZG_2", G2_POINT_KZG_2)
