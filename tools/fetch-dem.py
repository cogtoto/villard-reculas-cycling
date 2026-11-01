#!/usr/bin/env python3
"""Télécharge une fois le MNT réel autour du GPX et l'écrit dans public/dem-villard.{bin,json}.
Source : AWS Terrain Tiles (Terrarium, elevation-tiles-prod), zoom 13 (~13 m/px à 45°N),
données issues de SRTM / Copernicus / IGN selon la zone. Cache des tuiles dans tools/dem-cache/."""
import math, os, io, json, urllib.request
import numpy as np
from PIL import Image

LAT0, LAT1, LON0, LON1 = 45.058, 45.165, 5.965, 6.098   # bbox GPX (45.092–45.131, 6.015–6.048) + ~4 km
Z = 13
OUT_STEP = 0.00025  # ~28 m en latitude, ~20 m en longitude
HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'dem-cache'); os.makedirs(CACHE, exist_ok=True)

def tile_xy(lat, lon, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y

def tile(z, x, y):
    f = os.path.join(CACHE, f'{z}_{x}_{y}.png')
    if not os.path.exists(f):
        url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
        with urllib.request.urlopen(url, timeout=30) as r, open(f, 'wb') as o: o.write(r.read())
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float64)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768

x0, y0 = tile_xy(LAT1, LON0, Z); x1, y1 = tile_xy(LAT0, LON1, Z)
tx0, ty0, tx1, ty1 = int(x0), int(y0), int(x1), int(y1)
rows = [np.hstack([tile(Z, tx, ty) for tx in range(tx0, tx1 + 1)]) for ty in range(ty0, ty1 + 1)]
mosaic = np.vstack(rows)
print('tuiles', (tx1 - tx0 + 1) * (ty1 - ty0 + 1), 'mosaïque', mosaic.shape)

lats = np.arange(LAT1, LAT0, -OUT_STEP)          # ligne 0 = nord
lons = np.arange(LON0, LON1, OUT_STEP)
H = np.zeros((len(lats), len(lons)), dtype=np.float32)
for j, lat in enumerate(lats):
    px, py = tile_xy(lat, lons, Z)
    fx = (px - tx0) * 256 - 0.5; fy = (py - ty0) * 256 - 0.5
    ix = np.floor(fx).astype(int); iy = int(math.floor(fy)); ax = fx - ix; ay = fy - iy
    r0 = mosaic[iy, ix] * (1 - ax) + mosaic[iy, ix + 1] * ax
    r1 = mosaic[iy + 1, ix] * (1 - ax) + mosaic[iy + 1, ix + 1] * ax
    H[j] = r0 * (1 - ay) + r1 * ay
out = os.path.join(HERE, '..', 'public')
np.round(H).astype('<i2').tofile(os.path.join(out, 'dem-villard.bin'))
meta = dict(source='AWS Terrain Tiles (Terrarium) z13 — SRTM/Copernicus/IGN', latN=float(lats[0]), lonW=float(lons[0]),
            step=OUT_STEP, nx=len(lons), ny=len(lats), min=float(H.min()), max=float(H.max()), format='int16 LE, row 0 = north')
json.dump(meta, open(os.path.join(out, 'dem-villard.json'), 'w'), indent=1)
print(meta)
