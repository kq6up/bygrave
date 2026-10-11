/*
  Bygrave Position-Line Calculator — printable mechanical core
  Harrison-scale edition, sized to the supplied paper scale PDFs.

  V1.1: the artwork is the fixed reference.
    * Each scale-carrying tube is sized so the MIDDLE of the paper (its
      neutral plane) lands exactly on the artwork circumference. The plastic
      therefore comes out slightly SMALLER than circumference/pi.
    * Each bore is sized from the finished (wrapped + glued + sealed)
      diameter of the tube that slides inside it, plus a running clearance.
    * Build in order, measuring as you go:
        1. Print part="od_check" and measure: does the printer hit the
           plastic ODs echoed in the console?
        2. Print the inner tube, wrap and seal it, measure its finished OD.
        3. Print part="ladder_middle" with -D inner_finished_measured=<value>,
           try each ring on the wrapped inner tube, pick the best clearance.
        4. Print the middle tube with that measurement and clearance.
        5. Repeat 2-4 for the middle tube and part="ladder_outer".
    * Leave a *_measured value at 0 to use the estimate from the paper
      parameters instead.

  Example:
    openscad -o middle.stl -D 'part="middle"' \
      -D inner_finished_measured=54.31 -D middle_clearance=0.35 bygrave_3dprint.scad
*/

$fn = 192;

// ---------- artwork (fixed by Harrison's PDFs; do not change) ----------
inner_circ  = 169.6466;   // inner (cotangent) scale wrap circumference, mm
middle_circ = 185.3438;   // middle (cosine) scale wrap circumference, mm
outer_circ  = 200.9140;   // outer instruction/cursor wrap circumference, mm

// ---------- wrap materials (measure yours with calipers) ----------
paper_t = 0.10;   // printed paper or film thickness, mm
glue_t  = 0.02;   // adhesive layer under the paper, mm
coat_t  = 0.03;   // shellac or other sealing coat on top, mm

// ---------- measured finished diameters (0 = use estimate) ----------
inner_finished_measured  = 0;   // inner tube OD after wrapping and sealing
middle_finished_measured = 0;   // middle tube OD after wrapping and sealing

// ---------- running clearances (diametral, mm) ----------
middle_clearance = 0.35;   // middle bore over finished inner tube
outer_clearance  = 0.35;   // outer bore over finished middle tube

// Clearances tried by the ladder rings (diametral, mm).
ladder_steps = [0.15, 0.25, 0.35, 0.45, 0.55];

// ---------- lengths and walls ----------
inner_len  = 215.90;
inner_wall = 2.40;
middle_len = 194.90;
outer_len  = 196.850;
min_wall   = 1.6;     // warn if a computed wall is thinner than this

// ---------- experimental V1.1 reading pointers ----------
// Inspired by the supplied red-pointer illustrations, not a recovered CAD
// model or calibrated Harrison index. Heights/angles must be registered to
// the chosen scale wraps before navigation use.
pointers = true;
pointer_l_from_top = 6.35;     // L tip z = 190.50 mm with default outer length
pointer_s_from_top = 126.15;   // S tip z = 70.70 mm
pointer_l_gap = 0.30;         // radial gap above FINISHED inner tube, mm
pointer_s_gap = 0.30;         // increased from illustration's ~0.18 mm
pointer_arc = 8.0;            // arc from window edge to tip, mm
pointer_base_height = 6.0;
pointer_tip_height = 0.40;     // finite printable reading edge, not zero-width
pointer_tip_thickness = 0.80;  // radial thickness at reading edge
pointer_root_overlap = 3.0;   // degrees beyond window edge into solid sleeve
pointer_segments = 24;        // curved underside avoids chord/tube collisions
middle_assembly_z = -12.0;    // keep middle rim below inward-reaching L

// ---------- derived dimensions ----------
// Plastic OD that puts the paper's mid-thickness on the artwork circumference.
function plastic_od(circ) = circ/PI - 2*glue_t - paper_t;
// Expected finished OD of a wrapped, sealed tube.
function finished_od(plastic) = plastic + 2*(glue_t + paper_t + coat_t);

inner_od  = plastic_od(inner_circ);
middle_od = plastic_od(middle_circ);
outer_od  = plastic_od(outer_circ);

inner_finished  = inner_finished_measured  > 0 ? inner_finished_measured  : finished_od(inner_od);
middle_finished = middle_finished_measured > 0 ? middle_finished_measured : finished_od(middle_od);

middle_id = inner_finished  + middle_clearance;
outer_id  = middle_finished + outer_clearance;

echo(str("inner  plastic OD ", inner_od,  "  expected finished ", finished_od(inner_od),
         "  using ", inner_finished, inner_finished_measured > 0 ? " (measured)" : " (estimate)"));
echo(str("middle plastic OD ", middle_od, "  bore ", middle_id,
         "  wall ", (middle_od - middle_id)/2,
         "  expected finished ", finished_od(middle_od),
         "  using ", middle_finished, middle_finished_measured > 0 ? " (measured)" : " (estimate)"));
echo(str("outer  plastic OD ", outer_od,  "  bore ", outer_id,
         "  wall ", (outer_od - outer_id)/2));
if ((middle_od - middle_id)/2 < min_wall) echo("WARNING: middle tube wall below min_wall");
if ((outer_od - outer_id)/2 < min_wall)   echo("WARNING: outer tube wall below min_wall");

// Optional tiny seam witness notch at the bottom edge of the outer tube.
seam_notch = true;

// Outer-template window positions mapped from the supplied PDF.
// Angles are measured from the paper seam (left edge of outer wrap),
// increasing around the circumference. Angles do not depend on diameter.
upper_a0 = 273.072;
upper_a1 = 360.000;
upper_from_top = 0.000;
upper_to_top   = 12.700;

lower_a0 = 236.662;
lower_a1 = 350.442;
lower_from_top = 27.305;
lower_to_top   = 130.175;

pointer_l_z = outer_len - pointer_l_from_top;
pointer_s_z = outer_len - pointer_s_from_top;
pointer_angle = pointer_arc / (outer_od/2) * 180/PI;
pointer_l_r = inner_finished/2 + pointer_l_gap;
pointer_s_r = middle_finished/2 + pointer_s_gap;
assert(paper_t >= 0 && glue_t >= 0 && coat_t >= 0, "Negative wrap thickness");
assert(middle_clearance > 0 && outer_clearance > 0, "Clearances must be positive");
assert((middle_od-middle_id)/2 >= min_wall, "Middle wall too thin");
assert((outer_od-outer_id)/2 >= min_wall, "Outer wall too thin");
assert(!pointers || (pointer_l_gap > 0 && pointer_s_gap > 0), "Pointer gap must be positive");
assert(!pointers || (pointer_arc > 0 && pointer_angle < min(upper_a1-upper_a0,lower_a1-lower_a0)),
       "Pointer reaches outside window");
assert(!pointers || (pointer_tip_height > 0 && pointer_tip_height <= pointer_base_height &&
       pointer_tip_thickness > 0 && pointer_root_overlap > 0 && pointer_root_overlap < 8),
       "Invalid pointer dimensions or attachment overlap");
assert(!pointers || (pointer_segments >= 4 && floor(pointer_segments) == pointer_segments),
       "Pointer segments must be an integer >= 4");
assert(!pointers || pointer_l_z-pointer_base_height/2 > outer_len-upper_to_top,
       "L pointer crosses upper window floor");
assert(!pointers || pointer_l_z+pointer_base_height/2 < outer_len,
       "L pointer crosses sleeve top");
assert(!pointers || (pointer_s_z-pointer_base_height/2 > outer_len-lower_to_top &&
       pointer_s_z+pointer_base_height/2 < outer_len-lower_from_top),
       "S pointer crosses lower window ends");
assert(!pointers || middle_assembly_z+middle_len < pointer_l_z-pointer_base_height/2,
       "Middle rim can strike L; lower the middle tube in assembly");

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

module outer_cursor_shell() {
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

// Each triangular pointer follows the sleeve curvature. Discrete closed
// wedges share faces and are united into a single solid with the sleeve.
// Planar chords over the full pointer arc would dip into the wrapped tube.
function polar_point(r,a,z) = [r*cos(a), r*sin(a), z];
module reading_pointer(edge,z,tip_r) {
  root_lo = outer_id/2 + 0.10;
  root_hi = outer_od/2 - 0.05;
  assert(tip_r+pointer_tip_thickness < outer_od/2, "Pointer tip outside sleeve");
  for (i=[0:pointer_segments-1]) {
    t0=i/pointer_segments; t1=(i+1)/pointer_segments;
    a0=edge-pointer_angle+(pointer_angle+pointer_root_overlap)*t0;
    a1=edge-pointer_angle+(pointer_angle+pointer_root_overlap)*t1;
    r0=tip_r+(root_lo-tip_r)*t0; r1=tip_r+(root_lo-tip_r)*t1;
    q0=tip_r+pointer_tip_thickness+(root_hi-tip_r-pointer_tip_thickness)*t0;
    q1=tip_r+pointer_tip_thickness+(root_hi-tip_r-pointer_tip_thickness)*t1;
    h0=pointer_tip_height+(pointer_base_height-pointer_tip_height)*t0;
    h1=pointer_tip_height+(pointer_base_height-pointer_tip_height)*t1;
    polyhedron(points=[
      polar_point(r0,a0,z-h0/2), polar_point(q0,a0,z-h0/2),
      polar_point(q0,a0,z+h0/2), polar_point(r0,a0,z+h0/2),
      polar_point(r1,a1,z-h1/2), polar_point(q1,a1,z-h1/2),
      polar_point(q1,a1,z+h1/2), polar_point(r1,a1,z+h1/2)
    ], faces=[[0,3,2,1],[4,5,6,7],[0,1,5,4],
              [1,2,6,5],[2,3,7,6],[3,0,4,7]], convexity=4);
  }
}
module pointer_pair() {
  if (pointers) {
    reading_pointer(upper_a1,pointer_l_z,pointer_l_r);
    reading_pointer(lower_a1,pointer_s_z,pointer_s_r);
  }
}
module outer_cursor_tube() {
  union() { outer_cursor_shell(); pointer_pair(); }
}
module cursor_coupon(edge,z,x_offset) {
  translate([x_offset-outer_od/2,12,6-z]) rotate([0,0,-edge])
    intersection() {
      outer_cursor_tube();
      translate([0,0,z-6])
        sector_prism(outer_od+3,edge-pointer_angle-1,edge+8,12);
    }
}
module cursor_coupons() {
  cursor_coupon(upper_a1,pointer_l_z,12);
  cursor_coupon(lower_a1,pointer_s_z,40);
}

// Short rings at the scale-bearing plastic ODs: check the printer hits them
// before committing to full-length tubes.
module od_check_rings() {
  h=12;
  translate([-70,0,0]) tube(inner_od, inner_od-2*inner_wall, h);
  translate([0,0,0])   tube(middle_od, middle_od-2*inner_wall, h);
  translate([70,0,0])  tube(outer_od, outer_od-2*inner_wall, h);
}

// Fit ladder: short rings whose bores step through ladder_steps over a
// finished diameter. Each ring carries its clearance on a raised tab, plus
// one to five notches on the rim so the rings can be told apart by feel.
module ladder(finished, wall=2.4, h=10) {
  n = len(ladder_steps);
  for (i=[0:n-1]) {
    c  = ladder_steps[i];
    id = finished + c;
    od = id + 2*wall;
    // two columns so the set fits a ~220 mm bed; tabs point +x
    translate([(i % 2) * (od + 24), -floor(i / 2) * (od + 8), 0]) {
      difference() {
        union() {
          tube(od, id, h);
          // label tab on the outside
          translate([od/2 - 0.5, -4, 0]) cube([16, 8, 1.6]);
        }
        // index notches in the top rim
        for (k=[0:i])
          rotate([0,0,90 + k*8]) translate([od/2 - wall/2 - 1, -0.6, h-1.0]) cube([wall+2, 1.2, 1.2]);
      }
      translate([od/2 + 7.5, 0, 1.6])
        linear_extrude(height=0.8)
          text(str("+", c), size=2.8, halign="center", valign="center");
    }
  }
}

// ---------- choose part ----------
// Override with -D 'part="inner"' etc. from the command line.
part = "assembly";

if (part == "inner") inner_tube();
else if (part == "middle") middle_tube();
else if (part == "outer") outer_cursor_tube();
else if (part == "shell") outer_cursor_shell();
else if (part == "pointers") pointer_pair();
else if (part == "cursor_coupon") cursor_coupons();
else if (part == "calibration") od_check_rings();
else if (part == "od_check") od_check_rings();
else if (part == "ladder_middle") ladder(inner_finished);
else if (part == "ladder_outer")  ladder(middle_finished);
else if (part == "assembly") {
  color([0.88,0.80,0.58]) inner_tube();
  color([0.72,0.66,0.50]) translate([0,0,middle_assembly_z]) middle_tube();
  color([0.25,0.27,0.30]) outer_cursor_shell();
  color([1.0,0.07,0.05]) pointer_pair();
}
else if (part == "exploded") {
  color([0.88,0.80,0.58]) translate([-75,0,0]) inner_tube();
  color([0.72,0.66,0.50]) middle_tube();
  translate([78,0,0]) {
    color([0.25,0.27,0.30]) outer_cursor_shell();
    color([1.0,0.07,0.05]) pointer_pair();
  }
}
