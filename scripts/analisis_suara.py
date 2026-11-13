# Titik sumber suara 3D: simpul rawan macet (pertemuan arteri/kolektor), titik gemuruh lalu lintas di arteri
import os, json, math
import numpy as np, osmnx as ox, networkx as nx
from shapely.geometry import Polygon, LineString, Point
from pyproj import Transformer
OSM = os.environ.get('BLOKM_OSM', 'build/osm/blokm.osm'); W = os.environ.get('BLOKM_BUILD', 'build/')
REG = json.load(open(os.path.dirname(OSM) + '/reg.json'))
MPP, OX, OY, TW, TH = 1.44, 515, 462, 1400, 717
T = Transformer.from_crs(4326, 32748, always_xy=True); c_, s_ = math.cos(math.radians(REG['th'])), math.sin(math.radians(REG['th']))
def ll2w(lon, lat):
    e, n = T.transform(np.asarray(lon, float), np.asarray(lat, float)); e = e - REG['E0']; n = n - REG['N0']
    x = (e * c_ - n * s_) / (MPP * REG['s']) + OX + REG['dx']; y = OY + REG['dy'] - (e * s_ + n * c_) / (MPP * REG['s'])
    return (x - OX) * MPP, (y - OY) * MPP
FR = Polygon([(-OX * MPP, -OY * MPP), ((TW - OX) * MPP, -OY * MPP), ((TW - OX) * MPP, (TH - OY) * MPP), (-OX * MPP, (TH - OY) * MPP)]).buffer(-30)
BOBOT = {'primary': 3, 'primary_link': 2, 'trunk': 3, 'secondary': 2, 'secondary_link': 1.5, 'tertiary': 1, 'busway': 1.5}
G = ox.simplify_graph(ox.graph_from_xml(OSM, simplify=False, retain_all=True))
G = ox.convert.to_undirected(G)
hw = lambda d: d.get('highway')[0] if isinstance(d.get('highway'), list) else d.get('highway')
nm = lambda d: (d.get('name')[0] if isinstance(d.get('name'), list) else d.get('name')) or ''
cand = []
for n, dd in G.nodes(data=True):
    x, z = map(float, ll2w(dd['x'], dd['y']))
    if not FR.contains(Point(x, z)): continue
    es = [d for _, _, d in G.edges(n, data=True) if hw(d) in BOBOT]
    if len(es) < 3: continue
    sk = sum(BOBOT[hw(d)] for d in es); names = sorted({nm(d).replace('Jalan ', 'Jl. ') for d in es if nm(d)})
    if len(names) < 2 and sk < 8: continue
    cand.append([x, z, sk, ' × '.join(names[:2])])
cand.sort(key=lambda c: -c[2]); macet = []
for c in cand:
    if all(math.hypot(c[0] - m[0], c[1] - m[1]) > 90 for m in macet): macet.append(c)
macet = macet[:9]
gemuruh = []
for u, v, d in G.edges(data=True):
    if hw(d) not in ('primary', 'secondary', 'trunk'): continue
    xs, ys = d['geometry'].xy if 'geometry' in d else ([G.nodes[u]['x'], G.nodes[v]['x']], [G.nodes[u]['y'], G.nodes[v]['y']])
    X, Z = ll2w(list(xs), list(ys)); ln = LineString(list(zip(X, Z)))
    for t in np.arange(60, ln.length, 220):
        p = ln.interpolate(t)
        if FR.contains(p) and all(math.hypot(p.x - g[0], p.y - g[1]) > 160 for g in gemuruh): gemuruh.append([round(p.x, 1), round(p.y, 1), 3 if hw(d) == 'primary' else 2])
print('rawan macet', [(m[3], m[2]) for m in macet]); print('titik gemuruh', len(gemuruh))
v4 = json.load(open(W + 'data_v4.json'))
v4['suara'] = dict(macet=[[round(m[0], 1), round(m[1], 1), m[2], m[3]] for m in macet], gemuruh=gemuruh)
json.dump(v4, open(W + 'data_v4.json', 'w'), separators=(',', ':'), ensure_ascii=False)
