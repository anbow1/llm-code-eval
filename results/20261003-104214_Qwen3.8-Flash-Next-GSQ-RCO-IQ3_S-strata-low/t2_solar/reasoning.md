The user wants a mini solar system in Three.js as a single TypeScript file. Let me plan this out:

1. Sun at origin with MeshBasicMaterial + PointLight
2. 3 planets at distances ~4, 7, 10 with MeshStandardMaterial, orbiting at different speeds (inner faster)
3. Each planet spins on its own axis
4. Planet 2 has a moon as a child, orbiting that planet
5. Weak AmbientLight
6. Camera above and to the side, looking at origin
7. Handle resize, use delta time, expose globals, set __ready after first frame

Key considerations:
- PointLight intensity with physically based rendering: In Three.js r155+, the default is physically correct lighting where PointLight intensity is in candela. I need to set high enough values. I'll use `renderer.useLegacyLights = false` (which is default in newer versions) or just set intensity high enough. Actually, in modern Three.js, PointLight uses physically correct falloff. I should set decay to 2 and use high intensity values, or I could set `pointLight.decay = 0` but that's not physically correct. Let me use `pointLight.decay = 2` (default) and set intensity high enough to light planets at distances 4-10.

Actually, for physically correct lighting with decay=2, intensity in candela: at distance r, irradiance = intensity / r². So for a planet at distance 10, we need intensity/r² to be reasonable. If I set intensity to maybe 200-500, that should work. Let me think... the MeshStandardMaterial with standard albedo needs a reasonable light level. Let me use intensity around 300-500 and decay=2.

Wait, in Three.js with physically correct lights, the formula is: light contribution = intensity / (distance^decay). With decay=2, at distance 4: 300/16 ≈ 18.75, at distance 10: 300/100 = 3. That might be too dim. Let me use higher values like 1000. At distance 4: 1000/16 = 62.5, at distance 10: 1000/100 = 10. That should be visible.

Actually, I'll just set it high enough and also add the ambient light as requested. Let me use intensity of 800 with decay 2.

For the structure:
- Create scene, camera, renderer
- Sun: sphere geometry, MeshBasicMaterial (emissive yellow/orange)
- PointLight at origin
- For each planet, I'll use a pivot group at origin, add the planet mesh as a child offset by the distance, then rotate the pivot group for orbital motion.
- Planet spin: rotate the planet mesh itself on its Y axis
- Moon: add to planet2 mesh, offset from planet center, orbit around planet

Let me write this carefully with strict TypeScript compliance.

For the orbit approach:
- Create a Group as orbital pivot at origin
- Add planet mesh as child of that group, positioned at (distance, 0, 0)
- Rotate the group around Y to orbit
- Rotate the planet mesh around Y to spin on its axis

For the moon:
- Create a moon Group as a child of planet2 mesh, positioned at (moonDistance, 0, 0)
- Or better: create a moonPivot as child of planet2, add moon mesh as child of moonPivot at offset. Rotate moonPivot to orbit.

Actually, let me think more carefully. If I add a child to planet2 mesh, and the planet mesh itself is spinning, then the moon will spin with the planet unless I counter-rotate. Better approach:

- planet2Group (orbital pivot at origin) → contains planet2Mesh at (7, 0, 0)
- For moon: add moonOrbitPivot as child of planet2Mesh at (0,0,0), then moonMesh as child of moonOrbitPivot at (moonDist, 0, 0)
- But planet2Mesh is spinning, so the moon would spin with it.

Alternative: Don't make the moon a child of the spinning planet. Make it a child of the planet's position group (the orbital pivot's child that's at the planet's position).

Hmm, but the requirement says "planet.add(moon)". So the moon must be a child of the planet mesh.

OK so if the planet mesh is spinning (rotating on its axis), and the moon is a child, the moon would rotate with the planet. To counteract this, I could:
- Set the moon's local rotation to counter the parent's rotation each frame.
- Or, use a different structure where the "planet mesh" doesn't actually spin on its own, but we rotate it differently.

Actually, re-reading: "Every planet also spins on its own axis." This means we rotate the planet mesh. If moon is a child of the planet mesh, and we rotate the planet mesh, the moon orbits with it.

One clean solution: Make a moonPivot as a child of the planet mesh. The moon is a child of moonPivot. Each frame, we reset the moonPivot's rotation to account for the parent's spin, then add the moon's orbital rotation on top.

Actually, simpler: since we control everything in the animation loop, we can just set the moon's world position or compute its local rotation relative to parent to achieve the desired world rotation.

Or even simpler: Use a separate group for the moon that's a child of the orbital pivot group (not the planet mesh itself). But the requirement says planet.add(moon).

Let me re-read: "Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet."

OK so I must do `planet2Mesh.add(moonMesh)`. To handle the spin issue:
- I'll create a `moonPivot` Group as a child of `planet2Mesh`. Add `moonMesh` as a child of `moonPivot`.
- Each frame, I set `moonPivot.rotation.y` to compensate for the planet's own spin PLUS add the moon orbital rotation.

Wait, actually there's an even simpler approach. The planet's spin is around its Y-axis. If I use `planet.rotation.y += spinSpeed * dt`, then the moon (as a child) will also rotate around Y. The moon's orbit around the planet is ALSO around Y (since orbits are in XZ plane). So if the moon is at a local offset like (moonDist, 0, 0) from the planet, and the planet rotates around Y, the moon will orbit the planet at the same rate as the planet's spin.

So I can just set the planet's spin speed to something, and the moon will automatically orbit the planet at that rate. But that's not a different speed for the moon.

To get the moon to orbit at a different rate: I can add a moonPivot that compensates. Let me do:
- moonPivot is a child of planet2Mesh, at origin of planet2Mesh
- moonMesh is a child of moonPivot, at (moonDist, 0, 0)
- In animation: set moonPivot.rotation.y = moonOrbitalAngle - planetSpinAngle (to cancel parent rotation and add moon orbital)

Actually since planet2Mesh.rotation.y is being incremented each frame, and moonPivot is a child, moonPivot's world rotation = parent_world_rotation + moonPivot.local_rotation.

So if parent is at angle P, and I want moon at world angle M around the planet:
moonPivot.rotation.y = M - P

But this is getting complicated. Let me simplify: I'll use a moonPivot that I explicitly set each frame.

Actually, let me reconsider the planet spin. The requirement says "spins on its own axis" - this is just a visual thing. I can rotate the planet mesh's rotation.y. Since the mesh is a plain sphere, you can't even see the spin without a texture. But let's do it anyway for correctness.

Let me structure it:
- For planets 1 and 3: orbitalPivot → planetMesh at (dist, 0, 0). Spin the planetMesh.
- For planet 2: orbitalPivot2 → planet2Mesh at (7, 0, 0). Add moonPivot to planet2Mesh. Add moonMesh to moonPivot at (moonDist, 0, 0).
  - In animation loop: planet2Mesh.rotation.y += spinSpeed (this spins the planet)
  - moonPivot.rotation.y = moonOrbitAngle - planet2Mesh.rotation.y (counteracts parent spin, adds moon orbit)

Wait, but moonPivot is a child of planet2Mesh. If I set moonPivot.rotation.y to a value, the world rotation of moonPivot will be parent_world + local. If parent has world rotation P, and I set local to M-P, then world = P + (M-P) = M. That works.

But wait, the moon's orbit should be in the XZ plane. Since the planet mesh's local Y is world Y (assuming we only rotate around Y), this should be fine.

Actually, I realize there might be an issue: the planet mesh is positioned at (7, 0, 0) relative to the orbital pivot, and the orbital pivot is at the origin. The planet mesh itself is at its own local origin (0,0,0) - it's just positioned at (7,0,0) as a child of the orbital pivot group.

So moonPivot is a child of planet2Mesh. planet2Mesh's local coordinate system has its origin at the planet's center (since the mesh geometry is centered at (0,0,0) of the mesh, and the mesh is positioned at (7,0,0) in the parent group). So moonPivot at (0,0,0) local to planet2Mesh is at the planet's center. moonMesh at (moonDist, 0, 0) local to moonPivot is offset from the planet center. 

When I rotate planet2Mesh around Y (its local Y), the moonPivot and moonMesh will follow. To counteract, I set moonPivot.rotation.y to cancel the parent's rotation and add the moon's own orbital rotation.

Let me code this up. I'll track angles explicitly.

Let me write the code now:

```typescript
import * as THREE from 'three';

// Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x222222, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 800, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Sun
const sunGeom = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
const sun = new THREE.Mesh(sunGeom, sunMat);
scene.add(sun);

// Planet data
interface PlanetData {
  distance: number;
  size: number;
  color: number;
  orbitSpeed: number;
  spinSpeed: number;
  mesh: THREE.Mesh;
  pivot: THREE.Group;
  angle: number;
}

function createPlanet(distance: number, size: number, color: number, orbitSpeed: number, spinSpeed: number): PlanetData {
  const pivot = new THREE.Group();
  const geom = new THREE.SphereGeometry(size, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(distance, 0, 0);
  pivot.add(mesh);
  scene.add(pivot);
  return { distance, size, color, orbitSpeed, spinSpeed, mesh, pivot, angle: 0 };
}

const planet1 = createPlanet(4, 0.5, 0x4488ff, 1.5, 2.0);
const planet2 = createPlanet(7, 0.7, 0x44ff88, 0.8, 1.5);
const planet3 = createPlanet(10, 0.6, 0xff8844, 0.4, 1.0);

// Moon for planet 2
const moonGeom = new THREE.SphereGeometry(0.2, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
const moonMesh = new THREE.Mesh(moonGeom, moonMat);
const moonPivot = new THREE.Group();
moonMesh.position.set(1.5, 0, 0);
moonPivot.add(moonMesh);
planet2.mesh.add(moonPivot);

let moonAngle = 0;
const moonOrbitSpeed = 3.0;

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose globals
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  
  const planets: PlanetData[] = [planet1, planet2, planet3];
  
  for (const p of planets) {
    p.angle += p.orbitSpeed * dt;
    p.pivot.rotation.y = p.angle;
    p.mesh.rotation.y += p.spinSpeed * dt;
  }
  
  // Moon orbit (compensate for parent rotation)
  moonAngle += moonOrbitSpeed * dt;
  moonPivot.rotation.y = moonAngle - planet2.mesh.rotation.y;
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

Wait, there's an issue with `moonPivot.rotation.y = moonAngle - planet2.mesh.rotation.y;`. The `planet2.mesh.rotation.y` is the accumulated spin angle. But since I'm using `+=` for the spin, the actual Euler rotation value is what's stored. However, since moonPivot is a direct child of planet2.mesh, the world transform applies parent rotation then local rotation.

If parent world Y rotation = P (which equals `planet2.mesh.rotation.y` since parent's parent only rotates the whole system around Y for orbit, but that's the pivot, not affecting the mesh's local rotation directly... wait.

Let me reconsider the transform hierarchy:
- scene
  - planet2.pivot (Group) → rotation.y = orbital angle O
    - planet2.mesh (Mesh) → position (7,0,0), rotation.y = spin angle S
      - moonPivot (Group) → rotation.y = ?
        - moonMesh (Mesh) → position (1.5, 0, 0)

World transform of moonMesh:
1. Rotate by O around Y (from pivot)
2. Translate by (7,0,0) in pivot's local space → world position
3. Rotate by S around Y (from planet2.mesh local rotation)
4. Rotate by moonPivot.rotation.y around Y (local to planet2.mesh)
5. Translate by (1.5, 0, 0) in moonPivot's local space

So the moon's position relative to the planet center in world space is: rotate(1.5, 0, 0) by angle (S + moonPivot.rotation.y) in the XZ plane.

I want the moon to orbit at angle `moonAngle` in the world frame (relative to the planet center). So I need:
S + moonPivot.rotation.y = moonAngle
→ moonPivot.rotation.y = moonAngle - S

But S is `planet2.mesh.rotation.y` which is being accumulated with `+=`. So yes, `moonPivot.rotation.y = moonAngle - planet2.mesh.rotation.y` should work.

Wait, but there's a subtlety: the pivot rotation O also affects things. Let me trace more carefully.

The world matrix for moonMesh is:
T_origin × R(O) × T(7,0,0) × R(S) × R(moonPivot.rotation.y) × T(1.5, 0, 0)

The planet center in world = R(O) × (7,0,0) translated from origin.
The moon offset from planet center in world = R(O) × R(S) × R(moonPivot.rotation.y) × (1.5, 0, 0)

R(O) × R(S) × R(moonPivot.rotation.y) = R(O + S + moonPivot.rotation.y)

The moon's angular offset from the planet center in world XZ plane = O + S + moonPivot.rotation.y.

I want this to equal `moonAngle`:
O + S + moonPivot.rotation.y = moonAngle
→ moonPivot.rotation.y = moonAngle - O - S

Hmm, that's different from what I had. Let me fix:
`moonPivot.rotation.y = moonAngle - planet2.angle - planet2.mesh.rotation.y;`

Where `planet2.angle` is the orbital angle O.

Actually wait, let me reconsider. The orbit of the moon around the planet - should it orbit in world space XZ at angle moonAngle, or should it orbit relative to the planet's local frame? 

The requirement says "orbiting that planet" - I think it just means the moon goes around the planet. The simplest and most natural interpretation is that in the moon's orbital frame (which rotates with the planet system), the moon orbits. But since the orbit is in the XZ plane and we're looking from above, having the moon orbit in world XZ is fine too.

Actually, the simplest approach: just make the moon orbit around the planet in the local frame of the orbital pivot. That way the moon orbits the planet regardless of the planet's spin. The cleanest way:

Instead of making moonPivot a child of planet2Mesh (which has spin rotation), what if I structure it differently but still satisfy `planet.add(moon)`?

The requirement literally says `planet.add(moon)`. So I must add the moon (or a pivot containing it) as a direct child of the planet mesh.

Let me just compute the correct compensation:
`moonPivot.rotation.y = moonAngle - planet2.angle - planet2.mesh.rotation.y;`

This ensures the moon orbits at `moonAngle` in world space. Since moonAngle increases at moonOrbitSpeed, the moon orbits the planet at that rate in world space. That seems correct and intuitive.

Let me finalize the code. I also need to make sure it compiles with `tsc --strict`. Let me check for any issues:
- `new THREE.Clock()` - fine
- All variables properly typed
- No unused variables issues (strict mode doesn't complain about unused local variables unless noUnusedLocals is set, but we're just asked for --strict which includes strictNullChecks etc.)

Actually, I want to double-check: does `tsc --strict` include `noUnusedLocals`? No, `--strict` includes: alwaysStrict, strictNullChecks, strictBindCallApply, strictPropertyInitialization, strictFunctionTypes, noImplicitAny, noImplicitThis, useUnknownInCatchVariables, useDefineForClassFields. It does NOT include noUnusedLocals or noUnusedParameters.

Let me also make sure the body has no default margin causing issues. The user said "The page has no other HTML" - I should probably set body margin to 0 and overflow hidden. Let me add that.

One more thing: I should make sure the PointLight parameters are correct. In modern Three.js (r155+), PointLight signature is `PointLight(color, intensity, distance, decay)`. With `decay = 2` (default in newer versions), intensity is in candela. I'll set a high intensity.

Actually, let me check: in Three.js r152+, `renderer.useLegacyLights` defaults to false (physically correct). The intensity for PointLight is in candela. At distance r, the illumination is intensity / r². So for r=10, with intensity=800: illumination = 8. That should be visible with standard materials.

But to be safe and make all planets clearly visible, let me use intensity around 2000 or add `decay = 0` (no falloff). Actually with decay=0, it's like an omnidirectional light with constant intensity everywhere. That might be too flat. Let me use a reasonable value.

Hmm, actually I just realized that with newer Three.js versions, if `useLegacyLights` is not set, the default behavior depends on the version. To be safe across versions, I'll explicitly set `renderer.useLegacyLights = false` (or just not set it and use a high intensity). Actually `useLegacyLights` was removed in r155+. Let me just use high intensity values.

Let me use intensity = 1000, decay = 2. At distance 4: 1000/16 = 62.5 (bright). At distance 10: 1000/100 = 10 (should still be visible). With ambient at 0.5, the dark side won't be pure black.

Actually for MeshStandardMaterial, the response depends on the material's color and roughness/metalness. With roughness=0.5 and a colored material, even 10 units of illumination should be clearly visible. Let me go with 1000.

Let me also consider: should I use `toneMapping`? The default `NoToneMapping` should be fine for this.

I think the code is solid. Let me write the final version.
