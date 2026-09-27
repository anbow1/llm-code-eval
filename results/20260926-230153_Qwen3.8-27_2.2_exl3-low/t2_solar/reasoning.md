Let me build a mini solar system in Three.js with TypeScript. Let me plan this out:

1. Sun: sphere at origin with MeshBasicMaterial (emissive glow), PointLight at origin
2. 3 planets: MeshStandardMaterial spheres at distances ~4, 7, 10, orbiting with different angular speeds
3. Each planet spins on its own axis
4. Planet 2 has a moon as a child
5. AmbientLight for dark sides
6. Camera positioned above and to the side, looking at origin
7. Proper setup: renderer, resize handling, animation loop with delta time
8. Expose scene, camera, renderer, and __ready flag

Let me think about the orbital mechanics:
- Planets orbit in XZ plane (Y is up)
- Position: x = r * cos(angle), z = r * sin(angle), y = 0
- Angular speeds: inner faster, e.g., 1.0, 0.5, 0.25 (or similar)
- Spin: rotate around Y axis (or a tilted axis for realism, but Y is fine)

For the PointLight, I should use physically correct intensity. With `useLegacyLights = false` (or in newer Three.js versions, the default), intensity is in candela. Let me use a reasonable value. Actually, let me just set a high intensity like 100 or 200 to light the planets well.

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// PointLight at origin
const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
scene.add(pointLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0x222222, 0.3);
scene.add(ambientLight);

// Planets
const planetData = [
  { radius: 0.4, distance: 4, orbitSpeed: 1.0, spinSpeed: 2.0, color: 0x4488ff },
  { radius: 0.5, distance: 7, orbitSpeed: 0.5, spinSpeed: 1.5, color: 0x884444 },
  { radius: 0.6, distance: 10, orbitSpeed: 0.25, spinSpeed: 1.0, color: 0x44aa44 },
];

const planets: THREE.Mesh[] = [];

for (const data of planetData) {
  const geo = new THREE.SphereGeometry(data.radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  planets.push(mesh);
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].add(moon);

// Animation
let elapsed = 0;
let ready = false;

renderer.setAnimationLoop((time) => {
  // Use delta - but setAnimationLoop gives us time in ms
  // Actually, let me track delta properly
  ...
});
```

Wait, `setAnimationLoop` callback receives a `time` parameter (DOMHighResTimeStamp in ms). I need to track the previous time to compute delta. Let me use a ref for the previous time.

Actually, looking at the Three.js docs, `setAnimationLoop` callback receives `time` which is the current time in ms. I'll track previous time to get delta.

Let me also think about the orbit. The planets are positioned at their orbital radius, and I update their position each frame based on elapsed time.

Let me refine:

- elapsed accumulates delta
- For each planet: angle = elapsed * orbitSpeed, position = (distance * cos(angle), 0, distance * sin(angle))
- Spin: mesh.rotation.y += spinSpeed * delta
- Moon: moon position orbits around planet 2, angle = elapsed * moonOrbitSpeed, position relative to planet = (moonDistance * cos(moonAngle), 0, moonDistance * sin(moonAngle))

Wait, the moon is a child of the planet mesh. So its position is relative to the planet. But the planet rotates on its axis (rotation.y). If the moon is a child and the planet rotates, the moon would orbit with the planet's rotation... Hmm, that's not quite right.

Actually, let me think about this differently. The moon should orbit around the planet independently. If the moon is a child of the planet mesh, and the planet rotates around Y, then the moon's local position would rotate with the planet. That's not ideal.

Better approach: Don't make the moon a child of the planet mesh directly. Instead, make it a child of a group that's positioned at the planet's location. Or, make the moon a child of the planet but compute its position in local space accounting for the planet's rotation.

Actually, the simplest approach: make the moon a child of the planet mesh, but set its position each frame in the planet's local space. Since the planet rotates around Y, the moon's local position would be affected by the planet's rotation. 

Hmm, let me reconsider. The requirement says "a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." So I need to use `planet.add(moon)`. 

The moon orbits the planet. If the planet spins on its Y axis, and the moon is a child, then the moon's local coordinates are in the planet's rotated frame. So if I set moon.position in local space, it will appear to orbit in the planet's frame.

Actually, this works fine for a simple visual: the moon orbits in the XZ plane of the planet's local frame. Since the planet is a sphere, its rotation around Y doesn't change its appearance, so the moon will still appear to orbit around the planet in world space (approximately). The moon's local position: (moonDist * cos(moonAngle), 0, moonDist * sin(moonAngle)) in the planet's local frame.

But wait - if the planet rotates around Y, the moon's local XZ plane rotates with it. So the moon's world position would be affected by the planet's rotation. This could look a bit odd. 

Alternative: I could make the moon a child of a non-rotating parent that's at the planet's position. But the requirement says `planet.add(moon)`.

Let me just go with it - the moon orbits in the planet's local frame. Since the planet is a sphere and rotates around Y, the moon will still appear to orbit around the planet in a circular path in the XZ plane (in world space it will be a circle that precesses slightly with the planet's spin, but for a small moon distance it'll look fine).

Actually, for a sphere, rotation around Y doesn't change the visual. The moon at local position (r*cos(a), 0, r*sin(a)) will appear to orbit the planet. The planet's Y rotation just rotates the reference frame, but since the planet is symmetric, it looks the same. The moon will orbit in a circle around the planet. This is fine.

Let me finalize the code. I'll use `let prevTime = 0` to track delta.

For the PointLight, in modern Three.js (r150+), `useLegacyLights` defaults to false, so intensity is in candela. I'll use intensity of about 100-200 to light the planets well. The decay of 2 means inverse square falloff. At distance 4, the light intensity would be 200/16 = 12.5, at 7 it's 200/49 ≈ 4, at 10 it's 200/100 = 2. That should work well with the ambient light.

Let me write the final code now.
