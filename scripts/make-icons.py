# Génère les icônes PNG de l'app (point doré + anneau sur fond sombre), sans dépendance.
# Usage : python3 scripts/make-icons.py
import math
import struct
import zlib
from pathlib import Path

BG = (11, 11, 13)
GOLD = (201, 169, 97)
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'icons'


def png(path, size, pixels):
    raw = b''.join(b'\x00' + bytes(pixels[y * size * 3:(y + 1) * size * 3]) for y in range(size))
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
    data += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    path.write_bytes(data)


def icon(size, scale=1.0):
    # scale < 1 : motif réduit pour les icônes « maskable » (zone de sécurité Android).
    c = size / 2
    dot_r = size * 0.19 * scale
    ring_r = size * 0.39 * scale
    ring_w = size * 0.06 * scale
    px = bytearray(size * size * 3)
    ss = 3  # suréchantillonnage pour l'anticrénelage
    for y in range(size):
        for x in range(size):
            cover_dot = cover_ring = 0
            for sy in range(ss):
                for sx in range(ss):
                    d = math.hypot(x + (sx + 0.5) / ss - c, y + (sy + 0.5) / ss - c)
                    if d <= dot_r:
                        cover_dot += 1
                    elif abs(d - ring_r) <= ring_w / 2:
                        cover_ring += 1
            a = (cover_dot + cover_ring * 0.55) / (ss * ss)
            i = (y * size + x) * 3
            for k in range(3):
                px[i + k] = round(BG[k] * (1 - a) + GOLD[k] * a)
    return px


for name, size, scale in [
    ('icon-192.png', 192, 1.0),
    ('icon-512.png', 512, 1.0),
    ('icon-maskable-512.png', 512, 0.78),
    ('apple-touch-icon.png', 180, 0.9),
]:
    png(OUT / name, size, icon(size, scale))
    print(name, (OUT / name).stat().st_size, 'octets')
