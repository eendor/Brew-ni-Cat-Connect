"""Halve a Radiance (.hdr) image with a 2x2 box filter.

Used to make the small phone copy of the bundled studio HDRI:

    python3 -I scripts/downsample_hdr.py \
        public/three/hdri/studio_small_09_1k.hdr \
        public/three/hdri/studio_small_09_512.hdr

Pixels are averaged in linear light, then written back as RLE RGBE so
three.js HDRLoader reads the result like the original file.

It needs NumPy. It is a one-off tool: nothing in the build or CI runs it.
"""

import sys

import numpy as np


def read_hdr(path):
    with open(path, "rb") as f:
        data = f.read()
    pos = 0
    header = []
    while True:
        end = data.index(b"\n", pos)
        line = data[pos:end]
        pos = end + 1
        if not line:
            break
        header.append(line)
    if not header or not header[0].startswith(b"#?"):
        raise ValueError("not a Radiance file")
    if b"FORMAT=32-bit_rle_rgbe" not in header:
        raise ValueError("only 32-bit_rle_rgbe is supported")
    end = data.index(b"\n", pos)
    size = data[pos:end].split()
    pos = end + 1
    if size[0] != b"-Y" or size[2] != b"+X":
        raise ValueError("only -Y H +X W orientation is supported")
    height, width = int(size[1]), int(size[3])
    rgbe = np.zeros((height, width, 4), dtype=np.uint8)
    for y in range(height):
        if data[pos] != 2 or data[pos + 1] != 2 or (data[pos + 2] << 8 | data[pos + 3]) != width:
            raise ValueError("only new-style RLE scanlines are supported")
        pos += 4
        for channel in range(4):
            x = 0
            while x < width:
                count = data[pos]
                pos += 1
                if count > 128:
                    count -= 128
                    rgbe[y, x : x + count, channel] = data[pos]
                    pos += 1
                else:
                    rgbe[y, x : x + count, channel] = np.frombuffer(
                        data, dtype=np.uint8, count=count, offset=pos
                    )
                    pos += count
                x += count
    return rgbe


def to_float(rgbe):
    exponent = rgbe[..., 3].astype(np.int32)
    scale = np.where(exponent > 0, np.ldexp(1.0, exponent - 136), 0.0)
    return rgbe[..., :3].astype(np.float64) * scale[..., None]


def to_rgbe(rgb):
    brightest = rgb.max(axis=2)
    mantissa, exponent = np.frexp(brightest)
    out = np.zeros(rgb.shape[:2] + (4,), dtype=np.uint8)
    lit = brightest > 1e-32
    factor = np.where(lit, mantissa * 256.0 / np.where(lit, brightest, 1.0), 0.0)
    out[..., :3] = np.clip(rgb * factor[..., None], 0, 255).astype(np.uint8)
    out[..., 3] = np.where(lit, exponent + 128, 0).astype(np.uint8)
    return out


def encode_channel(values):
    out = bytearray()
    width = len(values)
    x = 0
    while x < width:
        run = 1
        while x + run < width and run < 127 and values[x + run] == values[x]:
            run += 1
        if run >= 4:
            out += bytes((128 + run, values[x]))
            x += run
            continue
        start = x
        while x < width and x - start < 128:
            if x + 3 < width and values[x] == values[x + 1] == values[x + 2] == values[x + 3]:
                break
            x += 1
        out.append(x - start)
        out += bytes(values[start:x])
    return out


def write_hdr(path, rgbe):
    height, width = rgbe.shape[:2]
    out = bytearray(b"#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n")
    out += f"-Y {height} +X {width}\n".encode()
    for y in range(height):
        out += bytes((2, 2, width >> 8, width & 255))
        for channel in range(4):
            out += encode_channel(rgbe[y, :, channel].tolist())
    with open(path, "wb") as f:
        f.write(out)


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: downsample_hdr.py <input.hdr> <output.hdr>")
    rgb = to_float(read_hdr(sys.argv[1]))
    height, width = rgb.shape[:2]
    half = rgb.reshape(height // 2, 2, width // 2, 2, 3).mean(axis=(1, 3))
    write_hdr(sys.argv[2], to_rgbe(half))
    print(f"{width}x{height} -> {width // 2}x{height // 2}")


if __name__ == "__main__":
    main()
