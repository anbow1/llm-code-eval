The user wants a mini solar system with:
1. Sun: sphere at origin with MeshBasicMaterial + PointLight at origin (physically based intensity/decay)
2. 3 planets: MeshStandardMaterial at distances ~4, 7, 10, different angular speeds (inner faster)
3. Every planet spins on its own axis
4. Planet 2 has a moon: small sphere as child of planet mesh, orbiting that planet
5. Weak AmbientLight
6. Camera above and to the side, looking at origin, whole system visible

Let me think about the implementation:

- Sun: SphereGeometry, MeshBasicMaterial (emissive look), PointLight at origin. For physically based lighting in Three.js, PointLight uses `intensity` in candela when `renderer.useLegacyLights = false` (which is default in newer versions). Actually, by default in Three.js r155+, `useLegacyLights` is false. The PointLight intensity is in candela. With decay=2 (default), the light falls off as 1/distance². At distance 10, we need enough intensity to see planets. Let me use a high intensity like 200 or so.

Actually, let me think about this more carefully. In Three.js with physically correct lighting:
- PointLight intensity is in candela
- At distance d, the illuminance is intensity / d²
- At distance 4: intensity/16
- At distance 7: intensity/49
- At distance 10: intensity/100

For planets to be visible, I need sufficient intensity. Let's use intensity around 200-500. Let's go with 300.

- Planets: I'll create orbit groups. Each planet is in a group that rotates around the origin. The planet mesh itself rotates for spin.

- For the moon on planet 2: The moon should be a child of the planet mesh. But wait - if the moon is a child of the planet mesh and the planet mesh spins, the moon would spin with the planet. That's actually what's requested: "a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." So the moon orbits the planet. I can put the moon in a pivot group that's a child of the planet, or I can manually position the moon in the animation loop.

Actually, re-reading: "added as a child of the planet mesh (planet.add(moon))". So the moon is a direct child of the planet mesh. To orbit it around the planet, I can either:
1. Put it in a pivot group (but that's not a child of the planet mesh directly)
2. Manually update its position each frame

Wait, if the moon is a child of the planet mesh, and the planet mesh spins, then the moon's local position will rotate with the planet. But I also want the moon to orbit. Let me think...

If I add the moon as a child of the planet mesh, I can update its local position each frame to make it orbit. But since the planet is also spinning, the orbit will be affected. 

Actually, the simplest approach: add the moon as a child of the planet mesh, and in the animation loop, update the moon's local position to orbit around the origin (in local space). Since the planet spins, the orbit will appear to precess, which looks natural.

Alternatively, I could use a pivot object as a child of the planet, then the moon as a child of the pivot. But the requirement says "planet.add(moon)" specifically.

Let me just do: moon is a child of planet, and I update moon.position each frame to orbit.

For the orbit mechanism:
- I'll create a group for each planet's orbit, centered at origin
- Add the planet mesh to this group at the appropriate distance
- Rotate the group to make the planet orbit

Wait, but if the planet is at (distance, 0, 0) in the orbit group, and I rotate the group around Y, the planet orbits in the XZ plane. That works.

Let me structure:
- orbitGroup1 (rotates around Y) -> planet1 at (4, 0, 0)
- orbitGroup2 (rotates around Y) -> planet2 at (7, 0, 0) -> moon as child of planet2
- orbitGroup3 (rotates around Y) -> planet3 at (10, 0, 0)

For planet spin: rotate planet mesh around its own Y axis.

For moon: as child of planet2, update its local position to orbit.

Camera: above and to the side. Something like (15, 12, 15) looking at origin.

Let me write the code now.

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// PointLight for sun
const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// AmbientLight
const ambient = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambient);

// Planets
interface PlanetData {
  mesh: THREE.Mesh;
  orbitGroup: THREE.Group;
  orbitSpeed: number;
  spinSpeed: number;
}

function createPlanet(radius: number, color: number, distance: number, orbitSpeed: number, spinSpeed: number): PlanetData {
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(distance, 0, 0);
  
  const orbitGroup = new THREE.Group();
  orbitGroup.add(mesh);
  scene.add(orbitGroup);
  
  return { mesh, orbitGroup, orbitSpeed, spinSpeed };
}

const planet1 = createPlanet(0.4, 0x4488ff, 4, 0.5, 2.0);
const planet2 = createPlanet(0.6, 0xff8844, 7, 0.3, 1.5);
const planet3 = createPlanet(0.8, 0x88ff88, 10, 0.2, 1.0);

// Moon for planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planet2.mesh.add(moon);

// Moon orbit params
const moonOrbitRadius = 1.5;
const moonOrbitSpeed = 2.0;
let moonAngle = 0;

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  
  // Orbit planets
  planet1.orbitGroup.rotation.y += planet1.orbitSpeed * delta;
  planet2.orbitGroup.rotation.y += planet2.orbitSpeed * delta;
  planet3.orbitGroup.rotation.y += planet3.orbitSpeed * delta;
  
  // Spin planets
  planet1.mesh.rotation.y += planet1.spinSpeed * delta;
  planet2.mesh.rotation.y += planet2.spinSpeed * delta;
  planet3.mesh.rotation.y += planet3.spinSpeed * delta;
  
  // Moon orbit
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(Math.cos(moonAngle) * moonOrbitRadius, 0, Math.sin(moonAngle) * moonOrbitRadius);
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to double-check the physically based light. In Three.js r155+, `useLegacyLights` defaults to false. The PointLight with intensity in candela and decay=2 means the light at distance d has intensity/d². At distance 4, that's 300/16 ≈ 18.75. At distance 10, that's 300/100 = 3. That should be visible with MeshStandardMaterial.

Actually, I should be careful. In newer Three.js versions, the default for `PointLight` decay is 2, and when `useLegacyLights` is false (which is the default now), intensity is in candela. So 300 candela should work well.

Let me also make sure the moon's orbit looks right. Since the moon is a child of planet2's mesh, and planet2's mesh is spinning (rotation.y), the moon's local position will be affected by the parent's rotation. This means the moon's orbit will appear to precess as seen from the orbit group's frame. That's actually a nice effect and physically plausible (sort of).

But wait - the moon position is set in local space of the planet. As the planet spins, the moon's orbit plane will rotate with it. That might look a bit odd. An alternative is to not spin the planet, but the requirement says every planet spins. Let me just go with it - it'll look like the moon orbit is precessing, which is actually a real phenomenon.

Actually, I think it's fine. The moon will orbit in the local XZ plane of the planet, and as the planet spins around Y, the orbit plane stays in the XZ plane (since spinning around Y doesn't change the XZ plane). So the moon will just orbit in the same plane, just the "reference frame" rotates. The visual effect is that the moon orbits the planet in a circle in the XZ plane (as seen from above), which is correct.

Wait, actually if I spin the planet around its Y axis, and the moon is positioned in the local XZ plane, then from the parent's perspective, the moon stays in the XZ plane. So visually, the moon orbits in a circle in the XZ plane around the planet. That's perfect.

Let me finalize the code.
