The user wants a mini solar system in Three.js with:
1. Sun: sphere at origin with MeshBasicMaterial + PointLight at origin (physically based)
2. 3 planets at distances ~4, 7, 10 with MeshStandardMaterial, different angular speeds (inner faster)
3. Each planet spins on its own axis
4. Planet 2 has a moon (child of planet mesh)
5. Weak AmbientLight
6. Camera above and to the side, looking at origin
7. All orbits in XZ plane, Y is up

Let me write this carefully:

- Import THREE from 'three'
- Create WebGLRenderer, append to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use renderer.setAnimationLoop
- Motion uses delta/elapsed time
- Expose __scene, __camera, __renderer
- After first frame, set __ready = true
- No external assets

For physically based lighting:
- PointLight with decay = 2 (physical)
- Intensity needs to be high enough to light planets at distance 4-10
- With decay=2, intensity falls off as 1/d². At distance 4, factor is 1/16. At distance 10, factor is 1/100.
- So intensity should be something like 500-1000 to make planets visible at distance 10.

Let me structure:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera - above and to the side
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Sun
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// PointLight at origin (physically based)
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2); // intensity, distance(inf), decay=2
scene.add(pointLight);

// Ambient light (weak)
const ambientLight = new THREE.AmbientLight(0x222222, 0.5);
scene.add(ambientLight);

// Planets
interface PlanetData {
  mesh: THREE.Mesh;
  orbitRadius: number;
  orbitSpeed: number; // rad/s
  spinSpeed: number; // rad/s
  angle: number;
}

const planets: PlanetData[] = [];

function createPlanet(radius: number, color: number, orbitRadius: number, orbitSpeed: number, spinSpeed: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  return mesh;
}

// Planet 1: distance 4, faster
const p1 = createPlanet(0.4, 0x336699, 4, 1.0, 2.0);
scene.add(p1);
planets.push({ mesh: p1, orbitRadius: 4, orbitSpeed: 1.0, spinSpeed: 2.0, angle: 0 });

// Planet 2: distance 7, medium
const p2 = createPlanet(0.6, 0x994433, 7, 0.6, 1.5);
scene.add(p2);
planets.push({ mesh: p2, orbitRadius: 7, orbitSpeed: 0.6, spinSpeed: 1.5, angle: Math.PI / 3 });

// Moon for planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
// Moon orbits planet 2 - we'll position it relative to planet 2
// Since moon is a child of p2, its position is relative to p2
let moonAngle = 0;
const moonOrbitRadius = 1.2;
const moonOrbitSpeed = 3.0;
moon.position.set(moonOrbitRadius, 0, 0);
p2.add(moon);

// Planet 3: distance 10, slower
const p3 = createPlanet(0.5, 0x44aa55, 10, 0.35, 1.0);
scene.add(p3);
planets.push({ mesh: p3, orbitRadius: 10, orbitSpeed: 0.35, spinSpeed: 1.0, angle: Math.PI });

// Resize handler
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
  
  // Update planets
  for (const p of planets) {
    p.angle += p.orbitSpeed * delta;
    p.mesh.position.set(
      Math.cos(p.angle) * p.orbitRadius,
      0,
      Math.sin(p.angle) * p.orbitRadius
    );
    p.mesh.rotation.y += p.spinSpeed * delta;
  }
  
  // Moon orbit around planet 2
  moonAngle += moonOrbitSpeed * delta;
  moon.position.set(
    Math.cos(moonAngle) * moonOrbitRadius,
    0,
    Math.sin(moonAngle) * moonOrbitRadius
  );
  
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

Wait, I need to be careful with the PointLight intensity. In Three.js with physically correct lighting (which is default in newer versions), the PointLight intensity is in candela and decay=2 means inverse square law. At distance 4, the illuminance would be intensity/16. At distance 10, it would be intensity/100.

For the planets to be visibly lit, I need the intensity to be reasonable. Let me use 500 as intensity. At distance 4: 500/16 ≈ 31. At distance 10: 500/100 = 5. That should work.

Actually, in Three.js r155+, the default is physically correct lighting. The PointLight constructor is `PointLight(color, intensity, distance, decay)`. With decay=2, it's physically correct.

Let me also make sure the ambient light is weak. `new THREE.AmbientLight(0x333333, 0.3)` or similar.

Let me also think about the moon being a child of planet 2. When planet 2 rotates (spin), the moon would also rotate with it in terms of the parent's local frame. But since we're setting the moon's position in the parent's local space, and the parent rotates around Y, the moon's orbit would appear to rotate with the planet's spin. That's actually fine - it's a child mesh, and we're setting its position in local space. The orbit will be in the XZ plane relative to the planet, which is what we want.

Actually wait - when the planet spins (rotation.y changes), the moon's local position also rotates. So the moon's orbit would be affected by the planet's spin. That might look a bit odd but it's acceptable for a mini solar system. Alternatively, I could not spin planet 2, but the requirement says "every planet also spins on its own axis." So I'll keep it. The moon will appear to orbit in a frame that rotates with the planet, which is actually somewhat realistic (tidal locking concept).

Let me finalize the code. I need to make sure it compiles with tsc --strict. Let me check types carefully.

One issue: `clock.getDelta()` returns a number. The for loop over planets array - I need to make sure the types are correct.

Let me write the final version.
