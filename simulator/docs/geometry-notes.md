# Geometry and calibration notes

## Repository inspected

Source: the `kq6up/bygrave` repository at commit `31a1bc2`, inspected before simulator integration.

- `git status --short --branch`: `main...origin/main` (clean).
- Latest/only commit: `31a1bc2 Initial 3D-printable Bygrave prototype`.
- `origin`: `git@github.com:kq6up/bygrave.git` for fetch and push.
- Present source files: `README.md`, `bygrave_3dprint.scad`, assembly/exploded PNGs, and three STL files. No simulator, tests, PDFs, or `Bygrave_Complete_Project_Handoff.md` are present in the checkout.
- The sandbox was developed separately; integration adds the simulator without changing the CAD, STL, or reference renders.

## Measured evidence and limits

The checkout README reports these circumferences and derived diameters, attributed there to registration/template geometry in Harrison's drawings:

| Scale-bearing part | Reported circumference | Reported diameter |
|---|---:|---:|
| Inner | 169.6466 mm | 54.0002 mm |
| Middle | 185.3438 mm | 58.9968 mm |
| Outer template | 200.9140 mm | 63.9529 mm |

The OpenSCAD source rounds the diameters to 54.000, 58.997, and 63.953 mm. It records the inner/middle/outer lengths as 215.90, 194.90, and 196.850 mm. The source defines two outer windows with angular and axial bounds, and says those positions were mapped from the PDF. This is evidence of the current CAD settings, not an independent measurement of the original PDF geometry.

The three Harrison PDFs and the complete project handoff were not in the inspected repository or supplied local inputs. Consequently, this pass could not independently recover PDF page boxes, vector-coordinate bounds, helix pitch, seams, registration marks, window boundaries, or L/S pointer-tip locations. The repository README links the original PDFs and says they are copyrighted and not included. No artwork was fetched, traced, copied, or added here.

The handoff's preliminary ~4.5 mm pitch is not independently verified. The local CAD only carries outer-window bounds; it does not establish a calibrated pointer offset. L/S locations, scale direction/branch transitions, circumferential repeats, axial registration, and tolerances remain unresolved until the source drawings or physical scale/cursor are available.

## Prototype mapping

The sandbox uses the mathematical coordinates

\[
L(\theta)=\log_{10}|\cot\theta|, \qquad S(\theta)=\log_{10}|\cos\theta|.
\]

The display maps these log values to a shared, unwrapped SVG axis for visibility. This is a mathematical visualization, not a claim that one SVG pixel or one axis span corresponds to a measured millimeter, tube rotation, cylinder pitch, or Harrison artwork coordinate. The guided procedure supports the ordinary first-quadrant branch (nonzero LAT/DEC, 0°<|LHA|<90°, and 0°<Y<90°); it rejects unsupported supplementary and near-singular cases with an explanation.

The L and S index lines are movable as one cursor assembly, while the inner and middle scales each move independently. In each guided step, the known scale settings are aligned, the user moves the cursor to the target mark, and the output is read by inverse-mapping the cotangent scale beneath L. The resulting Bygrave A is converted to true azimuth with the ordinary-branch hemisphere/east-west rules. A separate spherical-trig result is used for comparison. These pointer offsets are mathematical and not yet calibrated to the historical physical instrument.

## 3D visualization mapping

The 3D view uses the CAD's nominal tube radii and lengths. The middle tube's axial center (-43 mm), index heights (L at 60 mm, S at -25 mm), and enlarged cutaway windows are teaching choices. They are not recovered mechanical registration measurements.

The shared mapping wraps 820 flat-coordinate pixels into 24 turns with an illustrative 4.5 mm pitch. For scale offset o, cursor offset c, and pointer coordinate P, t = (x(log value) + o - c - P) / (820 / 24). The helical angle is 2πt and the axial position is indexHeight - 4.5t. A mark under a flat pointer therefore intersects the corresponding 3D index. A full turn changes the axial row even when the angular position repeats.

The outer frame stays fixed. Each scale's relative rotation is 2π(o-c)/(820/24), and its translation is -4.5(o-c)/(820/24). This represents relative movement of the scale and cursor without moving the camera around the assembly. The production CAD and STL files were not changed; this view does not establish mechanical fit or scale registration.

## Required evidence before geometric calibration

For a calibrated model, inspect the original three vector PDFs locally and record page boxes, coordinate extents, circumferential repeats, tick/pitch samples, trim/seam landmarks, window shapes, and L/S tip coordinates with units and uncertainty. Compare transformed paths against independently generated analytic scales. Then validate at least one exact registration setting and pointer offset against a physical paper/cursor sample. The current CAD values can be used as comparison targets, not as substitutes for that evidence.
