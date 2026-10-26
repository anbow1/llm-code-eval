Let me write a single TypeScript file implementing this.

Key parts:
- Three.js import.
- Sky addon.
- Ocean ShaderMaterial with Gerstner waves, matching heightAt in JS.
- Boat group with meshes, floating.
- Island procedural mesh with vertex colors.
- Palm trees: trunks (curved) built from cylinders or tube, leaves as one InstancedMesh with >= 30 instances, swayed each frame.
- Lights, fog, tone mapping.
- Camera fixed at (35,12,35) looking at (0,2,0).
- Expose globals.
- __ready after first frame.

Let me design wave function. Use sum of 3-4 directional sine/Gerstner waves.

Wave params:
1. dir = normalize(1, 0.6), wavelength 18, amplitude 0.55, speed 1.0
2. dir = normalize(-0.6, 1.0), wavelength 11, amplitude 0.35, speed 1.4
3. dir = normalize(0.3, -1.0), wavelength 26, amplitude 0.45, speed 0.8
4. dir = normalize(1, -0.8), wavelength 7, amplitude 0.18, speed 1.9

Gerstner: displacement y = A * sin(k * dot(dir, p) - omega * t + phase). For heightAt we ignore horizontal shift. In shader I'll implement Gerstner with horizontal displacement, but requirement says heightAt returns vertical displacement the shader applies at the undisplaced position. Hmm — with Gerstner horizontal displacement, vertices move. To keep matching simple, use plain sine waves (sum of sines) for height, and compute normals analytically from the same sum. That is safe and matches exactly. Sum of sines with different directions is fine — "Gerstner or sine". Crest-to-trough: sum of amplitudes = 0.55+0.35+0.45+0.18 = 1.53, so crest-to-trough up to ~3.06... that's more than 2. Let's tune: amplitudes 0.5, 0.3, 0.4, 0.15 → sum 1.35, crest-to-trough max 2.7 if all align. Requirement says crest-to-trough about 0.5 to 2 units. Let's aim sum amplitudes ~ 0.9 → crest-to-trough 1.8. Use 0.42, 0.26, 0.22, 0.12 → 1.02, c-t 2.04. Hmm slightly over. Use 0.4, 0.25, 0.2, 0.1 = 0.95 → 1.9. Good.

Actually the ocean should look visible; amplitude ~1 crest-to-trough is quite big for realistic ocean but fine visually at this scale.

Normals: for y = Σ Ai sin(kix*x + kiz*z + phase - omega*t), partial derivatives:
dy/dx = Σ Ai * kx_i * cos(...)
dy/dz = Σ Ai * kz_i * cos(...)
normal = normalize(-dy/dx, 1, -dy/dz).

where kx = k * dir.x, kz = k * dir.z, k = 2π/wavelength, omega = k * speed? Speed in units/sec along direction: phase velocity c = omega/k. Let omega = k * c where c is the wave speed. Set speeds.

Let me define wave array in both shader and JS from constant data.

Shader: vertex shader computes position displacement and passes vNormal (computed analytically), vWorldPos, vHeight, and vFoam stuff.

Fragment: 
- deep color vs shallow based on height (higher = lighter/foam).
- Fresnel: dot(normal, viewDir) → mix deep and sky-ish reflection color.
- specular: Blinn-Phong from sun direction.
- foam near crests: smoothstep(height threshold) plus noise-ish using sin.
- Also maybe a shore foam near island — could approximate with distance from origin: foam ring near island radius. But water under island is hidden. Actually island covers center; the shore foam ring near island edge is a plus. I'll do foam based on both crest height and proximity to island edge radius ~ 24 (island radius ~ 22 at water). Hmm, island slopes into the sea, the water plane is at y=0 and island surface above; the water surface would intersect. I'll make island base slightly below water so it looks natural. Foam ring: distance to origin between 20 and 26 → foam. But the boat area also. Fine.

Actually simpler: foam where crest height > threshold, plus a ring around island. Let's include a `vDist` = length of world xz.

Sky: use Sky addon. Sky is a large sphere with shader. Set sun position. Sky's sun position: set uniform sunPosition to normalized vector. Directional light at same direction.

Fog: scene.fog = new THREE.FogExp2 or Fog with color matching horizon. Sky dome colors are turquoise-ish at horizon. Use THREE.Fog(0xa8c8dd, 60, 220). Ocean is 400x400 so far parts fade. But sky dome is behind; fog affects sky? Sky material has fog: false presumably (ShaderMaterial for Sky addon — does it have fog? Sky.js material is ShaderMaterial with fog false by default I think). Actually Sky's material has `fog: false`? Let me recall: `Sky` extends Mesh with ShaderMaterial; in three r150+, Sky material has uniforms and `side: THREE.BackSide, depthWrite: false`. Fog isn't applied since it's a ShaderMaterial without fog chunks. Fine.

Also need horizon blending: ocean fade to fog color.

Let's ensure Sky addon import path: 'three/addons/objects/Sky.js'. With TS strict, the addons have type declarations? Three's package includes types for addons in `three/addons`? In recent three versions, the types are shipped: `three/examples/jsm/objects/Sky.js` has .d.ts? Actually three's npm package ships `examples/jsm/**/*.d.ts`? Since r150ish, there are TS declarations for jsm modules included in the package (three-stdlib aside). Hmm. `tsc --strict` with module resolution "bundler"/node... The addons' type declarations exist in recent three (e.g. `three/addons/objects/Sky.js` maps to `examples/jsm/objects/Sky.js`, and there is `examples/jsm/objects/Sky.d.ts`? I believe three ships `.d.ts` files for jsm since r155 or so). Let me check: three package has files `examples/jsm/controls/OrbitControls.js` and `examples/jsm/controls/OrbitControls.d.ts`? I recall three added type declarations to jsm modules in r153? Hmm. I think yes — three ships TypeScript definitions for the examples modules now (they're generated). To be safe, avoid addons other than Sky, and Sky is required-ish. I could implement my own sky gradient shader instead, avoiding type issues. Requirement says "A sky: a gradient sky dome or the Sky addon". So a gradient sky dome shader is allowed and avoids addon typing risk. I'll do a custom sky dome shader with gradient + sun disc glow. That's safer for tsc strict.

But the prompt says "Addons from 'three/addons/...'" — not required to use. I'll skip addons entirely, or use OrbitControls? Camera must stay at exact (35,12,35) looking at (0,2,0) — "keep this view (OrbitControls are allowed if they start there and do not move by themselves)". I'll skip controls for simplicity, or add OrbitControls with target (0,2,0). Actually, adding OrbitControls would let user orbit, fine but not needed. Skip to reduce risk. Hmm, but maybe OrbitControls types exist. Skipping is safer.

Sky dome: SphereGeometry(400, 32, 16) with BackSide, ShaderMaterial with gradient based on normalized y direction, sun direction dot for sun glow/disc. Set depthWrite false. It should be fine at radius 400 with camera far 1000.

Ocean geometry: PlaneGeometry(400, 400, 200, 200) rotated -π/2. That's 201x201 = 40401 vertices, fine. Requirements: ≤256 segments. 200 good. Maybe 220 for smoother waves. Use 192? Waves wavelengths 7-26 units, so grid resolution 400/200 = 2 units per quad. Wavelength 7 → 3.5 quads per wavelength — a bit coarse but visible. Use 256 segments → 1.56 units per quad, that's better: 256x256 = 66049 verts, fine. Let's use 256.

Note: with plane rotated, position attribute is in x,z local. Before rotation: geometry plane in XY with z=0. Applying rotation -π/2 to mesh maps local (x,y,0) → world (x, 0, -y)? Let's think: rotationX(-π/2): y→? Rotation matrix around X by -90°: (x, y, z) → (x, y cos(-90) - z sin(-90), y sin(-90) + z cos(-90)) = (x, z*... wait cos(-90)=0, sin(-90)=-1. y' = y*0 - z*(-1) = z. z' = y*(-1) + z*0 = -y. So local (x, y, 0) → (x, 0, -y). So world z = -local y. That means displacement in shader: we can compute wave in local x,y coordinates and set local z = displacement height, which becomes world y? Careful: local z displacement d → world y' = ... let's recompute: local point (x, y, z=d) → world (x, y' = z*1? from formula y' = y*cos + ... let me redo with rotation matrix R_x(θ):
y' = y cosθ - z sinθ
z' = y sinθ + z cosθ
θ = -π/2: cos=0, sin=-1.
y' = 0 - d*(-1) = d. z' = y*(-1) + 0 = -y.
So local z displacement d becomes world y = d. Good. Local x → world x, local y → world z = -y. So if I compute waves using local position.x and local position.y as (x, z_local), the world z is -y_local. To keep heightAt(x,z) matching, I need mapping.

Simpler: build the PlaneGeometry with rotation baked in via `geometry.rotateX(-Math.PI/2)` so the position attribute is already in world-ish x,y(0),z coordinates: position.x, position.y=0, position.z. Then in vertex shader, use position.x and position.z directly and set position.y = height. That's cleaner. Then mesh has no rotation, normals fine.

So: const geo = new THREE.PlaneGeometry(400, 400, 256, 256); geo.rotateX(-Math.PI/2); Then attributes: pos.x ∈ [-200,200], pos.y=0, pos.z ∈ [-200,200]. In vertex shader: compute displacement along y.

Wait — rotateX(-π/2) on the plane geometry: original plane in XY with y ∈ [-200,200], z=0. After rotation: (x, y, 0) → y' = 0 - 0 = 0, z' = y*(-1) = -y. So z ∈ [-200,200]. Good — y = 0. 

Then vertex shader: compute h = waveHeight(pos.x, pos.z, time) and set transformed.y = h.

Normals: geometry has normal (0,1,0) after rotation... actually after rotateX the normals get rotated too: (0,0,1) → (0, 1, 0)? Normal (0,0,1): y' = 0*0 - 1*(-1) = 1, z' = 0*(-1)+1*0 = 0 → (0,1,0). Yes. But we compute our own normal anyway.

Vertex shader code:

```
uniform float uTime;
uniform vec3 uSunDir;
varying vec3 vNormalW;
varying vec3 vWorldPos;
varying float vHeight;
varying vec2 vXZ;

const int NWAVES = 4;
uniform vec4 uWaveA[4]; // kx, kz, amplitude, omega... 
```
Using uniform arrays with TS strict — need to build uniform values. Simpler: hardcode wave constants in GLSL strings so both shader and JS share values written manually. That's safe: define the waves in GLSL via constants and in JS via an array matching exactly. Risk of mismatch but I'll be careful.

Maybe better: pass uniform arrays. `uniform vec4 uWaves[4];` where x=kx, y=kz, z=amplitude, w=omega. And uniform float uPhase[4]? Or fold phase into the shader using a constant offset: phase_i = i * 1.7. Or include phase as part of uniform array in 5th component — use vec4 for kx,kz,amp and another vec4 for omega and phase? Let's do two arrays: `uWaveA[i] = (kx, kz, amp, omega)` and `uWaveP[i] = phase`. Fine but JS needs to compute the same.

I'll just do:

```
const WAVES = [
  { dir: new THREE.Vector2(1, 0.35).normalize(), wavelength: 24, amp: 0.40, speed: 2.4, phase: 0.0 },
  ...
];
```

omega = 2π/wavelength * speed? For sine wave: sin(k·p - ωt + φ). Phase velocity c = ω/k. If "speed" is phase velocity in units/s: ω = k*c. Let's define speed as ω directly maybe easier: ω such that period ~ 3-5 s: ω = 2π/T. Let's just set omega directly.

Choose:
w1: dir (1, 0.3), λ=26, amp=0.40, ω=1.4, φ=0
w2: dir (-0.6, 1), λ=15, amp=0.26, ω=1.9, φ=1.7
w3: dir (0.4, -1), λ=9, amp=0.16, ω=2.6, φ=3.1
w4: dir (1, -0.9), λ=6, amp=0.10, ω=3.3, φ=4.6

Sum amps = 0.92 → crest-to-trough ≤1.84. Good.

height(t) = Σ amp * sin(kx*x + kz*z + φ - ω*t).

Note k = 2π/λ; kx = k*dir.x, kz = k*dir.z.

Normals: n = normalize(-∂h/∂x, 1, -∂h/∂z).

∂h/∂x = Σ amp*kx*cos(...) ; ∂h/∂z = Σ amp*kz*cos(...).

In shader, use the same.

For a nicer look, add a small high-frequency detail wave that isn't part of heightAt? That would break matching slightly but heightAt is about displacement; extra detail ripple with tiny amplitude could still be included in the height function since it's the same sum. Just add it as wave 4 with small amplitude. Fine.

Fragment shader:

- Compute view direction from camera.
- Fresnel: f = pow(1 - max(dot(n, viewDir), 0), 3) maybe blend.
- Deep color: vec3(0.02, 0.11, 0.18) hmm tropical ocean: deep teal-blue (0.02, 0.16, 0.24), shallow (0.10, 0.55, 0.62).
- Sky reflection color: mix of horizon color and zenith: maybe vec3(0.55, 0.72, 0.85).
- Specular: sun highlight, `pow(max(dot(reflect(-viewDir... )))`. Use Blinn: H = normalize(sunDir + viewDir), spec = pow(max(dot(n,H),0), 120) * sunColor * intensity.
- Also add sparkle using a noise-ish variation? Keep simple but nice: add a "glitter" term using a sine pattern on the fragment — not necessary.
- Foam: crest foam where h > threshold: smoothstep(0.55, 0.8, h) with a noise factor (sin(x*3+..)*sin(z*..)) to break up; and shore foam ring: distance from origin, smoothstep around radius 24..30. But if island radius ~22, and the water surface at the island's shore — foam ring near r ~22-26.

Careful: the island geometry sits above water; the ocean plane passes through it. The island base should extend below water so no gap.

Also the ocean plane at y varying ±1 may poke above the island's low sand? The island sand near the water edge is at y ~0 to 0.5. If waves go up to +0.9, the ocean surface might intersect the beach, which actually looks fine (waves washing on shore) — but on the far side of the island it would occlude. It's fine.

Let's design the island:
- Use a radial height function: h(r) = peak * exp(-(r/R)^2) shaped, plus noise. Actually want slope into sea: at r > R, height drops below 0 (underwater). Use h = peak * (1 - (r/R)^2) clamped? Better: h(r) = peak * smoothstep... Let's create with a grid: a disc geometry? Use a plane grid 80x80 covering [-40,40] and height function.

But island "about 30 to 50 units across, peak 5 to 15 above water". So radius ~22, peak ~9.

Height function:
```
function islandHeight(x, z) {
  const r = Math.hypot(x, z);
  const R = 22;
  let h = 9 * Math.pow(Math.max(0, 1 - (r / R) ** 2), 1.6); // dome shape
  // noise
  h += 0.8 * Math.sin(x*0.35) * Math.cos(z*0.3) * smooth...
  ...
  h -= 1.5; // base below water at edges
}
```
Hmm at r=R, h=0 → then shoreline at r=R exactly at water level. Add noise and subtract so edges go below water: use `1 - (r/R)^2` raised to 1.3 and multiply 10; at r=R, h=0; for r>R negative if continue; we'll cut off grid at r>R? The grid is 80x80 so corners at r=56. With formula 10*(1-(r/22)^2)^1.3, at r=56: 1 - 6.48 = -5.48 → pow negative with fractional exponent → NaN. So clamp: t = max(0, 1 - (r/R)^2), h = 10 * pow(t, 1.4) - 1.2. At r≥R h=-1.2 (submerged). That gives abrupt flat below water but it's under the ocean anyway. But the shore would be a sharp cliff at r=R going from 0 to -1.2. Over one grid step that's fine visually? It creates a ring. Better to make a smooth falloff: h = 10 * (1 - (r/R)^2) for r<R, and for r>R: h = -1.5 * ((r-R)/(R*0.6))? Let's do:

```
const rn = r / R;
let h;
if (rn < 1) h = peak * Math.pow(1 - rn*rn, 1.5);
else h = -1.5 * Math.min(1, (rn - 1) * 2);
```
At rn=1: h=0. At rn=1.5: -1.5. Smooth-ish.

Add noise: multiply by (0.75 + 0.25*noise) or add small bumps. Use sin combos:
```
h += 0.7 * Math.sin(x*0.5 + 1.3) * Math.cos(z*0.45) * (1 - rn) // fades at edge
```
But this can make shoreline height vary above 0 at edge — fine, creates irregular shore. Ensure near edge noise factor multiplied by (1 - rn)^? Actually use factor `Math.max(0, 1 - rn)` so zero at edge, then shoreline exactly at water level. Good.

Then the beach: vertex colors based on height: h<0.6 sand, 0.6-2.5 → sand→grass, higher → grass/dark rock. Add some variation with noise.

Grid: PlaneGeometry(90, 90, 120, 120) rotated -π/2 → 14641 verts, fine. Actually for a disc, better use a CircleGeometry with radial segments? Plane grid is easier and we just displace. Since outer region is below water, it's hidden.

Vertex colors: set color attribute. Also compute normals via geometry.computeVertexNormals(). Material: MeshStandardMaterial with vertexColors true, roughness 0.9, metalness 0. Add flatShading? No, smooth.

Also the island "receives shadows" — mesh.receiveShadow = true; castShadow = true too.

Palm trees: at least 5. Each palm: curved trunk made of cylinder segments or a TubeGeometry along a curve. Use a `CatmullRomCurve3` and `TubeGeometry(curve, 12, 0.25, 8)` tapering? TubeGeometry radius constant. Could use a series of cylinders tapering — simpler: build trunk from 6 cylinder segments each with decreasing radius and slight bend. But that's many meshes. Alternative: a single TubeGeometry with radius 0.3 then a cone at top. Fine. Use trunk radius scaled? Let's build a custom trunk with CylinderGeometry stacked: for each palm, 5 segments, each a mesh — 5 palms * 5 = 25 meshes, acceptable. But merging is better. Simpler: use TubeGeometry with a curve, radius 0.28, radial 8, tubular 16. Add slight taper by scaling? TubeGeometry has constant radius. Fine visually.

Leaves: ONE InstancedMesh with all leaves from all palms. Each palm crown has ~8-10 leaves → 5 palms * 9 = 45 instances, need ≥30. Each leaf: a flattened cone/plane shape. Use a custom leaf geometry: a tapered "blade" — maybe use a PlaneGeometry curved? Simplest: ConeGeometry(0.35, 2.6, 4) flattened? Or a custom BufferGeometry leaf shape: a long tapered quad with midrib. Let's make a leaf geometry from a parametrized shape:

Create leaf geometry as a strip: width tapering, with slight downward curve. E.g., use PlaneGeometry(0.6, 2.4, 1, 6) and modify vertices to taper width along length and bend down. Then instance it with rotations.

Leaf local orientation: length along +Z? Let's define leaf extending along +X, with width in Z, and droop in Y. Create geometry with positions: for i segments along length L=2.6, taper width w = 0.35 * sin(π * u) maybe. Let's just build a BufferGeometry manually:

```
function makeLeafGeometry() {
  const segs = 8;
  const L = 2.6;
  const positions: number[] = [];
  const indices: number[] = [];
  // use a plane strip: vertices at (u*L, droop, ±w(u)/2)
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const x = u * L;
    const w = 0.30 * Math.sin(Math.PI * Math.pow(u, 0.65)) * (1 - 0.25*u);
    const y = -0.55 * u * u; // droop
    positions.push(x, y, -w, x, y, w);
  }
  for (let i = 0; i < segs; i++) {
    const a = i*2, b = i*2+1, c = (i+1)*2, d = (i+1)*2+1;
    indices.push(a, c, b, b, c, d);
  }
  ...
}
```
Hmm sin(π * u^0.65) → width 0 at both ends, max mid-ish. Good.

Material: MeshStandardMaterial({color: 0x2f7d32, side: DoubleSide, roughness: 0.75}). Could add slight emissive? no.

Instance matrices: For each palm, for each leaf angle around the crown, compose matrix = palmBaseMatrix * rotationY(angle) * rotationX(tilt) * scale. Then apply sway: each frame add rotation offset based on sin(t + phase).

Implementation: store leaf data (position of crown, angle, tilt, scale, phase) in an array. Each frame, compute a Matrix4 for each instance with quaternion from Euler (sway on X/Z). Use `matrix.compose(position, quaternion, scale)`.

But need world position = crown position; leaf geometry starts at origin extending +X, so rotate around Y by angle then tilt around Z (down) then sway. Using Euler: order 'YXZ' with y=angle, z=-tilt, x=sway. Let's use a temp Matrix4 and setFromRotationMatrix? Simpler: build quaternion from Euler.

```
const e = new THREE.Euler(swayX, angle, tilt + swayZ, 'YXZ');
```
Hmm careful: leaf along +X. To spread leaves radially around the crown, rotate about Y by angle. To droop, rotate about Z by -tilt (rotating +X downward). Sway in wind: rotate about Z by ±small and about X small. But Y rotation applied first then Z: with order 'YXZ', rotation = Ry * Rx * Rz. That's fine.

Let me use `const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(swayX, angle, -tilt + sway, 'YXZ'))`. Actually Euler order YXZ means R = Ry * Rx * Rz? In Three, Euler order 'YXZ' means rotations applied in order... The quaternion is R = Ry * Rx * Rz? Let's not overthink; any combination looks fine.

Positions: leaves crown at top of trunk. The instance matrix's position is the crown point. Good.

Then also palm crown center maybe add a small sphere/cone? Not required. Could add coconuts but skip.

At least 5 palms: place 6 palms on island at various radii/angles with heights from islandHeight. Compute y = islandHeight(x,z) with trunk base at that y.

Trunk: curve from base to top, bending. TubeGeometry with CatmullRomCurve3 of 4 points. Radius 0.22 constant; add leaves at top.

Also each trunk casts shadow.

Now boat:
- Group at position (12, y, 14).
- Hull: shape from primitives. Use a box or a scaled sphere? A hull: use `THREE.CapsuleGeometry`? Or create hull via BoxGeometry with tapered ends? Let's build hull from a Lathe? Simpler: hull = a BoxGeometry(1.8, 0.9, 4.5) with some scaling? That looks blocky. Better: hull from a `SphereGeometry` scaled: sphere scaled (1.0, 0.55, 2.3), cut? A sphere gives a rounded boat shape. Use half-sphere? Let's do: hull = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), material); scale (1.1, 0.7, 2.3); then position y=0. It looks like a rounded capsule boat. Add a deck plane on top.

Better approach: custom hull geometry with tapered bow. Build a hull by extruding a cross-section? Let's do a simple lathe-ish: Create a BufferGeometry manually? That's more code. Rounded scaled sphere is acceptable "built from primitives". Use a CapsuleGeometry(0.55, 3.2, 8, 12) rotated to align along Z, scaled a bit — capsule = cylinder with rounded ends, looks like a hull when squashed vertically. CapsuleGeometry(radius=0.5, length=3.0, capSegments=6, radialSegments=12) aligned along Y by default; rotate X by π/2 to align along Z. Then scale y by 0.7 to flatten. Capsule is centered at origin. Good.

Add a deck: BoxGeometry(1.4, 0.12, 3.6) at y=0.35 or a plane. Add cabin: BoxGeometry(1.2, 0.8, 1.6) at y=0.8. Add mast: CylinderGeometry(0.06,0.07,4.5) at y ~2.8. Add sail: a triangle-ish using BufferGeometry or a Plane with shape. Use `THREE.Shape` + ShapeGeometry for sail: triangle. Sail as a ShapeGeometry, double-sided.

Boat length ~4 units: capsule length 3.0 + 2*0.5 = 4.0. Good.

Group castShadow on all children.

Floating: each frame:
```
const t = ocean.time();
const x = boatBase.x + drift, z = boatBase.z + drift2;
const h = heightAt(x,z,t);
boat.position.set(x, h + 0.15, z);
// sample slopes
const dx = heightAt(x+1.5,z,t) - heightAt(x-1.5,z,t);
const dz = heightAt(x,z+1.5,t) - heightAt(x,z-1.5,t);
boat.rotation.x = -Math.atan2(dz, 3)? 
```
Careful with boat orientation. Pitch (rotation about X) from z-slope: if water higher at +z, the bow (front at +z) rises → rotation about X negative? A rotation about X: positive rotation about X tilts +y toward +z? Rotation about X by θ: point (0,1,0) → (0, cosθ, sinθ). So positive θ tilts up toward +z. If height increases toward +z (dz>0), the front should tilt up → positive rotation.x. So rotation.x = atan2(dzForward/... ). With sample: slopeZ = (h(z+d) - h(z-d)) / (2d). Then rotation.x = slopeZ (positive tilts front up). Wait rotation.x positive tilts the +y axis toward +z; but for the boat's bow at +z, the bow's height relative to center: rotating about X by θ moves point (0,0,1) → (0, -sinθ, cosθ). So the bow at +z goes DOWN for positive θ. Hmm. Let's compute: R_x(θ): y' = y cosθ - z sinθ, z' = y sinθ + z cosθ. Point (0,0,1): y' = -sinθ, z' = cosθ. So bow goes down with positive θ. So to raise bow when water is higher at +z, we need θ = -slopeZ. Hmm, θ = -atan(slopeZ)? Let's verify: slopeZ>0 means water higher ahead (+z). Bow should point up → y' > 0 at z=+1 → -sinθ > 0 → θ < 0. So rotation.x = -atan2? Actually slope and angle: tanθ = -slopeZ, so θ = -atan(slopeZ). Use `boat.rotation.x = -Math.atan(slopeZ)`? But magnitude small; use slope directly (radians) for small angles: rotation.x = -atan(slopeZ). Fine.

Roll (rotation.z): if water higher at +x (right side), the boat should roll... The +x side rises: rotation about Z by θ: point (1,0,0) → (cosθ, sinθ, 0). Positive θ raises +x side. So rotation.z = +atan(slopeX) where slopeX = (h(x+d)-h(x-d))/(2d). Good.

Also boat's local coordinate: capsule rotated along Z, so bow at +z. Good.

Drift slowly: boatBase position oscillating: x = 12 + sin(t*0.15)*1.5, z = 14 + cos(t*0.12)*1.5 — stays within 25 of origin (max ~15.5, fine).

Expose __boat as the Group.

Shadow camera covers island and boat: directional light shadow camera orthographic ±40, near 1, far 200. Light position at, e.g., sunDir * 60. Sun direction for sky: let's pick a low sun for nice lighting: direction normalized (0.55, 0.45, 0.35)? A tropical sun near horizon gives warm light. Sky addon's sun position typically is (x,y,z) normalized. Let's pick sunDir = new THREE.Vector3(0.45, 0.35, 0.55).normalize()? Hmm camera at (35,12,35) looking at origin; sun behind camera-ish might be nice for reflections. Specular from sun on water visible when sun roughly opposite camera? For the water highlight, sun direction should be positioned such that reflection is visible. Camera looks from +x,+z toward origin. Sun reflection visible if sun is roughly in the direction of view mirrored... Sun at (0.6, 0.5, 0.5) (in the same quadrant as camera) will produce a specular highlight near the horizon? The reflection vector of view about normal points toward sun; with camera at +x+z and sun also +x+z, the highlight appears in the water near the camera side — actually the specular glint appears where the mirror direction from surface to camera equals sun. For sun high in the sky and camera low, glint appears far away. Let's just put sun at (0.5,0.55,0.4) normalized, i.e., high-ish. A glint will appear somewhere. Fine.

Sky gradient: bottom horizon color warm-ish (0.65,0.8,0.9) to zenith (0.25,0.55,0.85). Add sun disc glow via `pow(max(dot(dir, sunDir),0), 400)` and a halo.

Sky dome should follow camera? Since radius 400 and camera at ~50 distance, fine. It must be rendered with depthWrite false and side BackSide; far plane 1000 so visible. Also set `sky.frustumCulled = false`? Fine.

Alternatively, use scene.background = color? The sky dome covers.

Fog: `scene.fog = new THREE.Fog(0xbfd9e8, 80, 300)` — but fog affects ocean and island, blending far ocean into horizon. Note the sky dome is a Mesh with ShaderMaterial; fog not applied (unless fog uniforms included). Good. But the horizon where ocean ends (at ±200) should blend with sky horizon color. Set fog color close to sky horizon color. Ocean fragment: apply fog manually? With ShaderMaterial, fog isn't automatic. I need to implement fog in the fragment shader. Add uniforms for fog color and near/far and mix based on distance. Or set `material.fog = true` and include fog chunks — for ShaderMaterial, you can include `#include <fog_pars_fragment>` etc., but need to add fog uniforms via `UniformsUtils.merge` with THREE.UniformsLib.fog. That's doable:

```
const uniforms = THREE.UniformsUtils.merge([
  THREE.UniformsLib.fog,
  { uTime: {value:0}, ... }
]);
material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `#include <fog_pars_vertex> ...`,
  fragmentShader: `#include <fog_pars_fragment> ...`,
  fog: true
});
```
And in vertex shader include `#include <fog_vertex>` after setting `mvPosition`? The fog chunks use `vFogDepth = -mvPosition.z` in newer three versions. Let me recall three's fog_vertex chunk:

```
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif
```
And fog_pars_vertex:
```
#ifdef USE_FOG
	varying float vFogDepth;
#endif
```
and fog_fragment:
```
#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
```
This requires `USE_FOG` define which ShaderMaterial sets when `fog: true` and scene.fog exists. Yes, `material.fog` default true for ShaderMaterial? In ShaderMaterial, `fog` property exists and WebGLProgram sets USE_FOG if material.fog && scene.fog. Good.

I'll merge uniforms with UniformsLib.fog. Need `declare` types? THREE.UniformsLib exists in types. Fine.

Alternatively do manual fog: pass uFogColor, uFogNear, uFogFar and use smoothstep on distance. Simpler and safer. I'll do manual.

Ocean fragment with manual fog:
```
float dist = length(vWorldPos - cameraPosition); // cameraPosition built-in
float fogFactor = smoothstep(uFogNear, uFogFar, dist);
gl_FragColor = vec4(mix(col, uFogColor, fogFactor), 1.0);
```

Also use `gl_FragColor` — in three r155+ with WebGL2, ShaderMaterial still supports gl_FragColor. sRGB output handled by tone mapping/color space conversions: with ShaderMaterial, the output is not automatically converted to sRGB unless you use `#include <colorspace_fragment>`. Actually renderer.outputColorSpace = SRGBColorSpace, and ShaderMaterial fragment shaders are expected to output linear color? In three, for ShaderMaterial, the renderer applies output encoding via the `colorspace_fragment` include only if present in shader. Hmm: In three r152+, custom ShaderMaterial output is NOT automatically converted; you must include `#include <colorspace_fragment>` at the end. Similarly tone mapping include `<tonemapping_fragment>`.

Yes, standard practice: custom shaders need `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` after setting gl_FragColor. I'll add both. These chunks use `gl_FragColor` and tone mapping uniform `toneMappingExposure`. renderer.toneMapping = ACESFilmicToneMapping sets the define TONE_MAPPING? For ShaderMaterial, `WebGLProgram` adds `#define TONE_MAPPING`? The tonemapping_fragment chunk is:
```
#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
The `toneMapping` function is defined in `tonemapping_pars_fragment` which needs include. Hmm, for ShaderMaterial, the renderer's `program` includes tonemapping_pars_fragment automatically? In WebGLProgram, prefixFragment includes:
```
parameters.toneMapping !== NoToneMapping ? getToneMappingFunction(...) : ''
```
Actually the program prefix for ShaderMaterial includes `getToneMappingFunction` maybe only when material.toneMapped is true. In three's WebGLProgram.js:

```
prefixFragment = [
  customExtensions,
  ...
].join('\n');
...
if ( parameters.toneMapping !== NoToneMapping ) { ... }
```
Let me recall more concretely: WebGLProgram builds prefixFragment with `getToneMappingFunction( 'toneMapping', parameters.toneMapping )` when `parameters.toneMapping !== NoToneMapping` and material.toneMapped? I believe parameters.toneMapping = material.toneMapped ? renderer.toneMapping : NoToneMapping. And the prefix includes the tone mapping function definitions for all materials. And `#define TONE_MAPPING` is added if toneMapping !== NoToneMapping.

For colorspace: `#include <colorspace_fragment>` uses `linearToOutputTexel` function defined in prefixFragment (the colorspace pars) for all materials. In recent versions, the color space conversion functions are added to the prefix. So including `<colorspace_fragment>` in a ShaderMaterial works.

Hmm, but in older versions, the output encoding conversions happen via `encodings_fragment`/`colorspace_fragment` include. Since we're writing for a recent three (r160+ presumably), `#include <colorspace_fragment>` is the way.

Actually, an alternative: don't use tone mapping includes and just output linear, letting renderer handle? For ShaderMaterial, renderer does NOT apply output conversion automatically — WebGLRenderer's `outputColorSpace` conversion is done in shaders via include. So we need includes. I'll include `<tonemapping_fragment>` and `<colorspace_fragment>`. Both chunks are defined in three's ShaderChunk. If TONE_MAPPING isn't defined, the include is a no-op. If colorspace functions exist, it converts.

Risk: tsc doesn't care about GLSL strings. Runtime correctness is the concern. I'll go with the standard includes; they are widely used and work in r150+.

Let's double check `colorspace_fragment` chunk in r160:
```
gl_FragColor = linearToOutputTexel( gl_FragColor );
```
and `linearToOutputTexel` is defined in the fragment prefix for all materials via `getTexelEncodingFunction`? In WebGLProgram, prefixFragment includes:
```
parameters.outputColorSpace === SRGBColorSpace ? '#define SRGB_TRANSFER' : ...
```
Hmm, in r152+, the prefixFragment includes `getTexelEncodingFunction('linearToOutputTexel', parameters.outputColorSpace)`. I'm fairly confident this exists for ShaderMaterial too, since the shader compilation code path is shared. Yes — WebGLProgram applies the same prefix to all materials (with parameters.outputColorSpace). Good.

Now, for the Sky dome, it's a ShaderMaterial too; must include tone mapping and colorspace includes for consistency.

Island material MeshStandardMaterial — standard handling.

Boat materials MeshStandardMaterial.

Sun light: DirectionalLight color warm (0xfff2d8), intensity ~2.5 with ACES tone mapping. Hemisphere light sky/ground colors intensity 0.6. Ambient maybe 0.2.

Shadows: renderer.shadowMap.enabled = true; type PCFSoftShadowMap. Sun shadow camera: left/right ±40, top/bottom ±40, near 0.5, far 200, mapSize 2048. Sun position = sunDir * 70 (normalized dir * distance). Target default at origin. Good, covers island (r 22) and boat at (12,14).

Ocean doesn't cast shadows and doesn't receive (it's a custom shader). Set ocean.receiveShadow = false; Actually ocean could receive shadows but custom shader would need shadow map integration — skip.

Island castShadow and receiveShadow true. Boat castShadow true. Palms cast/receive.

Now writing the code with careful TS strict.

Potential strict issues:
- `(window as any)` fine.
- No implicit any parameters — annotate.
- null checks: `scene.fog` etc.
- Typed arrays.

Let me write the code.

```ts
import * as THREE from 'three';

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
```
Also set overflow hidden and canvas display block.

Scene:
```ts
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfd7e6, 90, 260);
```
Hmm fog near 90 far 260: ocean at 200 distance from camera ~ 250, so fades. Camera distance to origin ~ sqrt(35^2+12^2+35^2)=51.8. Ocean far edge distance ~ 50+200*... up to ~250. So fog 90..260 works. But island would be slightly fogged? Island at distance ~50 → no fog. Good.

Camera:
```ts
const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1200);
camera.position.set(35, 12, 35);
camera.lookAt(0, 2, 0);
```

Sky dome:
```ts
const skyGeo = new THREE.SphereGeometry(500, 40, 24);
const skyUniforms = {
  uSunDir: { value: sunDir.clone() },
  uHorizon: { value: new THREE.Color(0x9fd0e6) },
  uZenith: { value: new THREE.Color(0x2a6fb0) },
  ...
};
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyUniforms,
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `...`,
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
});
```
Sky sphere radius 500 must be within far 1200 and camera at 50 — fine. But the sky is not at infinity, so it moves with camera? It's fixed at origin; camera moves only if controls. Camera fixed, so fine.

In fragment: 
```glsl
vec3 dir = normalize(vDir);
float h = clamp(dir.y, -0.1, 1.0);
vec3 col = mix(uHorizon, uZenith, pow(max(h, 0.0), 0.55));
float sunDot = max(dot(dir, uSunDir), 0.0);
col += uSunColor * pow(sunDot, 900.0) * 2.5; // disc
col += uSunColor * pow(sunDot, 40.0) * 0.25; // halo
// slight warm horizon glow toward sun
col += vec3(1.0, 0.6, 0.3) * pow(sunDot, 6.0) * 0.15 * (1.0 - h);
gl_FragColor = vec4(col, 1.0);
#include <tonemapping_fragment>
#include <colorspace_fragment>
```
Note: The horizon color needs to match fog color since ocean fades to fog. Use fog color = horizon-ish color.

Sun direction: `const sunDir = new THREE.Vector3(0.45, 0.42, 0.35).normalize();` Then sun light position = sunDir * 80.

Hmm, if sun is at y 0.42 of normalized (about 25° elevation) it's a warm afternoon. Good.

Ocean shader uniforms: uTime, uSunDir, uFogColor, uFogNear, uFogFar, uCameraPos maybe cameraPosition is built-in in ShaderMaterial (yes, `cameraPosition` is a built-in uniform in ShaderMaterial). Also vNormalW etc.

Vertex shader:

```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHeight;

const int NW = 4;
// hardcoded waves
float wave(vec2 p, vec2 dir, float k, float amp, float omega, float phase) {
  return amp * sin(dot(p, dir) * k + phase - omega * uTime);
}
...
```

Better implement with explicit loops over a const array. GLSL ES 1.0 doesn't allow arrays of vec4 with const initialization? `const vec4 W[4] = vec4[4](...)` is ES3? In GLSL ES 1.00 (WebGL1), array constructors aren't supported. But three uses WebGL2 by default (WebGLRenderer uses WebGL2 in r155+). ShaderMaterial default GLSL version is GLSL1 unless `glslVersion: THREE.GLSL3`. In WebGL2 context, GLSL1 shaders are still supported (WebGL2 supports GLSL ES 1.00). Array constructors in GLSL ES 1.00 are not supported. So avoid array initializers; just unroll manually.

I'll write explicit functions and unroll 4 waves manually in both vertex and fragment (normal computing). Actually I can compute a helper that sums. Let's write explicit code:

```glsl
float h1(vec2 p){ return 0.40 * sin(dot(p, vec2(0.9555, 0.2950)) * 0.2417 + 0.0 - 1.4 * uTime); }
```
where k = 2π/λ: λ=26 → k=0.24166; dir normalized (1,0.3)/1.044 = (0.9578, 0.2873).

Let me compute the wave data precisely in JS and then generate the GLSL by embedding numbers? Since it's a single file, I can generate shader strings from the WAVES array using template literals in JS! That guarantees matching. Good idea: build the GLSL source partially programmatically.

Define:

```ts
type Wave = { dirX: number; dirZ: number; k: number; amp: number; omega: number; phase: number };
const wavelengthList = [26, 15, 9, 6];
const dirs: [number, number][] = [[1, 0.3], [-0.6, 1], [0.4, -1], [1, -0.9]];
const amps = [0.40, 0.26, 0.16, 0.10];
const omegas = [1.4, 1.9, 2.6, 3.3];
const phases = [0.0, 1.7, 3.1, 4.6];
```

Build waves: normalize dir, k = 2π/λ, kx = k*dirX, kz = k*dirZ.

Then GLSL code:
```ts
function glslTerm(w: Wave, index: number): string {
  return `float c${index} = cos(dot(p, vec2(${w.kx.toFixed(6)}, ${w.kz.toFixed(6)})) + ${w.phase.toFixed(6)} - ${w.omega.toFixed(6)} * uTime);\n`;
}
```
And height:
```ts
const heightGLSL = waves.map((w,i)=>`h += ${w.amp.toFixed(6)} * sin(dot(p, vec2(${w.kx}, ${w.kz})) + ${ph} - ${om} * uTime);`).join('\n');
```
Normal:
```ts
const normalGLSL = waves.map(w=>`float c${i} = cos(...); dhdx += ${amp}*${kx}*c${i}; dhdz += ${amp}*${kz}*c${i};`)
```

Actually I can compute all in one function `waveHeight(vec2 p)` and `waveSlope(vec2 p)` returning vec2.

Let me define GLSL:
```glsl
uniform float uTime;

float waveHeight(vec2 p) {
  float h = 0.0;
  h += 0.400000 * sin(dot(p, vec2(...)) + ... - ...);
  ...
  return h;
}
vec2 waveSlope(vec2 p) {
  vec2 s = vec2(0.0);
  float c;
  c = cos(dot(...)); s.x += 0.4*kx*c; s.y += 0.4*kz*c;
  ...
  return s;
}
```
And JS heightAt uses same array.

In vertex shader:
```glsl
void main() {
  vec3 p = position;
  float h = waveHeight(p.xz);
  p.y += h;
  vec2 slope = waveSlope(p.xz);
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * n);
  vHeight = h;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
```
Note p.xz uses original undisplaced coords — correct.

Fragment:
```glsl
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSkyRefl;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHeight;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunDir);

  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  fres = clamp(fres, 0.0, 1.0);

  // depth color from crest height
  float h = clamp(vHeight, -1.0, 1.0);
  vec3 base = mix(uDeep, uShallow, smoothstep(-0.9, 0.9, h) * 0.55);
  // shallow near island? optional

  vec3 refl = uSkyRefl;
  vec3 col = mix(base, refl, fres * 0.85);

  // specular
  vec3 H = normalize(L + V);
  float spec = pow(clamp(dot(N, H), 0.0, 1.0), 180.0);
  col += uSunColor * spec * 2.2;

  // secondary broad specular
  float spec2 = pow(clamp(dot(N, H), 0.0, 1.0), 24.0);
  col += uSunColor * spec2 * 0.12;

  // foam on crests
  float crest = smoothstep(0.42, 0.72, vHeight);
  float ripple = 0.5 + 0.5 * sin(vWorldPos.x * 2.1 + uTime * 2.0) * sin(vWorldPos.z * 1.7 - uTime * 1.3);
  crest *= (0.45 + 0.55 * ripple);
  // shore foam
  float r = length(vWorldPos.xz);
  float shore = smoothstep(26.0, 22.0, r) * smoothstep(17.0, 21.0, r); // hmm
  ...
```
Careful: shore foam should be near the island edge radius ~21-24, only if island radius ~22. `smoothstep(26,22,r)` is 0 for r>26, 1 for r<22; and `smoothstep(17,21,r)` is 0 for r<17, 1 for r>21 → combined nonzero only in 21..26 region. Actually at r<21 second gives 0; at r>26 first gives 0. So ring 21→26. Good. Also modulate by ripple for a natural edge.

Add foam:
```glsl
float foam = clamp(crest * 0.85 + shore * 0.9 * (0.6 + 0.4*ripple), 0.0, 1.0);
vec3 foamCol = vec3(0.95, 0.97, 0.98);
col = mix(col, foamCol, foam * 0.8);
```
But near-shore foam everywhere at ring might look odd since the island occupies most of the ring region (island radius at water level is 22). The water inside r<22 is underwater island surface? The island height at r=22 is 0 and slopes down; so the ocean plane at those points lies above the terrain (terrain below water) — so we see water. Wait, the island mesh slopes downward for r>R and at r< R is above water. At r=22 exactly, height 0, so water surface intersects. The ring 21-26 includes island terrain from 21-22 above water (would occlude water) plus 22-26 underwater terrain. So foam ring visible on the water side from 22-26. Fine, looks like surf. Also crest foam.

Also depth-based shallow color near island: mix toward shallow when r < 30? Nice: `float shallowZone = smoothstep(38.0, 22.0, r);` base = mix(base, uShallow, shallowZone * 0.6). Tropical shallow water around island. Good.

Fog at end.

Also sun specular color warm: uSunColor = vec3(1.0, 0.92, 0.78) * maybe 1.0.

Need to make the ocean not too dark: deep = (0.02, 0.10, 0.18), shallow = (0.08, 0.45, 0.50). Refl = (0.62, 0.80, 0.92). With ACES the values will tone map. Fine.

Let's also add a subtle moving sparkle for realism: use the crest and normals. Not necessary.

Ocean mesh: castShadow false, receiveShadow false.

Now boat.

Materials: hull wood: MeshStandardMaterial color 0x8a4b2a? Let's make white hull with a stripe? Multi-material hull would need groups. Keep simple: hull color creamy white (0xe8e0d0), roughness 0.55; deck wood brown (0x9c6b45); cabin white/cream; mast wood; sail white/cream slightly translucent.

Hull geometry: `new THREE.CapsuleGeometry(0.55, 2.9, 8, 16)` — length total 4.0. Rotate X by π/2 to align along Z? Capsule along Y by default; rotateX(π/2) maps Y→Z? R_x(π/2): y'=−z, z'=y. So the capsule's long axis Y becomes Z. Good. Then scale (1.15, 0.75, 1.0)? Careful: after rotation, geometry transformed; mesh scale applies. Let's instead do geometry.rotateX(Math.PI/2) then mesh.scale.set(1.25, 0.62, 1.0)? After rotation the long axis is Z, so length in z stays (3.9), width x from radius (0.55*1.25=0.69), height y (0.55*0.62=0.34). That's a low, wide hull. Hmm, capsule radius after rotation: cross-section in x,y. Scale x 1.25 → half width 0.69, y 0.62 → half height 0.34. Boat 4 long, 1.38 wide, 0.68 tall. Good.

Position hull at y=0 (center), so it sits with bottom at -0.34. Boat group offset y = heightAt + 0.35 constant offset to keep hull bottom slightly submerged? Actually the boat should float: group position y = height + offset where offset maybe 0.05. Hull center at 0 in local, bottom -0.34, so water line at local y ~ 0? Let the hull intersect water slightly. Use offset 0.15 so hull bottom at water -0.19. Look fine.

Deck: BoxGeometry(1.1, 0.08, 2.6) at y=0.30. Cabin: BoxGeometry(0.85, 0.55, 1.1) at y=0.62, z=-0.35. Mast at z=0.5, cylinder from y=0.35 to 3.6: CylinderGeometry(0.05, 0.07, 3.2) positioned y=1.9? and sail.

Sail: Shape triangle: points (0,0), (0, 2.6), (1.5, 0)... Actually a sail: a triangle attached to mast, extending to the side. Use shape in XY plane: (0,0) → (0,2.4) → (1.6,0.2) close. ShapeGeometry, positioned at mast base (x=0, y=0.4, z=0.5), maybe rotate slightly. Double side, color 0xf6f1e5. Add a boom? Maybe not.

Also add a small flag? Not necessary.

Boat group children castShadow=true. Sail maybe castShadow true.

Now the boat should be oriented such that bow faces +z. Good.

Boat update:
```ts
const boatBaseX = 12, boatBaseZ = 14;
function updateBoat(t: number) {
  const x = boatBaseX + Math.sin(t * 0.18) * 1.6;
  const z = boatBaseZ + Math.cos(t * 0.13) * 1.8;
  const h = heightAt(x, z, t);
  const d = 1.6;
  const hF = heightAt(x, z + d, t);
  const hB = heightAt(x, z - d, t);
  const hR = heightAt(x + d, z, t);
  const hL = heightAt(x - d, z, t);
  const slopeZ = (hF - hB) / (2 * d);
  const slopeX = (hR - hL) / (2 * d);
  boat.position.set(x, h + 0.18, z);
  boat.rotation.x = -Math.atan(slopeZ) * 0.85;
  boat.rotation.z = Math.atan(slopeX) * 0.85;
  boat.rotation.y = Math.sin(t * 0.07) * 0.12;
}
```
Wait rotation.x: earlier we determined raising bow at +z requires negative θ for positive slopeZ. So rotation.x = -atan(slopeZ). Good. But also the boat should be floating with the group; rotation happens around group origin at water level; hull center at local y=0, so pitch around center is fine.

Hmm, but position y should account for pitch/roll maybe not needed.

Note: boat y = h + 0.18 — "constant offset". Good.

Now island.

Geometry: PlaneGeometry(100, 100, 160, 160), rotateX(-π/2), then displace each vertex. 161^2 = 25921 verts. Fine. Compute colors. Then computeVertexNormals.

Height function islandHeight(x,z):
```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const R = 22;
  const rn = r / R;
  let h: number;
  if (rn < 1) {
    h = 9.5 * Math.pow(1 - rn * rn, 1.6);
  } else {
    h = -1.8 * Math.min(1, (rn - 1) * 1.6);
  }
  // irregular bumpy terrain
  const fade = Math.max(0, 1 - rn);
  h += (Math.sin(x * 0.42 + 1.3) * Math.cos(z * 0.37 - 0.7) * 0.9 +
        Math.sin(x * 0.9 - z * 0.6) * 0.35) * fade * fade;
  return h;
}
```
At rn<1 the dome is up to 9.5 at center. Bumps add ±1.2. Peak ~ 10. Good (5-15).

But the fade factor at rn→1 is 0 so bumps vanish at shore. Good.

However, `(1 - rn*rn)^1.6` at rn near 1 drops sharply to 0 — a bit steep but okay; sand ring visible.

Vertex color: compute h:
```ts
const sand = new THREE.Color(0xe8d8a8);
const grass = new THREE.Color(0x5f9e3d);
const darkGrass = new THREE.Color(0x2f6a2d);
const rock = new THREE.Color(0x6b6250);
```
Blend:
- if h < 0.15: underwater sand (0xbfae86) — hidden anyway.
- 0.15..1.2: sand → grass mix
- above: grass with noise → darker; at high h add rock patches.

Actually beaches: sand up to ~0.9. Use:
```ts
let c: THREE.Color;
if (h < 0.9) c = sand.clone().lerp(new THREE.Color(0xcbb98a), Math.max(0, h/0.9));...
```
Simplest:
```ts
const t1 = THREE.MathUtils.smoothstep(h, 0.4, 1.6); // 0 sand, 1 grass
const t2 = THREE.MathUtils.smoothstep(h, 3.0, 7.0);
c.copy(sand).lerp(grass, t1).lerp(darkGrass, t2*0.8);
// noise variation
const n = Math.sin(x*1.7)*Math.cos(z*1.3)*0.5+0.5;
c.lerp(rock, t2 * n * 0.35);
```
Careful: THREE.MathUtils.smoothstep(x, min, max) signature: smoothstep(x, min, max). Yes.

Underwater part color sand-ish. Fine.

Material: MeshStandardMaterial({vertexColors: true, roughness: 0.95, metalness: 0.0}). Maybe add `flatShading: false`.

Also add a subtle darker wet sand near water: t1 handles.

Palm positions: pick 6 spots:
```
const palmSpots: [number, number][] = [
  [-9, 4], [7, -8], [-3, -13], [12, 2], [-12, -6], [2, 10]
];
```
Check heights: r values ~ sqrt(81+16)=9.8 → h = 9.5*(1-0.198)^1.6 ≈ 9.5*0.802^1.6 ≈ 9.5*0.702 = 6.67 plus bumps. Good, above water.

Each palm: trunk curve from base (x, h, z) to top offset. Trunk height ~ 4-6 units. Curve points:
```
const base = new THREE.Vector3(x, h - 0.1, z);
const top = new THREE.Vector3(x + leanX, h + height, z + leanZ);
```
Use CatmullRomCurve3 with control points bending: p0 base, p1 base + (bend*0.4, height*0.33), p2 with opposite bend, p3 top.

Trunk geometry: TubeGeometry(curve, 14, 0.22, 8, false). But radius constant; add taper by scaling mesh? Can't taper tube easily. Could use a cone-like tube by manually building... Simpler: use TubeGeometry with radius 0.20 plus a crown cone. It's fine.

Actually to be fancier: use `TubeGeometry` and then modify the vertex positions to taper radius? Not necessary.

Leaves: crown position = top point. Each palm has 9 leaves: angle = i/9 * 2π + random offset; tilt = 0.55 + random 0.25 (radians droop), scale maybe.

Total leaves = 6 palms * 9 = 54 ≥ 30. Good.

InstancedMesh count = 54. Set castShadow true, receiveShadow true. InstancedMesh shadow works with standard material.

Leaf geometry as described. Material double side.

Per-frame sway:
```ts
const euler = new THREE.Euler();
const quat = new THREE.Quaternion();
const mat = new THREE.Matrix4();
const pos = new THREE.Vector3();
const scl = new THREE.Vector3();
for each leaf:
  const swayX = Math.sin(t * 1.6 + phase) * 0.10 + Math.sin(t*0.7+phase*1.7)*0.05;
  const swayZ = Math.cos(t * 1.3 + phase * 1.3) * 0.12;
  euler.set(swayX, angle, -tilt + swayZ, 'YXZ');
  quat.setFromEuler(euler);
  pos.copy(crownPos);
  scl.set(scale, scale, scale); // maybe scl.set(scale, scale, scale)
  mat.compose(pos, quat, scl);
  leaves.setMatrixAt(i, mat);
```
Wait leaf geometry extends along +X and droops downward via geometry. Rotating about Z by -tilt rotates +X downward? R_z(θ) with θ negative: point (1,0,0) → (cosθ, sinθ,0) = (cos, negative) → downward. Yes, -tilt droops. Good.

But the leaf shape extends along +X with droop built in; with a tilt of ~0.3 rad, tip goes down. Fine.

Then `leaves.instanceMatrix.needsUpdate = true;`

Also possibly add a `leaves.frustumCulled = false`? InstancedMesh bounding sphere computed from geometry only and matrices? Three computes boundingSphere for instanced mesh from geometry; since all instances are on the island within the view, culling is fine. Actually InstancedMesh.computeBoundingSphere accounts for instance matrices? I think `InstancedMesh` has boundingSphere computed in `computeBoundingSphere` that accounts for instance matrices (yes, in recent three). Fine.

Leaves positions are in world coordinates, and instanceMatrix updates every frame with the world matrix. Since the leaves mesh is added to scene at origin, world = instance matrix. Good.

Alternatively put leaves inside island group. Keep at scene level.

Now palms also need trunk meshes; add to scene or island group? Use `islandGroup` (a Group) containing island mesh and palms; but __island should be the Mesh or Group. Requirement: "Expose the island (Mesh or Group) as __island; it receives shadows." I'll expose the islandGroup containing terrain + trunks? Or expose terrain mesh only. Let's create `const islandGroup = new THREE.Group();` with terrain mesh and trunks; expose that. Terrain receives shadows.

Add palm trunks to islandGroup, leaves separate (instanced) also added to islandGroup? If leaves inside islandGroup, instance matrices are local; group at origin so same. Fine — add leaves to islandGroup too. Expose __leaves separately.

Shadows: island terrain receives; trunk cast/receive; leaves cast/receive.

Now the sun light:
```ts
const sun = new THREE.DirectionalLight(0xffe9c4, 2.6);
sun.position.copy(sunDir).multiplyScalar(80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera as THREE.OrthographicCamera;
sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 5; sc.far = 200;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target); // target at origin
```
Shadow camera default is OrthographicCamera for DirectionalLight: `sun.shadow.camera` typed as OrthographicCamera already? In types, `DirectionalLightShadow` camera is `OrthographicCamera`. Yes, `DirectionalLightShadow extends LightShadow<OrthographicCamera>`. So no cast needed. Set directly.

Hemisphere light: `new THREE.HemisphereLight(0xbfe3ff, 0x3a5b45, 0.8)`.
Ambient: `new THREE.AmbientLight(0xffffff, 0.15)`.

Tone mapping exposure ~1.1.

Ocean and boat and island rendering. Also maybe add a couple of rocks or extra detail? Not required. Could add small clouds? Not necessary; sky gradient suffices. Might add a sun glare sprite? Not needed.

Animation loop:
```ts
const clock = new THREE.Clock();
let waveTime = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  waveTime += dt;
  oceanUniforms.uTime.value = waveTime;
  updateBoat(waveTime);
  updateLeaves(waveTime);
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});
```
Requirement: "After the first frame is rendered, set __ready = true." Good.

Ocean time(): return waveTime. Expose __ocean with heightAt(x,z,t) and time().

heightAt must return the same function as shader. Our JS:
```ts
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of waves) {
    h += w.amp * Math.sin(w.kx * x + w.kz * z + w.phase - w.omega * t);
  }
  return h;
}
```
Matches GLSL: `sin(dot(p, vec2(kx,kz)) + phase - omega*uTime)` = kx*x + kz*z + phase - omega*t. Good.

Check that shader uses `uTime` = waveTime. Yes.

Note requirement says "heightAt returns the vertical displacement your shader applies at the undisplaced position (x,z)". Since we use plane geometry with x,z world coords, and the shader displaces y by waveHeight(p.xz), matches.

One more thing: ocean plane rotated via geometry.rotateX(-π/2), so `position.xz` = world x,z. Good.

Resize handler:
```ts
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Set body style margin zero, overflow hidden, background maybe.

TS strict: check for `THREE.CapsuleGeometry` exists in types (yes, since r142).

`THREE.MathUtils.smoothstep` exists.

Now careful about `new THREE.Color(...)` clone/lerp usage — types fine.

For the island vertex colors, I need to add a `color` BufferAttribute:
```ts
const colors = new Float32Array(count * 3);
...
geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
```

Colors should be in sRGB? With vertexColors, three assumes colors are in the working color space? In recent three, `BufferAttribute` colors are treated as linear? For MeshStandardMaterial vertex colors, the values are used as-is (three converts via `color` attributes? It doesn't convert). Since renderer output converts linear→sRGB, setting color components from THREE.Color created with hex sRGB values — THREE.Color.set with hex does convert to linear working space if color management enabled (r152+ default: THREE.ColorManagement.enabled = true). `color.r/g/b` after `new THREE.Color(0xe8d8a8)` are linear values. So writing them into the attribute is correct (linear). Good.

Similarly for materials `color: 0x...` handled.

Sky shader colors: uniforms use THREE.Color which are linear values. Good.

Ocean uniform colors from THREE.Color → linear. Good, since output includes colorspace conversion.

Now the `uniforms` for the ocean: I'll create:

```ts
const oceanUniforms = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(0xfff0d0) },
  uDeep: { value: new THREE.Color(0x08202e) },
  uShallow: { value: new THREE.Color(0x2fa8a0) },
  uSkyRefl: { value: new THREE.Color(0x9ec8e0) },
  uFogColor: { value: fogColor },
  uFogNear: { value: 90 },
  uFogFar: { value: 260 },
};
```
Note ocean fragment uses `cameraPosition` built-in (available in ShaderMaterial).

Hmm: In ShaderMaterial, `cameraPosition` is a built-in uniform automatically provided by three (yes, in the prefix). Good.

Tone mapping includes require `#include <tonemapping_fragment>` and `<colorspace_fragment>`. In WebGLProgram prefix for ShaderMaterial, tone mapping function definitions are added? Let me recall three's WebGLProgram source (r160):

```js
if ( material.isShaderMaterial ) { ... }
```
Hmm. Actually the prefix generation for fragment includes:

```js
prefixFragment = [
  customExtensions,
  generatePrecision(),
  '#define SHADER_NAME ' + material.name,
  customDefines,
  ...
  'uniform mat4 viewMatrix;',
  'uniform vec3 cameraPosition;',
  'uniform bool isOrthographic;',
  ( material.isMeshPhongMaterial ... ),
  ...
  getToneMappingFunction( 'toneMapping', parameters.toneMapping ),
  parameters.outputColorSpace === SRGBColorSpace ? '#define SRGB_TRANSFER' : '',
  getTexelEncodingFunction? ...
].join('\n');
```

Hmm, in r152+ colorspace conversion: The prefix includes:
```
parameters.outputColorSpace === SRGBColorSpace ? '#define SRGB_TRANSFER' : ''
```
and `getTexelEncodingFunction('linearToOutputTexel', parameters.outputColorSpace)` defines the function.

I'm reasonably confident `tonemapping_fragment` and `colorspace_fragment` includes work in ShaderMaterial. Many examples use them.

But note: `#include <tonemapping_fragment>` is defined in ShaderChunk as:
```
#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif
```
The `TONE_MAPPING` define is added in the prefix when toneMapping !== NoToneMapping and material.toneMapped. ShaderMaterial default `toneMapped = true`. Good.

One concern: `toneMapping` function definition in the prefix is `getToneMappingFunction('toneMapping', parameters.toneMapping)` which returns the function only if not NoToneMapping. Good.

For the sky, same includes.

Let me also think about ocean appearance: with 256 segments, at 400 units, waves of λ=6 need ~4 vertices per wavelength — aliasing. Maybe drop the smallest wavelength to 8 and use 256 segments giving 1.56 spacing → 5 samples per λ=8. Fine. Let's use wavelengths [26, 16, 10, 7]. λ=7 → 4.5 samples, ok.

Recompute amps: 0.40, 0.26, 0.16, 0.09 → 0.91 → c-t 1.82. Good.

Omegas: physically ω = sqrt(g k) for deep water. k for λ=26 = 0.2417 → sqrt(9.8*0.2417)=1.54. λ=16: k=0.3927 → 1.96. λ=10: k=0.6283 → 2.48. λ=7: k=0.8976 → 2.97. Use those, gives natural speeds. Good.

Phases: [0, 1.7, 3.1, 4.6].

Directions: (1, 0.35), (-0.7, 1), (0.5, -1), (1, -0.8) normalized.

Now, "crest-to-trough height about 0.5 to 2 units" — our sum amplitude 0.91 → c-t 1.82 max, typical ~1.2. Good.

Let me also ensure heightAt returns values ~ ±0.9 and boat offset 0.18.

Camera at (35,12,35) looking at (0,2,0). Island at origin up to y=10, boat at (12,14) with y≈0.3. The camera sees the island center and boat. Good.

Potential issue: Is the boat visible? Camera at (35,12,35) looking at (0,2,0), direction (-35,-10,-35). Boat at (12,~0,14) is between camera and island roughly along the line? Camera-to-boat vector = (-23,-12,-21), normalized ~ (-0.66,-0.34,-0.60); view direction ~ (-0.69,-0.20,-0.69). Close enough — the boat is slightly below/left of view center? It's in view. Good.

Ocean far edge at 200: camera distance to far edge up to ~250; fog 90..260 covers. Also sky sphere radius 500 — the ocean edge (y≈0) is at distance ~250 and fogged to fog color; the sky at horizon y≈0 also horizon color. Good.

Maybe reduce fog far to 240 so ocean edge fully faded. The ocean edge at ±200 along x/z; from camera at (35,12,35), distance to (-200, 0, -200) ≈ sqrt(235²+12²+235²) ≈ 332. Hmm, that's beyond far. Ocean corners are far. Fog far 260 leaves corners partially fogged. Actually the visible horizon at y=0 is far. Let's set fog near 120, far 320. Then corners fully fogged. But near ocean (distance ~50) unfogged. The island at 50 unfogged. Good. But does fog make the ocean look washed out at mid-distance? A nice aerial perspective. Use Fog(0xbcd8e6, 100, 320) with sky horizon matching 0xbcd8e6? The sky horizon color should be similar to fog color for seamless blending.

Let's pick sky horizon 0xb9d6e4 (light blue), zenith 0x3d7fb8 (deeper blue). Fog color 0xb9d6e4. Good.

The sky at the horizon where ocean edge meets: ocean fades to fog color, sky horizon is same color → seamless.

Sun disc: sunDir y=0.42 → above horizon; sun disc visible maybe. Camera looks toward origin, so the sky behind the island is at direction opposite-ish; the sun in the +x,+z quadrant (same as camera side) means the sun is behind the camera, not visible. That's fine — "a visible sun position" means the sky has a sun. Hmm, "with a visible sun position" — the sun disc might not be in view. Could put the sun in front of the camera so the disc is visible: sun direction roughly (-0.5, 0.5, -0.5) would be behind the island, appearing in the sky above the island. This gives backlighting (rim light on island/boat) which can look great but shadow direction toward camera. Shadows would fall toward the camera — nice. Reflection highlight on water: with sun opposite camera, specular glint appears near the horizon toward the island. Good, visible.

But with the sun behind the island (direction (-0.5,0.55,-0.5) from origin), the light comes from behind, so the island's front faces are in shade — could look dark. Hemisphere fill helps. Maybe a compromise: sun at (-0.55, 0.55, -0.35) — behind-left, elevation 33°. Camera sees from (+35,12,+35). The sun would be near the top-left of the frame, visible above the island. Let's do that. The directional light position = sunDir*80 = (-44, 44, -28). Shadow camera covers ±45. Light target origin.

But the island front (facing camera, +x+z side) would be backlit → shadowed. Hmm, that reduces the "good-looking" look. Alternatively sun at (0.7, 0.6, -0.2): sun from the right-front? Camera is at +x,+z. Sun at +x, -z: the island's +x faces are lit, +z faces shaded. Partial. The sun disc would be at the right side of the sky, possibly in view since camera looks toward -x,-z: the sun at (+0.7, ..., -0.2) is in the opposite direction from view (view is -x,-z). Not in view.

To have the sun visible in frame, sun direction must be roughly toward (-x, -, -z) from origin, i.e., in front of camera. Then backlit. It's a trade-off. Games often show a sun in the sky. I could place the sun slightly off-axis so it's at the edge of the frame and still light somewhat from the side: e.g., sunDir = (-0.25, 0.45, -0.85) normalized → sun mostly in -z direction, camera at +z so visible ahead-left? View direction from camera to origin is (-0.69,-0.2,-0.69). Sun dir (-0.25,0.45,-0.85) has negative z → ahead. Angle between view dir and sun dir: dot = 0.1725 - 0.09 + 0.5865 = 0.669 → 48° off-axis; with 50° vertical FOV and aspect wide, it might be near the edge of the frame. Fine.

Lighting: mostly from -z (behind the island relative to camera) → island front shaded. Hmm.

Maybe better: sun high, e.g., (0.1, 0.9, -0.4) normalized? That's nearly overhead, visible in the sky above the island (view has -0.2 y). Sun elevation high → nice tropical noon, shadows short. Sun disc high in the sky, in the upper part of frame. Let's use sunDir = (0.25, 0.8, -0.55) normalized (~53° elevation). Visible? Camera view direction (-0.69,-0.2,-0.69); sun dir normalized: length sqrt(0.0625+0.64+0.3025)=1.0025 → (0.249,0.798,-0.549). Dot with view = -0.172 -0.16 +0.379 = 0.047 → 87°, way off to the side, not in frame. Hmm.

The camera looks toward -x,-z. For sun in frame, sun must be near (-0.7, +, -0.7) direction. So sun low-ish in the direction the camera faces. That's backlight and the sun disc near horizon. That's actually a beautiful shot: golden sun low over the water behind the island, with glints. Let's use sunDir = (-0.55, 0.35, -0.75) normalized. Elevation ~ 19°, warm sun (0xffcc88), intensity 3.0. Backlit island with rim light, sky glow around the sun near the horizon. Water specular glint toward the horizon. This is a game-like sunset shot. But shadows from island fall toward the camera — visible on the near beach — fine.

However, with sun low, the island's camera-facing side is dark. We can boost the hemisphere/ambient fill to compensate (hemisphere intensity 1.0, sky color light blue, ground color warm sand). Also ACES exposure 1.1. Should look okay.

Alternatively make the sun direction near (0, 0.35, -0.94): directly ahead in -z and low, visible centered in sky behind the island, with strong glint. But the camera looks along (-0.69,-0.2,-0.69); sun at (0,0.35,-0.94) is 45° off → might be just in frame at left? Hmm.

Let me compute frame: camera FOV 50° vertical, aspect ~1.6 → horizontal FOV ≈ 2*atan(tan(25°)*1.6) = 2*atan(0.466*1.6)=2*atan(0.746)=73°. So ±36.5° horizontally. Sun direction must be within ~36° of view direction to be visible.

View dir v = normalize(0-35, 2-12, 0-35) = (-35,-10,-35)/51.9 = (-0.674,-0.193,-0.674).
Candidate sun s = normalize(-0.55,0.35,-0.75) = (-0.58, 0.37, -0.79)? length sqrt(0.3025+0.1225+0.5625)=0.994 → (-0.553,0.352,-0.754).
dot = (-0.553)(-0.674)+(0.352)(-0.193)+(-0.754)(-0.674) = 0.3727 -0.0679 +0.5082 = 0.813 → angle 35.6°. Just inside horizontal FOV but also vertical: the sun's vertical component relative to view? The angle mostly in the horizontal plane? Let's compute components: view dir is in xz mostly; sun has y=0.35 while view y=-0.19. The elevation difference ~ (0.352 - (-0.193*?))... roughly sun is higher. Probably near the top-left edge of the frame. Might be visible. Let's aim for a sun direction closer to view: (-0.65, 0.25, -0.7) normalized = (-0.65,0.25,-0.7)/sqrt(0.4225+0.0625+0.49)=sqrt(0.975)=0.9874 → (-0.658,0.253,-0.709). dot with view = 0.4436 -0.0488 +0.4779 = 0.8727 → 29.2°. Within the 36° horizontal half-FOV, and vertically the difference... view pitch -0.193 (looking slightly down); sun pitch +0.253 → 26.7° above view direction. Vertical half-FOV 25°. So the sun would be just above the top edge vertically. Hmm, with the horizontal spread, its actual angular offset is 29°, and vertical component could place it slightly outside top. Let me just set FOV to 55 to have a bit more room, and put sun a bit lower: (-0.62, 0.18, -0.76) normalized → length sqrt(0.3844+0.0324+0.5776)=0.998 → (-0.621,0.180,-0.762). dot = 0.4186 -0.0348 +0.5136 = 0.8974 → 26.2°. Vertical: sun elevation 10°, view pitch -11° → 21° above center, within 27.5° half-FOV. Good, visible near the top-left-ish.

Sun elevation 10° is quite low (sunset). Warm sunlight 0xffc98a, intensity 3.0, sky with warm glow near horizon. Fog color warmer (0xd8c8b0?) but ocean far horizon should blend with sky near horizon which is warm. Use horizon color 0xc8d8e0 (light blue) blended with warm sun glow. Fog color 0xc8d8e0.

Hmm, sunset look vs tropical daylight. Let's go warm late-afternoon: sky horizon warm pale (0xe8dcc8), zenith blue (0x4a86c8). Fog color 0xd8d8cc? That would tint the ocean milky. Hmm. Maybe keep horizon light blue (0xb9d6e4) and add sun glow warm only near sun. Fog color = 0xb9d6e4. Sun light color warm. Fine.

Let's finalize sunDir = normalize(-0.62, 0.18, -0.76), light color 0xffe0b0, intensity 3.2.

Light position = sunDir*80 = (-50, 14.4, -61). Shadow camera ortho ±50 near 10 far 200 covers island and boat? The light is at distance ~80 from origin. Island ±22, boat at (12,14) within ±25. Shadow ortho ±45 from light center is enough. Set ±45, near 20, far 180. Actually need to cover points up to radius 25 and height 10; from light direction (−0.62,0.18,−0.76), projecting: ±45 should be fine.

Shadow bias: light low elevation → long shadows; normalBias 0.03, bias -0.0005.

Hemisphere light to fill: sky 0x9fc4e8, ground 0x6b5a42, intensity 1.2. Ambient 0.2.

Also the sun disc in the sky: with sun elevation 10°, the sky dome sun glow near horizon. Good.

Now the ocean reflection color uSkyRefl should be the sky color around reflection: (0.55,0.75,0.9) linear-ish. uSunColor warm.

Let's consider ocean glint: sun is in -x,-z direction, camera at +x,+z. The specular highlight from Blinn will appear where the halfway vector aligns with the normal. Roughly the glint appears near the far ocean toward the sun, which is in view. Nice.

Foam near crests plus shore.

Now, sky shader details:
```glsl
uniform vec3 uSunDir;
uniform vec3 uHorizon;
uniform vec3 uZenith;
uniform vec3 uSunColor;

varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(h, 0.6));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * pow(sd, 1200.0) * 3.0;
  col += uSunColor * pow(sd, 60.0) * 0.35;
  col += uSunColor * pow(sd, 8.0) * 0.10;
  // horizon warmth
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
Note pow with 1200 may produce 0/1 fine. For d.y<0 (below horizon), horizon color still. The ocean covers below.

Also add stars? no.

Let me make the sky sphere radius 600 and camera far 1500 to be safe. Set camera far 1500. Fog far 320.

Now the ocean geometry size 400x400. At the far edge, the sky horizon at y=0 and ocean edge at y≈0 meet, but there might be a gap visible because the ocean ends at 400 and sky sphere behind. The ocean's far edge is at distance ~200 from origin, above the sky sphere? The sky sphere is radius 600, so the ocean edge is inside the sphere. When looking at the horizon, the ocean edge (fogged to sky-horizon color) meets the sky dome at the horizon (also sky-horizon color). Since both are the same color, seamless. Good.

But wait: the sky dome's y=0 horizon color at those pixels; ocean edge color fogged to same fog color = horizon color. Great.

Let's make fog color exactly uHorizon to ensure match? Horizon uniform is a THREE.Color converted to linear (0xb9d6e4). Fog color same. Good.

Now writing shader strings using template literals with generated wave lines.

Let me write the whole file carefully.

```ts
import * as THREE from 'three';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#0b1620';
document.body.appendChild(renderer.domElement);
renderer.domElement.style.display = 'block';
```

Note: `document.body` might be null in strict? TypeScript DOM types say `document.body: HTMLElement` (non-null). Fine.

Scene, camera.

Waves definition:

```ts
interface WaveDef {
  dx: number; dz: number; amp: number; wavelength: number; omega: number; phase: number; kx: number; kz: number;
}

const waveDefs: WaveDef[] = [
  { dx: 1, dz: 0.35, amp: 0.4, wavelength: 26, omega: 1.54, phase: 0.0, kx: 0, kz: 0 },
  ...
];

for (const w of waveDefs) {
  const len = Math.hypot(w.dx, w.dz);
  const nx = w.dx / len, nz = w.dz / len;
  const k = (Math.PI * 2) / w.wavelength;
  w.kx = nx * k;
  w.kz = nz * k;
}
```

heightAt JS:
```ts
function heightAt(x: number, z: number, t: number): number {
  let h = 0;
  for (const w of waveDefs) h += w.amp * Math.sin(w.kx * x + w.kz * z + w.phase - w.omega * t);
  return h;
}
```

GLSL generation functions:
```ts
function glslHeight(): string {
  let s = 'float waveHeight(vec2 p) {\n  float h = 0.0;\n';
  for (const w of waveDefs) {
    s += `  h += ${w.amp.toFixed(6)} * sin(dot(p, vec2(${w.kx.toFixed(6)}, ${w.kz.toFixed(6)})) + ${w.phase.toFixed(6)} - ${w.omega.toFixed(6)} * uTime);\n`;
  }
  s += '  return h;\n}\n';
  return s;
}
function glslSlope(): string {
  let s = 'vec2 waveSlope(vec2 p) {\n  vec2 s = vec2(0.0);\n  float c;\n';
  for (const w of waveDefs) {
    s += `  c = cos(dot(p, vec2(${w.kx.toFixed(6)}, ${w.kz.toFixed(6)})) + ${w.phase.toFixed(6)} - ${w.omega.toFixed(6)} * uTime);\n`;
    s += `  s.x += ${(w.amp * w.kx).toFixed(6)} * c;\n`;
    s += `  s.y += ${(w.amp * w.kz).toFixed(6)} * c;\n`;
  }
  s += '  return s;\n}\n';
  return s;
}
```
Careful: `toFixed` on numbers like -0.000000 yields "-0.000000" fine.

Ocean material:
```ts
const oceanUniforms: Record<string, THREE.IUniform> = {
  uTime: { value: 0 },
  uSunDir: { value: sunDir.clone() },
  uSunColor: { value: new THREE.Color(0xffd9a0) },
  uDeep: { value: new THREE.Color(0x07283c) },
  uShallow: { value: new THREE.Color(0x2b9fa8) },
  uSkyRefl: { value: new THREE.Color(0x9dc6de) },
  uFogColor: { value: new THREE.Color(0xb9d6e4) },
  uFogNear: { value: 100 },
  uFogFar: { value: 320 },
};
const oceanMat = new THREE.ShaderMaterial({
  uniforms: oceanUniforms,
  vertexShader: `...`,
  fragmentShader: `...`,
  side: THREE.DoubleSide, // not needed but ok; front side is enough
  fog: false,
});
```

Type for uniforms: ShaderMaterial accepts `{ [uniform: string]: IUniform }`. Fine.

Vertex shader:
```glsl
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHeight;

${glslHeight()}
${glslSlope()}

void main() {
  vec2 p = position.xz;
  float h = waveHeight(p);
  vec3 displaced = vec3(position.x, position.y + h, position.z);
  vec2 sl = waveSlope(p);
  vec3 nrm = normalize(vec3(-sl.x, 1.0, -sl.y));
  vec4 wp = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix) * nrm);
  vHeight = h;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
```
Note: modelMatrix has no scale/rotation for ocean mesh; it's identity except position 0. So mat3(modelMatrix) fine.

Fragment:
```glsl
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSkyRefl;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying float vHeight;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunDir);

  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

  float r = length(vWorldPos.xz);
  float shallowZone = smoothstep(46.0, 22.0, r);
  vec3 base = mix(uDeep, uShallow, smoothstep(-0.9, 0.9, vHeight) * 0.55);
  base = mix(base, uShallow, shallowZone * 0.55);
  // darken deep sea far away? no.

  vec3 col = mix(base, uSkyRefl, clamp(fres, 0.0, 1.0) * 0.9);

  vec3 H = normalize(L + V);
  float nh = clamp(dot(N, H), 0.0, 1.0);
  col += uSunColor * pow(nh, 220.0) * 2.6;
  col += uSunColor * pow(nh, 30.0) * 0.18;

  // crest foam
  float ripple = 0.5 + 0.5 * sin(vWorldPos.x * 1.9 + uTime * 2.3) * sin(vWorldPos.z * 1.5 - uTime * 1.7);
  float crest = smoothstep(0.45, 0.78, vHeight) * (0.35 + 0.65 * ripple);
  // shore foam ring (island radius ~22)
  float shore = smoothstep(30.0, 24.0, r) * smoothstep(20.0, 23.5, r);
  shore *= (0.5 + 0.5 * ripple);
  float foam = clamp(crest * 0.9 + shore * 1.1, 0.0, 1.0);
  vec3 foamCol = vec3(0.92, 0.96, 0.97);
  col = mix(col, foamCol, foam * 0.85);

  float dist = length(vWorldPos - cameraPosition);
  float fogF = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fogF);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
```
Wait `smoothstep(46.0, 22.0, r)` — GLSL smoothstep requires edge0 < edge1; with edge0=46 > edge1=22, result is undefined behavior on some GPUs (it computes clamp((x-e0)/(e1-e0)) which with negative denominator gives correct reversed result in practice, but spec says undefined if edge0>=edge1). Use `1.0 - smoothstep(22.0, 46.0, r)`. Similarly `smoothstep(30.0,24.0,r)` reversed → use `1.0 - smoothstep(24.0,30.0,r)`; and `smoothstep(20.0,23.5,r)` is fine. Let's rewrite:

```glsl
float shallowZone = 1.0 - smoothstep(22.0, 48.0, r);
float shoreRing = (1.0 - smoothstep(24.0, 31.0, r)) * smoothstep(20.0, 23.5, r);
```
At r=22: shoreRing = 1 * smoothstep(20,23.5,22)≈0.75. Hmm, that's inside the island where terrain is above water, mostly hidden. At r=24: (1-smoothstep(24,31,24)=1)*(1)=1. At r=28: (1-~0.66)*1=0.34. Good.

Actually the beach terrain near r 22-24 may be above water (height ~0) and waves at ±0.9 could wash over — foam looks okay.

The crest threshold 0.45: max height ~0.9, so foam only on the highest crests. Fine with the ripple mask.

Also note: foam color very bright; with tone mapping it's fine.

Now island.

```ts
function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const R = 22;
  const rn = r / R;
  let h: number;
  if (rn < 1.0) {
    h = 9.6 * Math.pow(1.0 - rn * rn, 1.6);
  } else {
    h = -2.0 * Math.min(1.0, (rn - 1.0) * 1.5);
  }
  const fade = Math.max(0.0, 1.0 - rn);
  const bumps = Math.sin(x * 0.45 + 1.3) * Math.cos(z * 0.38 - 0.7) * 1.1
              + Math.sin(x * 0.9 - z * 0.65) * 0.4
              + Math.cos(x * 0.25 + z * 0.5) * 0.5;
  h += bumps * fade * fade;
  return h;
}
```
At center rn=0, h=9.6 + bumps(center: sin1.3*cos(-0.7)*1.1 ≈ 0.963*0.765*1.1=0.81; + sin0*0.4=0; + cos0*0.5=0.5) → ~10.9. Peak ~11. Good.

Some regions might have bumps up to +2 → peak 11.6.

Also ensure island height doesn't dip below water in the interior (creating ponds) — unlikely since dome min at center is 9.6.

Grid: PlaneGeometry(120, 120, 200, 200)? 201²=40401 vertices, fine. But only the inner ~45 units matter. Use 110 size with 160 segments → 161² = 25921, spacing 0.6875. Good for detail. Size 110 covers r up to 78 at corners; underwater beyond 22. Fine.

Displace:
```ts
const islandGeo = new THREE.PlaneGeometry(110, 110, 160, 160);
islandGeo.rotateX(-Math.PI / 2);
const posAttr = islandGeo.attributes.position;
const count = posAttr.count;
const colors = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  const x = posAttr.getX(i);
  const z = posAttr.getZ(i);
  const y = islandHeight(x, z);
  posAttr.setY(i, y);
  // color
  ...
  colors[i*3] = c.r; ...
}
posAttr.needsUpdate = true; // maybe not needed
islandGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
islandGeo.computeVertexNormals();
```

But PlaneGeometry after rotateX has position.y=0 for all and z = -original y. getZ works.

Color logic:
```ts
const sand = new THREE.Color(0xe3d2a4);
const wetSand = new THREE.Color(0xc9b788);
const grass = new THREE.Color(0x5c9a3a);
const darkGrass = new THREE.Color(0x356c2b);
const rock = new THREE.Color(0x7a7161);

const tGrass = THREE.MathUtils.smoothstep(y, 0.6, 2.4);
const tHigh = THREE.MathUtils.smoothstep(y, 3.5, 8.0);
const n = 0.5 + 0.5 * Math.sin(x * 1.7 + z * 0.9) * Math.cos(z * 1.3 - x * 0.6);
const c = new THREE.Color();
c.copy(wetSand).lerp(sand, THREE.MathUtils.clamp(y / 0.8, 0, 1));
c.lerp(grass, tGrass);
c.lerp(darkGrass, tHigh * 0.7);
c.lerp(rock, tHigh * n * 0.35);
```
But if y < 0 (underwater), tGrass=0, c = wetSand.lelerp(sand,0)=wetSand (brownish) — hidden by water mostly. Fine.

`THREE.MathUtils.smoothstep` signature (x, min, max) returns 0..1. Yes.

Material: MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.0 }).

Add receiveShadow, castShadow.

Note: the plane extends under the ocean to ±55 and is below the ocean surface (y negative), so hidden. But its edges at y=-2 with ocean at y=±0.9 — okay hidden.

Palm generation:

```ts
interface PalmSpec { x: number; z: number; height: number; leanX: number; leanZ: number; seed: number; }
const palmSpecs: PalmSpec[] = [
  { x: -9, z: 5, height: 5.0, leanX: 1.2, leanZ: 0.6, seed: 1 },
  { x: 7, z: -7, height: 5.6, leanX: -0.9, leanZ: 1.0, seed: 2 },
  { x: -2, z: -12, height: 4.6, leanX: 0.6, leanZ: -1.1, seed: 3 },
  { x: 12, z: 3, height: 5.2, leanX: 1.0, leanZ: -0.4, seed: 4 },
  { x: -13, z: -4, height: 4.8, leanX: -1.1, leanZ: 0.5, seed: 5 },
  { x: 3, z: 9, height: 5.4, leanX: 0.4, leanZ: 1.2, seed: 6 },
];
```
Check each spot r < 22: (-9,5) r=10.3; (7,-7)=9.9; (-2,-12)=12.2; (12,3)=12.4; (-13,-4)=13.6; (3,9)=9.5. All fine, heights on the dome ~ 9.6*(1-(r/22)^2)^1.6:
r=10.3 → rn=0.468, 1-0.219=0.781^1.6=0.674 → 6.47 plus bumps. So base y ~6-7. Trunk height 5 → top ~12. Island peak ~11. Palms near center region have bases high; nice.

Trunk curve for each:
```ts
const baseY = islandHeight(x, z);
const bend1 = new THREE.Vector3(x + leanX * 0.2, baseY + height * 0.35, z + leanZ * 0.2);
const bend2 = new THREE.Vector3(x + leanX * 0.65, baseY + height * 0.7, z + leanZ * 0.65);
const top = new THREE.Vector3(x + leanX, baseY + height, z + leanZ);
const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, baseY - 0.2, z), bend1, bend2, top]);
const trunkGeo = new THREE.TubeGeometry(curve, 18, 0.22, 8, false);
const trunk = new THREE.Mesh(trunkGeo, trunkMat);
trunk.castShadow = true; trunk.receiveShadow = true;
islandGroup.add(trunk);
```
Tube radius constant 0.22. Fine.

Crown position = top (approximately). Leaves start there.

Also add a small cluster of coconut-ish spheres? skip.

Leaf data:
```ts
interface LeafData {
  position: THREE.Vector3;
  angle: number;
  tilt: number;
  scale: number;
  phase: number;
}
const leafData: LeafData[] = [];
for (const p of palmSpecs) {
  const crown = new THREE.Vector3(p.x + p.leanX, islandHeight(p.x,p.z) + p.height, p.z + p.leanZ);
  const nLeaves = 9;
  for (let i = 0; i < nLeaves; i++) {
    const angle = (i / nLeaves) * Math.PI * 2 + p.seed * 0.7;
    const tilt = 0.35 + ((i * 7 + p.seed * 3) % 5) * 0.08; // 0.35..0.67
    const scale = 0.8 + ((i * 3 + p.seed) % 4) * 0.08; // 0.8..1.04
    leafData.push({ position: crown.clone(), angle, tilt, scale, phase: p.seed * 1.3 + i * 0.9 });
  }
}
```
That's 54 instances.

Leaf geometry:
```ts
function createLeafGeometry(): THREE.BufferGeometry {
  const segs = 10;
  const L = 2.8;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const w = 0.32 * Math.sin(Math.PI * Math.pow(u, 0.6)) * (1.0 - 0.35 * u);
    const x = u * L;
    const y = -0.7 * u * u;
    const z1 = -w;
    const z2 = w;
    positions.push(x, y, z1, x, y, z2);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
```
With width 0 at both ends, there are degenerate vertices but fine.

Maybe add a slight rib by making a center spine? Not needed.

Leaf material: MeshStandardMaterial({ color: 0x3f8f35, roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide }). Maybe add slight emissive? no.

InstancedMesh:
```ts
const leaves = new THREE.InstancedMesh(createLeafGeometry(), leafMat, leafData.length);
leaves.castShadow = true;
leaves.receiveShadow = true;
leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
islandGroup.add(leaves);
```

Update function:
```ts
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

function updateLeaves(t: number): void {
  for (let i = 0; i < leafData.length; i++) {
    const d = leafData[i];
    const swayX = Math.sin(t * 1.7 + d.phase) * 0.12 + Math.sin(t * 0.8 + d.phase * 1.7) * 0.06;
    const swayZ = Math.cos(t * 1.4 + d.phase * 1.1) * 0.14;
    _e.set(swayX, d.angle, -d.tilt + swayZ, 'YXZ');
    _q.setFromEuler(_e);
    _p.copy(d.position);
    _s.setScalar(d.scale);
    _m.compose(_p, _q, _s);
    leaves.setMatrixAt(i, _m);
  }
  leaves.instanceMatrix.needsUpdate = true;
}
```

`_e.set(x, y, z, order)` — Euler.set signature is (x?, y?, z?, order?) in recent types? Actually `Euler.set(x: number, y: number, z: number, order?: EulerOrder): this`. Passing order works. Wait order type is `THREE.EulerOrder` which includes 'YXZ'. Fine.

The sway rotates around Y too? We set y = d.angle fixed, x = swayX, z = -tilt + swayZ. With order YXZ, rotations: I believe the Euler order string defines the sequence of rotation application: 'YXZ' means rotate around Y, then X, then Z? In Three, `Euler` order 'XYZ' means the rotation matrix is R = Rx * Ry * Rz? Hmm. Let me recall: Three's Euler order "XYZ" applies rotations about X, then Y, then Z in intrinsic terms? The `setFromEuler` code for 'XYZ' computes quaternion as qx*qy*qz. So order 'XYZ' → R = Rx·Ry·Rz. For 'YXZ' → R = Ry·Rx·Rz. So y first (applied last in matrix multiplication → outermost), then x, then z. For a leaf pointing +X, Ry rotates around vertical, then Rx sway, Rz droop. That means the droop rotation is in the leaf's local frame after Ry and Rx? Matrix R = Ry Rx Rz applied to vector: first Rz (droop in local), then Rx, then Ry. That's fine: droop tilts +X down, then y-rotation spreads. Good.

Set `_e.set(swayX, d.angle, -d.tilt + swayZ, 'YXZ')`.

Note that the leaf droops with -tilt (down) in local, then Ry spreads. Good.

One problem: leaves at the crown all start at the same point and extend radially. Since geometry starts at origin, tips spread out. Nice.

Now boat.

```ts
const boat = new THREE.Group();
boat.name = 'boat';

const hullGeo = new THREE.CapsuleGeometry(0.55, 2.9, 10, 20);
hullGeo.rotateX(Math.PI / 2);
const hullMat = new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.45, metalness: 0.05 });
const hull = new THREE.Mesh(hullGeo, hullMat);
hull.scale.set(1.25, 0.62, 1.0);
hull.position.y = 0.0;
hull.castShadow = true; hull.receiveShadow = true;
boat.add(hull);
```
Wait, the capsule after rotation: long axis along Z (length 2.9 + 2*0.55 = 4.0). Scale: x 1.25 (radius 0.55*1.25=0.6875 half-width), y 0.62 (half-height 0.341), z 1.0 (length 4.0). Good.

Deck: BoxGeometry(1.15, 0.09, 2.7) at y=0.28. Deck wood color 0x9a6a42. Add gunwale? Maybe a thin rim: BoxGeometry with hole not easy. Add two side rails: BoxGeometry(0.08, 0.12, 2.6) at x=±0.55, y=0.32. Nice detail.

Cabin: BoxGeometry(0.9, 0.55, 1.15) at y=0.55, z=-0.45, cream. Add a roof BoxGeometry(1.0, 0.08, 1.25) at y=0.85.

Mast: CylinderGeometry(0.045, 0.06, 3.4, 8) at (0, 2.2, 0.55). Hull deck top at ~0.33, mast bottom at 2.2-1.7=0.5. Good. Mast top at 3.9.

Sail: Shape:
```ts
const sailShape = new THREE.Shape();
sailShape.moveTo(0, 0);
sailShape.lineTo(0, 2.8);
sailShape.lineTo(1.7, 0.15);
sailShape.lineTo(0, 0);
const sailGeo = new THREE.ShapeGeometry(sailShape);
const sailMat = new THREE.MeshStandardMaterial({ color: 0xfbf6ea, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide });
const sail = new THREE.Mesh(sailGeo, sailMat);
sail.position.set(0, 0.6, 0.55);
sail.rotation.y = -Math.PI / 2; // shape in XY plane, rotate to align along z? 
```
Hmm: ShapeGeometry is in XY plane (z=0). The sail should be roughly in the plane spanned by Y and Z (aligned with the boat's longitudinal axis). If we rotate about Y by -π/2, the shape's X axis maps to +Z? R_y(-π/2): (1,0,0) → (0,0,1)? R_y(θ): x' = x cosθ + z sinθ, z' = -x sinθ + z cosθ. θ=-π/2: cos=0,sin=-1 → x' = -z, z' = x. So point (1,0,0) → (0,0,1). Yes, X→+Z. So the sail's 1.7 in X becomes +Z (forward), and Y stays up. That gives a sail extending forward of the mast, in the boat's vertical plane. Good. But a sail should ideally curve; a flat triangle is okay.

Position at mast: mast at z=0.55, so put sail at (0, 0.6, 0.55). With rotation.y=-π/2, the sail extends to z=+1.7 from that point → forward. Fine. But the sail's bottom edge from (0,0) to (1.7,0.15) is at y≈0.6. Good. Top at y=3.4 near mast top 3.9. Fine.

Add boom? skip.

Cast shadows on all boat parts.

Boat group position at (12, 0.2, 14).

Boat update as above.

Potential issue: boat group's rotation.x/z uses group origin at water level; the hull bottom dips. Fine.

Now sky.

```ts
const skyUniforms = {
  uSunDir: { value: sunDir.clone() },
  uHorizon: { value: new THREE.Color(0xb9d6e4) },
  uZenith: { value: new THREE.Color(0x356fb0) },
  uSunColor: { value: new THREE.Color(0xffd9a0) },
};
```
Sky geometry sphere radius 600; camera far 1500.

Make sure `depthWrite: false` and `side: BackSide`; add renderOrder? no.

Scene fog color 0xb9d6e4 near 100 far 320.

Wait, the fog would also affect the island (distance ~50) and boat (~60) — no fog at those distances. Good.

Sun light color: 0xffdcae, intensity 3.0.

Hemisphere: `new THREE.HemisphereLight(0xbfe0ff, 0x8d7a5e, 1.1)`.

Ambient: 0.15.

Note with ACES, intensity 3 might be bright. Standard three lighting units: DirectionalLight intensity ~2-3 is like sun. Fine.

Shadow settings: 
```ts
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45;
...
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 200;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
```
Light position = sunDir * 80 → distance 80. near 20 far 200 covers.

But the shadow camera's ortho box ±45 positioned at light and oriented toward target (origin). The island radius 22 + boat at (12,14) distances from origin ~18.4; ±45 covers. Good.

`sun.target.position.set(0, 0, 0)` and add target to scene.

Now `__ready` flag and exports.

Also `__ocean.time()` returns waveTime. The requirement says "time() returns the wave time in seconds that the shader uses right now." Update the uniform to waveTime, and time() returns waveTime. Good.

One nuance: using `renderer.setAnimationLoop` and `clock.getDelta()` — with the first frame, waveTime starts at 0 then increments. Fine.

Also, the boat uses `heightAt(x,z,t)` with t=waveTime.

Let me now double-check the ocean vertex shader's `position` attribute: after `geometry.rotateX(-π/2)`, the position attribute has y=0 and z values. In the vertex shader, `position.xz` gives x,z. Good.

But wait: `THREE.PlaneGeometry(400, 400, 256, 256)` then `rotateX(-Math.PI/2)` — the geometry's bounding sphere etc. Fine.

Shader material `side: THREE.DoubleSide`? Not needed; front faces up. Default side FrontSide; after rotateX the normal points up (we recompute in shader). Good. But the winding order after rotateX(-π/2)... plane's front face originally +z; after rotation it points +y. Good. Front side visible from above. Camera above. Fine. Use `THREE.DoubleSide` for safety? It costs a bit but fine. I'll use FrontSide.

Now, a subtlety: for the ocean material, `uTime` uniform updates but `uniforms` typed as Record<string, IUniform>; accessing `oceanUniforms.uTime.value` works? `oceanUniforms.uTime` is typed as IUniform; `.value` is any. Fine.

Better define with explicit object and let TS infer:
```ts
const oceanUniforms = {
  uTime: { value: 0 },
  ...
};
```
Then `oceanUniforms.uTime.value = waveTime;` — type of value inferred as number for uTime, THREE.Color for others. Fine.

ShaderMaterial constructor expects `uniforms?: { [uniform: string]: IUniform }`. An object literal with those properties is assignable. Good.

For sky uniforms same.

Now, `renderer.setAnimationLoop(() => { ... })`. The callback type `(time: number) => void`. Fine with no parameters.

Testing exposure: assign at the end.

Also `window` might not be typed? It is in DOM lib. `(window as any).__scene = scene;` fine.

Let me consider TS strict issues with unused variables? `noUnusedLocals` might be on if the test uses a tsconfig with strict only (strict doesn't include noUnusedLocals). Fine.

Potential error: `THREE.MathUtils.smoothstep(y, 0.6, 2.4)` — signature is `smoothstep(x: number, min: number, max: number): number`. Yes.

`new THREE.Float32BufferAttribute(positions, 3)` fine.

`THREE.CapsuleGeometry` types exist.

`new THREE.ShapeGeometry(sailShape)` fine.

`THREE.PCFSoftShadowMap`, `THREE.ACESFilmicToneMapping`, `THREE.SRGBColorSpace` fine.

`renderer.outputColorSpace` exists in recent three types.

`sun.shadow.camera` typed as OrthographicCamera — property access fine.

`leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage)` fine.

`THREE.EulerOrder` type — using string literal 'YXZ' with `_e.set(...)` where last param expects `EulerOrder`. 'YXZ' is assignable. Good.

One more: `hullGeo.rotateX(Math.PI / 2)` — CapsuleGeometry oriented along Y; rotate about X by +π/2 maps Y→? R_x(π/2): y' = y cos - z sin = -z; z' = y sin + z cos = y. So Y→ +Z? Point (0,1,0) → (0, 0, 1). Yes long axis along +Z. Good.

The capsule's cap ends are rounded; the bow could be +z. Fine.

Boat scale: hull.scale.set(1.25, 0.62, 1.0). After rotation, scaling y flattens the capsule cross-section. Good.

Now, the island's top is at ~11, palms at base ~6-7 plus height 5 → 12. Camera at y=12 looking at (0,2,0): the island fills view. Good.

Let me consider the boat at (12, ~0.3, 14) and the island's shore at r=22; the boat is at r≈18.4 from origin! That's inside the island radius. Uh oh — the boat would be on the island, not in the ocean. islandHeight at (12,14): r=18.44, rn=0.838, h=9.6*(1-0.702)^1.6 = 9.6*0.298^1.6 ≈ 9.6*0.147 = 1.41 plus bumps*fade² (fade=0.162, fade²=0.026 → negligible). So island terrain at (12,14) is ~1.4 above water — the boat would be floating on the beach/grass! That's bad.

Hmm, requirement says boat at about (12, 0, 14) and island centered at origin 30-50 across. Island radius 22 means the boat position r=18.4 is inside. Need to reduce island radius so the boat is in water. Island "about 30 to 50 units across" → diameter 30-50 → radius 15-25. Boat at (12,14) has r=18.4. If island radius R=15 (diameter 30), boat is outside at r=18.4 → water. Good. So set R=15, island diameter 30 (within 30-50). Peak 9.6.

Let's set R=15 and adjust foam ring accordingly (shore at r≈15). Also `shallowZone`/shore foam radii update: shore ring around 15-20. Let's set shore = (1 - smoothstep(17, 22, r)) * smoothstep(13.5, 16.5, r). At r=15: (1-smoothstep(17,22,15)=1)*smoothstep(13.5,16.5,15)≈0.79. Good. Foam ring visible.

Island mesh grid size: 90 with 160 segments (spacing 0.5625) fine; outer underwater region r up to 63.

Peak at r=0 ~ 9.6 + bumps = ~11. Diameter 30, height 11 → nice steep island. Slopes: at rn=0.5, h=9.6*(1-0.25)^1.6=9.6*0.75^1.6=9.6*0.631=6.06. Good.

Boat at (12, t, 14) r=18.4 > 15 → in the sea. But the waves near the shore: heightAt fine.

Palm positions must be inside R=15: adjust:
```
[-8, 4] r=8.94; [5, -6] r=7.8; [-2, -10] r=10.2; [8, 2] r=8.25; [-10, -3] r=10.4; [2, 8] r=8.25
```
All < 13. Good.

Heights at those spots: r=8.94 → rn=0.596, 1-0.355=0.645^1.6=0.497 → 4.77 + bumps. Good. Trunk height 5 → top ~10. Fine.

Now, the island's shoreline: at r≈15 height 0; the ocean waves ±0.9 wash over the beach — looks fine.

Now the island mesh grid 90 covering ±45, but terrain below water beyond r=15 (h≈-2). Fine.

Wait: the terrain's underwater portion (r>15) lies beneath the ocean surface (±0.9). At y=-2 it's safely below. But near r just above 15, terrain h from 0 to -2 linearly; ocean waves ±0.9 can reveal terrain patches above water? At r=16, rn=1.067, h=-2*min(1,0.067*1.5)=-0.2, which is above the trough of waves (-0.9) but below crest. So the ocean surface at trough could be below the terrain → terrain visible above water as a submerged sandbank. That could look like a nice shallow shelf! Actually it might look like sand poking out of the water in some places, which is fine (reef). But foam ring there helps.

Hmm, maybe make the transition steeper: `h = -2.5 * min(1, (rn-1)*2.0)` so at r=16 → -0.5. Still above trough. It's okay — shallow reef. Could also just let the ocean hide it mostly. Fine.

Now, camera view: island radius 15, boat at (12,14). In view, island center is at frame center, boat is closer to the camera and to the right-ish? The camera at (35,35) looks toward the origin; the boat at (12,14) is on the line from camera toward origin roughly (since direction from camera to boat (-23,-21), which aligns with view (-35,-35)). So the boat is roughly in the center foreground, overlapping the island visually! Hmm, that might block the island. But the boat is small (4 units) and at distance ~30 from camera; island distance ~50. The boat would appear in front of the island center. That's actually a nice composition: boat in foreground with island behind. Good.

But if the boat is exactly along the view direction, it hides part of the island. Slight drift moves it around. Fine.

Maybe position the boat a bit off to the side? The requirement says floating at about (12,0,14) — within tolerance. Keep.

Boat's y is wave height + 0.18, so around 0.2-1.2.

Now, lighting/shadows for the boat: the sun is at (-0.62,0.18,-0.76) → light comes from the far side. Boat's shadow falls toward the camera. Nice.

Now, the sky sun disc: sun elevation 10.4°, so it's near the horizon behind the island. The island (height 11 at distance 50) subtends ~12.4° above horizon from the camera (camera at y=12 looking down slightly). The sun at 10° elevation might be hidden behind the island peak! Hmm. Let's check: camera at (35,12,35), looking at (0,2,0). The island peak at (0,11,0) direction from camera: (-35,-1,-35) → elevation angle = -1/sqrt(2450)= -1.15°, i.e., the peak is near the horizon line in view (since camera looks down ~11°, the peak appears above center by 10°). The sun at direction (-0.62,0.18,-0.76) from the origin; from the camera, far away in that direction, the sun's apparent elevation above the horizon is ~10.4°. The island peak apparent elevation for a distant point... The sun is at "infinity" (sky dome radius 600). The horizon line in the camera view: camera looks down at ~11°, so the horizon (0° elevation) is 11° above the view center. The sun at 10.4° above horizon is 21.4° above view center. The island peak at ~10° above view center (from camera). So the sun is above the island peak by ~11° — visible above the island. Good.

Vertical half-FOV 27.5° (FOV 55): sun at 21.4° above center → inside frame near the top. Horizontal: sun direction (-0.62, ., -0.76) vs view direction (-0.69, ., -0.69) → angle in azimuth ~ a few degrees. So the sun is roughly centered horizontally, high in the frame above the island. Great — visible sun and backlit island.

Let's set FOV 55.

Sun elevation: using y=0.18 normalized gives 10.4°. Since it's a "sunset" vibe, warm light. Sky zenith blue, horizon warm near sun. OK.

Actually, with the sun behind the island, the island's front is in shadow. But the island's peak is backlit; the beach in front is shadowed. Ambient/hemisphere fills it. Could look moody and good. Perhaps increase hemisphere intensity to 1.5 to keep the island visible. Also the ocean's reflection of the sky uses uSkyRefl.

Alternatively, position the sun more to the side so the island is partly lit: sunDir = (-0.75, 0.25, -0.6)? Then the light comes from -x, -z; the island's +x face is lit somewhat? Actually light direction from sun to origin is (+0.75,-0.25,+0.6); surfaces facing +x get lit. Camera is at +x,+z, so the camera-facing side is lit! Wait: if the sun is located at (-x,-z) direction from origin, light travels toward +x,+z, illuminating faces whose normals point toward -x,-z... no: a surface is lit if its normal points toward the light source, i.e., toward (-x,-z). The camera-facing side has normals toward (+x,+z), so it's in shade. Right.

So backlit. Fine, I'll boost fill.

Maybe better to have a sun near the horizon to the left of the view, so the island is side-lit: sunDir = (-0.85, 0.22, -0.25) → from -x mostly. Then the island's -x side is lit, the +x side (toward camera) shaded. Still shaded.

Alternatively, put the sun on the camera side but slightly off so it's not in frame: sunDir = (0.6, 0.45, 0.65) → light from the camera side; island front lit; but sun not visible in frame (behind camera). Requirement says "with a visible sun position" — it may just mean the sky shader has a sun position and the light matches. But better to have the disc visible. Hmm.

Let's compromise: sunDir = (0.15, 0.42, -0.9)? Sun behind, mostly -z, elevation 25°, left-ish. The island's -z side lit, +z front shaded. Backlit still.

I think a backlit sunset shot is scenic. But the island might look dark with silhouetted palms — that's a classic beautiful look. Sun glints on water in front. Let's go with that. Boost hemisphere to 1.6 and ambient 0.25; the sky and ground fill will give the front faces a blue-ish ambient. Should be fine.

Actually, let's reduce the backlight severity by raising the sun higher: elevation ~30°: sunDir = (-0.55, 0.55, -0.65) normalized. Then the sun is higher in the sky (above the frame maybe). Vertical offset from view center: horizon at 11° above center; sun elevation = asin(0.55/1.0?) compute normalized: sqrt(0.3025+0.3025+0.4225)=1.012 → (-0.543,0.543,-0.642). Elevation = asin(0.543)=32.9°. In view: 32.9+11 = 43.9° above center → out of frame (half FOV 27.5). So sun disc not visible. Hmm.

To keep the disc visible, elevation ≤ ~16° (16+11=27°). So sun low. Sunset. Let's do elevation ~12°: y component normalized 0.2. Set sunDir = (-0.65, 0.22, -0.72) normalized ≈ length sqrt(0.4225+0.0484+0.5184)=0.995 → (-0.653,0.221,-0.723). Elevation 12.8° → in view at 23.8° above center. Visible near top. Good.

Sun color warm: 0xffd2a0. Intensity 3.5 maybe to compensate low angle. The shadows will be long.

I'll go with this.

But then the water specular: sun is ahead; the glint appears in the water between camera and horizon, i.e., in front of the island. Nice.

Now, ACES tone mapping with bright warm sun — looks good.

Let's write the final code, keeping everything tidy.

One more consideration: The ocean's `shallowZone = 1.0 - smoothstep(15.0, 40.0, r)` gives lighter water near island. Good.

Also the ocean base color near crest: using vHeight. Good.

Let me consider whether the ocean's crest foam threshold makes foam rare. Sum amplitude ~0.91, typical heights vary. smoothstep(0.45,0.78,vHeight) triggers where h>0.45, maybe 20% of the surface; multiplied by ripple. Looks good.

Now `uSunColor` in ocean is separate from sun light color. Use 0xffe0b0 and multiply spec by 2.6. With tone mapping fine.

Potential issue: `pow(nh, 220.0)` with nh close to 1 gives a small bright spot. Good.

Also add a "sparkle" using high-frequency normal variation? Not needed.

Let me now also consider that the ocean is 400x400 with 256 segments and per-vertex 4 sin/cos — cheap. Fragment shader is moderate. Fine.

Should the ocean cast shadows? no.

Also, the ocean should be under the island; since the island terrain extends below, no holes.

Write final code with comments.

One more check: `renderer.setAnimationLoop` with a callback that sets `__ready` after render. In headless testing, the first frame renders. Good.

Also `window` assignment of `__ocean` object:
```ts
(window as any).__ocean = {
  heightAt,
  time: () => waveTime,
};
```
But `waveTime` is a `let` captured. Good.

Need to declare `let waveTime = 0;` before.

Let's ensure `__ready` is set only once but assignment each frame is harmless. Use a boolean.

Now think about strict TS: `const posAttr = islandGeo.attributes.position;` type is `BufferAttribute | InterleavedBufferAttribute

I have thought about this long enough; time to give my answer.
