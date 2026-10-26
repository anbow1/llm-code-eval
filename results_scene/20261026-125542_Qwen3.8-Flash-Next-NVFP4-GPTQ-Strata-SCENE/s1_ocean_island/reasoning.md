The user wants a complete, single TypeScript file that creates a realistic 3D ocean scene with a boat and tropical island using Three.js. Let me plan this carefully:

1. **Ocean**: Large plane (400x400) with custom ShaderMaterial implementing Gerstner waves. Need to expose `__ocean` with `heightAt` and `time`.

2. **Boat**: Built from primitives (hull, deck, mast, sail) in a Group, floating at ~(12, 0, 14), following wave heights and slopes.

3. **Island**: Procedural terrain centered at origin, 30-50 units across, peak 5-15 units, with vertex colors for sand/grass/rock. At least 5 palm trees with an InstancedMesh for leaves.

4. **Lighting**: Sky (gradient dome or Sky addon), DirectionalLight with shadows, ambient/hemisphere fill, fog, ACES tone mapping, sRGB output.

5. **Camera**: At (35, 12, 35) looking at (0, 2, 0).

Let me design the wave function carefully so JS and GLSL match:

Gerstner waves - I'll use 3 directional waves. For simplicity and exact matching, let me use sine-based displacement (simpler to match between JS and GLSL):

```
height(x, z, t) = sum of A_i * sin(k_i dot (x,z) + omega_i * t + phi_i)
```

Actually, let me use Gerstner waves for better visuals but compute height in JS ignoring horizontal displacement:

For Gerstner wave i:
- direction (dx, dz), wavelength w, amplitude a, speed s, phase p
- k = 2π/w
- ω = k * s (or sqrt(g*k) for deep water)
- Q = steepness (0 to 1/k/a/n)
- height contribution: a * sin(k*(dx*x + dz*z) + ω*t + p)
- horizontal shift ignored for heightAt

Actually for simplicity and exact matching, let me use sine waves:
h(x,z,t) = Σ Ai * sin(dot(ki, pos) + ωi*t + φi)

This is simpler and the shader/JS will match exactly.

Let me define 3 waves:
- Wave 0: dir=(1, 0), wavelength=30, amplitude=0.6, speed=3, phase=0
- Wave 1: dir=(0.7, 0.7), wavelength=15, amplitude=0.3, speed=2, phase=1.5
- Wave 2: dir=(-0.3, 0.8), wavelength=8, amplitude=0.15, speed=4, phase=3.0

For the ocean shader, I'll compute the normal analytically from the wave derivatives.

For the island: procedural mesh with vertex colors based on height.

For palm trees: trunk from CylinderGeometry curved (or multiple segments), leaves as InstancedMesh.

Let me write this now. I need to be careful about:
- Strict TypeScript
- All the window.__* exports
- Shadow casting
- Performance constraints
- No external assets

Let me structure the code:

1. Setup renderer, scene, camera
2. Create sky (gradient dome or Sky addon)
3. Create sun light + shadows
4. Create ocean with ShaderMaterial
5. Create island with vertex colors
6. Create boat from primitives
7. Create palm trees with InstancedMesh leaves
8. Animation loop
9. Resize handler
10. __ready flag

For the Sky addon, I'll use 'three/addons/objects/Sky.js'. Actually, let me use a custom gradient sky dome to avoid potential issues. Or I can use Sky addon - it should work fine.

Let me use the Sky addon for a nice realistic sky with sun.

For the boat hull, I'll use a lathe geometry or build it from box/cylinder primitives. A simple approach:
- Hull: BoxGeometry slightly tapered (or a custom shape using ExtrudeGeometry or just a scaled box)
- Actually, let me use a combination: a scaled sphere for the hull body, a flat box for the deck, a cylinder for the mast, and a plane/triangle for the sail.

Let me think about the boat more carefully for "game quality":
- Hull: Use a CylinderGeometry with open ends, scaled to be elongated, or a custom shape. Actually a simple approach: take a SphereGeometry, cut it in half (or just use a scaled sphere), that gives a rounded hull shape.
- Deck: A flat colored plane on top
- Cabin: A small box
- Mast: Thin cylinder
- Sail: Triangle geometry

For the island terrain, I'll create a circular mesh with vertex colors based on height:
- Below water: not visible
- Near water level: sand color
- Mid: grass green
- High: rock gray

Palm trees:
- Trunk: Curved using a tube/curve
- Leaves: Frond shape geometry, InstancedMesh with 5+ trees × 6-7 fronds each = 30+ instances

Let me code this up now. I need to be very careful about TypeScript strict mode.

For the ocean shader, I need to pass time as a uniform and compute everything in the shader. The normals need to be computed analytically.

For sine waves:
- h(x,z,t) = Σ Ai * sin(ki_x * x + ki_z * z + ωi * t + φi)
- dh/dx = Σ Ai * ki_x * cos(ki_x * x + ki_z * z + ωi * t + φi)  
- dh/dz = Σ Ai * ki_z * cos(ki_x * x + ki_z * z + ωi * t + φi)

Normal = normalize(-dh/dx, 1, -dh/dz) in world space (Y-up).

Let me write the complete file now.

For the InstancedMesh of palm leaves, I need to:
1. Create a frond geometry (elongated shape, maybe with some curve)
2. Create an InstancedMesh with count >= 30
3. Each frame, update the instance matrices to add wind sway

The wind sway can be a rotation around the base of each frond, using sin(time + offset) for the sway angle.

Let me also make sure the shadow camera covers both the island (radius ~25) and the boat at (12, 0, 14).

Shadow camera: orthographic, covering roughly -40 to 40 in x and z.

Let me write it all now.
