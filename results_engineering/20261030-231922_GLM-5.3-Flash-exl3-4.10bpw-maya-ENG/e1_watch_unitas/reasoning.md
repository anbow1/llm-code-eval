I need to build a complete mechanical watch movement simulation in Three.js. Let me plan the architecture carefully.

Key requirements:
1. Single TypeScript file, strict mode compile
2. THREE imports, addons from 'three/addons/...'
3. WebGLRenderer created, canvas appended to body
4. Resize handling
5. setAnimationLoop, delta-based motion
6. window.__scene, __camera, __renderer exposed
7. __ready = true after first frame
8. window.__watch with reset(), step(dt), state(), paused, explode(f)
9. window.__watch.parts array of Object3D with unique names
10. At least 40 named meshes including specific ones
11. Environment map (RoomEnvironment), ACES tone mapping, shadows
12. Procedural textures: Geneva stripes, perlage, engraved text
13. Gear teeth via THREE.Shape extrusion
14. Escapement animation with the exact formulas
15. E key and button animate explode
16. Orbit controls
17. Labels near main parts
18. BokehPass welcome (optional — I'll skip it or include; postprocessing adds complexity but it's "welcome" not required. I'll skip BokehPass to reduce risk, or include EffectComposer... Let me keep it simpler and skip postprocessing to avoid bugs. Actually shallow DOF is "welcome" — optional. Skip it for reliability.)

Let me design the gear train with the example ratios:
- module m = 0.1 mm... wait, that makes tiny teeth. Real 6497 movement is ~36.6mm diameter. Module 0.1: barrel 72 teeth → radius 3.6mm. That's too small for a barrel (real barrel ~ 15mm diameter). Hmm, but the spec says "Use one tooth size (module) per mesh, e.g. 0.1 mm: radius = module * teeth / 2." So each mesh has its own module but the example uses 0.1. Actually real watch wheels have module around 0.08-0.12 for train. The barrel is ~72 teeth with radius ~7.5mm → module ~0.2. But the spec says "e.g. 0.1" — it's an example. The important constraint: with explode(0), distance between axes of a wheel and the next wheel equals wheel.radius + next.pinionRadius.

Hmm, but if I use module 0.1 everywhere, the whole movement would be tiny. Let me scale up: I can use a larger module per mesh. Let me compute with reasonable sizes for a 36mm movement:

Actually, I could just use the example numbers with module 0.1 and then scale the whole scene up, but the spec says 1 unit = 1 mm and radii = module*teeth/2. If module is 0.1, center wheel radius = 0.1*80/2 = 4mm. Real center wheel ~ 8mm diameter... close actually. Hmm, center wheel in 6497 has diameter around 15mm? Let me check real 6497 specs: barrel ~ 12mm diameter, center wheel large ~ 13mm. But the requirement gives specific example numbers. I'll follow the example but scale modules per mesh to get realistic sizes:

- Barrel: 72 teeth, want radius ~7.5mm → module = 2*7.5/72 ≈ 0.208. Barrel teeth are typically larger module. Let's say barrel module 0.2, radius = 0.2*72/2 = 7.2mm. Center pinion 12 leaves, module for barrel-center mesh... "one tooth size per mesh" — barrel wheel meshes with center pinion, so same module: center pinion radius = 0.2*12/2 = 1.2mm. Barrel turns once in 72/12 = 6 hours. Good (4-10 hours).

- Center wheel 80 teeth meshes with third pinion 10: use module 0.1 for this mesh? Center radius = 0.1*80/2 = 4mm. Hmm, center wheel should span much of the movement. With module 0.13: radius 5.2mm. Third pinion radius = 0.13*10/2 = 0.65mm. Axis distance = 5.2+0.65 = 5.85mm.

- Third wheel 75 teeth, fourth pinion 10: module 0.1 → third radius 3.75, fourth pinion 0.5, distance 4.25.

- Fourth wheel 80 teeth, escape pinion 8: module 0.1 → fourth radius 4.0, escape pinion 0.4, distance 4.4.

- Escape wheel 15 teeth, radius? Escape wheel teeth are special (club teeth), not involute. Radius ~2.5-3mm. Escape pinion 8 leaves, fourth wheel 80 teeth mesh: module 0.1 → escape pinion 0.4. Fourth-escape distance = 4.0+0.4 = 4.4. Good.

Layout: 6497 has barrel at top, going train arc down the right side, escapement at bottom, balance at bottom-left, and on the left side the motion works and keyless works with crown at left (3 o'clock at 9 for 6497... actually 6497 has dial feet at 3 and... it's a "savonnette" layout with crown at 3 o'clock when viewed from dial side; from movement side (we view the back typically) crown is on the right? We view from above (back side of movement? or dial side?). The movement lies in x-z plane, we look from above (y up). Let's view the movement from the bridge side (typical macro photo of 6497 shows bridges with Geneva stripes, balance visible). Crown at... For the classic 6497 photo, the crown is at the right side (3 o'clock when viewed from back... whatever). Let me lay out:

Let me place things on a ~36mm diameter plate (radius 18mm). Viewing from above (looking down -y at the plate; we build parts above the plate at y>0 as bridges).

Layout plan (x-z coordinates, plate center at origin):

- Barrel: center at (-6, -7)? Let me think about train flow. Classic 6497 layout (movement side view, dial at bottom... ). Let me just make a plausible arc: barrel upper-left, center wheel at center of plate, third wheel right of center, fourth wheel lower-right, escape wheel below center, pallet fork, balance lower-left. Crown/stem at right edge (x positive). Motion works near center (cannon pinion on center arbor, minute wheel, hour wheel). Ratchet wheel on top of barrel, crown wheel, click.

Let me define positions with the mesh-distance constraint:

module for each mesh:
- mesh A: barrel wheel ↔ center pinion, m=0.2: barrel r=7.2, center pinion r=1.2. dist = 8.4.
- mesh B: center wheel ↔ third pinion, m=0.13: center r=5.2, third pinion r=0.65. dist=5.85.
- mesh C: third wheel ↔ fourth pinion, m=0.11: third r=4.125, fourth pinion r=0.55. dist=4.675. Hmm let me use 0.1: third r=3.75, fourth pinion 0.5, dist 4.25.
- mesh D: fourth wheel ↔ escape pinion, m=0.1: fourth r=4.0, escape pinion r=0.4, dist 4.4.

Positions:
- Center wheel at origin (0,0). It carries cannon pinion and minute hand — center of movement. 
- Barrel: center at distance 8.4 from origin. Put barrel at (-7.4, 3.9)? dist = sqrt(7.4²+3.9²)= sqrt(54.76+15.21)=sqrt(69.97)=8.365. Close; let me just compute exact: place barrel at angle 155° from center: (8.4*cos155°, 8.4*sin155°) in x-z... cos155 = -0.906, sin155=0.423 → (-7.61, 3.55). Distance = 8.4. Barrel radius 7.2 → extends to 7.61+7.2 = 14.8 from center — fits in r=18 plate. Good.

- Third wheel: distance 5.85 from center, direction to the right: angle 10°: (5.85*cos10, 5.85*sin10) = (5.76, 1.02). Hmm z positive. Let's put train going clockwise: third at (5.85, 0.5)? sqrt(5.85²+0.5²)=5.87. Let me be precise — I'll write a helper that computes positions: place each wheel at distance = wheel.radius + next.pinionRadius from the previous, at a chosen angle. I'll compute in code:

positions computed programmatically:
- center at (0,0)
- barrel: angle 160° → pos = center + 8.4 * (cos160, sin160)
- third: angle 15° → 5.85*(cos15, sin15)
- fourth: from third, distance 4.25, angle -35° (down-right)
- escape: from fourth, distance 4.4, angle 200° (down-left toward balance)
- pallet fork: from escape, distance ~ palletPivotDistance (escape radius + pallet span). Escape wheel radius 2.8 (I'll make escape wheel a special shape with 15 club teeth, outer radius 2.8). Pallet fork pivot distance from escape axis: escape wheel radius + pallet arm ≈ 2.8 + ... in real watches the pallet pivot distance ≈ escape radius * 1.4 or so with pallet stones engaging the teeth. Tangent distance: the pallet pivot is offset so the fork's pallet arms reach the escape teeth. I'll set palletPivotDist = 4.2 from escape axis.
- balance: pallet fork's other end engages impulse jewel on balance; balance axis distance from pallet pivot ≈ fork length + balance impulse radius. Set ≈ 5.2.

Let me compute actual coordinates:
- escape pos: fourth pos + 4.4*(cos200°, sin200°) = fourth + 4.4*(-0.940, -0.342) = fourth + (-4.13, -1.50).

Let me compute numbers:
center = (0,0)
barrel = 8.4*(cos160°, sin160°) = 8.4*(-0.9397, 0.3420) = (-7.893, 2.873)
third = 5.85*(cos15°, sin15°) = 5.85*(0.9659, 0.2588) = (5.651, 1.514)
fourth = third + 4.25*(cos(-40°), sin(-40°)) = (5.651+3.256, 1.514-2.732) = (8.907, -1.218)
Check fourth in plate: 8.907+4.0 = 12.9 ok.
escape = fourth + 4.4*(cos195°, sin195°) = (8.907-4.250, -1.218-1.139) = (4.657, -2.357)
pallet: escape + 4.2*(cos240°? ) hmm — pallet should be on the side away from fourth, toward balance which goes lower-left. Let's do angle 235°: 4.2*(-0.574, -0.819) = (-2.41, -3.44) → pallet pos = (2.247, -5.797).
balance: pallet + 5.2*(cos250°?, ...) → continue down-left: angle 255°: 5.2*(-0.259, -0.966) = (-1.346, -5.023) → balance pos = (0.901, -10.82). Balance wheel radius ~5.5 → extends to 10.82+5.5=16.3, ok within 18. Hmm x=0.9. Fine, roughly bottom center.

Actually for a nicer 6497 look, balance is at bottom-left of the movement. Good enough.

Crown at right: stem along +x from plate edge. Crown pos x ≈ 20-22. Stem from x=17 to 22. Keyless works: crown, stem, setting lever, winding pinion, crown wheel... The spec requires crown, stem, setting_lever, click, ratchet_wheel. Also cannon_pinion, hour_wheel, minute_wheel. Ratchet wheel sits on top of barrel (on barrel arbor), click near it.

Motion works: cannon pinion on center arbor (r small, e.g., 12 leaves m=0.12 → r=0.72), minute wheel meshes with cannon pinion: minute wheel 36 teeth m=0.12 → r=2.16, minute wheel pinion 12 leaves m=0.15? Then hour wheel 48 teeth meshing with minute wheel pinion: hour r = m2*48/2. Ratio: (minuteWheel.teeth / cannonPinion.leaves) * (hourWheel.teeth / minuteWheel.pinion) = 12. E.g., 36/12 * 48/12 = 3*4 = 12. Good. Minute wheel position: distance cannon.r + minuteWheel.r = 0.72+2.16 = 2.88 from center. Hour wheel concentric with center (on cannon pinion), radius = m2*48/2 = 0.15*24=3.6. Distance from minute wheel axis to center: minuteWheel.pinion.r + hourWheel.r = 0.9+3.6 = 4.5. But minute wheel center is 2.88 from center — conflict! Need: dist(center, minuteWheel) must satisfy both = cannon.r + mw.r = mw.pinion.r + hour.r. So 0.72 + 2.16 = 2.88 and 0.9+3.6=4.5. Adjust: use same module? Let mw teeth 36, cannon 12 leaves m=0.15: cannon r=0.9, mw r=2.7, dist=3.6. mw pinion 10 leaves m=0.15 → 0.75; hour wheel 40 teeth m=0.15 → r=3.0; dist = 0.75+3.0=3.75. Not 3.6. Need mw.r + cannon.r = mw.pinion.r + hour.r. With module M1 for cannon-mw mesh, M2 for mw pinion-hour mesh: M1*36/2 + M1*12/2 = M2*10/2 + M2*40/2 → M1*24 = M2*25 → M1 = 0.15 → M2 = 0.144. r: cannon 0.9, mw 2.7, dist 3.6; mw pinion r=0.72, hour r=2.88, dist 3.6. ✓. Ratio: (36/12)*(40/10) = 3*4 = 12 ✓.

Minute wheel at (3.6, 0) roughly — but third wheel is at (5.651, 1.514) with r=3.75... they might overlap visually but different heights (motion works on dial side below the plate; we view from bridge side though). Hmm. Since we view from above (bridge side), the motion works would be hidden under the plate. But the spec wants them visible. Options: make them visible by placing them above the plate in the exploded view, and during assembled view maybe visible through... In real 6497 viewed from bridge side you don't see motion works. But the requirement says parts must exist and be labeled; explode shows everything. I'll place motion works under the main plate (y below plate), and they'll be visible in exploded view and partially... Actually the hands: minute hand and hour hand — from bridge side we wouldn't see hands. Hmm. But we need "minute hand" rotation via cannon pinion. The spec says "Rotate every wheel, pinion, the fork, the balance and the hands with the angles from state()". So there must be hands visible. 

Alternative approach: treat the view as the dial side? But then bridges with Geneva stripes are hidden. Classic macro photos show bridge side. Compromise: place hands above everything (y above bridges) — like an open-hearts/skeleton view. Many renders show movement with hands ghosted. I'll add small minute and hour hands above the center arbor at high y, plus a small seconds hand on fourth wheel arbor. They're visible from top. It's stylized but satisfies "carries the minute hand". The motion works: I'll place cannon pinion, minute wheel, hour wheel just above the main plate (y slightly above plate, below train) — visible in gaps. Actually simpler: place motion works above the main plate on the dial-side... we only have one side visible. Let me just put everything at increasing heights:

Heights (y):
- main plate: y from 0 to 1.5 (thickness 1.5), top surface y=1.5.
- Actually let's think: viewed from +y (bridge side). Bottom = dial side.
- Hands at the bottom would be hidden by plate. So instead, invert: make it like a skeleton watch: hands on top. I'll put:
  - main plate top at y=1.5 (plate spans y ∈ [0, 1.5])
  - motion works (cannon pinion, minute wheel, hour wheel) on top of plate: cannon pinion from y=1.5 to 3.2, hour wheel y 1.6-2.2, minute wheel y 2.4-3.0.
  - train wheels on top: barrel y ~ 2-5, wheels y ~ 2-3 with pinions extending up.
  - bridges above at y ~ 4-6.
  - hands: minute hand at y ~ 5.5 above cannon pinion extended, hour hand y ~5.0, small seconds at fourth wheel arbor y ~5? That would collide with bridges. Hmm.

Alternative: hands below (dial side), and make the plate skeletonized or semi-transparent? Simpler: don't overthink — put the hands at the very top (y ~ 8) on thin extended arbors, floating above the bridges, clearly visible. It's a stylized demo; requirement is that hands rotate with correct angles. I'll extend the cannon pinion up through and put minute hand at y=7.5, hour hand at y=7.0, small seconds hand on fourth wheel pinion extension at y=7? Fourth is at (8.9, -1.2), its arbor would need to go through bridge — fine, thin cylinder up to y=6.5 with a small hand.

Actually, wait — maybe simpler and cleaner: no full bridges covering everything; use skeleton-style bridges so hands above are visible anyway. Hands at y between bridges... I'll just place hands above all bridges. Bridges at y≈4.5-5.5, hands at y≈6.2 (hour), 6.7 (minute), seconds hand at 6.5 near fourth. Fine.

Hmm, but actually the requirement literally lists parts including cannon_pinion etc., and says rotate the hands. I'll include minute_hand, hour_hand, seconds_hand as separate meshes.

Now the escapement animation. The formulas are given. I need to map:

state(t) with k = floor(5t), tau = k/5:
- balance = 1.2π sin(2π·2.5·t)
- pallet = 0.2 * (k even ? 1 : -1)
- escape = -k·2π/30
- fourth = 2π·tau/60
- third = -fourth * fourth.pinion/third.teeth
- center = 2π·tau/3600
- barrel = -center * center.pinion/barrel.teeth
- second = fourth, minute = center, hour = minute/12

Note these are kinematically inconsistent between wheels (real gears would move continuously proportionally), but the spec demands exact formulas. Fine — I apply these angles to respective meshes.

Note third formula uses fourth.pinion/third.teeth — meshing: third wheel teeth drive fourth pinion; ratio fourth/third = third.teeth/fourth.pinion. So fourth = -third * third.teeth/fourth.pinion → third = -fourth*fourth.pinion/third.teeth. ✓ matches. But in my numbers fourth.pinion is in mesh D... whatever, formulas given, just apply.

Escape wheel direction: negative. Fourth = positive; escape = -k*2π/30. fourth at time tau: 2π·tau/60; escape pinion: escape should relate: escape wheel once per 6s. fourth.r/escape.pinion.r = 4.0/0.4 = 10 ✓. escape = -fourth*10 = -2π·tau/6 ✓ consistent with -k·2π/30 (tau=k/5: 2π(k/5)/6 = k·2π/30 ✓).

Now the visual escapement: the escape wheel rotates in steps: during each beat interval (0.2s), escape stays at -k·2π/30 (constant during the interval, jumping at k change). Balance sinusoid. Pallet flips instantly at beat. The rendering: apply angles directly. The balance passes 0 at each beat (k/5). sin(2π·2.5·t) at t=k/5: sin(πk)=0 ✓.

But the pallet flipping instantly looks crude; that's what the formula says. I'll apply exactly. Maybe I can smooth pallet slightly in the visual but state() must be exact formula. The render loop uses state() angles, so apply as given. Actually I could make the visual pallet rotate with a quick transition... but spec: "Rotate every wheel, pinion, the fork, the balance and the hands with the angles from state()". So exact.

Pallet fork geometry: an anchor shape. The fork rotates about its pivot by pallet angle ±0.2 rad (±11.5°). I'll build it so at angle 0 it's roughly symmetric, engaging escape wheel and fork horns toward balance.

Pallet fork shape: pivot at origin (local), two arms toward escape wheel, and a lever toward balance with fork horns. I'll draw a THREE.Shape.

Escape wheel: 15 club teeth. I'll make a special tooth shape: pointed teeth slanted. Build shape with 15 teeth: each tooth a slanted spike. I'll generate via polar function: for each tooth, points at radii alternating, giving saw-tooth look.

Gear teeth shape (involute-ish): simple trapezoidal teeth. Function makeGearShape(teeth, module, innerRatio, spokes...). Tooth height ≈ 1.6*module (addendum 1.0m, dedendum 1.25m... use addendum = 1.0*m, dedendum = 1.25*m). Root radius = pitch - 1.25m, tip = pitch + 1.0m.

For wheel body with spokes: create shape of gear, with holes for spokes: 4-5 sector holes between hub and rim. Use shape.holes with Path arcs. Building sector holes: each hole is a path approximating an annular sector with rounded... simpler: for each spoke gap, create a hole path: annular sector from rHub to rRim, spanning (gapAngle). Arc along outer radius, line to inner radius, arc back, close. THREE.Path with absarc. Need correct winding for holes (opposite to shape). THREE handles winding automatically? ShapeGeometry uses ShapeUtils which detects and reverses holes if needed — yes, it checks isClockWise and reverses. Actually ShapeUtils.triangulateShape expects holes opposite winding but Shape.extractPoints... In three.js, ShapeGeometry handles: "if hole is not reverse of shape winding, it gets reversed" — yes, ShapeUtils removes wrong-winding holes by reversing. Safe.

Pinions: small gear (leaves) — just a toothed cylinder, solid, no spokes. "leaves" count: use same tooth generator with fewer teeth and deeper teeth (pinion leaves are rounded). I'll use a leaf profile: rounded teeth — use trapezoid with bigger module relative? Pinion pitch radius = module*leaves/2 with the mesh module. Tooth depth maybe 1.5m. Fine.

Now parts list (need ≥40 meshes, unique names):

1. main_plate
2. barrel_bridge (small bridge over barrel)
3. train_bridge (big bridge over train)
4. pallet_bridge (cock)
5. balance_cock
6. mainspring_barrel (drum)
7. barrel_gear? The barrel has teeth on its drum — mainspring_barrel is the toothed drum. Spec: mainspring_barrel and mainspring and arbor separately. So:
   - mainspring_barrel: toothed drum (gear with 72 teeth, large)
   - mainspring: spiral strip inside (visible through... make the drum with an open top so the spring is visible — skeleton barrel or just put spiral above? I'll make the barrel drum a short ring wall + the gear teeth ring, with the mainspring spiral visible inside from top, and a cap? Classic macro: barrel bridge covers it. For visibility, leave barrel open (no cap) — "skeleton" style or remove barrel bridge top. I'll give barrel a low wall and visible mainspring spiral, with a slot; barrel bridge will have cutout? Simpler: barrel open-topped, mainspring spiral visible.
   - arbor: barrel arbor in center.
8. ratchet_wheel on barrel arbor (above barrel bridge)
9. click (pawl) near ratchet
10. click_screw? "screws" — need several screws: heat-blued. I'll add screw meshes at bridge points: screw_1..screw_N.
11. center_wheel (with spokes) + center_pinion
12. third_wheel + third_pinion
13. fourth_wheel + fourth_pinion
14. escape_wheel + escape_pinion
15. pallet_fork + pallet_stones (two ruby stones) — pallet_fork is one mesh; stones jewel? The 17 jewels named jewel_1..jewel_17. 17 jewels in 6497: 5 in balance (2 balance staff jewels incl. cap jewels ×2 = 4, impulse roller =1), 2 pallet fork, 2 escape, 2 fourth, 2 third, 2 center... that's 15, plus 2 barrel? Usually barrel isn't jeweled in 17j; instead: impulse jewel on roller counts. 17 = 4 (balance, 2 pairs w/ caps) + 1 impulse + 2 pallet + 2 escape + 2 fourth + 2 third + 2 center = 15 + 2 (barrel arbor? no) ... Actually 6497-1 17 jewels: center 2, third 2, fourth 2, escape 2, pallet 2, balance 4 (2 + 2 caps), impulse 1, = 15; plus... mainspring barrel? No. Hmm: +1 pallet? Some count escape wheel cap? Let me not overthink — just place jewel_1..jewel_17 at pivots and pallet stones.

Jewel placement plan (17):
- jewel_1/2: center wheel top/bottom (top = in train bridge, bottom = in plate) — I'll render jewels sitting in bridges/plate surfaces: each jewel a small red cylinder + gold chaton (chaton part of jewel mesh? separate meshes need unique names; I can make jewel_i a group? parts array of Object3D — meshes. I'll make jewel a single mesh: torus (gold chaton) merged? Simpler: jewel_i = a small cylinder (red translucent) plus chaton as separate mesh chaton_i... that adds many parts, fine — but names must be unique; chatons can be part of the jewel group. Requirement: "the 17 jewels named jewel_1 ... jewel_17" — a Group named jewel_1 containing ruby + chaton meshes is an Object3D with name. parts is array of THREE.Object3D. OK, but "At least 40 separate meshes" — groups with children count meshes separately anyway. To be safe I'll make each jewel a THREE.Mesh (cylinder, red) and give chatons their own meshes named chaton_1... Actually simpler: jewel mesh = red cylinder; chaton = gold ring mesh named chaton_1 etc. Count is fine.

List:
- jewel_1..2: center (top in train bridge, bottom in plate)
- jewel_3..4: third (top, bottom)
- jewel_5..6: fourth (top, bottom)
- jewel_7..8: escape (top, bottom)
- jewel_9..10: pallet (top, bottom)
- jewel_11..12: balance (top in balance cock, bottom in plate)
- jewel_13: impulse roller (on balance staff)
- jewel_14..15: pallet stones (entry, exit)
- jewel_16..17: barrel? or cap jewels for balance... I already counted balance 2 (no caps). Make jewel_16, jewel_17 the cap jewels above/below balance (tiny). OK.

Chatons: gold rings around each — I'll add chaton meshes for at least the visible top ones. Maybe merge chaton into jewel via two meshes in a group per jewel... Let me just create jewel as Group { ruby mesh, chaton mesh } named jewel_i; the group is in parts. Meshes inside get subnames. That's fine and keeps count high.

Hmm, "At least 40 separate meshes, with unique names" — I'll ensure all meshes (including children) have unique names.

Count estimate: plate(1), 4 bridges/cock(4), screws(6), barrel(1), mainspring(1), arbor(1), ratchet(1), click(1), crown(1), stem(1), setting_lever(1), winding pinion? (1), crown_wheel? optional, cannon_pinion(1), minute_wheel(1+pinion), hour_wheel(1), center wheel+pinion(2), third(2), fourth(2), escape(2), pallet fork(1), 2 stones(2 in jewel groups), balance wheel(1), balance staff(1), roller(1), impulse jewel(1), hairspring(1), stud(1), collet(1), hands(3), jewels(17 groups → 34 meshes), chatons maybe included. Total well over 40. 

Motion works placement: cannon pinion on center axis above center wheel; minute wheel at distance 3.6 from center; hour wheel concentric on center. But wait — hour wheel concentric at center, minute wheel at 3.6 away: meshing mw pinion with hour wheel (radius 2.88, dist 3.6 = 0.72+2.88 ✓). Place minute wheel at angle toward e.g. 135° from center: pos (3.6*cos135, 3.6*sin135) = (-2.546, 2.546). But barrel is at (-7.89, 2.87) with r 7.2 → covers that area (barrel edge at distance 8.4-7.2=1.2 from center on that side... barrel is a circle radius 7.2 centered 8.4 away; the gap between barrel and center: point at distance 1.2 from center along the barrel direction. Minute wheel at 3.6 away toward 135°: distance from barrel center: |(-7.89,2.87)-(-2.55,2.55)| = |(-5.34,0.32)| = 5.35 < 7.2+2.7 → overlaps barrel. But they're at different heights: minute wheel is below (dial side) at y~2.4, barrel sits at y~2-5... barrel bottom at y=1.8 (sits on plate). Overlap in x-z but different y — physically in real watch the minute wheel is on dial side under the barrel? Actually in 6497 motion works is under the dial, near center; barrel is big and overlaps in plan view but different heights. Fine — but z-fighting/intersection visuals: barrel bottom y=1.9, minute wheel top y=3.0 → they'd intersect in the overlap region. Barrel bottom must be above 3.0, or move minute wheel to a free spot. Let me raise the barrel: barrel sits on plate with wall from y=1.5 to y=4.5. Minute wheel would intersect. Move minute wheel to the free side: angle -90° (below center): pos (0, -3.6)? Balance is at (0.9, -10.8) r 5.5 → top edge at -5.3. Pallet at (2.25,-5.8). Escape at (4.66,-2.36) r 2.8 → covers around (2-7.5, 0.4 to -5.2). Minute wheel at (0,-3.6) r 2.7: distance to escape center = sqrt(4.66²+1.24²)=4.82 > 2.7+2.8=5.5? 4.82 < 5.5 → overlap with escape wheel in plan. Heights: escape wheel at y≈2.3-2.6 (thin, on top of plate at 1.5 + arbor). Minute wheel at y 2.4-3.0 → intersect. Ugh.

Alternative: put motion works BELOW the main plate (dial side, y negative), which is physically correct. Then they're not visible from top in assembled view but visible when exploded, or I can also just make them visible... The requirement lists them as parts and wants the motion works to "drive the hour hand" — the hour hand is visible on top (stylized). Hmm, but then hour hand above and hour wheel below, connected by the cannon pinion through the plate — physically plausible.

But then in assembled view, you can't watch the motion works. Trade-off. The keyless works (crown, stem, setting lever) also live between bridges in real watch. Crown and stem at the side are visible.

Decision: Motion works below the plate (y negative, dial side), correct per real movement. But the camera looks from above... "frames the movement from above and in front" — with orbit controls, user can look underneath. Explode will spread parts. OK.

Hmm, but actually, let me reconsider: maybe put motion works above plate in the free area between center and barrel... there's a free region between center wheel (r 5.2) and barrel... no, center wheel is big.

Alternatively reduce center wheel... center wheel teeth 80 fixed by ratio requirement 60 with third pinion 10: (80/10)*(75/10)=60 ✓. Could change third pinion to 10, center teeth 80 → center radius with module 0.12 = 4.8. Still big. Fine, motion works below.

Actually wait — do I even want a dial-side view? The camera at top looking down. Motion works below plate at y ∈ [-0.2, -1.4]. Cannon pinion extends from below up through the center arbor? Physically cannon pinion friction-fits on center arbor on dial side. Minute hand mounts on cannon pinion — dial side. But I wanted hands on top for visibility. Stylized: hands on top. It's fine; I'll note the movement is displayed "skeleton" style with hands above for visibility. Or... simpler: skip worrying, hands on top.

Hmm, actually — reconsider overall: what if I flip the whole thing: view the DIAL side from above, plate at top, bridges below? Then Geneva stripes on bridges are hidden. No — bridges must be visible (macro photo look). Keep bridges up, hands up (stylized), motion works below (visible via orbit/explode).

Keyless works: crown at +x edge (x≈19-22). Stem along x at y between plate and bridges (y≈2.5), entering the movement. Setting lever near stem inside... place setting_lever and a winding pinion + crown wheel near the stem inside plate edge. In 6497, from bridge side the keyless works are covered by the barrel bridge; stylized: place winding_pinion and crown_wheel visible near stem, plus setting lever. These don't need to rotate meaningfully (crown rotates when winding? I can rotate crown/stem slowly? No — leave static, or rotate crown slightly? Not required.)

Parts near barrel top: ratchet_wheel (on barrel arbor, above barrel bridge, toothed ~48 teeth, steel), click (small lever with tooth engaging ratchet), click screw.

Bridges: 
- main plate: big cylinder r=18, thickness 1.5, with perlage texture, holes? Just a disc with edge features. Maybe give the plate some circular cutouts? Keep it a disc with perlage.
- barrel bridge: covers barrel area — an irregular plate shape (Shape from arcs) with Geneva stripes, at y≈5.2, thickness 1.0.
- train bridge: covers center/third/fourth/escape — elongated shape, Geneva stripes.
- pallet cock: small.
- balance cock: distinctive shape with balance jewels + regulator; engraved text goes on the balance cock or train bridge. Spec: engraved text "UNITAS 6497 17 JEWELS SWISS MADE" on the bridge. Balance cock is where it's engraved in real 6497? Actually on the train bridge or balance cock ("UNITAS" logo). I'll put text on the train bridge (curved area) — canvas texture applied to bridge top face. But bridge top face is an extruded shape — applying canvas texture to extruded geometry UV mapping is messy. Alternative: add a separate thin "engraving plate" mesh on top of the bridge with the text texture (transparent canvas). I'll add a plane mesh just above the train bridge with transparent canvas texture with engraved-look text (dark text with light emboss). Name it e.g. "engraving" — include in parts (unique name). 

Text label near each main part: canvas-based sprites (labels). Make sprite labels with name text floating above each main part, subtle. Requirement: "A text label near each main part (canvas texture or DOM is fine)." I'll create sprites for ~15 main parts, toggleable maybe. Keep them small and semi-transparent. Sprites always face camera.

Procedural finishes:
- Geneva stripes: canvas texture — diagonal bands with subtle brightness gradients. Apply to bridge top faces. For extruded shapes, UVs from ShapeGeometry are x-y based (before extrusion in shape space) — ExtrudeGeometry UVs use the shape coordinates for the front/back faces (generateTopUV uses vertex x,y). So if I build bridge shapes with coordinates in mm, UV = position → I can set texture repeat via matrix: texture.repeat.set(1/36,1/36) etc. Actually ExtrudeGeometry's default UVGenerator maps front face UVs to (x, y) of the shape points. So a texture with repeat 1/width will map world-ish coordinates — stripes will align across bridges nicely. For side walls, extrude maps... fine.

Simpler robust approach: use MeshPhysicalMaterial with a canvas texture, and set texture.matrix or repeat such that stripes scale correctly. I'll write makeGenevaTexture(): 512² canvas, vertical bands each ~64px with linear gradient light→dark, slight per-band hue variation; set wrap repeat. Then map onto extruded geometry with uv scaling: geometry.computeBoundingBox? I'll set material map with texture.repeat = (1/size) using texture.matrixAutoUpdate... For ExtrudeGeometry UVs equal shape coords (in mm, e.g. range [-18,18]); texture.repeat.set(0.5/36? ) Let me: stripes texture represents 6mm per period with 3 bands? Set repeat so that texture spans 36mm: texture.repeat.set(1/36, 1/36) → uv 18 → 0.5. With RepeatWrapping fine. But each bridge has its own local shape coords — since I build each bridge shape around its own position? If I build shape in local coords centered near its position (I'll build shapes in local mm coords translated so they align to world x-z when mesh positioned at its x,z), then uv≈world coords → stripes continuous. I'll build bridge shapes with points in world x-z coordinates minus mesh position... simplest: build the shape in world coordinates and position mesh at origin, then rotation: extrude along z by default; I need extrusion along y. Create shape in x-z: THREE.Shape uses (x,y). I'll create shape with (x, z) coords, extrude depth = thickness, then rotate mesh -90° about X so extrusion z→y... rotateX(-PI/2): shape (x,y,z=depth) → (x, z→? ) Let me think: rotateX(-90°): y→ -z? Point (x,y,0) → (x, 0·? ). Rotation about X by -π/2: (y,z) → (y cosθ - z sinθ? ) With θ=-π/2: y' = y cos(-π/2) - z sin(-π/2) = z; z' = y sin(-π/2) + z cos(-π/2) = -y. So shape point (x,y) at z=0 → (x, 0, -y); extrusion z=t → y'=t. So mesh local: shape (x,y) maps to world (x, height, -y). So to place shape world coords (X,Z): use shape.x=X, shape.y=-Z, mesh position (0, yBase, 0). OK, I'll handle sign carefully. Alternatively build shapes in local coords and set mesh.position; for Geneva stripes continuity across bridges, alignment isn't critical. I'll build each bridge in local coords (centered at 0 or at meaningful offsets) and just use texture repeat scale — stripes direction uniform because extrude UV = shape local coords and all shapes oriented same way. Good enough.

- Perlage: canvas — grid of overlapping circles: for each row offset, draw radial-gradient circles (light center, darker rim). Apply to main plate top. Plate is a CylinderGeometry — UVs are... CylinderGeometry top cap UVs are circular mapping of x/z. Use texture with repeat scaled to plate diameter. Cylinder cap UV: uv = (x/r *0.5+0.5, z/r*0.5+0.5)-ish (cos/sin). So set repeat so texture spans 36mm: texture drawn as many pearls; set repeat (1,1) with texture representing 36mm → pearls ~ 2.5mm each → 14 pearls across 512px → each ~36px. Good: draw on 512 canvas, pearl radius ~20px, spacing 30px, offset alternate rows.

- Engraved text: canvas with transparent bg, draw text twice: dark shadow offset for emboss + metal-ish fill. Use CanvasTexture on a plane over train bridge.

- Balance cock also engraved? Just train bridge.

- Blued screws: MeshPhysicalMaterial color #2a4a8a-ish dark blue, metalness 1, roughness 0.15, clearcoat. Screw mesh: cylinder head (small, r 0.8, h 0.5) + slot (box notch — a thin dark box across the top). To keep as one mesh, build a lathe or just group: head cylinder + slot groove as thin box slightly recessed with dark material. Screw = Group with head + slot. Slots as separate small box mesh (dark). Names: screw_1..., slot child names.

- Jewels: MeshPhysicalMaterial red (#c41e3a), transmission 0.5, roughness 0.05, clearcoat 1, ior 1.77.

- Metals: brass/gilt: color 0xd4b96a? Gilt plates: slightly rosy gold #c9a86c, metalness 0.9, roughness 0.35, with map (perlage/geneva). Steel: 0xc8ccd4 metalness 1 roughness 0.25. Polished steel wheels: roughness 0.18. Gold wheels: brass color.

Environment: RoomEnvironment from 'three/addons/environments/RoomEnvironment.js' with PMREMGenerator. scene.environment = pmrem. Background dark (#0a0a0c). 

Lights: key DirectionalLight with shadows (castShadow, shadow.mapSize 2048, tuned camera bounds), fill light, rim light. Soft shadows: PCFSoftShadowMap, radius.

Tone mapping: ACESFilmicToneMapping, exposure ~1.1. outputColorSpace SRGB.

OrbitControls from 'three/addons/controls/OrbitControls.js'.

BokehPass: skip (optional). Actually "welcome" — skip to avoid postprocessing overhead/risk. Hmm, it adds realism... but EffectComposer + BokehPass needs imports from addons: EffectComposer, RenderPass, BokehPass, OutputPass. Risky bits: with setAnimationLoop fine. Focus distance to balance... I'll skip it; reliability first. Actually, let me include it? The grader may check visuals only lightly. DOF can make it look blurry/unfocused if misconfigured. Skip.

Camera: PerspectiveCamera fov 40, position roughly (10, 26, 22) looking at (0,2,-2)? Movement spans x∈[-15,22] (crown), z∈[-16,15]. Center around (2, 0, -1). Camera above and in front: position (8, 30, 26), target (2, 0, -1). Controls: target set, minDistance 5, maxDistance 120.

Explode: each part gets explodeDir (unit vector, mostly radial in x-z plus some y) and explodeDist. explode(f): part.position = basePos + dir * f * dist. For wheels whose rotation is applied around their own axis: structure — each wheel assembly is a Group positioned at its axis location; rotate inner mesh about y. Explode moves the group. I'll register explodeable objects with { obj, base: Vector3, dir: Vector3, dist }.

Explode dirs: radial from movement center (x,z), plus y component per layer. E.g., bridges go up strongly, jewels up with their bridges, plate goes down, motion works down, hands up more, crown/stem +x, etc.

Apply explode instantly (view applied at once) — only E key/button animate (lerp f between 0 and 1 over ~0.8s, calling explode(f) each frame).

Labels: I'll create canvas sprites with dark background pill + white text, positioned above each main part, parented to the part group so they explode along. Scale small. Toggle with L key maybe. Keep them subtle. Requirement says labels near each main part — do ~16 labels.

Now the simulation class:

```ts
const TRAIN = {
  barrel: { teeth: 72, pinion: 0? } 
```
Wait — userData spec: each train wheel stores { teeth, pinion, radius, pinionRadius }. teeth = wheel teeth, pinion = leaves of its own pinion, radius = pitch radius of wheel, pinionRadius = pitch radius of own pinion.

For barrel: teeth 72, pinion — barrel has no pinion; set pinion: 0, pinionRadius: 0? The formula barrel(t) uses center.pinion and barrel.teeth. Barrel's own pinion unused. I'll give barrel pinion: 12? No — barrel doesn't have a pinion; set pinion 0/0. Hmm but distance constraint barrel↔center uses barrel.radius + center.pinionRadius. Fine.

Data:
- barrel: teeth 72, m 0.2, radius 7.2
- center: teeth 80 m 0.13 → radius 5.2; pinion 12 leaves m 0.2 → pinionRadius 1.2. dist barrel-center = 7.2+1.2=8.4 ✓
- third: teeth 75 m 0.1 → 3.75; pinion 10 m 0.13 → 0.65. dist center-third = 5.85 ✓
- fourth: teeth 80 m 0.1 → 4.0; pinion 10 m 0.1 → 0.5. dist third-fourth = 4.25 ✓
- escape: teeth 15 (special, radius 2.9); pinion 8 m 0.1 → 0.4. dist fourth-escape = 4.4 ✓

Wait, escape wheel radius should equal module*15/2 if same module... but escape wheel isn't part of a gear mesh with a pinion via its teeth (its teeth engage pallet stones). So radius free: 2.9. The ratio requirement "escape wheel 15 teeth" ✓. Escape pinion meshes with fourth wheel: escape.pinion 8, m 0.1, r 0.4 ✓.

userData for escape: { teeth: 15, pinion: 8, radius: 2.9, pinionRadius: 0.4 }.

state().third = -fourth * fourth.pinion / third.teeth = -fourth*10/75. And fourth from escape... consistent.

barrel(t) = -center * center.pinion / barrel.teeth = -center*12/72 ✓ (barrel once per 6h ✓).

Rotation application: mesh rotation.y = angle. Sign conventions: whichever; the formulas define angles; apply directly. Note third is negative relative to fourth, etc. — visually correct opposite directions.

Also mesh pinions rotate with their wheel (same arbor): center_pinion rotates with center wheel: angle = center angle. escape_pinion with escape angle, etc.

Cannon pinion: angle = minute. Minute wheel: ratio — minute wheel meshes cannon pinion: mw angle = -minute * cannon.leaves/mw.teeth? cannon 12, mw 36 → mw = -minute/3. Hour wheel = mw * (mw.pinion/hour.teeth)... hour = -mw * (10/40) = minute/12 ✓ with the sign flips: mw = -minute*(12/36) = -minute/3; hour = -mw*(mw.pinionLeaves/hourTeeth) = -(-minute/3)*(10/40)=minute/12 ✓. 

Ratchet wheel: rotates with barrel (wound) — angle = barrel? Ratchet is fixed to barrel arbor, rotates with arbor during winding; during running it stays. Just set = barrel angle. Click static.

Hands: minute_hand rotation = minute, hour_hand = hour, seconds_hand = fourth.

Now the escapement geometry to look right:
- Escape wheel at E=(4.657,-2.357), radius 2.9, rotating negative (clockwise when viewed from top? negative y-rotation = clockwise viewed from +y). Pallet fork pivot at P=(2.247,-5.797), distance 4.2 from E. Balance at B=(0.901,-10.82), distance ~5.2 from P.

Pallet fork design (local coords, pivot at origin, pointing toward escape wheel along +local +x... ): distance to escape axis 4.2; escape teeth at radius 2.9 → pallet stones engage teeth near the escape wheel edge: stones located at distance ~2.2-2.6 from escape center... The fork's arms: entry and exit stones positioned at radius ~2.4 from escape axis, on either side of the line PE (±~30°). Fork lever extends opposite direction toward balance, length ~3.5, ending in horns; impulse pin on balance roller at radius ~0.55 from balance axis engages horns: distance P to B = 4.2? I said 5.2. Lever length ~4.3 + roller radius 0.55 ≈ 4.85... set PB = 4.6. Let me recompute balance pos: P + 4.6*(cos(255°), sin(255°)) = (2.247-1.19, -5.797-4.443) = (1.057, -10.24). Balance radius 5.4 → bottom edge z=-15.6, ok within 18? plate r 18: |B|=10.3+5.4=15.7 ✓.

Build pallet fork shape in local coordinates where +x points from pivot toward escape wheel? Actually arms go toward escape, tail toward balance. I'll create the group at P, with rotation such that local +x points toward E. Direction P→E = (4.657-2.247, -2.357+5.797) = (2.41, 3.44), angle = atan2(3.44, 2.41) = 55°. In x-z plane with rotation about y: an angle in x-z plane atan2(dz,dx)... For rotation.y = θ, local +x maps to world (cosθ, 0, -sinθ). Hmm: rotation about Y by θ: x' = x cosθ + z sinθ, z' = -x sinθ + z cosθ. So local (1,0,0) → (cosθ, 0, -sinθ). I want local +x → direction (dx, dz)/|.| = (0.574, 0.819)... wait normalize (2.41,3.44): len 4.2 → (0.574, 0.819). Need cosθ=0.574, -sinθ=0.819 → sinθ=-0.819 → θ = -55°. OK: group.rotation.y = -atan2(dz, dx). I'll write helper: yRotFromDir(dx,dz) = -Math.atan2(dz,dx)... check: θ=-atan2(0.819... atan2(dz,dx)=atan2(3.44,2.41)=0.96rad; -0.96: cos=0.574 ✓ sin(-0.96)=-0.819, -sinθ=0.819 ✓. Good.

But the pallet fork also flips ±0.2 rad about its pivot — the state pallet angle applied as rotation.y addition.

Balance roller & impulse jewel: small disc on balance staff with a ruby pin at radius 0.55 facing the fork. Balance rotation amplitude ±216° — the roller rotates with balance; impulse pin sweeps around. Fine visually.

Pallet stones engagement with escape teeth won't be physically exact — acceptable "simplified shapes".

Hairspring: flat spiral, thin. Build via TubeGeometry along an Archimedean spiral curve, or a flat ribbon: use a custom shape? Simplest good look: THREE.TubeGeometry with elliptical... breathing effect: scale hairspring with balance? "The hairspring breathes (coils in and out) with the balance." Implement: hairspring mesh scale = 1 + 0.06 * sin(...)? Balance angle = 1.2π sin(2π·2.5 t) → breathing proportional to balance angle: scale = 1 + 0.05*(balance/(1.2π)). Apply to hairspring mesh scale.x/z. Also hairspring inner end attaches to collet (rotates with balance), outer to stud (fixed). True breathing would deform; scaling approximates. Also rotate hairspring with balance? The inner rotates; visually rotate the whole spring with balance*0.15 + scale breathing. Hmm — I'll rotate hairspring with balance angle fully (attached to staff via collet) and scale radially 1±0.05 — that reads as breathing. Actually rotating whole spiral with 216° amplitude looks like the spring spinning. Real: the spring breathes, terminal curves move. Compromise: rotate hairspring by balance*0.25 and scale by 1+0.08*balance/(1.2π). Good enough visually.

Build hairspring: Archimedean spiral r = a + b·θ, from θ0 to θ0+6 turns, flat ribbon: I'll use TubeGeometry radius 0.035 with a custom Curve class (SpiralCurve extends THREE.Curve). Blued steel material (dark blue metallic). ~200 tubular segments. Also the spiral should be flat — tube is fine (thin). Overcoil not needed.

Stud: small pin on balance cock underside at the spiral outer end.

Balance wheel: ring (torus or extruded annulus) with 2-3 spokes + staff + roller. Screws on rim: small gold cylinders around rim — as children of balance wheel group: add 12 tiny screw heads (timing screws) on outer rim — nice detail, names bal_screw_i. Balance rotates about its axis: group rotation.y = balance angle.

Balance staff separate mesh (cylinders). Roller with impulse jewel.

Escape wheel shape: 15 club teeth: shape via points: for i in 0..14: base circle r1=2.5; tooth tip at r2=2.9, slanted. Points: for each tooth: angle a = i*24°; points: (a, 2.2) root, (a+3°, 2.9 tip), (a+9°, 2.85 tip back), (a+11°, 2.2) back to root... making asymmetric saw teeth. Plus spokes: 4 spokes, hub. Use gear-like shape with holes for spokes.

Gear wheel shape generator:
```ts
function gearShape(teeth, module, toothDepthScale=1): {shape, pitchR}
```
Trapezoid teeth: for each tooth: angles: halfTooth = π/teeth * 0.5... Standard simple approach: pitch circle radius rp; addendum ra = rp + 1.0*m; root rr = rp - 1.25*m. Tooth angular width at pitch = half of pitch angle. Points per tooth: root at angle a0, flank up to tip at a0+w1, tip arc to a0+w2, flank down to root at a0+pitchAngle... I'll write:

```
const step = (Math.PI*2)/teeth;
for i: 
  const a = i*step;
  // points: (rr, a), (ra, a+step*0.18), (ra, a+step*0.32), (rr, a+step*0.5)... 
```
Hmm that gives teeth occupying half the pitch. Let me define: root gap from a to a+0.5step, tooth from a+0.5step to a+step. With slanted flanks: 
- pt(rr, a)
- pt(ra, a + 0.62*step)  (rising flank)
- pt(ra, a + 0.88*step)  (tip)
- pt(rr, a + step) — wait that's start of next root. Let me do: root arc a→a+0.5step at rr, then tip at a+0.5step+0.12step.. a+step-0.12step at ra. Using straight lines between (approximation fine). Add slight curve? Lines OK at these sizes.

Shape points pushed as lineTo; then holes for spokes.

Spoke holes: nSpokes (4 or 5), hole = annular sector between rHub (~1.2mm+pinion area) and rRim = rr - 0.6, sector gap: spoke width ~ 1.0mm → angle = 2*asin(0.5*? ) compute spokeAngularWidth = (spokeWidth)/rMid. For each of nSpokes sectors, hole path: 
```
const path = new THREE.Path();
path.absarc(0,0, rRim, a0, a1, false);
path.absarc(0,0, rHub, a1, a0, true);
path.closePath();
```
Good.

Wheels: build as Group containing: wheel mesh (extruded gear, thickness 0.3), pinion mesh (extruded small gear, thickness 0.9 positioned at different y), arbor (thin cylinder). But names: each mesh named separately: center_wheel, center_pinion, center_arbor... The group name? parts array should include these meshes. I'll push every named mesh into parts, plus groups for explode handling. Requirement says parts is array of THREE.Object3D with unique non-empty names — I'll push all top-level meshes/groups with unique names; children also named uniquely.

Structure for rotation: For each wheel assembly at pos P with base y: group at (P.x, 0, P.z)? If explode moves the group, and rotation applied to inner meshes... I'll have wheelGroup (position P.x, 0, P.z; explode moves this), inside it a "spinner" group at y = axis height containing wheel+pinion meshes rotating rotation.y. Arbor static (or rotates too — same look). Hands: separate.

Simpler: every rotating element gets its own mesh/group whose rotation.y is set each frame. I'll keep a list of {obj, fn} bindings: bind(state) => angle.

Frame loop:
```
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 1/30);
  if (!watch.paused) watch.step(dt);
  applyAngles();
  // explode animation lerp
  controls.update();
  renderer.render(scene, camera);
  if (!ready) { ready=true; __ready = true; }
});
```

Explode animation: targetExplode toggles 0/1 on E or button; currentExplode lerps toward target: cur += (target-cur)*min(1, dt*4) or linear with speed. Call watch.explode(cur) each frame during animation. Spec: "It applies the view at once (only the E key and the button animate)." So explode(f) sets positions immediately; animation done by calling explode with interpolated f externally. I'll keep explodeF variable internal; E/button animate it.

Button: DOM button fixed position "Explode (E)". Styled minimal.

Labels: create function makeLabel(text): canvas 256x64, draw rounded rect bg rgba(10,10,15,0.7), text white 24px sans-serif (system font allowed — no network font). SpriteMaterial map, depthTest true? Better depthTest false? Keep depthTest true so hidden behind... labels near parts — set depthTest false so always visible? Could clutter. Use depthTest true, transparent. Position above part. Scale sprite: aspect 4:1, scale (6, 1.5, 1).

Which parts get labels: main_plate, mainspring_barrel, ratchet_wheel, center_wheel, third_wheel, fourth_wheel, escape_wheel, pallet_fork, balance_wheel, hairspring, balance_cock, crown, cannon_pinion, click, train_bridge, hour_wheel... ~16 labels. Position at part pos + y offset.

Hmm — labels on parts below plate (motion works) will be hidden inside. Place cannon_pinion label anyway; fine.

Bridges must not fully hide the train! If train bridge covers center/third/fourth/escape wheels at y=4.5-5.5, wheels at y~2-3 below it → hidden from top. Real 6497: train bridge covers most of the train; you see escape wheel and pallets through... no, in 6497 you see the train under the bridge partially — actually the classic 6497 back shows: balance cock (balance visible), and the train bridge with Geneva stripes covering center/third/fourth, barrel bridge covering barrel, but the wheels are visible at the edges/through openings. Real 6497: the train wheel heights — wheels are between plate and bridge; from the back you see the bridge, with wheel edges peeking. For our demo, the mechanism must be VISIBLE ("it must be visible and what is measured", "watched working"). So skeleton-style: make bridges narrower/slender (like skeleton watch) so wheels remain mostly visible, or raise bridges and offset. I'll design bridges as slender arms: 
- barrel bridge: a ring segment over barrel top? Barrel is open with visible mainspring — don't cover it! Use a narrow bridge strip from plate edge across the barrel arbor (covering just the arbor center). 
- train bridge: slender Y-shaped arms over each wheel pivot, connecting via an outer ring segment. So wheels largely visible.
- balance cock: classic slender cock over balance edge, balance fully visible.

That gives skeleton look but shows the mechanics — right priority ("The point is the mechanics"). Geneva stripes still on bridge arms.

Bridge shapes: build with THREE.Shape from rounded rectangles/segments. To keep code manageable, I'll write helper: bridgeShapeFromPoints(points, radius) — convex hull-ish rounded polygon? Simpler: define each bridge as a series of capsule segments (union visual via overlapping extruded rounded shapes)? Overlapping separate meshes would z-fight on top faces if same y. Make them same mesh: build shape as union of circles + connecting bands: A shape that is union of discs at pivot points connected by strips. I can approximate with a polygon through the pivot points with rounded corners: use Shape with absarc corners... 

Simplest robust: create shape via "thick polyline": given centerline points p0..pn and half-width w, offset perpendicular both sides, with round caps at ends via arcs. That yields a capsule-chain shape. Implement:

```ts
function capsuleChainShape(pts: {x,y}[], w: number, roundEnds=true): THREE.Shape
```
For each segment compute perpendicular; polygon: side A offsets for all points, then end arc, side B reversed, start arc. With straight joints there are gaps at corners for large angle changes — mitigate by many intermediate points along a curved centerline (I'll sample arcs). I'll generate centerline points densely along desired curves, then this works well.

Alternatively: bridge = union approach using multiple extruded meshes at slightly different y (stair offsets 0.02) — ugly. Use the capsule chain with dense points. I'll implement a helper that given a list of (x,z) waypoints and width, creates a smooth polygon:

```
function tubeShape(pts, w) {
  const left=[], right=[];
  for each i compute direction (avg of adjacent segs), normal n=(-dy,dx) normalized; left.push(p + n*w), right.push(p - n*w);
  shape: moveTo left[0], lineTo along left..., then arc at end (or just lineTo right reversed), lineTo right reversed..., close.
}
```
Round ends: add absarc at each end. I'll add end caps via absarc(center, w, angle-π/2, angle+π/2) using the direction at the end. Manageable.

For nicer look, I'll also add circular pads (discs) at pivot points: separate small extruded circles at same y+? overlapping same mesh shape... include the pad circles INTO the shape via shape composition: create Shape as union? THREE.Shape can't union. Instead: make centerline pass through pivots with local widening: not easy.

Alternative simpler approach that still looks good: bridges as flat shapes defined by explicit polygon point lists (hand-crafted rounded polygons). E.g., train bridge: an elongated rounded shape covering the line from near center wheel to fourth to escape with circular bulges at each pivot. I can hand-craft with absarc calls: shape starting with arc around pivot A (big radius), tangent lines to arc around pivot B, etc. That's the classic "polygon of circles" bridge. Implementing tangent arcs between circles: convex hull of circles! I can compute the convex hull of a set of circles (each pivot with its pad radius) — classic algorithm. For 3-4 circles it's simple: hull of circles = for consecutive circles on hull, draw external tangent lines. Implementing convex hull of circles: compute hull of center points (with radius adjustments) — need care.

Time-box: I'll implement `hullOfCircles(circles: {x,z,r}[])`: compute convex hull of points where each point expanded... Approach: compute the convex hull of the centers (Andrew's monotone chain, treating ties), then for the hull loop, for each edge between consecutive hull centers, compute external tangent lines with offset angle α = acos((r1 - r2)/d)? The tangent line touching both circles: direction angle = atan2(dz,dx) ± acos((r1-r2)/d). Then hull path: for each adjacent pair, tangent points t1 on c1 and t2 on c2, line from t1 to t2, then arc on c2 from tangent angle to next tangent angle. This is standard and not too long. But must ensure hull points ordered and consistent side. Monotone chain gives CCW hull (in standard x-y). Then for CCW polygon, external tangents on the "outside". For edge from ci to cj (CCW), the outside is to the right of direction. Tangent: angle θ = atan2(dj - di) with offset φ = acos((ri - rj)/d)... The external tangent line on right side: points ci + ri*(cos(θ+φ'), sin(θ+φ'))? Let me just do simpler: since circles on hull, compute per-edge: d = |cj-ci|, base = atan2, offset = acos((ri - rj)/d). Tangent angle on hull exterior (right side of CCW direction) = base - offset? Let me verify with equal radii: offset = acos(0) = π/2. Tangent points for equal radii on the right side of travel: angle = base - π/2 (right-hand normal). So tangent angle = base - offset with offset=π/2 ✓. For differing radii: angle_i = base - acos((ri-rj)/d)? Hmm: the external tangent touches at angle β_i on circle i and β_j = β_i on circle j? For external tangents of two circles, the tangent points are at the SAME angle β from each center where cosβ·dx + ... The tangent direction: β satisfies: (cj - ci)·(cosβ, sinβ) = ri - rj. So d·cos(β - base) = ri - rj → β = base ± acos((ri-rj)/d). Choose the sign that puts tangent on the exterior (right side for CCW): β = base - acos((ri-rj)/d)? For equal radii: β = base - π/2 ✓ (right side). 

Then hull path: start at tangent point on hull[0] for edge (h0→h1), arc around h0 backward to tangent point for edge (hN→h0)... Standard: for i in 0..n-1: lineTo(tangent_i_start on ci from previous edge) then arc from previous tangent angle to current tangent angle (going CCW around the circle exterior), then line to next. Let me define for each hull vertex i: incoming edge from ci-1→ci gives tangent angle βin on ci; outgoing edge ci→ci+1 gives βout on ci. Path: for each i: absarc(ci, ri, βout_i, βin_i, ...)? Order: traveling CCW around hull, arcs go CCW? The exterior arc from βout (edge i→i+1) to βin (edge i-1→i) going around the circle the "long way" on the outside... Actually between the two tangent points on the same circle, the hull boundary follows the circle arc on the exterior side, which for CCW hull is the CCW arc from βin to βout? Hmm, let me think with two equal circles side by side, hull = stadium: c1=(0,0), c2=(10,0), r=2. CCW hull: bottom of c1 → bottom of c2 → up around right of c2 → top of c2 → top of c1 → around left of c1. Edge c1→c2 (direction +x, base=0): tangent angle βout on c1 = -π/2 (bottom) ✓ exterior for CCW hull going +x is right side = -y ✓. βin on c2 = -π/2. Arc on c2 from βin(-π/2) to βout for next edge (c2→c1, base=π, βout = π-π/2=π/2 top): arc from -π/2 CCW to +π/2 passing through 0 (right side) ✓ exterior arc. So: arc from βin_i to βout_i CCW (aClockwise=false), where βin_i = base(i-1→i) - acos((r_{i-1}-r_i)/d), βout_i = base(i→i+1) - acos((r_i - r_{i+1})/d). 

So shape: moveTo(first tangent point), for each i: absarc(c_i.x, c_i.y, r_i, βin_i, βout_i, false); then lineTo next tangent point — actually absarc automatically connects with a line from current point to arc start. So loop over i: shape.absarc(...). 

Monotone chain hull of circle centers — need hull including all circles (if a circle is inside hull of others, its pad won't show — fine, or use it as interior pad added as separate small disc mesh... skip). Also degenerate collinear cases — monotone chain handles.

Bridges then:
- barrel bridge: circles: barrel arbor pad (r 3.2 at barrel pos) + anchor pads near plate edge (r 2 at (-15, 4)? and maybe (−13, −3)?) Actually barrel at (-7.89, 2.87), plate edge in that direction at r 18: (-16.4, 5.9). Bridge from barrel arbor to edge: circles [{barrel, 3.0}, {(-13.5, 4.9), 2.2}, {(-16.6,6.0), 1.6}]. Hull gives nice bridge. 
- train bridge: circles at center (pad r 2.8), third (pad r 1.6), fourth (pad r 1.7), escape (pad r 1.5), plus edge anchor near (10, 7)? Let's do: center pad at (0,0) r 2.6; third pad (5.651, 1.514) r 1.5; fourth pad (8.907,-1.218) r 1.6; then anchor at (13.5, -4.5) r 1.8; escape pad (4.657,-2.357) r 1.4. Hull covers these; center wheel (r 5.2) would be under the pad — center wheel top at y? Layers: wheels at y: barrel top 4.4; center wheel y≈2.6 (thickness 0.35); its pinion below? In real train, pinions are below the wheel (toward plate) usually... In 6497, going train pinions face the dial side? The wheels stack: wheel on top of pinion... Let me set heights:

Plate top y=1.5.
- Barrel: sits on plate: drum from y=1.7 to 4.7 (wall), gear teeth ring at bottom y 1.7-2.1? Barrel teeth are at the bottom of the drum. Center pinion must mesh barrel teeth: center pinion at y ~1.9-2.7 (long pinion), center wheel at y ~3.0-3.35. Third pinion meshes center wheel: third pinion y 2.9-3.6 (below its wheel? ) Train layout: each successive wheel slightly different height to allow pinion meshing. Let me assign wheel plane heights:
  - center wheel: y 3.1 (center of thickness), third pinion spans y 2.75-3.55 meshing at 3.1.
  - third wheel: y 2.5; fourth pinion spans 2.15-2.95.
  - fourth wheel: y 3.3? Escape pinion must mesh fourth wheel: escape pinion at 2.95-3.75. Hmm but escape pinion under fourth wheel... fine different axes.
  - escape wheel: y 2.6 (pallet fork at same height 2.6, balance impulse at 2.6).
  Actually keep pallet/escape/roller all at y≈2.6.
- Barrel teeth at y 2.0; center pinion long: from y 1.8 to 3.6 (extends below wheel). OK.
- Bridge heights: train bridge at y 4.6-5.6 (thickness 1.0), pads around pivot jewels: jewels sit in bridge bottom at y 4.6? Jewels visible: place jewel in the bridge top surface (y=5.6+0.05) so visible from top — like chatons on the bridge. Physically jewel is in the hole; showing on top is a stylization but looks great (gold chaton + ruby visible). Bottom jewels in plate top (y=1.55) — visible from underneath only, but include them (visible when exploded/orbiting below). Good.
- Barrel bridge y 5.0-6.0? Barrel top at 4.7 → bridge at 5.0. Ratchet wheel above barrel bridge: y 6.2-6.7 (on arbor extended). Click at same height near ratchet.
- Balance: balance cock at y ~5.2-6.2; balance wheel at y ~3.4 (below cock); hairspring above balance wheel at y 4.4, under cock at 5.2. Staff from 1.7 to 5.4. Balance amplitude ±216° — must not hit pallet bridge; ok by placement.
- Pallet cock: small bridge at y 4.2-4.8 over pallet pivot (pallet fork at 2.6, staff up to 4.2).
- Cannon pinion: on center arbor dial side: below plate: y 0.9 down to -0.5. Minute wheel below plate y -0.6-(-0.9); hour wheel y -0.3-(-0.7)? They'd clash with plate bottom y=0. Set plate from y=0 to 1.5. Motion works: hour wheel y -0.35-(-0.65); minute wheel y -0.75-(-1.05); cannon pinion y -1.2 to ... cannon pinion friction on center arbor: center arbor extends down through plate to y=-1.3; cannon pinion (tube) around arbor from y=-0.4 to -1.2? Then minute wheel meshes cannon pinion teeth at bottom of cannon pinion: cannon pinion teeth (12 leaves) at y -0.8-(-1.2)? Let me simplify: cannon pinion gear at y -1.0, minute wheel (its wheel teeth 36) at y -1.0 meshing; minute wheel pinion at y -0.5 (10 leaves); hour wheel at y -0.5 meshing. Heights: cannon pinion body tube from -1.2 to -0.4; teeth part at -1.0±0.2 (thickness 0.4); minute wheel disc at -1.0±0.15; mw pinion from -0.75 to -0.25; hour wheel disc at -0.5±0.15. Hour pipe around cannon from -0.3 to 0.2? whatever, avoid plate (y≥0). Keep everything ≤ -0.05... hour wheel top at -0.35. OK.

Hands on top (stylized): minute hand at y 7.5 on cannon pinion extension? Cannon pinion is below plate... visually I'll run a thin "hand arbor" from cannon pinion up through center arbor to y 7.5 — just place hands at heights: hour_hand y 7.0, minute_hand y 7.5, both on center axis, separate groups rotating with hour/minute. seconds_hand on fourth wheel axis at y 6.5 (above train bridge at 5.6). Fourth arbor extension thin cylinder from bridge top to 6.5. Hands: simple shapes (Box/extruded thin shapes) blued steel. They'll cast moving shadows — nice.

Hmm wait, the hands rotating: minute hand rotates 1 turn/hour — imperceptible, fine.

Escape wheel teeth count check: 15 teeth, half tooth per beat = 12° per beat ✓ (360/15/2 = 12°).

Now balance cock shape: circles: balance pivot pad at balance pos r 2.6, anchor at plate edge toward lower-left: balance at (1.057,-10.24); edge direction outward: (1.057,-10.24)/10.3 → edge point ≈ (1.85, -17.9). Anchor circles [(6, -14.5) r 1.8, (1.85,-17.2) r 1.6]? Actually classic 6497 balance cock anchors on the plate edge bottom. Let me: [{B, 2.6}, {(5.2,-14.6), 1.7}, {(2.6,-16.8), 1.4}]. Cock at y 5.2-6.0.

Pallet cock: [{P, 1.5}, {(0.2,-8.2)? , 1.2}] small, y 4.3-4.9. Balance wheel radius 5.4 at (1.057,-10.24): does pallet cock anchor collide? Pallet cock near P=(2.25,-5.8); balance rim reaches distance 5.4 from B: distance from B to (0.2,-8.2) = sqrt(0.86²+2.04²)=2.2 < 5.4 → balance swings under it — balance at y 3.4±, pallet cock at 4.3-4.9 → clearance 0.9 OK but hairspring at 4.4 near there... hairspring radius ~4 max, from B: distance 2.2 < 4 → hairspring (y 4.4±0.1) would intersect pallet cock (4.3-4.9) if the cock covers area within hairspring radius. Move pallet cock anchor the other way: toward escape side: [{P,1.5}, {(5.6,-8.6), 1.2}] — distance from B: sqrt(4.55²+1.64²)=4.8 > 4.2 (hairspring max r ~4). OK. And escape wheel at (4.657,-2.357): distance to (5.6,-8.6)=6.3 > 2.9 ✓. Balance rim distance 4.8 > 5.4? 4.8 < 5.4 → balance rim passes under pallet cock pad — balance at y 3.4 (thickness 0.6, top 3.7), pallet cock bottom 4.3 → OK clearance 0.6. Balance staff passes through pallet cock? No, staff is at B. Fine. Actually also check balance rim vs escape wheel: distance B to E = sqrt(3.6²+7.88²)=8.66 > 5.4+2.9 ✓.

Check pallet fork tail vs balance: fork length toward balance ~4.0 from P; PB=4.6, roller radius 0.55 → horns at 4.05-4.6... fine.

Check balance vs fourth wheel: B to fourth (8.907,-1.218): dist sqrt(7.85²+9.02²)=11.95 > 5.4+4.0 ✓. Balance vs center wheel (0,0): dist 10.29 > 5.4+5.2=10.6? 10.29 < 10.6 → overlap 0.3mm! Center wheel at y 3.1±0.17 (2.93-3.27), balance at y 3.4±0.3 (3.1-3.7) → intersect zone y 3.1-3.27 where both exist in plan overlap. Fix: move balance a bit further: B = P + 4.9*(cos255,sin255) = (2.247-1.268, -5.797-4.731) = (0.979, -10.53). dist to center = 10.57, still marginal 10.57<10.6 barely. Or shrink balance radius to 5.2: 10.57 > 5.2+5.2 = 10.4 ✓. Balance r = 5.2. Also balance vs barrel: B to barrel (-7.893,2.873): sqrt(8.87²+13.4²)=16.1 > 5.2+7.2=12.4 ✓.

Also hairspring (r≤4) vs center wheel (r 5.2): dist 10.5 - fine. Hairspring y 4.4 vs center wheel top 3.27 no clash anyway.

Pallet fork vs center wheel: P at (2.247,-5.797); fork arms toward escape... distance P to center 6.2; fork extent from P toward escape 4.2 (reach toward E direction, away from center-ish). Fork tail toward balance. Fork within ~4.5 of P: nearest approach to center could be 6.2-4.5=1.7 < 5.2 → plan overlap with center wheel possible. Center wheel at y 2.93-3.27; pallet fork at y 2.6±0.25 (2.35-2.85) → no y overlap (2.85 < 2.93) ✓. Close but OK. Also third wheel (5.651,1.514) r 3.75, y 2.5±0.17 (2.33-2.67) — pallet fork arms toward escape at y 2.6: does fork reach near third? P to third dist = sqrt(3.4²+7.31²)=8.07 > 3.75+4.5 ✓.

Escape wheel y 2.6 vs third wheel y 2.5: plan distance E to third: sqrt(0.99²+3.87²)=4.0 vs radii 2.9+3.75=6.65 → overlap in plan! Escape wheel (2.33-2.87 incl teeth depth?) teeth at y 2.6±0.15 (2.45-2.75); third wheel 2.33-2.67 → intersect. Fix heights: escape wheel y 3.0 (2.85-3.15); pallet fork then at 3.0 too; check fork vs center wheel (top 3.27): overlap y 3.0-3.15 with center wheel plan? Fork nearest to center 1.7 < 5.2 → intersect! Hmm. Move pallet fork plane: let me restructure vertical layers more carefully:

Planes (wheel center heights):
- barrel gear teeth: y 2.0 (barrel drum 1.7-4.7)
- center pinion: 1.8-3.8 (meshes barrel at 2.0) — pinion long.
- center wheel: y 3.3 (3.13-3.47)
- third pinion: 2.9-3.7 (mesh center wheel at 3.3)
- third wheel: y 2.6 (2.43-2.77)
- fourth pinion: 2.2-3.0 (mesh third wheel at 2.6)
- fourth wheel: y 3.4 (3.23-3.57)
- escape pinion: 3.0-3.8 (mesh fourth at 3.4)
- escape wheel: y 2.5 (2.35-2.65)
- pallet fork: y 2.5
- roller/impulse: y 2.5
- balance wheel: y 3.6 (3.3-3.9)? balance rim vs center wheel (3.13-3.47): plan overlap? dist 10.5 vs 5.2+5.2=10.4 → no overlap now (10.5>10.4) ✓ barely. Make balance r 5.1 for margin: dist B-centro 10.57 (with B=(0.979,-10.53)) > 5.1+5.2=10.3 ✓.
- balance rim vs fourth wheel (3.23-3.57) plan: dist 11.95 > 5.1+4.0 ✓. vs third: dist B-third: sqrt(4.67²+12.04²)=12.9 > 5.1+3.75 ✓. vs escape: 8.66 > 5.1+2.9=8.0 ✓ (escape wheel at 2.35-2.65 anyway below balance 3.3).
- Hairspring: y 4.5, max r 3.9. vs balance wheel top 3.9 ✓. vs pallet fork staff... fine. vs fourth wheel plane? plan: hairspring from B r≤3.9: nearest fourth 11.95-3.9=8 ✓.
- pallet fork vs center wheel: fork y 2.35-2.65 vs center wheel 3.13-3.47 ✓ no overlap. Fork vs third wheel (2.43-2.77) plan: dist 8.07 > 3.75 ✓.
- Escape pinion at E axis y 3.0-3.8 vs balance rim? plan dist E-B 8.66 > 5.1 ✓.
- Fourth wheel (3.23-3.57) vs balance rim ✓ done. Fourth vs barrel: dist barrel-fourth: sqrt(16.8²+1.66²)=16.88 > 7.2+4.0 ✓. Center wheel vs barrel teeth: dist 8.4 = 7.2+1.2 exactly meshing ✓ (pinion at y 1.8-3.8 covers 2.0 ✓).
- Center wheel (3.13-3.47) vs third pinion (2.9-3.7) mesh at 3.3 ✓. Third pinion r 0.65 at third axis: plan dist center-third 5.85 = 5.2+0.65 ✓.
- Third wheel (2.43-2.77) vs fourth pinion (2.2-3.0) mesh at 2.6 ✓ dist 4.25 = 3.75+0.5 ✓.
- Fourth wheel (3.23-3.57) vs escape pinion (3.0-3.8) mesh 3.4 ✓ dist 4.4 = 4.0+0.4 ✓.
- Center wheel vs balance rim: dist(B, origin) with B=(0.979,-10.53): 10.576; balance r 5.1 + center 5.2 = 10.3 ✓ clear by 0.28.
- Balance rim vs pallet fork? P-B dist 4.9; fork tail extends toward balance ~4.1 + horns; roller r 0.55: 4.1+0.55=4.65 < 4.9 ✓; balance rim inner region... balance rim is a ring: inner radius ~4.5; fork horns at distance from B: 4.9-4.65=0.25... wait fork tail reaches to 4.1 from P toward B → distance from B = 4.9-4.1 = 0.8 — that's inside balance rim inner radius 4.5 → fork tail would pass under the balance rim? Balance rim at y 3.3-3.9, fork at 2.35-2.65 → fork passes UNDER the rim — physically correct (fork is under the balance) ✓. Roller at y 2.5 too, under rim ✓. Good, physically accurate actually.
- Hairspring at 4.5 vs balance staff ok.

- Bridges: train bridge y 4.8-5.8: covers center pad (jewel for center top), third, fourth, escape pads. Balance cock y 5.3-6.1. Barrel bridge y 5.0-6.0 (barrel top 4.7). Ratchet at y 6.3-6.8 on barrel arbor (arbor up to 6.9). Click at y 6.3 engaging ratchet.
- Pallet cock y 4.2-4.8 (pallet staff top 4.2). Balance cock bottom 5.3 vs hairspring 4.5+0.1 ✓.

Crown/stem: stem along +x at y 2.2? Plate edge at x=18. Crown at x 20.5-23, radius 1.6, knurled (cylinder with radial ridges — use cylinder with many segments? Knurling via small boxes around — or LatheGeometry; simple: cylinder r1.7 + torus?). I'll make crown a Group: crown_body (cylinder rotated to lie along x), knurl ridges (16 thin boxes around). Stem: cylinder along x from x 17 to 20.6, r 0.45. Winding pinion & setting lever: place setting_lever near stem inside: a small flat lever at y 2.0 near (15.5, 0.5)... The stem enters at plate edge; keyless under barrel bridge area. Place: winding_pinion (small gear) at (15.8, 0.8) y 2.2, crown_wheel at (13.5, 2.2)? These mesh with ratchet? Ratchet is up at 6.5... Real: crown wheel meshes ratchet wheel. Too complex to be physical; include setting_lever, crown, stem, and a winding_pinion mesh with names; motion not required. Setting lever near stem below: at y 0.8 (on plate top near edge). Names required: crown, stem, setting_lever ✓, click ✓, ratchet_wheel ✓.

Click: small lever near ratchet at barrel arbor, engaging ratchet teeth: at pos barrel + direction toward plate edge... place click pivot at (-10.5, 5.5)? Barrel center (-7.89,2.87) r ratchet 3.4 → click pivot at distance ~4.3 from barrel center: (-11.0, 4.9)? Click shape small triangle-ish lever pointing to ratchet. At y 6.3.

Screws: blued screws at bridge anchors: screw on train bridge pad centers? Pivots have jewels; screws at other spots: barrel bridge anchor screw, train bridge anchor screw (x 13.5,-4.5 pad), balance cock anchor screw, pallet cock anchor screw, click screw, plus 2 more on plate. Names screw_1..screw_6 with slot children. Position: on top of bridges at pad positions: barrel anchor (-13.5,4.9) top y 6.0; train anchor (13.5,-4.5) top 5.8; balance cock anchor (2.6,-16.8) top 6.1; pallet anchor (5.6,-8.6) top 4.8; click screw at click pivot top 6.5?; ratchet center screw on ratchet arbor top (screw_6) — that's the ratchet screw. Good.

Jewel positions (17):
- jewel_1: center top (train bridge top, at (0,0), y 5.85)
- jewel_2: center bottom (plate top at (0,0) y 1.55) — visible from below.
- jewel_3/4: third top/bottom
- jewel_5/6: fourth top/bottom
- jewel_7/8: escape top/bottom
- jewel_9/10: pallet top (pallet cock top y 4.85) / bottom (plate 1.55)
- jewel_11/12: balance top (balance cock top y 6.15) / bottom (plate 1.55)
- jewel_13: impulse jewel (on roller)
- jewel_14/15: pallet stones entry/exit (in fork)
- jewel_16/17: cap jewels: place on balance cock top and plate (tiny) — or barrel arbors... call them cap jewels at balance: put at balance cock top (jewel_16) offset? Cap jewels sit above balance staff pivots... I'll place jewel_16 at balance cock top beside jewel_11? Weird. Alternative: jewel_16/17 = barrel arbor jewels (in barrel bridge top and plate) — plausible enough. Do that: jewel_16 at barrel bridge top (barrel pos, y 6.05), jewel_17 at plate under barrel (y 1.55). 

Chatons: gold ring around each jewel (except stones/roller): part of jewel group.

Now — labels & parts naming. Let me now also plan meshes count (unique names):
1 main_plate
2 train_bridge
3 barrel_bridge
4 pallet_cock (name pallet_bridge? spec lists "the bridges" and balance_cock explicitly; use pallet_bridge)
5 balance_cock
6 engraving (text plane)
7 mainspring_barrel
8 mainspring
9 arbor (barrel arbor)
10 ratchet_wheel
11 click
12 center_wheel
13 center_pinion
14 center_arbor
15 third_wheel
16 third_pinion
17 third_arbor
18 fourth_wheel
19 fourth_pinion
20 fourth_arbor
21 escape_wheel
22 escape_pinion
23 escape_arbor
24 pallet_fork
25 pallet_arbor
26 balance_wheel
27 balance_staff
28 roller
29 hairspring
30 collet
31 stud
32 balance_screws (12 tiny — name bal_screw_1..12, that's many; do 8)
33 cannon_pinion
34 minute_wheel
35 minute_pinion
36 hour_wheel
37 crown
38 stem
39 setting_lever
40 winding_pinion
41 minute_hand
42 hour_hand
43 seconds_hand
44 screws ×6 (heads+slots = 12 meshes)
45 jewels ×17 groups (ruby+chaton meshes each, some without chaton)
46 labels (sprites) — not meshes with names needed but fine.

Total > 60 easily. ✓

Now code structure. This will be a long file (~900-1100 lines). Let me write carefully.

Key helper functions:

```ts
function gearShape(teeth: number, module_: number, opts?: {spokes?: number, hubR?: number, rimW?: number, toothFrac?: number}): {shape: THREE.Shape, pitchRadius: number}
```

Extrude settings: depth, bevelEnabled: true small bevel for polished edge look? Bevel on gear teeth gives nice chamfer. bevelThickness 0.03, bevelSize 0.03, bevelSegments 1. Note bevel expands shape slightly — acceptable.

Escape wheel shape: custom.

```ts
function escapeWheelShape(rOut: number): THREE.Shape
```
15 teeth: for i: angles a = i*(24°). Points: root radius rIn=2.35. Tooth: locking face steep, impulse face slanted. Points per tooth (going CCW): 
- (rIn, a)
- (rIn, a+0.30*step)  (root arc approximated)
- (rOut, a+0.38*step) tip (sharp corner — the tooth tip)
- (rOut*0.995, a+0.46*step)
- (rIn, a+0.62*step)
Hmm that gives a spike tooth pointing CCW. Real escape teeth point opposite rotation... whatever, looks right. Add spokes holes (4) hub.

Actually escape wheel teeth lean direction relative to rotation: rotation negative (clockwise). Teeth should lean into pallet. Not critical.

Mainspring: spiral ribbon: use Shape? A flat spiral strip: build with THREE.Shape spiral ribbon (outer curve + inner curve back) extruded 0.15? Or tube with rectangular... Use ExtrudeGeometry from a spiral ribbon shape (2D), depth 0.9 (height of spring). Spiral: r from 1.2 to 5.8 over ~5.5 turns, ribbon thickness ~0.5 in radial dir? Real mainspring is tight-coiled. Ribbon: outer boundary spiral rOut(θ), inner rIn(θ) = rOut(θ-δ). Build path: θ from 0 to Θ: lineTo outer points; then back θ from Θ to 0 inner points. Shape auto closes. Extrude depth 0.8, positioned in barrel. Material: dark steel (blued-grey). The mainspring should be visible: barrel open top. Barrel drum: ring wall (extruded annulus, outer r 6.9 at teeth? barrel teeth on outer drum edge: drum outer radius = pitch radius 7.2 (teeth tips 7.4). Wall thickness 0.5. Barrel = extruded annulus (gear with 72 teeth, hole r 6.5), depth 0.5, at bottom y 1.8-2.3; plus wall: extruded annulus r 6.95/6.55 depth 2.9 from 2.3-5.2? Barrel top at 4.7 per plan. Drum from 1.8 to 4.7: gear part 1.8-2.4, wall 2.4-4.7. Two meshes: mainspring_barrel (toothed gear ring w/ wall?) — spec wants mainspring_barrel as a part; make it the toothed drum: gear ring extruded 2.9 depth (1.8-4.7) with teeth — i.e., a gear-shaped tube: extrude gearShape (with hole r 6.5) depth 2.9. Then mainspring visible inside from top (spiral from r 1.3 to 6.4, height 0.8 at y 2.6). arbor in center (r 0.8 cylinder, y 1.5-6.9, square top? plain).

The gear extrude with hole: shape.holes.push(circle path r6.5). ✓

Ratchet wheel: gear teeth 48, module 0.14 → r 3.36, fine teeth style (saw teeth), depth 0.4, at y 6.3. Steel, on arbor. Plus square hub.

Click: small shape at y 6.3 near ratchet: lever with a tooth. Polygon shape extruded 0.4.

Now the going-train wheels' spokes: center 5 spokes? Use 4. hub radius 1.0.

Pinions: gearShape(leaves, module, no spokes, deeper teeth: use toothDepthFactor: pinion teeth height 1.7m). Solid (hole none), extrude depth per plan.

Arbors: cylinders r 0.35-0.5 with pivots.

Balance wheel: ring: extruded annulus (outer 5.1, inner 4.4), depth 0.55 at y 3.3; spokes: two arms across (box thin) — as part of balance wheel mesh? Separate mesh named balance_spokes? Or include spokes in same extrude via shape with spokes: annulus + spoke bars can't be single shape without holes trick. Use: ring mesh + 2 crossing bar meshes (children, named). Screws on rim: 10 small gold cylinders on outer edge, named bal_screw_i. All children of balanceGroup which rotates. Group balanceRot at B, y 0: children: balance_wheel mesh (ring at y 3.3), bars, screws, staff, roller+impulse, collet? The staff shouldn't rotate visually matters not. Rotation: rotate balanceRot group rotation.y = balance angle → whole staff rotates, fine. But roller+impulse must rotate with balance ✓, collet rotates ✓, hairspring NOT (attach hairspring separately, not in rotating group). Hairspring at B position, own group: scale breathing + slight rotation.

Balance staff: cylinder r 0.35 from y 1.6 to 5.5; roller: small cylinder r 0.55 at y 2.5 with impulse jewel pin (cylinder r 0.12 h 0.5 at radius 0.45, red) → jewel_13.

Pallet fork: shape: pivot at origin; arms toward escape (+x local): entry stone at ~ (2.6, ±?) Let me define local +x toward escape axis (dist 4.2). Escape teeth circle r 2.9 around local point (4.2, 0). Stones should sit near that circle: entry stone at local (2.2, 1.1)? distance from escape axis: sqrt((4.2-2.2)² + 1.1²) = sqrt(4+1.21)=2.28 ≈ inside teeth circle (2.35 root)... stones engage between root 2.35 and tip 2.9: want stone center at ~2.5 from escape axis: choose stone positions at angle ±30° from pivot line: stone = escape axis + 2.5*(cos(180°±28°)...). In local coords: escape axis at (4.2, 0); stone at 4.2 - 2.5cos(28°) = 4.2-2.208=1.99, ±2.5 sin28° = ±1.174. So stones at (1.99, ±1.17). Fork body: arms from pivot to each stone, plus tail toward -x length 4.1 ending with horns (two prongs) for impulse pin. Shape: polygon: I'll craft: 

Body outline (y up = local shape y which maps to -z world? careful: shape (x,y) extruded then rotated -π/2 about X: shape y → world -z. The fork's lateral direction maps mirrored — doesn't matter for symmetric shape; for stones at ±1.17 symmetric fine.)

Shape points (x right toward escape, y lateral):
- tail horns: fork end at x=-4.1: horns: prongs: points around (-4.1, ±0.35) with notch at (-3.85, 0) depth: outline: from (-4.1, 0.45) to (-3.7, 0.45) to (-3.7, 0.12) to (-3.85,0.12)... let me just make a simple fork end: rectangle tail (-4.2..-3.2, ±0.45) with a V notch cut at end: add notch points (-4.2, 0.12), (-3.9, 0), (-4.2, -0.12). Outline path (CCW): start (-3.2, -0.45) [tail right-bottom] → (-4.2, -0.45) → (-4.2, -0.12) → (-3.9, 0) → (-4.2, 0.12) → (-4.2, 0.45) → (-3.2, 0.45) → then arm to exit stone (upper): line to (1.99-0.25, 1.17-0.3)?? Stones are diamond shapes (ruby) separate meshes; fork arms end in slots at stone positions. Arm outline: from tail top (-3.2,0.45) → line to stone slot (2.0, 1.0) width... The fork body: polygon: pivot boss circle r 0.55 at origin. I'll build: arm quadrilaterals: upper arm: from (0,0.4) to (1.9, 1.3) width 0.5; simpler: single polygon points:

(-3.2, 0.45) → (-4.2, 0.45) → (-4.2, 0.12) → (-3.9, 0.0)→ (-4.2,-0.12) → (-4.2,-0.45) → (-3.2,-0.45) → (1.7,-1.05) → (2.25,-1.35) → (2.55,-0.85) → (0.55,-0.5) → (0.55,0.5) → (2.55,0.85) → (2.25,1.35) → (1.7,1.05) → close? Hmm need pivot boss: add points around origin: after (1.7,1.05) → back toward pivot: (0.6,0.75) → (-0.5,0.45)... I'll hand-tune roughly; visual approximate is fine. The stones (ruby boxes 0.7×0.35×0.9) placed at (1.99,±1.17) angled ~±30°, named jewel_14, jewel_15 (children of pallet fork group, so they flip with fork ✓).

Pallet fork group at P, y rotation base -0.96 (toward escape) then + pallet angle. But wait — the fork rotation base and stones alignment with escape teeth: escape wheel steps; stones roughly engaging. Fine.

Also guard pin & horns near roller.

Balance impulse pin at roller radius 0.45 from B axis at y 2.5, same plane as fork horns (fork y 2.35-2.65, horns local y ±0.45 → world lateral). OK.

Now materials list:
- giltBrass (plates/bridges base color with textures): MeshPhysicalMaterial color 0xd8b46f? For Geneva stripes, map multiplies color... Use map + color white-ish (map contains gold color). I'll draw Geneva stripes canvas already in gold tones; material color 0xffffff, metalness 0.85, roughness 0.32.
- perlage canvas in nickel/gilt tone for plate (rhodium-ish light grey-gold), color white, metalness 0.8, roughness 0.4.
- steelPolished: 0xd6d9dd metalness 1 roughness 0.18
- steelSatin: 0xb9bdc4 metalness 0.95 roughness 0.35
- bluedSteel: 0x1c2f6e? heat blue: color 0x2244aa metalness 0.9 roughness 0.2 clearcoat 1 — maybe brighter 0x2b52c8.
- brassGold (wheels): 0xd9b45e metalness 0.95 roughness 0.22
- goldChaton: 0xe8c26a metalness 1 roughness 0.15
- ruby: MeshPhysicalMaterial color 0xb01030, transmission 0.55, thickness 0.5, roughness 0.05, ior 1.77, clearcoat 1, attenuation? Keep simple.
- darkSteel (mainspring): 0x555a60 metalness 0.9 roughness 0.4.

Textures with metalness: maps multiply color; keep metalness high.

Lights: 
- key: DirectionalLight (1.6 intensity) at (14, 30, 10), castShadow, shadow.camera ortho ±26, near 5 far 80, mapSize 2048, bias -0.0005, radius 4 (PCFSoft).
- fill: DirectionalLight 0.5 at (-18, 12, 14) no shadow.
- rim: DirectionalLight 0.9 at (-6, 18, -22) bluish white.
- ambient: hemisphere subtle? environment provides ambient. Add small ambient 0.15.
Environment: RoomEnvironment via PMREM, scene.environment; environmentIntensity? scene.environmentIntensity = 0.9 (r16x supports). I'll set scene.environmentIntensity if exists; safe to just set property (TS: Scene.environmentIntensity exists in recent three types). To be safe with strict TS across versions... I'll use (scene as any).environmentIntensity — no, strict allows property if typed. In three r160+ Scene.environmentIntensity is typed. Risky if older types; I'll skip and rely on default 1.

Background: scene.background = new THREE.Color(0x0b0b0e). Maybe subtle radial gradient via large plane? Keep color.

Ground shadow: a big dark plane below (y=-6) receiving shadow? Plate bottom at 0, motion works below to -1.4. Shadow catcher at y=-5, color near background, ShadowMaterial opacity 0.35. Nice for macro feel. Add.

Tone mapping ACES, exposure 1.15.

Camera & controls: camera.position.set(16, 30, 24); target (1, 1, -2). controls: enableDamping, dampingFactor 0.08, maxPolarAngle ~1.45? Allow full orbit? Allow looking below: maxPolarAngle π*0.95.

Labels: makeLabel(text, pos): canvas 512x96? draw pill. Sprite scale (7, 1.31). Add as child of a labelGroup? If child of part, explodes with it — good: add to part group with local offset. I'll add labels to specific groups with local y offset. But labels for parts that are meshes not groups: attach to their parent group. I'll manage by adding labels to the assembly groups.

Hmm, labels: "A text label near each main part". I'll do ~18 labels. Toggle with L key? Add anyway. Keep them small; maybe slight transparency 0.85.

Now the Watch simulation code:

```ts
const SPECS = {
  barrel: { teeth: 72, pinion: 0, module: 0.2, radius: 7.2, pinionRadius: 0 },
  center: { teeth: 80, pinion: 12, module: 0.13, radius: 5.2, pinionRadius: 1.2 },
  third: { teeth: 75, pinion: 10, module: 0.1, radius: 3.75, pinionRadius: 0.65 },
  fourth: { teeth: 80, pinion: 10, module: 0.1, radius: 4.0, pinionRadius: 0.5 },
  escape: { teeth: 15, pinion: 8, module: 0.1, radius: 2.9, pinionRadius: 0.4 },
};
```

class WatchSim:
```ts
t = 0; paused = false;
reset() { this.t = 0; }
step(dt) { this.t += dt; }
state() {
  const t = this.t;
  const k = Math.floor(5 * t);
  const tau = k / 5;
  const balance = 1.2*Math.PI * Math.sin(2*Math.PI*2.5*t);
  const pallet = 0.2 * (k % 2 === 0 ? 1 : -1);
  const escape = -k * 2*Math.PI/30;
  const fourth = 2*Math.PI*tau/60;
  const third = -fourth * SPECS.fourth.pinion / SPECS.third.teeth;
  const center = 2*Math.PI*tau/3600;
  const barrel = -center * SPECS.center.pinion / SPECS.barrel.teeth;
  const second = fourth, minute = center, hour = minute/12;
  return { t, balance, pallet, escape, fourth, third, center, barrel, second, minute, hour };
}
explode(f: number) { for each entry: obj.position = base + dir*dist*f }
```

k even for negative t? t≥0 always. Note k % 2 with floor ok.

Rotations binding: array of {obj: THREE.Object3D, get: (s)=>number}. Apply obj.rotation.y = angle. Note: pallet fork group has base rotation (orientation toward escape) — I'll wrap: fork group outer (position+base rotation set once) containing inner forkFlip group whose rotation.y = pallet angle. Similarly balance: outer group at B (rotation 0), inner spins.

Wheel assemblies: outer group at (x, 0, z) (explode target), inner spin group at (0, y, 0) rotating; meshes inside with their y offsets. Hands: groups at axis, rotation applied; explode moves outer.

Wait explode for hands: they're at center axis; explode dirs for hands: up.

Explode dirs: define per assembly: radial = normalize(x, 0, z) if len>0 else (0,1,0); dist default 10; plus y component. I'll define per part custom: 
- main_plate: (0,-1,0)*6
- motion works: down 8 (with slight radial)
- hands: up 14
- bridges: up 10
- jewels on bridges: with bridge? jewels are separate meshes (children of scene, not bridge) — their base positions are on bridge tops; explode: up 12 (slightly more than bridge → separates nicely). Bottom jewels: down 8.
- wheels: radial outward 9 + y 2? Let wheels move radially in plane: dir = normalize(x,0.15? ,z)*10. For center wheel at (0,0): dir up 6? center wheel assembly at (0,0,z? ) center at origin: radial undefined → give (0.3, 1, 0.3)? I'll give center wheel up 7 (since its pinion goes down into barrel mesh... explode separates anyway).
- barrel: radial (-7.89,2.87) normalized *8.
- crown/stem: (1,0,0)*8. setting lever: (1,-0.3,0)*6.
- ratchet: up 8; click up 8 w/ radial.
- pallet parts: radial.
- hairspring: up 5; stud with cock? stud is on cock underside; explode up with cock slightly less. Keep stud its own dir up 11.
- screws: up along with their bridges +2? Screws separate meshes with base pos on bridges: dir up (bridgeDist+3).

I'll write explodeEntries: {obj, base: Vector3, dir: Vector3, dist: number}. watch.explode(f) sets obj.position.copy(base).addScaledVector(dir, dist*f).

Since explode is on watch, and parts registry, I'll populate after building.

Labels attach to groups — when exploded they move with groups ✓.

E key: toggles explodeTarget 0/1; each frame explodeCur moves toward target at rate (dt/0.9), call watch.explode(smoothstep?). Use linear f then maybe ease: f = cur. Button same.

Button UI: fixed div top-left with text "Explode view (E)" and maybe pause button "Pause (P)"? Add pause toggling too (space). Requirements mention only E + button for explode; paused property exists — I'll add a pause button too (nice, harmless). Keep small dark UI.

Now, canvas texture functions:

```ts
function genevaTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const bands = 6; const bw = 512/bands;
  for i: linear gradient horizontal across band: from #e2c07a to #8a6a33 with midpoint highlight: use gradient stops: 0: '#caa457', 0.45: '#f0d492', 0.55: '#e8c97e', 1: '#7d5f2c'. Vary slightly by band with overlay alpha.
  g.fillRect...
  Add subtle vertical noise lines? skip.
  texture wrap repeat, anisotropy 8.
}
```
Stripes orientation: bands along x of texture; UV mapping from extrude gives shape coords — bands will be diagonal-ish depending on shape coords; fine.

Actually cotes de Genève are straight parallel bands across the bridge — with UV = local shape coords and repeat 1/36, bands appear as parallel stripes ✓.

```ts
function perlageTexture(): CanvasTexture {
  512², base color #cbb27a? plate gilt or rhodium: use light silver-gilt #cfc4a0.
  rows: spacing s=42, for row r: offset = (r%2)*s/2; circles radius 30 with radial gradient: center #e8ddb8, edge #96824f, ring highlight. draw overlapping.
}
```
Plate UVs: CylinderGeometry(r=18,18,1.5, 96) side + caps. Top cap UV maps unit circle → set texture.repeat? Cap UVs: (cos*0.5+0.5, sin*0.5+0.5). So full texture spans plate diameter: pearls spacing 42/512*36mm = 2.95mm ✓ good. Side wall UVs different (x across, y height) — perlage on side looks off but acceptable; or use multi-material: Cylinder supports material array [side, top, bottom]. Yes CylinderGeometry groups: side=0, top=1, bottom=2. Use [steelSatin, perlageMat, perlageMat]. 

Engraving texture:
```ts
function engraveTexture(): canvas 1024x256, transparent; ctx.font = 'bold 90px ...' — font: use generic 'serif'/'sans-serif' (system, no network) — allowed ("no fonts from the network").
text: 'UNITAS 6497  17 JEWELS  SWISS MADE'
Draw emboss: fillStyle 'rgba(60,40,10,0.9)' at (x+2,y+3) (shadow), then gradient fill light '#f6e3a8' at (x,y). Rotate slight arc? Keep straight.
```
Plane 16×4 mm placed above train bridge top (y 5.81) positioned over a clear area of the bridge (e.g., along the bridge between pads). transparent: true, depthWrite false, polygonOffset. Where is flat bridge area? The hull shape between pads — plane might overhang edges. Position along the line from center pad to fourth pad: midpoint ~ (6, -0.5)? rotate plane to align. I'll place at (2.2, 5.82, 0.9) rotated to lie flat (rotation.x = -π/2) and rotation.z to align with bridge direction (toward fourth: angle). Plane size 13×2.8. Might overhang bridge hull between pads — hull width there is 2*pad-ish radius (~3). OK.

Balance cock engraving skip.

Label texture: 512x128, rounded rect fill rgba(12,14,20,0.75), stroke rgba(255,255,255,0.25), text #e8e4da 44px sans-serif centered.

Now — code writing. Must compile strict: careful with null checks, definite assignment, types.

Imports:
```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
```

Version concerns: RoomEnvironment constructor signature: newer versions `new RoomEnvironment()` (no renderer arg). PMREM: `pmrem.fromScene(env, 0.04).texture`. Older RoomEnvironment took no args always (it took renderer in some version? RoomEnvironment(renderer?) was added then removed). `new RoomEnvironment()` works across versions? In r150s RoomEnvironment() no args ✓.

Let me now also handle "hands": minute hand shape: THREE.Shape: a long thin hand with tail: points: (0,-2.5) tail... hand pointing +local direction; length 7.5 for minute (reaches over center wheel), hour length 5.2, seconds length 5 (on fourth axis, pointing). Extrude depth 0.12. Blued steel. Counterweight circle. Build helper makeHand(len, width).

Rotation direction: hands rotate rotation.y = angle (positive CCW from top). ✓.

Seconds hand at fourth wheel: fourth axis (8.907,-1.218); hand length 4.5, above bridge y 6.3? train bridge top 5.8; seconds hand at 6.0, with a thin sleeve cylinder from bridge to hand. But fourth arbor: pinion top at 3.8; arbor continues to 6.0 ✓ (fourth_arbor mesh spans).

Minute/hour hands at y 7.2/6.8 on center: need center arbor extension: cannon pinion is below... visually add a "center arbor extension"? I'll extend center_arbor mesh up to 7.4 (r 0.3) — passes through train bridge jewel... visually fine.

Wait, hands at y ~7 with amplitude of rotation fine.

Balance cock: hull circles [{B=(0.98,-10.53), r 2.7}, {(5.4,-14.9), 1.8}, {(2.4,-17.0), 1.6}] y from 5.3 to 6.1. Balance staff top 5.5 — staff passes into cock ✓ jewel on cock top at y 6.15 (jewel_11). Check cock pads vs pallet cock/pallet: fine.

Stud: at hairspring outer end: hairspring outer radius ~3.9 at angle? Spiral outer end at some angle; place stud at B + 3.9*dir(θend). I'll compute spiral end angle: θstart=0, turns 5.5 → end angle θ=2π*5.5 = 11π → direction (cos11π, sin11π) = (-1, 0)... I'll just compute in code: studPos = B + rEnd*(cosθend, sinθend), stud mesh small cylinder from y 4.6 down 0.9, attached to cock (cock bottom 5.3 — stud from 4.4 to 5.3 ✓ reaches cock). 

Hairspring spiral: inner r0 = 0.6, outer r1 = 3.8, turns 5.5. SpiralCurve class:

```ts
class SpiralCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private r0: number, private r1: number, private turns: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * this.turns * Math.PI * 2;
    const r = this.r0 + (this.r1 - this.r0) * t;
    return target.set(r * Math.cos(a), 0, r * Math.sin(a));
  }
}
```
TubeGeometry(curve, 360, 0.04, 6? radial 5, false). Blued. Terminal: fine.

Breathing: hairspring mesh scale set each frame: s = 1 + 0.07 * sin(2π·2.5 t) (proportional to balance angle normalized). And rotation.y = balance*0.3. Apply via binding on hairspring group: I'll handle specially in applyAngles.

Also collet rotates with balance (child of balance rotating group) ✓.

Now escape wheel/pallet interplay visual check: escape wheel rotation negative means clockwise from top. Teeth lean... fine.

Let me also add subtle animation: nothing else needed.

Shadow casting: enable castShadow on wheels, bridges, balance, hands; plate receiveShadow + bridges receive. Set on many meshes via traverse at end: scene.traverse set castShadow/receiveShadow for meshes (except shadow catcher, labels/sprites, engraving plane, jewels maybe cast). I'll do traverse: mesh.castShadow = true; mesh.receiveShadow = true; then exceptions.

Performance: many extruded geometries with bevel — fine.

Now write positions precisely (constants):

```ts
const POS = {
  center: new THREE.Vector2(0, 0),
  barrel: new THREE.Vector2(-7.893, 2.873),
  third: new THREE.Vector2(5.651, 1.514),
  fourth: new THREE.Vector2(8.907, -1.218),
  escape: new THREE.Vector2(4.657, -2.357),
  pallet: new THREE.Vector2(2.247, -5.797),
  balance: new THREE.Vector2(0.979, -10.527),
  minuteWheel: new THREE.Vector2(-2.546, 2.546)  // under plate, angle 135°
};
```
minuteWheel under plate at 135°: fine (no collision concerns below plate except plate itself; hour wheel at center below plate r 2.88; minute wheel at 3.6 from center: meshes ✓ dist 3.6 = mw pinion 0.72 + hour 2.88 ✓).

Wait earlier I computed motion works modules: cannon 12 leaves m 0.15 → r 0.9; minute wheel 36 teeth m 0.15 → r 2.7; dist 3.6 ✓. minute pinion 10 leaves m 0.144 → 0.72; hour 40 m 0.144 → 2.88; dist 3.6 ✓. 

Check minute wheel under plate vs nothing else below ✓.

Stem along +x at y ~2.3: does stem hit fourth wheel (at x 8.9, r 4.0 → edge x 12.9)? Stem from x 16 to 20.6 — clear. Setting lever at (14.5, 1.5) small. winding pinion at (16.2, 0.6) y 2.3 r 0.9 gear 12 leaves; connects to stem (visual). OK.

Crown: cylinder along x: CylinderGeometry(1.8, 1.8, 2.2) rotated z→x axis (rotation.z = π/2), at x 21.8, y 2.3, z 0? Wait plate center z=0; stem at z=0, y 2.3. Plate edge x=18 (r18). But fourth wheel area x up to 12.9 ✓. Crown at (21.8, 2.3, 0): but plate radius 18 → stem sticks out from x 17.5 (under? plate is disc; stem passes over plate edge at y 2.3 above plate top 1.5 ✓, enters movement). Add a "pendant tube"? skip.

Knurl: 24 thin boxes around crown circumference: crown children named crown_knurl_i... that's a lot of names; do 16.

Plate: also add case ring? skip.

Now, the tricky bit: hull-of-circles bridge shapes. Implement monotone chain on Vector2:

```ts
function hullOfCircles(circles: {x: number, y: number, r: number}[]): THREE.Shape {
  const pts = circles.map(c => new THREE.Vector2(c.x, c.y));
  // monotone chain
  const hull = monotoneChain(pts); // CCW
  const n = hull.length;
  const shape = new THREE.Shape();
  for (let i = 0; i < n; i++) {
    const prev = hull[(i - 1 + n) % n], cur = hull[i], next = hull[(i + 1) % n];
    const rCur = radiusAt(cur); // need mapping back to circle radius
    ...
  }
}
```
Need radii per hull point: store circles and find circle by center match. I'll carry index: hull of {x,y,r}.

Tangent angle for edge a→b: base = atan2(b.y-a.y, b.x-a.x); d = dist; off = Math.acos(clamp((a.r - b.r)/d, -1, 1)); β = base - off. For vertex i: βin = edgeAngle(hull[i-1], hull[i]) - off... note formula uses (a.r - b.r) where a=prev, b=cur: βin = base(prev→cur) - acos((rPrev - rCur)/d). βout = base(cur→next) - acos((rCur - rNext)/d).

Then shape: start point = cur + rCur*(cos βin, sin βin)? Wait tangent point on circle i for edge i→i+1 is at angle βout_i. Path: for each vertex i: absarc(c, r, βin_i, βout_i, false). absarc adds line from current point to arc start (point at βin_i) then arc CCW to βout_i. Between vertices the line from βout_i of circle i to βin_{i+1} of circle i+1 — absarc's implicit lineTo handles it ✓. Need initial moveTo? First absarc: if no current point, Path.absarc calls absellipse which checks for lastPoint? THREE Path.absarc → absellipse: if there's no previous point it does a moveTo? Looking at three source: absellipse: `if (this.curves.length === 0 ...)`? Actually EllipseCurve added; Path.absellipse: 
```
const firstPoint = ... this.currentPoint
```
It adds line from currentPoint if exists (LineCurve). With no curves, it just starts. I believe it handles starting fine (arc start becomes current). To be safe, compute start point and moveTo it, then skip the implicit line for first? If I moveTo(start) then absarc will draw a LineCurve from currentPoint to arc start — same point → zero-length line, harmless (triangulation ok? zero-length segments could cause issues; rare but let me avoid: I'll construct manually: moveTo(point at βin_0) then for each i: arc via shape.absarc(ci, ri, βin_i, βout_i, false) — first one's line is zero-length. Zero-length LineCurve in shape triangulation: ShapeUtils may produce degenerate triangles but usually handles. To be safer, for the first vertex use a direct arc start: I can call shape.absarc only after moveTo and it's fine in practice (three.js examples do moveTo then absarc). Actually Shape.absarc always appends curves; zero-length line curve is generally OK for triangulation (earcut handles duplicate points decently). I'll accept.

Edge case: hull with collinear points (three centers collinear) — monotone chain removes collinear? Standard implementation removes them (cross <= 0 strict). I'll include r consideration loosely; fine.

One more concern: is the hull orientation CCW from monotone chain (with cross>0 kept)? Standard monotone chain returns points in CCW order for y-up math coords. Our shape coords (x, y=shape space) — CCW ✓ consistent with my tangent sign derivation. If wrong, arcs would bulge inward — I should double check sign with a test: two circles equal r: hull [c1=(0,0), c2=(10,0)] CCW order: monotone chain with points (0,0),(10,0): lower hull then upper: returns [(0,0),(10,0)] (2 points, both). n=2: vertex 0: prev = hull[1] (wrap), cur = hull[0], next = hull[1]. βin for vertex0: edge prev→cur = (10,0)→(0,0): base = π; off = acos(0)=π/2; βin = π/2 (top of c1). βout: edge cur→next = (0,0)→(10,0): base 0; βout = -π/2 (bottom of c1). Arc from π/2 CCW to -π/2: CCW from 90° to 270°(=-90°+360°) passes 180° (left side) ✓ exterior of hull at c1 (leftmost) ✓. Vertex 1: prev=hull[0], cur=hull[1], next=hull[0](wrap). βin: edge (0,0)→(10,0): base 0, off π/2, βin=-π/2 (bottom of c2). βout: edge (10,0)→(0,0): base π → βout = π/2 (top). Arc from -π/2 CCW to π/2 passes 0 (right side) ✓. Result: stadium ✓. 

Now bridge construction helper:

```ts
function makeBridge(circles, thickness, yBase, material, name): THREE.Mesh {
  const shape = hullOfCircles(circles);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 24 });
  geo.rotateX(-Math.PI/2); // shape (x,y) -> (x, -? ...)
```
rotateX(-π/2): (x,y,z) → (x, z, -y). Shape y coordinate maps to world -z. So a bridge circle at shape (x,y) appears at world z = -y. I must therefore pass shape coords as (x, -z): i.e., define circles in world (x,z) and convert: shapeY = -z. And the hull/tangent math unaffected. Then mesh position (0, yBase, 0). ✓ Also note: with rotateX(-π/2), extrusion depth direction: shape at z∈[0,depth] → y ∈ [0? ]: point (x,y,z) → (x, z, -y): z=depth → y=depth ✓ so bridge spans y ∈ [yBase, yBase+depth] (plus bevel). ✓

Geneva material with map: ExtrudeGeometry UV = shape coords for top/bottom faces, and side walls use a different mapping (WorldUVGenerator uses vertex positions for sides too — actually generateSideWallUV uses x,y,z combos). Set texture repeat via `tex.repeat.set(1/40, 1/40)`? UVs in mm (range ±18) → repeat 1/40 gives uv range ±0.45 → with RepeatWrapping stripes tile every 40mm; bands in texture: 6 bands per 40mm → 6.7mm per band ✓ looks right.

Hmm wait — ExtrudeGeometry generateTopUV returns Vector2(x, y) raw coords. With texture.repeat = (1/40, 1/40) and wrapS/T = RepeatWrapping → stripe period = 40/6 ≈ 6.7mm ✓.

For side walls the UVs are also ~coordinate scale — fine.

Plate perlage: CylinderGeometry(18, 18, 1.5, 128) position y 0.75 (0..1.5). Materials array. Perlage texture repeat (1,1) on caps: cap UV spans [0,1]² with circle inside; pearls 42px/512 → 2.95mm ✓. Side gets perlage too via material index 0... side UVs of cylinder: u along circumference [0,1], v height [0,1] → perlage stretched. Use plain metal for side (index 0), perlage for top (1) and bottom (2).

Edge: maybe add a stepped rim? skip.

Plate holes: real plate has openings — skip (solid disc), jewels on top represent pivots.

Now the click: shape polygon at ratchet edge: ratchet center = barrel pos, ratchet r 3.36 (tips). Click pivot at barrel + (cos200°, sin200°)*4.6 = (-7.893-4.32, 2.873-1.573) = (-12.22, 1.30)? Let me choose click near bridge anchor direction... place click pivot at (-12.0, 1.0), click arm pointing toward ratchet center, tooth engaging near ratchet rim. Click shape local: from pivot (0,0) to (-? ) I'll draw in world-aligned local: arm from (0,0) toward ratchet: direction = barrel - clickPivot = (4.1, 1.87) normalize... The click lever typically has the pawl at its end. Shape: elongated lever with hooked end. I'll build simple: rounded lever polygon length 3.2 with a small downward tooth at the end. Extrude 0.35, at y 6.15 (ratchet at 6.3-6.7, click below slightly overlapping tooth zone... ratchet teeth bottom 6.3; click tooth must reach teeth: click at y 6.15-6.5 overlapping ratchet plane 6.3-6.7 → intersect visually where tooth meets teeth — that's correct meshing look). Click screw on top at pivot: screw head y 6.55.

Ratchet wheel teeth: saw-tooth style: gearShape with toothFrac asymmetric: I'll make a ratchetShape: 48 teeth saw profile: points (rRoot, a), (rRoot, a+0.7step), (rTip, a+0.78step), (rTip? ) saw teeth: (rRoot,a) → (rRoot, a+0.75step) → (rTip, a+0.8step) → (rTip, a+0.86step)? Simplest saw: (rRoot, a), (rTip, a+0.12step), (rTip*0.99, a+0.2step), (rRoot, a+0.32step), then flat root to next. rTip = 3.5, rRoot = 3.15. Plus hub hole square? Add center hole r 0.55 (arbor square visual). Steel.

Screw helper:
```ts
function makeScrew(name, pos: Vector3, r=0.75): THREE.Group
 head: CylinderGeometry(r, r*1.05, 0.45, 24) blued; slot: BoxGeometry(r*1.7, 0.1, 0.28) dark (0x111111 roughness 0.6) at y head top -0.05... slot slightly below top surface: place box at head top y, half embedded. Group at pos.
```
Slot as a separate dark mesh reads as a slot from above ✓.

Jewel helper:
```ts
function makeJewel(name, pos, r=0.55, withChaton=true): THREE.Group
 ruby: CylinderGeometry(r, r, 0.35, 24) rubyMat; chaton: TorusGeometry(r+0.22, 0.16, 12, 28) gold rotated flat at y +0.05? Chaton as torus around jewel base.
 group.position = pos.
```

Hands helper:
```ts
function makeHand(name, len, wid, mat): Mesh {
  shape: moveTo(-wid*0.35, -len*0.28) tail... pointer hand: polygon: 
  (-0.28w? ) Let me define: tail from y=-len*0.25 to tip y=len. Points: (w*0.5, -len*0.25), (w*0.5, len*0.55), (w*0.18, len), (0, len*1.02?) tip (0,len), (-w*0.18, len), (-w*0.5, len*0.55), (-w*0.5, -len*0.25), close. Plus circular counterweight? Merge: add circle at (0,-len*0.25)? Just the polygon + separate hub ring. Extrude 0.12, bevel small.
}
```
Add a hub cylinder child.

Hand orientation: shape built in (x,y) with hand pointing +y; extrude rotateX(-π/2): shape y → world -z... hand pointing -z at rotation 0. At t=0 all angles 0 → hands point -z (12 o'clock direction = -z, arbitrary). Fine, consistent.

Balance wheel spokes: bar boxes rotated: two boxes crossing: BoxGeometry(8.6, 0.3, 0.7) at balance y... within rotating group at local (0,3.6,0): bars along x and z. But balance ring inner radius 4.4? Wait balance outer 5.1: ring from 4.5 to 5.1, depth 0.55. Spokes from hub (r 0.8) to ring inner 4.5: bar length 2*4.5=9.0 but as two half-arms? Use two full bars crossing hub: length 9.0 each (they cross the hub region — fine, hub covers). Actually crossing bars through center look fine (2 spokes → 4 arms). Balance screw knobs: 10 gold cylinders r 0.28 h 0.5 on rim outer edge oriented radially: position (r=5.35) angle i*36°, rotation.z? They're radial: cylinder axis along radial direction: cylinder default axis y; rotate to point radially in x-z: for angle a: position (5.35cos a, 3.6, 5.35 sin a)... wait balance rotating group local: set position (cos a*5.3, 3.6, sin a*5.3), rotation.z = π/2 then rotation.y = -a? Cylinder axis y; to align axis with radial dir (cos a, 0, sin a): rotate z by π/2 makes axis along x; then rotate about y by -a? Compose with Euler order... simpler: mesh.rotation.set(0, -a? , Math.PI/2)? Let me use quaternion: setFromUnitVectors(up, dir). dir = (cos a, 0, sin a). m.quaternion.setFromUnitVectors(new Vector3(0,1,0), dir). ✓ Easy.

Roller: cylinder r 0.55 h 0.3 at y 2.5 steel; impulse jewel: small ruby cylinder r 0.12 h 0.45 at radius 0.42, angle facing fork: direction from B toward P: dir = (P-B) = (1.268, 4.73)/4.9 = (0.259, 0.966) in x-z; position = B + 0.42*dir, y 2.5. jewel_13 child of balance rotating group ✓ (so it swings with balance). But the balance rotating group is at B with rotation 0 base; children local positions relative B. dir local same (group not rotated) ✓.

Now the fork horns & roller: roller r 0.55; horn gap 0.5... fine.

Pallet arbor: cylinder r 0.3 from y 1.6 to 4.3 at P; pallet bridge covers top with jewel_9 at y 4.85.

Pallet fork shape — final polygon (local coords, +x toward escape, extruded 0.3, at y 2.5):

```
const pts: [number, number][] = [
  [-3.2, 0.42], [-4.15, 0.42], [-4.15, 0.12], [-3.85, 0.0], [-4.15, -0.12], [-4.15, -0.42], [-3.2, -0.42],
  [-1.0, -0.55], [1.55, -1.0], [2.35, -1.4], [2.7, -0.9], [0.8, -0.35],
  [0.8, 0.35], [2.7, 0.9], [2.35, 1.4], [1.55, 1.0], [-1.0, 0.55],
];
```
Check CCW ordering... This polygon: starting tail top-left region... I listed going around: top edge from tail to upper arm then stones then back along bottom. Winding: THREE handles either. Stones at (2.0, ±1.17) with size ~0.8: the arm tips at (2.35,±1.4)-(2.7,±0.9) create a slot around stone ✓ roughly.

Wait, is the pivot boss included? Points (0.8,±0.35) pass near origin but pivot at (0,0): the polygon segment from (-1.0,0.55) to (-3.2,0.42) — the region around origin: the polygon includes x from -4.15 to 2.7 with lateral extent ±0.55 near origin — pivot boss r 0.55 approximated by the straight band ✓ good enough.