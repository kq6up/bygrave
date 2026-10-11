#!/usr/bin/env python3
"""Export default CAD parts and optional intermediate meshes for the renderer."""
import argparse
import os
import pathlib
import shutil
import subprocess

root = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--openscad', default=shutil.which('openscad') or 'openscad')
parser.add_argument('--render-parts', action='store_true')
args = parser.parse_args()
parts = {'inner':'bygrave_inner_tube.stl', 'middle':'bygrave_middle_tube.stl',
         'outer':'bygrave_outer_cursor_tube.stl', 'od_check':'bygrave_od_check_rings.stl',
         'ladder_middle':'bygrave_ladder_middle.stl', 'ladder_outer':'bygrave_ladder_outer.stl',
         'cursor_coupon':'bygrave_cursor_coupons.stl'}
if args.render_parts:
    (root/'tools/render-parts').mkdir(exist_ok=True)
    parts.update({'shell':'tools/render-parts/shell.stl',
                  'pointers':'tools/render-parts/pointers.stl'})
env = dict(os.environ, QT_QPA_PLATFORM='offscreen')
for part, filename in parts.items():
    subprocess.run([args.openscad, '--backend=Manifold', '--export-format', 'binstl',
                    '-D', f'part="{part}"', '-o', str(root/filename),
                    str(root/'bygrave_3dprint.scad')], check=True, env=env)
shutil.copyfile(root/'bygrave_od_check_rings.stl',root/'bygrave_calibration_rings.stl')
