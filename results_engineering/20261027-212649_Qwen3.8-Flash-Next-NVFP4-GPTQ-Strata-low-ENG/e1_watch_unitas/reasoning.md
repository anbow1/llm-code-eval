This is a complex request to build a working model of an ETA/Unitas 6497-1 watch movement in Three.js. Let me break down what I need to create:

1. **Scene setup**: WebGLRenderer, camera, lighting, environment map, ACES tone mapping
2. **Materials**: PBR materials with procedural textures (Geneva stripes, perlage, bevels, blued screws, etc.)
3. **Wheels with actual teeth**: Using THREE.Shape with teeth extruded, pinions as separate parts
4. **Gear train**: barrel -> center -> third -> fourth -> escape with correct ratios
5. **Escapement**: pallet fork, escape wheel, balance wheel, hairspring
6. **Motion works**: cannon pinion, minute wheel, hour wheel
7. **Parts list**: 40+ named meshes including 17 jewels
8. **Timing system**: exact formulas for state(), step(), reset(), paused, explode()
9. **Exploded view**: animate parts away from center
10. **Labels**: text near parts
11. **Controls**: orbit controls, key E for explode, button

Let me plan the gear train:
- barrel: 72 teeth, radius = module * 72 / 2
- center wheel: 80 teeth, pinion 12 teeth
- third wheel: 75 teeth, pinion 10 teeth
- fourth wheel: 80 teeth, pinion 10 teeth
- escape wheel: 15 teeth, pinion 8 teeth (actually escape wheel has no pinion in traditional sense, but for the ratio: fourth.teeth / escape.pinion = 10, so escape.pinion = 8)

Wait, let me re-read: "escape wheel 15 teeth, fourth.teeth / escape.pinion = 10"
So fourth has 80 teeth, escape.pinion = 8. That gives 80/8 = 10. ✓

And (center.teeth / third.pinion) * (third.teeth / fourth.pinion) = 60
(80/10) * (75/10) = 8 * 7.5 = 60. ✓

barrel.teeth / center.pinion: 72/12 = 6. That's between 4 and 10. ✓

Module = 0.1 mm:
- barrel radius = 0.1 * 72 / 2 = 3.6 mm
- center wheel radius = 0.1 * 80 / 2 = 4.0 mm, center pinion radius = 0.1 * 12 / 2 = 0.6 mm
- third wheel radius = 0.1 * 75 / 2 = 3.75 mm, third pinion radius = 0.1 * 10 / 2 = 0.5 mm
- fourth wheel radius = 0.1 * 80 / 2 = 4.0 mm, fourth pinion radius = 0.1 * 10 / 2 = 0.5 mm
- escape wheel radius = 0.1 * 15 / 2 = 0.75 mm, escape pinion radius = 0.1 * 8 / 2 = 0.4 mm

Wait, module 0.1mm gives very small gears. For a watch that's about 42mm diameter, these radii seem too small. Let me reconsider.

Actually, looking at real watch movements, the module for fine gears is typically around 0.08-0.12mm for fine wheels. The barrel is much larger than what module would suggest because it's not a gear train wheel in the same sense - it has its own module.

Let me use different modules for different meshes:
- Barrel to center pinion: use a coarser module
- Center wheel to third pinion: fine module
- etc.

Actually, the problem says "Use one tooth size (module) per mesh, e.g. 0.1 mm: radius = module * teeth / 2." So each mesh pair has its own module.

For the barrel to center pinion mesh, the barrel needs to be reasonably large. A 6497 barrel is about 11mm diameter. So radius ~5.5mm. With 72 teeth: module = 2*5.5/72 ≈ 0.153. Let's use 0.15.

For center wheel to third pinion: center wheel radius = 0.15 * 80 / 2 = 6.0mm. That's a bit large but OK.
Third pinion radius = 0.15 * 10 / 2 = 0.75mm.

Hmm, actually let me reconsider. In a real watch, different gear meshes can have different modules. Let me just scale things to look good.

Actually, let me re-read: "Use one tooth size (module) per mesh, e.g. 0.1 mm". I think "per mesh" means per gear-mesh pair. Let me use module 0.1mm for the fine train (center-to-third, third-to-fourth, fourth-to-escape) and a larger module for barrel-to-center.

Let me use:
- Barrel-center mesh: module 0.15 → barrel radius = 0.15*72/2 = 5.4, center pinion radius = 0.15*12/2 = 0.9
- Center-third mesh: module 0.1 → center wheel radius = 0.1*80/2 = 4.0, third pinion radius = 0.1*10/2 = 0.5
- Third-fourth mesh: module 0.1 → third wheel radius = 0.1*75/2 = 3.75, fourth pinion radius = 0.1*10/2 = 0.5
- Fourth-escape mesh: module 0.1 → fourth wheel radius = 0.1*80/2 = 4.0, escape pinion radius = 0.1*8/2 = 0.4

Wait, but the center wheel has a pinion (driven by barrel) and a wheel (drives third pinion). The pinion radius should match what the barrel mesh uses, and the wheel radius should match what the third pinion mesh uses.

So:
- center.pinionRadius = 0.9 (from barrel mesh, module 0.15)
- center.radius = 4.0 (from center-third mesh, module 0.1)

Placement:
- barrel position to center position: barrel.radius + center.pinionRadius = 5.4 + 0.9 = 6.3
- center position to third position: center.radius + third.pinionRadius = 4.0 + 0.5 = 4.5
- third position to fourth position: third.radius + fourth.pinionRadius = 3.75 + 0.5 = 4.25
- fourth position to escape position: fourth.radius + escape.pinionRadius = 4.0 + 0.4 = 4.4

These are in mm. The whole movement is about 42mm in diameter. Let me scale up for visibility. Actually, the problem says "1 unit = 1 mm" so I should work in mm scale. The camera will be close.

Let me place the wheels:
- Center at origin (0, 0, 0)
- Barrel: at distance 6.3 from center. Let's put it at angle ~200° (slightly to the left-back)
  Position: (-6.3*cos(20°), 0, -6.3*sin(20°)) ≈ (-5.92, 0, -2.15)
  
Actually, let me think about the real 6497 layout. The barrel is at the top, center is in the middle, going train goes clockwise (viewed from below). Let me use a simplified layout:

- Barrel: at (0, 0, -6.3) (above center in x-z plane)
- Center: at (0, 0, 0)
- Third: at (4.5, 0, 0) (to the right)
- Fourth: at (4.5 + 4.25, 0, 0) = (8.75, 0, 0) — hmm that's getting far

Let me make the layout more like a real watch with some angles:
- Center at (0, 0, 0)
- Barrel at (0, 0, -6.3) 
- Third at angle from center, let's say at (-4.5*sin(60°), 0, 4.5*cos(60°)) = (-3.9, 0, 2.25)

Actually, let me just use reasonable positions. I'll scale everything up by a factor for visibility.

Wait, the problem says 1 unit = 1mm. A 6497 is about 42mm diameter. So I need to position the camera very close (like 30-50mm away) with appropriate near/far planes.

Let me simplify the layout to fit in ~20mm radius:
- Center wheel at (0, 0, 0)
- Barrel at (0, 0, -6.3) — distance 6.3 from center ✓
- Third wheel: needs to be at distance 4.5 from center wheel. Let's put it at (3.9, 0, 2.25) — dist = sqrt(3.9² + 2.25²) = sqrt(15.21+5.06) = sqrt(20.27) ≈ 4.5 ✓
- Fourth wheel: distance 4.25 from third. Let's put it at (7.5, 0, 4.0) — dist from third = sqrt((7.5-3.9)² + (4.0-2.25)²) = sqrt(12.96 + 3.06) = sqrt(16.02) ≈ 4.0. Hmm, need 4.25. Let me adjust.

Let me use a different approach - just place them in a line-ish path:
- Center: (0, 0, 0)
- Third: (4.5, 0, 0) — distance 4.5 from center ✓
- Fourth: (4.5 + 4.25*cos(30°), 0, 4.25*sin(30°)) = (4.5 + 3.68, 0, 2.13) = (8.18, 0, 2.13)
  Distance from third: sqrt(3.68² + 2.13²) = sqrt(13.54 + 4.54) = sqrt(18.08) ≈ 4.25 ✓
- Escape: distance 4.4 from fourth. Let's put it at (8.18 + 4.4*cos(-60°), 0, 2.13 + 4.4*sin(-60°))
  = (8.18 + 2.2, 0, 2.13 - 3.81) = (10.38, 0, -1.68)
  
Hmm, this is getting spread out. Let me use a more compact layout with tighter angles.

Actually, for a 6497 the train goes roughly: barrel (top), center (middle), third (lower-left), fourth (lower-right), escape (right). Let me try:

Scale: Let me multiply all by 2 for better visibility (so 1 unit = 0.5mm effectively, or I'll just say the movement is bigger). Actually no, let me keep 1 unit = 1mm and just make the camera work well.

Let me use a module of 0.2mm instead of 0.1mm to make things bigger:
- barrel radius = 0.2*72/2 = 7.2, center pinion radius = 0.2*12/2 = 1.2
- center wheel radius = 0.2*80/2 = 8.0, third pinion radius = 0.2*10/2 = 1.0
- third wheel radius = 0.2*75/2 = 7.5, fourth pinion radius = 0.2*10/2 = 1.0
- fourth wheel radius = 0.2*80/2 = 8.0, escape pinion radius = 0.2*8/2 = 0.8

These are getting large (8mm radius = 16mm diameter). For a 42mm movement, a center wheel of 16mm diameter is too big. Let me use different modules:

Actually, you know what, let me just use module 0.1 as stated and accept that the gears are small. I'll position the camera appropriately.

- barrel radius = 0.1*72/2 = 3.6
- center pinion radius = 0.1*12/2 = 0.6
- center wheel radius = 0.1*80/2 = 4.0
- third pinion radius = 0.1*10/2 = 0.5
- third wheel radius = 0.1*75/2 = 3.75
- fourth pinion radius = 0.1*10/2 = 0.5
- fourth wheel radius = 0.1*80/2 = 4.0
- escape pinion radius = 0.1*8/2 = 0.4

Distances between axes:
- barrel to center: 3.6 + 0.6 = 4.2
- center to third: 4.0 + 0.5 = 4.5
- third to fourth: 3.75 + 0.5 = 4.25
- fourth to escape: 4.0 + 0.4 = 4.4

OK these are reasonable. The whole layout fits in about 12mm radius.

Now let me place them (x-z plane, movement is horizontal):
- Center: (0, 0, 0)
- Barrel: (0, 0, -4.2) [above/behind center]
- Third: (4.5*cos(-30°), 0, 4.5*sin(-30°)) = (3.9, 0, -2.25) [to the lower-right]

Wait, I need to be careful about angles for meshing. For gear meshing to work visually, the tooth positions need to align. I'll handle that with initial rotation offsets.

Let me place:
- Center: (0, 0, 0)
- Barrel: (-2.1, 0, -3.63) — at angle 240° from center, distance 4.2
- Third: (3.9, 0, -2.25) — at angle -30° from center, distance 4.5
- Fourth: (3.9 + 4.25*cos(60°), 0, -2.25 + 4.25*sin(60°)) = (3.9+2.13, 0, -2.25+3.68) = (6.03, 0, 1.43)
- Escape: need to be at distance 4.4 from fourth. In a real watch the escape is near the fourth. Let me put it at (6.03 + 4.4*cos(150°), 0, 1.43 + 4.4*sin(150°)) = (6.03-3.81, 0, 1.43+2.2) = (2.22, 0, 3.63)

Hmm, that puts the escape wheel back near center. Let me try a different layout.

Actually for a 6497 layout (viewed from below, where the train is):
- Barrel: top (negative z in our coordinate)
- Center: center
- Third: left
- Fourth: bottom
- Escape: right (near the balance)

Let me use:
- Center: (0, 0, 0)
- Barrel: (0, 0, -4.2)
- Third: (-4.5, 0, 0) [to the left]
- Fourth: (-4.5 + 4.25*cos(60°), 0, 4.25*sin(60°)) = (-4.5+2.13, 0, 3.68) = (-2.37, 0, 3.68)
  Wait, distance from third should be 4.25. sqrt((-2.37-(-4.5))² + (3.68)²) = sqrt(2.13² + 3.68²) = sqrt(4.54+13.54) = sqrt(18.08) ≈ 4.25 ✓
- Escape: from fourth, distance 4.4. Let's go right: (-2.37 + 4.4*cos(-30°), 0, 3.68 + 4.4*sin(-30°)) = (-2.37+3.81, 0, 3.68-2.2) = (1.44, 0, 1.48)
  Distance from fourth: sqrt((1.44-(-2.37))² + (1.48-3.68)²) = sqrt(3.81² + 2.2²) = sqrt(14.52+4.84) = sqrt(19.36) ≈ 4.4 ✓

OK let me use this layout. The balance will be near the escape wheel.

Balance position: typically above the escape wheel, maybe 5mm away. Let's put it at (1.44, 0, 1.48 + 5) = (1.44, 0, 6.48). Actually in a real watch the balance is close. Let me put it at about 4mm from escape: (1.44, 0, 1.48 + 4) = (1.44, 0, 5.48). Hmm, or just (3.0, 0, 3.5).

Now let me think about the tooth meshing. For two gears to mesh properly visually, when they are at the contact point, the teeth need to interleave. The angular offset of each gear relative to the line connecting their centers determines this.

For a gear with N teeth at angle θ from the connecting line, the tooth positions are at θ + 2πk/N for k=0..N-1. For meshing, a tooth of one gear should fit between two teeth of the other.

The phase offset for proper meshing: if gear A has its center at angle α from gear B (measuring the angle of the line from B to A), then gear A needs a phase offset such that a tooth valley aligns with a tooth of B.

This is getting complex. For visual purposes, I'll add a per-wheel phase offset that I compute to make meshing look right. Or I can just compute: for two meshing gears, the tooth angular pitch is 2π/N. At the contact point, we want a tooth of one to align with a gap of the other. So the phase offset of gear A = (angle of contact point from A's center) + half tooth pitch.

Actually, let me just set initial phase offsets empirically or compute them:
- For gear pair (A, B) where B is driven by A:
  - The contact direction from A to B: angle = atan2(Bz - Az, Bx - Ax)
  - For A: a tooth tip should point toward B → phase_A = contact_angle (so a tooth aligns with the mesh point)
  - For B: a tooth gap should point toward A → phase_B = contact_angle + π/N_B (half tooth pitch of B)

I'll implement this as a phase offset stored in userData.

Now, for the gear geometry: I need to create a gear shape. A gear is a circle with teeth. Each tooth is a trapezoidal bump. Let me create a function that generates a gear shape.

```typescript
function createGearShape(teeth: number, pitchRadius: number, module: number): THREE.Shape {
    const shape = new THREE.Shape();
    const addendum = module; // tooth height above pitch circle
    const dedendum = module * 1.25; // tooth depth below pitch circle
    const outerRadius = pitchRadius + addendum;
    const innerRadius = pitchRadius - dedendum;
    const toothAngle = (2 * Math.PI) / teeth;
    const halfTooth = toothAngle * 0.4; // tooth width at pitch circle
    
    // Start at the first tooth's leading edge on the root circle
    shape.moveTo(innerRadius * Math.cos(-halfTooth), innerRadius * Math.sin(-halfTooth));
    
    for (let i = 0; i < teeth; i++) {
        const angle = i * toothAngle;
        // Leading edge (from root to tip)
        shape.lineTo(outerRadius * Math.cos(angle - halfTooth * 0.5), outerRadius * Math.sin(angle - halfTooth * 0.5));
        // Tip
        shape.lineTo(outerRadius * Math.cos(angle + halfTooth * 0.5), outerRadius * Math.sin(angle + halfTooth * 0.5));
        // Trailing edge (from tip to root)
        shape.lineTo(innerRadius * Math.cos(angle + halfTooth), innerRadius * Math.sin(angle + halfTooth));
        // Root to next tooth
        const nextAngle = (i + 1) * toothAngle;
        shape.lineTo(innerRadius * Math.cos(nextAngle - halfTooth), innerRadius * Math.sin(nextAngle - halfTooth));
    }
    shape.closePath();
    return shape;
}
```

For spokes (crossings), I'll create the gear shape as a ring (outer with teeth, inner circle for hub) and add spoke paths.

Actually, THREE.Shape supports holes. So I can make the gear with an outer toothed profile and inner holes for the spokes. Let me create a gear with 4-5 spoke holes.

For the hairspring: an Archimedean spiral. I'll create it as a tube geometry following a spiral path.

For the balance wheel: a ring (torus-like) with spokes.

For the pallet fork: a figure-8 or anchor shape.

Let me think about the overall structure of the code:

1. Setup: renderer, scene, camera, lights, env map, controls
2. Materials: procedural textures for different finishes
3. Gear creation function
4. Build all parts and position them
5. Build the timing system
6. Render loop with step()
7. Exploded view
8. Labels
9. UI (button, key handler)

This is going to be a very long file. Let me write it carefully.

For the procedural textures:
- Geneva stripes: parallel curved bands on a canvas
- Perlage: overlapping circles
- Blued screws: dark blue material with slotted head
- Ruby jewels: red with transmission/clearcoat

Let me start coding this. I'll need to be careful about:
- TypeScript strict mode compliance
- All the parts being properly named and stored
- The timing formulas being exact
- The gear ratios being correct

Let me also think about the explode function. Each part has a "base position" (when assembled) and an "explode direction" (normalized vector from center). When explode(f) is called, each part moves to basePosition + f * explodeDirection * someDistance.

For the labels, I'll use canvas textures on sprite objects.

Let me also make sure I have at least 40 parts:
1. mainspring_barrel
2. mainspring
3. arbor
4. center_wheel
5. center_pinion
6. third_wheel
7. third_pinion
8. fourth_wheel
9. fourth_pinion
10. escape_wheel
11. escape_pinion
12. pallet_fork
13. balance_wheel
14. hairspring
15. balance_cock
16. stud
17. crown
18. stem
19. setting_lever
20. click
21. ratchet_wheel
22. cannon_pinion
23. hour_wheel
24. minute_wheel
25-41. jewel_1 through jewel_17
42. main_plate
43. train_bridge
44. balance_bridge (balance_cock, already counted)
45. Some screws (4-6 screws)

That should be more than 40.

Let me write the code now. I'll aim for completeness and correctness.

Actually, let me reconsider the scale. With module 0.1, the gears are tiny (a few mm radius). For a camera at ~30-50mm distance, this should work with appropriate near/far planes. The movement is about 20mm in radius, so the camera should be about 25-40mm away.

Let me also think about the Y axis. The movement lies in x-z plane, axes are vertical (y). So:
- Main plate is at y=0 (or slightly below)
- Wheels are above the plate (y > 0) at various heights
- Bridges are above the wheels
- The camera looks down from above

Let me assign Y positions:
- Main plate: y = 0
- Wheels (train): y = 1.5 (bottom of wheel at plate level, center at 1.5)
- Pinions: same height as their wheel
- Bridges: y = 3
- Balance: y = 2 (lower than train wheels)
- Hands: y = 4 (above everything)

Actually, in a watch, the going train is on the top side of the main plate, the bridges hold the upper pivots. Let me set:
- Main plate: y = 0 (thin plate, extends from y=0 to y=0.5)
- Wheel bottom pivots sit in jewels at y = 0.5
- Wheels centered at y = 1.5 (thickness of wheel ~0.3, so top at y=1.65)
- Bridge at y = 2.5
- Upper pivots in bridge jewels at y = 2.5

For the camera, looking from above at about 45° angle, at distance ~30mm.

Let me now write the full code. This will be long but I'll try to make it complete and working.

One important thing: the tooth phase offset for meshing. When I compute state(), I get the rotation angle for each wheel. The initial phase offset (to make teeth mesh visually) should be incorporated into the rotation.

For gear pair (A drives B):
- Contact angle from A to B: φ_AB = atan2(Bz-Az, Bx-Ax)
- For A: at the contact point, a tooth should be pointing toward B. A tooth is at angle (rotation + phaseA). So we need rotation + phaseA = φ_AB when a tooth is at the contact. Since rotation increases with time, and we want a tooth at the contact point: phaseA = φ_AB (mod tooth pitch of A)
- For B: at the contact point, a gap should face A. The angle from B to A is φ_AB + π. A gap center is at angle (rotation + phaseB + halfPitchB). So: rotation + phaseB + halfPitchB = φ_AB + π, giving phaseB = φ_AB + π - halfPitchB.

But since B rotates in the opposite direction to A, and their angular velocities are related by the ratio, I need to ensure the phase is consistent over time.

For two meshing gears:
- ω_A * N_A = ω_B * N_B (linear velocity at pitch point must match)
- If A rotates by Δθ_A, B rotates by -Δθ_A * N_A / N_B (opposite direction)

The phase relationship: if A's teeth are at angles θ_A + 2πk/N_A and B's teeth are at angles θ_B + 2πm/N_B, then at the contact point:
- A has a tooth when (θ_A + phase_A) mod (2π/N_A) equals the contact direction from A
- B has a gap when (θ_B + phase_B) mod (2π/N_B) equals (contact direction from A + π) + half tooth pitch of B

For the continuous rotation to maintain meshing, we need:
- θ_B = -θ_A * (N_A/N_B) + constant (which is what our formula gives: third = -fourth * fourth.teeth/third.teeth, etc.)

The constant (initial phase) needs to be set so that at t=0, the teeth mesh. I'll compute a phase offset for each gear and add it to the rotation.

Actually, let me simplify. I'll compute the phase offset as:

For the contact point between gear A and gear B (where the line connecting their centers crosses the pitch circle):
- angle from A to B: φ = atan2(Bz-Az, Bx-Ax)
- A's phase offset: the angle that puts a tooth tip at the contact point. If teeth are at angles (i * 2π/N_A) relative to the gear's local frame, then we need the gear rotation + phase to make one of these angles equal φ. So phase_A = φ (assuming the first tooth of the shape is at angle 0).
- B's phase offset: we need a gap (between teeth) at the contact point. The gap is at angle φ+π from B's center. Between teeth means offset by half tooth pitch: phase_B = φ + π + π/N_B.

I'll store these as `meshPhase` in userData and add them to the rotation.

OK, I think I have enough planned. Let me write the code now.

Actually, one more consideration: for the extruded gear, I need to use THREE.ExtrudeGeometry with the shape. The depth will be small (0.2-0.4mm for wheels).

For spokes: I'll create the gear as a solid toothed ring with holes for the spokes. The Shape can have holes.

Let me write a function to create a gear with spokes:

```typescript
function createGearWithSpokes(teeth: number, pitchRadius: number, mod: number, spokeCount: number, hubRadius: number, thickness: number): THREE.Mesh {
    // Create outer toothed shape
    const shape = createGearShape(teeth, pitchRadius, mod);
    
    // Add holes for spokes (pie-slice shapes between hub and rim)
    const rimInnerRadius = pitchRadius - mod * 1.25 - 0.3; // inner edge of rim
    const holeCount = spokeCount;
    const spokeWidth = (2 * Math.PI) / holeCount * 0.2; // angular width of spoke
    
    for (let i = 0; i < holeCount; i++) {
        const hole = new THREE.Path();
        const startAngle = i * (2 * Math.PI / holeCount) + spokeWidth / 2;
        const endAngle = (i + 1) * (2 * Math.PI / holeCount) - spokeWidth / 2;
        
        hole.absarc(0, 0, rimInnerRadius, startAngle, endAngle, false);
        hole.absarc(0, 0, hubRadius, endAngle, startAngle, true);
        // Close the path
        // Actually need to use lineTo or closePath properly
    }
    shape.holes.push(hole);
}
```

Hmm, THREE.Shape with arcs for holes can be tricky. Let me use a simpler approach: create the shape as a series of points.

Actually, for the spokes, I can just cut circular/arc-shaped holes in the gear disc. Let me use a simpler approach: create the gear tooth profile as the outer boundary, then add holes that are roughly triangular or circular.

For simplicity and visual appeal, I'll make the holes as arc segments:
- Inner radius (hub): small circle
- Outer radius: just inside the tooth root
- Each hole spans from startAngle to endAngle (with gaps between for spokes)

Let me use a path for each hole:
```
path = new THREE.Path();
path.absarc(0, 0, outerR, a1, a2, false);  // outer arc
path.absarc(0, 0, innerR, a2, a1, true);   // inner arc (reverse)
path.closePath();
```

This should work in Three.js. Let me verify: `absarc` adds an arc to the path. Two absarc calls with closePath should create a closed ring segment.

OK let me just write the whole thing now. I'll aim for correctness and visual quality.

For the environment map, I'll use RoomEnvironment from three/addons.

Let me structure the code:

```typescript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ... setup ...
// ... materials ...
// ... geometry helpers ...
// ... build parts ...
// ... timing system ...
// ... render loop ...
```

Let me also think about what RoomEnvironment needs. It generates a simple room-like environment for PMREMGenerator.

For the procedural textures, I'll create canvas-based textures:
1. Geneva stripes: draw parallel wavy/straight bands on a canvas
2. Perlage: draw overlapping circles
3. These go as bumpMap or map on MeshPhysicalMaterial

For blued screws: MeshPhysicalMaterial with color dark blue, metalness 1, roughness low.

For jewels: MeshPhysicalMaterial with color red, transmission 0.7, thickness 1.

Let me write the full code now. I'll try to keep it organized but it will be long.

One more thing: the problem says "No external assets". RoomEnvironment is from three/addons which should be bundled, so that's fine.

Let me also handle the `window.__watch` interface properly:

```typescript
(window as any).__watch = {
    parts: [...],
    paused: false,
    reset() { ... },
    step(dt: number) { ... },
    state(): object { ... },
    explode(f: number) { ... }
};
```

The key formulas:
- k = floor(5*t) — number of beats
- tau = k / 5 — time the train has been released for
- balance(t) = 1.2*PI * sin(2*PI*2.5*t)
- pallet(t) = 0.2 * (k%2===0 ? 1 : -1)
- escape(t) = -k * 2*PI/30
- fourth(t) = 2*PI * tau / 60
- third(t) = -fourth(t) * fourth.teeth / third.teeth  = -fourth(t) * 80/75
- center(t) = 2*PI * tau / 3600
- barrel(t) = -center(t) * center.pinion / barrel.teeth = -center(t) * 12/72
- second(t) = fourth(t)
- minute(t) = center(t)
- hour(t) = minute(t) / 12

Wait, let me re-read: "third(t) = -fourth(t) * fourth.pinion / third.teeth"
That's: third(t) = -fourth(t) * (80/75)? No wait: fourth.pinion = 10, third.teeth = 75.
So third(t) = -fourth(t) * 10/75 = -fourth(t) * 2/15

Hmm, that seems wrong for a gear ratio. Let me re-read...

"Each wheel drives the PINION of the next one"

So the train is:
- center wheel (teeth) drives third pinion (teeth)
- third wheel (teeth) drives fourth pinion (teeth)
- fourth wheel (teeth) drives escape pinion (teeth)

For meshing gears, if A's wheel drives B's pinion:
ω_B / ω_A = -A.teeth / B.pinionTeeth (opposite direction)

So:
- third.pinion is driven by center wheel: ω_third = -ω_center * center.teeth / third.pinion
  Wait no. "Each wheel drives the PINION of the next one". So center wheel drives third pinion. Third pinion is on the same axis as third wheel, so third wheel rotates with its pinion.
  
  ω_third = -ω_center * center.teeth / third.pinion = -ω_center * 80/10 = -8ω_center

- fourth.pinion is driven by third wheel: ω_fourth = -ω_third * third.teeth / fourth.pinion = -ω_third * 75/10 = -7.5ω_third = 60ω_center

- escape.pinion is driven by fourth wheel: ω_escape = -ω_fourth * fourth.teeth / escape.pinion = -ω_fourth * 80/8 = -10ω_fourth

So the ratio from center to escape is: 80/10 * 75/10 * 80/8 = 8 * 7.5 * 10 = 600.

And from the formula: (center.teeth / third.pinion) * (third.teeth / fourth.pinion) = 80/10 * 75/10 = 60 ✓

Now the timing formulas from the problem:
- third(t) = -fourth(t) * fourth.pinion / third.teeth

This means: ω_third = -ω_fourth * fourth.pinionTeeth / third.teeth = -ω_fourth * 10/75

Let me verify: if fourth rotates at ω_fourth, and fourth's wheel drives escape's pinion... wait, the formula says "third(t) = -fourth(t) * fourth.pinion / third.teeth"

So the relationship between third and fourth: they mesh as third.wheel drives fourth.pinion.
ω_fourth = -ω_third * third.teeth / fourth.pinion
Therefore: ω_third = -ω_fourth * fourth.pinion / third.teeth ✓

The formulas given are correct. Let me use them exactly as stated.

Now let me think about the barrel formula:
- barrel(t) = -center(t) * center.pinion / barrel.teeth
This means barrel.wheel drives center.pinion: ω_center = -ω_barrel * barrel.teeth / center.pinion
Therefore: ω_barrel = -ω_center * center.pinion / barrel.teeth ✓

Great. Now let me write the full code.

For the hairspring spiral, I'll parametrize it as:
r(θ) = a + b*θ (Archimedean spiral)

Where θ goes from 0 to about 10π (5 turns for a hairspring).

I'll create it as a TubeGeometry following the spiral path, or as a series of small segments.

For the balance wheel, I'll create a ring (torus segment or extruded annulus) with 2-3 spokes and a rim.

For the pallet fork, I'll create a simple shape: a central pivot with two arms ending in pallet jewels (ruby pins).

OK, I think I've planned enough. Let me write the code. It's going to be very long (probably 800-1200 lines) but I'll make it work.

Let me also think about what the camera setup should look like:
- Position: about (0, 25, 15) looking at (0, 1, 0) — from above and slightly in front
- FOV: about 40° for a slightly telephoto look
- Near: 1, Far: 200

And OrbitControls with target at (0, 1, 0).

For lighting:
- Key light: SpotLight or DirectionalLight from upper-left
- Fill light: softer light from the right
- Rim light: from behind/above

Let me finalize the code structure and write it. I'll focus on getting it to compile and work correctly.

Actually, I realize I should double check - the problem says the escape wheel has 15 teeth. Let me verify the tooth spacing: escape wheel with 15 teeth and pitch radius = module * 15/2. If module = 0.1, that's 0.75mm radius. That's really tiny. For visual purposes, maybe I should use a larger module for the escape wheel mesh.

The problem says "Use one tooth size (module) per mesh, e.g. 0.1 mm". So I can use different modules for different meshes. The escape wheel mesh (fourth wheel to escape pinion) could use module 0.1, making the escape wheel 0.75mm radius. That's very small.

Alternatively, I can use module 0.2 for the escape mesh:
- fourth wheel radius = 0.2 * 80/2 = 8.0 (too big if module was 0.1 for other meshes)

Hmm, actually each mesh pair has its own module. The constraint is:
- For the center-third mesh: center.radius + third.pinionRadius = distance, and these must be consistent with their respective modules.

Let me use:
- Barrel-center mesh: module = 0.12 → barrel.r = 4.32, center.pinion.r = 0.72
- Center-third mesh: module = 0.1 → center.r = 4.0, third.pinion.r = 0.5
- Third-fourth mesh: module = 0.1 → third.r = 3.75, fourth.pinion.r = 0.5
- Fourth-escape mesh: module = 0.1 → fourth.r = 4.0, escape.pinion.r = 0.4

With this:
- Center wheel radius = 4.0 (from center-third mesh)
- Center pinion radius = 0.72 (from barrel-center mesh)
- Third wheel radius = 3.75, pinion radius = 0.5
- Fourth wheel radius = 4.0, pinion radius = 0.5
- Escape wheel radius = 0.75, pinion radius = 0.4

The escape wheel at 0.75mm radius is tiny. In reality, escape wheels are bigger relative to their module. Let me use a bigger module for the escape:
- Fourth-escape mesh: module = 0.2 → fourth.r = 8.0 (conflicts!), escape.pinion.r = 0.8

The problem is that the fourth wheel's radius is determined by its mesh with the third (module 0.1, giving 4.0mm). If I change the module for the fourth-escape mesh, the fourth wheel radius stays at 4.0 (determined by center-third mesh). But the escape pinion radius needs to be compatible: fourth.r + escape.pinionRadius = distance.

Actually wait - "the distance between the axes of a wheel and the next wheel (in x-z) equals wheel.radius + next.pinionRadius". This uses the wheel's own radius (from its driving mesh) and the next wheel's pinion radius (from this mesh). So for the fourth-escape mesh:
- distance = fourth.radius + escape.pinionRadius = 4.0 + escape.pinionRadius

For proper meshing: module = 2 * (distance / (fourth.teeth + escape.pinion))... no.
The pitch radii for this mesh: r1 = module * fourth.teeth / 2, r2 = module * escape.pinion / 2.
For the fourth wheel: r1 should equal fourth.radius (4.0), so module = 2*4.0/80 = 0.1.
For the escape pinion: r2 = 0.1 * 8 / 2 = 0.4.
Distance = 4.0 + 0.4 = 4.4. ✓

And escape wheel radius: if I use the same module, it's 0.1*15/2 = 0.75mm. That's small but it's a real escape wheel - they are small. In a 42mm movement, the escape wheel is about 6-7mm diameter, so radius ~3.3mm. Hmm, that doesn't match.

The issue is that the escape wheel in a real watch has a different module than its pinion teeth. Actually, in a real watch, the escape wheel teeth and the pinion it drives are different parts. Wait, in a traditional watch:
- The escape wheel has 15 teeth
- These teeth engage the pallet jewels (not a pinion)
- There's no "escape pinion" in the traditional sense

But the problem states "escape wheel 15 / pinion 8" as the gear data. And "fourth.teeth / escape.pinion = 10". So in this model, the fourth wheel (80 teeth) drives a pinion with 8 teeth that's on the same axis as the escape wheel (15 teeth). The escape wheel's 15 teeth then engage the pallet fork.

So the escape "pinion" (8 teeth) is driven by the fourth wheel, and the escape "wheel" (15 teeth) has the characteristic pointed teeth that engage the pallets.

For visual purposes, the escape wheel with 15 teeth at module 0.1 has radius 0.75mm. The tooth tips would be at 0.75 + 0.1 = 0.85mm. That's really tiny. I'll just make it work and let the camera get close enough.

Actually, you know what, I'm overthinking this. The problem says 1 unit = 1mm. Let me just use these dimensions and position the camera appropriately. A macro camera at 20-30mm from the movement will make everything look large on screen.

Let me just write the code now and stop over-planning.

Let me also make sure the Y-axis layout is correct:
- All wheel axes are vertical (along y)
- Wheels rotate around y
- The movement is in the x-z plane
- "above" means +y

Wheel heights (y positions of wheel centers):
- Main plate: y = 0 to 0.5
- Lower jewels: y = 0.25 (in the plate)
- Wheels: y = 1.5
- Upper jewels: y = 2.5 (in the bridges)
- Bridges: y = 2.3 to 2.7
- Balance: y = 1.8 (slightly lower, under the balance cock)
- Hands: y = 3.5 to 4.5

OK let me just write it. Here's my plan for the full code:

```
1. Imports
2. Renderer, scene, camera setup
3. Environment map (RoomEnvironment + PMREMGenerator)
4. Lights
5. Helper functions (createGearShape, createGearMesh, createScrew, etc.)
6. Material creation (procedural textures)
7. Build all parts
8. Position parts
9. window.__watch interface
10. Render loop
11. Controls, key handlers, button
12. Labels
13. Resize handler
```

Let me write this now.

For the procedural textures, I'll create canvas elements:

Geneva stripes: horizontal parallel lines with slight gradient
```js
function createGenevaStripesTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    // Draw parallel bands
    const bandWidth = 20;
    for (let y = 0; y < 512; y += bandWidth * 2) {
        const grad = ctx.createLinearGradient(0, y, 0, y + bandWidth * 2);
        grad.addColorStop(0, '#b8a040');
        grad.addColorStop(0.5, '#d4c060');
        grad.addColorStop(1, '#b8a040');
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, 512, bandWidth * 2);
    }
    return new THREE.CanvasTexture(canvas);
}
```

Perlage: overlapping circles
```js
function createPerlageTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#a09030';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#c0b050';
    ctx.lineWidth = 1;
    const r = 15;
    for (let x = 0; x < 512 + r; x += r * 1.2) {
        for (let y = 0; y < 512 + r; y += r * 1.2) {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    return new THREE.CanvasTexture(canvas);
}
```

For the engraved text, I'll draw it on a canvas and use it as a texture on the bridge.

OK, I think I have enough detail planned. Let me write the complete code now. It will be long but functional.

Let me be very careful with TypeScript types to pass strict mode:
- All variables need proper types
- No implicit any
- Non-null assertions where needed
- Proper null checks

Let me write this now...

I realize this is going to be extremely long. Let me try to keep it manageable while hitting all the requirements. I'll prioritize:
1. Working mechanics (correct gear ratios, timing)
2. All required parts present and named
3. Good visual quality (PBR, env map, procedural textures)
4. Proper explode function
5. Labels
6. UI controls

Let me write it in one go now.
