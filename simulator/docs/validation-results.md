# Validation results

The math test suite passed on 2026-10-10: seven tests, zero failures. It checks forward/inverse transforms across the supported branch, singularity rejection, the handoff's three ordinary altitude references, east/west azimuth symmetry, ordinary Bygrave y/Y/A/altitude values, and true-azimuth quadrant conversion against the independent reference.

The page was served locally and loaded in Playwright. Slider-driven full sequences for all three handoff examples and north/south plus east/west variants matched the independent altitude/azimuth references. For (+34°, +15°, +40° west), the sequence produced y=19.279°, Y=75.279°, A=72.212°, true azimuth=252.212°, and altitude=49.304°; the independent check gives 49.3031° and 252.2121°. The reported altitude residual was 0.07 arcminutes. The browser reported no console errors.

Fine-position controls were verified in the browser: entering 4.37 px synchronized the cursor slider, and a +0.01 px nudge synchronized the numeric field and readout at 4.38 px. A fresh guided reduction still reached y=19.279°, Y=75.279°, A=72.212°, true azimuth=252.212°, and altitude=49.304° with a 0.07′ residual. The browser reported no console errors.

After adding the symbol glossary and explicit scale instructions, the browser walkthrough confirmed the live readouts identify lowercase y at L/cotangent in step 1, A at L/cotangent in step 3, and h at L/cotangent in step 4; the S/cosine targets are H, uppercase Y, and zero respectively. The final h card remains blank until the cursor reaches zero. The same example still returned altitude 49.304° with a 0.07′ residual. The rendered glossary and step cards were inspected visually, with no horizontal page overflow at the browser's current width and no console errors.

The repository's existing CAD, its fit, and Harrison artwork geometry have not been validated by this simulator work.

The browser also verified the direct S-angle controls and independent nudges on all three parts. Moving S to 39.999° updated both L/S live readings while retaining the two strip offsets; a +0.001° angular nudge reached 40.000°. Adjusting an accepted step-1 alignment cleared stale Y and disabled continuation until the updated y was accepted. Target alignment completed the example through y=19.279°, Y=75.279°, A=72.212°, true azimuth=252.212°, and h=49.303°, with an altitude residual displayed as 0.00′. A 90° entry was rejected without moving the cursor. The existing seven math tests passed.

## 3D display checks

After adding the 3D display, the combined math and coordinate suite passed: ten tests, zero failures. The three added checks cover flat/helical index agreement, axial separation after a full turn, and common relative motion of both scales when the cursor moves.

Four live guided reductions were completed with inputs (+34, +15, +40), (+34, -10, +65), (+30, -20, +25), and (-34, -15, -40). Each matched the independent altitude reference with a displayed residual of 0.00 arcminutes. The projected L/S labels matched the flat readings throughout. Switching views preserved state; the outer frame remained fixed. Front/angled camera and zoom controls were exercised, and the rendered tube assembly was visually inspected in native screenshots.

Native automated drag attempts timed out, so they were not recorded as successful checks. The user subsequently reported that mouse adjustment was sufficiently fine. Direct numeric and angle controls were checked live. No JavaScript errors were reported; repeated view switching produced a scroll-anchoring warning. The narrow layout has not been independently inspected.

## Known scope

- Scale transforms are implemented for angles strictly between 0° and 90°; the cosine scale also has an explicit zero stop. Integer tick marks run from 1° through 89°.
- The independent spherical-trigonometry functions accept signed latitude/declination and signed hour angle; azimuth is true azimuth clockwise from north, with positive hour angle westward.
- The visual app provides a guided ordinary-branch reduction with user-adjustable cursor movement, hundredth-pixel numeric positioning, and inverse-transform readings at rendered pointer lines. Supplementary/quadrant sign rules, Harrison drawing calibration, and special near-90° procedures remain unsupported.
- No physical print or comparison against a calibrated historical 3D instrument has been performed.
