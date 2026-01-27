#!/usr/bin/env python3
"""
Create simple placeholder PNG icons for the extension.
These are basic blue square icons with a white clock symbol.
For better icons, convert the SVG manually or install Pillow.
"""

import struct
import zlib
import os

def create_png(width, height, color):
    """Create a simple PNG file with a solid color and basic clock design."""

    def chunk(chunk_type, data):
        """Create a PNG chunk."""
        chunk_len = struct.pack('>I', len(data))
        chunk_crc = struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff)
        return chunk_len + chunk_type + data + chunk_crc

    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)

    # Create image data (simple design)
    r, g, b = color
    rows = []

    center = width // 2
    radius = int(width * 0.35)
    inner_radius = int(width * 0.28)

    for y in range(height):
        row = b'\x00'  # Filter byte
        for x in range(width):
            # Distance from center
            dx = x - center
            dy = y - center
            dist = (dx * dx + dy * dy) ** 0.5

            if dist <= radius and dist >= inner_radius:
                # White ring (clock face border)
                row += bytes([255, 255, 255])
            elif dist < inner_radius:
                # White clock face
                row += bytes([255, 255, 255])
            else:
                # Blue background
                row += bytes([r, g, b])

        rows.append(row)

    # Add clock hands (simplified)
    raw_data = b''.join(rows)

    # Compress
    compressed = zlib.compress(raw_data, 9)

    # IDAT chunk
    idat = chunk(b'IDAT', compressed)

    # IEND chunk
    iend = chunk(b'IEND', b'')

    return signature + ihdr + idat + iend


def main():
    sizes = [16, 32, 48, 128]
    color = (0, 82, 204)  # JIRA blue

    script_dir = os.path.dirname(os.path.abspath(__file__))
    icons_dir = os.path.join(script_dir, '..', 'src', 'icons')

    os.makedirs(icons_dir, exist_ok=True)

    for size in sizes:
        png_data = create_png(size, size, color)
        output_path = os.path.join(icons_dir, f'icon{size}.png')

        with open(output_path, 'wb') as f:
            f.write(png_data)

        print(f'Created: icon{size}.png')

    print('Done! Placeholder icons created.')
    print('For better icons, convert src/icons/icon.svg to PNG manually.')


if __name__ == '__main__':
    main()
