# V1.1 pointer prototype: checks and remaining calibration

Checked on 2026-10-10. This revision combines Claude's V1.1 wrap/clearance
model and ladder rings with newly authored triangular L/S pointers inspired
by the supplied illustrations. The illustrations did not have corresponding
pointer geometry in the original ZIP or Git bundle.

## What was generated and checked

- Inner, middle, outer sleeve, OD-check rings and two cursor coupons compiled
  with OpenSCAD 2026.01.02.wasm30347, using the Manifold backend, with no geometry
  errors. Pointer and shell intermediate meshes were also compiled for rendering.
- Seven distributed meshes are closed, have consistent winding and positive
  volume. The outer sleeve has one connected component, including both tips.
  The coupon file has two connected components. Each original Claude ladder
  has five closed components; its source geometry was carried forward unchanged.
- Surface calculations on the exported default pointer geometry give minimum
  radial gaps of **0.3000 mm at L** and **0.2790 mm at S** above the estimated
  finished wrapped tubes. The nominal reading-tip gap is 0.30 mm for both.
- Actual OpenSCAD solid intersections are empty for the inner wrapped tube,
  and for the middle at axial offsets -20, -12 and -7.5 mm.
- A deliberate raised-middle case at -6 mm produces an intersection with L.
  This positive control demonstrates that axial travel beyond the allowed
  envelope causes a real collision. There is no mechanical travel stop.
- All ten existing simulator math/coordinate tests passed. They cover the
  supported mathematical reduction branch and its schematic display mapping.
  They do not calibrate this CAD or Harrison's scale wraps.
- Assembly, exploded and close-up images render the actual OpenSCAD-exported
  meshes in Three.js. Wrap artwork is omitted. Red coloring is a render/paint
  cue; a normal STL has no filament color specification.

Machine-readable evidence: [mesh checks](cad-check-results.json) and
[solid intersections](cad-intersection-results.json).

## Dimensions and motion envelope

Defaults use 0.10 mm paper, 0.02 mm adhesive and 0.03 mm coating per surface.
Plastic OD = circumference/pi - paper thickness - 2*adhesive thickness.
Finished OD = plastic OD + 2*(paper + adhesive + coating).

| Quantity | Default, mm |
|---|---:|
| Inner plastic / finished OD | 53.8602 / 54.1602 |
| Middle plastic / finished OD | 58.8568 / 59.1568 |
| Middle bore | 54.5102 |
| Outer plastic OD / bore | 63.8129 / 59.5068 |
| Middle / outer wall | 2.1733 / 2.1531 |
| L / S tip height above sleeve bottom | 190.50 / 70.70 |
| Middle rim in rendered assembly | 182.90 |
| Conservative maximum middle rim height | 187.40 |

The default middle tube is translated -12 mm in the assembly render. Its
rim must remain below the L pointer body (lowest body height 187.50 mm).
Rotation of an ideal round tube does not change these radial clearances.
Physical ovality, paper seams, coating build-up, flex and printing errors
are not represented. The clearance is not a printer tolerance guarantee.

## Scale registration remains unresolved

The supplied Harrison PDFs were inspected locally and were not redistributed.
The outer reference rectangle is 569.52 by 558 points, corresponding to a
200.914 by 196.85 mm wrap. Its printed arrow landmarks map approximately to:

| Printed landmark | Angle from seam | Distance below wrap top |
|---|---:|---:|
| L arrow apex | 327.686 deg | 24.765 mm |
| S arrow apex | 318.584 deg | 133.223 mm |

These are graphic landmarks, not experimentally verified mechanical tip
targets. They differ from the illustration-inspired pointer defaults.
The proposed L and S offsets (6.35 and 126.15 mm below sleeve top) and their
8 mm angular reaches are explicitly adjustable prototype choices. They
must not be advertised as compatible calibrated Harrison indices.

The browser simulator still uses illustrative pitch, window sizes and pointer
registration. Its successful reductions cannot certify this physical design.
Remaining work is to establish the wrap seams, scale pitch and turn selection,
the correct pair of index locations, zero setting and usable axial travel;
then run complete physical-scale reductions and compare with independent trig.

## Reproduce and print the small checks first

Use a recent desktop OpenSCAD with the Manifold backend:

```sh
python3 tools/export_cad.py --openscad /path/to/openscad --render-parts
python3 tools/check_cad.py
python3 -m http.server 8000 --bind 127.0.0.1
```

The mesh-check script describes the distributed defaults; update its explicit
dimensions if checking customized exports. The renderer is at
`http://127.0.0.1:8000/tools/render_cad.html` with optional `?mode=exploded`,
`?mode=detailL` or `?mode=detailS`. It also displays the distributed default
assembly pose; change its values if rendering customized geometry.

For the solid checks, export `tests/cad-clearance.scad` with `part="check"`,
`test_case="inner"` or `"middle"`, and the chosen `test_middle_z`. An empty
intersection is expected; OpenSCAD reports it with exit code 1. The deliberate
`test_case="middle_collision"`, `test_middle_z=-6` case must export a solid.

Print OD checks, fit ladders and the small cursor coupons using the intended
material and finish. Check fit, tip visibility and support removal on the cured
wrapped tubes. A physical coupon fit still does not establish scale accuracy.
