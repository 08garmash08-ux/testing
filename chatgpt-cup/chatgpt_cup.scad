// ChatGPT cup — a 3D-printable drinking cup with a handle, and the ChatGPT
// logo and a "ChatGPT" label standing out on the front.
//
// Open in OpenSCAD, tweak the parameters below, then Render (F6) and export.
// `python3 build_3mf.py` renders the cup and the logo as separate parts and
// packs them into a two-colour chatgpt_cup.3mf. All sizes are in millimetres.

/* [Cup] */
height        = 100;  // height of the straight wall (the rounded rim adds wall/2)
bottom_radius = 35;   // outer radius at the base
top_radius    = 42;   // outer radius at the top (flared)
wall          = 2.4;  // wall thickness: a multiple of your line width prints solid
floor_thick   = 3;    // bottom thickness
floor_fillet  = 5;    // rounded inside corner between floor and wall
base_chamfer  = 0.8;  // small outer chamfer that hides elephant's foot

/* [Handle] */
handle        = true; // the grab ring on the right side
handle_bottom = 14;   // height where the lower arm meets the wall
handle_top    = 86;   // height where the upper arm meets the wall
handle_gap    = 21;   // finger room between the wall and the grip
handle_thick  = 10;   // grip thickness, seen from the side
handle_width  = 14;   // grip width, seen from the front

/* [Logo] */
logo_size     = 46;   // width of the logo
logo_z        = 60;   // height of the logo centre
label         = "ChatGPT";
label_size    = 8.5;
label_z       = 22;   // height of the label centre
label_font    = "Liberation Sans:style=Bold";
emboss        = 1.2;  // how far the logo and label stand off the wall

/* [Output] */
part          = "all";  // [all, body, logo]
cup_color     = "#1e303d";  // preview colours; the 3MF uses the same two
logo_color    = "white";

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

// The drink space grown halfway into the wall, used to trim the logo and the
// handle back to the wall without leaving anything on the inner wall.
module cavity() {
    translate([0, 0, floor_thick])
        cylinder(h = height,
                 r1 = r_in(floor_thick) + wall / 2,
                 r2 = r_in(floor_thick + height) + wall / 2);
}

// Outer skin pushed out by `emboss`: the logo is clipped to this so its
// face follows the curve and taper of the cup.
module emboss_skin() {
    cylinder(h = height, r1 = bottom_radius + emboss, r2 = top_radius + emboss);
}

// ------------------------------------------------------------------ handle

// One rounded joint of the handle: an ellipsoid, flatter from the side.
module handle_node(p) {
    translate([p[0], 0, p[1]])
        scale([1, handle_width / handle_thick, 1])
            sphere(d = handle_thick, $fn = 48);
}

// Two arms leave the wall at 45° and meet a straight grip bar: a half
// hexagon in side view. Nothing overhangs more than 45°, so it prints
// upright with no supports. The arms start inside the cup so they run
// straight through the wall, and the cavity trims them back to it.
module handle() {
    bar_x = r_out((handle_bottom + handle_top) / 2) + handle_gap + handle_thick / 2;
    inset = wall + 3;
    a = [r_out(handle_bottom) - inset, handle_bottom - inset];
    b = [bar_x, handle_bottom + bar_x - r_out(handle_bottom)];
    c = [bar_x, handle_top - (bar_x - r_out(handle_top))];
    d = [r_out(handle_top) - inset, handle_top + inset];
    assert(c[1] > b[1], "handle_top and handle_bottom are too close for this handle_gap");
    difference() {
        for (arm = [[a, b], [b, c], [c, d]])
            hull() { handle_node(arm[0]); handle_node(arm[1]); }
        cavity();
    }
}

module body() {
    cup_body();
    if (handle) handle();
}

// -------------------------------------------------------------------- logo

// The ChatGPT logo, traced in chatgpt_logo.svg (24 × 24 viewBox).
module logo_2d() {
    resize([logo_size, 0], auto = true)
        import("chatgpt_logo.svg", center = true);
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

// Only the raised part that sits on the outside of the wall, so the logo
// and the body are separate solids that just touch.
module logo_part() {
    difference() {
        intersection() {
            emboss_skin();
            union() {
                through_front(logo_z) logo_2d();
                if (label != "") through_front(label_z) label_2d();
            }
        }
        body();
        cavity();
    }
}

// -------------------------------------------------------------------- cup

if (part == "body") body();
else if (part == "logo") logo_part();
else {
    color(cup_color) body();
    color(logo_color) logo_part();
}
