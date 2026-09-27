Let me build a mini solar system in Three.js with TypeScript. Let me plan the components:

1. Sun: sphere at origin with MeshBasicMaterial (emissive/glowing), plus a PointLight at origin
2. 3 planets at distances ~4, 7, 10, orbiting in XZ plane, each with different angular speeds
3. Each planet spins on its own axis
4. Planet 2 has a moon as a child mesh
5. AmbientLight for weak fill
6. Camera positioned above and to the side, looking at origin
7. Window resize handling
8. Animation loop with delta time
9. Expose scene, camera, renderer, and __ready flag

Let me think about the structure:
- Sun: SphereGeometry, MeshBasicMaterial (so it's always bright regardless of lighting)
- PointLight at origin with appropriate intensity and decay
- Planets: SphereGeometry, MeshStandardMaterial (reactive to light)
- Orbiting: I'll use a pivot object (Object3D) or just compute position each frame
- Spinning: rotate each planet mesh around its Y axis
- Moon: child of planet 2, orbiting around planet 2

For the orbiting, I'll track each planet's angle and update position each frame. The planets orbit in the XZ plane (Y stays at 0 relative to sun).

Let me think about the PointLight intensity. In Three.js, with physically correct lighting (which is default in newer versions), PointLight intensity is in candela and decay is 2 (inverse square). I'll set a reasonable intensity like 200 and decay 2.

Actually, let me check - in Three.js r150+, physically correct lights are default. PointLight with intensity in candela and decay=2. For a sun that lights planets at distance 4-10, I need sufficient intensity. Let me use intensity around 500-1000 with decay 2.

For the camera: position it above and to the side, like (15, 10, 15) looking at origin. The system spans from 0 to about 10 units radius, so the camera needs to be far enough to see it all.

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 10, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// PointLight at origin
const pointLight = new THREE.PointLight(0xffffff, 800, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0x222222, 0.3);
scene.add(ambientLight);

// Planets
const planetRadii = [0.3, 0.4, 0.5];
const planetDistances = [4, 7, 10];
const planetColors = [0x4488ff, 0xcc8844, 0x44aa66];
const orbitSpeeds = [0.5, 0.3, 0.15]; // radians per second
const spinSpeeds = [1.0, 0.7, 0.5]; // radians per second

interface PlanetData {
  mesh: THREE.Mesh;
  distance: number;
  angle: number;
  orbitSpeed: number;
  spinSpeed: number;
}

const planets: PlanetData[] = [];

for (let i = 0; i < 3; i++) {
  const geo = new THREE.SphereGeometry(planetRadii[i], 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: planetColors[i], roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push({
    mesh,
    distance: planetDistances[i],
    angle: 0,
    orbitSpeed: orbitSpeeds[i],
    spinSpeed: spinSpeeds[i],
  });
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].mesh.add(moon);

// Moon orbit
let moonAngle = 0;
const moonOrbitSpeed = 2.0;
const moonDistance = 0.8;

// Animation
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop((time) => {
  const delta = clock.getDelta();
  
  // Update planets
  for (const p of planets) {
    p.angle += p.orbitSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.angle) * p.distance,
      0,
      Math.sin(p.angle) * p.distance
    );
    p.mesh.rotation.y += p.spinSpeed * delta;
  }
  
  // Update moon
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonDistance,
    0,
    Math.sin(moonAngle) * moonDistance
  );
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful with `tsc --strict`. Let me check:
- All variables are typed
- No implicit any
- The `PlanetData` interface is defined
- The `clock.getDelta()` returns a number
- The `time` parameter in setAnimationLoop - it's a number, that's fine

Actually, `renderer.setAnimationLoop` callback takes a `time` parameter of type `number | undefined`. Wait, no - it's `XREndFrameEventCallback` which is `(time: number) => void`. Actually in Three.js, the callback signature is `(time: number) => void`. Let me just use the parameter or not use it at all since I'm using the clock.

Let me also make sure the PointLight parameters are correct. In Three.js:
- `new THREE.PointLight(color, intensity, distance, decay)`
- distance is the max distance the light reaches (0 = infinite)
- decay is the rate of decay (2 = physically correct)

With physically correct lights in Three.js (which is default since r155 or so), the intensity is in candela. For a sun at the origin lighting planets at distance 4-10, I need enough intensity. With decay=2, the illuminance at distance d is intensity/d². So at distance 4, illuminance = 800/16 = 50. At distance 10, illuminance = 800/100 = 8. That should be visible with MeshStandardMaterial.

Actually, let me reconsider. In newer Three.js versions, `useLegacyLights` is false by default, and PointLight intensity is in candela. The formula is: illuminance = intensity / (distance² * decay)... no wait, it's `intensity / (distance^decay)` where decay defaults to 2.

So at distance 4: 800 / 16 = 50 lux equivalent
At distance 10: 800 / 100 = 8 lux equivalent

That should work. Let me go with intensity 800.

Let me also add some visual polish - maybe orbit lines or just keep it clean.

Actually, I should double-check the `setAnimationLoop` callback signature. In Three.js types, it's:
```
setAnimationLoop(callback: ((time: number) => void) | null): void
```

So the parameter is `number`. I can just ignore it and use the clock.

Let me finalize the code. I'll add some visual indicators like orbit rings (thin torus or line) to make it look nicer, but the user didn't ask for that. Let me keep it simple.

One more thing - I should make sure the sun material is MeshBasicMaterial (not affected by lights) so it appears bright. That's correct.

Let me write the final version.
