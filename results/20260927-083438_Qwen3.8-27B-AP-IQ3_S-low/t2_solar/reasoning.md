Let me plan out this solar system mini-project:

1. **Sun**: Sphere at origin with MeshBasicMaterial (emissive look, not affected by lighting), plus a PointLight at origin.
   - For physically based lighting with Three.js, PointLight uses physical intensity (candela). I need to set `renderer.useLegacyLights = false` (or in newer versions it's default). Actually, in newer Three.js versions, the default is physically correct lighting. Let me use a PointLight with appropriate intensity.
   - With physically based lighting, PointLight intensity is in candela. For a scene of this scale (planets at distance 4-10), I need enough intensity. Let me use something like 50-100 candela.

2. **Planets**: 3 spheres with MeshStandardMaterial at distances ~4, 7, 10 in XZ plane.
   - Each orbits at different angular speed (inner faster)
   - Each spins on its own axis
   - Planet 2 has a moon as a child

3. **Moon**: Small sphere, child of planet 2's mesh, orbiting that planet.

4. **Lighting**:
   - PointLight at origin (physically based intensity/decay)
   - Weak AmbientLight

5. **Camera**: Above and to the side, looking at origin, whole system visible.

6. **Structure**:
   - For orbiting, I can either manually position planets each frame using sin/cos, or use a pivot group. Let me use the manual approach (position.x = cos(angle) * radius, position.z = sin(angle) * radius) since it's cleaner.
   - Actually, for the moon to orbit the planet, I'll add it as a child of the planet mesh and rotate its position relative to the planet.

Wait, if I add the moon as a child of the planet mesh, and the planet spins on its own axis, the moon would spin with it. That's not ideal. Let me think about this...

The requirement says "planet.add(moon)" so the moon IS a child of the planet mesh. If the planet spins, the moon will orbit with the planet's spin PLUS its own orbital motion. To make the moon orbit properly, I should:
- Add moon as child of planet mesh (as required)
- Position moon at some radius from planet center
- Rotate the moon's position each frame (relative to the planet)

But if the planet mesh is rotating (for axial spin), the moon's local coordinates rotate with it. So the moon would appear to orbit in a frame that's rotating with the planet.

Actually, let me re-read: "Every planet also spins on its own axis" and "Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet."

The simplest approach that satisfies the requirement:
- Create planet mesh
- Add moon as child with an offset position
- Rotate the moon around the planet by changing its local position each frame
- The planet mesh itself rotates for axial spin

Since the moon is a child of the planet mesh, when the planet rotates, the moon's position rotates too. But I can counteract this or just accept it. Actually, for a mini solar system, this is fine - the moon will appear to orbit the planet (with some wobble from the planet's spin, which actually looks kind of realistic).

Alternatively, I could not spin the planet mesh and instead spin a texture or something... but we don't have textures. Let me just spin the planet mesh and have the moon as a child. The moon's orbit will be in the planet's local space, which means it will appear to wobble slightly, but that's acceptable for a mini solar system.

Actually, a cleaner approach: I'll spin the planet mesh for axial rotation, and for the moon, I'll update its local position each frame. Since the moon is a child of the planet, its local position is relative to the planet's center. As the planet rotates, the moon's world position will be affected by the planet's rotation matrix. But if I'm updating the moon's local position every frame to be (cos(moonAngle)*moonRadius, 0, sin(moonAngle)*moonRadius), the moon will orbit in the planet's local XZ plane. The planet's rotation will cause this local XZ plane to rotate, making the moon's orbit appear to precess slightly. That's fine.

Let me structure the code:

```typescript
import * as THREE from 'three';

// Scene, Camera, Renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15); // above and to the side
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 100, 0, 2); // physically based: intensity in candela, decay=2
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
interface PlanetData {
  mesh: THREE.Mesh;
  radius: number;
  distance: number;
  orbitSpeed: number;
  spinSpeed: number;
  angle: number;
}

const planetData: PlanetData[] = [];
const planetConfigs = [
  { radius: 0.4, distance: 4, orbitSpeed: 1.0, spinSpeed: 2.0, color: 0x3366cc },
  { radius: 0.6, distance: 7, orbitSpeed: 0.5, spinSpeed: 1.0, color: 0xcc6633 },
  { radius: 0.5, distance: 10, orbitSpeed: 0.25, spinSpeed: 1.5, color: 0x33cc66 },
];

for (const config of planetConfigs) {
  const geometry = new THREE.SphereGeometry(config.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color: config.color, roughness: 0.7, metalness: 0.1 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  planetData.push({
    mesh,
    radius: config.radius,
    distance: config.distance,
    orbitSpeed: config.orbitSpeed,
    spinSpeed: config.spinSpeed,
    angle: Math.random() * Math.PI * 2,
  });
}

// Moon for planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planetData[1].mesh.add(moon);
let moonAngle = 0;
const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 3.0;

// Animation
let elapsed = 0;
let firstFrame = true;

renderer.setAnimationLoop((timestamp) => {
  // Need delta time - I'll track it manually
  // Actually setAnimationLoop passes timestamp in ms
  // Let me use a clock approach
});
```

Hmm, I need to handle delta time properly. Let me use a clock or track the previous timestamp.

Actually, `renderer.setAnimationLoop` passes a timestamp (DOMHighResTimeStamp). I'll track the previous time to compute delta.

Let me also think about the PointLight intensity. In Three.js with physically correct lighting (which is default in recent versions), PointLight intensity is in candela. For objects at distance 4-10, with decay=2 (inverse square law), the illuminance at distance d is intensity/d². So at distance 7, illuminance = 100/49 ≈ 2. That should be visible. Let me use intensity of 200 to be safe, or maybe 100 is fine.

Actually, let me reconsider. In Three.js r155+, `useLegacyLights` defaults to false. The PointLight with physically correct lighting:
- intensity is in candela
- irradiance at distance d = intensity / d²

For a planet at distance 4: E = 100/16 = 6.25
For a planet at distance 7: E = 100/49 ≈ 2.04
For a planet at distance 10: E = 100/100 = 1.0

With MeshStandardMaterial, these should be visible. Let me go with intensity 200 for better visibility.

Let me write the complete file now.
