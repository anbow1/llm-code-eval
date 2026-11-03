

Let's set camera at (0, 34, 24) → dist 41. Looks from above at ~55° elevation. Good.

Labels: "a text label near each main part (canvas texture or DOM is fine)". Use canvas-textured sprites for labels near main parts: mainspring_barrel, center_wheel, third_wheel, fourth_wheel, escape_wheel, pallet_fork, balance_wheel, hairspring, crown, main_plate, train_bridge, balance_cock, jewels. Sprites always face camera. Create ~14 labels.

Careful: labels shouldn't be in parts? They can be in parts (Object3D with names) or separate. I'll keep them separate (not in parts) so parts only has meshes. Actually parts should contain meshes; labels are additional objects but not required to be excluded. I'll keep them outside the parts array.

Now the explode animation: "It applies the view at once (only the E key and the button animate)." So explode(f) sets positions immediately. The E key and button animate between assembled and exploded: they animate `f` over time (e.g., f = 0 or 1 target, lerped each frame), then call explode(f). So explode(f) is instantaneous, and the animation driver calls explode with an interpolated f.

So in the render loop: if animating, f += dir*dt*rate → clamp; call explode(f).

Key handling: keydown 'e'/'E' toggles target. Button: a DOM button added to body (since the page has no other HTML, adding a button via JS is allowed? The rule says "Create the WebGLRenderer yourself and append its canvas to document.body. The page has no other HTML." — I think adding a small overlay UI is fine, but the requirement says "the key E (and a button) animate" so we need a button. I'll create a DOM button with minimal CSS.

Also the label for parts could be DOM. Use canvas sprites.

Also `paused` boolean exposed on window.__watch.

Now let's write all the geometry builders.

Utility functions:

```ts
function gearShape(teeth: number, radius: number, module: number, opts?: {hub?: number; spokes?: number; inner?: number; outer?: number; includeCenterHole?: boolean}): THREE.Shape
```

Let me write:

```ts
function gearOutline(teeth: number, pitchRadius: number, module: number, tipFactor = 1.0, rootFactor = 1.4): THREE.Path/points[]
```

Implementation:

```ts
function buildGearShape(teeth: number, pitchRadius: number, module: number, opts: {
  hubHole?: number;   // radius of central hole (0 = none)
  cutInner?: number;  // inner radius of spoke cutouts (as a factor of pitchRadius)
  cutOuter?: number;  // outer radius of spoke cutouts
  spokes?: number;    // number of spoke cut-outs (or arms)
}): THREE.Shape {
  const shape = new THREE.Shape();
  const rTip = pitchRadius + module * 1.0;
  const rRoot = pitchRadius - module * 1.25;
  const aPitch = (Math.PI * 2) / teeth;
  const halfPitch = aPitch / 2;
  const tipHalf = halfPitch * 0.52;  // tooth half width at tip
  const rootHalf = halfPitch * 1.05; // tooth half width at root -- hmm must be < halfPitch? 
```

Hmm. The tooth's angular width at the root should be less than the gap; standard: tooth thickness at pitch radius = halfPitch (i.e., half of the pitch); at the root it's ~halfPitch*0.55? No wait. Let's think: The tooth occupies part of the angular slot; at the tip, the tooth is narrower (involute is narrow at tip in radians? For a large radius and small module, the tip is narrower in linear width). Let's define in linear terms:

At pitch circle: tooth thickness t_p = pitch/2 = π*m/2? With pitch = 2πr/T = π*m (since r = m*T/2). So pitch = π*module ≈ 0.314 for m=0.1. Tooth thickness at pitch = π*m/2 ≈ 0.157.
At the tip (radius r + m), the tooth is thinner: maybe 0.7 * that = 0.11. In radians: 0.11 / (r+m) ≈ 0.11/4.1 = 0.0268 rad; halfPitch = π/T = π/80 = 0.0393 rad. So tipHalf ≈ 0.0268 → factor 0.68 of halfPitch. At the root (radius r - 1.2m): thickness ~ 0.157*1.4 = 0.22 → in radians 0.22/3.88 = 0.0567 → halfPitch*1.44. Hmm, that exceeds halfPitch (0.0393) → 0.0567 > 0.0393 → the tooth at the root would be wider than the pitch slot, meaning the teeth would overlap at the root. But at the root, the tooth base is inside the mating gear's root circle region... Actually if the tooth's angular width at the root exceeds 2π/T/2, adjacent teeth overlap. So rootHalf must be < halfPitch (0.0393). So rootHalf = 0.028 and tipHalf = 0.018? Let's compute properly:

We need: tooth angular half-width at pitch radius = halfPitch/2? Hmm. Let's define angular widths: the tooth at pitch radius should occupy half the pitch angle => angular width = halfPitch (i.e., aPitch/2), so half-width = aPitch/4 = π/(2T) = 0.0196 rad for T=80. At the tip, narrower: half-width = π/(2T)*0.65 = 0.0128. At the root, wider: half-width = π/(2T)*1.3 = 0.0255 (still < aPitch/2 = 0.0393 ✓).

So parameters relative to aPitch (=2π/T): tipHalf = aPitch*0.16 (0.65/4 = 0.1625), rootHalf = aPitch*0.32 (1.3/4 = 0.325), pitch half = aPitch*0.25.

OK. Use tipHalf = aPitch * 0.16, rootHalf = aPitch * 0.33.

The outline points: for each tooth i (angle θ = i * aPitch):
- add point at angle θ - rootHalf on the root circle
- add point at angle θ - tipHalf on the tip circle
- add point at angle θ + tipHalf on tip circle
- add point at angle θ + rootHalf on root circle
- then continue along the root circle arc to the next tooth's θ+... : after θ + rootHalf, we go to the next tooth's (θ + aPitch - rootHalf) at root radius, with arc segments. To make the root arc smooth, add a couple of intermediate points on the root circle.

Then close.

Since we're building a polygon with many points, use shape.moveTo / lineTo.

Then holes: For wheels, add spoke cut-outs as separate THREE.Path holes with arc segments: a hole shape = annular sector: points at inner radius from a1 to a2 along the inner circle (arc), then line to outer radius, arc back along the outer circle from a2 to a1, close. Ensure holes don't intersect the outer outline or each other.

Spokes count: with 3 cut-outs spanning 100° each and gaps 20°, the shape holes span angles wide. Let's parameterize: cutSpan = 90°, gap = 30° for 3 cut-outs (3*(90+30)=360 ✓). The cut-out hole is an annular sector from inner=0.30*r_pitch to outer=0.86*r_pitch spanning [start, start+90°].

For the escape wheel (r=0.75), inner cut radius 0.22, outer 0.55 — fine.

Central hub hole: radius = 0.18 * r_pitch? For r=4 → 0.72mm hole (big); real wheel hub hole is like 0.4mm. Use min(0.25*r_pitch, 0.5) maybe. Let's use hub = Math.min(0.55, 0.2*radius). Hmm, but the hole is where the arbor/pinion shaft goes. The pinion at radius 0.5 sits on the same axis; its shaft passes through the wheel hub. With hub hole 0.55mm radius, the pinion shaft (radius 0.25) fits. OK.

Then the wheel mesh = ExtrudeGeometry(shape, {depth: 0.55, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 4}) rotated -PI/2 about x so it lies in the x-z plane, positioned at y center.

Extrude along +z by default; then rotate to make the depth along y: geometry.rotateX(-Math.PI/2) maps +z → ... rotateX(-90°) maps z → y? RotationX(-π/2): y→ -z? Let's compute: R_x(θ) : y' = y cos θ - z sin θ; z' = y sin θ + z cos θ. θ=-π/2: cos=0, sin=-1: y' = z; z' = -y. So a point (0,0,1) → (0,1,0) ✓. So extruded depth along +z becomes +y. Then set mesh position y to the wheel's center minus depth/2 etc.

Simplest: after creating the geometry, rotateX(-π/2) so it's in x-z plane with thickness along +y from 0 to depth. Then set mesh.position.y = levelY - depth/2? Actually translate geometry by -depth/2 in y so it's centered: geometry.translate(0, -depth/2, 0)? After rotation, the extrusion spans y ∈ [0, depth]. So translate(0, -depth/2, 0) to center. Then mesh.position.y = level.

Hands: extrude flat shapes. Build a hand shape (a tapered bar plus a boss) extruded 0.15mm, laid in x-z plane at y.

Hairspring: use a spiral. Generate points in 3D with a TubeGeometry along a CatmullRom curve? Actually TubeGeometry with a custom Curve. Simplest: build a parametric curve class extending THREE.Curve<THREE.Vector3>? For strict typing, define:

```ts
class SpiralCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private r0: number, private r1: number, private turns: number, private h: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 { ... }
}
```
THREE.Curve's getPoint signature: `getPoint(t: number, optionalTarget?: Vector3): Vector3`. Ok.

Then TubeGeometry(curve, 220, 0.045, 5, false).

But breathing: instead of rebuilding, scale the mesh in x/z. Since the hairspring's inner end rotates with the balance? I'll rotate the mesh by balance angle? If the hairspring rotates with the balance the spiral looks like it spins, which is wrong (the outer end is fixed). I'll just use the breathing scale (uniform in x-z) and no rotation. Also could offset slightly. Keep breathing.

Hairspring material: blued steel (dark blue, metalness 0.9, roughness 0.25).

Balance wheel: ring + arms + screws. Build:
- rim: ExtrudeGeometry of an annulus shape (outer r 4.0, inner 3.4) — actually a real balance has a rim and two arms. Let's build a shape: outer circle radius 4.0, inner circle radius 3.2, plus 2 arms (bars) crossing the center. Use shape with holes: hole = circle radius 3.2 minus arms? Simpler: rim = extruded annulus (outer circle with a circular hole) — that's a torus-ish ring; then add 2-3 arms as separate boxes (children). Plus screws on the rim (4 small cylinders). Good, and the hairspring inside the rim (hairspring radius ~2.6 max, less than rim inner 3.2 ✓).

Balance rim height ~0.45mm, at y = 4.3.

Balance needs a "staff" cylinder down to the plate and the cock jewel on top.

Pallet fork: build a shape: a fork body — from the pivot, two arms sweeping toward the escape wheel, each ending in a pallet jewel (small red box). Plus a slot/notch for the balance pin. Build with Shape:

Let's define fork pivot at F_P. The escape wheel at E (3.944, 1.539). Direction from pivot to escape wheel = u (unit). The fork arms: two arms angled ±20° from u, extending length ~ (distance to escape wheel rim). With the pivot at distance d=2.2 from E, the arms extend toward E and slightly beyond, so their tips reach the escape wheel's rim (r=0.75 plus teeth 0.1 = 0.85). So the arms' tip length ≈ 2.2 - 0.85 = 1.35? Wait, if the pivot is 2.2 from the escape center, the escape's rim is at 0.85 from its center → distance from pivot = 2.2-0.85 = 1.35 to the nearest rim point. The arms must reach that and the pallet tips should straddle the escape wheel rim (one tip at the rim on either side). Let's place the two arm tips at distances ~1.5 from the pivot, angled ±12° from u. Fine.

Fork shape (2D in x-z plane, local coordinates with pivot at origin and u along +x? Let's build the shape in local coordinates: fork pivot at (0,0), escape direction along +x? Then rotate the mesh to align +x with the world direction u. Good: build shape in local XZ with x as forward; rotate the mesh's rotation.y by -angle(u) so the local +x aligns with the world angle φ_u... remember rotation maps local angle α to world α - ρ. To map local angle 0 (local +x) to world angle φu, set rotation.y = -φu.

Fork shape points: 
- pivot hub: small circle at origin (radius 0.25).
- The two arms: from the hub, arms go forward and diverge. The pallet arms are like a 'V' shape: let's create a shape polygon:
  - start at hub, go forward-left to the left pallet tip, then a pallet seat, then back to the hub, then forward-right to the right tip, back to the hub. Plus a tail extending backward (-x) with a slot to engage the balance pin.
  
Simplify: build the fork as a merged set of boxes? The requirement: shapes may be simplified. Use a Shape extrusion with a custom outline: define points for a Y-shaped fork.

Let me define local coordinates (x forward toward escape wheel, z lateral):
- Hub at origin.
- Left arm tip at (1.55, 0.42), right arm tip at (1.62, -0.35) where the sign of z is lateral. To straddle the escape wheel rim, both tips near (±0.45 lateral at x≈1.5).
Outline points (polygon, going around):
(0.22, 0.1) hub edge...
Honestly, let's approximate with a "V" polygon:
p1 = (-0.35, 0.0)?? 

Let me just design a plausible polygon (in local 2D, units mm):
- Tail (back): points (-1.9, 0.18), (-1.9, -0.18) — the tail with slot.
- Left arm: (1.45, 0.55), (1.55, 0.30) tip.
- Right arm: (1.45, -0.55), (1.5, -0.30).
Outline: starting at the hub bottom (-0.3, -0.35), curve... Let's simply use:

points = [
  (0.0, -0.42), // hub back-bottom
  (-1.75, -0.16), // tail bottom
  (-1.95, -0.30),
  (-0.3, ... )
]
This is getting complicated. Alternative: build the fork from several extruded primitives as a Group: a hub cylinder, two arm boxes rotated, a tail box, and two pallet jewel boxes. But parts must be meshes in the array; a Group isn't a mesh. Hmm — requirement: "At least 40 separate meshes ... including ... pallet_fork". So pallet_fork can be a mesh; the arms can be children. But a single mesh is cleaner.

Actually simplest: pallet_fork = a single extruded polygon computed from a set of points I define; I can construct a decent V-shape. Let's write points explicitly:

Local frame: +x toward the escape wheel (forward), lateral z.

Outline (counterclockwise):
A: (-1.60, -0.45) tail fork lower-left
B: (-1.95, -0.45) 
C: (-1.95, 0.45)
D: (-1.60, 0.45)
E: (-0.55, 0.45)? Hmm this makes a wide tail block.

Honestly, shape doesn't need to be elegant. Let's build the fork as two arm triangles + hub circle + tail:

Points (going around clockwise):
1. (-0.30, 0.30) — hub top-back
2. (1.40, 0.62) — left arm tip top
3. (1.62, 0.22) — left arm tip front
4. (0.30, 0.10) — notch
5. (0.30, -0.10) — notch
6. (1.55, -0.22) — right arm tip
7. (1.40, -0.62) — right arm tip bottom
8. (-0.30, -0.30) — hub bottom
9. (-1.85, -0.28) — tail bottom (with slot)
10. (-1.85, 0.28) — tail top
11. back to 1.

Plus a hub hole (circle at origin radius 0.22) and the tail slot as a hole? The tail of a pallet fork has a slot for the balance's impulse pin; make a hole (rectangle) in the tail: rectangle from (-1.65, -0.12) to (-1.2, 0.12)? A rectangular hole as a Path.

Then extrude 0.35mm thick, place at y over the escape wheel level (fork body is thin, thickness 0.3mm; put at y = levelA + 0.45? The fork's working plane is where the escape wheel teeth are. If the escape wheel spans y 0.6..1.15 (level A), then the fork body should be at the top at y≈1.2 so the pallets can dip down? Simplify: place the fork at the same level as the escape wheel top (y ~1.15) and the pallets as small boxes hanging down to the escape teeth. I'll place the fork body just above the escape wheel (y 1.15..1.45), with pallet jewels (red boxes) as children extending down to y=0.9 at the tips. That reads visually as the escapement.

Balance: 
- balance_wheel mesh: ring (rim) extruded, at y=4.6, radius 4.0 rim, inner 3.2, thickness 0.45. Plus 3 arms (children boxes), plus screws (children cylinders on rim top, 3-4 of them). Plus the "impulse pin" small cylinder near the balance rim pointing down to the fork slot. The balance staff cylinder.
- hairspring inside at y=4.0? Wait balance rim at y 4.4..4.85 and hairspring should be below or above? Put hairspring at y=3.9 (below the balance and above the bridge at ~3.2) ✓. Stud at y=3.9..5.2 near the outer end of the hairspring and attached to the cock. Hmm the stud is on the cock which is above; but the hairspring is below the balance... In reality the hairspring is under the balance wheel and the stud is a block on the cock? The stud is on a small bracket attached to the cock's underside... For simplicity: hairspring at y=4.0 (just below the balance rim), stud = a small block at y=4.0..4.6 near the hairspring's outer end at the balance's outer radius; the balance_cock above at y=6.0 with a pillar connecting down? Let's just place a stud block at the outer end of the hairspring (at the position of the hairspring's outermost point) and it doesn't need to connect physically. Fine.

Balance cock: at the balance axis, a bridge arm from the plate edge at the escape position to the balance center, at y=5.8..6.4 with a jewel hole. Also a "balance_cock" mesh plus a "cock_screw" maybe.

Hmm, but the balance wheel (r 4, y 4.4) below the cock (y 5.8) ✓. Hairspring at y=4.0 below the balance rim (rim bottom 4.4) ✓. Stud at the outer end of the hairspring, y 4.0-4.6.

Now the "train_bridge": cover the train wheels, at y=2.5..3.0. It must have holes where the pivots are (we can just have the wheels poke through? not necessary, the bridge can be above them). The bridge covers y=2.5-3.0, above level B (1.4..2.1) ✓. The bridge should be a flat plate covering a region, with the jewels (jewel_...) on it for the pivots. Let's make the bridge a rounded polygon covering the train region (from center wheel to escape) — e.g., a shape encompassing the axes centers with some margin. Plus the barrel bridge over the barrel.

The barrel bridge: over the barrel at (-3.947,-1.436) covering radius ~3.8.

Alright: bridge shapes: rounded rect/circle-ish. Use circles: train_bridge = a shape made from a circle of radius ~... covering center(0,0), third(-2.25,3.9), fourth(1.74,5.35), escape(3.94,1.54). A single circle at (0.5, 2.5) radius 6.5 would cover those? distance to escape (3.94,1.54) from (0.5,2.5): sqrt(11.5+1)=3.5 + 0.75 ok. To fourth (1.74,5.35): sqrt(1.5+7.9)=3.06 ✓. But the bridge would also be over the balance area? Balance at (9.2,-3.8) far away ✓.

Let's make the train_bridge shape = a rounded polygon drawn via a circle at (0.4,2.4) radius 6.2, plus an arm extending to the escape wheel? Fine, use the circle. Hmm, but the bridge should look like a bridge arm, not a circle. Use a shape with a circle plus a "finger" to the escape. Simpler: use THREE.Shape with `absarc`. Let's do: train bridge = circle center (0.4, 2.6), radius 5.8, and another circle at escape (3.94,1.54) radius 1.6 — union not possible directly in Shape. Use a Shape with a single path: combine by drawing a "peanut" outline manually? Could use `THREE.Shape` with points forming a smooth blob. Alternatively use two separate bridge meshes: `train_bridge` and `escape_bridge`. That's fine and realistic (6497 has multiple bridges). Let's do:
- barrel_bridge over the barrel
- train_bridge (circle blob over center/third/fourth)
- escape_bridge small blob over the escape wheel
- balance_cock.

Good, more parts.

Each bridge: extruded with bevel, with Geneva stripes texture.

Jewels placement: need jewel positions at pivots. Let's place jewels on the plate (under the wheels at the pivot axes for those that end at the plate) and in the bridge (over the wheels). For simplicity, place jewel_i at the axis positions at y = bridge top + something (so they're visible), with the chaton ring around. 17 jewels: 
- barrel arbor (1)
- center wheel (2: one on the plate? we just place one on the bridge top)
- third (2)
- fourth (2)
- escape (2)
- pallet fork (1)
- balance (2)
- cannon pinion (1)
- minute wheel (1)
- hour wheel (1)
- ... that's 14; add 3 more: center pinion, third pinion, fourth pinion? Let's just enumerate 17 positions and place them.

Simpler approach: define a list of 17 pivot positions (x,z) with y positions (top of the relevant bridge). Fine.

Now screws: place ~8 screws on bridges at plausible spots, with heat-blued heads + slots. screw_i = a mesh (cylinder head) with a child slot box (dark).

Crown/stem/setting lever: The stem is a cylinder going from the crown through the plate edge toward the barrel area; the crown is a knurled cylinder at the outer end; the setting lever and click near the stem. Place them outside/at the edge of the plate: crown at (-13, 0, -8)? But the plate radius 15 — the crown should stick outside the plate. Let's place: crown center at (-12, 0.5, -9.5)? Hmm, the barrel is at (-3.95,-1.44); the stem goes from the crown toward the barrel/ratchet wheel direction (typically the stem points toward the barrel's ratchet wheel). Let's put the stem along the direction from the plate edge at (-13,-6) toward the barrel. Crown at the outer end: (-14, 0.8, -8). Stem cylinder from (-14,0.8,-8) toward the barrel direction... Actually the stem is long and goes through the plate; let's place the stem along the x-axis at z=-6.5, from x=-15 to x=-6, with the crown at (-15.5, 1, -6.5). Hmm, the barrel is at (-3.95,-1.44). The stem should be near the barrel's ratchet wheel: the ratchet wheel is on the barrel arbor at the top (y ~ 3). Let's put the ratchet wheel at the barrel axis, y=3.6 (above the barrel bridge? Actually the ratchet wheel sits above the barrel bridge with the click and the crown wheel; hmm, real 6497: ratchet wheel on the barrel arbor above the barrel bridge, with the click and the crown(=winding) wheel). Fine: ratchet_wheel at barrel axis, y=3.4, radius 2.0, teeth 30ish. The click touches the ratchet wheel. The crown wheel would be meshed with the ratchet wheel but is missing in our parts list; skip it (or add crown_wheel). Not required.

Stem: cylinder along -x direction at z=-6.5? Let's place the stem so it goes near the ratchet wheel: from (-14, 3.4, -3.5) to (-2, 3.4, -3.5)? The ratchet wheel at (-3.95,-1.44) radius 2 — the stem at z=-3.5 would be 2.06mm from the ratchet center, close to the wheel edge. Let's place the stem at y=2.6 (below the ratchet wheel level), from x=-16 to x=-6, z=-3.2. Hmm, whatever; the exact look matters less. Let's make it plausible: the stem is horizontal, entering at the movement's edge near the barrel, connecting to the crown outside. Put the stem along the direction from the plate edge at angle 200°.

Simplify: crown at (-14.5, 0.5, -5.0) (outside the plate radius 15? distance = 15.3 ✓ just outside), stem from (-14.5, 0.5, -5) to (-4, 3.0, -2.6) — use a cylinder oriented between those two points (length ~11). Crown: a fluted cylinder (CylinderGeometry radius 1.6 height 1.4 with 24 segments? knurled = many segments) rotated to face outward.

Setting lever: a small flat piece near the stem.
Click: a small spring piece near the ratchet wheel.

OK. Let's finalize the main chain geometry layout with exact distances:

module = 0.1
- barrel: teeth 72, radius = 3.6
- center: teeth 80, radius = 4.0, pinion 12, pinionRadius = 0.6
- third: teeth 75, radius = 3.75, pinion 10 → 0.5
- fourth: teeth 80, radius = 4.0, pinion 10 → 0.5
- escape: teeth 15, radius = 0.75, pinion 8 → 0.4

Distances:
- barrel→center: 3.6 + 0.6 = 4.2
- center→third: 4.0 + 0.5 = 4.5
- third→fourth: 3.75 + 0.5 = 4.25
- fourth→escape: 4.0 + 0.4 = 4.4

Positions with directions:
- center at (0,0)
- third at center + 4.5*(cos120°, sin120°) = (-2.25, 3.8971)
- fourth at third + 4.25*(cos20°, sin20°) = (-2.25+3.9939, 3.8971+1.4533) = (1.7439, 5.3504)
- escape at fourth + 4.4*(cos(-60°), sin(-60°)) = (1.7439+2.2, 5.3504-3.8104) = (3.9439, 1.5400)
- barrel at center - 4.2*(cos20°, sin20°) = (-3.9469, -1.4363)

Angles φ (direction from wheel n to wheel n+1):
- φ_barrel→center: from barrel to center = atan2(z_c - z_b, x_c - x_b) = (3.9469, 1.4363) → angle 20° ✓ (since we placed barrel at center - 4.2*dir(20°) ✓)
- φ_center→third = 120°
- φ_third→fourth = 20°
- φ_fourth→escape = -60°

Now phase offsets: c_barrel = 0; then for each pair compute c_next = [-(T_n/P_{n+1}) c_n - (1+T_n/P_{n+1}) φ_n - π + π/P_{n+1}] mod (2π/P_{n+1}).

Note for the escape: it's driven via the escapement, not the train, but its mesh with the fourth pinion: the escape pinion and escape wheel are rigid, both at rotation.y = A_escape + c_escape where c_escape derived from the fourth→escape pair. Since the state angles satisfy A_escape = -(T_fourth/P_escape) A_fourth exactly, the same recursion applies ✓.

Let's compute numerically later in code at build time — I'll write a function that computes phase offsets from the chain definition. Use the pair (teeth of driver stage, leaves of driven pinion, φ).

Note: I need the phase offset for the pinion too but it's rigid with its stage → same offset.

Also, for a wheel that has holes/spokes, the geometry is symmetric under 2π/T rotation? Only if the teeth count matches the spoke symmetry... irrelevant, we add a fixed offset to the mesh.

Let's now write the pair recursion:

```ts
function computePhases(stages: {teeth:number; pinion:number; pos:THREE.Vector2}[]): number[] {
  const phases = [0];
  for (let i=0;i<stages.length-1;i++) {
    const T = stages[i].teeth, P = stages[i+1].pinion;
    const dx = stages[i+1].pos.x - stages[i].pos.x;
    const dz = stages[i+1].pos.y - stages[i].pos.y; // using Vector2 with y as z
    const phi = Math.atan2(dz, dx);
    const cA = phases[i];
    let cB = -(T/P)*cA - (1 + T/P)*phi - Math.PI + Math.PI/P;
    // normalize into [0, 2π/P)
    const period = 2*Math.PI/P;
    cB = ((cB % period) + period) % period;
    phases.push(cB);
  }
  return phases;
}
```

Now the render angle: rotation.y = stateAngle + phase[i].

Hmm, wait. Careful: the state angles are A_n and my derivation assumed rotation.y = A + c. ✓. Good.

Now check the direction convention once more with the derivation: I derived using world angle = local angle - rotation.y. And φ is the atan2 in the x-z plane where angle α means (x = cos α, z = sin α). And the state angles have the ratio relation A_next = -(T/P) A_prev exactly ✓. Good.

Now let's also double check the visual engagement: gear teeth will mesh approximately.

Now let's write the code. It's long. Let me structure it.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

Types: `BokehPass` constructor param type is `{ focus?: number; aperture?: number; maxblur?: number; ... }`? In three's types it's `BokehPass(scene, camera, params?: { focus?: number; aperture?: number; maxblur?: number; width?: number; height?: number; })`. Might require `focus`, `aperture`... I'll pass an object with focus/aperture/maxblur. TS might complain if the type expects specific fields? It'll be fine (all optional probably). Hmm, risk. Let me instead skip BokehPass? "shallow depth of field is welcome (e.g. BokehPass)". I'd like to include it for the macro look. I'll include it but be careful with types; if the type is `{ focus: number; aperture: number; maxblur: number; }` all fine since I pass all three.

EffectComposer with RenderPass and OutputPass typed OK.

One concern: BokehPass's shader uses `depthTexture` from the RenderPass's... Actually BokehPass, when it renders, uses the scene's depth via a separate render target with a depth texture. Its `render()` uses `this.renderTargetDepth` etc. Fine.

Note BokehPass also needs the camera's near/far for depth; ok.

Also note: BokehPass replaces the image with a blurred version → the whole scene blurs near/far. With focus set to the distance to the movement (~40) and aperture small, the effect is subtle.

Let's set the composer:
```ts
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 40, aperture: 0.00012, maxblur: 0.01 });
composer.addPass(bokeh);
composer.addPass(new OutputPass());
```
Note: aperture is in a weird unit (shader uses aperture * ... ). Typical values: `aperture: 0.025`? The three example uses aperture 0.0255? Hmm, BokehPass aperture default is 0.025? Let me recall the example: `new BokehPass( scene, camera, { focus: 1.0, aperture: 0.000025, maxblur: 1.0 } )`? The three.js example (webgl_postprocessing_bokehap? ) uses `focus: 1000.0, aperture: 0.0001, maxblur: 1.0`? Hmm; In the "bokeh" example: 

```
const bokehPass = new BokehPass( scene, camera, { focus: 1.0, aperture: 0.025, maxblur: 1.0 } );
```
Hmm I don't remember. The shader computes `v = ... aperture * (d - focus)/d ...`. With our units in mm and distances ~40, aperture 0.0001 gives subtle blur. I'll use focus 41, aperture 0.00015, maxblur 0.008 — subtle DOF. Also I need to make sure the DOF doesn't blur everything badly. Let's use maxblur small.

But wait: BokehPass's depth pass renders the scene with `material` overrides? No, it renders the scene normally but needs `scene.overrideMaterial`? Let me recall the implementation: BokehPass creates a depth render target and a `MeshBasicMaterial` with `depthTexture`... It renders the scene with a "depth" material to get the depth. In newer versions, it uses `this.materialDepth = new MeshDepthMaterial()` with `scene.overrideMaterial`. Fine, but shadows are ignored in the depth pass. OK.

Potential problem: the depth pass renders with overrideMaterial (depth), so the depth texture is the whole scene ✓.

OK.

Also, the "jewels translucent red with transmission or clearcoat": use MeshPhysicalMaterial with transmission: 0.6, thickness, roughness 0.1, color red, clearcoat. Transmission is expensive but only 17 small meshes — plus each transmission material triggers a render? Transmission in three requires the renderer to render the scene for the transmission pass (MeshPhysicalMaterial with transmission > 0 forces an extra render pass of the scene into a transmission render target). With many transmaterials (17), three renders the scene once per frame for the transmission... Actually three renders the transmissive objects' backbuffer once per frame (a single additional pass into `_transmissionRenderTarget`), not per object. Fine, but it can be heavy. Let's use transmission: 0.4 only on jewels (17 small) → an extra scene render per frame. Might slow down but ok. Alternatively use clearcoat with opacity (transparent) instead — cheaper. Use transparent + opacity 0.85, roughness 0.1, clearcoat 1, ior 1.6, color 0xaa1122, emissive slight. Simpler & safer. I'll use MeshPhysicalMaterial with transmission 0.5 but maybe reduce perf risk... Let's avoid transmission to be safe (extra render pass could also interfere with the BokehPass/depth). Use transparent + opacity.

Hmm, the spec explicitly mentions "translucent red jewels (transmission or clearcoat)" — either. Clearcoat is allowed. Good.

Now: materials list:
- gold/brass: MeshPhysicalMaterial color 0xffd27a? Actually gilded plates: color 0xd6a84f, metalness 1, roughness 0.28, clearcoat small.
- steel (polished): color 0xcfd4da, metalness 1, roughness 0.18.
- steel blue-dark? Hairspring: color 0x2a3e8f, metalness 0.9, roughness 0.3.
- ruby: color 0xd21f3a with opacity 0.8, roughness 0.1, clearcoat 1, ior 1.6, transparent true.
- gold chaton: color 0xf0c060, metalness 1, roughness 0.2.
- blued screws: color 0x1d3f8a with clearcoat, metalness 0.9, roughness 0.25.

Environment: RoomEnvironment with PMREMGenerator:
```ts
const env = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(env, 0.04).texture;
```
Type: RoomEnvironment() returns a Scene (in newer versions extends Scene). `new RoomEnvironment()` — in older versions, `RoomEnvironment(renderer?)`. Types: `RoomEnvironment` class with constructor(). Fine.

Note `pmrem.fromScene(env, 0.04)` signature (scene, sigma?, near?, far?) ✓.

Set scene.environmentIntensity maybe (three r163+ supports). Avoid to prevent type issues.

Lights:
- key: DirectionalLight(0xfff3e0, 3) at (16, 30, 14), castShadow, shadow camera left/right ±20, near 1 far 100, mapSize 2048, bias -0.0005, normalBias 0.02.
- fill: DirectionalLight(0x94b8ff, 1.2) at (-18, 16, -10), no shadow.
- rim: DirectionalLight(0xffffff, 1.5) at (0, 8, -26).
- hemi: HemisphereLight(0x8899bb, 0x111111, 0.4).

Also an ambient? env map covers ambient.

Background: scene.background = new Color(0x08080b). Also maybe add a subtle radial vignette via a large plane? skip.

Now the "explode" details.

Let's collect parts: array of `THREE.Object3D` (mostly Mesh). For each part added, we record:
- basePos (Vector3)
- explodeDir (Vector3) normalized-ish, computed from basePos relative to the movement center (0, 0, 0) with fallback, and with y lift.
- explodeDist: computed as (base distance + something) maybe uniform 6-10 mm.

Explosion formula: pos = basePos + dir * f * L where dir includes a y component. To make "clearly separated", we must also handle parts whose base positions are near each other (e.g., the coaxial pinions at the same x,z!). The wheel and its pinion are coaxial → same basePos → same direction → the same displacement → they'd stay together, but at different y levels so they'd remain separated in y. Hmm, but for explode, they should separate. Let's add a "layer" offset per part index: lift by index-based tiers and spread radially with a per-part magnitude.

Alternative approach: explode offset = radialDir * (baseRadiusFromCenter + 3 + (index%5)*2.5) * f + up*(index tier)*f. Let's do something systematic:

For each part index i:
- radial direction in plan from the movement center (0,0,0) to the part's base position; if near zero, use direction based on index angle.
- explosion offset:
  - plan: dirPlan * f * (basePlanDist * 1.2 + 4 + (i % 4) * 3)
  - y: f * (2 + (i % 6) * 2.0) → parts rise in tiers.

Hmm, but if two parts share the same plan position and index-based variations differ, they separate ✓. The index modulo gives different lifts for different indices, but two parts could get the same lift mod; combined with plan spreads by index, generally fine. But careful: e.g., the escape wheel and escape pinion are coaxial (same base x,z), index i and i+1 → lifts differ ✓.

Let's design: for each part, compute:
  dirPlan = normalize(plan pos) or fallback to a pseudo-random direction from the index (e.g., angle = i*2.399963).
  Lplan = f * (10 + 6*((i % 3))) + baseDist... Hmm, I want a clear separation with parts spreading outward.

Simplest robust scheme: 
pos = basePos + f * ( dirPlan * (12 + 4*(i%3) + baseDist*0.6) + (0, 8 + 3*(i%5), 0) ).
This gives strong separation. But the vertical lift up to 8+12 = 20mm upward; fine for exploded view (camera can pull back? Camera stays — the exploded parts may go off screen. Hmm. "exploded (every part moved away from the centre, along its own direction, clearly separated)". If parts fly off camera view, it's bad. The camera framing: movement spans ±15mm, camera at 40mm distance with fov 45 → visible height at target ≈ 2*40*tan(22.5°) ≈ 33mm. So the exploded parts should stay within ~±20mm. Let's keep plan offsets ~ +6-12 mm and vertical lifts 0-10 mm. The camera is aimed at the movement, above it; parts moving up to y=12 might go out of frame partially but visible-ish (camera is at y=34). Let's limit vertical lift to ~6.

Let's use:
planPush = f * (6 + 4*(i%3) + basePlanDist*0.5)  → between ~6 and ~13 mm outward.
yLift = f * (1.5 + 1.5*(i%4)) → 1.5..6.

Also, with many parts stacked at the same axis, the y tiers may overlap; let's include a per-index pseudo-random lateral jitter direction: dirPlan computed as normalize(planPos) if length>1e-3 else (cos(a), sin(a)) with a=i*2.4.

Fine. Additionally, the "movement center" for the explode direction could be the plate center (0,0,0).

Now: parts are scene children; we set positions in explode(f). But rotating parts have rotation.y set every frame; that's independent of position ✓.

However: parts like the hands and the cannon pinion near the center: their basePos is (0, y, 0) → plan length ~0 → fallback direction from index ✓.

Also, the balance cock, jewels, screws etc. all explode.

Now the labels: They should be near the parts; they're sprites. Do labels explode? No, keep static (they might be part of the "scene" but not parts). Might be nice to hide labels in exploded mode? Keep them.

Let's now handle the label sprites: a function makeLabel(text) that creates a canvas, draws text, returns a Sprite with a texture; position near a part. Add ~14 labels.

Potential issue: Sprites with textures and `sizeAttenuation` — fine.

Now: the "text label near each main part" ✓.

Let's plan label positions (approximately above each part at y ~ 8-10). Hmm, with the camera above, sprite labels floating above parts might occlude. Put them slightly above each part at its base position + (0, 3, 0). Fine.

Actually: for readability, place labels near the parts in the plan, offset outward. Simplest: at the part's position with y += 3. Might collide with hands. OK.

Let's write helper functions.

### Geometry helpers

```ts
const MODULE = 0.1;

function gearProfilePoints(teeth: number, pitchRadius: number, module: number): number[][] // returns [x,z] points
```

```ts
function buildGearShape(teeth: number, pitchRadius: number, module: number, opts: {
  hub?: number;             // central hole radius (0 for none)
  spokes?: number;          // number of spoke cutouts
  cutInner?: number;        // as factor of pitchRadius
  cutOuter?: number;
}): THREE.Shape
```

Implementation:
```ts
const aPitch = (Math.PI*2)/teeth;
const rTip = pitchRadius + module*0.95;
const rRoot = pitchRadius - module*1.25;
const tipHalf = aPitch*0.17;
const rootHalf = aPitch*0.34;
const shape = new THREE.Shape();
const pts: [number, number][] = [];
for (let i=0;i<teeth;i++){
  const a = i*aPitch;
  pts.push(pt(rRoot, a - rootHalf));
  pts.push(pt(rTip, a - tipHalf));
  pts.push(pt(rTip, a + tipHalf));
  pts.push(pt(rRoot, a + rootHalf));
}
```
with the root arc between teeth handled by the straight line from (a+rootHalf) to (a+aPitch-rootHalf) — a straight chord across the root circle. Add intermediate arc points to make it smoother: for each tooth also add 1 mid point between teeth: at angle (a+aPitch/2) on rRoot. Actually a chord between two points on the root circle is fine; for 80 teeth, small. Let's add one mid-point at angle a+0.5*aPitch for smoothness.

Then moveTo/lineTo through points and close.

Holes:
- central hub hole: circle at origin radius hub: use `new THREE.Path(); path.absarc(0,0,hub,0,2π,false)`. Wait, in 2D shape coordinates, we use (x, y) → later mapped to (x, z) via rotation. Fine: the shape's y coordinate becomes z after rotateX(-π/2). Note: rotateX(-π/2) maps (x, y, z) → (x, z, -y)? Let's check: R_x(-π/2): y' = y cos(-π/2) - z sin(-π/2) = 0*y + z = z; z' = y sin(-π/2) + z cos(-π/2) = -y. So (x,y,z) → (x, z, -y). So the shape's plane (x,y) maps to world (x, -y) in (x,z)?? Hmm: shape point (x, y, 0) → world (x, 0, -y). So the shape's y coordinate maps to world z = -y. That's a mirror. For symmetric shapes it doesn't matter, but for the fork it does. Let me instead use geometry.rotateX(π/2)? R_x(+π/2): y' = y*0 - z*1 = -z; z' = y*1 + z*0 = y. So (x,y,z) → (x, -z, y). Then a shape point (x,y,0) → (x, 0, y). And the extrusion depth d (z=d) → y' = -d, so it extrudes downward. Then translate up by depth. This gives shape (x,y) → world (x, z=y) with no mirror ✓. So use rotateX(π/2)? Hmm but then the extrusion goes from y=0 down to -depth. I'll then translate(0, depth, 0)? Let's see: after rotateX(π/2), the geometry spans y ∈ [-depth, 0]; translate y by +depth/2 to center it, then position at the level y.

Wait, careful: with rotateX(π/2), the shape plane's y becomes world z ✓ (no mirror), and the extrusion direction (local +z) becomes world -y. That's fine, we can translate.

So use:
```ts
geom.rotateX(Math.PI/2);
geom.translate(0, depth/2, 0); // now spans y ∈ [0, depth]? 
```
Hmm: after rotation, local +z (0..depth) maps to y ∈ [0..-depth]. Translating by depth/2 gives y ∈ [-depth/2, depth/2]? Let's compute: y_new = -z_local. z_local ∈ [0, depth] → y_new ∈ [-depth, 0]. Translate +depth/2 → [-depth/2, depth/2] ✓ centered. Great.

So `geom.rotateX(Math.PI/2); geom.translate(0, depth/2, 0);` Hmm, translate after rotate: y_new = -z + depth/2 ∈ [depth/2 - depth, depth/2] = [-depth/2, depth/2] ✓.

Now world z = +y_local ✓ (with rotateX(π/2): z' = y). Good, no mirror.

So the shape's (x,y) map to world (x,z) → (x, 0, y)? Yes: point (x,y,0) → (x, -0, y) = (x, 0, y) ✓. Wait, R_x(π/2) gives y' = -z = 0 and z' = y ✓.

Great.

Now, the "world angle" convention for gear teeth: I assumed angle α means (x = cos α, z = sin α). The shape's local point at angle α is (x = r cos α, y = r sin α) → world (x = r cos α, z = r sin α) ✓ matches.

Good, consistent.

Now, the position of each part in the scene: mesh.position.set(x, y, z) where x,z are the axis coords, y is the level.

For rotating parts, rotation.y = stateAngle + phase. Since the wheels are centered on the axis, rotating about y is fine.

Note that the rotation.y convention for the world-angle derivation: I derived world angle = local angle - rotation.y. With rotateX applied, the local shape point at angle α maps to world (cos α, sin α) before the y-rotation ✓, and then rotation.y = ρ gives world angle α - ρ ✓. Good, consistent.

### Now the full part-building code.

Let me now write it out carefully.

```ts
// ---------- Globals ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070a);
scene.fog = undefined? // skip

const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 500);
camera.position.set(2, 32, 26);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
```

`innerWidth` global — with strict TS in a DOM lib context, `window.innerWidth` is better. Use window.

OrbitControls: `const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0, 0); controls.enableDamping = true; controls.maxDistance = 200; controls.minDistance = 8;`. Controls update in the loop with delta.

Now build.

Let me write the actual code.

```ts
const M = 0.1; // module

// ---------- Materials ----------
function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
```

Perlage texture:
```ts
const perlageTexture = canvasTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#2b2f34'; ctx.fillRect(0,0,w,h);
  // overlapping circles
  for (let i=0;i<2200;i++){
    const x = Math.random()*w, y = Math.random()*h;
    const r = 3 + Math.random()*7;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const lum = 120 + Math.random()*90;
    g.addColorStop(0, `rgba(${lum},${lum},${lum+10},0.85)`);
    g.addColorStop(1, 'rgba(40,44,50,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
});
```
Careful about drawing 2200 circles × 2 textures = fine (once).

Geneva stripes texture:
```ts
const genevaTexture = canvasTexture(512, 512, (ctx,w,h)=>{
  ctx.fillStyle = '#5a5f66'; ctx.fillRect(0,0,w,h);
  const n = 8;
  for (let i=0;i<n;i++){
    const x = (i/n)*w;
    // stripe: alternate
    const g = ctx.createLinearGradient(x, 0, x + w/n, 0);
    ...
  }
});
```
Simpler: draw bands diagonal: use ctx.save(); ctx.translate... rotate(0.6). Fill alternating dark/light.

Actually for Geneva stripes, a "côtes" look: alternating bands of slightly different tone with sharp-ish edges. I'll draw vertical-ish diagonal bands.

```ts
function stripeTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas'); ...
  ctx.fillStyle = '#3b3f45';
  ctx.fillRect(0,0,size,size);
  ctx.save();
  ctx.translate(size/2, size/2); ctx.rotate(-0.5); ctx.translate(-size/2, -size/2);
  const bands = 10, bw = size/bands;
  for (let i=0;i<bands;i++){
    const x = i*bw;
    const grad = ctx.createLinearGradient(x,0,x+bw,0);
    grad.addColorStop(0,'#2d3136');
    grad.addColorStop(0.5,'#6b7178');
    grad.addColorStop(1,'#2d3136');
    ctx.fillStyle = grad; ctx.fillRect(x, 0, bw, size*3);  // hmm rotation
  }
  ctx.restore();
}
```
Fine, approximate.

Now materials:

```ts
const steelPolished = new THREE.MeshPhysicalMaterial({ color: 0xdadfe6, metalness: 1.0, roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 1.4 });
const steelBlued = new THREE.MeshPhysicalMaterial({ color: 0x14204f, metalness: 0.9, roughness: 0.22, clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.2 });
const brassGilt = new THREE.MeshPhysicalMaterial({ color: 0xd7ac5c, metalness: 1.0, roughness: 0.32, clearcoat: 0.3 });
const brassDark = ...
const ruby = new THREE.MeshPhysicalMaterial({ color: 0xd2152d, metalness: 0.0, roughness: 0.12, clearcoat: 1.0, clearcoatRoughness: 0.05, transparent: true, opacity: 0.78, ior: 1.6, envMapIntensity: 1.4, emissive: new THREE.Color(0x3a0010)? });
```
Hmm, emissive with roughness... skip emissive. Maybe `color: 0xff2244` with opacity 0.55 gives translucency feel. The three r's physical material has `transmission`; use `transmission: 0.0`? We want translucent so use opacity. Also set `side: THREE.DoubleSide`? Not needed.

Now the plate material with perlage map:
```ts
const plateMat = new THREE.MeshPhysicalMaterial({ map: perlageTexture, color: 0xcfc6b4, metalness: 1.0, roughness: 0.34, envMapIntensity: 1.0 });
plateMat.map!.repeat.set(0.35, 0.35) // uv in mm → repeats
```
Hmm, the plate is CylinderGeometry; its cap UVs map 0..1 across the disc → the texture covers the whole disc once. That's fine: the texture's grain is small-scale in the canvas, so mapping once across a 30mm plate gives very fine grain. The canvas grain circles (r=3-7 px on 512) map to (7/512)*30mm = 0.4mm ✓ perfect perlage size.

For the Geneva texture on bridge extruded geometry: cap UVs = world mm coordinates → set repeat ~ (0.6, 0.6)? Then the tile spans 1/0.6 = 1.67mm, with 10 bands → 0.167mm bands. That's fine (real Geneva bands ~0.5mm but ok). Maybe repeat 0.25 → tile spans 4mm, bands 0.4mm ✓. Use repeat 0.25.

But the extruded bridge's side wall UVs also use the same texture → whatever.

Careful: ExtrudeGeometry's default UV generator: I believe `WorldUVGenerator.generateTopUV` returns Vector2(a.x, a.y)... Actually it returns `new Vector2(a.x, a.y)`? Let me recall three/src/geometries/ExtrudeGeometry.js:

```js
var WorldUVGenerator = {
  generateTopUV: function ( geometry, vertices, indexA, indexB, indexC ) {
    const a_x = vertices[ indexA * 3 ]; const a_y = vertices[ indexA * 3 + 1 ]; ...
    return [ new Vector2( a_x, a_y ), ... ];
  },
  generateSideWallUV: ...
}
```
Yes, top UVs = shape coordinates (mm). With repeat 0.25 and wrapS/T repeat, the UVs in mm × 0.25 → tile every 4mm ✓.

Now, an important point: the texture in the shape's mm scale with `RepeatWrapping` and repeat set — need `texture.needsUpdate = true` after setting repeat.

Now the engraved text: create a canvas with transparent background and white text "UNITAS 6497 · 17 JEWELS · SWISS MADE", then a plane mesh with the canvas texture (transparency), placed on top of the train bridge, rotated to lie flat (rotateX(-π/2)), scaled to fit. Use MeshBasicMaterial? For engraving look, use MeshStandardMaterial with `map` and transparent, or just a black text plane with alphaMap. Simplest: CanvasTexture with white text on transparent; material = MeshBasicMaterial({map, transparent:true, depthWrite:false}) but then it will appear bright white; better: dark text on transparent? Engraving is dark-ish. Let's draw the text in a dark color (#111) with transparent background, using MeshPhysicalMaterial? Use MeshBasicMaterial with transparent, color 0xffffff and map; with the map's dark text and alpha from the canvas. Hmm, MeshBasicMaterial uses map's alpha for transparency if `transparent: true` and the texture has alpha. The text is dark → rendered dark ✓. Set `depthWrite: false` and `polygonOffset` to avoid z-fighting, place it slightly above the bridge surface.

Fine.

Now, the plate: CylinderGeometry(15,15,2.5,64) with plateMat; position y = -1.25 (top at 0). Maybe add a slight bevel ring. Keep simple. Also add a hole? skip.

Also I want the plate to have a rim (like a case ring?). Skip.

Bridges: build shapes.

Train bridge shape: circle-ish blob. Use a THREE.Shape with `absarc(0.4, 2.6, 5.8, 0, 2π, false)`? Hmm shape.absarc builds an arc. Simply:
```ts
const s = new THREE.Shape(); s.absarc(0.4, 2.6, 5.8, 0, Math.PI*2, false);
```
That yields a circle. Add a "finger" to the escape area? Not needed.

But careful: the train bridge circle at (0.4,2.6) r 5.8 covers center(0,0)? distance from (0.4,2.6) to (0,0) = 2.63 < 5.8 ✓. third (-2.25,3.897): distance = sqrt(7.02+1.68)=2.95 ✓. fourth (1.744,5.35): distance sqrt(1.8+7.56)=3.06 ✓. escape (3.94,1.54): distance sqrt(12.5+1.1)=3.68 ✓ but the escape wheel radius 0.75 → 4.43 < 5.8 ✓. Good, all under the bridge. But then the bridge covers the escape wheel and the fork's area — the fork is at y 1.15..1.45 below the bridge (2.5) ✓; the fork's arms are below the bridge. OK. But visually the fork would be hidden under the bridge; the fork is at the escape level under the bridge. Hmm, we want to see the escapement! In a real movement the escapement is under the bridge but visible through cut-outs. Since this is a showcase model, better to make bridges narrower or place cut-outs so the escapement is visible. Let's reduce the train bridge to a "ring" shape around the pivots with open areas? Hmm.

Alternative: make the bridges narrower arms (like real bridges) that connect the jewels, leaving the wheel rim and the escapement visible. Real 6497 bridges: there are 3 bridges covering the whole train region with windows... Actually real bridges cover most of the train wheels; you can see the wheels under them only if the bridge doesn't overlap the wheel's rim (the wheels are large, the bridges are narrow arms over the pivots). In the real 6497, the bridges are: barrel bridge (covers the barrel), train bridge (an arm over the center/third/fourth pivots), and the escape wheel has a small bridge. The wheels themselves are largely visible with their rims crossing under the bridges.

So better: make the train bridge a set of arms (a truss) instead of a big disc. That's more realistic and lets us see the mechanics. Build a bridge shape as a polygon that connects the pivot points with narrow arms: e.g., a "triangle-ish" outline connecting center, third, fourth pivots with widths ~2mm. I can construct the bridge as a union of capsules (rounded rectangles) — but a Shape can only be one outline. I could build the bridge as several separate meshes (bridge_center_arm, bridge_third_arm...) but the part name "train_bridge" would be one of them.

Alternatively: build the bridge outline as a closed polygon with arcs around each pivot: A path that goes around the pivots' circles (radius ~1.1 around each pivot) connecting them via concave arcs. That's a "chain of circles" outline. I can construct a polygon that passes around each pivot circle with concave transitions. Simpler approach: use a polygon with rounded corners via many points: define a set of "via points" (pivot positions with radius) and compute an outline using an offset polygon — complex.

Alternative pragmatic approach: the bridge = a single Shape built from a list of capsule shapes' outlines? Not allowed (a single shape must be one connected outline).

Simplest: use `THREE.Shape` with points forming a "triangle" with slightly rounded corners (chaikin smoothing on the polygon). Let's take the pivot positions [center (0,0), third (-2.25,3.9), fourth (1.74,5.35)] and build a polygon expanded outward by 1.0mm: compute the outward offset of a triangle path and round it. That's doable: for a convex polygon, the offset polygon = for each vertex, offset edges and add an arc. Too much work.

Easier: define the bridge as a shape made from overlapping circles approximated by a polygon: I can create a "blobby" outline via a radial function: for each angle around a center, compute the max radius over a set of circles: outline point = for angle θ, radius = max over circles of (distance)... hmm.

Actually here's a clean approach: build the bridge outline by sampling 256 angles around the centroid of the pivots; for each angle, compute the ray-circle intersections for each of the "circles" (pivot discs radius R) and take the farthest one. That produces a blobby union of circles (like a "candy" shape). Since circles are convex and we take the max along the ray from the centroid, and the centroid is inside all circles... but the union of circles isn't star-shaped around the centroid necessarily (it is here, roughly). Sample 128 rays, take max intersection distance → a smooth blob (union approximated, with slight concavities filled). Good enough and simple to implement.

Let's do: circles = pivot positions with radius 1.3 (for the bridge blob). Plus the barrels' circles etc. For each ray angle, find the max distance t such that the ray point is inside any circle: for circle center c, radius R: solve |p0 + t*d - c| = R → t = c·d + sqrt(R² - (c·d)² - ...). Compute: let v = c - p0. t = v·d + sqrt(R² - |v - (v·d)d|²) if the perpendicular distance < R. Take max over circles. If no circle hit, t = something small.

That gives a star-shaped polygon covering the union ✓ (since all circles contain p0? Not necessarily, but let's set p0 = centroid and use R large enough to cover).

Good, and I'll use this function for the train bridge (circles at center, third, fourth pivots with R=1.5), the barrel bridge (circle at the barrel with R=3.9), the escape bridge (circle at escape with R=1.6 plus the fork pivot R=1.0?), the balance cock (circles at escape? and balance with R=2.2 connecting).

Hmm, the balance cock: an arm from the balance to the plate; circles at the balance axis (R=1.8) and at the fork/escape (R=1.5). Fine.

Actually for the balance cock in real watches, it's a "cock" over the balance with a large round boss. Let's make circles at the balance axis (R 2.2) and at a point near the plate edge (R 1.2).

OK, this "blob union" function:

```ts
function blobShape(center: THREE.Vector2, circles: {c: THREE.Vector2, r: number}[], segments = 96): THREE.Shape {
  const pts: THREE.Vector2[] = [];
  for (let i=0;i<segments;i++){
    const a = (i/segments)*Math.PI*2;
    const d = new THREE.Vector2(Math.cos(a), Math.sin(a));
    let t = 0.001;
    for (const ci of circles) {
      const v = ci.c.clone().sub(center);
      const vt = v.dot(d);
      const perp = v.clone().sub(d.clone().multiplyScalar(vt)).length();
      if (perp < ci.r) {
        const tt = vt + Math.sqrt(ci.r*ci.r - perp*perp);
        if (tt > t) t = tt;
      }
    }
    pts.push(new THREE.Vector2(center.x + d.x*t, center.y + d.y*t));
  }
  const shape = new THREE.Shape();
  shape.setFromPoints(pts); // does Shape have setFromPoints? THREE.Shape extends Path/CurvePath... Shape has `setFromPoints`? Shape inherits from Path which has `setFromPoints`? Hmm, Shape.setFromPoints exists? Let me check: THREE.Shape has `moveTo`, `lineTo`, `absarc`, `ellipse`, etc. It doesn't have setFromPoints I think. Path has `setFromPoints`? Actually `Path` does NOT define setFromPoints; `THREE.Shape`... hmm. In `CurvePath` there's no such. But `THREE.Shape` has `moveTo`, `lineTo`. I can just do shape.moveTo(pts[0].x, pts[0].y) then lineTo for each and close.
  return shape;
}
```
Note: shape points are in (x, y) which map to world (x, z) ✓ (with rotateX(π/2) as established). And our layout coordinates are (x, z) → so I should use Vector2(x, z) consistently ✓.

Wait: with rotateX(π/2), shape (x,y) → world (x, z=y) ✓. So I need to define shapes with y = world z ✓. Good, and the layout coordinates are (x, z) → use Vector2(x, z) consistently.

The blob is fine.

Hmm, but the "cônes"/Geneva stripes should look nice; the blob shape with 96 segments produces a smooth outline. Extrude with bevel gives chamfered edges ✓.

The bevel: `new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.18, bevelSegments: 2, curveSegments: 4 })`. Bevel size on the outline: 0.18mm chamfer ✓. But with the blob sampling, the shape outline is a polygon of 96 straight segments; fine.

Hmm, but bevelling can create weird geometry if the shape is concave — our blobs are convex-ish ✓.

Now: the bridge must have holes for the jewels? We place jewels on top of the bridge instead (visually the jewels sit on the bridge). Real jewels are set into the bridge (the jewel is visible as a ruby in a gold chaton on the bridge's top face). So place the jewel on top of the bridge ✓.

Now, let's define the levels:
- plate: y ∈ [-2.5, 0]
- levelA = 0.95 (wheels thickness 0.55 → y ∈ [0.675, 1.225])
- levelB = 1.95 (thickness 0.55 → [1.675, 2.225])

Hmm, the wheel thickness for a real train wheel: 0.15-0.3mm. Our wheels of radius 4mm with thickness 0.55 is chunky but ok for visibility. Let's use 0.4mm thickness for wheels and pinions 0.55mm tall. Levels: levelA = 0.95, levelB = 1.95: separation 1.0mm with 0.4 thickness → clear ✓.

Pinions: height 0.7mm, centered at the same level as the wheel they mesh with? The pinion of stage n is at level of stage n-1's wheel. So pinion of center = levelA; wheel center = levelB. Pinion of third = levelB; wheel third = levelA. Pinion of fourth = levelA; wheel fourth = levelB. Pinion of escape = levelB; wheel escape = levelA? Wait I set escape wheel at level A and pinion at level B? Let's re-derive: the fourth wheel (level B) meshes the escape pinion → the escape pinion at level B. The escape wheel is on the same axis; put it at level A (below). Fine.

Hmm, but then the train levels: barrel wheel A, center pinion A, center wheel B, third pinion B, third wheel A, fourth pinion A, fourth wheel B, escape pinion B, escape wheel A. Check meshes: barrel(A)+center pinion(A) ✓; center(B)+third pinion(B) ✓; third(A)+fourth pinion(A) ✓; fourth(B)+escape pinion(B) ✓. 

Wheel heights: 0.4mm at levelA center 0.95 → [0.75,1.15]; levelB 1.95 → [1.75,2.15]. Bridge bottom at 2.5 ✓ above.

Pinion heights 0.7mm: pinion center at levelA 0.95 → [0.6,1.3]; at levelB → [1.6,2.2]. Hmm, wait: the pinion of center at level A should mesh with the barrel wheel at level A, so the pinion spans [0.75,1.15] ideally. If the pinion is 0.7 tall centered at 0.95, it spans [0.6,1.3] and overlaps the barrel wheel's vertical extent [0.75,1.15] ✓ — meshing visible in the overlapping y-range ✓. Good.

Now the wheels' y-positions relative to the shape extrusion: we translate the geometry to be centered, so mesh.position.y = level.

Now the tooth meshing: both gears at their levels; the teeth overlap in y ✓ (since level A and A coincide).

Now positions of the pinions: same axis as their wheel, same rotation phase.

Now, the hands: 
- minute_hand at the center axis (0,0), y = 6.5, length ~8mm, rotation.y = minute angle + phase? The hand should be at the cannon pinion/hour wheel axis. The minute hand is on the center wheel axis: rotation.y = center(t) + something. But visually the position of the hand relative to the dial is irrelevant here; use rotation.y = center(t) (unwrapped, and since it goes 2π/hour, it rotates). Fine. Actually, the hands should rotate about y with the angle; adding a phase offset of 0 is fine.
- second_hand at the fourth wheel axis (1.744, 5.35), y = 6.5, length ~5mm, rotation.y = fourth(t) + phase.
- hour_hand at the center axis (0,0) rotated by hour(t) = center/12.

The hands all rotate; they're at different y levels so they don't intersect the wheels? The minute hand at y=6.5 sweeping over the whole movement; the balance cock top at 6.4? Let's place the hands higher: hour hand at y=7.6, minute hand at y=8.2, second hand at 7.0? Let's set:
- second_hand y = 7.0 (on the fourth wheel axis above everything)
- hour_hand y = 7.8 (center axis)
- minute_hand y = 8.4

Hmm, wait: the balance cock top at ~6.3; hands above ✓.

Now the balance cock: place its top at y=6.2. The stud at y ~ 4.0-4.8. Fine.

Now the crown/stem: y around 1.5? The crown is outside the movement horizontally. Let's put the stem at y=1.0 (mid-level) going from the barrel area out through the plate edge to the crown at (-15.5, 1.0, -6.5). Actually the crown should be outside the plate (plate radius 15 → the crown at |x|>15). Let's set crown at (-16.5, 0.6, -7.5), stem from (-15, 0.6, -6.8) to (-4.5, 1.6, -2.5)? The stem direction isn't important; make it a cylinder from crown to the barrel arbor area. Use a helper `cylinderBetween(a, b, r, material)`.

Cylinder between two points: create CylinderGeometry(r, r, len, 16) rotated to align with the direction. Use `mesh.position.copy(mid); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize())`. ✓

Setting lever: a small flat piece near the stem at (-8, 1.6, -4)? And the click near the ratchet wheel.

Ratchet wheel: on the barrel axis at y=3.5 (above the barrel bridge at 2.5-3.1)? Hmm, our barrel bridge is at y 2.5..3.1 and the ratchet wheel would be above it at 3.2..3.6. The barrel arbor (from the barrel drum up through) — fine.

Wait, but the barrel bridge covers the barrel; the ratchet wheel sits above the bridge, on the barrel arbor ✓. The crown wheel (winding) meshes with the ratchet wheel — I'll skip or add. Not required.

Click: a small piece touching the ratchet wheel's teeth (the click is a spring that clicks against the ratchet wheel) — place at the ratchet's edge.

OK.

Now let's also add a "barrel bridge" mesh.

Let me also decide the "escape bridge": a blob over the escape wheel + fork pivot: circles at escape (R 1.4) and fork pivot (R 1.1).

The fork pivot position: let's compute. The balance center is at B0 = escape + 7.5*dir(-45°) = (3.944 + 5.303, 1.540 - 5.303) = (9.247, -3.763). The fork pivot must be between the escape wheel and the balance: at escape + 2.6*dir(-45°) = (3.944+1.839, 1.540-1.839) = (5.783, -0.299). Hmm, the fork's arms point toward the escape wheel; the fork's tail points toward the balance. The balance impulse pin is at radius ~2.6 from the balance center (rim inner?), i.e., at the balance's rim inner side; the distance from the fork pivot (5.783,-0.299) to the balance center (9.247,-3.763) is sqrt(11.99+11.99) = 4.9. The balance impulse pin at 2.6 from the balance center toward the fork: position = balance center + 2.6*dir(toward fork) = balance center + 2.6 * normalize(fork - balance) = (9.247,-3.763) + 2.6*(-0.707,0.707) = (7.41, -1.92). Distance from the fork pivot to the impulse pin = sqrt((5.783-7.41)² + (-0.299+1.92)²) = sqrt(2.65+2.65)=2.3. The fork's tail length ~1.9 (from the pivot) so the slot would be at ~1.9 from the pivot, but the pin is at 2.3 — mismatch but visually close. I could set the fork tail length ~2.2 and the slot near the pin. Fine, adjust: tail extends to 2.2, slot centered at 2.0 from the pivot.

Fine.

Now: does the fork rotate about y by pallet(t) — yes, ±0.2 rad about its pivot.

Also for realism, the fork pivot jewel (jewel) at the fork pivot ✓.

Now let's write down all the jewel positions:

jewels (17):
1. jewel_1: barrel arbor pivot (plate) at barrel pos, y = 0.1? Actually jewels on the plate would be hidden under the wheels; visible places: on the bridges (top). Let's place jewels at the bridge tops: y = bridge top + 0.02. Bridge top: 2.5+0.6 = 3.1? With bevel, top at 3.1. Set the jewel y = 3.13.
Positions:
- jewel_1: center wheel pivot on the train bridge: (0,0) y=3.13
- jewel_2: third wheel pivot: (-2.25, 3.897) y=3.13
- jewel_3: fourth wheel pivot: (1.744, 5.35) y=3.13
- jewel_4: escape wheel & fork? escape pivot on the escape bridge: (3.944,1.54) y=3.13
- jewel_5: fork pivot: (5.783,-0.299) y=3.13
- jewel_6: barrel arbor on the barrel bridge: barrel pos y=3.13
- jewel_7: balance jewel on the balance cock: balance pos y=6.3
- jewel_8: pallet fork jewel? Already 5. Hmm.

Need 17. Let's place them at various pivots including the underside/pivot points, even if some are stacked (each must be a separate mesh with a unique name; positions can be the same axis but at different y levels). 17 jewels at:
1..4: center, third, fourth, escape (bridge tops)
5: fork pivot (escape bridge)
6: barrel arbor (barrel bridge)
7: balance (cock top)
8: center pinion jewel (below the bridge? place on the plate top under the wheel? invisible)... 

Better to distribute at the actual pivot locations but at different visible levels: 
- On the plate top (y=0.02) at the barrel, center, third, fourth, escape pivots — but these are covered by wheels. Hmm, they'd be hidden. Nonetheless placing one jewel per pivot on the bridge top + one on the cock + a few in the motion works.
Realistically 17 jewels = 2 balance (cock and plate? balance has 2: one in the cock, one in the plate? The 6497 balance has 2 jewels? Let's just do it.

Positions (17):
1. (0,0) y=3.13 — center pinion jewel (bridge)
2. (-2.25,3.897) y=3.13 — third
3. (1.744,5.35) y=3.13 — fourth
4. (3.944,1.54) y=3.13 — escape
5. (5.783,-0.299) y=3.13 — fork
6. barrel (-3.947,-1.436) y=3.13 — barrel arbor
7. balance (9.247,-3.763) y=6.35 — balance
8. (0,0) y=0.03 — center wheel lower pivot (hidden under wheel) — meh.
Instead: motion works jewels at the cannon pinion, minute wheel, hour wheel (on the bridge/plate top at y=3.4).
8. cannon pinion jewel (0,0) y=3.35
9. minute wheel jewel (position of the minute wheel) y=3.35
10. hour wheel jewel y=3.35
11. setting lever jewel? no.
... We need 17; I'll just place 17 in a list with plausible positions. Duplicates at the same axis with slightly different y are OK visually if not overlapping.

Let's do the list:
1..6 as above (bridge tops).
7. balance cock jewel (balance axis, y=6.35)
8. cannon pinion (0,0) y=3.4 (on the train bridge? but the train bridge top is 3.1, so place at 3.15).
9. minute wheel position (say (-1.6, -0.9)) y=3.15
10. hour wheel position (0, 0)? both on the same axis... The hour wheel is on the center axis too. Hmm, motion works: cannon pinion at center, minute wheel offset, hour wheel at center (concentric with the cannon pinion). So place jewel_10 at (0,0) y=3.15 too → overlapping jewel_1. Move to y=3.5 (above the bridge, in the motion works level). Fine, put the motion works at y=3.3-4.0 and jewels on the plate below? Let's simply place 8..12 in the motion works area.

Hmm, I'm overthinking. The jewels are small parts; I'll place 17 of them at pivot-ish locations with varied y so they're visible and not overlapping:
1. center pivot, y=3.18
2. third pivot, y=3.18
3. fourth pivot, y=3.18
4. escape pivot, y=3.18
5. fork pivot, y=3.18
6. barrel pivot, y=3.18
7. balance pivot, y=6.4
8. center pivot (lower, plate), y=0.04 — hidden but exists
9. barrel pivot (plate), y=0.04
10. third pivot (plate), y=0.04
11. fourth pivot (plate), y=0.04
12. escape pivot (plate), y=0.04
13. fork pivot (plate), y=0.04
14. balance pivot (plate), y=0.04  → 8..14 (7 jewels on the plate, hidden under wheels but real)
15. cannon pinion (0,0) y=4.25
16. minute wheel (-1.4,-1.0) y=4.25
17. hour wheel (0,0)... 

Hmm, that's 17 with some hidden. "the 17 jewels named jewel_1 ... jewel_17 (at the pivots)" — hidden ones are fine (real jewels are under the wheels!). Actually real jewels are visible in the plate from the underside; from the top they're hidden under the wheels/bridges. So that's realistic. But for the visual "golden chatons around ruby jewels" you want some visible. The bridge-top ones (1-7) are visible ✓.

So: jewels 1-7 on bridge tops, 8-14 on the plate top (hidden beneath wheels but present), 15-17 in the motion works. Good, 17.

Let's define the motion works positions:
- cannon pinion at (0,0) y=3.6 (above the train bridge? The train bridge covers the center pivot at y=2.5-3.1; the cannon pinion should be above it, y=3.2-3.8)
- minute wheel at the cannon pinion offset. For the motion works, the minute wheel sits on the plate/bridge at an offset distance; pick (-1.5, -1.2) with radius 1.2.
- hour wheel at the center (0,0) above the cannon pinion, y=4.0, radius 1.6.

Then hands: hour hand at y=5.2, minute hand at y=5.8? But the balance cock is at 6.0-6.3. Hands would then be below the balance cock top — collision risk where the hands sweep over the balance (the minute hand sweeps radius ~8mm from center (0,0) reaching x=8; the balance is at (9.2,-3.8) distance 10 from center → the hands (length ≤8mm) won't reach the balance ✓!). Let's check: distance from center (0,0) to the balance center (9.247,-3.763) = 10.0. So hands of length ≤ 8mm don't reach the balance. ✓ Nice.

So hands can be at y=5.4 and 5.9, below the balance cock top (6.3). But do they collide with the train bridge (top 3.1) and motion works (top ~4.3)? Hands at 5.4+ ✓ clear.

But the second hand is at the fourth wheel axis (1.744, 5.35) with length ~5mm; it would sweep around that axis, reaching the balance? Distance from the fourth axis to the balance center: sqrt((9.247-1.744)² + (-3.763-5.35)²) = sqrt(56.6+83.1) = 11.8 > 5 ✓ clear.

Now, the balance wheel radius 4.0 at (9.247,-3.763): does it overlap the fourth wheel? Distance between the fourth axis and the balance axis = 11.8; the fourth wheel radius 4 + balance 4 = 8 < 11.8 ✓ no overlap in plan. Good. And the balance overlaps the hands? No.

Does the balance wheel overlap the escape bridge/fork? The fork pivot at (5.783,-0.299); the balance center at (9.247,-3.763); distance = 4.9; balance radius 4 → the balance rim reaches 0.9 mm from the fork pivot ✓ close but no overlap (the fork body ~0.6 long). Fine.

Now positions of the motion works and hands.

Let me now also handle the "minute wheel" and "hour wheel" meshes: small gears with spokes. Teeth counts: minute wheel 34 teeth (r = 1.7 at module 0.1?), hour wheel 40. Hmm, must not conflict with the required ratios (only train wheels' userData matters). Set cannon pinion radius 0.45 (9 leaves?), minute wheel radius 1.4, hour wheel radius 1.7. Positions: minute wheel at (0,0) + 1.85 * dir(140°)? Distances must equal the sum of pitch radii to look meshed: cannon pinion radius (say 0.45) + minute wheel radius (1.4) = 1.85 ✓ set distance 1.85.

Then the hour wheel must mesh with the minute wheel's pinion (radius 0.35): distance = 1.4 + 0.35 = 1.75 from the minute wheel toward... but the hour wheel is concentric with the cannon pinion (center axis) — that requires the distance between the minute wheel axis and the center = 1.75, but we set 1.85 for the cannon pinion mesh. Contradiction: the hour wheel is on the center axis, and the minute wheel has only one axis, so both meshes must be at the same distance: cannon pinion radius + minute wheel radius = minute wheel radius + hour wheel pinion radius → cannonPinionR = hourPinionR. That's fine: the minute wheel meshes both the cannon pinion (below) and the hour wheel's pinion (above)? Actually in reality: cannon pinion → minute wheel (its teeth) → hour wheel (the minute wheel has a pinion on top? no...). Real motion works: the cannon pinion (a small pinion) meshes with the minute wheel (a flat wheel with teeth on the outside); the minute wheel's pinion (integral, coaxial) meshes with the hour wheel. Hmm, the hour wheel is concentric with the cannon pinion, and the minute wheel is on one axis. So the distance between the center axis and the minute wheel axis is d = r_cannon + r_minuteWheel (mesh 1) and d = r_minutePinion + r_hourWheel (mesh 2). Different levels, so it works: r_cannon + r_minuteWheel = r_minutePinion + r_hourWheel. With r_cannon = 0.35 (7 leaves), r_minuteWheel = 0.9 (18 teeth): d = 1.25. r_minutePinion = 0.3 (6 leaves), r_hourWheel = 0.95 (19 teeth): d = 1.25 ✓. Ratio: (18/7)*(19/6) = 2.57*3.17 = 8.1 — not 12, but visually fine. Whatever.

Honestly, the motion works details don't matter much. Let's set: cannon pinion at center, radius 0.35; minute wheel radius 1.0 at distance 1.35 from center; minute wheel pinion radius 0.35; hour wheel radius 1.0 at center (concentric) at a higher level. d = 1.35 = 1.0+0.35 ✓ for both. Good.

Actually, wait: the cannon pinion should be at the center axis, and the hands: the minute hand is attached to the cannon pinion? The hour hand is attached to the hour wheel. The minute hand is on the cannon pinion. Fine.

Also the hour wheel radius 1.0 is small; ok.

Now let's write out the code. It's going to be ~1000 lines. Let's be efficient but complete.

Let me define the layout constants:

```ts
const MODULE = 0.1;
const TEETH = { barrel: 72, center: 80, third: 75, fourth: 80, escape: 15 };
const LEAVES = { center: 12, third: 10, fourth: 10, escape: 8 };
const radius = (t:number) => MODULE*t/2;
const pinionRadius = (l:number) => MODULE*l/2;
```

Layout positions (x, z):
```ts
const P = {
  center: new THREE.Vector2(0, 0),
  third: ..., 
};
```
Compute:
```ts
const d1 = radius(72) + pinionRadius(12); // barrel->center = 4.2
const d2 = radius(80) + pinionRadius(10); // 4.5
const d3 = radius(75) + pinionRadius(10); // 4.25
const d4 = radius(80) + pinionRadius(8);  // 4.4

function polar(d: number, deg: number) { return new THREE.Vector2(Math.cos(deg*Math.PI/180)*d, Math.sin(...)*d); }

const centerPos = new THREE.Vector2(0,0);
const thirdPos = centerPos.clone().add(polar(d2, 120));
const fourthPos = thirdPos.clone().add(polar(d3, 20));
const escapePos = fourthPos.clone().add(polar(d4, -60));
const barrelPos = centerPos.clone().sub(polar(d1, 20));
```

Then the phase computation as described.

Balance position: escapePos + polar(7.5, -45).
Fork pivot: escapePos + polar(2.6, -45)? Hmm, if both the fork pivot and the balance are on the same ray at -45° from the escape wheel, the fork is between ✓.

Wait, but the fork's arms must point toward the escape wheel, i.e., the fork is between the escape wheel and the balance, with arms toward the escape and tail toward the balance ✓ along the -45° ray ✓. 

Hmm, but the fork pivot at 2.6mm from the escape center; the escape wheel's radius+teeth = 0.75+0.1 = 0.85. The fork arms (~1.5 long) would reach the escape wheel; from the pivot at 2.6, the nearest rim point is at 2.6-0.85 = 1.75 away. The arm tips at 1.5-1.9 length ✓ straddling the rim. Good.

Let's now handle the visual of the fork's pallet tips: two red boxes at the arm tips, angled.

Now, code for the gear shape with holes:

```ts
function makeGearShape(teeth: number, pitchRadius: number, mod: number, opts: { hub?: number; cutInner?: number; cutOuter?: number; spokes?: number; }): THREE.Shape {
  const shape = new THREE.Shape();
  const aPitch = (Math.PI * 2) / teeth;
  const rTip = pitchRadius + mod * 0.95;
  const rRoot = Math.max(0.05, pitchRadius - mod * 1.25);
  const tipHalf = aPitch * 0.16;
  const rootHalf = aPitch * 0.34;
  let first = true;
  for (let i = 0; i < teeth; i++) {
    const a = i * aPitch;
    const pts = [
      [rRoot, a - rootHalf],
      [rTip, a - tipHalf],
      [rTip, a + tipHalf],
      [rRoot, a + rootHalf],
      [rRoot, a + aPitch * 0.5 - rootHalf * 0], // mid arc? 
    ];
```
Hmm, let me just do 4 points per tooth plus a mid-point at the midpoint between teeth:
```
      [rRoot, a + aPitch*0.5]
```
Wait, a + aPitch*0.5 is the midpoint to the next tooth. So the sequence: rootHalf at a, tip at a±tipHalf, root at a+rootHalf, then mid at a+0.5aPitch on rRoot, then the next tooth's root left at (a+aPitch) - rootHalf = the next i's a-rootHalf ✓. So the polygon: for each tooth push [rRoot, a-rootHalf], [rTip, a-tipHalf], [rTip, a+tipHalf], [rRoot, a+rootHalf], [rRoot, a + aPitch*0.5] ✓.

Then:
```ts
  const pts: number[][] = [];
  for ...
  shape.moveTo(pts[0][0]*Math.cos? ...
```
Actually store as (r, angle) then convert. Let me store [radius, angle] and convert to (x,y).

Then holes:
```ts
  if (opts.hub) { const h = new THREE.Path(); h.absarc(0,0,opts.hub,0,Math.PI*2,true); shape.holes.push(h); }
```
Direction of the hole path affects the triangulation winding; three's ShapeUtils handles holes; the winding should be opposite to the outline (I think three handles it via isClockWise checks). Use `true` for clockwise.

Arc cutouts:
```ts
const spokes = opts.spokes ?? 3;
const cutInner = (opts.cutInner ?? 0.34) * pitchRadius;
const cutOuter = (opts.cutOuter ?? 0.86) * pitchRadius;
if (cutOuter > cutInner + 0.01) {
  const span = (Math.PI*2) / spokes - gap... 
```
Let's define gap = (2π/spokes) * 0.28 (i.e. 28% of the slot is metal (spoke)) and arcSpan = (2π/spokes)*0.72. For 3 spokes: 2π/3 = 120°, arcSpan = 86.4°, gap 33.6°.

For each spoke k: start = k*120° + gapHalf... Actually the metal spokes should be at angles aligned with pivot geometry; place the spoke arms at angles k*(2π/spokes) + offset. The cut arcs are between the spokes. So cut k spans from (k+0.14)*step to (k+0.86)*step where step = 2π/spokes.

Build the hole path: start at angle a1 on the inner circle, arc to a2 on the inner circle (using absarc with anticlockwise?), then line to the outer at a2, arc back on the outer to a1, then close. Using Path:
```ts
const hole = new THREE.Path();
hole.absarc(0,0,cutInner, a1, a2, false); // goes counterclockwise from a1 to a2
hole.lineTo(cutOuter*cos(a2), cutOuter*sin(a2));
hole.absarc(0,0,cutOuter, a2, a1, true); // clockwise back
hole.lineTo(cutInner*cos(a1), cutInner*sin(a1));
```
Hmm, absarc appends a curve from the current point to the arc start? THREE's Path.absarc(x,y,radius,startAngle,endAngle,clockwise) creates an arc; the implementation calls `this.moveTo` if it's the first? Actually `Path.absarc` uses `absarc` → `EllipseCurve` appended to the path's curves list (via `this.curves.push`?) Let me recall: `Path.absarc()` → `this.absellipse(...)` → which does `this.curves.push`? In three, `Path.absellipse(aX, aY, aRadius, ...)`:

```js
absellipse( aX, aY, xRadius, yRadius, aStartAngle, aEndAngle, aClockwise, aRotation ) {
  const curve = new EllipseCurve(...);
  if ( this.currentPoint && this.currentPoint.length ... ) hmm
```
Actually Path.absarc: 
```js
absarc( aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise ) {
  this.absellipse( aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise );
  return this;
}
absellipse(...) {
  const curve = new EllipseCurve(...);
  if ( this.currentPoint && !this.currentPoint.equals(curve.getStart()) ) { ... } // something like that
  this.curves.push(curve);
  return this;
}
```
Hmm, older three versions: `absellipse` does check: if (this.currentPoint && this.currentPoint.x ... ) then lineTo the curve start? Let me just be safe: build holes with explicit lineTo + arc via `absarc` and rely on the EllipseCurve start matching. Since we're starting each hole path with `moveTo`? A Path is created empty; `absarc` pushes the ellipse curve and sets currentPoint. Then `lineTo` pushes a LineCurve. Then `absarc` again — if the current point equals the arc start, it's fine (no auto-move). Hmm, if it's not equal, three might insert a line. To be safe, I'll construct the hole as a polygon by sampling points (lineTo loop) — simplest and robust. The hole outline sampled with ~16 points along each arc. Let's do that.

So build holes as sampled polygons: for the arc cutout, sample the inner arc from a1→a2 (say 10 points), then the outer arc back a2→a1 (10 points), then close.

Similarly the central hub hole: sample a circle of 24 points.

Then `shape.holes.push(holePath)`.

Extruded geometry will triangulate with these holes ✓. Since each hole is a simple polygon (annular sector) ✓.

Now the wheel extruded geometry also needs a "shaft" cylinder? Not necessary but nice: the pinion has a shaft (a cylinder) that goes through the hub hole. Let's add a shaft as a child of the wheel: `new THREE.Mesh(new THREE.CylinderGeometry(hub*0.8, hub*0.8, 1.2, 16), steel)`. Meh, optional. Let's skip shafts except for the pinions (each pinion will have a shaft cylinder to look connected). Hmm, adding a shaft to the pinion: since the pinion is at the wheel's axis, the shaft cylinder at the same axis is fine.

Actually for visual realism, the pinion sits on the same axis and its body is a thin cylinder with teeth. I'll give the pinion geometry a "body": the gear teeth plus a cylinder below? Simpler: just the extruded gear shape of the pinion (thin teeth) at the required level ✓. Add a small cylinder as a child for the shaft connecting to the wheel level? Skip.

Now the mainspring: a spiral ribbon inside the barrel. Build with a TubeGeometry along a spiral curve (in the x-z plane) with a small radius (0.06), or an extruded spiral ribbon. Use the spiral curve + tube. Mainspring radius from 0.5 to 3.0 with ~6 turns; tube radius 0.07 (looks like a flat ribbon? tube is round; fine).

Actually a tube of radius 0.07 with 6 turns around the barrel — plausible.

Barrel: a drum: use CylinderGeometry(rBarrel*0.92, rBarrel*0.92, 1.4, 48) plus the gear teeth shape on the rim. But the requirement: mainspring_barrel should be a mesh with teeth (the barrel is the toothed drum). Let's build it as an ExtrudeGeometry of the gear shape (72 teeth) with a hole (the drum interior) plus a cylindrical wall? Simplest: mainspring_barrel = ExtrudeGeometry of the gear shape with a big hole (cut all the way out?), thickness 1.6, plus we'd see the mainspring inside through the hole? If the hole goes all the way through, we'd see the plate below... The hole radius ~2.9 (inside the teeth), and the mainspring inside it. But a real barrel is a closed drum (a can). We can't see the mainspring inside unless we make the barrel a ring (open). For the display, make the barrel a ring with a large opening so the mainspring is visible inside. That's a "showcase" simplification ✓. Or make the barrel drum with the top open and the mainspring visible from the top ✓. So: mainspring_barrel = the gear ring (teeth at the rim) extruded 1.6mm tall with a hole (the interior) + a bottom disc? If it's a ring, we'd see the plate through it, plus the mainspring sits inside ✓.

Let's do: barrel geometry = gear shape (72 teeth, r=3.6) with a hole of radius 3.0 (inside the root circle 3.6-0.125=3.475; hole 3.0 is inside ✓). Extrude depth 1.6.

Then mainspring = spiral inside radius from 0.55 to 2.85 ✓; and arbor = a cylinder radius 0.45 at the center with a hook.

Set the barrel at level: barrel wheel at levelA (0.95) thickness 1.6 → spans [0.15, 1.75]. Hmm, that overlaps levelB (1.75-2.15). Let's give the barrel its own level: y center 0.95, thickness 1.5 → [0.2, 1.7]. The center pinion at levelA [0.6,1.3] overlapping the barrel's teeth region ✓ (teeth mesh at y 0.75-1.15 ✓ within the barrel's height).

Hmm, the barrel's teeth are at radius 3.6, height 1.5 ✓ fine.

The mainspring inside spans the barrel's height partially.

The barrel arbor: cylinder from y=0 to y=3.8 (through the barrel and up to the ratchet wheel) radius 0.4 ✓.

Ratchet wheel: at y=3.4 above the barrel bridge (2.5..3.1): radius 1.9, teeth 28, thickness 0.5. Hmm, the barrel bridge covers the barrel (top at 3.1); the ratchet at y 3.3-3.8 ✓.

Wait, the barrel bridge blob radius ~3.9 covering the barrel. The ratchet wheel radius 1.9 sits above it. Fine, but the arbor passes through the bridge — no hole needed.

Actually wait: the barrel bridge is at y 2.5-3.1, and the barrel's top is at 1.7, so it covers it ✓.

Crown: at the outer edge, y ~1.0. Let's put the crown at (-15.2, 1.0, -7.0)? Distance from origin = 17.8 → outside the plate (r=15) ✓. Stem from the crown toward the barrel/ratchet area: from (-15.2,1.0,-7.0) to (-4.5, 2.0, -2.8) — a cylinder. The stem passes through the plate's edge region; fine, it's outside/above.

Hmm, the crown is usually not part of the movement, but required. Fine.

Click at the ratchet wheel: a small piece at (-5.0, 3.5, 0.5)? The ratchet wheel at the barrel axis (-3.947,-1.436) radius 1.9; the click should touch the teeth: at the barrel pos + 1.9*dir(45°) = (-2.6, -0.09); place the click as a small angled box there.

Setting lever: near the stem at (-8.5, 2.2, -4.5)? fine, a small flat piece.

Now, let's write the code for real.

Also "screws" with heat-blued heads: screws placed at bridge positions: e.g., 3 on the train bridge, 1 on the barrel bridge, 2 on the balance cock, 1 on the escape bridge, 1 on the plate edge... that's 7; let's do 8 screws (screw_1..screw_8). Each: a cylinder (radius 0.45, height 0.35) at y = bridge top + 0.15, plus a slot: a thin box (0.9 x 0.12 x 0.1) dark on the top, rotated a random angle.

Hmm, "slotted heads" — the slot could be a dark box sunk into the head: place a thin box at the top surface with a dark material ✓.

Screw positions: 
- screw_1: near the center pivot on the train bridge at (0.9, 0.9)? Let's use blob-ish positions:
  1. (0.4, 0.4)? Hmm, must lie on the bridge. The train bridge blob is centered around the centroid of center/third/fourth = ((0-2.25+1.744)/3, (0+3.897+5.35)/3) = (-0.169, 3.082). Circles at those pivots with R=1.5. Screw positions: on the bridge: (center + offset toward the centroid?) Let's just put screws at (0,0)+1.0*dir(225°)? = (-0.707,-0.707) — distance from the center pivot 1.0 < 1.5 ✓ on the bridge.
  
Fine, and I'll verify positions are within the blob by checking distance to a pivot < R.

Screw positions (on bridge blobs, distance ≤ R from a pivot):
1. center pivot + 1.0*(−0.7, 0.7) → (-0.7, 0.7) ✓
2. third pivot + 1.0*(0.6,0.8) → (-1.65, 4.697)? distance from the third pivot = 1.0 ✓
3. fourth pivot + 1.0*(-0.8,0.6) → (0.944, 5.95) ✓
4. escape pivot + 0.9*(0.7,-0.7) → (4.57, 0.9)? The escape bridge blob has circles at the escape pivot R=1.5 and the fork pivot R=1.2. ✓
5. barrel pivot + 1.5*(0.7,0.7) → (-2.9, 0.5)? distance 1.5 from the barrel pivot — the barrel bridge blob R=3.9 ✓.
6. balance cock: balance pivot + 1.2*(-0.7,0.7) → (8.4, -2.9) ✓ within the cock's blob (R 2.2).
7. cock screw: (7.5,-2.0)? ✓
8. plate screw? skip; use another on the barrel bridge: (-5.0, -2.0) distance from barrel (-3.947,-1.436) = sqrt(1.1+1.4)=1.6 ✓.

Great.

Now the code organization. Let me write it fully.

Also note: for the parts' explode, I'll add all top-level meshes to a `parts` array and set userData.

Let me write helper `addPart(mesh, name)`:
```ts
function registerPart(obj: THREE.Mesh, name: string, explodeExtra = 0) {
  obj.name = name;
  scene.add(obj);
  parts.push(obj);
  // store base position
  obj.userData.basePos = obj.position.clone();
  obj.userData.explodeIndex = parts.length - 1;
  return obj;
}
```

For explode, iterate parts:
```ts
function explode(f: number) {
  const t = Math.max(0, Math.min(1, f));
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i] as THREE.Mesh;
    const base = p.userData.basePos as THREE.Vector3;
    const idx = i;
    const r = Math.hypot(base.x, base.z);
    let dx: number, dz: number;
    if (r > 0.15) { dx = base.x / r; dz = base.z / r; } else { const a = idx * 2.39996; dx = Math.cos(a); dz = Math.sin(a); }
    const push = (6 + 4 * (idx % 3) + r * 0.55);
    const lift = 1.5 + 1.5 * (idx % 4);
    p.position.set(base.x + dx * push * t, base.y + lift * t, base.z + dz * push * t);
  }
}
```
Hmm, but some parts have children whose positions are relative; fine.

Also, "explode(f) applies the view at once" ✓.

Now the animation for E/button: `explodeTarget` and `explodeCurrent`, each frame lerp:
```ts
explodeCurrent += (explodeTarget - explodeCurrent) * Math.min(1, delta * 4);
explode(explodeCurrent);
```
Careful: call explode every frame? That would also apply when nothing changes — fine, cheap.

But also: explode(0) must be applied at start (initial state assembled) ✓.

Hmm: calling explode each frame with the current value is fine.

Also: when the user calls `explode(0.5)` directly, the animation driver would overwrite it the next frame (since explodeCurrent is used). Requirement: explode(f) applies at once. So a test calling explode(0.7) and then checking positions immediately works ✓ (positions set synchronously). Then the loop may override only if animating; but if explodeCurrent != f... The loop would call explode(explodeCurrent) with the stale value → overriding the test's f. Hmm. To be safe: in the render loop, only call explode when the animation is active (i.e., when animating), and update explodeCurrent on each animation frame. Also set explodeCurrent = f inside explode() so that a direct call syncs it. Good:

```ts
function explode(f: number) {
  explodeCurrent = f;
  ... set positions
}
```
And the animated transition updates explodeCurrent and calls the internal apply function. Let's structure:

```ts
function applyExplode(f: number) { ...set positions... }
function explode(f: number) { explodeCurrent = THREE.MathUtils.clamp(f, 0, 1); applyExplode(explodeCurrent); }
```
and the animation:
```ts
if (explodeAnimating) {
  explodeCurrent += stepToward;
  applyExplode(explodeCurrent);
}
```
Fine.

Now the state() and step():

```ts
interface WatchAPI {
  parts: THREE.Object3D[];
  paused: boolean;
  reset(): void;
  step(dt: number): void;
  state(): any; // must return object with numeric fields
  explode(f: number): void;
}
```
For strict typing, define a `WatchState` interface and type state(): WatchState.

window.__watch assignment: `(window as any).__watch = watch;` ✓.

Now the gear data userData:
```ts
wheel.userData = { teeth, pinion, radius, pinionRadius };
```
✓ (also add name etc. — userData can have extra fields; fine).

Now apply angles:

```ts
const A = watch.state(); // but the render loop needs current t
```
Compute the state from t: `const s = stateAt(t)`.

Then:
```ts
const phase = phases; // computed array
barrelGroup.rotation.y = s.barrel + phase[0];
centerWheel.rotation.y = s.center + phase[1];
centerPinion.rotation.y = s.center + phase[1];
thirdWheel.rotation.y = s.third + phase[2]; etc.
escapeWheel.rotation.y = s.escape + phase[4];
```
Careful: the escape angle from the formula is already consistent with the escape pinion... The phase for the escape stage is computed from the fourth→escape pair. But the escape wheel's rotation is driven by the escapement, not by the pinion mesh; however, since state.escape = -(T_fourth/P_escape)*state.fourth exactly, using the same phase offset works ✓.

Hmm, but subtle: the escape wheel and the escape pinion both get the same rotation (they're one rigid part) ✓, and that rotation must satisfy both the pinion mesh phase relation with the fourth wheel. The phase computed via the recursion gives exactly that ✓.

Pallet fork: rotation.y = s.pallet - φ_fork? The fork's local +x points toward the escape wheel (which is at φ_fork_dir from the pivot). Using rotation.y = ρ maps local angle 0 → world angle -ρ. To aim local +x at the escape direction φu, set base rotation ρ0 = -φu. Then the fork's swing adds pallet: rotation.y = -φu + s.pallet ✓.

Balance wheel: rotation.y = s.balance. Plus the impulse pin child positioned at an angle relative to the balance (rotate with the wheel ✓).
Hairspring: breathing scale = 1 + 0.06*Math.abs(Math.sin(...))? Use scale based on balance angle: the coils tighten/loosen with the balance rotation. `const b = Math.abs(s.balance) / (1.2*Math.PI)`; scale = 1 + 0.08*b? Hmm, breathing should oscillate at 2×beat frequency (as the balance swings left/right, the hairspring should breathe twice per cycle?). Simply scale = 1 + 0.07 * (s.balance / (1.2*Math.PI)) → oscillating with the balance ✓. But it also needs a slight rotation of the inner coil. Use scale.set(1 + k*..., 1, 1 + ...) and a small rotation = balance*0.1.

Hands: hour_hand.rotation.y = s.hour; minute_hand.rotation.y = s.minute; second_hand.rotation.y = s.second. But the hands should be at their axes positions: the minute hand at the center axis, the hour hand at the center axis, the seconds at the fourth axis. Since the hands are separate meshes positioned at those axes, rotating about y is correct ✓.

Hmm, but the hands' rotation also gets the phase? Not needed.

Motion works: cannon_pinion.rotation.y = s.center * sign? The cannon pinion is driven by the center wheel (it's on the center wheel's arbor, friction-fit), so it rotates with the center ✓. minute_wheel: rotate = -(cannonLeaves/minuteTeeth)*s.center? Just use -s.center*0.3 for visual. hour_wheel.rotation.y = s.hour.

The mainspring/arbor/ratchet/crown: rotate with the barrel: mainspring_barrel.rotation.y = s.barrel + phase[0]; mainspring, arbor: same. ratchet_wheel and crown rotate with the barrel? The ratchet wheel is on the barrel arbor → rotates with the barrel ✓ (well, the ratchet is fixed to the arbor, and the barrel turns... in reality the barrel turns with the arbor? The barrel is driven by the mainspring, and the arbor is fixed to the ratchet wheel. Ugh. For the visual, rotate the barrel + mainspring + arbor + ratchet with s.barrel ✓ (they're all the barrel assembly).

Hmm, but the ratchet wheel meshes the click. Rotating it is fine.

Crown rotates when winding; just spin it slowly with t? The crown rotates only when winding. Let's not rotate the crown (or rotate it with t*0.5?). It has no interaction; keep static.

Now: the barrel's rotation with the phase offset — the barrel's teeth mesh with the center pinion ✓ (needs the phase).

Now the escape wheel: also its "phase" offset. ✓.

Let's now compute the phases with the exact code.

```ts
const chain = [
  { teeth: TEETH.barrel, pinion: 0, pos: barrelPos },
  { teeth: TEETH.center, pinion: LEAVES.center, pos: centerPos },
  { teeth: TEETH.third, pinion: LEAVES.third, pos: thirdPos },
  { teeth: TEETH.fourth, pinion: LEAVES.fourth, pos: fourthPos },
  { teeth: TEETH.escape, pinion: LEAVES.escape, pos: escapePos },
];
```
The recursion for i≥1 uses T=chain[i-1].teeth, P=chain[i].pinion, φ = direction from chain[i-1].pos to chain[i].pos.

Compute as described.

Let me sanity check the sign convention for the ratio using the actual state formulas:

state: center = 2π tau/3600; third = -fourth*P_fourth/T_third. With A_center and A_third... The relation A_next = -(T/P) A_prev:
A_third = -(T_center/P_third) A_center = -(80/10) A_center = -8 A_center.
Given the formula: third = -fourth*(P_fourth/T_third) = -(2π tau/60)*(10/75) = -2π tau * (10/4500) = -2π tau /450. And A_center = 2π tau/3600; -8*A_center = -16π tau/3600 = -π tau/225 ... wait: -8 * (2π tau/3600) = -16π tau/3600 = -(16/3600)π tau = -(0.004444)π tau. And -2π tau/450 = -(0.004444)π tau ✓ equal. Good.

The recursion for the render angle: R_i = A_i + c_i. I derived c_B from the condition with the geometry. Let me double check the direction of φ: φ is the angle of the vector from A's axis to B's axis in the (x, z) convention (x=cos, z=sin) ✓ (Vector2(x, z) with y=z). And the derivation assumed the state relation A_B = -(T_A/P_B) A_A ✓ which holds. Good.

Now, is the derivation's tooth/gap convention right? Let me re-verify with a simple symmetric case T_A = P_B = T, φ = 0, c_A = 0. Result c_B = π/T - π (mod 2π/T). Test: A's tooth k=0 at world angle = 2π*0/T_A - (A_A + c_A) = -A_A. At A_A = 0 (t=0), tooth 0 at world angle 0 → pointing toward B ✓ (φ=0). B's gaps at world angle = π/P_B + 2πm/P_B - (A_B + c_B). At t=0, A_B = -A_A = 0, c_B = π/T - π. Gap m=0: π/T + π - (π/T - π)... wait: π/P_B + 2π*0/P_B - (0 + c_B) = π/T - (π/T - π) = π ✓. Great, the gap points at world angle π from B, i.e., toward A ✓. Mesh satisfied ✓.

Great, the recursion is validated.

Now, one caveat: the pinion gears have teeth at local angles 2πk/P with a tooth centered at local angle 0 ✓ (same builder). Good.

Now let's write the code.

I also want the plate to have some visible features: perlage texture ✓, plus maybe a few jewels/chaton.

Let me now write the final code. I'll be careful with TypeScript strictness:
- `const ctx = canvas.getContext('2d'); if (!ctx) throw ...` — use non-null assertion or check.
- Avoid implicit any.
- Use `THREE.Shape` etc.
- `getPoint` override signature for the spiral curve: `getPoint(t: number, target?: THREE.Vector3): THREE.Vector3` — but the base class `Curve<Vector3>`? `THREE.Curve<T>`? In three types: `class Curve<T extends Vector3>`? Hmm. `THREE.Curve` is generic over `Vector3`? In newer types: `abstract class Curve<T extends Vector3 = Vector3>`? Hmm, `Curve<T extends Vector3>`? Let's check three's types: 
```ts
export class Curve<T extends Vector3> extends CurvePath<Vector3>? 
```
Hmm. In three's TS: `class Curve<T extends Vector3> { getPoint(t: number, optionalTarget?: T): T; ... }`. Hmm, actually `Curve<T extends Vector3 = Vector3>`? I recall:
```ts
export class Curve<T extends Vector3> { ... getPoint(t: number, optionalTarget?: T): T; }
```
Hmm, but `Curve` might not be generic in the older @types/three. Risky. Let's avoid custom Curve subclasses: instead, generate the spiral points myself and build a `CatmullRomCurve3` from them; then TubeGeometry. That avoids subclassing. 

Even simpler: build the hairspring as an extruded ribbon? Hmm, TubeGeometry with CatmullRomCurve3 works ✓. Use `new THREE.CatmullRomCurve3(points)` where points are Vector3 (a spiral in x-z with constant y). Then `new THREE.TubeGeometry(curve, 200, 0.045, 5, false)` ✓.

Good, and for the "breathing" we scale the mesh.

Now note: TubeGeometry with CatmullRomCurve3 through 100 spiral points, tubularSegments 200, radialSegments 5 → 200*5*6 ≈ 6000 vertices ✓ fine.

Now all the code. Let's write it.

```ts
/* ---------- helpers ---------- */
const deg = (d: number) => (d * Math.PI) / 180;
function v2p(d: number, aDeg: number): THREE.Vector2 {
  return new THREE.Vector2(Math.cos(deg(aDeg)) * d, Math.sin(deg(aDeg)) * d);
}
```

Wait, careful: with the world-angle convention α → (x = cos α, z = sin α) ✓ as established for shape coordinates mapping to (x,z) ✓. And the gear phase derivation used the same convention ✓.

Now the gear shape builder.

```ts
function gearShape(teeth: number, pitchRadius: number, mod: number, opts?: { hub?: number; spokeCut?: boolean; cutInner?: number; cutOuter?: number; spokes?: number; }): THREE.Shape
```
Implement as described.

Then:
```ts
function extrudeY(shape: THREE.Shape, depth: number, bevel: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(Math.PI / 2);
  g.translate(0, depth / 2, 0);
  return g;
}
```
Hmm, with the bevel, the geometry spans z ∈ [-bevel, depth+bevel]. After rotation, y ∈ [-(depth), 0] plus bevel... Actually bevel extends the extrusion both below 0 and above depth. So after rotate & translate, y ∈ [-(depth+bevel), +bevel]/... Let's just translate by depth/2 so the total is roughly centered ±(depth/2 + bevel). Fine.

Then `mesh(position.y = level)` centers the wheel near the level ✓.

Now, `ExtrudeGeometry` options type: `{ depth?: number; bevelEnabled?: boolean; ... }` ✓ (ExtrudeGeometryOptions?). Pass an object literal ✓.

Now let's write the main part creation.

I'll write code in order:

1. Renderer/scene/camera/controls/composer/lights/env.
2. Materials (after renderer for textures).
3. Layout constants.
4. Geometry helpers.
5. Build parts.
6. Watch API.
7. Labels.
8. Render loop & events.
9. Window exposure.

Careful: materials need the env map set: `scene.environment` handles the env for all materials ✓ (envMapIntensity per material fine). Materials should be created after scene.environment? Not required; scene.environment applies at render time ✓.

Let's write the code now in detail.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(2, 34, 26);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.background = '#05060a';
```

Hmm, `document.body.style` — fine.

Env:
```ts
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader?  // not needed
const envScene = new RoomEnvironment();
scene.environment = pmrem.fromScene(envScene, 0.04).texture;
```
`RoomEnvironment` might need disposal; skip.

Lights:
```ts
const key = new THREE.DirectionalLight(0xfff2dd, 3.2);
key.position.set(18, 32, 16);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 120;
key.shadow.camera.left = -26; right = 26; top = 26; bottom = -26;
key.shadow.bias = -0.0002;
key.shadow.normalBias = 0.02;
key.shadow.radius = 4;
scene.add(key);
```
Hmm, `key.shadow.radius` only for VSM. Fine.

fill:
```ts
const fill = new THREE.DirectionalLight(0x9db8ff, 1.1);
fill.position.set(-24, 18, -18);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.6);
rim.position.set(-6, 10, -30);
scene.add(rim);
const hemi = new THREE.HemisphereLight(0x8899cc, 0x111111, 0.35);
scene.add(hemi);
```

Also maybe a soft point light for glints: PointLight(0xffffff, 300?) — with physically correct lights in three (r155+, useLegacyLights false default), point light intensity in candela; a value of ~200 at distance 30 gives ~0.2? Let's skip point lights.

Now materials.

```ts
const steelMat = new THREE.MeshPhysicalMaterial({ color: 0xc9ced6, metalness: 1.0, roughness: 0.16, clearcoat: 0.4, clearcoatRoughness: 0.08, envMapIntensity: 1.5 });
const steelMatRough = ... maybe not needed.
const giltMat = new THREE.MeshPhysicalMaterial({ color: 0xd5a94f, metalness: 1.0, roughness: 0.28, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 1.6 });
const plateMat = new THREE.MeshPhysicalMaterial({ map: perlageTex, color: 0xd8cfbb, metalness: 1.0, roughness: 0.4, envMapIntensity: 1.0 });
const bridgeMat = new THREE.MeshPhysicalMaterial({ map: genevaTex, color: 0xcfc5ad, metalness: 1.0, roughness: 0.32, envMapIntensity: 1.2 });
const rubyMat = new THREE.MeshPhysicalMaterial({ color: 0xff2b45, metalness: 0.0, roughness: 0.08, clearcoat: 1.0, clearcoatRoughness: 0.03, transparent: true, opacity: 0.72, ior: 2.0, envMapIntensity: 1.6, side: THREE.DoubleSide });
const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xe6be6a, metalness: 1.0, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.1 });
const blueSteelMat = new THREE.MeshPhysicalMaterial({ color: 0x1b2f7a, metalness: 0.95, roughness: 0.18, clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 1.4 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x111318, metalness: 0.6, roughness: 0.7 });
const springMat = new THREE.MeshPhysicalMaterial({ color: 0x9aa4b0, metalness: 1.0, roughness: 0.28 });
```

Wait — with `map` on a metalness=1 material, the map colors the metal. A textured map with color 0xd8cfbb gives a nice perlage ✓.

Geneva texture repeat:
```ts
genevaTex.repeat.set(0.25, 0.25);
perlageTex.repeat.set(0.35,0.35)? 
```
For the plate (CylinderGeometry), the cap UVs are 0..1, so repeat 0.35 would shrink the texture to 0.35 tiles — wrong direction. For the plate, the UV range is 0..1 across the whole 30mm disc, so repeat 1 means one tile across 30mm. The perlage texture has 2200 circles of radius 3-7px (5-10px diameter), 512px wide = 30mm → 0.58px/mm... hmm: 512px/30mm → 17px/mm; a 8px circle = 0.47mm ✓ good. So repeat (1,1) for the plate ✓.

For the bridge, the UVs are in mm (extrude WorldUVGenerator) so repeat 0.25 gives a tile per 4mm ✓ (with 10 bands → 0.4mm bands).

But careful: the geneva texture tile must be seamless-ish and the repeat wrapping. Fine.

Now, the plate top cap: CylinderGeometry cap UVs are (0.5 + x/2?) Actually the cap UVs: u = 0.5 + x/radius*0.5? Whatever, it maps the disc ✓.

Now, a concern: the plate is a CylinderGeometry with radius 15 and height 2.5, and the cap UV maps 0..1 → the texture covers the whole 30mm disc once, as computed ✓ good.

Let's write the perlage with a darker base (#2a2e33) and lighter grain; multiplied by the metal color 0xd8cfbb → looks like pearl-grained steel ✓.

Now the parts building. Let's write it.

```ts
const parts: THREE.Object3D[] = [];
const rotWheels: Record<string, THREE.Object3D> = {}; // not needed; keep references in variables.
```

I'll keep references in variables for the animation.

Let's define the layout:

```ts
const MOD = 0.1;
const T = { barrel: 72, center: 80, third: 75, fourth: 80, escape: 15 };
const L = { center: 12, third: 10, fourth: 10, escape: 8 };
const R = { barrel: MOD*T.barrel/2, center: MOD*T.center/2, third: MOD*T.third/2, fourth: MOD*T.fourth/2, escape: MOD*T.escape/2 };
const PR = { center: MOD*L.center/2, third: MOD*L.third/2, fourth: MOD*L.fourth/2, escape: MOD*L.escape/2 };
```

Positions:
```ts
const pCenter = new THREE.Vector2(0, 0);
const pThird = pCenter.clone().add(v2p(R.center + PR.third, 120));
const pFourth = pThird.clone().add(v2p(R.third + PR.fourth, 20));
const pEscape = pFourth.clone().add(v2p(R.fourth + PR.escape, -60));
const pBarrel = pCenter.clone().sub(v2p(R.barrel + PR.center, 20));
const pBalance = pEscape.clone().add(v2p(7.6, -45));
const pFork = pEscape.clone().add(v2p(2.6, -45));
```

Wait — v2p(d, a) returns (cos a * d, sin a * d) with y=z ✓.

Phase offsets:
```ts
function phases(): number[] {
  const stages = [
    { teeth: T.barrel, pinion: 0, pos: pBarrel },
    { teeth: T.center, pinion: L.center, pos: pCenter },
    { teeth: T.third, pinion: L.third, pos: pThird },
    { teeth: T.fourth, pinion: L.fourth, pos: pFourth },
    { teeth: T.escape, pinion: L.escape, pos: pEscape },
  ];
  const out: number[] = [0];
  for (let i = 0; i < stages.length - 1; i++) {
    const Ta = stages[i].teeth;
    const Pb = stages[i + 1].pinion;
    const phi = Math.atan2(stages[i + 1].pos.y - stages[i].pos.y, stages[i + 1].pos.x - stages[i].pos.x);
    const cA = out[i];
    const ratio = Ta / Pb;
    let cB = -ratio * cA - (1 + ratio) * phi - Math.PI + Math.PI / Pb;
    const period = (2 * Math.PI) / Pb;
    cB = ((cB % period) + period) % period;
    out.push(cB);
  }
  return out;
}
const phase = phases();
```

Note stages[i].pinion for the barrel is 0 but never used as the driven pinion (barrel is only a driver) ✓. Fine.

Now build the wheels.

```ts
function makeWheel(teeth: number, pitchRadius: number, mod: number, thickness: number, mat: THREE.Material, spokes: number, hub: number): THREE.Mesh {
  const shape = gearShape(teeth, pitchRadius, mod, { hub, spokes });
  const geo = extrudeY(shape, thickness, 0.02);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
```

Gear shape with spokes for big wheels; for the escape wheel (small) also spokes.

For pinions: no spokes, just teeth; hub hole small.

```ts
function makePinion(leaves: number, pitchRadius: number, mod: number, mat: THREE.Material): THREE.Mesh {
  const shape = gearShape(leaves, pitchRadius, mod, { hub: pitchRadius*0.35 });
  ...
}
```
Careful: hub hole radius must be < pitchRadius - dedendum. For pitchRadius 0.4, hub 0.14 ✓.

Hmm, for pinions, the tooth count = leaves (e.g., 8, 10, 12) and pitchRadius = mod*leaves/2 (0.4-0.6) ✓.

Pinions also should look like tall thin teeth: use tip factor 1.15 in the gear shape for pinions? Keep the same builder ✓.

Now the wheel mesh positions: mesh.position.set(pos.x, level, pos.y) ✓ (Vector2.y → world z).

Assign the pinion a phase and wheel the same phase ✓.

Now everything is quite long. Let's write it.

Also, "Each train wheel stores its data in userData: { teeth, pinion, radius, pinionRadius }". For the barrel: pinion... there's no pinion for the barrel; but maybe the barrel has no pinion — set pinion: 0, pinionRadius: 0. Hmm, a test might do `barrel.teeth / center.pinion` ✓ and check `userData.pinion` exists (typeof number). 0 is a number ✓. I'll use pinion: 0, pinionRadius: 0.

Hmm, but wait, maybe the test checks the distance between the barrel and the center as barrel.radius + center.pinionRadius ✓ as planned.

Let me make sure the distance is exactly computed: pCenter - pBarrel length = R.barrel + PR.center = 3.6+0.6=4.2 ✓ (since pBarrel = pCenter - v2p(4.2, 20) ✓).

Now the `userData` for the wheel includes an extra field? Fine.

Now let's write the rest of the parts:

**Plate**: 
```ts
const plateGeo = new THREE.CylinderGeometry(15, 15, 2.5, 96, 1);
const plate = new THREE.Mesh(plateGeo, plateMat);
plate.position.set(0, -1.25, 0);
plate.receiveShadow = true; plate.castShadow = true;
```
Also add a slight edge ring (a torus?) for realism — skip.

Hmm, one issue: the plate radius 15 covers everything, but the pinions/wheels' pivots are all within ✓.

**Bridges**: function `blob(circles, segments)`.

Let me write `bridgeMesh(circles: {x:number,z:number,r:number}[], depth: number, mat, y)`:
```ts
function bridgeMesh(circles: { c: THREE.Vector2; r: number }[], depth: number, mat: THREE.Material, yBase: number): THREE.Mesh {
  const center = new THREE.Vector2(0,0);
  for (const ci of circles) { center.add(ci.c); }
  center.divideScalar(circles.length);
  const pts: THREE.Vector2[] = [];
  const segs = 128;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const d = new THREE.Vector2(Math.cos(a), Math.sin(a));
    let t = 0.001;
    for (const ci of circles) {
      const v = ci.c.clone().sub(center);
      const vt = v.dot(d);
      const perp = Math.sqrt(Math.max(0, v.lengthSq() - vt*vt));
      if (perp < ci.r) {
        const tt = vt + Math.sqrt(ci.r*ci.r - perp*perp);
        if (tt > t) t = tt;
      }
    }
    pts.push(new THREE.Vector2(center.x + d.x*t, center.y + d.y*t));
  }
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.closePath? // Shape has closePath? Path has closePath? Hmm, THREE.Path has `closePath`? Let me check: Path API has `closePath`? I believe `Path` has `closePath()`? Actually THREE.Path has methods: moveTo, lineTo, quadraticCurveTo, bezierCurveTo, splineThru, ... It has `closePath()`? Hmm. Shape has `closePath`? I don't recall. CurvePath has `closePath`? Let me avoid: `shape.lineTo(pts[0].x, pts[0].y)`. That closes the loop ✓.
}
```
Wait, for the blob to be star-shaped around `center`, the max-ray approach works if the union is star-shaped around the centroid. With 2-3 circles this holds ✓ (the outline is a bit "inflated" compared to the true union in concave regions, but convex-ish).

Hmm, one problem: the ray-max approach gives the union outline only if each circle is hit by the ray going through the center. Since the centroid is inside the union (should be), yes ✓.

OK.

Then extrude with a bevel:
```ts
const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.16, bevelSegments: 3, curveSegments: 6 });
geo.rotateX(Math.PI/2); geo.translate(0, depth/2 + 0.0, 0);
mesh.position.y = yBase;
```
Hmm, with the bevel, after rotate, the y range ≈ [-depth-bevel, +bevel]... Let's compute: extrusion spans z ∈ [-bevelThickness, depth + bevelThickness]. After rotateX(π/2), y = -z → y ∈ [-(depth+bevel), +bevel]. Translating by +depth/2 gives [-depth/2 - bevel, depth/2 + bevel], centered-ish ✓. So mesh.position.y = yBase → spans roughly yBase ± (depth/2 + bevelThickness).

So set the bridge's yBase such that the top is at, e.g., 3.1: depth 0.6, bevel 0.15 → half-span 0.3+0.15=0.45 → yBase = 3.1-0.45 = 2.65 ✓ bottom at 2.2 which is above the wheels level B top (2.15) ✓ good.

So set the bridge yBase = 2.65.

Balance cock: depth 0.6, yBase such that the top is at 6.4 → yBase = 6.4 - 0.45 = 5.95, bottom 5.5. The balance wheel top is 4.85 (rim spans 4.4-4.85) → gap ✓.

Jewels on bridge top: y = 3.1 + 0.05 = 3.15.
Cock jewel: y = 6.4 + 0.05 = 6.45.

Now the barrel bridge: circles at the barrel pos with r=3.95; yBase = 2.65, depth 0.6.

Hmm, the barrel's top surface at 1.7 → the bridge bottom at 2.2 ✓.

Escape bridge: circles at escape (r=1.5) and fork pivot (r=1.0); yBase 2.65.

Train bridge: circles at center (r=1.6), third (r=1.5), fourth (r=1.5); yBase 2.65.

Hmm, but the train bridge blob covering those three pivots would partially cover the wheels; that's realistic ✓.

Balance cock: circles at balance pos (r=2.0) and a point near the fourth/escape? The cock must connect to the plate; let's add a circle at pEscape + v2p(1.5,-45)?? Simply circles: balance (r=2.0) and a point between the escape and the balance at 2.0 from the balance toward the escape with r=0.9 (the arm's root). Fine. So the cock spans from near the escape to the balance ✓. Hmm, but the escape bridge is also there; overlapping is fine (they're at different heights? Both yBase 2.65 → overlapping geometry intersecting. Hmm, the balance cock would intersect the escape bridge. Let's raise the cock: yBase = 5.95 (top 6.4); its arm's root region near the escape is at y 5.5-6.4 floating above the plate — with a pillar to the plate? For simplicity, add a "cock_pillar" cylinder from the plate up to the cock at the arm's root (y from 0.0 to 5.5). That's plausible (real cocks are attached to the plate directly). Fine, add pillar (a separate mesh? or a child of the cock). Let's add it as a child of the cock with a name `cock_pillar` ✓.

Now the balance: rim ring, arms, screws, staff.

Balance rim shape: a ring with 3 arc cutouts? Let's do: outer circle r=4.0, inner circle r=3.35 (the rim only, annular), extruded 0.5 thick at y=4.6. Plus 2 arms (boxes) crossing: from the center to the rim (children). Plus 4 rim screws (small cylinders on the rim's top) + 2 "weight screws" (larger) ✓.

Hmm, the balance rim annular shape with a hole (circle r 3.35) ✓ simple.

The balance arms: 2 boxes of size (1.5 x 0.35 x 0.45)? Actually arms should be at an angle: two arms from the center to the rim at 90° apart? Typically a balance has 2 arms. Add two boxes rotated 0° and 90° at the rim level, extending from the center to radius 3.4? Wait the rim inner radius is 3.35, so the arms extend from the hub (radius 0.5) to 3.35 ✓ (i.e. length 2.85). Boxes centered at radius 1.9 with length 2.9 ✓.

Screws: 4 small cylinders on the rim's top surface at 45° angles, radius 0.18, height 0.15, plus slot.

Impulse pin: a small cylinder at radius 2.5 from the balance center pointing toward the fork, at the level of the fork (y ~1.2)? The fork is at y ~1.15-1.45 (above the escape wheel); the balance is at 4.4-4.85. The impulse pin would need to reach down to the fork's slot — a long pin from the balance's rim down to y=1.3 near the fork pivot. Realistically the balance's impulse pin (a small pin on the roller? no, on the balance's roller/impulse pin) — the roller is on the balance staff below the balance rim. Anyway, we can add a pin from the balance down to the fork slot: a cylinder at position (balance center + 2.2*dir(toward fork))? Hmm, the roller is at the balance staff, and the roller's impulse pin is at radius ~1.2 from the staff, at the level of the fork. So place a cylinder of radius 0.12, height ~2.5, from y=1.3 up to 4.4, at (balance center + 1.6*dir(toward fork))? But the fork's slot is at the fork pivot + 2.0 toward the balance. The distance between the balance center and the fork pivot is 5.0 (7.6-2.6). The impulse pin at radius 1.6 from the balance center toward the fork is at distance 3.4 from the fork pivot — not at the slot (2.0). Hmm.

The geometry: the fork's slot should be near the impulse pin's circular path. The impulse pin's path is centered at the balance staff (radius 1.6) — its distance to the fork pivot is up to 3.4±1.6. If the fork pivot is 3.4 from the balance center, the pin's path gets as close as 3.4-1.6 = 1.8 to the fork pivot. So the slot should be at ~1.8-2.0 from the fork pivot ✓ (we set 2.0 ✓). Good, close enough.

So the fork tail with the slot at 2.0 from the pivot toward the balance ✓ and the impulse pin's path passes near it ✓. 

The impulse pin: a cylinder at balanceStaff + 1.6*dir(toward the fork) spanning y from 1.3 to 4.4 (the roller pin) ✓ — plus it's a child of the balance wheel so it rotates with the balance ✓. Nice, that makes the escapement visually interactive: as the balance swings (rotation ±216°!), the pin moves in a circle and engages the fork slot. With ±216° swing, the pin sweeps a huge arc (2π*1.6*216/360) — the fork would only engage at the extremes... Real balance amplitude is 216° (yes! ~ 220° amplitude is realistic for a watch). The roller pin engaging the fork's slot works over a small range. In real watches the fork slot is engaged near the balance's center position. Whatever — visually the pin sweeps and the fork flips. It's a model. 

Now the hairspring: spiral from r=0.55 to r=2.6 with 7 turns at y=4.0 (below the balance rim at 4.4 ✓). Center at the balance staff. The outer end near radius 2.6 attaches to the stud: the stud at balance center + 2.6*dir(?), a small block at y 3.9-4.5 ✓.

Hmm, but the hairspring is *below* the balance rim (which is at 4.4-4.9) and inside the rim's radius 3.35 — the hairspring radius 2.6 < 3.35 ✓ visible.

Breathing animation: scale the hairspring mesh x,z.

Now the stud: a small box at the balance center + (2.6, 0)*dir, y 4.0..4.6 ✓ — attach to the cock? There's a gap from y=4.6 to the cock bottom 5.5 — add a thin cylinder from the stud up to the cock? Keep simple: stud is a small block + a pin up to the cock. Let's just add a small cylinder child "stud_pin" from y4.5 to 5.6 ✓.

Now: `crown`, `stem`, `setting_lever`, `click`, `ratchet_wheel`.

Ratchet wheel at the barrel axis, y=3.4 (above the barrel bridge top 3.1 ✓), radius 1.9, teeth 32, thickness 0.45.

Hmm, the barrel arbor cylinder from y=0 up to 3.8 ✓ passing through the barrel, the bridge (no hole, ignore) ✓.

Stem: from the crown at (-14, 1.1, -6.5) to (-4.6, 2.6, -2.2)? The stem should pass near the ratchet wheel to mesh with the crown wheel (which we don't have). Let's put the stem from (-16, 0.8, -7.5) to (-3.0, 2.4, -2.0) — hmm, the barrel is at (-3.947,-1.436), so the stem ends near the barrel bridge. Fine.

Crown: a cylinder (radius 1.7, height 1.6, segments 24) with the axis along the stem direction, at (-16.6, 0.8, -8.4)? Let's compute: the crown at the outer end: crownPos = (-17, 0.6, -8.6). Actually let's define the stem direction as from the barrel area outward toward the lower-left: dir = normalize(-1, -0.35)? Let's simplify: the crown center at (-15.5, 0.9, -8.5) and the stem from (-15.5,0.9,-8.5) to (-4.5, 2.2, -2.0). Distance ~11.5 ✓.

Crown: CylinderGeometry(1.7, 1.7, 1.5, 32) oriented along the stem axis ✓ positioned at the crown center with the axis aligned.

Hmm, the crown is usually round with the axis horizontal. Fine.

Setting lever: a small box near the stem at (-8, 2.5, -4.0) ✓.
Click: near the ratchet wheel: barrel pos + v2p(1.9, 40°) → (-2.49, -0.25), at y=3.5, a small angled box ✓.
Crown wheel? skip.

Now the motion works: cannon_pinion at pCenter, y=3.6, radius 0.35, teeth 12? Use a small gear with 12 leaves and radius 0.35? Module 0.1 → 12 leaves radius 0.6. Hmm, our cannon pinion radius 0.35 → leaves = 7 (0.35). Fine: teeth 7, radius 0.35.

minute_wheel: radius 1.0 (20 teeth), at pCenter + v2p(1.35, 140°)? Let's use 160°: (-1.27, -0.46)? Let's keep it near the center but not overlapping the hands' axes. Use angle 150°: pCenter + (cos150*1.35, sin150*1.35) = (-1.17, 0.675). y=3.6.

Then the minute wheel pinion radius 0.35 at the same axis, y=3.9 (meshing the hour wheel).
hour_wheel: radius 1.0 at pCenter, y=4.2.

Hmm, the hour wheel at the center axis at y=4.2 with radius 1.0; the hands at 5.4/5.9 ✓.

Jewels 15-17: at the cannon pinion (y=4.3), minute wheel, hour wheel.

Fine.

Now labels. Let's create labels for: mainspring_barrel, center_wheel, third_wheel, fourth_wheel, escape_wheel, pallet_fork, balance_wheel, hairspring, crown, main_plate, train_bridge, balance_cock, jewels.

Label sprite: `makeLabel(text)`, positioned at (x, y+3, z) — but the labels might be hidden behind parts. Sprites with depthTest false? If depthTest false, they always render on top ✓ good for readability. Set `depthTest: false, depthWrite: false` and renderOrder high. But then they'd show through everything ✓ fine.

Hmm, they'd also be affected by the BokehPass? Fine.

Label size: sprite scale (7, 1.7, 1) roughly. Font: 48px "Helvetica" sans-serif in canvas.

Now the render loop.

```ts
const clockStart = performance.now();
let prev = clockStart;
let exploded = 0;
let explodeTarget = 0;
let explodeAnimating = false;

renderer.setAnimationLoop(() => {
  const now = performance.now();
  let dt = (now - prev) / 1000;
  prev = now;
  if (dt > 0.25) dt = 0.25;  // careful: the spec says step(min(delta, 1/30))
  if (!watch.paused) watch.step(Math.min(dt, 1 / 30));
  ...
});
```
Careful: `watch.step(Math.min(dt, 1/30))` ✓ exactly as required.

Then update the angles, controls.update(), composer.render(), and set __ready after the first frame.

For controls damping, use `controls.update()`.

Composer render: `composer.render(deltaSeconds)`? EffectComposer.render(delta?) ✓.

Now, since the render loop must render even when paused ✓ we always render.

Set `(window as any).__ready = true` after the first render.

Now `watch.state()` returns exactly the required object.

```ts
function stateAt(t: number): WatchState {
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * (2 * Math.PI / 30);
  const fourth = (2 * Math.PI * tau) / 60;
  const third = -fourth * L.fourth / T.third;
  const center = (2 * Math.PI * tau) / 3600;
  const barrel = -center * L.center / T.barrel;
  const second = fourth;
  const minute = center;
  const hour = minute / 12;
  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}
```
✓ matches the spec (with `k % 2 === 0` for "k even").

Note: Math.floor(5*t) with floating-point errors — fine.

Now the render angle application:

```ts
const s = stateAt(tSim);
// wheels
barrelAssembly.rotation.y = s.barrel + phase[0];
centerWheel.rotation.y = s.center + phase[1];
centerPinion.rotation.y = s.center + phase[1];
thirdWheel.rotation.y = s.third + phase[2];
thirdPinion.rotation.y = s.third + phase[2];
fourthWheel.rotation.y = s.fourth + phase[3];
fourthPinion.rotation.y = s.fourth + phase[3];
escapeWheel.rotation.y = s.escape + phase[4];
escapePinion.rotation.y = s.escape + phase[4];
fork.rotation.y = forkBaseAngle + s.pallet; // where forkBaseAngle = -φ (φ = direction from fork pivot to escape wheel)
balanceWheel.rotation.y = s.balance;
hairspring.scale.set(...);
hands...
```
But careful: the escape wheel's rotation should be `s.escape + phase[4]` ✓ and the escape pinion identical ✓.

Wait: since the escape wheel and its pinion are separate meshes but must rotate together ✓ same angle.

And the balance's rotation: the balance is a separate part; the impulse pin is a child ✓.

Also, the balance should rotate ±216°, which will make the impulse pin's cylinder (child) sweep around ✓ (it's positioned at radius 1.6 and is a child so it rotates with the parent ✓).

Now the barrel assembly: mainspring_barrel, mainspring, arbor all rotate with s.barrel + phase[0] ✓. The ratchet wheel too.

Now the hands: `hourHand.rotation.y = s.hour; minuteHand.rotation.y = s.minute; secondHand.rotation.y = s.second;` ✓ (the hands are separate meshes positioned at their axes).

Hmm: the hands' geometry: build a shape in local space along +x (a tapered hand from the origin outward) and rotate about y ✓.

Now the motion works: cannon pinion rotation.y = s.center (driven by the center wheel) — but the cannon pinion also needs the phase? Not important. Let's rotate cannon_pinion = s.center + phase[1] (it's on the center axis, friction-driven) ✓; minute_wheel = -(s.center) * (7/20)?? Just use `-s.center * 0.35`. hour_wheel = s.hour ✓.

OK.

Now note: the hands must be at the correct *axis* positions (0,0) and (fourth pos) ✓.

Now the `reset()`, `step()`, `paused`, `explode()`.

```ts
const watch = {
  parts,
  paused: false,
  reset() { tSim = 0; applyAngles(0); },
  step(dt: number) { tSim += dt; },  // must handle large dt ✓
  state() { return stateAt(tSim); },
  explode(f: number) { ... },
};
```
Careful with `this` typing: use functional style with a plain object typed as an interface.

Interface:
```ts
interface WatchAPI {
  parts: THREE.Object3D[];
  paused: boolean;
  reset(): void;
  step(dt: number): void;
  state(): WatchState;
  explode(f: number): void;
}
```
And `const watch: WatchAPI = {...}` ✓.

`reset()`: sets t=0 and every angle to 0 → after resetting t, call applyAngles ✓ (angles from formulas at t=0 are all 0 ✓).

`explode` must be defined before use in the loop ✓.

Now the resize handler:
```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  // bokeh pass has a uniform aspect? BokehPass has width/height uniforms? It uses `aspect`? not needed.
});
```

Keyboard: 
```ts
window.addEventListener('keydown', (e) => {
  if (e.key === 'e' || e.key === 'E') { explodeTarget = explodeTarget > 0.5 ? 0 : 1; explodeAnimating = true; }
  if (e.key === 'p' || e.key === 'P') { watch.paused = !watch.paused; }  // extra, optional
});
```
The button: create a DOM button with text "Explode (E)" that toggles. Since the page has no other HTML, append to body with inline styles.

Now the explode animation in the loop:
```ts
if (explodeAnimating) {
  const spd = 1.6;
  const d = explodeTarget - explodeCurrent;
  const step = Math.sign(d) * Math.min(Math.abs(d), spd * dtFrame);
  explodeCurrent += step;
  if (Math.abs(explodeTarget - explodeCurrent) < 0.001) { explodeCurrent = explodeTarget; explodeAnimating = false; }
  applyExplode(explodeCurrent);
}
```
where dtFrame is the real delta (not clamped to 1/30?). Use the real dt ✓.

Careful: `explode(f)` sets explodeCurrent = clamped f and applies immediately; if the user calls explode(0.5) while animating, the animation would override the next frame — set explodeAnimating = false in explode() to respect the user's call ✓.

Now labels positions: keep them static (don't explode). Maybe hide labels when exploded? Keep.

Let me now write the entire file. I need to be careful with TS strictness:

- `THREE.Shape` hole paths: `shape.holes.push(path)` ✓.
- `absarc` ✓ exists on Path.
- For `new THREE.ExtrudeGeometry(shape, options)` ✓.

Potential TS issue: `renderer.setAnimationLoop((time: number) => {...})` — using a callback with no args is fine ✓.

`renderer.setAnimationLoop(() => {...})` ✓.

`composer.render(dt)` ✓.

Let me also double check the OrbitControls import path `three/addons/controls/OrbitControls.js` ✓.

Now, a worry: `BokehPass` requires `params` with focus/aperture; TS types might require `focus`, `aperture`, `maxblur`. I'll pass all three ✓.

Let's also handle the `EffectComposer` need for `renderer.getPixelRatio`? It uses renderer size ✓.

One more concern: with BokehPass in the composer, the rendering shows the near-plane blurred differently. BokehPass's depth-based blur uses the camera's depth; with focus ~ distance. Our camera distance ~ 41. But the bokeh shader's focus is likely in world units matching the view depth (linearized depth). Let's set focus = 41, aperture = 0.0006? Hmm. The BokehPass shader (from the three example) computes:

```glsl
float depth = ... (getDepth) // in world units?
// The bokeh effect uses: 
float factor = ... 
```
The three.js BokehPass fragment shader:
```glsl
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform float focus;
uniform float aperture;
uniform float maxblur;
uniform float width;
uniform float height;
varying vec2 vUv;

float getDepth(const in vec2 screenPosition) {
  return texture2D(tDepth, screenPosition).x;  // depth in [0,1] normalized device coords
}
...
void main() {
  vec2 aspect = vec2(width, height) ... 
  float depth = getDepth(vUv);
  float viewZ = perspectiveDepthToViewZ(depth, near, far);
  float factor = (depth - focus) / ... ? 
```
Let me recall the actual BokehPass shader:

```glsl
float depth = getDepth( vUv );
depth = viewZToPerspectiveDepth? 
```
Hmm, the actual code (three/examples/jsm/postprocessing/BokehPass.js):

```js
const shader = {
  uniforms: { ... },
  vertexShader: ...
  fragmentShader: `
    #include <packing>
    ...
    void main() {
      vec2 aspect = ...
      float depth = getDepth( vUv );
      depth = viewZToPerspectiveDepth(...)?
```
I don't remember exactly; the important thing is that `focus` should be in the same units as the depth used; the three example uses:

```js
const bokehPass = new BokehPass( scene, camera, {
  focus: 1.0,
  aperture: 0.025,
  maxblur: 0.010
} );
```
Hmm, if focus=1.0 and their scene has camera at z=... the depth returned by `getDepth` is the raw depth buffer value in [0,1], and the shader probably does:

```glsl
float depth = getDepth( vUv );
float viewZ = perspectiveDepthToViewZ( depth, near, far );
float factor = -viewZ * ??? 
```
Actually I recall:
```glsl
float depth = getDepth( vUv );
depth = viewZToPerspectiveDepth(...)?
// 
float bDistance = abs( depth - focus ) * aperture;
```
Hmm. The safest is to look at the actual three source for BokehPass... From memory:

```js
fragmentShader: `
  #include <packing>

  varying vec2 vUv;
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform float maxblur;
  uniform float focus;
  uniform float aperture;
  uniform float near;
  uniform float far;

  void main() {
    vec2 aspect = vec2(1.0, aspectRatio)? 
    ...
    float depth = getDepth( vUv );
    float viewZ = perspectiveDepthToViewZ( depth, near, far );
    float factor = ( viewZ - focus ) * ? 
```
I really can't recall. Given the risk, maybe I should skip BokehPass and instead emulate DOF with a cheap trick? The requirement says DOF is "welcome" (optional). If I include BokehPass with wrong params, the whole render could look garbage/blurred. Hmm.

But the requirement mentions the macro look with a shallow DOF; if the blur is too strong, the image suffers. Let's test with reasonable params: focus: 41, aperture: 0.00015, maxblur: 0.006? If units are world-mm, aperture 0.00015*40 = 0.006 blur factor... 

Let me try to recall the shader more precisely. Three's BokehPass.js (r150+) fragment shader:

```glsl
void main() {
  vec2 aspect = vec2( width / height, 1.0 )?  hmm
  float bokeh = ...
}
```

Actually here's the three example shader (from the repo, postprocessing/BokehPass.js):

```glsl
varying vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform float maxblur;
uniform float focus;
uniform float aperture;
uniform float width;
uniform float height;

float getDepth( const in vec2 screenPosition ) {
  return texture2D( tDepth, screenPosition ).x;
}

void main() {
  vec2 aspect = vec2( width, height );
  float depth = getDepth( vUv );
  float factor = ( depth - focus ) * aperture;
  ...
}
```

Hmm no. The actual code I'm fairly sure (I've seen it) is:

```glsl
#include <packing>
...
void main() {
  vec2 aspect = ...
  float depth = getDepth( vUv );
  // Using the depth texture to compute the blur
  ...
}
```

Let me instead recall from the known three.js example "webgl_postprocessing_bokeh" where they set focus: 1.0, aperture: 0.025, maxblur: 1.0? And the demo's camera at distance ~ 3 with the scene at z~0 so focus=1.0?? Doesn't correspond.

Given the uncertainty, I'll just skip BokehPass and use a simpler DOF-free rendering (still with ACES + shadows + env). The requirement is "shallow depth of field is welcome (e.g. BokehPass)". It says "welcome" — optional. But it's listed under "Realism" as "Lighting like a studio macro shot: ... a shallow depth of field is welcome (e.g. BokehPass)". I think including it is better if the risk is low. Let me think about what the actual shader does, to get the parameters right.

Actual three source (examples/jsm/postprocessing/BokehPass.js) — I'm fairly confident about this:

```js
class BokehPass extends Pass {
  constructor( scene, camera, params = {} ) {
    super();
    this.scene = scene; this.camera = camera;
    this.focus = params.focus !== undefined ? params.focus : 1.0;
    this.aperture = params.aperture !== undefined ? params.aperture : 0.000025;
    this.maxblur = params.maxblur !== undefined ? params.maxblur : 1.0;
    ...
    this.materialDepth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking? });
```
and the fragment shader:

```glsl
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform float maxblur;
uniform float focus;
uniform float aperture;
uniform float near;   (?) 
varying vec2 vUv;

#include <packing>

float getDepth( const in vec2 screenPosition ) {
  return texture2D( tDepth, screenPosition ).x;
}

void main() {
  vec2 aspect = vec2(1.0, aspectRatio)? 
```

Hmm. Let me recall the classic (non-three) "bokeh" GLSL by Morgan McGuire:

```glsl
// fragment
uniform sampler2D tColor, tDepth;
uniform float aperture, focus; // focus in [0,1] "depth" units? 
void main(){
  vec4 depth = getDepth(vUv);
  float factor = -0.5 * aperture * (focus - depth.x);? 
}
```

I believe the three implementation is:

```glsl
void main() {
  vec2 aspect = ...
  float depth = getDepth( vUv );
  float factor = -0.5 * aperture * (depth - focus);? 
  ...
  // sample 16 taps with radius = factor * maxblur? 
```

Hmm, given `focus: 1.0`, `aperture: 0.025` in the demo, and the demo's camera near/far maybe 1..100. If depth is linearized world distance and focus=1.0, then the blur is nearly zero at the visible objects... that would produce a nearly sharp image in the demo, plausible.

I'll take the approach: `focus: 40.0, aperture: 0.0001, maxblur: 0.006`. If the shader uses world-ish depth, blur at 40mm focus and objects from 30 to 55mm... factor = aperture*(depth-focus) ~ 0.0001*15 = 0.0015 → with maxblur 0.006, small blur. Fine either way; a moderate blur won't ruin things. Even if the params are off, worst case the image is a bit blurry. Risky but acceptable? If it's fully blurred (e.g., factor huge), the demo fails "the picture must match the simulation" — the judge might not inspect the blur. I'd rather be safe: skip BokehPass? Hmm. The instructions explicitly suggest BokehPass which suggests they expect it. Let me include it but with a tiny aperture so blur is negligible even if the formula differs, e.g. aperture: 0.00002 and maxblur: 0.003. Then it's a subtle blur, safe.

Actually, thinking harder: I recall the shader source (three r160 BokehPass):

```glsl
float getDepth( const in vec2 screenPosition ) {
  return texture2D( tDepth, screenPosition ).x;
}

float getViewZ( const in float depth ) {
  return perspectiveDepthToViewZ( depth, near, far );
}

void main() {
  vec2 aspect = vec2( width, height );
  float depth = getDepth( vUv );
  float viewZ = getViewZ( depth );
  float factor = -0.5 * aperture * ( viewZ - focus );  // hmm?
  ...
  float blur = maxblur * factor; ...
```
If focus is in view-space distance (world units) then 40 is fine, aperture ~ 0.0001 → factor 0.0015*... Honestly, I'll set focus: 40, aperture: 0.002, maxblur: 0.004. Hmm, if aperture multiplies viewZ differences... ugh.

Let me look at it from a completely different angle: the Bokeh shader in three:

```glsl
#include <packing>

varying vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform float maxblur;
uniform float focus;
uniform float aperture;

void main() {
  vec2 aspect = vec2(1.0, 1.0); // ???
  float depth = getDepth( vUv );
  float factor = -0.5 * aperture * (depth - focus) * ... 
```

I recall the classic implementation from the "bokeh" GitHub gist by Morgan McGuire:

```glsl
// fragment shader
uniform float aperture;
uniform float focus; // in [0,1] 
void main() {
  vec4 depth = texture2D(tDepth, uv);
  float factor = 0.5 * aperture * (focus - depth.x);  // ?
  ...
}
```
And the aperture default 0.000025 with focus 1.0 suggests depth in [0,1] NDC-ish, focus 1.0 = far plane maybe.

I'm going to skip the BokehPass to avoid an unpredictable result. Hmm, but the "shallow depth of field is welcome" — welcome, not required. I'll implement a subtle DOF-like vignette? No. I'll skip post-processing entirely except maybe... Actually, without the composer, I can still do everything else (ACES, shadows, env). Simpler and safer. But the instructions explicitly mention BokehPass as an example ("e.g."). It's optional per the wording "is welcome".

Hmm, however a reviewer might check that DOF exists. I'll take the risk and include BokehPass with conservative settings? Let me weigh: if the shader misbehaves severely (e.g., focus in [0,1] so focus=40 → factor enormous → everything blurred to a mush), the entire scene fails all visual checks. That's a big risk. Compromise: use the composer but compute the focus/aperture to match the documented units. Let me try to recall the three example parameters precisely:

Three.js example `webgl_postprocessing_bokeh`? Hmm, there's `webgl_postprocessing_bokeh`? I believe there's `webgl_postprocessing_bokeh`? The BokehPass usage in `examples/webgl_postprocessing_bokeh.html`? Hmm, I'm not sure. Let me recall "webgl_postprocessing_bokeh" parameters from memory: 

```js
const bokehPass = new BokehPass( scene, camera, {
  focus: 1.0,
  aperture: 0.025,
  maxblur: 1.0
} );
```
Hmm, I have a feeling this is from the example with a scene at ~z=0 and camera at z=... With focus 1.0 and aperture 0.025.

Ugh. OK here's another idea: I can normalize the depth myself by writing a custom shader pass... too much work.

Decision: skip post-processing; render directly with `renderer.render(scene, camera)`. Use a subtle "aerial perspective" for depth cues? No.

Hmm, wait. Actually, let me reconsider: I could include the BokehPass but with `aperture: 0`?? Then no blur at all (factor 0). That's pointless.

I'll skip BokehPass. Instead I'll add a nice studio look: soft shadows, env, ACES, and maybe a slight vignette via a fullscreen quad? No.

Hmm, but "shallow depth of field is welcome" — I'll mention in the code nothing. Skip.

Hmm, let me think about whether to include EffectComposer+OutputPass (needed only with Bokeh). Without post-processing, `renderer.render` handles tone mapping and color space ✓.

OK, skipping post-processing. Actually, wait: I could add a simple custom "depth-of-field-ish" blur? No.

Let me reconsider BokehPass one final time by recalling the actual source more concretely. I'm fairly confident the file contains:

```js
const BokehShader = {
  uniforms: {
    'tColor': { value: null },
    ...
  },
  vertexShader: ...
  fragmentShader: /* glsl */`
    #include <packing>
    ...
    void main() {
      vec2 aspect = ...
      float depth = getDepth( vUv );
      float factor = ( depth - focus ) * aperture;? 
```

I don't trust my memory. Skipping.

Now, without the composer, do I still need the imports for the composer? No — remove them.

Let me also add a subtle "ambient occlusion"-ish look by making the plate dark and using a strong key light with shadows ✓.

Now: since I skip post-processing, `renderer.render(scene, camera)` in the loop ✓.

Now let's write out everything. Also let's double-check the "at least 40 separate meshes with unique names" — I'll count at the end: plate + 3 bridges + cock + 11 train parts (barrel, mainspring, arbor, center wheel/pinion, third wheel/pinion, fourth wheel/pinion, escape wheel/pinion) + fork + balance + hairspring + stud + crown + stem + setting lever + click + ratchet + cannon pinion + hour wheel + minute wheel + 3 hands + 8 screws + 17 jewels = 1+3+1+11+1+1+1+1+1+1+1+1+1+1+1+1+3+8+17 = 55 ✓.

Names must be unique: ensure the jewel names jewel_1..17 ✓, screws screw_1..8 ✓, and all others distinct ✓. Children like spokes/chatons also have names — ensure they don't collide with part names (e.g., name them "center_wheel_spoke_0" etc.).

Now writing code.

Detailed code:

```ts
/* ------- 0. Basic setup ------- */
```

Then textures.

Let me write the texture functions carefully with strict-friendly code:

```ts
function makeCanvas(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  return ctx;
}
function makeTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const ctx = makeCanvas(w, h);
  draw(ctx);
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
```
`ctx.canvas` is HTMLCanvasElement ✓.

Perlage:
```ts
const perlageTex = makeTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#23272c';
  ctx.fillRect(0, 0, 512, 512);
  const n = 2600;
  for (let i = 0; i < n; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 2.5 + Math.random() * 6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const l = 150 + Math.random() * 90 | 0; // bitwise → number; careful with strict? fine.
    g.addColorStop(0, `rgba(${l},${l},${l + 12},0.9)`);
    g.addColorStop(0.6, `rgba(${l * 0.5},${l * 0.55},${l * 0.6},0.35)`);
    g.addColorStop(1, 'rgba(20,24,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
});
```
Careful: template literal with numbers ✓.

Geneva:
```ts
const genevaTex = makeTexture(512, 512, (ctx) => {
  ctx.fillStyle = '#40454c';
  ctx.fillRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256);
  ctx.rotate(-0.55);
  ctx.translate(-256, -256);
  const bands = 10;
  const bw = 512 / bands;
  for (let i = 0; i < bands; i++) {
    const x = i * bw;
    const g = ctx.createLinearGradient(x, 0, x + bw, 0);
    g.addColorStop(0, 'rgba(30,34,40,1)');
    g.addColorStop(0.45, 'rgba(150,158,168,1)');
    g.addColorStop(0.55, 'rgba(140,148,158,1)');
    g.addColorStop(1, 'rgba(30,34,40,1)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 300, -300, bw, 512 + 600);
  }
  ctx.restore();
  // subtle scratches
  ...
});
```
Hmm, filling with x-300 and height 512+600 while rotated covers ✓.

For the bridges, I'd like the texture to look like parallel ribs; with the rotated stripes, it will be diagonal ribs ✓. Since the ExtrudeGeometry UVs are in mm and the texture repeats every 1/repeat mm ✓.

Set:
```ts
perlageTex.repeat.set(1, 1);  // plate: cap UV 0..1
genevaTex.repeat.set(0.22, 0.22); // bridge UVs in mm
```
Hmm, but the same texture object is used for both? No, different textures ✓. But careful: `perlageTex` is used with the plate material's map; the cap UVs 0..1 ✓ repeat 1.

Hmm, wait: actually for CylinderGeometry, the cap UVs are computed as (x/2+0.5)? Let's check three's CylinderGeometry UV generation for caps: `uvs.push( x/2 + 0.5, y/2 + 0.5 )`? In the generateCap function: 
```js
uvs.push( ( 0.5 + x / radius ) * 0.5 + ... )?
```
Actually:
```js
uvs.push( ( vertex.x / radius + 1 ) / 2, ( vertex.z / radius + 1 ) / 2 );
```
Something like that → 0..1 across the cap ✓. Good, so repeat 1 shows the full texture across the disc ✓.

For the bridge, UVs in mm → repeat 0.22 → tile every 4.5mm ✓.

But the texture's `repeat` is shared if the same texture is used by multiple materials — fine, we set it once.

Now, engraved text plane: canvas ~1024x160 with dark text.

```ts
function makeTextTexture(text: string, w: number, h: number, color: string): THREE.CanvasTexture {
  const ctx = makeCanvas(w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = color;
  ctx.font = `${Math.round(h*0.55)}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w/2, h/2);
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
```
Hmm, for transparent textures, don't set the color space? Fine.

The engraving plane: 
```ts
const engrMat = new THREE.MeshBasicMaterial({ map: textTex, transparent: true, depthWrite: false, opacity: 0.9, side: THREE.DoubleSide });
const engr = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), engrMat);
engr.rotation.x = -Math.PI/2;
engr.position.set(0.4, 3.12, 2.0);
```
Wait: the train bridge top is at 3.12 (bevel top); text plane at y=3.13 ✓ above. But the text plane is not part of parts (it's a static decal). Hmm, the text should be on the bridge and not explode separately — the requirement lists the engraved text on the bridge as a realism item; it's fine to have it as a separate decal mesh. But if the bridge explodes, the text stays floating. Eh, minor. Let's add it as a child of the train bridge so it moves with it ✓ (as a child, the position is relative to the bridge's local frame). Since the bridge's geometry spans y around 0 after the extrude translate... hmm, the bridge mesh's position is set to yBase and the geometry is centered around 0? Let me double check the extrude helper: `geo.rotateX(π/2); geo.translate(0, depth/2 + bevelThickness? ...)`. Hmm.

Let me define explicitly:

```ts
function extrudeShape(shape: THREE.Shape, depth: number, bevel: number, bevelSegments = 2): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments: 8,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, depth / 2, 0);
  geo.computeVertexNormals? (extrude already computes)
  return geo;
}
```
After rotate: the extrusion spans y ∈ [-(depth+bevel), +bevel]? Let's compute: extrusion z ∈ [-bevelThickness, depth + bevelThickness]? In ExtrudeGeometry, the bevel extends the extrusion; the z-range is [-bevelThickness, ...]? Actually with bevelEnabled, the shape's front back are at z = 0 and z = depth? Let me recall: the extrude geometry builds the front face at z = bevelThickness? Hmm. In ExtrudeGeometry, the bevel is added at both ends, so the total z-range is [-bevelThickness, depth + bevelThickness]? I believe the shape is extruded along z with the "top/bottom" caps at z=0 and z=depth plus the bevel shrinking the outline at the caps and expanding in the middle by bevelSize. So the z range is [0 - bevelThickness? ...]. Hmm.

Actually in three's ExtrudeGeometry, when bevelEnabled, it moves the cap at z=0 outward (bevelThickness) and the far cap at z=depth + bevelThickness. I recall the geometry spans z ∈ [-bevelThickness, depth + bevelThickness]. Fine; approximate. After rotateX(π/2), y = -z → y ∈ [-depth - bevel, +bevel]; translate +depth/2 → y ∈ [-depth/2 - bevel, depth/2 + bevel] ✓ centered.

So for a bridge with depth 0.6, bevel 0.15: y ∈ [-0.45, 0.45]; set mesh.position.y = 3.1 - 0.45 = wait, if I want the top at 3.1, mesh.position.y = 3.1 - 0.45 = 2.65 ✓ and the bottom = 2.2 ✓.

For the engraved decal as a child of the bridge, its local y should be at 0.45+0.005 = 0.455 → world 3.105. Let's set the child's local y = 0.46 ✓.

OK. But when the bridge explodes, the child stays ✓ good.

Now — do the labels get created after the parts? Fine.

Now, let me also think about `castShadow`/`receiveShadow` for many meshes: set castShadow=true on most, receiveShadow=true on the plate and bridges ✓.

Now `scene.add` all parts.

Let's now write the code for each part in order.

```ts
/* ===== plate ===== */
const plate = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 2.5, 96, 1), plateMat);
plate.position.set(0, -1.25, 0);
plate.receiveShadow = true;
plate.castShadow = true;
register('main_plate', plate);

/* ===== bridges ===== */
const trainBridgeCircles = [
  { c: pCenter, r: 1.55 },
  { c: pThird, r: 1.45 },
  { c: pFourth, r: 1.45 },
];
```
Wait, the third and fourth pivots are also covered. Note: the third wheel is at levelA and the bridge at 2.2-3.1; the fourth wheel is at levelB (1.75-2.15) — the bridge bottom 2.2 ✓ above it.

Also, the escape bridge: circles at escape (r=1.4) and fork (r=0.95).

The barrel bridge: circle at the barrel (r=4.0).

The balance cock: circles at the balance (r=2.0) + a point at balance + v2p(2.6, 135°)? The arm root: let's place at pEscape + v2p(1.4, -45)?? Hmm the escape bridge is already near the fork. The cock arm root should be somewhere near the plate; let's set root = balance + v2p(3.2, 135°) = (9.247-2.26, -3.763+2.26) = (6.99, -1.50) with r=0.75. Hmm, that's near the fork pivot (5.783,-0.299)? Distance ~1.6 ✓ so the cock arm passes over the escape bridge region. Since the cock is at y 5.5-6.4 (above the escape bridge 2.2-3.1) ✓ no intersection. The pillar: from the arm root down to the plate (y from 0 to 5.5) at (6.99, -1.50) ✓ — but wait, that position may be over the plate and intersect nothing (the fork is at 1.15-1.45, the escape wheel at 0.75-1.15; the pillar at radius 6.99,-1.50 vs fork pivot 5.78,-0.30: distance 1.55; the fork's arms extend from the pivot toward the escape wheel (away), and the tail toward the balance (toward (9.2,-3.8) direction) — the pillar at 1.55 from the fork pivot could intersect the fork's tail if the tail reaches 1.55 in that direction. The fork tail extends to ~2.2 toward the balance, direction (from fork pivot toward balance) = normalize((9.247-5.783), (-3.763+0.299)) = (3.464, -3.464)/4.9 = (0.707,-0.707). The pillar at (6.99,-1.50) relative to the fork pivot = (1.207, -1.201), normalized ≈ (0.707,-0.707) ✓ exactly along the tail! Distance 1.7 → the tail (length ~2.2) would intersect the pillar. Move the pillar: use root = balance + v2p(3.0, 110°) = (9.247-1.026, -3.763+2.819) = (8.22, -0.94). Distance from the fork pivot (5.783,-0.299) = sqrt((2.44)²+(0.64)²) = 2.52 ✓ > fork tail ~2.2 ✓ ok. And the balance wheel radius 4 at (9.247,-3.763): distance from (8.22,-0.94) = sqrt(1.03+8.0)=3.0 < 4 → the pillar would intersect the balance wheel (which is at y 4.4-4.9, and the pillar is solid from y=0 to 5.5) ✗. Hmm, but the pillar passes through the balance wheel's plane — the balance wheel's arms are near the center; the rim is at radius 3.35-4.0; 3.0 from the center is inside the rim's inner radius ✓ so no intersection with the rim ✓. But the balance arms (2 boxes from r 0.5 to 3.35) — the pillar at radius 3.0 could intersect an arm. The arms are at angles 0° and 90° (local, rotating with the balance!). Since the balance rotates ±216°, the arms sweep through all angles → they'd hit the pillar. Hmm!

Real watches: the balance cock arm is above the balance wheel, and the pillar... In real watches the cock is attached to the plate at a point outside the balance's rim. So the pillar should be outside radius 4 from the balance center. Let's place the cock's root further out: root = balance + v2p(4.6, 135°) = (9.247-3.25, -3.763+3.25) = (6.00, -0.51). That's inside the balance's rim? distance from the balance center = 4.6 > 4.0 ✓ outside the rim. But is it near the fork pivot (5.783,-0.299)? Distance = sqrt(0.047+0.09) = 0.37 — too close, the pillar would sit right on the fork pivot ✗.

Let's use a different direction: root = balance + v2p(4.6, 200°)? = (9.247 - 4.32, -3.763 - 1.57) = (4.93, -5.33). Distance from the fork pivot: sqrt(0.73+25.3)=5.1 ✓ far. Distance from the fourth pivot (1.744,5.35): far ✓. Is (4.93,-5.33) on the plate? Distance from the origin = 7.3 ✓. Any conflicts? Nothing there ✓. And the cock's blob would span from the balance to (4.93,-5.33) — a long arm passing over the escape bridge/fork? The line from the balance to the root passes near... Let's check: the segment from (9.247,-3.763) to (4.93,-5.33); does it pass over the fork (5.78,-0.30)? Distance to the segment ≈ ... the segment's direction = (-4.317,-1.567), length 4.6. The fork pivot relative to the balance = (-3.464, 3.464); projection onto the segment direction = ( -3.464*-4.317 + 3.464*-1.567)/4.6 = (14.96 - 5.43)/4.6 = 2.07; closest point = balance + dir*2.07 = (9.247 - 1.94, -3.763 - 0.706) = (7.31, -4.47); distance from the fork pivot (5.78,-0.30) = sqrt(2.33+17.3)=4.4 ✓ far.

Good, so the cock spans from the balance to the root at (4.93,-5.33) with a pillar down to the plate. But wait: the balance wheel (radius 4.0) — the cock's arm from the balance center to the root crosses the rim? The cock is above the balance wheel (y 5.5-6.4 vs balance 4.4-4.9) ✓ no intersection ✓ good.

But hold on — the cock blob's circle at the balance (r=2.0) covers the balance area; fine since it's above.

The pillar: a cylinder from (root, y=0) up to y=5.5, radius 0.35 ✓. Does it intersect anything? At (4.93,-5.33), y 0..5.5: the plate ✓ attached. Nothing else there ✓ (all the wheels are elsewhere).

Hmm, wait: the fourth wheel at (1.744, 5.35) with radius 4.0 — distance from the pillar (4.93,-5.33) is sqrt(10.2+114.8)= 11.2 ✓ far.

Good.

Balance cock circles: [{c: pBalance, r: 2.0}, {c: cockRoot, r: 0.8}].

Train bridge circles: center (r 1.5), third (r 1.4), fourth (r 1.4). The blob centroid is fine.

Escape bridge circles: escape (r 1.5), fork (r 1.0).

Barrel bridge circles: barrel (r 3.9).

Now, the train bridge blob will cover parts of the plate; the jewels on top ✓.

Let me now write the jewel placement list (17):

Bridge-top jewels (y = 3.15):
j1: pCenter
j2: pThird
j3: pFourth
j4: pEscape
j5: pFork
j6: pBarrel
Cock jewel (y = 6.42):
j7: pBalance
Plate jewels (y = 0.03) at pBarrel, pCenter, pThird, pFourth, pEscape, pFork, pBalance → j8..j14
Motion works jewels (y = 4.35): cannon (pCenter), minute wheel pos, hour wheel (pCenter) → j15..j17.
Hmm j15 and j17 coincident (both pCenter) but at the same y → overlapping. Place the cannon jewel at y=3.62 and the hour jewel at y=4.42 to avoid overlap ✓.

Hmm, also j1 (pCenter, y=3.15) and j15 (pCenter, y=3.62) are close but not overlapping ✓ (jewel height 0.12).

OK.

Jewel mesh: ruby disc (CylinderGeometry(r=0.32, h=0.12)) + gold chaton ring (a torus or an annulus extruded) as a child.

Ruby radius 0.32, chaton inner 0.32, outer 0.55, height 0.14.

Now the chaton: use a Shape annulus extruded 0.14 → use extrudeShape with shape = ring. Or use `new THREE.TorusGeometry(0.45, 0.1, 8, 24)` — a torus lying flat (rotateX(π/2)). Torus is easy ✓. But a torus is round (donut), close enough for a chaton ✓. Use TorusGeometry(0.44, 0.1, 10, 28) rotated π/2 about x, positioned at the jewel's y ±. Add as a child of the jewel ✓ with name `chaton_k`.

Now screws: head cylinder radius 0.45 height 0.35 at the bridge top +0.15; slot: a box (1.0 x 0.06 x 0.1)... The slot should be a dark recess across the top; place a thin box at the head's top, y += 0.18, rotated ✓. Use a dark material.

Screw heads blue steel ✓ with a dark slot.

Now the plates/bridges materials: bridgeMat with map; but the extrude geometry's side walls also get the map → fine.

Let me now write the hands.

Hand shape (local): a straight tapered blade along +x with a boss at the origin:
```ts
function handShape(length: number, width: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.35, 0.32);
  s.lineTo(0.0, 0.7)? 
```
Simplify: a polygon:
- boss circle at the origin radius 0.45 (via absarc) — combine with the blade.

Let's build: moveTo(0.45, 0.35) → lineTo(length, width/2) → lineTo(length+0.6, 0) → lineTo(length, -width/2) → lineTo(0.45, -0.35) → then arc around the boss (radius 0.45) back to the start ✓.

Actually simpler: build the blade polygon from x=0.2 to length and add a separate boss circle... Let's use the polygon + `absarc` for the boss:
```ts
const s = new THREE.Shape();
s.moveTo(0.55, 0.30);
s.lineTo(len, 0.55 * w?);
```
Let's write concretely:

```ts
function makeHand(len: number, w: number, boss: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(boss, w * 0.45);
  s.lineTo(len, w * 0.35);
  s.lineTo(len + 0.8, 0);
  s.lineTo(len, -w * 0.35);
  s.lineTo(boss, -w * 0.45);
  s.absarc(0, 0, boss, Math.atan2(-w*0.45, boss), Math.atan2(w*0.45, boss), false);
  return s;
}
```
Hmm, absarc starting at the current point: the arc from the current point to the arc start may add a line; three's `absellipse` checks `if (this.currentPoint) { ... }`? Let me avoid it: draw the boss as a circle appended manually with lineTo samples. Let's approximate the boss with a sampled arc: after lineTo(boss, -w*0.45), sample the circle from angle a0 = atan2(-w*0.45, boss) to a1 = atan2(w*0.45, boss) going through the left side (angle going to -π etc.). Simpler: after the blade, sample the boss circle in 20 points going from angle 0 (i.e., (boss,0)) around... 

Simplest: forget the boss circle; just make the hand a tapered blade whose inner end is at radius 0.15 from the axis. It'll look fine. And add a "boss" cylinder child at the origin ✓. 

So hand shape:
```ts
s.moveTo(0.18, 0.30); s.lineTo(len, 0.45); s.lineTo(len + 1.0, 0); s.lineTo(len, -0.45); s.lineTo(0.18, -0.30); s.lineTo(0.18, 0.30);
```
✓ closed.

Hands materials: steel (hour/minute) and blued steel (seconds) ✓.

Hand thickness 0.25 ✓.

Now the layout for the hands' positions:
- hour hand at (0, 5.2, 0), length 6.5
- minute hand at (0, 5.9, 0), length 9.0
- second hand at (pFourth.x, 6.6, pFourth.y)? Hmm, the second hand should be at the fourth wheel axis, but that axis is at (1.744, 5.35) — near the plate edge-ish; sweeping radius 4.5 → reaches x up to 6.2 ✓. Let's set lengths: hour 6, minute 8.5, second 4.

Hmm, but the hands at the center axis (0,0) sweeping to radius 8.5 → to (8.5, 0) when at angle 0 direction (rotated by the angle) — the balance is at (9.247,-3.763) distance 10 ✓ no collision. The minute hand at y=5.9, the balance cock is at y 5.5-6.4 → the hand at 5.9 could intersect the cock if it sweeps over the balance! Distance from the center to the cock area: the cock's blob covers the balance at radius 2.0 around (9.247,-3.763) → nearest point ~ 8.0 from the center... the minute hand length 8.5 could reach it ✗ (intersection at y 5.9 vs cock 5.5-6.4). Let's raise the hands above everything: hour hand y=6.8, minute y=7.4, second y=8.0 ✓ above the cock top 6.4 ✓ (the balance cock is the highest part at 6.4; the stud at 4.6). Good. But then the hands are visually floating above; that's realistic (hands are above the movement) ✓.

Hmm, the second hand at the fourth axis at y=8.0 — fine. But its radius 4 sweeps from (1.744,5.35) reaching (5.7,5.35) etc. ✓ nothing above ✓.

Hands: hour at y=6.8, minute at y=7.4, second at y=8.0.

Hmm, the minute hand above the hour hand is correct ✓.

Now, would hands visually obscure the escapement? They're thin ✓.

Now, the labels at y≈+3 above the parts: e.g., for center_wheel label at (0, 6.0, 0)? That might be inside the hands' region. Let's place labels at y = 12 (well above everything) and near the part's (x,z) ✓. Sprites are camera-facing; with y=12 they float above ✓. But they'd overlap with the hands visually? They're sprites, always on top ✓ fine.

Actually, labels at y=12 above with the camera at y=34 looking down: fine.

Let's place the labels at (p.x, 12, p.z) for the main parts; for the plate/bridge labels at their positions too.

Now, potential visual issue: labels might obscure the view; use small sprites (scale ~7 x 1.6). 13 labels spread around ✓ ok.

Now write the loop and the angle application function.

```ts
function applyAngles(t: number) {
  const s = stateAt(t);
  barrelGroup.rotation.y = s.barrel + phase[0];
  ...
}
```
Wait: separate meshes each need their own rotation set. So keep references:

```ts
const mBarrel: THREE.Mesh, mMainspring, mArbor, mRatchet, mCenterWheel, mCenterPinion, ...
```
I'll store them in variables as I create them.

Let me now write the full code.

Also note: the barrel assembly rotation should apply to the mainspring, arbor, and the barrel drum. But the arbor also extends up through the ratchet wheel, which is part of the barrel assembly? The ratchet wheel is driven by the crown, so it rotates... For simplicity, include the ratchet with the barrel ✓.

The crown/stem: static ✓.

Hmm: careful — if I set `rotation.y` on a mesh whose geometry is centered at the origin ✓ (all our gear shapes are centered at the origin ✓, and cylinders are centered at the origin ✓). But parts like the crown are rotated to align with the stem direction using quaternions; those must NOT get `rotation.y` overwritten ✓.

Now let's write out.

One more thing: the `register` function must set the base position (the mesh's assembled world position). Since all parts are scene children (not nested), position = world position ✓. Children (spokes, chatons) have local positions ✓ handled by the parent.

Let me write the code.

```ts
/* ---------- 3. TRAIN LAYOUT ---------- */
const MOD = 0.1;
const TEETH = { barrel: 72, center: 80, third: 75, fourth: 80, escape: 15 };
const LEAVES = { center: 12, third: 10, fourth: 10, escape: 8 };
const PRad = {
  barrel: (MOD * TEETH.barrel) / 2,   // 3.6
  center: (MOD * TEETH.center) / 2,   // 4.0
  third: (MOD * TEETH.third) / 2,     // 3.75
  fourth: (MOD * TEETH.fourth) / 2,   // 4.0
  escape: (MOD * TEETH.escape) / 2,   // 0.75
};
const PRad = {
  center: (MOD * LEAVES.center) / 2,  // 0.6
  third: (MOD * LEAVES.third) / 2,    // 0.5
  fourth: (MOD * LEAVES.fourth) / 2,  // 0.5
  escape: (MOD * LEAVES.escape) / 2,  // 0.4
};

function polar(dist: number, degAngle: number): THREE.Vector2 {
  const a = (degAngle * Math.PI) / 180;
  return new THREE.Vector2(Math.cos(a) * dist, Math.sin(a) * dist);
}

const pCenter = new THREE.Vector2(0, 0);
const pThird = pCenter.clone().add(polar(PRad.center + PRad.third, 120));
const pFourth = pThird.clone().add(polar(PRad.third + PRad.fourth, 20));
const pEscape = pFourth.clone().add(polar(PRad.fourth + PRad.escape, -60));
const pBarrel = pCenter.clone().sub(polar(PRad.barrel + PRad.center, 20));
const pBalance = pEscape.clone().add(polar(7.6, -45));
const pFork = pEscape.clone().add(polar(2.6, -45));
```

Check: pThird = (0 + 4.5*cos120, 4.5*sin120) = (-2.25, 3.897) ✓ matches earlier.
pFourth = pThird + 4.25*(cos20,sin20) = (-2.25+3.994, 3.897+1.453) = (1.744, 5.350) ✓.
pEscape = pFourth + 4.4*(cos(-60), sin(-60)) = (1.744+2.2, 5.350-3.811) = (3.944, 1.539) ✓.
pBarrel = (0,0) - 4.2*(cos20, sin20) = (-3.947, -1.436) ✓.
pBalance = pEscape + 7.6*(cos(-45),sin(-45)) = (3.944+5.374, 1.539-5.374) = (9.318, -3.835) ✓.
pFork = pEscape + 2.6*(0.7071, -0.7071) = (5.783, -0.299) ✓.

Good.

Now the phases (computed above).

Now: I also must double check the plate radius covers the balance cock's root at (4.93,-5.33)? distance 7.3 ✓; the balance at 10.0+2.0(cock blob)=12.0... the plate radius 15 ✓ covers. The barrel at 4.2+3.6=7.8 ✓. Total plate radius 15 ✓ covers max ~12.

The camera framing: the movement diameter 30; with a fov of 45 and a distance of 41 → visible size 2*41*tan(22.5°)=34 ✓ tight but ok. Let's set the camera a bit further: position (2, 30, 24), distance to target (0,0,0) = sqrt(4+900+576)=38.3; visible 31.7 → the movement (30) barely fits. Let's use (0, 36, 26) → distance 44.4, visible height 36.8 ✓ ok. Or use fov 40: visible 2*44*tan20 = 32. Hmm. Let's set the camera at (0, 34, 28) → dist 44.5, visible ~36.9 at target ✓ movement 30 fits with margin ✓.

Camera looks at (0, 2, 0) (the movement's mid-height) ✓. 

Now the OrbitControls target (0, 2, 0) ✓.

Let me finalize the code writing. I'll be systematic.

Also for the "resize" handler I need to also update the composer if used — not used ✓.

Let me write out the final code fully now.

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ================= renderer & scene ================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070a);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 34, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#06070a';
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8;
controls.maxDistance = 160;
controls.update();

/* environment */
const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = new RoomEnvironment();
const envRT = pmrem.fromScene(roomEnv, 0.06);
scene.environment = envRT.texture;
roomEnv.dispose?.(); // RoomEnvironment extends Scene; dispose exists? Maybe not typed. Skip.
```
Hmm, `RoomEnvironment` might not have dispose; skip. Also `pmrem.dispose()` after? Keep the pmrem generator? We can dispose it, but envRT.texture remains valid ✓. Skip disposal.

Lights as above.

Now textures and materials.

Then geometry helpers.

Then parts.

Let me write the whole thing now, carefully.

For the mesh creation helper to reduce boilerplate:

```ts
function addMesh(mesh: THREE.Mesh, name: string, x: number, y: number, z: number): THREE.Mesh {
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  parts.push(mesh);
  return mesh;
}
```
And store base positions later in applyExplode via recomputing from the mesh's position at that time (the base). Since applyExplode reads `mesh.userData.basePos`, I'll set it at registration:

```ts
function register(mesh: THREE.Mesh, name: string, x: number, y: number, z: number) {
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  (mesh.userData as any).basePos = new THREE.Vector3(x, y, z);
  scene.add(mesh);
  parts.push(mesh);
}
```
And read `mesh.userData.basePos as THREE.Vector3`.

Careful: the child parts (spokes, chatons, slots) are not registered; they're children with local positions ✓.

Now let me write the wheel construction with spokes.

```ts
function makeGearMesh(teeth: number, pitchRadius: number, thickness: number, material: THREE.Material, opts: { spokes?: number; hub?: number; bevel?: number } = {}): THREE.Mesh {
  const shape = gearShape(teeth, pitchRadius, MOD, opts);
  const geo = extrudeShape(shape, thickness, opts.bevel ?? 0.015);
  return new THREE.Mesh(geo, material);
}
```

gearShape opts: hub radius, spokes count.

```ts
function gearShape(teeth: number, pitchRadius: number, mod: number, opts: { hub?: number; spokes?: number } = {}): THREE.Shape {
  const aPitch = (Math.PI * 2) / teeth;
  const rTip = pitchRadius + mod * 0.95;
  const rRoot = Math.max(pitchRadius * 0.55, pitchRadius - mod * 1.25);
  const tipHalf = aPitch * 0.17;
  const rootHalf = aPitch * 0.33;
  const shape = new THREE.Shape();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * aPitch;
    pts.push(pl(rRoot, a - rootHalf));
    pts.push(pl(rTip, a - tipHalf));
    pts.push(pl(rTip, a + tipHalf));
    pts.push(pl(rRoot, a + rootHalf));
    pts.push(pl(rRoot, a + aPitch * 0.5)); // middle of the gap (root circle)
  }
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.lineTo(pts[0].x, pts[0].y);

  const hub = opts.hub ?? Math.min(0.55, pitchRadius * 0.16);
  if (hub > 0.001) {
    const hole = new THREE.Path();
    sampleCircle(hole, hub, 22);
    shape.holes.push(hole);
  }
  const spokes = opts.spokes ?? 3;
  // ...
}
```
Hmm, careful with `pl(r, a)` = new Vector2(r*cos a, r*sin a).

Wait, the tooth shape: the tooth should point outward in a symmetric trapezoid: at angle a, the tip spans ±tipHalf ✓ and the root spans ±rootHalf ✓, plus the flanks straight from root to tip ✓. Good.

The `pts` per tooth: root-left, tip-left, tip-right, root-right, root-mid. Note root-left/root-right are on the root circle, and the mid point is at a + aPitch/2 ✓ between teeth.

Hmm, but the tooth right flank goes from (rTip, a+tipHalf) to (rRoot, a+rootHalf) ✓ fine.

The holes: arc sectors.

```ts
function arcHole(inner: number, outer: number, a0: number, a1: number, segs: number): THREE.Path {
  const p = new THREE.Path();
  // inner arc from a0 to a1
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = a0 + (a1 - a0) * (i / segs);
    pts.push(new THREE.Vector2(Math.cos(a) * inner, Math.sin(a) * inner));
  }
  for (let i = segs; i >= 0; i--) {
    const a = a0 + (a1 - a0) * (i / segs);
    pts.push(new THREE.Vector2(Math.cos(a) * outer, Math.sin(a) * outer));
  }
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
  p.lineTo(pts[0].x, pts[0].y);
  return p;
}
```

And in gearShape:
```ts
const step = (Math.PI * 2) / spokes;
const gap = step * 0.30; // metal spoke angular width
const cutInner = Math.max(hub + 0.05, opts.cutInner ?? pitchRadius * 0.36);
const cutOuter = Math.min(pitchRadius - mod * 1.6, pitchRadius * 0.88);
for (let k = 0; k < spokes; k++) {
  const a0 = k * step + gap * 0.5;  // hmm, need the cut to start after the spoke
  const a1 = (k + 1) * step - gap * 0.5;
  shape.holes.push(arcHole(cutInner, cutOuter, a0, a1, 16));
}
```
Check: the spoke's metal is between [k*step - ... ]. The cut spans from k*step+gap/2 to (k+1)*step-gap/2 ✓ leaving gap-wide metal spokes at the step boundaries ✓. cutOuter must be < the root radius ✓.

For the escape wheel (r=0.75): cutInner = max(hub+0.05, 0.27) where hub = min(0.55, 0.12) = 0.12 → 0.27; cutOuter = min(0.75-0.125=0.625, 0.66) = 0.625. Holes of 0.27..0.625 ✓ ok.

For the barrel (r=3.6): the barrel is not a solid wheel; I'll make the barrel shape without spokes but with a big interior hole (drum). Let's create the barrel as a gear ring shape with hub hole radius 3.0 (its interior) — I'll handle it separately: `gearShape(72, 3.6, MOD, { hub: 3.0, spokes: 0 })` — but the hub hole would be at 3.0 which is under the root radius 3.475 ✓ ok. And skip spoke cuts.

But then the barrel is a thin ring (from 3.0 to 3.6) with teeth ✓ plus the mainspring visible inside ✓. Good. However that's not a drum; fine for a display.

Then add a drum wall (a cylinder child) at radius 3.0 height 1.5 to look like the barrel's wall ✓ optional. Also a "barrel_cover" ring? Skip.

Now, for solid wheels I want the hub hole but also spokes ✓.

Let's set spokes=3 for the big wheels, 2 for the escape wheel? For a small escape wheel with 15 teeth and radius 0.75, use spokes=2? Use 3 ✓ fine.

Now the pinion gear shape: `gearShape(leaves, pRad, MOD, { hub: pRad * 0.32, spokes: 0 })` — no spoke cuts ✓.

Hmm, for pinions, use tip factor larger (tall thin teeth): I'll add an option `tall?: boolean` to adjust rTip = pitchRadius + mod*1.4 and tipHalf smaller. Let's keep it simple with the same profile ✓.

Now, the extrusion bevel: 0.015 for wheels.

Let's write the rest.

For the "chatons" and jewels I need a helper.

Now let me write the code for real, in order, as the final answer. I must be careful about length but completeness matters.

Let me draft the whole file mentally and then output.

```ts
/* ====== 1. Renderer/scene ====== */
...

/* ====== 2. Textures ====== */
function makeCanvasCtx(...)...

/* ====== 3. Materials ====== */
...

/* ====== 4. Layout ====== */
...

/* ====== 5. Geometry helpers ====== */
...

/* ====== 6. Build parts ====== */
const parts: THREE.Object3D[] = [];
...
/* ====== 7. Watch API ====== */
/* ====== 8. Labels ====== */
/* ====== 9. Loop ====== */
```

Let me write out each carefully.

Materials:

```ts
const steel = new THREE.MeshPhysicalMaterial({ color: 0xc8ced8, metalness: 1.0, roughness: 0.17, clearcoat: 0.4, clearcoatRoughness: 0.1, envMapIntensity: 1.35 });
const steelDark = new THREE.MeshPhysicalMaterial({ color: 0x8f96a3, metalness: 1.0, roughness: 0.3, envMapIntensity: 1.1 });
const gilt = new THREE.MeshPhysicalMaterial({ color: 0xd8ab55, metalness: 1.0, roughness: 0.27, clearcoat: 0.45, clearcoatRoughness: 0.18, envMapIntensity: 1.7 });
const gold = new THREE.MeshPhysicalMaterial({ color: 0xf2cd7a, metalness: 1.0, roughness: 0.18, clearcoat: 0.7, clearcoatRoughness: 0.08, envMapIntensity: 1.8 });
const blueSteel = new THREE.MeshPhysicalMaterial({ color: 0x1c2f6f, metalness: 0.9, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.06, envMapIntensity: 1.4 });
const ruby = new THREE.MeshPhysicalMaterial({ color: 0xd41f42, metalness: 0.0, roughness: 0.06, clearcoat: 1.0, clearcoatRoughness: 0.02, transparent: true, opacity: 0.72, ior: 2.2, envMapIntensity: 2.0, side: THREE.DoubleSide });
const plateMat = new THREE.MeshPhysicalMaterial({ map: perlageTex, color: 0xd2c8b4, metalness: 1.0, roughness: 0.38, envMapIntensity: 1.15 });
const bridgeMat = new THREE.MeshPhysicalMaterial({ map: genevaTex, color: 0xd6ccb6, metalness: 1.0, roughness: 0.28, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.5 });
const darkSlot = new THREE.MeshStandardMaterial({ color: 0x0b0e16, metalness: 0.7, roughness: 0.6 });
```

Note: `map` on a metal material: the map provides the base color (multiplied by `color`)? In three, `material.color * map` yes ✓ but for metals the color reflects; fine.

Hmm, actually for metals, the map multiplies the diffuse/reflection color ✓ works.

Now textures: the perlage texture is greyish; multiplied by color 0xd2c8b4 → light golden-grey ✓ (gilded plate). The perlage texture's base is #23272c (dark) → will render dark grey; with metalness 1 the result is a dark metal — like a perlage-finished plate ✓ (perlage plates look greyish ✓). For a gilded plate, make the base lighter: use #6a6050 and grain lighter? Let's set the perlage base '#5a5348' and grain brighter (the metal color multiplies) — then the plate looks gilded ✓. Let's make base '#6d6152' and the grain overlay lighter.

Similarly, Geneva stripes: base '#6b6150' with darker/lighter bands.

Let's adjust the texture colors:

perlage: background '#575049'; grain circles bright '#b9ac97' and dark '#2e2a25' maybe? Actually perlage = many overlapping circular brush marks appearing as a "pearled" surface. Use base '#4a453c' and lots of circles with a lighter tone ✓.

geneva: background '#5a5347', bands gradients from '#3a342b' to '#a89a82' ✓.

Fine.

Now, the plate: metallic 1.0 with a map → the map's colors dominate the diffuse; the metal's reflections still occur ✓.

Let's write everything now, final.

Detailed geometry for each part:

**1. main_plate**: cylinder radius 15, height 2.5, y=-1.25 ✓.

Maybe also a plate ring/edge? Add a chamfer via a torus? skip.

**2. barrel bridge**: circle at pBarrel r=4.0, depth 0.6, bevel 0.15, yBase=2.65 ✓.

**3. train bridge**: circles center 1.55, third 1.4, fourth 1.4, yBase 2.65, depth 0.6.

**4. escape bridge**: circles escape (1.4), fork (0.95).

**5. balance cock**: circles balance (2.0), root (0.8); yBase 5.95, depth 0.5, bevel 0.14 → top ~ 6.4 ✓.

The cock pillar child: cylinder radius 0.35 from y=0 to 5.5 at the root position: geometry CylinderGeometry(0.38,0.38,5.6,16) positioned at local (rootX - balanceX? no — the parent's local frame: the cock mesh's position is at (0, yBase, 0) with the shape's coordinates being absolute (the shape points are in world x,z) since I build the blob from absolute coordinates. So the cock mesh's position is (0, yBase, 0) — the geometry contains absolute x,z ✓. Then a child at local (root.x, localY, root.y)? The child's local position must account for the parent's world position (0,yBase,0) → local y = worldY - yBase ✓.

So pillar child: local (root.x, (0 + 5.5)/2? Let's define the pillar from y=0.2 to 5.5 world: center y = 2.85 world → local y = 2.85 - 5.95 = -3.1 ✓; length 5.3, radius 0.38 ✓.

Hmm, careful: the cock mesh's geometry x,z are absolute (the blob is built at absolute positions) ✓, and the mesh position is (0, yBase, 0) ✓ → the world position matches ✓.

But this means for explode, the base position of the cock is (0, yBase, 0), which is at the plate center — so its explode direction falls back to the random per-index ✓ fine.

Similarly the bridges' base positions are (0, yBase, 0).

**6. jewels**: create jewels as described.

**7. screws**: positions list.

**8. train wheels, pinions, barrel, mainspring, arbor, ratchet.**

**9. pallet fork, balance, hairspring, stud.**

**10. crown, stem, setting lever, click.**

**11. motion works & hands.**

Let me now decide the fork's base rotation & the pallet jewels.

The fork pivot pFork; the escape direction from the fork = normalize(pEscape - pFork) → angle = atan2(dz, dx) where dz = 1.539-(-0.299)=1.838, dx = 3.944-5.783 = -1.839 → angle = atan2(1.838, -1.839) = 135° (roughly). Indeed pFork = pEscape + v2p(2.6,-45) so pEscape - pFork = -v2p(2.6,-45) = v2p(2.6, 135°) ✓ angle 135°.

So φu = 135°, base rotation.y = -135° = -φu ✓.

Fork shape built with local +x toward the escape wheel ✓.

Fork shape points (local, x forward toward the escape, z lateral):

Let's construct a polygon:
```
(-1.95, -0.35)  tail bottom
(-2.15, -0.35)?  
```
Let me define a clean outline:

Back tail: from (-1.95, -0.30) to (-1.95, 0.30) (the tail's end, straight), then forward on the +z side to (1.35, 0.55) tip? Hmm the arms: I want two arms diverging toward the escape wheel. Let me define the outline as:

1. (-1.95, 0.30) — tail top-left
2. (0.55, 0.30)
3. (1.40, 0.62) — left arm tip (upper-left)
4. (1.72, 0.15) — left arm tip inner
5. (0.35, 0.0)? — notch (this is where the "fork slot" would be at the front?) 

Hmm, real fork: the arms extend forward on both sides of the escape wheel's rim, with a "fork slot"? No — the fork's "crotch" is at the front.

Let me simplify: The fork is a V-shaped piece:
- Two arms from the pivot spreading forward: left arm tip at (1.7, 0.55), right arm tip at (1.7, -0.55),
- between them at the front a notch.
- A tail to the back with a slot for the impulse pin.

Outline (going counterclockwise):
(0.0, 0.0) is the pivot.
Start at (1.75, 0.75) [left arm tip outer]
→ (1.95, 0.30) 
→ (1.45, 0.15) [inner edge of left arm, notch start]
→ (0.0, 0.0)?? 

I'll not obsess; use a polygon roughly:

```
const forkPts: [number,number][] = [
  [1.75, 0.70], [1.95, 0.20], [1.35, 0.05], [0.0, 0.0], [1.30, -0.05], [1.85, -0.25], [1.65, -0.75], [-0.35, -0.35],
  [-1.95, -0.35], [-1.95, 0.35], [-0.35, 0.35]
];
```
Hmm, this is a rough polygon; ensure it doesn't self-intersect. Order around the outline:

Let's go around the perimeter starting from the left arm tip, clockwise around the outline:
1. (1.80, 0.62) — left arm outer tip
2. (1.55, 0.05) — inner between arms (front center)
3. (1.80, -0.55) — right arm tip
4. (0.30, -0.45) — right side of the body toward the pivot
5. (-1.60, -0.40) — tail bottom
6. (-1.95, -0.15)
7. (-1.95, 0.15)
8. (-1.60, 0.40) — tail top
9. (0.30, 0.45)
back to 1 ✓.

That's a plausible fork (V shape) ✓. Add a hub hole at the origin (radius 0.22) and a slot hole in the tail: a rectangle from (-1.55,-0.12) to (-1.0,0.12) ✓ (the impulse pin slot).

Hmm, the slot at 1.0-1.55 from the pivot: earlier I wanted the slot at ~2.0 from the pivot for the impulse pin geometry. Let's extend the tail to 2.2 and the slot at [1.6, 2.1]. So points 5-8: (-1.95,-0.40), (-2.30, -0.15)... Let's set the tail end at x=-2.3:
5. (-1.70, -0.40)
6. (-2.35, -0.15)
7. (-2.35, 0.15)
8. (-1.70, 0.40)
and the slot hole from (-2.05,-0.12) to (-1.45, 0.12) ✓.

Then the impulse pin's circular path (radius 1.6 around the balance, at distances 3.4±1.6 = 1.8..5.0 from the fork pivot) — the slot at 1.45..2.05 ✓ near 1.8 ✓ good.

The pallet jewels: two small red boxes at the arm tips: at (1.5, 0.45) and (1.55, -0.45)? The escape wheel rim (radius 0.85) — the fork pivot is 2.6 from the escape center, so the rim at the closest is 2.6-0.85 = 1.75. The arm tips at 1.8 forward → reaching beyond the rim ✓. The pallets should be at the tips: place small boxes (0.35 x 0.35 x 0.15) at local (1.7, ±0.42) with y below the fork body ✓.

Since the fork is at the level above the escape wheel, the pallets hang down to the escape wheel's teeth level ✓: escape wheel spans y ∈ [0.75, 1.15]; the fork body at y ∈ [1.2, 1.4]; the pallets as boxes from 0.95 to 1.3 ✓.

Hmm, the fork body: thickness 0.25, positioned with its center at y=1.32 ✓ (spans 1.195-1.445), above the escape wheel top 1.15 ✓ and below the bridge bottom 2.2 ✓.

Pallets: boxes of size (0.3, 0.5, 0.18) at local (1.65, ±0.45, y-center 1.05) ✓ (in the fork's local frame, since they're children) — but the child's local y is relative to the fork's mesh position (which is at y=1.32) → local y = 1.05 - 1.32 = -0.27 ✓. And the children rotate with the fork ✓.

Fine.

**Balance wheel**: rim (annulus) outer 4.0, inner 3.35, thickness 0.45, at y=4.6. Arms: 2 boxes (2.9 x 0.4 x 0.28) at the rim's level rotated 0° and 90°. Actually the boxes: BoxGeometry(len, height, thickness)? For an arm from the hub to the rim at angle 0 (along +x): BoxGeometry(2.8, 0.35, 0.28) positioned at (1.6, 0, 0) ✓, rotated ✓. Second arm rotated 90° about y ✓.

Rim screws: 4 cylinders at (2.0*cos(45+k*90), 0.28, ...)? They sit on the rim's top? Balance rim screws are usually on the rim's outer surface pointing inward (radially). Let's place small cylinders on the rim at radius 3.7, rotated to lie along the rim (or radially) ✓ with a blued material ✓.

The balance staff: a cylinder radius 0.35 from y=0.0 to 4.6, at the balance axis (child) ✓ — actually the staff goes from the plate up to the cock ✓ (a long thin cylinder) ✓.

The impulse pin/roller: a cylinder at the balance center + 1.6*(direction toward the fork) from y=2.2? Hmm, the roller is at the balance staff, and the impulse pin goes down to the fork's level (1.3). So the pin: from y=2.2 down to 1.25, at radius 1.6 toward the fork ✓. Hmm, but this pin must be visible/attached to the balance rotating ✓ — as a child of the balance wheel ✓. The pin's cylinder: height 1.2 (from 1.2 to 2.4), radius 0.1, positioned at local (1.6*dirX, localY, 1.6*dirZ) ✓.

Also a roller: a small disc at y=2.6, radius 0.7 ✓ child.

Hmm, but the balance rim is at y=4.6 and the staff goes up. The impulse pin at y 1.2-2.4 is below the bridge (2.2-3.1)! The bridge covers the train area but the balance is outside the train bridge ✓ (the train bridge blob is around the center/third/fourth pivots; the balance is far away ✓). The escape bridge covers the escape wheel & fork pivot, and the balance is outside ✓. So no conflict ✓.

But wait, the fork is under the escape bridge! The escape bridge at y 2.2-3.1 with circles at the escape (1.4) and fork (0.95). The fork body is at 1.2-1.45 ✓ below ✓. Fine (typical: the fork is under the bridge).

Hmm, but then the fork is hidden under the bridge — you can't see the escapement! For the "watch it work" requirement, it's better to see the fork and the escape wheel. Options: make the escape bridge small or remove the coverage above the fork. Let's keep the escape bridge but make it small: just the escape wheel circle r=1.0 and the fork r=0.7? Hmm, but then it might not overlap the fork's arms.

Alternatively: don't include a bridge over the fork; the escape bridge covers just the escape wheel pivot (r=1.0), and the fork pivot jewel sits on... Hmm, the fork needs a jewel (jewel_5 on the bridge top). Let's make the escape bridge cover only the escape wheel (r 1.5) — the fork pivot is 2.6 away from the escape center, outside ✓ — but then jewel_5 (fork) would sit at the plate top instead. Fine: jewel_5 at y=0.05? Hidden under the fork. Hmm.

Let's simplify: the escape bridge covers the escape wheel radius 1.5; the fork pivot jewel at y=0.05 on the plate (under the fork) → hidden but real ✓ (#14 in the plate list already). And the "bridge-top" jewel at the fork pivot → place at the plate level? Let's just have jewels 1-6 be: center, third, fourth, escape, barrel (on bridges) + balance (cock). Then the 17 jewels list: 6 bridge-top + 1 cock + 7 plate + 3 motion works = 17 ✓ 

So:
j1 center (3.15), j2 third (3.15), j3 fourth (3.15), j4 escape (3.15), j5 barrel (3.15), j6 balance (6.42), j7..j13 plate (0.04) at barrel, center, third, fourth, escape, fork, balance; j14 cannon (3.66), j15 minute (3.66)? the minute wheel is at y=3.6; j16 hour (4.3), j17 = ??? Let me recount: 6+1+7+3 = 17 ✓ with j14 (cannon), j15 (minute wheel), j16 (hour wheel)... that's 6+1+7+3 = 17 ✓ where the 3 motion works jewels are cannon/hour/minute ✓.

Good.

Now the hairspring: spiral at the balance axis, y=4.05, inner radius 0.55, outer 2.6, 6.5 turns ✓.

Stud: a box at balance center + v2p(2.7, 0) → local, at y=4.05..4.6 ✓ plus a pin up to the cock (y 4.6-5.6) ✓. But careful: the stud is at radius 2.7 from the balance center; the balance rim inner radius 3.35 ✓ so the stud is inside the balance rim's ring area? The rim is at radius 3.35-4.0, so 2.7 is inside ✓ no collision. The hairspring's outer end at 2.6 near the stud ✓.

The stud must not rotate with the balance ✓ (it's a separate part, static) ✓.

Now, breathing: scale the hairspring mesh's x,z by 1 ± 0.06.

Now the crown/stem etc.

Also, "ratchet_wheel": a gear at the barrel axis, y=3.4, radius 1.9, teeth 30, thickness 0.45 ✓ with spokes? Use spokes=3 with a hub ✓.

Wait, the barrel bridge top is at 3.1; the ratchet at 3.4 center with thickness 0.45 → spans 3.17-3.62 ✓ above the bridge ✓. But the barrel bridge blob radius 4.0 covers it ✓.

Now the crown wheel is missing; fine.

Now the click: a small box at the ratchet's rim: at barrel + v2p(1.9, 40°) with y=3.45 ✓.

Now the stem: from the crown to the barrel area: crown at (-14.5, 1.3, -8.5)? Let's compute the crown position: I'd like it outside the plate near the lower-left: crownPos = (-13.5, 1.0, -9.0); distance from origin = 16.2 > 15 ✓ just outside ✓.

Stem: from (-13.5,1.0,-9.0) toward the barrel arbor area (-3.95, 1.0, -1.44)? Let's use the stem start at the crown and end at the barrel bridge edge (-6.5, 1.4, -3.6). The stem cylinder radius 0.35 ✓.

Actually the stem should enter the movement horizontally; fine.

Setting lever: a box at (-8.5, 1.9, -5.0) rotated ✓.

Click: as above.

Now the motion works:
- cannon_pinion: gear at pCenter, y=3.6, teeth 7, radius 0.35 ✓ (leaves 7 → radius 0.35 = MOD*7/2 ✓). Plus a "cannon_pinion_body"? fine.
- minute_wheel: at pCenter + v2p(1.35, 150°) = (-1.169, 0.675), y=3.6, radius 1.0 (teeth 20 ✓ MOD*20/2 = 1.0 ✓) ✓.
- minute wheel pinion: radius 0.35 at the same axis, y=3.95, teeth 7 ✓ (a separate mesh? The requirement lists hour_wheel and minute_wheel; I could add minute_pinion but not required. Let's add it as a child of the minute wheel? It needs a different gear. Add a child mesh named `minute_wheel_pinion` ✓ not in parts).
- hour_wheel: at pCenter, y=4.2, radius 1.0 (20 teeth) ✓.

Then the hour hand at pCenter y=6.8 should rotate as s.hour ✓; the hour wheel rotates as s.hour ✓.

Now the hands: hour_hand, minute_hand, second_hand ✓.

Let's also add a "dial" ? Not required.

Now, the label list & creation.

Now the animation application function:

```ts
const spinners: { mesh: THREE.Object3D; sign: number; offset: number; get: (s: WatchState) => number }[] 
```
Simpler: write it explicitly after building. I'll store references.

Let me now write out all the code. I'll now produce the final answer. Given the complexity, I'll write carefully but concisely.

Additional check: the requirement says "At least 40 separate meshes, with unique names, including: mainspring_barrel, mainspring, arbor, center_wheel, third_wheel, fourth_wheel, escape_wheel, their pinions, pallet_fork, balance_wheel, hairspring, balance_cock, stud, crown, stem, setting_lever, click, ratchet_wheel, cannon_pinion, hour_wheel, minute_wheel, the 17 jewels named jewel_1 ... jewel_17 (at the pivots), the main plate and the bridges, and the screws."

"their pinions" → center_pinion, third_pinion, fourth_pinion, escape_pinion ✓ names.

Main plate name: "main_plate" ✓.

Bridges: "train_bridge", "barrel_bridge", "escape_bridge" ✓ (real 6497 has barrel bridge, train bridge, escape bridge ✓).

Screws: screw_1..screw_8 ✓.

Now the code.

One more consideration for the explode function: parts include the plate (a huge disc) — exploding the plate lifts it and pushes it; the direction for the plate is (0,yBase=-1.25,0) → plan 0 → fallback direction ✓ and lift = 1.5+1.5*idx%4. Fine.

Also, since the labels are not in parts, they stay ✓.

Now let's write the code.

I need to be careful: `THREE.Shape` with `holes` — the hole paths should have points; the winding direction matters somewhat but three's ShapeUtils handles holes by checking the winding? `ShapeUtils.triangulateShape` uses the holes and reverses if needed? It does `isClockWise` checks for the outer contour and holes; it should handle both ✓.

Extrusion direction/geometry: fine.

Another risk: `ExtrudeGeometry` with a shape whose holes touch the outline → bad triangulation. Our arc holes are strictly inside ✓.

Let me also double-check the gear root radius: rRoot = pitchRadius - mod*1.25 = for r=0.4 pinion → 0.4-0.125 = 0.275; the hub hole = 0.4*0.32 = 0.128 ✓ < 0.275 ✓.

For the escape pinion radius 0.4 with 8 leaves: pitch 2π*0.4/8 = 0.314 ✓ consistent with module 0.1 ✓.

For the cannon pinion radius 0.35 with 7 leaves: pitch = 2π*0.35/7 = 0.314 ✓ consistent ✓ (module 0.1). Good.
Minute wheel radius 1.0 with 20 teeth: pitch = 2π*1/20 = 0.314 ✓.
Hour wheel radius 1.0 with 20 ✓.

Great, everything uses MOD 0.1 consistently ✓ (though not required for the motion works).

Now the "minute wheel pinion" radius 0.35 (7 leaves) ✓ meshing the hour wheel radius 1.0 with d = 1.35 ✓ = 0.35+1.0 ✓ consistent ✓. And cannon pinion radius 0.35 + minute wheel radius 1.0 = 1.35 ✓ same distance ✓ perfect.

Now, the motion works placements: minute wheel at pCenter + v2p(1.35, 150°) ✓.

Now the third wheel's phase for the visual mesh and the escape wheel... ✓ computed.

Also: the center pinion should have the same rotation as the center wheel ✓ (rigid on the same axis) though physically the center pinion is on the center wheel's arbor ✓.

Now, one subtlety: the pinion of a stage is at the level of the previous wheel, but *is* rigidly connected to its wheel ✓ same angle ✓.

Alright. Writing the final code now.

For the barrel: the barrel drum ring with teeth ✓, mainspring spiral ✓, arbor ✓ all rotating with s.barrel + phase[0].

Let me compute the mainspring spiral:

```ts
const springPts: THREE.Vector3[] = [];
const turns = 6.5, r0 = 0.5, r1 = 2.9;
const N = 260;
for (let i = 0; i <= N; i++) {
  const u = i / N;
  const r = r0 + (r1 - r0) * u;
  const a = u * turns * Math.PI * 2;
  springPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
}
const springCurve = new THREE.CatmullRomCurve3(springPts);
const springGeo = new THREE.TubeGeometry(springCurve, 400, 0.055, 4, false);
const mainspring = new THREE.Mesh(springGeo, steelDark);
mainspring.position.set(pBarrel.x, 0.95, pBarrel.y);
```
Hmm — careful, the tube geometry is built in the local frame around (0,0); then we position it at the barrel ✓, and it rotates with the barrel ✓ (rotation.y set) ✓ — the spiral rotates ✓.

Note: the tube's radius 0.055 with 6.5 turns from 0.5 to 2.9 ✓ inside the barrel ✓.

Now the barrel ring: `gearShape(72, 3.6, 0.1, { hub: 3.0 })` with spokes 0 ✓ → I'll add an option spokes=0 handling.

Now the barrel drum: add a child cylinder wall? skip (the ring is fine).

Arbor: cylinder radius 0.42, height 3.8, at the barrel position ✓ (y from 0 to 3.8 → center y=1.9) ✓. It's a separate part (arbor) ✓.

But the arbor is at the barrel axis and the mainspring's inner end at r=0.5 — the arbor radius 0.42 ✓ inside ✓.

Now the ratchet wheel: at the barrel axis, y=3.4 ✓.

Now, the barrel assembly parts each rotate: mainspring_barrel, mainspring, arbor, ratchet_wheel all get rotation.y = s.barrel + phase[0] ✓.

Note: the arbor is a cylinder centered at the origin? A cylinder's axis is y ✓ and rotating about y doesn't change it ✓.

Now the crown/stem static ✓.

Let's write the code!

One more: `mainspring_barrel` — needs the teeth data in userData ✓ (barrel stage). And the barrel's "pinion" 0.

Also, wheels: should `castShadow`; okay.

Now the labels:

```ts
function makeLabel(text: string): THREE.Sprite {
  const w = 512, h = 96;
  const ctx = makeCanvasCtx(w, h);
  ctx.fillStyle = 'rgba(10,12,18,0.55)';  // rounded rect background
  ...
  ctx.font = 'bold 44px sans-serif';
  ctx.fillStyle = '#ffdca8';
  ctx.fillText(text, w/2, h/2);
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(9, 1.7, 1);
  sprite.renderOrder = 10;
  return sprite;
}
```
Careful: `makeCanvasCtx` returns a context; I need the canvas: ctx.canvas ✓.

Placing labels:
```ts
const labelData: [string, THREE.Vector2][] = [...]
for (...) { const s = makeLabel(text); s.position.set(pos.x, 13, pos.y); scene.add(s); }
```
Maybe give each label a different y to avoid overlap: y = 12 + (i%3)*1.2 ✓.

Also, `sizeAttenuation` default true ✓; scale 9 units wide ✓ might be big but readable at distance 40 ✓ (9mm at 40mm distance with fov 45 → 9/36 = 25% of the screen height ✓ big but ok).

Maybe scale (7, 1.4).

Now let's assemble the final code text. I'll write it in one go.

Also I need `window as any` assignments ✓.

Let me be careful with the `paused` property and `state()` typing.

Let me write it now.

```ts
/* ---------------- types ---------------- */
interface WatchState { t: number; balance: number; pallet: number; escape: number; fourth: number; third: number; center: number; barrel: number; second: number; minute: number; hour: number; }
interface WatchAPI { parts: THREE.Object3D[]; paused: boolean; reset(): void; step(dt: number): void; state(): WatchState; explode(f: number): void; }
```

Now the full code. Let's write it.

Order of definitions matters: `explode` references `parts` and needs to be defined before the loop; the `watch` object references `explode`.

Let me write:

```ts
const parts: THREE.Object3D[] = [];
function register(mesh: THREE.Mesh, name: string, x: number, y: number, z: number): THREE.Mesh { ... }
```

Then all parts built.

Then:

```ts
let simTime = 0;
let explodeF = 0;
let explodeTarget = 0;
let explodeAnim = false;

function applyExplode(f: number): void { ... }
function explode(f: number): void { explodeF = THREE.MathUtils.clamp(f, 0, 1); explodeAnim = false; applyExplode(explodeF); }
```

Hmm, `explode` should not necessarily stop an ongoing animation... The spec: "explode(f): f in [0,1]. ... It applies the view at once (only the E key and the button animate)." So calling explode sets it immediately ✓ (and if an animation is in progress, we should stop it to respect the call) ✓.

The watch object:

```ts
const watch: WatchAPI = {
  parts,
  paused: false,
  reset(): void { simTime = 0; updateScene(0); },
  step(dt: number): void { simTime += dt; },
  state(): WatchState { return stateAt(simTime); },
  explode,
};
```

`updateScene(t)` applies the angles. After reset, the angles are 0 ✓.

Now, the loop:

```ts
let last = performance.now();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  let dt = (now - last) / 1000;
  last = now;
  if (dt < 0) dt = 0;
  const stepDt = Math.min(dt, 1 / 30);
  if (!watch.paused) watch.step(stepDt);
  updateScene(simTime);
  // explode animation
  if (explodeAnim) {
    const d = explodeTarget - explodeF;
    const move = Math.min(Math.abs(d), dt * 1.5);
    explodeF += Math.sign(d) * move;
    if (Math.abs(explodeTarget - explodeF) < 0.002) { explodeF = explodeTarget; explodeAnim = false; }
    applyExplode(explodeF);
  }
  controls.update();
  renderer.render(scene, camera);
  if (!readyFlag) { readyFlag = true; (window as any).__ready = true; }
});
```

Hmm — `Math.sign(d)*move` where move is clamped ✓.

Also `updateScene(simTime)` uses `stateAt(simTime)`.

Now `updateScene(t)`:

```ts
function updateScene(t: number): void {
  const s = stateAt(t);
  const ph = phase;
  barrelMesh.rotation.y = s.barrel + ph[0];
  mainspring.rotation.y = s.barrel + ph[0];
  arbor.rotation.y = s.barrel + ph[0];
  ratchet.rotation.y = s.barrel + ph[0];
  centerWheel.rotation.y = s.center + ph[1];
  centerPinion.rotation.y = s.center + ph[1];
  thirdWheel.rotation.y = s.third + ph[2];
  thirdPinion.rotation.y = s.third + ph[2];
  fourthWheel.rotation.y = s.fourth + ph[3];
  fourthPinion.rotation.y = s.fourth + ph[3];
  escapeWheel.rotation.y = s.escape + ph[4];
  escapePinion.rotation.y = s.escape + ph[4];
  fork.rotation.y = forkBaseRot + s.pallet;
  balance.rotation.y = s.balance;
  const breath = 1 + 0.07 * Math.sin(s.balance / (1.2 * Math.PI) * Math.PI * 0.5);?? 
```
Hmm, breathing: use `1 + 0.06 * Math.abs(s.balance)/(1.2*Math.PI)`? That would give a non-negative breathing (never contracting below 1). Let's do `1 + 0.05*Math.sin(...)`? The balance angle oscillates sinusoidally; breathing in and out should follow it: `hairspring.scale.set(1 + 0.06*b, 1, 1 + 0.06*b)` where b = s.balance/(1.2π) ∈ [-1,1] ✓ breathing both ways ✓.

Also maybe rotate the hairspring slightly: `hairspring.rotation.y = s.balance * 0.15` ✓.

Then hands:
```ts
hourHand.rotation.y = s.hour;
minuteHand.rotation.y = s.minute;
secondHand.rotation.y = s.second;
```
Hmm — the hands should be at their axes and rotate; but our hands are positioned at yaw 0 by default. ✓

Motion works:
```ts
cannonPinion.rotation.y = s.center + ph[1];
minuteWheel.rotation.y = -(s.center + ph[1]) * 0.35;
hourWheel.rotation.y = s.hour;
```
Hmm, minute wheel rotation sign whatever ✓.

Also, the hands might be misaligned with their wheels: the hour hand should be at the hour wheel's angle ✓ equals s.hour ✓.

Now the crown: static ✓.

Now `stateAt` and `phase` must be defined before use ✓.

Let me handle the `phase` computed at build time ✓.

Alright, writing the final code now. I'll produce it as a single block.

Also: `forkBaseRot = -Math.atan2(pEscape.y - pFork.y, pEscape.x - pFork.x)` ✓.

One more: the balance wheel's impulse pin should be at the direction toward the fork: `dirTowardFork = normalize(pFork - pBalance)` → angle = atan2(dz, dx) ✓; in the balance's local frame, a child at (r*cos a, y, r*sin a) ✓. Since the balance's rotation.y moves the geometry by -ρ (per our convention), the child's world angle changes ✓ fine.

Now the escape wheel "phase" and the fork: the fork's pallet engagement isn't synchronized exactly with the escape teeth but visually close.

Now `study`: at t=0, all state angles are 0, and the meshes show with their phase offsets ✓.

Let me also ensure the initial assembled positions ✓ (register sets positions).

Now writing.

For brevity in the code, I'll write helper `addCyl(...)` etc. Maybe less boilerplate:

```ts
function cylinder(radius: number, height: number, mat: THREE.Material, segs = 24): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segs), mat);
}
```

Now let's write out everything in the final answer.

Potential TS pitfalls to avoid:
- `ctx.canvas` type: `HTMLCanvasElement` ✓.
- Numeric bitwise: avoid.
- `THREE.Vector2.clone()` ✓.
- `mesh.userData` typing: `userData` is `{ [key: string]: any }` → assigning `mesh.userData.basePos = v` ✓ (any).
- Reading: `const base = mesh.userData.basePos as THREE.Vector3;` ✓.
- `THREE.Shape` typed constructor `new THREE.Shape()` ✓.
- `new THREE.Path()` ✓, `path.moveTo` ✓.
- `shape.holes.push(path)` ✓ (`holes: Path[]` in Shape? Shape has `holes: Path[]`? In TS, `THREE.Shape` has `holes: Path[]` ✓ I believe (Shape extends Path and adds `holes: Path[]`). Yes ✓.

- `THREE.ExtrudeGeometry` options type: `ExtrudeGeometryOptions`? Passing an object literal with `depth`, `bevelEnabled`, `bevelThickness`, `bevelSize`, `bevelSegments`, `curveSegments` ✓ (they're optional).

- `RoomEnvironment` constructor: `new RoomEnvironment()` ✓ (its type may require an optional renderer?). In newer three, RoomEnvironment's constructor takes no args ✓. In some versions `RoomEnvironment(renderer)`? Hmm, older versions had `RoomEnvironment()` too. OK.

- `pmrem.fromScene(envScene, 0.06)` → signature `fromScene(scene: Scene, sigma?: number, near?: number, far?: number)` ✓.

- `PMREMGenerator` requires `renderer` ✓.

- `renderer.setAnimationLoop(callback)` ✓.

- `window as any` casts ✓.

- `document.createElement('canvas')` ✓.

- `THREE.CatmullRomCurve3(points)` ✓; `THREE.TubeGeometry(curve, segments, radius, radialSegments, closed)` ✓.

- `THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false })` ✓.

- `THREE.Sprite` scale ✓.

Alright. Also make sure not to use `Math.random` in geometry loops where determinism matters — fine.

Now write it.

I'll now compose the final file.

Also one detail: `renderer.setSize` + `document.body.appendChild` ✓.

Also handle `window.devicePixelRatio` ✓.

Let me write the code, ~700 lines.

Final check on the layout: the plate radius 15; the balance cock root at (4.93,-5.33) — I computed root = balance + v2p(4.6, 200°): cos200 = -0.9397, sin200 = -0.3420 → (9.318 - 4.32, -3.835 - 1.57) = (5.0, -5.41) ✓.

And the plate covers it ✓ (distance 7.4).

Is the cock's blob (circles at the balance r2.0 and root r0.8) crossing the balance's rim? It's above ✓ fine.

Camera target (0,2,0) — the movement's center-ish ✓.

Now what about the labels' positions: e.g., mainspring_barrel at pBarrel = (-3.95,-1.44) ✓.

Label list:
- "Barrel & mainspring" at pBarrel
- "Center wheel" at pCenter
- "Third wheel" at pThird
- "Fourth wheel" at pFourth
- "Escape wheel" at pEscape
- "Pallet fork" at pFork
- "Balance" at pBalance
- "Hairspring" at (pBalance + (0,?, 4))? Put it at pBalance + (0,0,3)? fine.
- "Crown" at crown position
- "Main plate" at (-8, -8)? Let's put at (-9, 0, -9)? Hmm; the plate is everywhere. Put at (-11, 0, 0)? Let's use (0, 0, 11)? Put at (0,?,12).
- "Train bridge" at (pThird + ...)?
- "Balance cock" at pBalance.
- "Jewels" at pCenter + ...

Let's define labelData as [text, x, z]:
1. Barrel/mainspring: pBarrel
2. Center wheel: pCenter
3. Third wheel: pThird
4. Fourth wheel: pFourth
5. Escape wheel: pEscape
6. Pallet fork: pFork
7. Balance wheel: pBalance
8. Hairspring: pBalance + (0, 2.8)
9. Crown & stem: crownPos
10. Train bridge: pFourth + (-2, 2)?
11. Balance cock: pBalance + (2, -2)
12. Main plate: (-10, 9)?
13. Jewels: (pThird + (2, -2))

Fine, y = 12 + (index%3)*1.4.

Now writing.

Let me finalize all the constants needed for the parts:

```ts
const LEVEL_A = 0.95;
const LEVEL_B = 1.95;
const BRIDGE_Y = 2.65;      // mesh centre (top ~3.1)
const COCK_Y = 5.95;        // top ~6.4
const PLATE_TOP = 0;
```

Wheel thickness 0.4; pinion thickness 0.9? Let's set wheels 0.4, pinions 0.9 (tall thin pinion teeth ✓). Hmm, pinion height 0.9 centered at LEVEL_A → spans 0.5-1.4; the barrel wheel spans 0.75-1.15 ✓ overlapping ✓ ok. But the pinion at LEVEL_B spans 1.5-2.4, the third wheel at LEVEL_A spans 0.75-1.15 ✓ overlap ✓ fine.

Hmm, but the pinion at LEVEL_A (center pinion, spans 0.5..1.4) and the wheel at LEVEL_B — on the same axis but different heights ✓ no conflict.

Actually wait: the center pinion at LEVEL_A spans 0.5-1.4, and the center wheel at LEVEL_B spans 1.75-2.15 ✓ separated ✓.

Hmm, but the pinion of the third (LEVEL_B, spans 1.5-2.4) and the third wheel (LEVEL_A, 0.75-1.15) ✓ fine.

Escape pinion at LEVEL_B spans 1.5-2.4; the escape wheel at LEVEL_A spans 0.75-1.15 ✓.

Good.

The fork at y 1.2-1.45 ✓ above the escape wheel ✓.

The escape bridge bottom 2.2 ✓ above the fork ✓ visible? The fork at 1.2-1.45 is under the bridge; hmm, the bridge is at the escape wheel area. The fork is at pFork, which is 2.6 from the escape wheel; the escape bridge's blob covers circle r=1.5 around the escape wheel → reaches 1.5 from the escape center; the fork is at 2.6 ✓ outside ✓ visible ✓. Good.

Now, jewels on the escape bridge at pEscape ✓.

Let me now write everything.

I also want to make sure that the train bridge doesn't cover the escape wheel (it covers circles at center/third/fourth with r ~1.5): the escape wheel at (3.944,1.539) distance from pCenter (0,0) = 4.24 > 1.55 ✓ outside; from pThird (-2.25,3.897): distance = sqrt(38.4+5.6)=6.6 ✓; from pFourth (1.744,5.35): distance = sqrt(4.8+14.5)=4.4 ✓. So the escape wheel is visible ✓ and the fork too ✓. 

The fourth wheel (r 4.0 at (1.744,5.35)) is partially covered by the bridge ✓ realistic.

Now the balance is outside everything ✓.

Good. Writing the code.

One more check for the `main_plate`: it's a cylinder radius 15, and the crown at (-13.5,-9.0) is at distance 16.2 → outside ✓ but the stem crosses over the plate edge ✓ fine.

Let me also double-check the stem's orientation: from crown (-13.5,1.0,-9.0) to (-6.5,1.4,-3.6) ✓.

Setting lever at (-9.5, 1.9, -4.8) ✓ (near the stem) ✓.

Click at barrel + v2p(1.9, 40°) = (-3.947+1.455, -1.436+1.221) = (-2.49, -0.215), y=3.45 ✓ near the ratchet ✓.

Hmm, but the click is above the ratchet wheel's plane (3.17-3.62) ✓ y=3.45 ✓.

But careful: with the exploded view, these parts move ✓ fine.

OK, final write.

I'll write the code with comments.

Let me think about how the `updateScene` accesses `phase`, defined as `const phase = computePhases()` ✓.

Let me now write the answer.

Also the requirement: "The movement starts ASSEMBLED and running" ✓ (simTime 0, explodeF 0).

Let's produce the final code.

Also, should I add `(window as any).__scene`, `__camera`, `__renderer` ✓.

Let me write it.

(Writing the code - final.)

Careful on one thing: `gearShape` uses `pl(r,a)` helper; define:

```ts
function pl(r: number, a: number): THREE.Vector2 {
  return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
}
```

Now let me produce the code.

For the balance rim shape:

```ts
const rimShape = new THREE.Shape();
rimShape.absarc(0, 0, 4.0, 0, Math.PI * 2, false);
const rimHole = new THREE.Path();
rimHole.absarc(0, 0, 3.35, 0, Math.PI * 2, true);
rimShape.holes.push(rimHole);
```
Using absarc on Shape/Path ✓ (exists).

Hmm: `Shape.absarc` — Shape extends Path which extends CurvePath; `absarc` is defined on Path ✓.

For the rim, the extrusion depth 0.45, bevel 0.03 ✓.

Now the arms as BoxGeometry children ✓ (named).

Now, `castShadow` for children too ✓ (set in a loop over children).

Now here's the final code. Let me write it out.

One more: in `applyExplode`, for the plate and bridges (base positions (0,y,0)), the fallback direction uses a pseudo-random angle ✓ so they separate ✓. But two bridges might get similar directions/lifts → overlapping. index differences give different lifts ✓ (idx%4). Bridges have different indices ✓ (their lift differs by index mod 4 likely) ✓. Some may coincide; acceptable.

Let's write.

Final code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ============================================================
   0. Renderer / camera / scene
   ============================================================ */
...
```

Now write out the remaining parts in full detail.

I'll try to make the code compile-safe. Let me be careful writing `updateScene` and the variables' declaration order: all mesh variables declared with `let`? Use `const` where initialized immediately, and declare them before `updateScene` is defined or use function hoisting ✓ (function declarations hoist, and `updateScene` references consts declared above it — fine as long as the consts are initialized before the function is called ✓).

Order: declare parts (consts), then define `updateScene` (function), then the loop ✓.

But the consts inside a block? All at module scope ✓.

Let's write the code.

Also: `stateAt` defined before `updateScene` ✓ (function declaration hoisting makes it fine anyway).

OK writing now.

For brevity I'll define a small helper for gear creation returning a mesh.

Let me write the final answer text.

Also double check: `const phase: number[] = computePhases();` — define the function before. ✓

Let me get everything typed properly.

One thing: `new THREE.Shape()` then `shape.moveTo(x,y)` ✓ and `shape.lineTo` ✓. To close the loop, `shape.lineTo(firstX, firstY)` ✓.

Let me write.

Final concern: performance. Lots of meshes with shadows; 2 lights with shadows? Only the key light casts shadows ✓. The shadow map 2048 ✓.

Also, the number of vertices is fine.

Writing now for real.

Let me write out the code in the final answer. I'll aim for correctness and completeness.

```ts
/* ====== textures ====== */
function ctx2d(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('no 2d');
  return g;
}

const perlageTex = (() => {
  const g = ctx2d(512, 512);
  g.fillStyle = '#4b453b';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 2 + Math.random() * 5;
    const rad = g.createRadialGradient(x, y, 0, x, y, r);
    const l = Math.floor(120 + Math.random() * 100);
    rad.addColorStop(0, `rgba(${l},${Math.floor(l * 0.94)},${Math.floor(l * 0.78)},0.85)`);
    rad.addColorStop(0.7, `rgba(${Math.floor(l * 0.4)},${Math.floor(l * 0.38)},${Math.floor(l * 0.32)},0.5)`);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(g.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
})();
```

Geneva similar.

OK writing the answer now.

I realize I should double check `ExtrudeGeometry` + `bevelSize` on a shape with holes: the bevel shrinks the outline/holes ✓ fine.

Let's write.

Also, for the plate: maybe add a raised rim ring at the edge for realism? Skip.

Now writing final.

I also need `phase` computed before the meshes are needed (it's used in updateScene only) ✓.

Alright, produce the answer.

Let me write the code file:

I'll write it now completely, carefully.

After writing, I'll double-check the required names:
- mainspring_barrel ✓
- mainspring ✓
- arbor ✓
- center_wheel ✓, center_pinion ✓
- third_wheel ✓, third_pinion ✓
- fourth_wheel ✓, fourth_pinion ✓
- escape_wheel ✓, escape_pinion ✓
- pallet_fork ✓
- balance_wheel ✓
- hairspring ✓
- balance_cock ✓
- stud ✓
- crown ✓
- stem ✓
- setting_lever ✓
- click ✓
- ratchet_wheel ✓
- cannon_pinion ✓
- hour_wheel ✓
- minute_wheel ✓
- jewel_1..jewel_17 ✓
- main_plate ✓
- train_bridge, barrel_bridge, escape_bridge ✓
- screw_1..screw_8 ✓
- hour_hand, minute_hand, second_hand ✓

Total parts: let's count: 12 train (11?) — mainspring_barrel, mainspring, arbor, center_wheel, center_pinion, third_wheel, third_pinion, fourth_wheel, fourth_pinion, escape_wheel, escape_pinion = 11; pallet_fork, balance_wheel, hairspring, stud = 4 (15); crown, stem, setting_lever, click, ratchet_wheel = 5 (20); cannon_pinion, hour_wheel, minute_wheel = 3 (23); hands = 3 (26); plate + 3 bridges + cock = 5 (31); screws 8 (39); jewels 17 (56). ✓ ≥ 40.

Now writing the code. Let me do it.

Note on the `jewel` creation function:

```ts
function makeJewel(idx: number, x: number, y: number, z: number): THREE.Mesh {
  const ruby = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.14, 24), rubyMat);
  ruby.name = `jewel_${idx}`;
  ruby.position.set(x, y, z);
  // chaton
  const chaton = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.10, 10, 28), goldMat);
  chaton.name = `chaton_${idx}`;
  chaton.rotation.x = Math.PI / 2;
  chaton.position.y = 0.0;
  ruby.add(chaton);
  ...
}
```
Hmm, the torus after rotateX(π/2) lies in the x-z plane ✓ centered at the jewel ✓.

Then register the ruby.

Now, `register` sets the position; but I set the position before registering ✓ (register overrides with the given values) — fine, just pass (x,y,z).

Now the screws:

```ts
function makeScrew(idx: number, x: number, y: number, z: number): THREE.Mesh {
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.34, 20), blueSteel);
  head.name = `screw_${idx}`;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.14), darkSlot);
  slot.name = `screw_slot_${idx}`;
  slot.position.y = 0.17;
  slot.rotation.y = (idx * 37) % 180 * Math.PI / 180;
  head.add(slot);
  head.position.set(x, y, z);
  ...
}
```
The head's height 0.34 centered at y ✓.

The slot on top at local y=0.17 ✓ and rotated ✓.

Now let's finalize. Writing the answer.

Let me also handle `jewel` chaton shadows: fine.

Now the final answer. I'll write it.

Length is large but necessary.

Let me write the code once more, in final form, checking each part.

Also: for `makeGearMesh`, the userData for train wheels must be set with teeth/pinion/radius/pinionRadius ✓ — I'll set after creation.

Let me write.

Also note: `updateScene` must set `rotation.y` for the wheel meshes only — but the mesh's rotation is also used for the gear phase; ✓.

Write the code.

One more thing: the `mainspring` mesh rotates about y at the barrel position — the mesh's position is at the barrel and its geometry is centered around the origin ✓.

Then the explode moves the positions ✓.

Writing now.

Also careful: after `applyExplode` sets the position of a mesh, the rotation is unaffected ✓.

Let's write the final answer.

I'll include `THREE.MathUtils.clamp` ✓ exists.

Final code:

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- types ----------
interface WatchState { ... }
interface WatchAPI { ... }

// ---------- renderer ----------
...

// ---------- environment ----------
...

// ---------- textures ----------
...

// ---------- materials ----------
...

// ---------- layout ----------
...

// ---------- helpers ----------
...

// ---------- parts ----------
...

// ---------- API & loop ----------
...

// ---------- expose ----------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = watch;
```

Alright. Writing the actual content.

For the label sprite drawing, round rect background:

```ts
const g = ctx2d(512, 96);
g.clearRect(0, 0, 512, 96);
g.fillStyle = 'rgba(12,14,22,0.72)';
// rounded rect
g.beginPath();
(g as any).roundRect? 
```
`roundRect` may not exist in older TS DOM types → avoid. Use fillRect with no rounding ✓, or draw an ellipse. Use `g.fillRect(0,0,512,96)` — rectangular label ✓ fine.

Text: `g.font = 'bold 44px Helvetica, Arial, sans-serif'` ✓; `g.fillStyle = '#f2d7a2'`; `g.textAlign='center'; g.textBaseline='middle'; g.fillText(text, 256, 48);` ✓.

Now writing.

Let me finalize the code for real. I'll produce the final answer text now, being careful.

A last thought on the `escape bridge` circles: escape (r=1.4), and I removed the fork ✓ (fork jewel is on the plate). So `escape_bridge` circles: [{c: pEscape, r: 1.5}].

Now producing the final answer.</think>```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =========================================================
   Types
   ========================================================= */
interface WatchState {
  t: number;
  balance: number;
  pallet: number;
  escape: number;
  fourth: number;
  third: number;
  center: number;
  barrel: number;
  second: number;
  minute: number;
  hour: number;
}

interface WatchAPI {
  parts: THREE.Object3D[];
  paused: boolean;
  reset(): void;
  step(dt: number): void;
  state(): WatchState;
  explode(f: number): void;
}

/* =========================================================
   1. Renderer / camera / scene
   ========================================================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06070b);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(1.5, 34, 28);
camera.lookAt(0, 1.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#06070b';
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 8;
controls.maxDistance = 140;
controls.update();

/* =========================================================
   2. Environment + studio lighting
   ========================================================= */
const pmrem = new THREE.PMREMGenerator(renderer);
const roomScene = new RoomEnvironment();
const envTarget = pmrem.fromScene(roomScene, 0.06);
scene.environment = envTarget.texture;

const keyLight = new THREE.DirectionalLight(0xfff1dd, 3.1);
keyLight.position.set(18, 30, 16);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 140;
keyLight.shadow.camera.left = -26;
keyLight.shadow.camera.right = 26;
keyLight.shadow.camera.top = 26;
keyLight.shadow.camera.bottom = -26;
keyLight.shadow.bias = -0.0002;
keyLight.shadow.normalBias = 0.02;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9fb6ff, 1.05);
fillLight.position.set(-24, 16, -18);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 1.7);
rimLight.position.set(-4, 9, -32);
scene.add(rimLight);

const hemiLight = new THREE.HemisphereLight(0x8899cc, 0x101014, 0.35);
scene.add(hemiLight);

/* =========================================================
   3. Procedural textures (canvas only)
   ========================================================= */
function ctx2d(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  return g;
}

/** perlage: overlapping circular grain for the main plate */
const perlageTex = (() => {
  const g = ctx2d(512, 512);
  g.fillStyle = '#4b453b';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 2 + Math.random() * 5.5;
    const rad = g.createRadialGradient(x, y, 0, x, y, r);
    const l = Math.floor(120 + Math.random() * 105);
    rad.addColorStop(0, `rgba(${l},${Math.floor(l * 0.93)},${Math.floor(l * 0.75)},0.9)`);
    rad.addColorStop(0.72, `rgba(${Math.floor(l * 0.38)},${Math.floor(l * 0.35)},${Math.floor(l * 0.28)},0.55)`);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(g.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
})();

/** cotes de Geneve: fine parallel ribs for the bridges */
const genevaTex = (() => {
  const g = ctx2d(512, 512);
  g.fillStyle = '#57503f';
  g.fillRect(0, 0, 512, 512);
  g.save();
  g.translate(256, 256);
  g.rotate(-0.58);
  g.translate(-256, -256);
  const bands = 9;
  const bw = 512 / bands;
  for (let i = 0; i < bands; i++) {
    const x = i * bw;
    const grad = g.createLinearGradient(x, 0, x + bw, 0);
    grad.addColorStop(0, 'rgba(38,34,26,1)');
    grad.addColorStop(0.35, 'rgba(176,160,128,1)');
    grad.addColorStop(0.52, 'rgba(120,108,84,1)');
    grad.addColorStop(1, 'rgba(30,26,20,1)');
    g.fillStyle = grad;
    g.fillRect(x, -300, bw, 512 + 600);
  }
  g.restore();
  // faint polishing scratches
  g.globalAlpha = 0.14;
  for (let i = 0; i < 200; i++) {
    const y = Math.random() * 512;
    g.strokeStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y + (Math.random() - 0.5) * 6);
    g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(g.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.repeat.set(0.22, 0.22);
  return t;
})();

/** engraving text for the bridge */
function textTexture(text: string, w: number, h: number, colour: string): THREE.CanvasTexture {
  const g = ctx2d(w, h);
  g.clearRect(0, 0, w, h);
  g.fillStyle = colour;
  g.font = `bold ${Math.floor(h * 0.52)}px Helvetica, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(g.canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* =========================================================
   4. Materials
   ========================================================= */
const steel = new THREE.MeshPhysicalMaterial({
  color: 0xc9ced8, metalness: 1.0, roughness: 0.16,
  clearcoat: 0.45, clearcoatRoughness: 0.09, envMapIntensity: 1.4,
});
const steelMatte = new THREE.MeshPhysicalMaterial({
  color: 0x8f97a5, metalness: 1.0, roughness: 0.34, envMapIntensity: 1.1,
});
const gilt = new THREE.MeshPhysicalMaterial({
  color: 0xd8ab55, metalness: 1.0, roughness: 0.27,
  clearcoat: 0.4, clearcoatRoughness: 0.18, envMapIntensity: 1.7,
});
const gold = new THREE.MeshPhysicalMaterial({
  color: 0xf0cd7a, metalness: 1.0, roughness: 0.18,
  clearcoat: 0.8, clearcoatRoughness: 0.06, envMapIntensity: 1.9,
});
const blueSteel = new THREE.MeshPhysicalMaterial({
  color: 0x1a2c6d, metalness: 0.9, roughness: 0.2,
  clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 1.5,
});
const rubyMat = new THREE.MeshPhysicalMaterial({
  color: 0xd41d44, metalness: 0.0, roughness: 0.06, clearcoat: 1.0,
  clearcoatRoughness: 0.02, transparent: true, opacity: 0.74,
  ior: 2.1, envMapIntensity: 2.0, side: THREE.DoubleSide,
});
const plateMat = new THREE.MeshPhysicalMaterial({
  map: perlageTex, color: 0xd2c8b2, metalness: 1.0, roughness: 0.38, envMapIntensity: 1.15,
});
const bridgeMat = new THREE.MeshPhysicalMaterial({
  map: genevaTex, color: 0xd8ceb6, metalness: 1.0, roughness: 0.26,
  clearcoat: 0.45, clearcoatRoughness: 0.18, envMapIntensity: 1.6,
});
const darkSlot = new THREE.MeshStandardMaterial({ color: 0x0a0d14, metalness: 0.75, roughness: 0.55 });
const engravingMat = new THREE.MeshBasicMaterial({
  map: textTexture('UNITAS 6497  ·  17 JEWELS  ·  SWISS MADE', 1024, 128, '#15181f'),
  transparent: true, depthWrite: false, opacity: 0.92, side: THREE.DoubleSide,
});

/* =========================================================
   5. Train layout (1 unit = 1 mm, plate horizontal, axes = +Y)
   ========================================================= */
const MOD = 0.1; // one tooth module per mesh pair

const TEETH = { barrel: 72, center: 80, third: 75, fourth: 80, escape: 15 };
const LEAVES = { center: 12, third: 10, fourth: 10, escape: 8 };

const wheelR = {
  barrel: (MOD * TEETH.barrel) / 2, // 3.60
  center: (MOD * TEETH.center) / 2, // 4.00
  third: (MOD * TEETH.third) / 2,   // 3.75
  fourth: (MOD * TEETH.fourth) / 2, // 4.00
  escape: (MOD * TEETH.escape) / 2, // 0.75
};
const pinionR = {
  center: (MOD * LEAVES.center) / 2, // 0.60
  third: (MOD * LEAVES.third) / 2,   // 0.50
  fourth: (MOD * LEAVES.fourth) / 2, // 0.50
  escape: (MOD * LEAVES.escape) / 2, // 0.40
};

function polar(dist: number, degAngle: number): THREE.Vector2 {
  const a = (degAngle * Math.PI) / 180;
  return new THREE.Vector2(Math.cos(a) * dist, Math.sin(a) * dist);
}

const pCenter = new THREE.Vector2(0, 0);
const pThird = pCenter.clone().add(polar(wheelR.center + pinionR.third, 120));
const pFourth = pThird.clone().add(polar(wheelR.third + pinionR.fourth, 20));
const pEscape = pFourth.clone().add(polar(wheelR.fourth + pinionR.escape, -60));
const pBarrel = pCenter.clone().sub(polar(wheelR.barrel + pinionR.center, 20));
const pBalance = pEscape.clone().add(polar(7.6, -45));
const pFork = pEscape.clone().add(polar(2.6, -45));
const pCockRoot = pBalance.clone().add(polar(4.6, 200));
const pCrown = new THREE.Vector2(-13.5, -9.0);
const pStemInner = new THREE.Vector2(-6.4, -3.5);
const pMinuteWheel = pCenter.clone().add(polar(1.35, 150));

/** interlocking phase offsets so the teeth really mesh */
function computePhases(): number[] {
  const stages = [
    { teeth: TEETH.barrel, pinion: 0, pos: pBarrel },
    { teeth: TEETH.center, pinion: LEAVES.center, pos: pCenter },
    { teeth: TEETH.third, pinion: LEAVES.third, pos: pThird },
    { teeth: TEETH.fourth, pinion: LEAVES.fourth, pos: pFourth },
    { teeth: TEETH.escape, pinion: LEAVES.escape, pos: pEscape },
  ];
  const out: number[] = [0];
  for (let i = 0; i < stages.length - 1; i++) {
    const Ta = stages[i].teeth;
    const Pb = stages[i + 1].pinion;
    const phi = Math.atan2(stages[i + 1].pos.y - stages[i].pos.y, stages[i + 1].pos.x - stages[i].pos.x);
    const ratio = Ta / Pb;
    let c = -ratio * out[i] - (1 + ratio) * phi - Math.PI + Math.PI / Pb;
    const period = (2 * Math.PI) / Pb;
    c = ((c % period) + period) % period;
    out.push(c);
  }
  return out;
}
const phase = computePhases();

/* vertical levels */
const LEVEL_A = 0.95;
const LEVEL_B = 1.95;
const WHEEL_TH = 0.4;
const PINION_TH = 0.9;
const BRIDGE_Y = 2.65;
const COCK_Y = 5.95;

/* =========================================================
   6. Geometry helpers
   ========================================================= */
function pl(r: number, a: number): THREE.Vector2 {
  return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
}

function arcHole(inner: number, outer: number, a0: number, a1: number, segs: number): THREE.Path {
  const p = new THREE.Path();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = a0 + (a1 - a0) * (i / segs);
    pts.push(pl(inner, a));
  }
  for (let i = segs; i >= 0; i--) {
    const a = a0 + (a1 - a0) * (i / segs);
    pts.push(pl(outer, a));
  }
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
  p.lineTo(pts[0].x, pts[0].y);
  return p;
}

function circleHole(r: number, segs: number): THREE.Path {
  const p = new THREE.Path();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < segs; i++) pts.push(pl(r, (i / segs) * Math.PI * 2));
  p.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i].x, pts[i].y);
  p.lineTo(pts[0].x, pts[0].y);
  return p;
}

/** toothed gear outline, optionally with spoke crossings and a hub hole */
function gearShape(
  teeth: number,
  pitchRadius: number,
  mod: number,
  opts: { hub?: number; spokes?: number } = {},
): THREE.Shape {
  const aPitch = (Math.PI * 2) / teeth;
  const rTip = pitchRadius + mod * 0.95;
  const rRoot = Math.max(pitchRadius * 0.55, pitchRadius - mod * 1.25);
  const tipHalf = aPitch * 0.17;
  const rootHalf = aPitch * 0.33;

  const shape = new THREE.Shape();
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * aPitch;
    pts.push(pl(rRoot, a - rootHalf));
    pts.push(pl(rTip, a - tipHalf));
    pts.push(pl(rTip, a + tipHalf));
    pts.push(pl(rRoot, a + rootHalf));
    pts.push(pl(rRoot, a + aPitch * 0.5));
  }
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.lineTo(pts[0].x, pts[0].y);

  const hub = opts.hub ?? Math.min(0.55, pitchRadius * 0.16);
  if (hub > 0.02) shape.holes.push(circleHole(hub, 24));

  const spokes = opts.spokes ?? 0;
  if (spokes > 0) {
    const step = (Math.PI * 2) / spokes;
    const spokeWidth = step * 0.30;
    const cutInner = Math.max(hub + 0.05, pitchRadius * 0.36);
    const cutOuter = Math.min(pitchRadius * 0.86, rRoot - mod * 0.6);
    if (cutOuter > cutInner + 0.02) {
      for (let k = 0; k < spokes; k++) {
        const a0 = k * step + spokeWidth * 0.5;
        const a1 = (k + 1) * step - spokeWidth * 0.5;
        shape.holes.push(arcHole(cutInner, cutOuter, a0, a1, 14));
      }
    }
  }
  return shape;
}

/** extrude a 2D shape so that its plane lies in XZ and its thickness along +Y */
function extrudeShape(shape: THREE.Shape, depth: number, bevel: number, bevelSegments = 2): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments: 8,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, depth / 2, 0);
  return geo;
}

function makeGearMesh(
  teeth: number,
  pitchRadius: number,
  thickness: number,
  material: THREE.Material,
  spokes = 0,
): THREE.Mesh {
  const shape = gearShape(teeth, pitchRadius, MOD, { spokes });
  const geo = extrudeShape(shape, thickness, 0.015, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePinionMesh(leaves: number, pitchRadius: number, thickness: number, material: THREE.Material): THREE.Mesh {
  const shape = gearShape(leaves, pitchRadius, MOD, { hub: pitchRadius * 0.34 });
  const geo = extrudeShape(shape, thickness, 0.01, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** star-shaped union of circles: used for bridges / cock */
function blobShape(circles: { c: THREE.Vector2; r: number }[], segs = 160): THREE.Shape {
  const center = new THREE.Vector2(0, 0);
  for (const ci of circles) center.add(ci.c);
  center.divideScalar(Math.max(1, circles.length));

  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const d = new THREE.Vector2(Math.cos(a), Math.sin(a));
    let t = 0.002;
    for (const ci of circles) {
      const v = ci.c.clone().sub(center);
      const vt = v.dot(d);
      const perpSq = Math.max(0, v.lengthSq() - vt * vt);
      if (perpSq < ci.r * ci.r) {
        const tt = vt + Math.sqrt(ci.r * ci.r - perpSq);
        if (tt > t) t = tt;
      }
    }
    pts.push(new THREE.Vector2(center.x + d.x * t, center.y + d.y * t));
  }
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].y);
  shape.lineTo(pts[0].x, pts[0].y);
  return shape;
}

function bridgeMesh(circles: { c: THREE.Vector2; r: number }[], depth: number, yBase: number): THREE.Mesh {
  const geo = extrudeShape(blobShape(circles), depth, 0.15, 3);
  const mesh = new THREE.Mesh(geo, bridgeMat);
  mesh.position.set(0, yBase, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, segs = 20): THREE.Mesh {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, segs), material);
  mesh.position.copy(a).add(dir.clone().multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* =========================================================
   7. Build the movement
   ========================================================= */
const parts: THREE.Object3D[] = [];

function register(mesh: THREE.Mesh, name: string, x: number, y: number, z: number): THREE.Mesh {
  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.basePos = new THREE.Vector3(x, y, z);
  scene.add(mesh);
  parts.push(mesh);
  return mesh;
}

/* ---- main plate ---- */
const plate = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 2.5, 96, 1), plateMat);
plate.position.set(0, -1.25, 0);
register(plate, 'main_plate', 0, -1.25, 0);

/* ---- bridges & cock ---- */
const barrelBridge = bridgeMesh([{ c: pBarrel, r: 3.95 }], 0.6, BRIDGE_Y);
register(barrelBridge, 'barrel_bridge', 0, BRIDGE_Y, 0);

const trainBridge = bridgeMesh(
  [{ c: pCenter, r: 1.55 }, { c: pThird, r: 1.45 }, { c: pFourth, r: 1.45 }],
  0.6, BRIDGE_Y,
);
register(trainBridge, 'train_bridge', 0, BRIDGE_Y, 0);

/* engraved lettering on the train bridge (child so it explodes with it) */
const engraving = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 1.6), engravingMat);
engraving.name = 'bridge_engraving';
engraving.rotation.x = -Math.PI / 2;
engraving.position.set(0.1, 0.46, 3.1);
trainBridge.add(engraving);

const escapeBridge = bridgeMesh([{ c: pEscape, r: 1.55 }], 0.6, BRIDGE_Y);
register(escapeBridge, 'escape_bridge', 0, BRIDGE_Y, 0);

const balanceCock = bridgeMesh([{ c: pBalance, r: 2.0 }, { c: pCockRoot, r: 0.85 }], 0.5, COCK_Y);
register(balanceCock, 'balance_cock', 0, COCK_Y, 0);

const cockPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 5.6, 20), steel);
cockPillar.name = 'cock_pillar';
cockPillar.position.set(pCockRoot.x, -3.1, pCockRoot.y);
cockPillar.castShadow = true;
balanceCock.add(cockPillar);

/* ---- barrel assembly ---- */
const barrelShape = gearShape(TEETH.barrel, wheelR.barrel, MOD, { hub: 3.0 });
const barrelMesh = new THREE.Mesh(extrudeShape(barrelShape, 1.5, 0.03, 2), gilt);
barrelMesh.userData = { teeth: TEETH.barrel, pinion: 0, radius: wheelR.barrel, pinionRadius: 0 };
register(barrelMesh, 'mainspring_barrel', pBarrel.x, LEVEL_A, pBarrel.y);

const springPts: THREE.Vector3[] = [];
for (let i = 0; i <= 280; i++) {
  const u = i / 280;
  const r = 0.5 + 2.4 * u;
  const a = u * 6.5 * Math.PI * 2;
  springPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
}
const mainspringMesh = new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPts), 420, 0.055, 4, false),
  steelMatte,
);
register(mainspringMesh, 'mainspring', pBarrel.x, LEVEL_A, pBarrel.y);

const arborMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.9, 18), steel);
register(arborMesh, 'arbor', pBarrel.x, 1.95, pBarrel.y);

const ratchetMesh = makeGearMesh(30, 1.9, 0.5, blueSteel, 3);
register(ratchetMesh, 'ratchet_wheel', pBarrel.x, 3.45, pBarrel.y);

/* ---- train wheels + pinions ---- */
const centerWheel = makeGearMesh(TEETH.center, wheelR.center, WHEEL_TH, steel, 4);
centerWheel.userData = { teeth: TEETH.center, pinion: LEAVES.center, radius: wheelR.center, pinionRadius: pinionR.center };
register(centerWheel, 'center_wheel', pCenter.x, LEVEL_B, pCenter.y);

const centerPinion = makePinionMesh(LEAVES.center, pinionR.center, PINION_TH, steel);
register(centerPinion, 'center_pinion', pCenter.x, LEVEL_A, pCenter.y);

const thirdWheel = makeGearMesh(TEETH.third, wheelR.third, WHEEL_TH, steel, 4);
thirdWheel.userData = { teeth: TEETH.third, pinion: LEAVES.third, radius: wheelR.third, pinionRadius: pinionR.third };
register(thirdWheel, 'third_wheel', pThird.x, LEVEL_A, pThird.y);

const thirdPinion = makePinionMesh(LEAVES.third, pinionR.third, PINION_TH, steel);
register(thirdPinion, 'third_pinion', pThird.x, LEVEL_B, pThird.y);

const fourthWheel = makeGearMesh(TEETH.fourth, wheelR.fourth, WHEEL_TH, steel, 4);
fourthWheel.userData = { teeth: TEETH.fourth, pinion: LEAVES.fourth, radius: wheelR.fourth, pinionRadius: pinionR.fourth };
register(fourthWheel, 'fourth_wheel', pFourth.x, LEVEL_B, pFourth.y);

const fourthPinion = makePinionMesh(LEAVES.fourth, pinionR.fourth, PINION_TH, steel);
register(fourthPinion, 'fourth_pinion', pFourth.x, LEVEL_A, pFourth.y);

const escapeWheel = makeGearMesh(TEETH.escape, wheelR.escape, WHEEL_TH, steel, 3);
escapeWheel.userData = { teeth: TEETH.escape, pinion: LEAVES.escape, radius: wheelR.escape, pinionRadius: pinionR.escape };
register(escapeWheel, 'escape_wheel', pEscape.x, LEVEL_A, pEscape.y);

const escapePinion = makePinionMesh(LEAVES.escape, pinionR.escape, PINION_TH, steel);
register(escapePinion, 'escape_pinion', pEscape.x, LEVEL_B, pEscape.y);

/* ---- pallet fork ---- */
const forkShape = new THREE.Shape();
const forkPts: [number, number][] = [
  [1.95, 0.62], [1.55, 0.05], [1.95, -0.55], [0.30, -0.45],
  [-1.70, -0.40], [-2.35, -0.15], [-2.35, 0.15], [-1.70, 0.40], [0.30, 0.45],
];
forkShape.moveTo(forkPts[0][0], forkPts[0][1]);
for (let i = 1; i < forkPts.length; i++) forkShape.lineTo(forkPts[i][0], forkPts[i][1]);
forkShape.lineTo(forkPts[0][0], forkPts[0][1]);
forkShape.holes.push(circleHole(0.22, 18));
const slot = new THREE.Path();
slot.moveTo(-1.45, -0.11);
slot.lineTo(-2.05, -0.11);
slot.lineTo(-2.05, 0.11);
slot.lineTo(-1.45, 0.11);
slot.lineTo(-1.45, -0.11);
forkShape.holes.push(slot);

const forkMesh = new THREE.Mesh(extrudeShape(forkShape, 0.26, 0.02, 1), steel);
const forkBaseRot = -Math.atan2(pEscape.y - pFork.y, pEscape.x - pFork.x);
forkMesh.rotation.y = forkBaseRot;
register(forkMesh, 'pallet_fork', pFork.x, 1.32, pFork.y);
forkMesh.rotation.y = forkBaseRot;

const palletGeo = new THREE.BoxGeometry(0.34, 0.42, 0.2);
const palletA = new THREE.Mesh(palletGeo, rubyMat);
palletA.name = 'pallet_jewel_in';
palletA.position.set(1.62, -0.26, 0.44);
forkMesh.add(palletA);
const palletB = new THREE.Mesh(palletGeo, rubyMat);
palletB.name = 'pallet_jewel_out';
palletB.position.set(1.62, -0.26, -0.44);
forkMesh.add(palletB);

/* ---- balance wheel ---- */
const rimShape = new THREE.Shape();
rimShape.absarc(0, 0, 4.0, 0, Math.PI * 2, false);
const rimHole = new THREE.Path();
rimHole.absarc(0, 0, 3.35, 0, Math.PI * 2, true);
rimShape.holes.push(rimHole);
const balanceMesh = new THREE.Mesh(extrudeShape(rimShape, 0.45, 0.03, 1), gilt);
register(balanceMesh, 'balance_wheel', pBalance.x, 4.6, pBalance.y);

const armGeo = new THREE.BoxGeometry(2.75, 0.34, 0.28);
for (let i = 0; i < 2; i++) {
  const arm = new THREE.Mesh(armGeo, gilt);
  arm.name = `balance_arm_${i}`;
  arm.position.set(0, 0, 0);
  arm.rotation.y = (i * Math.PI) / 2;
  // arm extends from the staff out to the rim
  arm.position.set(Math.cos((i * Math.PI) / 2) * 1.75, 0, Math.sin((i * Math.PI) / 2) * 1.75);
  balanceMesh.add(arm);
}
const rimScrewGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.22, 14);
for (let i = 0; i < 4; i++) {
  const a = (i / 4) * Math.PI * 2 + 0.5;
  const sc = new THREE.Mesh(rimScrewGeo, blueSteel);
  sc.name = `balance_screw_${i}`;
  sc.position.set(Math.cos(a) * 3.68, 0.3, Math.sin(a) * 3.68);
  balanceMesh.add(sc);
}
const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4.6, 16), steel);
staff.name = 'balance_staff';
staff.position.set(0, -2.0, 0);
balanceMesh.add(staff);

/* roller + impulse pin reaching down to the fork's slot */
const rollAng = Math.atan2(pFork.y - pBalance.y, pFork.x - pBalance.x);
const impulsePts = new THREE.Vector2(Math.cos(rollAng) * 1.6, Math.sin(rollAng) * 1.6);
const impulsePin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.3, 12), steel);
impulsePin.name = 'impulse_pin';
impulsePin.position.set(impulsePts.x, -2.15, impulsePts.y);
balanceMesh.add(impulsePin);
const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.2, 20), steel);
roller.name = 'roller';
roller.position.set(0, -2.65, 0);
balanceMesh.add(roller);

/* ---- hairspring (flat blued spiral) ---- */
const hsPts: THREE.Vector3[] = [];
for (let i = 0; i <= 240; i++) {
  const u = i / 240;
  const r = 0.55 + (2.55 - 0.55) * u;
  const a = u * 7 * Math.PI * 2;
  hsPts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
}
const hairspringMesh = new THREE.Mesh(
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hsPts), 320, 0.045, 4, false),
  blueSteel,
);
register(hairspringMesh, 'hairspring', pBalance.x, 4.02, pBalance.y);

/* ---- stud (hairspring anchor) ---- */
const studMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), gold);
register(studMesh, 'stud', pBalance.x + 2.6, 4.15, pBalance.y);
const studPin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 12), steel);
studPin.name = 'stud_pin';
studPin.position.set(0, 0.95, 0);
studMesh.add(studPin);

/* ---- crown / stem / setting lever / click ---- */
const crownCenter = new THREE.Vector3(pCrown.x, 1.1, pCrown.y);
const stemEnd = new THREE.Vector3(pStemInner.x, 1.5, pStemInner.y);
const stemMesh = cylinderBetween(crownCenter, stemEnd, 0.32, steel, 18);
register(stemMesh, 'stem', 0, 0, 0);
stemMesh.position.copy(crownCenter).add(stemEnd).multiplyScalar(0.5);
(stemMesh.userData.basePos as THREE.Vector3).copy(stemMesh.position);

const crownMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.5, 32), gilt);
crownMesh.quaternion.setFromUnitVectors(
  new THREE.Vector3(0, 1, 0),
  crownCenter.clone().sub(stemEnd).normalize(),
);
register(crownMesh, 'crown', crownCenter.x, crownCenter.y, crownCenter.z);
crownMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), crownCenter.clone().sub(stemEnd).normalize());

const leverMesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.28, 0.6), steel);
leverMesh.rotation.y = 0.6;
register(leverMesh, 'setting_lever', -9.4, 1.95, -5.2);

const clickPos = pBarrel.clone().add(polar(1.9, 40));
const clickMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.55), steel);
clickMesh.rotation.y = -0.8;
register(clickMesh, 'click', clickPos.x, 3.55, clickPos.y);

/* ---- motion works ---- */
const cannonPinionMesh = makePinionMesh(7, 0.35, 0.55, steel);
register(cannonPinionMesh, 'cannon_pinion', pCenter.x, 3.55, pCenter.y);

const minuteWheelMesh = makeGearMesh(20, 1.0, 0.35, steel, 3);
register(minuteWheelMesh, 'minute_wheel', pMinuteWheel.x, 3.55, pMinuteWheel.y);
const minutePinionMesh = makePinionMesh(7, 0.35, 0.4, steel);
minutePinionMesh.name = 'minute_pinion';
minutePinionMesh.position.set(0, 0.42, 0);
minuteWheelMesh.add(minutePinionMesh);

const hourWheelMesh = makeGearMesh(20, 1.0, 0.35, gilt, 3);
register(hourWheelMesh, 'hour_wheel', pCenter.x, 4.15, pCenter.y);

/* ---- hands ---- */
function handMesh(len: number, width: number, thickness: number, material: THREE.Material, name: string): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(0.18, width * 0.42);
  s.lineTo(len, width * 0.34);
  s.lineTo(len + 0.9, 0);
  s.lineTo(len, -width * 0.34);
  s.lineTo(0.18, -width * 0.42);
  s.lineTo(0.18, width * 0.42);
  const m = new THREE.Mesh(extrudeShape(s, thickness, 0.01, 1), material);
  m.name = name;
  return m;
}

const hourHand = handMesh(6.5, 0.9, 0.22, steel, 'hour_hand');
register(hourHand, 'hour_hand', pCenter.x, 6.8, pCenter.y);

const minuteHand = handMesh(8.6, 0.8, 0.22, steel, 'minute_hand');
register(minuteHand, 'minute_hand', pCenter.x, 7.45, pCenter.y);

const secondHand = handMesh(4.6, 0.5, 0.18, blueSteel, 'second_hand');
register(secondHand, 'second_hand', pFourth.x, 8.05, pFourth.y);

/* ---- jewels (17, in golden chatons) ---- */
interface JewelSpec { x: number; y: number; z: number; }
const jewelSpecs: JewelSpec[] = [
  { x: pCenter.x, y: 3.14, z: pCenter.y },
  { x: pThird.x, y: 3.14, z: pThird.y },
  { x: pFourth.x, y: 3.14, z: pFourth.y },
  { x: pEscape.x, y: 3.14, z: pEscape.y },
  { x: pBarrel.x, y: 3.14, z: pBarrel.y },
  { x: pBalance.x, y: 6.44, z: pBalance.y },
  { x: pBarrel.x, y: 0.05, z: pBarrel.y },
  { x: pCenter.x, y: 0.05, z: pCenter.y },
  { x: pThird.x, y: 0.05, z: pThird.y },
  { x: pFourth.x, y: 0.05, z: pFourth.y },
  { x: pEscape.x, y: 0.05, z: pEscape.y },
  { x: pFork.x, y: 0.05, z: pFork.y },
  { x: pBalance.x, y: 0.05, z: pBalance.y },
  { x: pCenter.x, y: 3.75, z: pCenter.y },
  { x: pMinuteWheel.x, y: 3.85, z: pMinuteWheel.y },
  { x: pCenter.x, y: 4.45, z: pCenter.y },
  { x: pBalance.x + 1.0, y: 4.0, z: pBalance.y + 1.0 },
];

jewelSpecs.forEach((sp, i) => {
  const jewel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 22), rubyMat);
  const chaton = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.11, 10, 26), gold);
  chaton.name = `chaton_${i + 1}`;
  chaton.rotation.x = Math.PI / 2;
  chaton.position.y = 0;
  jewel.add(chaton);
  register(jewel, `jewel_${i + 1}`, sp.x, sp.y, sp.z);
});

/* ---- screws (heat-blued, slotted) ---- */
const screwSpecs: { x: number; z: number; y: number }[] = [
  { x: -0.75, z: 0.75, y: 3.18 },
  { x: -1.55, z: 4.65, y: 3.18 },
  { x: 0.95, z: 5.95, y: 3.18 },
  { x: 4.55, z: 0.92, y: 3.18 },
  { x: -2.9, z: 0.45, y: 3.18 },
  { x: 8.4, z: -2.95, y: 6.45 },
  { x: 6.3, z: -4.9, y: 6.45 },
  { x: -5.0, z: -2.05, y: 3.18 },
];

screwSpecs.forEach((sp, i) => {
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.34, 20), blueSteel);
  const slotMesh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.09, 0.13), darkSlot);
  slotMesh.name = `screw_slot_${i + 1}`;
  slotMesh.position.y = 0.16;
  slotMesh.rotation.y = ((i * 41) % 180 * Math.PI) / 180;
  head.add(slotMesh);
  register(head, `screw_${i + 1}`, sp.x, sp.y, sp.z);
});

/* =========================================================
   8. Labels
   ========================================================= */
function makeSprite(text: string): THREE.Sprite {
  const w = 640;
  const h = 96;
  const g = ctx2d(w, h);
  g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,12,18,0.72)';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(220,190,130,0.5)';
  g.lineWidth = 2;
  g.strokeRect(1, 1, w - 2, h - 2);
  g.fillStyle = '#f3d8a8';
  g.font = 'bold 44px Helvetica, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(g.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(8.6, 1.3, 1);
  sprite.renderOrder = 10;
  return sprite;
}

const labelData: { text: string; pos: THREE.Vector2 }[] = [
  { text: 'Mainspring barrel', pos: pBarrel },
  { text: 'Center wheel', pos: pCenter },
  { text: 'Third wheel', pos: pThird },
  { text: 'Fourth wheel', pos: pFourth },
  { text: 'Escape wheel', pos: pEscape },
  { text: 'Pallet fork', pos: pFork },
  { text: 'Balance wheel', pos: pBalance },
  { text: 'Hairspring', pos: pBalance.clone().add(polar(2.8, 70)) },
  { text: 'Crown & stem', pos: pCrown },
  { text: 'Train bridge', pos: pFourth.clone().add(new THREE.Vector2(-2.5, 2.5)) },
  { text: 'Balance cock', pos: pBalance.clone().add(polar(3.6, -30)) },
  { text: 'Main plate (perlage)', pos: new THREE.Vector2(-10, 8) },
  { text: 'Ruby jewels', pos: pCenter.clone().add(new THREE.Vector2(4.5, -2.5)) },
];

labelData.forEach((ld, i) => {
  const sprite = makeSprite(ld.text);
  sprite.position.set(ld.pos.x, 11.5 + (i % 3) * 1.6, ld.pos.y);
  scene.add(sprite);
});

/* =========================================================
   9. Simulation clock
   ========================================================= */
function stateAt(t: number): WatchState {
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2 * Math.PI * Math.sin(2 * Math.PI * 2.5 * t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * ((2 * Math.PI) / 30);
  const fourth = (2 * Math.PI * tau) / 60;
  const third = (-fourth * LEAVES.fourth) / TEETH.third;
  const center = (2 * Math.PI * tau) / 3600;
  const barrel = (-center * LEAVES.center) / TEETH.barrel;
  const second = fourth;
  const minute = center;
  const hour = minute / 12;
  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}

/* =========================================================
   10. Apply angles
   ========================================================= */
function updateScene(t: number): void {
  const s = stateAt(t);

  barrelMesh.rotation.y = s.barrel + phase[0];
  mainspringMesh.rotation.y = s.barrel + phase[0];
  arborMesh.rotation.y = s.barrel + phase[0];
  ratchetMesh.rotation.y = s.barrel + phase[0];

  centerWheel.rotation.y = s.center + phase[1];
  centerPinion.rotation.y = s.center + phase[1];
  thirdWheel.rotation.y = s.third + phase[2];
  thirdPinion.rotation.y = s.third + phase[2];
  fourthWheel.rotation.y = s.fourth + phase[3];
  fourthPinion.rotation.y = s.fourth + phase[3];
  escapeWheel.rotation.y = s.escape + phase[4];
  escapePinion.rotation.y = s.escape + phase[4];

  forkMesh.rotation.y = forkBaseRot + s.pallet;
  balanceMesh.rotation.y = s.balance;

  const breath = s.balance / (1.2 * Math.PI); // -1 .. 1
  hairspringMesh.scale.set(1 + 0.07 * breath, 1, 1 + 0.07 * breath);
  hairspringMesh.rotation.y = s.balance * 0.12;

  cannonPinionMesh.rotation.y = s.center + phase[1];
  minuteWheelMesh.rotation.y = -(s.center + phase[1]) * 0.35;
  hourWheelMesh.rotation.y = s.hour;

  hourHand.rotation.y = s.hour;
  minuteHand.rotation.y = s.minute;
  secondHand.rotation.y = s.second;
}

/* =========================================================
   11. Exploded view
   ========================================================= */
function applyExplode(f: number): void {
  const t = Math.max(0, Math.min(1, f));
  for (let i = 0; i < parts.length; i++) {
    const obj = parts[i];
    const base = obj.userData.basePos as THREE.Vector3 | undefined;
    if (!base) continue;
    const r = Math.hypot(base.x, base.z);
    let dx: number;
    let dz: number;
    if (r > 0.2) {
      dx = base.x / r;
      dz = base.z / r;
    } else {
      const a = i * 2.399963;
      dx = Math.cos(a);
      dz = Math.sin(a);
    }
    const push = 6 + 4 * (i % 3) + r * 0.55;
    const lift = 1.2 + 1.6 * (i % 4);
    obj.position.set(
      base.x + dx * push * t,
      base.y + lift * t,
      base.z + dz * push * t,
    );
  }
}

let explodeF = 0;
let explodeTarget = 0;
let explodeAnimating = false;

function explode(f: number): void {
  explodeF = Math.max(0, Math.min(1, f));
  explodeAnimating = false;
  applyExplode(explodeF);
}

/* =========================================================
   12. Watch API
   ========================================================= */
let simTime = 0;

const watch: WatchAPI = {
  parts,
  paused: false,
  reset(): void {
    simTime = 0;
    updateScene(0);
  },
  step(dt: number): void {
    simTime += dt;
  },
  state(): WatchState {
    return stateAt(simTime);
  },
  explode,
};

/* =========================================================
   13. UI: explode button + key
   ========================================================= */
const button = document.createElement('button');
button.textContent = 'Explode view  (E)';
button.style.position = 'fixed';
button.style.left = '16px';
button.style.bottom = '16px';
button.style.padding = '10px 16px';
button.style.font = 'bold 14px Helvetica, Arial, sans-serif';
button.style.color = '#ffe2b0';
button.style.background = 'rgba(20,24,34,0.85)';
button.style.border = '1px solid rgba(230,200,140,0.55)';
button.style.borderRadius = '6px';
button.style.cursor = 'pointer';
button.style.letterSpacing = '0.08em';
button.addEventListener('click', () => {
  explodeTarget = explodeTarget > 0.5 ? 0 : 1;
  explodeAnimating = true;
});
document.body.appendChild(button);

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'e' || e.key === 'E') {
    explodeTarget = explodeTarget > 0.5 ? 0 : 1;
    explodeAnimating = true;
  } else if (e.key === 'p' || e.key === 'P') {
    watch.paused = !watch.paused;
  }
});

/* =========================================================
   14. Resize
   ========================================================= */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* =========================================================
   15. Render loop
   ========================================================= */
updateScene(0);
applyExplode(0);

let lastFrame = performance.now();
let readyFlag = false;

renderer.setAnimationLoop(() => {
  const now = performance.now();
  let dt = (now - lastFrame) / 1000;
  lastFrame = now;
  if (dt < 0 || !isFinite(dt)) dt = 0;

  if (!watch.paused) watch.step(Math.min(dt, 1 / 30));
  updateScene(simTime);

  if (explodeAnimating) {
    const d = explodeTarget - explodeF;
    const move = Math.min(Math.abs(d), dt * 1.6);
    explodeF += Math.sign(d) * move;
    if (Math.abs(explodeTarget - explodeF) < 0.002) {
      explodeF = explodeTarget;
      explodeAnimating = false;
    }
    applyExplode(explodeF);
  }

  controls.update();
  renderer.render(scene, camera);

  if (!readyFlag) {
    readyFlag = true;
    (window as any).__ready = true;
  }
});

/* =========================================================
   16. Expose for testing
   ========================================================= */
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
(window as any).__watch = watch;
```