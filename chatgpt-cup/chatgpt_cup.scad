// ChatGPT cup — a 3D-printable drinking cup with a raised six-link knot
// emblem and "ChatGPT" label on the front.
//
// Open in OpenSCAD, tweak the parameters below, then Render (F6) and
// export an STL. All sizes are in millimetres.

/* [Cup] */
height        = 100;  // height of the straight wall (the rounded rim adds wall/2)
bottom_radius = 35;   // outer radius at the base
top_radius    = 42;   // outer radius at the top (flared)
wall          = 2.4;  // wall thickness: a multiple of your line width prints solid
floor_thick   = 3;    // bottom thickness
floor_fillet  = 5;    // rounded inside corner between floor and wall
base_chamfer  = 0.8;  // small outer chamfer that hides elephant's foot

/* [Emblem] */
logo_size     = 46;   // width of the knot emblem
logo_z        = 60;   // height of the emblem centre
label         = "ChatGPT";
label_size    = 8.5;
label_z       = 22;   // height of the label centre
label_font    = "Liberation Sans:style=Bold";
emboss        = 1.2;  // how far the emblem and label stand off the wall

/* [Quality] */
$fn = 160;

// ---------------------------------------------------------------- helpers

function r_out(z) = bottom_radius + (top_radius - bottom_radius) * z / height;
function r_in(z)  = r_out(z) - wall;

arc_steps = 24;

// Half cross-section of the cup (x = radius, y = z), spun by rotate_extrude.
module profile() {
    rim_c   = [r_out(height) - wall / 2, height];
    fillet_c = [r_in(floor_thick + floor_fillet) - floor_fillet,
                floor_thick + floor_fillet];
    polygon(concat(
        [[0, 0],
         [bottom_radius - base_chamfer, 0],
         [bottom_radius, base_chamfer]],
        // rounded rim: half circle from the outer wall over to the inner wall
        [for (i = [0 : arc_steps]) let (a = 180 * i / arc_steps)
            rim_c + wall / 2 * [cos(a), sin(a)]],
        // inner fillet: from the inner wall down onto the floor
        [for (i = [0 : arc_steps]) let (a = -90 * i / arc_steps)
            fillet_c + floor_fillet * [cos(a), sin(a)]],
        [[0, floor_thick]]
    ));
}

module cup_body()   { rotate_extrude() profile(); }

// Everything the drink occupies, used to keep the emboss out of it.
module cavity() {
    translate([0, 0, floor_thick])
        cylinder(h = height + wall, r1 = r_in(floor_thick), r2 = r_in(height + wall));
}

// Outer skin pushed out by `emboss`: the emblem is clipped to this so its
// face follows the curve and taper of the cup.
module emboss_skin() {
    cylinder(h = height, r1 = bottom_radius + emboss, r2 = top_radius + emboss);
}

// ------------------------------------------------------------------ emblem

// Six rounded chain links rotated 60° apart around a common centre.
link_len    = 20;
link_width  = 9;
link_stroke = 2.2;
link_offset = 4.2;
link_tilt   = 30;

module stadium(l, w) {
    hull() {
        translate([-(l - w) / 2, 0]) circle(d = w, $fn = 64);
        translate([ (l - w) / 2, 0]) circle(d = w, $fn = 64);
    }
}

module link() {
    difference() {
        stadium(link_len, link_width);
        stadium(link_len - 2 * link_stroke, link_width - 2 * link_stroke);
    }
}

module knot_2d() {
    resize([logo_size, 0], auto = true)
        for (i = [0 : 5])
            rotate(i * 60) translate([link_offset, 0])
                rotate(90 + link_tilt)
                    translate([link_len / 2 - link_width / 2 - 1, 0]) link();
}

module label_2d() {
    text(label, size = label_size, font = label_font,
         halign = "center", valign = "center");
}

// Push a 2D shape straight out through the front (-Y) wall at height z.
module through_front(z) {
    translate([0, 0, z]) rotate([90, 0, 0])
        linear_extrude(height = top_radius + emboss + 5) children();
}

module emblem() {
    difference() {
        intersection() {
            emboss_skin();
            union() {
                through_front(logo_z) knot_2d();
                if (label != "") through_front(label_z) label_2d();
            }
        }
        cavity();
    }
}

// -------------------------------------------------------------------- cup

union() {
    cup_body();
    emblem();
}
