This is a complex request to build a working model of a mechanical wristwatch movement (ETA/Unitas 6497-1) in Three.js. Let me break down what's needed:

1. **Gear train**: barrel -> center -> third -> fourth -> escape wheel
2. **Ratios**: barrel 72T, center 80T/pinion 12L, third 75T/pinion 10L, fourth 80T/pinion 10L, escape 15T/pinion 8L
3. **Verification**: (80/10)*(75/10) = 8*7.5 = 60 ✓, 80/8 = 10 ✓, 72/12 = 6 (between 4-10) ✓
4. **Escape wheel**: 15 teeth, half tooth per beat (12°), turns once per 6s
5. **Module**: 0.1 mm for all meshes
6. **Placement**: distance = wheel.radius + next.pinionRadius

Let me calculate radii:
- barrel: module * 72 / 2 = 3.6 mm
- center wheel: module * 80 / 2 = 4.0 mm, pinion: 0.1 * 12 / 2 = 0.6 mm
- third wheel: 0.1 * 75 / 2 = 3.75 mm, pinion: 0.1 * 10 / 2 = 0.5 mm
- fourth wheel: 0.1 * 80 / 2 = 4.0 mm, pinion: 0.1 * 10 / 2 = 0.5 mm
- escape wheel: 0.1 * 15 / 2 = 0.75 mm, pinion: 0.1 * 8 / 2 = 0.4 mm

Placements (x-z positions, starting from barrel at center or some position):
- Let me place barrel at (0, 0, 0)
- center wheel at distance = barrel.radius + center.pinionRadius = 3.6 + 0.6 = 4.2 from barrel
- third wheel at distance = center.radius + third.pinionRadius = 4.0 + 0.5 = 4.5 from center
- fourth wheel at distance = third.radius + fourth.pinionRadius = 3.75 + 0.5 = 4.25 from third
- escape wheel at distance = fourth.radius + escape.pinionRadius = 4.0 + 0.4 = 4.4 from fourth

I'll arrange them in a roughly realistic layout.

For the gear teeth, I need to create extruded THREE.Shape with actual teeth. I'll create a function that generates gear profiles.

For materials:
- Metal parts: brass/steel with environment map
- Jewels: red, translucent
- Hairspring: blued steel
- Bridges: with Geneva stripes (procedural canvas texture)
- Main plate: with perlage (procedural canvas texture)

For the environment map, I'll use RoomEnvironment from three/addons.

For the timing system:
- k = floor(5*t)
- tau = k / 5
- balance(t) = 1.2*PI * sin(2*PI*2.5*t)
- pallet(t) = 0.2 * (k even ? 1 : -1)
- escape(t) = -k * 2*PI/30
- fourth(t) = 2*PI * tau / 60
- third(t) = -fourth(t) * fourth.pinion / third.teeth
- center(t) = 2*PI * tau / 3600
- barrel(t) = -center(t) * center.pinion / barrel.teeth
- second(t) = fourth(t)
- minute(t) = center(t)
- hour(t) = minute(t) / 12

Let me write this comprehensive TypeScript file. I'll need to be careful about:
1. Creating gear shapes with actual teeth (extruded THREE.Shape)
2. Procedural textures for finishes
3. The complete timing simulation
4. At least 40 named meshes
5. Explode view animation
6. Key E toggle
7. DOM labels
8. Proper lighting and camera setup

Let me structure this carefully:

For gear tooth profiles, I'll use an involute-like approximation with simple trapezoidal teeth on a circular shape.

For the Geneva stripes, I'll draw parallel curved lines on a canvas texture.
For perlage, overlapping circles on a canvas texture.

Let me write this step by step, making sure it compiles with strict TypeScript.

Key considerations:
- Import from 'three' and 'three/addons/...'
- Create renderer, scene, camera myself
- Handle resize
- Use setAnimationLoop
- Expose __scene, __camera, __renderer, __ready, __watch
- No external assets
- MeshPhysicalMaterial for PBR
- RoomEnvironment for env map
- ACES tone mapping
- Shadows
- OrbitControls

Let me write the full implementation now. This will be long but complete.

For the gear shape function, I'll create teeth as trapezoidal bumps around a circle. The shape goes around the circumference adding tooth peaks and valleys.

For the explode view, each part gets a direction vector and moves along it proportionally to f.

Let me be careful about the module/teeth calculations:
- module m = 0.1
- pitch radius = m * teeth / 2
- barrel: 72 teeth, r = 3.6
- center wheel: 80 teeth, r = 4.0; center pinion: 12 leaves, r = 0.6
- third wheel: 75 teeth, r = 3.75; third pinion: 10 leaves, r = 0.5
- fourth wheel: 80 teeth, r = 4.0; fourth pinion: 10 leaves, r = 0.5
- escape wheel: 15 teeth, r = 0.75; escape pinion: 8 leaves, r = 0.4

Positions (I'll use a roughly realistic 6497 layout):
- Barrel: center at (0, 0, 0)
- Center wheel: at distance 4.2 from barrel (barrel.r + center.pinion.r)
- Third wheel: at distance 4.5 from center wheel (center.r + third.pinion.r)
- Fourth wheel: at distance 4.25 from third wheel (third.r + fourth.pinion.r)
- Escape wheel: at distance 4.4 from fourth wheel (fourth.r + escape.pinion.r)

I'll arrange them in a rough arc like a real movement.

Let me also think about the y-positions (height) for different layers:
- Main plate: y = 0
- Barrel and train wheels: y = 0.3 (above plate)
- Bridges: y = 1.5
- Motion works (cannon pinion, minute wheel, hour wheel): above the plate, under the dial
- Balance and hairspring: on the balance bridge side

Actually, for the 6497-1, the layout is:
- Barrel at one end
- Train goes across
- Escape and pallet near the balance
- Balance on the opposite side
- Motion works on top (dial side)

Let me place things roughly:
- Barrel at (-6, 0.5, 0)
- Center wheel at (-1.8, 0.5, 0) - distance 4.2 from barrel
- Third wheel at (2.7, 0.5, 2.0) - distance 4.5 from center
- Fourth wheel at (6.9, 0.5, 0) - distance 4.25 from third
- Escape wheel at (11.3, 0.5, 0) - distance 4.4 from fourth
- Balance at (11.3, 0.5, 5.5) - near escape
- Pallet fork between escape and balance

Wait, let me recalculate positions more carefully:
- Barrel at (0, y, 0)
- Center at (4.2, y, 0) - barrel drives center pinion
- Third at (4.2 + 4.5*cos(a), y, 4.5*sin(a)) for some angle a from center
- Fourth at distance 4.25 from third
- Escape at distance 4.4 from fourth

Let me use angles that create a roughly 6497-like layout:
- Barrel at (0, 0, 0)
- Center at (4.2, 0, 0) - to the right
- Third at (4.2 + 4.5*cos(-30°), 0, 4.5*sin(-30°)) ≈ (4.2+3.9, 0, -2.25) ≈ (8.1, 0, -2.25)

Actually, let me just pick positions that work geometrically and look reasonable:
- Barrel: (0, 0.5, 0), r=3.6
- Center: (4.2, 0.5, 0), r=4.0, pinion r=0.6
- Third: (8.0, 0.5, -1.5), check distance from center: sqrt((8-4.2)^2 + 1.5^2) = sqrt(14.44+2.25) = sqrt(16.69) ≈ 4.08... 

Hmm, I need exact distances. Let me compute positions:
- Center from barrel: distance = 3.6 + 0.6 = 4.2, angle 0° → center at (4.2, y, 0)
- Third from center: distance = 4.0 + 0.5 = 4.5, angle = -20° → third at (4.2 + 4.5*cos(-20°), y, 4.5*sin(-20°)) = (4.2+4.23, y, -1.54) ≈ (8.43, y, -1.54)
- Fourth from third: distance = 3.75 + 0.5 = 4.25, angle = 10° → fourth at (8.43+4.25*cos(10°), y, -1.54+4.25*sin(10°)) = (8.43+4.19, y, -1.54+0.74) ≈ (12.62, y, -0.80)
- Escape from fourth: distance = 4.0 + 0.4 = 4.4, angle = -80° → escape at (12.62+4.4*cos(-80°), y, -0.80+4.4*sin(-80°)) = (12.62+0.76, y, -0.80-4.33) ≈ (13.38, y, -5.13)

OK this is getting complex. Let me just define positions and compute the exact angles needed.

Actually, let me simplify by placing them in a roughly straight line with some angles:
- Barrel at (0, 0, 0)
- Center at (4.2, 0, 0)
- Third: need distance 4.5 from center. Place at angle -25° → (4.2 + 4.5*cos(25°), 0, -4.5*sin(25°)) ≈ (4.2+4.08, 0, -1.90) = (8.28, 0, -1.90)

Wait, I should verify: the wheel drives the NEXT pinion. So barrel's teeth mesh with center's pinion. The distance between barrel axis and center axis = barrel.radius + center.pinionRadius = 3.6 + 0.6 = 4.2. ✓

Center's teeth mesh with third's pinion. Distance = center.radius + third.pinionRadius = 4.0 + 0.5 = 4.5. ✓

Third's teeth mesh with fourth's pinion. Distance = third.radius + fourth.pinionRadius = 3.75 + 0.5 = 4.25. ✓

Fourth's teeth mesh with escape's pinion. Distance = fourth.radius + escape.pinionRadius = 4.0 + 0.4 = 4.4. ✓

Let me use simpler angles. I'll define positions explicitly:

const positions = {
  barrel: { x: 0, z: 0 },
  center: { x: 4.2, z: 0 },
  third: { x: 4.2 + 4.5 * Math.cos(-0.4), z: 4.5 * Math.sin(-0.4) },  // angle in radians
  fourth: ... need to compute from third
  escape: ... need to compute from fourth
};

Actually let me just compute angles between consecutive wheels to get reasonable layout.

Let me use these angles:
- barrel to center: 0° (along +x)
- center to third: -20° (slightly down)
- third to fourth: 15° (slightly up)
- fourth to escape: -70° (downward toward balance)

Positions:
- barrel: (0, 0)
- center: (4.2, 0)
- third: center + 4.5 at -20° = (4.2 + 4.5*cos(-0.349), 4.5*sin(-0.349)) = (4.2+4.23, -1.54) = (8.43, -1.54)
- fourth: third + 4.25 at 15° = (8.43 + 4.25*cos(0.262), -1.54 + 4.25*sin(0.262)) = (8.43+4.11, -1.54+1.10) = (12.54, -0.44)
- escape: fourth + 4.4 at -70° = (12.54 + 4.4*cos(-1.222), -0.44 + 4.4*sin(-1.222)) = (12.54+1.50, -0.44-4.13) = (14.04, -4.57)
- balance: near escape, maybe (14.04, 3.5) with pallet between

This layout has the movement roughly centered around x=7. Let me shift everything so the center is roughly at origin. Subtract ~7 from all x coordinates.

Actually, for the camera to frame it nicely, let me just center the camera on the middle of the movement.

Let me write the code now. I'll aim for completeness and correctness.

For the gear tooth shape, I'll create a function that generates a THREE.Shape with N teeth. Each tooth is a small bump (trapezoidal profile) around the pitch circle.

For procedural textures:
- Geneva stripes: parallel sinusoidal bands on canvas
- Perlage: overlapping circles
- These will be canvas-based textures

Let me write the complete file now. It will be very long but complete.

One more thing - for the `tsc --strict` requirement, I need to make sure all types are correct, no implicit any, etc.

Let me also make sure I have 40+ named meshes:
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
44. balance_bridge
45. screw_1 through screw_6 (6 screws)
46. minute_hand
47. hour_hand
48. second_hand

That's more than 40. Good.

Let me write the code:
