Let me build a mini solar system in TypeScript with Three.js. Let me think through the requirements:

1. Sun: sphere at origin with MeshBasicMaterial (so it's self-lit), plus a PointLight at the origin
2. 3 planets: MeshStandardMaterial, distances ~4, 7, 10, different angular speeds (inner faster)
3. Every planet spins on its own axis
4. Planet 2 has a moon as a child of the planet mesh
5. Weak AmbientLight
6. Camera above and to the side, looking at origin
7. All orbits in XZ plane (Y is up)

For the PointLight, I need to think about physically based intensity/decay. In Three.js with physically correct lights (which is the default in newer versions), the PointLight intensity is in candela and decay should be set to 2 for physical accuracy. But since we want the planets to actually be lit, I need to make sure the intensity is high enough. With decay=2, the light falls off with the square of distance. At distance 10, the intensity would be intensity/100. So I should use a high intensity value, maybe 500 or so, or I could use decay=1 for a simpler falloff. Actually, let me use a reasonable intensity. With decay=2 and distance 10, I need intensity of at least a few hundred to see the outer planets well. Let me use intensity around 200-500.

Actually, let me reconsider. In Three.js r155+, `renderer.useLegacyLights` is false by default (or rather the property was removed). The PointLight with decay=2 means intensity/distance². So at distance 4, light = intensity/16. At distance 10, light = intensity/100. To make all planets visible, I'll use a high intensity like 500.

For the orbit animation: I'll use a group for each planet's orbit, and rotate the group. Or I can manually compute position. Let me use the manual approach with elapsed time for clarity.

Actually, a common pattern is:
- Create a pivot/group at origin for each planet's orbit
- Add the planet mesh to the group at the appropriate distance
- Rotate the group each frame

But the requirement says "planet.add(moon)" for the moon, so the moon is a child of the planet mesh. That means I should position the planet mesh itself (or use a group).

Let me think about the structure:
- For each planet, I'll store the orbit radius, angular speed, and spin speed
- Each frame, compute the angle = speed * elapsed, set planet position to (cos(angle)*radius, 0, sin(angle)*radius)
- For spin, rotate the planet mesh around its Y axis

For the moon: it's a child of planet 2's mesh, so I'll position it relative to the planet and rotate it.

Let me write this out:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
scene.add(pointLight);

// Sun
const sunGeo = new THREE.SphereGeometry(1, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Planets
interface PlanetData {
  mesh: THREE.Mesh;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  spinSpeed: number;
  moon?: THREE.Mesh;
  moonOrbitRadius?: number;
  moonOrbitSpeed?: number;
}

const planets: PlanetData[] = [];

// Planet 1
const p1Geo = new THREE.SphereGeometry(0.3, 32, 32);
const p1Mat = new THREE.MeshStandardMaterial({ color: 0x3366cc, roughness: 0.8, metalness: 0.1 });
const p1 = new THREE.Mesh(p1Geo, p1Mat);
scene.add(p1);
planets.push({ mesh: p1, radius: 0.3, orbitRadius: 4, orbitSpeed: 1.0, spinSpeed: 2.0 });

// Planet 2
const p2Geo = new THREE.SphereGeometry(0.5, 32, 32);
const p2Mat = new THREE.MeshStandardMaterial({ color: 0xcc6633, roughness: 0.7, metalness: 0.1 });
const p2 = new THREE.Mesh(p2Geo, p2Mat);
scene.add(p2);
planets.push({ mesh: p2, radius: 0.5, orbitRadius: 7, orbitSpeed: 0.6, spinSpeed: 1.5 });

// Moon for planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
p2.add(moon);
planets[1].moon = moon;
planets[1].moonOrbitRadius = 1.2;
planets[1].moonOrbitSpeed = 3.0;

// Planet 3
const p3Geo = new THREE.SphereGeometry(0.4, 32, 32);
const p3Mat = new THREE.MeshStandardMaterial({ color: 0x66cc66, roughness: 0.8, metalness: 0.1 });
const p3 = new THREE.Mesh(p3Geo, p3Mat);
scene.add(p3);
planets.push({ mesh: p3, radius: 0.4, orbitRadius: 10, orbitSpeed: 0.4, spinSpeed: 1.0 });

// Animation
let elapsed = 0;
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  elapsed += delta;

  for (const planet of planets) {
    const angle = planet.orbitSpeed * elapsed;
    planet.mesh.position.x = Math.cos(angle) * planet.orbitRadius;
    planet.mesh.position.z = Math.sin(angle) * planet.orbitRadius;
    planet.mesh.rotation.y += planet.spinSpeed * delta;

    if (planet.moon && planet.moonOrbitRadius && planet.moonOrbitSpeed) {
      const moonAngle = planet.moonOrbitSpeed * elapsed;
      planet.moon.position.x = Math.cos(moonAngle) * planet.moonOrbitRadius;
      planet.moon.position.z = Math.sin(moonAngle) * planet.moonOrbitRadius;
    }
  }

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

Wait, I need to make sure the spin is separate from the orbit position. The planet mesh position is set for orbit, and rotation.y is for spin. That should work fine.

Let me also make sure the PointLight intensity is appropriate. With decay=2 and distance 10 (farthest planet), the light intensity at that point would be 500/100 = 5. That should be visible. At distance 4, it's 500/16 ≈ 31.25. That might be a bit bright for the inner planet. Let me adjust - maybe intensity 300 would be better. At distance 4: 300/16 ≈ 18.75, at distance 10: 300/100 = 3. That seems reasonable.

Actually, let me just go with 500 to ensure good visibility. The MeshStandardMaterial with roughness will handle the appearance.

Let me also think about whether I need `tsc --strict` compliance. I need to make sure all types are correct. The `PlanetData` interface should be fine. Let me double-check the clock usage - `THREE.Clock` is standard.

One thing: the moon's orbit should also be in the XZ plane relative to the planet. Since the moon is a child of the planet mesh, and the planet mesh's local XZ plane is what we're working in, setting moon.position.x and moon.position.z will orbit it in the planet's local XZ plane. But wait - the planet mesh rotates (spin), so the moon's orbit will be affected by the planet's rotation. That's actually fine and realistic - the moon orbits in the planet's local frame.

Actually, re-reading the requirements: "Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." So the moon should orbit around the planet. Since it's a child, setting its local position in a circle will make it orbit. The planet's rotation will affect the moon's apparent orbit, but that's acceptable.

Let me finalize the code.
