// Compile with -D 'part="check"' to suppress the main assembly output.
// Empty output is expected for inner/middle within the documented envelope.
// middle_collision is a positive control: a raised rim should collide with L.
include <../bygrave_3dprint.scad>
test_case = "inner";
test_middle_z = -12;
intersection() {
  pointer_pair();
  if (test_case == "inner") cylinder(d=inner_finished,h=inner_len);
  else translate([0,0,test_middle_z]) cylinder(d=middle_finished,h=middle_len);
}
