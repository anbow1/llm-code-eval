The user wants a complete TypeScript file for a mini solar system using Three.js. Let me plan this out:

1. Import Three.js
2. Create scene, camera, renderer
3. Sun: sphere at origin with MeshBasicMaterial + PointLight at origin
4. 3 planets with MeshStandardMaterial at distances ~4, 7, 10, orbiting at different angular speeds
5. Each planet spins on its own axis
6. Planet 2 has a moon as a child mesh
7. AmbientLight for dark sides
8. Camera above and to the side, looking at origin
9. Handle resize
10. Use setAnimationLoop with delta time
11. Expose __scene, __camera, __renderer, __ready

Let me think about the structure:

- Sun: sphere geometry, MeshBasicMaterial (emissive look), PointLight at origin
- Planets: I'll create pivot objects (Object3D) at origin, then position the planet mesh at the orbital distance. Actually, better approach: create a group/pivot at origin, set the planet as a child at distance, then rotate the pivot to create orbit.

Wait, let me think more carefully. For orbiting:
- Create a pivot (Object3D) at origin
- Add planet mesh as child at position (distance, 0, 0)
- Rotate the pivot around Y axis to create orbit

For spinning: rotate the planet mesh itself around its own axis (Y axis since Y is up).

For the moon on planet 2:
- Add moon as child of planet mesh
- Moon orbits around the planet

Let me think about the PointLight. For physically based lighting:
- PointLight with distance and decay=2 (physically correct)
- Intensity should be high enough to light planets at distance 4-10
- In Three.js, for physically correct lights, intensity is in candela units
- With decay=2, intensity at distance d = intensity / d²
- So for planets at distance 10, we need enough intensity
- Let's use intensity around 100-200 with decay=2

Actually, let me reconsider. In Three.js r150+, when `renderer.useLegacyLights = false` (or by default in newer versions), the PointLight intensity is in candela. With decay=2, the illuminance at distance d is intensity/d².

For a planet at distance 10, if intensity is 100, the light would be 100/100 = 1. That's reasonable.
For distance 4: 100/16 ≈ 6.25
For distance 7: 100/49 ≈ 2.04

Let me use intensity = 200, decay = 2. That gives:
- At 4: 200/16 = 12.5
- At 7: 200/49 ≈ 4.08
- At 10: 200/100 = 2

That seems reasonable. Actually, let me just use a reasonable value. I'll set intensity to 150 with decay 2.

Wait, I need to be careful. In newer Three.js versions (r155+), `useLegacyLights` defaults to false. The physically correct mode means intensity is in candela. Let me just set it to a reasonable value.

Let me structure the code:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera - above and to the side
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0x222222, 0.3);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
// Planet 1: distance 4, fast orbit
// Planet 2: distance 7, medium orbit, has moon
// Planet 3: distance 10, slow orbit

interface PlanetData {
  radius: number;
  distance: number;
  orbitSpeed: number; // radians per second
  spinSpeed: number; // radians per second
  color: number;
}

const planetData: PlanetData[] = [
  { radius: 0.4, distance: 4, orbitSpeed: 1.0, spinSpeed: 0.5, color: 0x4488ff },
  { radius: 0.6, distance: 7, orbitSpeed: 0.5, spinSpeed: 0.3, color: 0xff8844 },
  { radius: 0.5, distance: 10, orbitSpeed: 0.25, spinSpeed: 0.4, color: 0x44ff88 },
];

const planets: { pivot: THREE.Object3D; mesh: THREE.Mesh }[] = [];

for (const data of planetData) {
  const pivot = new THREE.Object3D();
  pivot.position.set(0, 0, 0);
  
  const geo = new THREE.SphereGeometry(data.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(data.distance, 0, 0);
  pivot.add(mesh);
  scene.add(pivot);
  
  planets.push({ pivot, mesh });
}

// Moon on planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(1.2, 0, 0);
planets[1].mesh.add(moon);

// Animation
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop((time) => {
  const delta = 1/60; // Hmm, I should use the actual delta
  // Actually, setAnimationLoop gives us a timestamp in ms
  // I need to track previous time for delta
});
```

Wait, `setAnimationLoop` callback receives a `time` parameter (DOMHighResTimeStamp in ms). I need to track the previous frame time to compute delta.

Let me restructure:

```typescript
let prevTime = 0;
let ready = false;

renderer.setAnimationLoop((time: number) => {
  const delta = (time - prevTime) / 1000; // convert to seconds
  prevTime = time;
  
  // Orbit planets
  for (const { pivot, mesh } of planets) {
    pivot.rotation.y += orbitSpeed * delta;
    mesh.rotation.y += spinSpeed * delta;
  }
  
  // Moon orbit
  moon.rotation.y += moonOrbitSpeed * delta;
  
  // Actually, the moon needs its own pivot or I can rotate it differently
  // Since moon is a child of planet mesh, I can't just rotate it around the planet
  // I need a pivot for the moon too
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

For the moon, since it's a child of the planet mesh, I should create a moon pivot as a child of the planet mesh, and the moon as a child of that pivot. Wait, the requirement says "planet.add(moon)" - so the moon is directly a child of the planet mesh. 

Hmm, if the moon is a child of the planet mesh, then rotating the planet will also rotate the moon's orbital plane. That's actually fine - the moon orbits in the same plane as the planet's spin axis.

But to make the moon orbit, I can just rotate the moon around the planet. Since the moon is a child of the planet mesh, I can set its position in a circle. Or I can add a pivot as child of planet.

Actually, let me re-read: "Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet."

So the moon is a direct child of the planet mesh. To make it orbit, I can:
1. Create a moonPivot as child of planet mesh
2. Add moon as child of moonPivot at some distance
3. Rotate moonPivot

But the requirement says `planet.add(moon)` directly. Let me just make the moon a child of the planet and animate its position in a circle manually, or use a pivot.

Actually, I think the cleanest approach is:
- moonPivot is a child of planet2 mesh
- moon is a child of moonPivot
- moon.position.set(1.2, 0, 0)
- Rotate moonPivot around Y

But the requirement says `planet.add(moon)`. Let me just do that and animate the moon's position in a circle:

```typescript
moon.position.x = moonDistance * Math.cos(moonAngle);
moon.position.z = moonDistance * Math.sin(moonAngle);
```

Or I can use a pivot. Let me use a pivot but still call it "planet.add(moonPivot)" - no, the requirement specifically says `planet.add(moon)`.

Let me just make the moon a direct child and update its position each frame. That's the simplest and matches the requirement.

Actually wait - if I use a pivot:
```
planet2.add(moonPivot);
moonPivot.add(moon);
```

That's not `planet.add(moon)`. Let me just do `planet.add(moon)` and animate position.

Let me finalize the code now. I'll track the orbit angles and moon angle with elapsed time.

Let me also make sure the PointLight physically based intensity works. In Three.js r155+, physically correct lighting is default. PointLight intensity is in candela. With decay=2:
- illuminance = intensity / distance²

For planets at 4, 7, 10:
- With intensity 150: 150/16=9.4, 150/49=3.06, 150/100=1.5

That should work well. Let me use 150.

Actually, I realize I should double-check: in newer Three.js, the default for PointLight is decay=2 and it's physically based. The `distance` parameter (0 means infinite range) is still available. Let me set distance=0 (infinite) and decay=2.

Let me write the final clean code:
