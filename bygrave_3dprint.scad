/*
  Bygrave Position-Line Calculator — printable mechanical core
  Harrison-scale edition, sized to the supplied paper scale PDFs.

  The scale-carrying outside diameters are fixed by the wrap circumferences:
    inner (cotangent): 54.000 mm
    middle (cosine):   58.997 mm
    outer cursor tube: 63.953 mm

  Default lengths are inferred from the printable trim/registration extents
  in the supplied Harrison PDFs so the paper art can be aligned to tube ends.

  Print the tubes with the scale-bearing outside surfaces as accurately as
  possible. Measure actual OD before printing/gluing the paper wraps.
*/

$fn = 192;

// ---------- dimensions ----------
inner_od = 54.000;
inner_len = 215.90;
inner_wall = 2.40;

middle_od = 58.997;
middle_len = 194.90;
// ID chosen to clear inner + paper/glue + FDM tolerance.
middle_id = 54.80;

outer_od = 63.953;
outer_len = 196.850;
// ID chosen to clear middle + paper/glue + FDM tolerance.
outer_id = 59.80;

// Optional tiny seam witness notch at the bottom edge of the outer tube.
seam_notch = true;

// Outer-template window positions mapped from the supplied PDF.
// Angles are measured from the paper seam (left edge of outer wrap),
// increasing around the circumference.
upper_a0 = 273.072;
upper_a1 = 360.000;
upper_from_top = 0.000;
upper_to_top   = 12.700;

lower_a0 = 236.662;
lower_a1 = 350.442;
lower_from_top = 27.305;
lower_to_top   = 130.175;

module tube(od, id, h) {
  difference() {
    cylinder(d=od, h=h);
    translate([0,0,-0.5]) cylinder(d=id, h=h+1.0);
  }
}

// Solid cylindrical sector used as a subtractive window cutter.
module sector_prism(r, a0, a1, h, n=72) {
  da = a1-a0;
  pts = concat(
    [[0,0]],
    [for (i=[0:n]) [r*cos(a0 + da*i/n), r*sin(a0 + da*i/n)]]
  );
  linear_extrude(height=h) polygon(points=pts);
}

module inner_tube() {
  tube(inner_od, inner_od-2*inner_wall, inner_len);
}

module middle_tube() {
  tube(middle_od, middle_id, middle_len);
}

module outer_cursor_tube() {
  difference() {
    tube(outer_od, outer_id, outer_len);

    // PDF y increases down the page; model z increases upward.
    // Upper cursor window.
    translate([0,0,outer_len-upper_to_top-0.2])
      sector_prism(outer_od+3, upper_a0, upper_a1, upper_to_top-upper_from_top+0.4);

    // Lower cursor window.
    translate([0,0,outer_len-lower_to_top-0.2])
      sector_prism(outer_od+3, lower_a0, lower_a1, lower_to_top-lower_from_top+0.4);

    // Small seam witness at bottom edge, outside scale area.
    if (seam_notch)
      translate([outer_od/2-1.5,-0.7,-0.2]) cube([3.0,1.4,1.8]);
  }
}

// Short rings to test printer calibration/fit before committing to full tubes.
module calibration_rings() {
  h=12;
  translate([-70,0,0]) tube(inner_od, inner_od-2*inner_wall, h);
  translate([0,0,0]) tube(middle_od, middle_id, h);
  translate([70,0,0]) tube(outer_od, outer_id, h);
}

// ---------- choose part ----------
// Override with -D 'part="inner"' etc. from the command line.
part = "assembly";

if (part == "inner") inner_tube();
else if (part == "middle") middle_tube();
else if (part == "outer") outer_cursor_tube();
else if (part == "calibration") calibration_rings();
else if (part == "assembly") {
  color([0.88,0.80,0.58]) inner_tube();
  color([0.72,0.66,0.50,0.82]) middle_tube();
  color([0.25,0.27,0.30,0.72]) outer_cursor_tube();
}
else if (part == "exploded") {
  color([0.88,0.80,0.58]) translate([-75,0,0]) inner_tube();
  color([0.72,0.66,0.50]) middle_tube();
  color([0.25,0.27,0.30]) translate([78,0,0]) outer_cursor_tube();
}
