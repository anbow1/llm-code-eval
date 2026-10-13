The user wants a mini solar system in Three.js. Let me plan this carefully and write clean, strictly-typed TypeScript.

Requirements checklist:
1. Import Three.js as `import * as THREE from 'three';` — no addons actually needed here, but that's fine.
2. Must compile with `tsc --strict` zero errors.
3. Create WebGLRenderer, append canvas to document.body. No other HTML.
4. Size renderer from window.innerWidth/innerHeight, handle resize (camera aspect + renderer size).
5. renderer.setAnimationLoop, motion via delta/elapsed time (use THREE.Clock or pass the time argument... setAnimationLoop callback receives (time, frame) where time is in ms, but safer to use a THREE.Clock with getDelta for delta time).
6. Expose window.__scene, __camera, __renderer.
7. After the first frame is rendered, set window.__ready = true. I'll track a boolean `firstFrameDone` and set it inside the loop after the first render.
8. No external assets.

Scene content:
- Y up, orbits in XZ plane around origin.
- Sun: sphere at origin with MeshBasicMaterial + PointLight at origin that actually lights planets — "mind physically based light intensity/decay". With recent Three.js versions (r155+), lighting uses physically correct units by default: `renderer.useLegacyLights` is false by default, and intensity for point lights is in candela. So a PointLight needs decent intensity given distances of 4, 7, 10. PointLight intensity in candela; illuminance = intensity / distance² (with decay=2 default). At distance 4, intensity 100 → 100/16 = 6.25 lux-ish... Actually the units: irradiance = intensity / d². For decent brightness at distance 10 with decay 2, we'd need intensity ~ 150–300. Let me use intensity like 250 or so, decay default 2. Actually let me compute: at d=4, 250/16 ≈ 15.6; at d=10, 250/100 = 2.5. Hmm, tone mapping matters. Let me enable ACESFilmic tone mapping? That's optional but nice. With tone mapping and exposure, brightness scales. Let's just pick intensity 300, decay 2, distance 0 (no cutoff). At d=4: 18.75, d=7: 6.1, d=10: 3. With ACES tone mapping, values around 1–3 look good; 18 might be blown out but ACES handles highlights gracefully — sun-facing sides of inner planet might look very bright/washed. Maybe intensity 150: d=4 → 9.4, d=7 → 3.06, d=10 → 1.5. That seems reasonable with ACES tone mapping. Or use toneMappingExposure to tune. I'll set renderer.toneMapping = THREE.ACESFilmicToneMapping and PointLight intensity ~ 180.

Actually let me think more: with `renderer.useLegacyLights = false` (default in r155+), point light intensity is in candela. A MeshStandardMaterial with roughness ~0.8 and albedo ~0.6-0.8: diffuse = albedo * irradiance / π roughly, where irradiance = I / d². At d=7, I=180 → irradiance ≈ 3.67. Diffuse ≈ 0.7 * 3.67 / π ≈ 0.82. Good. At d=4, irradiance = 11.25, diffuse ≈ 2.5 → with ACES tone mapping that's a bright highlight but fine. At d=10, irradiance = 1.8, diffuse ≈ 0.4 — a bit dim but visible, plus ambient. Maybe bump ambient to compensate. Let me use intensity 200 and ambient intensity 0.15 or so. Actually "weak ambient so dark sides are not pure black" — ambient 0.1–0.2 works.

Alternatively, keep decay at 2 (default) and set intensity 250, toneMapping ACES, exposure 1. Fine. I'll go with something like intensity 300 to be safe that far planet is lit; ACES will roll off the bright inner planet. Hmm, 300/16 = 18.75 irradiance at planet 1 — that's ~10x overexposed. ACES compresses but it'd look white-hot on the lit side. Maybe better: intensity 150, ambient 0.25. d=4 → 9.4 (ACES: bright but okay), d=7 → 3.06, d=10 → 1.5. That's decent.

Actually, another approach: set decay = 2 explicitly (it's default anyway) and mention in comment. I'll add a comment about physically-based units: intensity in candela, falls off as 1/d².

- 3 planets: spheres with MeshStandardMaterial at distances ~4, 7, 10, different angular speeds (inner faster). Spins on own axis.

Implementation approach for orbits: I could either use pivot Object3D at origin with planet as child at radius and rotate pivot, or compute positions each frame with angle. Either works. For moon: "a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." So moon must be a child of the planet mesh, orbiting. If I spin the planet mesh on its own axis, and moon is a child, the moon would also be dragged by the planet's spin... unless I place the moon as a child of a pivot group that is itself a child of the planet. Hmm: planet.add(moon) — the requirement literally says planet.add(moon). If the planet mesh rotates on its axis (rotation.y), the moon child would revolve around the planet at the planet's spin rate plus any additional orbit. Actually, the moon orbiting = we can set moon position at radius and update its angle each frame. Since moon is child of planet, moon.position is in planet's local space; if planet spins around Y, moon's world position gets rotated by the planet spin too. That's actually fine physically-ish — moons orbit faster than planets spin usually, but here it just means moon angular speed = planet spin + moon's own local angular speed. To keep it simple and literal to the requirement, I'll do planet.add(moonOrbitPivot)? No — requirement says planet.add(moon). Let me do: moon added directly to planet mesh, positioned at (moonDistance, 0, 0), and each frame update moon position via angle: moon.position.set(cos(a)*r, 0, sin(a)*r) in local space. The planet's spin rotation.y will add to the moon's revolution — that's fine, it still orbits. Alternatively, to decouple, I could counter-rotate... nah, simple is fine. Actually wait — if the planet spins, the moon as child at fixed local position spins with it, which reads as "moon orbits planet" anyway. If I additionally update moon's local angle, total revolution rate = spin + local rate. Either way it orbits. Simplest: give moon a local angular update and let it be. Or even simpler: just place moon at fixed local position and let the planet's spin carry it around — that's orbiting driven by spin. But then moon orbit rate = planet spin rate exactly. The requirement says "orbiting that planet" — carrying it via spin does orbit it. But to make the moon's motion distinct, I'll update its local angle each frame. I'll do moonAngle += moonSpeed * delta; moon.position.set(Math.cos(moonAngle) * moonDist, 0, Math.sin(moonAngle) * moonDist). Good.

Planet structure: For each planet, I'll keep an object with { mesh, orbitRadius, orbitAngle, orbitSpeed, spinSpeed }.

Orbit update: angle += speed * delta; mesh.position.set(Math.cos(angle)*R, 0, Math.sin(angle)*R). Or use pivots. Direct position update is clean and typed easily.

- Sun geometry: SphereGeometry(1.5, 48, 32), MeshBasicMaterial({ color: 0xffdd66 }) — maybe emissive-ish orange like 0xffcc44. Since MeshBasicMaterial isn't affected by light, fine.

- PointLight(0xffffff, intensity, 0, decay). Default decay = 2 with physically correct. I'll write new THREE.PointLight(0xfff2cc, 150, 0, 2). Actually distance 0 means infinite range — fine.

- Planets: 
  - Planet 1: radius 0.5, color reddish 0xd97b4a (Mars-like) or teal? Let's do: p1 color 0x4fa3d1 (bluish), roughness 0.7, metalness 0.1.
  - Planet 2: radius 0.7, color 0x6bc26b? Actually let me choose: planet 1 = scorched 0xc97b4a, planet 2 = earth-like 0x5a8fd8 with moon 0xcccccc radius 0.18 at distance 1.3, planet 3 = gas giant 0xd8b56a radius 1.0.

  Sizes: sun radius 1.5; planet radii 0.45, 0.65, 0.95. Moon radius 0.18, orbit radius around planet 2: needs to be > planet radius + moon radius; planet 2 radius 0.65, moon 0.18 → moon dist 1.2.

- Angular speeds: inner faster. e.g., 0.9, 0.55, 0.35 rad/s. Spins: 2.0, 1.4, 0.8 rad/s (spinning on own axis around Y — "spins on its own axis"; axis can be Y or tilted; I'll tilt planets slightly? If I tilt the mesh's rotation.z for axis tilt, then updating rotation.y spin each frame — rotation order matters: with default XYZ order, setting rotation.y and having rotation.z tilt... rotation applied as R = Rx·Ry·Rz (intrinsic XYZ). Hmm, easier: keep spin on Y axis without tilt to avoid confusion. Or use a tilt group: tiltGroup (rotation.z = tilt) contains planet mesh which spins on Y; moon child of planet mesh. But requirement says planet.add(moon) — moon is child of planet mesh, that's satisfied regardless of whether planet mesh itself is child of a tilt group. But simpler: no tilt, planet mesh spins on its own Y axis. "Spins on its own axis" — Y axis qualifies. I'll skip tilt for clarity, or add slight tilt via mesh.rotation.x? If I set rotation.x fixed tilt and update rotation.y, with XYZ Euler order the rotation matrix = Rx * Ry * Rz applied... Three.js Euler XYZ: the object's local transformation is composed as R = RX(x) * RY(y) * RZ(z)? Actually in Three.js, order 'XYZ' means rotations applied about X, then Y, then Z in intrinsic fashion... The quaternion is setFromEuler which for XYZ does q = qx * qy * qz? Let me recall: Quaternion.setFromEuler with order XYZ computes... it effectively yields R = Rz(z) applied first? Hmm. The convention: Euler order 'XYZ' means rotate about X, then about the new Y, then new Z (intrinsic), which equals extrinsic Z, then Y, then X: R = Rx * Ry * Rz. So with rotation.x = tilt and rotation.y = spin updating: R = Rx(tilt) * Ry(spin). Applied to a vector: first Ry(spin) (spin about local Y after... hmm), the tilt Rx is applied "outermost", so the spin axis Y gets tilted by Rx. Yes! That works: R = Rx * Ry means the y-axis rotation happens in the frame already tilted... wait. R * v = Rx * (Ry * v). So v is first rotated by Ry (spin about the world Y? no—about the object's local frame which coincides with world before further transforms), then result tilted by Rx. The axis of the spin: Ry rotates around the Y axis; then the whole thing tilted. So the object spins about Y and the resulting orientation is tilted — meaning the spin axis in world space is still Y? No: if tilt applied after spin, the spin axis itself gets tilted by Rx. The set of orientations as spin varies: Rx * Ry(θ) * base. These are rotations about the axis Rx * (0,1,0) = tilted axis. Yes — the rotation Rx*Ry(θ) is a rotation about the tilted axis Rx·ŷ. So setting rotation.x = tilt (fixed) and rotation.y = θ (increasing) makes the planet spin about a tilted axis. 

But wait — there's a subtlety with the moon as child: moon's local position gets transformed by planet's full local matrix (spin + tilt), so moon orbit plane is tilted with the planet. That's actually nice — moon orbit tilts with planet axis. Fine, physically plausible.

However, careful: I'm also setting planet position each frame via mesh.position.set(...) — position is separate from rotation, fine.

To keep things simpler and avoid any confusion, I'll just spin on Y with a fixed tilt using rotation.x. Actually let me double check Three.js Euler: in Euler.js, order 'XYZ' — Quaternion.setFromEuler for XYZ: the comment says "the order of rotations is X, then Y, then Z" — meaning intrinsic X→Y→Z? The standard Three.js behavior: for order 'XYZ', the resulting rotation matrix equals RX * RY * RZ? Let me verify from source: Matrix4.makeRotationFromEuler for 'XYZ' computes te elements corresponding to... The code for XYZ:

```
const ae = a*e ... 
te[0] = c2*c3; ...
```
Hmm, I recall the known result: for order 'XYZ', matrix = Rz? There's a known gotcha. Let me reason with a simple test mentally: rotation.set(0, Math.PI/2, 0) obviously rotates about Y. rotation.set(Math.PI/2, Math.PI/2, 0): if R = Rx*Ry then applying to x-axis (1,0,0): Ry(90°) maps x→ -z? Ry(θ) maps (1,0,0) to (cosθ, 0, -sinθ) → (0,0,-1). Then Rx(90°) maps (0,0,-1) → (0, 1, 0)? Rx(θ) maps z → (0, -sinθ?, ...). Rx(90°): y→z, z→-y. So (0,0,-1) → (0, 1, 0)? Rx(90°) applied to (0,0,-1): y' = y cosθ - z sinθ = 0*0 - (-1)*1 = 1; z' = y sinθ + z cosθ = 0. So → (0,1,0). So x-axis maps to y. Under R = Rz*Ry*Rx (extrinsic XYZ, i.e., Rx applied first): Rx(90°) maps x→x; then Ry(90°) maps x→(0,0,-1); Rz=I. Result (0,0,-1). These differ. The known Three.js behavior... I believe Three.js 'XYZ' order composes as R = Rx(x) * Ry(y) * Rz(z) in the sense that it's intrinsic X then intrinsic Y then intrinsic Z? Intrinsic X-Y-Z equals extrinsic Z-Y-X reversed: R = Rx * Ry * Rz. Hmm, intrinsic rotations about moving axes: first rotate about X, then about the new Y', then new Z''. The composite matrix is Rx * Ry * Rz? Intrinsic XYZ = extrinsic ZYX? No: intrinsic XYZ equals extrinsic ZYX reversed... Intrinsic rotations X then Y' then Z'' compose as Rx*Ry*Rz (left multiply each new rotation? ). Let me be careful: intrinsic: R = Rx * Ry' * Rz'' where each subsequent axis is the rotated one; equivalently the matrix product is Rx * Ry * Rz (all expressed in original frame? no...). 

Standard result: intrinsic rotation sequence (X, Y', Z'') = extrinsic rotation sequence (Z, Y, X) reversed order of matrices: R = Rx(x) * Ry(y) * Rz(z). And Three.js Euler 'XYZ' is intrinsic? Actually Three.js docs: "the order in which to apply rotations" — apply X first? The Quaternion.setFromEuler source:

```
case 'XYZ':
  this._x = s1*c2*c3 + c1*s2*s3;
  ...
```
This is the standard formula for... The quaternion formula for composition q = qx ⊗ qy ⊗ qz (matrix Rx*Ry*Rz) gives:
x-component of Rx(θ1)*Ry(θ2)*Rz(θ3): Let me compute for small angles: Rx ≈ [1, θ1... ] For composition Rx*Ry*Rz as matrices, small-angle total rotation vector ≈ θx*x̂ + Rx(θx)θ2 ŷ + ... ≈ θx x̂ + θ2 ŷ (approx) + θ3 ẑ... hmm small-angle all similar.

The Three.js source formula: _x = s1*c2*c3 + c1*s2*s3. For composition Rx*Ry*Rz: quaternion qx = (sinθ1/2, 0,0, cosθ1/2), qy = (0, sinθ2/2, 0, cosθ2/2), qz = (0,0,sinθ3/2, cosθ3/2). Product q = qx*qy*qz (this corresponds to matrix Rx*Ry*Rz). Compute components: Let a=θ1/2, b=θ2/2, c=θ3/2. qx=(sa,0,0,ca), qy=(0,sb,0,cb), qz=(0,0,sc,cc).

qx*qy = (sa*cb + 0*0? ...) Quaternion product (x1,y1,z1,w1)*(x2,y2,z2,w2):
x = w1x2 + x1w2 + y1z2 - z1y2 = ca*0 + sa*cb + 0 - 0 = sa*cb
y = w1y2 - x1z2 + y1w2 + z1x2 = ca*sb - sa*0 + 0 + 0 = ca*sb
z = w1z2 + x1y2 - y1x2 + z1w2 = 0 + sa*sb - 0 + 0 = sa*sb
w = w1w2 - x1x2 - y1y2 - z1z2 = ca*cb - sa*sb

Then (qx*qy)*qz: q1 = (sa cb, ca sb, sa sb, ca cb - sa sb). Multiply by qz=(0,0,sc,cc):
x = w1*0 + x1*cc + y1*sc - z1*0 = sa cb cc + ca sb sc
Compare with Three.js formula _x = s1*c2*c3 + c1*s2*s3 where s1=sin(a) etc. With a=θ1/2: s1 = sa, c1 = ca, s2 = sb, c2 = cb, s3 = sc, c3 = cc. So _x = sa*cb*cc + ca*sb*sc. Matches! So Three.js 'XYZ' = matrix Rx*Ry*Rz. 

So R = Rx(tilt) * Ry(spin) * Rz(0). The planet spins about Ry(θ) and tilt Rx applied on top — spin axis in world = Rx·ŷ (tilted). And moon child position transforms through the whole thing, orbit plane tilted too. That works nicely. Actually wait — does the moon's local angular position update still work? moon.position is local to planet; planet's matrix = position * Rx * Ry. Moon world pos = planetPos + Rx*Ry*(moonLocal). As spin θ changes, moonLocal orbits in planet-local XZ, and gets tilted by Rx. So the moon orbits in the tilted plane around the planet. 

Hmm, but actually, do I even want tilt? It adds slight complexity but it's a nice touch. The requirement only says "spins on its own axis" — plain Y spin satisfies it. I'll add slight tilts for visual interest; it's safe per the analysis above. Actually, one more consideration: I set mesh.rotation.x = tilt once at creation, then each frame mesh.rotation.y += spinSpeed*delta. Since Euler XYZ with z=0: R = Rx*Ry. Confirmed correct. 

Wait, actually one more check on rotation.set(x, y, z) default order 'XYZ' — yes default is 'XYZ'.

Hmm, but simpler alternative: keep tilts small (like 0.1–0.4 rad). Fine.

- Camera: "above and to the side, looking at the origin, whole system visible." Position e.g. (10, 12, 16) looking at origin. Distance sqrt(100+144+256)=sqrt(500)≈22.4. System radius ~10 + planet sizes ≈ 11. With fov 50, half-angle 25°, at distance 22.4 the visible radius ≈ 22.4*tan(25°) ≈ 10.5. Tight-ish. Let me use position (12, 14, 18) → dist = sqrt(144+196+324)=sqrt(664)≈25.8, visible radius ≈ 12. Good. Or fov 45: tan(22.5)≈0.414 → 10.7. Hmm, aspect helps horizontally. Let's go camera.position.set(11, 13, 17), fov 50, lookAt(0,0,0). dist ≈ sqrt(121+169+289)=sqrt(579)≈24.1 → vertical half extent ≈ 24.1*0.466 ≈ 11.2 > 11. OK. Or just make it a bit further: (12, 15, 18): dist = sqrt(144+225+324)=sqrt(693)≈26.3 → 12.3. Good. I'll use (12, 15, 18) or similar. Also handle aspect: on narrow screens (portrait), vertical fov governs, so 11 < 12.3 fits. Good.

- Renderer: antialias true, setPixelRatio(Math.min(devicePixelRatio, 2)), shadow maps? Not required. Could enable shadows for niceness but not needed — keep it simpler; actually shadows would be nice (moon eclipse). But PointLight shadows are cube maps — costlier. Requirement doesn't ask; I'll skip shadows to keep code focused, or maybe include? "mind physically based light intensity/decay" suggests they care about light correctness. Shadows optional. I'll skip to keep it clean. Hmm, adding shadows is a nice touch: renderer.shadowMap.enabled = true, light.castShadow, planets cast/receive. With PointLight it renders 6 cube faces each frame — small scene, fine. But planet meshes both cast and receive... self-shadow acne possible; set bias. I'll include shadows — makes dark sides & moon shadow visible. Actually risk: shadow acne on spheres with cube shadow maps. bias -0.005 or normalBias. Let me include with modest settings; it's a well-trodden pattern. Hmm, but any risk of visual artifacts... I'll include shadows with normalBias 0.02. Actually, let me reconsider: strict compile + correctness is priority; shadows are cosmetic and could introduce acne issues I can't visually verify. I'll enable them but carefully: shadow.mapSize 1024, light.shadow.bias = -0.002, normalBias = 0.02, camera.near 0.5, far 40. Planets castShadow = true, receiveShadow = true; moon too. Sun sphere doesn't need to cast (it's at light position; casting from sun would shadow everything? The sun sphere surrounds the light! If sun castShadow=true, cube map from light inside sun sphere — the sun sphere would occlude everything (near faces). So sun must NOT cast shadows. Set sun.castShadow = false (default false anyway). Also light near must be > sun radius: shadow.camera.near = 1.6 (sun radius 1.5). Good.

- Ambient: new THREE.AmbientLight(0x404050, ...) — intensity in r155+ ambient is just multiplier; use 0.25 maybe with color 0x8899bb? "weak" — use intensity ~0.2. With physical lights, ambient intensity is direct multiplier on color. 0.2 gives dark sides 0.2*albedo — visible, not black. Maybe 0.25. I'll use 0.25.

Hmm — actually let me reconsider the PointLight intensity more concretely with ACESFilmic tone mapping:

renderer.toneMapping = ACESFilmicToneMapping; toneMappingExposure default 1.

Planet 2 at d=7: irradiance = I/49. Diffuse ≈ albedo * irr / π * ... For Lambert in three.js standard material: BRDF = albedo/π, outgoing = irradiance * albedo / π. With I=150: irr=3.06, out ≈ 0.75*3.06/3.14 ≈ 0.73. ACES(0.73) ≈ 0.68-ish, looks good.

Planet 1 at d=4: irr = 150/16 = 9.4; out ≈ 0.7*9.4/π ≈ 2.1. ACES(2.1) → maps to ~0.87 (ACES compresses; ACESFilmic at input 2.1 gives roughly 0.83? The ACES curve: f(x) = (x(2.51x+0.03))/(x(2.43x+0.59)+0.14) with x = exposure*linear. f(2.1) = 2.1*(5.27+0.03)/(2.1*(5.10+0.59)+0.14) = 2.1*5.30/(2.1*5.69+0.14) = 11.13/(12.05) = 0.92. Bright but not fully blown. Fine — inner planet lit side looks bright/hot, plausible.

Planet 3 at d=10: irr = 1.5; out ≈ 0.7*1.5/π ≈ 0.33; ACES(0.33) ≈ 0.33*(0.83+0.03)/(0.33*(0.80+0.59)+0.14) = 0.33*0.86/(0.458+0.14)=0.284/0.598=0.475. Decent. Plus ambient. Good — I=150 works. Let me use 150 or 160. I'll go 150 with comment. Also maybe give planet materials some slight variation in roughness.

Also set THREE.ColorManagement — default enabled; use hex colors fine.

- Animation loop: use clock: const clock = new THREE.Clock(); in loop: const delta = clock.getDelta(); const elapsed = clock.elapsedTime maybe. Update angles with delta. Then renderer.render. After first render, set __ready = true (use a flag).

- Resize handler: camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(...).

- window.__scene etc.: cast as any. Since it's a module with strict mode, `(window as any).__scene = scene;` compiles fine.

- TypeScript strictness: no unused variables (strict doesn't include noUnusedLocals unless enabled; but tsc --strict alone doesn't flag unused locals — noUnusedLocals is separate. Still, keep clean). Type everything properly.

Code structure:

```ts
import * as THREE from 'three';

// --- renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- scene & camera ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(12, 15, 18);
camera.lookAt(0, 0, 0);

// --- lights ---
const ambient = new THREE.AmbientLight(0x8899bb, 0.25); scene.add(ambient);
// PointLight intensity is in candela (physically based); falloff ~ 1/d² (decay 2).
const sunlight = new THREE.PointLight(0xfff4d6, 150, 0, 2);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.near = 1.6;
sunlight.shadow.camera.far = 40;
sunlight.shadow.bias = -0.001;
sunlight.shadow.normalBias = 0.02;
scene.add(sunlight);

// --- sun ---
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc23d })
);
scene.add(sun);

interface Planet {
  mesh: THREE.Mesh;
  radius: number;      // orbit radius
  angle: number;       // current orbit angle
  orbitSpeed: number;  // rad/s
  spinSpeed: number;   // rad/s
}

const planets: Planet[] = [];

function createPlanet(
  orbitRadius: number, size: number, color: number,
  orbitSpeed: number, spinSpeed: number, tilt: number, startAngle: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 40, 28),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 })
  );
  mesh.rotation.x = tilt;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  planets.push({ mesh, radius: orbitRadius, angle: startAngle, orbitSpeed, spinSpeed });
  // place initial position
  mesh.position.set(Math.cos(startAngle)*orbitRadius, 0, Math.sin(startAngle)*orbitRadius);
  return mesh;
}

const planet1 = createPlanet(4, 0.45, 0xc97b4a, 0.9, 2.2, 0.08, 0);
const planet2 = createPlanet(7, 0.65, 0x5f9fd8, 0.55, 1.6, 0.35, Math.PI * 0.7);
const planet3 = createPlanet(10, 0.95, 0xd9b26a, 0.32, 1.0, 0.25, Math.PI * 1.4);

// moon child of planet2
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.9 })
);
moon.castShadow = true;
moon.receiveShadow = true;
planet2.add(moon);
const moonOrbitRadius = 1.25;
let moonAngle = 0;
const moonOrbitSpeed = 2.4;
moon.position.set(moonOrbitRadius, 0, 0);
```

Wait: moon as child of planet2 whose rotation.x tilt tilts moon orbit — fine. But note moon.castShadow while planet2 also casts — moon shadowing planet possible during transit; fine.

Hmm — one subtle thing: moon.receiveShadow with the planet casting shadow — when moon is behind planet relative to sun (i.e., planet between sun and moon), moon is in planet's shadow — cube shadow map captures that. Nice.

Loop:

```ts
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1); // clamp to keep orbits stable after tab switches
  
  for (const p of planets) {
    p.angle += p.orbitSpeed * delta;
    p.mesh.position.set(Math.cos(p.angle) * p.radius, 0, Math.sin(p.angle) * p.radius);
    p.mesh.rotation.y += p.spinSpeed * delta;
  }
  
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(Math.cos(moonAngle) * moonOrbitRadius, 0, Math.sin(moonAngle) * moonOrbitRadius);
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

One caveat: moonAngle, moonOrbitRadius etc. declared with let/const before loop — fine.

Check strict compile concerns:
- `sunlight.shadow.camera` is OrthographicCamera for PointLight? PointLight shadow camera is PerspectiveCamera. Setting near/far fine.
- shadow.mapSize.set(1024,1024) — mapSize is Vector2. Fine.
- All types: Planet interface ok. createPlanet returns mesh; planet2 used as parent. Fine.
- `(window as any).__ready = true;` fine.

Clamping delta: clock.getDelta() could return big value after tab inactivity; clamp to 0.1 — good practice, still delta-based.

One more consideration about PointLight decay: default decay is 2 already, but I'll pass explicitly with comment. Also `useLegacyLights` — in r155+, default false, so physical mode; in newer versions (r165+?), useLegacyLights removed entirely and always physical. Since I don't set it, works in both. Good.

Sun material: MeshBasicMaterial color 0xffc23d — maybe brighter: 0xffcc55. Also could add a subtle larger glow sphere? Skip, keep spec-focused. Maybe make sun slightly emissive-looking with color. Fine.

Star background? Not requested; scene.background dark color. Could add tiny star points... not requested; skip to keep it clean. Actually a subtle starfield via Points would be nice and asset-free... The instructions say no external assets; Points with generated geometry is allowed. But keep it minimal — I'll skip; the spec is precise and I should deliver exactly that plus quality basics. Maybe add a faint large sphere? No. Keep it.

Camera: "above and to the side" — (12, 15, 18) is above (y=15) and to the side. lookAt origin. Good.

Let me also double-check that planet rotation tilt + position update doesn't conflict: position updated absolutely each frame (not additive), so no drift. Good.

Moon speed: planet2 spinSpeed 1.6 rad/s and moon local orbit 2.4 rad/s → world revolution 4.0 rad/s — quite fast (period 1.57s). Hmm, maybe reduce: spin 1.2, moon local 1.8 → 3.0 rad/s world, period ~2.1s. Still fast but readable. Alternatively make moon orbit slower: 1.5, spin 1.0 → 2.5 rad/s. Eh, a moon zipping around is charming. Let me set planet2 spin 1.4, moon local speed 1.7. Actually note: because the moon is a child of a spinning planet, its world revolution = spin + local. I could mention that in a comment. Or, to give the moon an independent, clearly-visible orbit, I could compensate... no, over-engineering. Comment it.

Hmm wait, actually there's an alternative interpretation issue: does the grader check that moon orbits planet with its own motion? As long as it visibly circles the planet, fine.

Also, tilt on planet2: moon orbit plane tilts 0.35 rad ≈ 20°. Fine.

Orbit speeds: 0.9, 0.55, 0.32 rad/s — periods 7s, 11.4s, 19.6s. Inner faster ✓.

Let me also think about whether to use pivot-based orbits — no, position math is fine and typed.

Tone mapping + outputColorSpace: default outputColorSpace is SRGB in modern three. Fine.

Also: `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — devicePixelRatio could be non-integer; fine.

Edge: `Math.min(window.devicePixelRatio, 2)` returns number. OK.

One strict-typing detail: shadow.mapSize — readonly? In three types, `PointLightShadow.mapSize: Vector2` — settable via .set. Fine.

`sunlight.shadow.camera.near = 1.6` — camera type is PerspectiveCamera for PointLightShadow in recent types; .near exists on Camera? `shadow.camera` typed as PerspectiveCamera for PointLightShadow (three types: PointLightShadow extends LightShadow with camera: PerspectiveCamera). Actually in older types it's OrthographicCamera? LightShadow.camera is OrthographicCamera; PointLightShadow overrides camera as PerspectiveCamera. Setting .near/.far works either way since both have near/far. Fine.

Also declare types for moon: THREE.Mesh. Fine.

Write final code with helpful comments. Also ensure no unused imports/vars. Let me also expose nothing else. Should I add `document.body.style.margin = '0'`? Page has no other HTML; body margin default 8px would show white sliver. Nice touch: set body margin 0 and overflow hidden via injected style. Allowed (not external). I'll add a small style setup:

```ts
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
```

Also renderer.domElement style display block to avoid baseline gap. Minor. Add.

Final check on `__ready` requirement: "After the first frame is rendered, set (window as any).__ready = true." — done inside loop after render call, guarded by flag. ✓

Double-check the sun's MeshBasicMaterial isn't affected by tone mapping — MeshBasicMaterial does get tone mapped (tone mapping applies to all materials unless toneMapped=false). ACES(0xffc23d output ~ (1, 0.76, 0.24) linear?) Color 0xffc23d in sRGB → linear approx (1.0, 0.52, 0.05). ACES(1.0)≈0.80 → appears slightly dimmer. Could set material.toneMapped = false to keep sun punchy, or boost color. I'll set `toneMapped: false` in the MeshBasicMaterial options — that's supported in material params. Actually the param is `toneMapped` (boolean, default true) in MaterialParameters. Yes, MeshBasicMaterialParameters includes toneMapped. I'll set toneMapped: false so sun stays vivid. Good.

Also maybe scale ambient color: 0x99aacc, intensity 0.25.

Let me also reconsider light intensity once more: I said 150. With ambient 0.25*color(0.6 linear?) 0x99aacc sRGB → linear ≈ (0.34,0.41,0.57)*0.25 → adds ~0.09-0.14 to all sides. Dark side of planet ≈ 0.1 — visible against black. Good.

Final code assembly. Also add comment about physically based: "with WebGLRenderer's default physical lighting mode, PointLight intensity is in candela and falls off with inverse-square (decay = 2), so at these orbit distances we need a high candela value."

Also consider `renderer.toneMappingExposure = 1.1`? Keep 1.

One more: camera near 0.1, far 200 fine.

Also I should handle the case where the moon shadow settings: moon.castShadow = true, moon.receiveShadow = true.

Also planet meshes: SphereGeometry(size, 48, 32) maybe.

Also — should the sun mesh receiveShadow? No (MeshBasicMaterial ignores light anyway).

Also, set `sunlight.position` default (0,0,0) — it's added to scene at origin by default position (0,0,0). Fine explicitly? PointLight default position is (0,0,0). OK, but I'll set it explicitly for clarity? Not needed.

Now write out the final file.

Also think about whether `import * as THREE from 'three'` with no addons import — fine.

One thing about tsc --strict: `const planets: Planet[] = []` then push — fine. Interface Planet fine.

`let moonAngle = 1.0;` initial offset. moonOrbitSpeed const 1.7. moonOrbitRadius const 1.3 (planet2 radius 0.65 + moon 0.18 → clearance 0.47; visually good).

Also moon initial position before first frame: set at (moonOrbitRadius, 0, 0). But since planet2's rotation.x tilt applies, fine.

Double-check: when updating moon.position each frame in planet-local space, and planet spin updates rotation.y — moon world position = planetWorldPos + tilt*spin*(localPos). Local orbit + spin rotation both around local Y → world orbit around tilted Y at combined rate. ✓.

Write the answer: single ```ts block only, per instructions ("Reply with a single ```ts code block and nothing else"). The system prompt says expert dev; user says reply with single code block and nothing else. So no extra prose.

Let me write final code:

```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Renderer / canvas
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
renderer.domElement.style.display = 'block';

// ---------------------------------------------------------------------------
// Scene / camera (Y is up; whole system sits in the XZ plane around origin)
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05060a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(12, 15, 18); // above (y) and to the side (x/z)
camera.lookAt(0, 0, 0);

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------
// Weak ambient so the dark sides are not pure black.
scene.add(new THREE.AmbientLight(0x99aacc, 0.25));

// Physically based lighting: PointLight intensity is in candela and (with the
// default decay = 2) irradiance falls off as 1 / distance², so a sun lighting
// planets out to distance 10 needs a fairly high candela value.
const sunlight = new THREE.PointLight(0xfff2d0, 150, 0, 2);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
sunlight.shadow.camera.near = 1.6; // just outside the sun sphere
sunlight.shadow.camera.far = 40;
sunlight.shadow.bias = -0.001;
sunlight.shadow.normalBias = 0.02;
scene.add(sunlight);

// ---------------------------------------------------------------------------
// Sun (unlit by definition -> MeshBasicMaterial, toneMapped off to stay vivid)
// ---------------------------------------------------------------------------
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.5, 48, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc23d, toneMapped: false })
);
scene.add(sun);

// ---------------------------------------------------------------------------
// Planets
// ---------------------------------------------------------------------------
interface Planet {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number; // rad/s (inner planets faster)
  spinSpeed: number;  // rad/s around its own (slightly tilted) axis
}

const planets: Planet[] = [];

function createPlanet(
  orbitRadius: number,
  size: number,
  color: number,
  orbitSpeed: number,
  spinSpeed: number,
  axialTilt: number,
  startAngle: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size, 48, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 })
  );
  // Fixed tilt around X + per-frame spin around Y => spins on a tilted axis.
  mesh.rotation.x = axialTilt;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(
    Math.cos(startAngle) * orbitRadius,
    0,
    Math.sin(startAngle) * orbitRadius
  );
  scene.add(mesh);
  planets.push({ mesh, orbitRadius, orbitAngle: startAngle, orbitSpeed, spinSpeed });
  return mesh;
}

const planet1 = createPlanet(4, 0.45, 0xc97b4a, 0.9, 2.2, 0.08, 0);
const planet2 = createPlanet(7, 0.65, 0x5f9fd8, 0.55, 1.4, 0.35, Math.PI * 0.7);
const planet3 = createPlanet(10, 0.95, 0xd9b26a, 0.32, 1.0, 0.22, Math.PI * 1.4);

// ---------------------------------------------------------------------------
// Moon: child of planet 2, orbiting it (its world revolution is the planet's
// spin plus its own local angular speed).
// ---------------------------------------------------------------------------
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.9 })
);
moon.castShadow = true;
moon.receiveShadow = true;
planet2.add(moon);

const moonOrbitRadius = 1.3;
const moonOrbitSpeed = 1.7;
let moonAngle = 0.6;
moon.position.set(moonOrbitRadius, 0, 0);

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1); // clamp after tab switches

  for (const p of planets) {
    p.orbitAngle += p.orbitSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.orbitAngle) * p.orbitRadius,
      0,
      Math.sin(p.orbitAngle) * p.orbitRadius
    );
    p.mesh.rotation.y += p.spinSpeed * delta;
  }

  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true; // first frame has been rendered
  }
});

// ---------------------------------------------------------------------------
// Test hooks & resize
// ---------------------------------------------------------------------------
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

Check unused variables: planet1 and planet3 are assigned but only planet2 used. With `tsc --strict` only (no noUnusedLocals), that compiles. But to be safe against stricter setups... the instruction says compile with `tsc --strict` zero errors — noUnusedLocals is not part of strict. Still, cleaner: just call createPlanet without assigning for 1 and 3:

```ts
createPlanet(4, 0.45, ...);
const planet2 = createPlanet(7, ...);
createPlanet(10, ...);
```

That avoids unused vars entirely. Good.

One more compile check: `toneMapped: false` in MeshBasicMaterialParameters — yes exists. `THREE.ACESFilmicToneMapping` exists. `renderer.setAnimationLoop` exists. Clock fine. `sunlight.shadow.camera` typed as PerspectiveCamera in PointLightShadow — near/far settable. `moonAngle` let. All good.

Note about shadow near=1.6 while moon at min distance from light: moon world distance from sun ranges 7±1.3 → fine.

Everything checks. Output single ts block.