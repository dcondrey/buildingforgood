"""Derive simplified neighborhood outlines for the AreaMap SVG.

Reads the hackathon block grid, dissolves blocks to the six canonical areas on
a coarse occupancy grid (aggregate outlines only, no block geometry emitted),
and prints viewBox-space SVG path strings plus label anchors.

The outlines ship in app/src/App.tsx as AREA_MAP_GEOMETRY. Label anchors there
were hand-nudged from the centroids this prints. Requires the untracked
data/raw organizer bundle; rerun only if the block grid changes.
"""

import json
import logging
import math
from collections import Counter, defaultdict

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

GEOJSON = "/Volumes/A/stillhere/data/raw/hackathon_provided/Downtown_BlockGrid.geojson"
CANONICAL = {
    "East Village": "east_village",
    "South East Village": "east_village",
    "City Center": "city_center",
    "Columbia": "columbia",
    "Cortez": "cortez",
    "Gaslamp": "gaslamp",
    "Marina": "marina",
}
VIEW_W, VIEW_H = 160.0, 150.0
MARGIN = 6.0

with open(GEOJSON) as fh:
    data = json.load(fh)

feats = [f for f in data["features"] if f["properties"]["neighborhood"] in CANONICAL]

# Equirectangular projection with cos(lat) correction (onrecord technique).
lats = [c[1] for f in feats for ring in f["geometry"]["coordinates"] for c in ring]
lons = [c[0] for f in feats for ring in f["geometry"]["coordinates"] for c in ring]
lat0 = sum(lats) / len(lats)
kx = math.cos(math.radians(lat0))


def project(lon, lat):
    return lon * kx, -lat  # y down


pts = [project(lon, lat) for lon, lat in zip(lons, lats)]
xs = [p[0] for p in pts]
ys = [p[1] for p in pts]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)

# Cell size from median block pitch: use sqrt of median block bbox area.
areas_px = []
for f in feats:
    ring = f["geometry"]["coordinates"][0]
    px = [project(lon, lat) for lon, lat in ring]
    bw = max(p[0] for p in px) - min(p[0] for p in px)
    bh = max(p[1] for p in px) - min(p[1] for p in px)
    areas_px.append((bw, bh))
areas_px.sort(key=lambda t: t[0] * t[1])
med_w, med_h = areas_px[len(areas_px) // 2]
CELL = max(med_w, med_h) * 0.75  # slightly finer than a block

NX = int((maxx - minx) / CELL) + 2
NY = int((maxy - miny) / CELL) + 2

# Occupancy: mark every cell overlapped by a block's bbox (closes street gaps).
cell_votes: dict[tuple[int, int], Counter] = defaultdict(Counter)
for f in feats:
    area = CANONICAL[f["properties"]["neighborhood"]]
    ring = f["geometry"]["coordinates"][0]
    px = [project(lon, lat) for lon, lat in ring]
    bx0 = min(p[0] for p in px) - minx
    bx1 = max(p[0] for p in px) - minx
    by0 = min(p[1] for p in px) - miny
    by1 = max(p[1] for p in px) - miny
    i0, i1 = int(bx0 / CELL), int(bx1 / CELL)
    j0, j1 = int(by0 / CELL), int(by1 / CELL)
    for i in range(i0, i1 + 1):
        for j in range(j0, j1 + 1):
            # overlap fraction of the cell
            ox = min(bx1, (i + 1) * CELL) - max(bx0, i * CELL)
            oy = min(by1, (j + 1) * CELL) - max(by0, j * CELL)
            if ox > 0.2 * CELL and oy > 0.2 * CELL:
                cell_votes[(i, j)][area] += 1

owner: dict[tuple[int, int], str] = {}
for cell, votes in cell_votes.items():
    owner[cell] = votes.most_common(1)[0][0]

# Fill single-cell holes fully surrounded (4-neighborhood) by one area.
changed = True
while changed:
    changed = False
    for i in range(NX):
        for j in range(NY):
            if (i, j) in owner:
                continue
            nb = [owner.get(c) for c in ((i - 1, j), (i + 1, j), (i, j - 1), (i, j + 1))]
            vals = {v for v in nb if v}
            if len(vals) == 1 and all(v is not None for v in nb):
                owner[(i, j)] = vals.pop()
                changed = True


def trace_outline(cells: set[tuple[int, int]]):
    """Boundary edges of a rectilinear cell union, chained into loops."""
    edges = set()
    for i, j in cells:
        for edge, nb in (
            (((i, j), (i + 1, j)), (i, j - 1)),  # top
            (((i + 1, j), (i + 1, j + 1)), (i + 1, j)),  # right
            (((i + 1, j + 1), (i, j + 1)), (i, j + 1)),  # bottom
            (((i, j + 1), (i, j)), (i - 1, j)),  # left
        ):
            if nb not in cells:
                edges.add(edge)
    # chain
    nxt = {}
    for a, b in edges:
        nxt[a] = b
    loops = []
    seen = set()
    for start in list(nxt):
        if start in seen:
            continue
        loop = [start]
        seen.add(start)
        cur = nxt[start]
        while cur != start:
            loop.append(cur)
            seen.add(cur)
            cur = nxt[cur]
        loops.append(loop)
    loops.sort(key=len, reverse=True)
    return loops[0]


def simplify(loop):
    """Drop collinear points."""
    out = []
    n = len(loop)
    for k in range(n):
        a, b, c = loop[k - 1], loop[k], loop[(k + 1) % n]
        if (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) != 0:
            out.append(b)
    return out


# Scale grid coords into the viewBox.
gx0, gx1 = 0, NX
gy0, gy1 = 0, NY
# tight bounds of owned cells
oi = [c[0] for c in owner]
oj = [c[1] for c in owner]
gi0, gi1, gj0, gj1 = min(oi), max(oi) + 1, min(oj), max(oj) + 1
span = max(gi1 - gi0, (gj1 - gj0) * (VIEW_H - 2 * MARGIN) / (VIEW_W - 2 * MARGIN))
sx = (VIEW_W - 2 * MARGIN) / (gi1 - gi0)
sy = (VIEW_H - 2 * MARGIN) / (gj1 - gj0)
s = min(sx, sy)


def to_view(p):
    return (round(MARGIN + (p[0] - gi0) * s, 1), round(MARGIN + (p[1] - gj0) * s, 1))


result = {}
for area in sorted(set(CANONICAL.values())):
    cells = {c for c, a in owner.items() if a == area}
    loop = simplify(trace_outline(cells))
    view = [to_view(p) for p in loop]
    d = "M" + " L".join(f"{x},{y}" for x, y in view) + " Z"
    cx = round(sum(p[0] for p in view) / len(view), 1)
    cy = round(sum(p[1] for p in view) / len(view), 1)
    result[area] = {"outline": d, "label": (cx, cy), "points": len(view)}

log.info("cells: %d  grid %dx%d  cell %.6f", len(owner), NX, NY, CELL)
for area, info in result.items():
    log.info("\n// %s (%d pts, label %s)", area, info["points"], info["label"])
    log.info("%s", info["outline"])
