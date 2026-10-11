#!/usr/bin/env python3
"""Check exported STL topology and pointer clearance using only Python 3."""
import collections
import json
import math
import pathlib
import re
import struct

ROOT = pathlib.Path(__file__).resolve().parents[1]


def triangles(path):
    b = path.read_bytes()
    if len(b) >= 84 and len(b) == 84 + 50 * struct.unpack_from('<I', b, 80)[0]:
        return [tuple(struct.unpack_from('<3f', b, p + 12 + j * 12)
                      for j in range(3))
                for p in range(84, len(b), 50)]
    vs = [tuple(map(float, x)) for x in re.findall(
        r'vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)', b.decode())]
    return [tuple(vs[i:i+3]) for i in range(0, len(vs), 3)]


def mesh_report(path):
    ts = triangles(path)
    edges = collections.Counter()
    directions = collections.Counter()
    graph = collections.defaultdict(set)
    volume = 0
    for t in ts:
        a, b, c = t
        volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) +
                   a[1]*(b[2]*c[0]-b[0]*c[2]) +
                   a[2]*(b[0]*c[1]-b[1]*c[0])) / 6
        for p, q in zip(t, t[1:]+t[:1]):
            edges[tuple(sorted((p, q)))] += 1
            directions[(p, q)] += 1
            graph[p].add(q)
            graph[q].add(p)
    pending = set(graph)
    components = 0
    while pending:
        components += 1
        stack = [pending.pop()]
        while stack:
            for q in graph[stack.pop()]:
                if q in pending:
                    pending.remove(q)
                    stack.append(q)
    closed = all(n == 2 for n in edges.values())
    oriented = all(directions[(p,q)] == directions[(q,p)] for p,q in directions)
    assert ts and closed and oriented and volume > 0, path.name
    return {'file': path.name, 'triangles': len(ts), 'closed': closed,
            'consistent_winding': oriented, 'components': components,
            'volume_mm3': round(volume, 3)}


def min_radial_distance(ts):
    # Each XY-projected triangle lies in an angular wedge < 180 degrees.
    # Minimum radius occurs at a vertex or on an edge (not inside the wedge).
    best = math.inf
    for t in ts:
        for a,b in zip(t,t[1:]+t[:1]):
            dx,dy = b[0]-a[0],b[1]-a[1]
            den=dx*dx+dy*dy
            u=max(0,min(1,-(a[0]*dx+a[1]*dy)/den)) if den else 0
            best=min(best,math.hypot(a[0]+u*dx,a[1]+u*dy))
    return best


if __name__ == '__main__':
    files=['bygrave_inner_tube.stl','bygrave_middle_tube.stl',
           'bygrave_outer_cursor_tube.stl','bygrave_cursor_coupons.stl',
           'bygrave_od_check_rings.stl','bygrave_ladder_middle.stl',
           'bygrave_ladder_outer.stl']
    report={'meshes':[mesh_report(ROOT/n) for n in files]}
    assert report['meshes'][2]['components']==1, 'Pointers must join sleeve'
    assert report['meshes'][3]['components']==2, 'Two connected coupons expected'
    # Parameters below describe the distributed default export. For customized
    # exports update these values to the source/echo output before using this check.
    inner_finished=169.6466/math.pi+0.10+2*0.03
    middle_finished=185.3438/math.pi+0.10+2*0.03
    outer=triangles(ROOT/'bygrave_outer_cursor_tube.stl')
    l=[t for t in outer if all(187.49<=p[2]<=193.51 for p in t)]
    s=[t for t in outer if all(67.69<=p[2]<=73.71 for p in t)]
    lgap=min_radial_distance(l)-inner_finished/2
    sgap=min_radial_distance(s)-middle_finished/2
    assert lgap>0.29 and sgap>0.16, 'Pointer surface must clear finished wrap'
    report['default_clearance']={'L_min_radial_gap_mm':round(lgap,4),
        'S_min_radial_gap_mm':round(sgap,4),'nominal_tip_gap_mm':0.30,
        'middle_rim_z_mm':182.9,'L_body_min_z_mm':187.5,
        'conservative_middle_top_limit_mm':187.4}
    report['scope']='Mesh and default-pose mechanical checks only; no scale registration or physical print validation.'
    print(json.dumps(report,indent=2))
