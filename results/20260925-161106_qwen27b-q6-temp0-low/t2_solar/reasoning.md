Let me plan out this mini solar system:

1. **Sun**: Sphere at origin with MeshBasicMaterial (emissive-looking), plus a PointLight at origin. For physically based lighting, I need to use appropriate intensity and decay. In Three.js with physically correct lighting, PointLight intensity is in candela and decay defaults to 2. I should set `renderer.useLegacyLights = false` or just use appropriate values. Actually, in newer Three.js versions, `useLegacyLights` is deprecated and physically correct lighting is default. Let me use a PointLight with sufficient intensity (like 100 or so) and decay of 2, or I can set decay to 0 for simpler behavior. Let me use a reasonable intensity.

2. **3 Planets**: Spheres with MeshStandardMaterial at distances 4, 7, 10. Each orbits at different angular speed (inner faster). Each also spins on its own axis.

3. **Moon**: Small sphere as child of planet 2, orbiting that planet.

4. **AmbientLight**: Weak, so dark sides aren't pure black.

5. **Camera**: Above and to the side, looking at origin.

Let me think about the structure:

- Create scene, camera, renderer
- Sun mesh at origin
- PointLight at origin
- AmbientLight (weak)
- 3 planet meshes, each positioned by orbit angle
- Planet 2 has a moon as child

For orbiting, I'll track time and compute positions:
- Planet 1: distance 4, angular speed ω1 (fastest)
- Planet 2: distance 7, angular speed ω2
- Planet 3: distance 10, angular speed ω3 (slowest)

Position: x = distance * cos(ω * t), z = distance * sin(ω * t), y = 0

For the moon: it's a child of planet 2's mesh, so it orbits relative to planet 2. I'll position the moon in local space of the planet.

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();

// Camera - above and to the side
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 10, 12);
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
const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
// With decay 2 and physical units, intensity is in candela. 200 should be enough for distances 4-10.
// Actually let me think: at distance 4, illuminance = 200 / (4^2) = 12.5. At distance 10, = 200/100 = 2. That should work.
scene.add(pointLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

// Planets
const planetData = [
    { distance: 4, speed: 1.5, radius: 0.3, color: 0x4488ff, spinSpeed: 2.0 },
    { distance: 7, speed: 1.0, radius: 0.5, color: 0xff8844, spinSpeed: 1.5 },
    { distance: 10, speed: 0.5, radius: 0.7, color: 0x88cc44, spinSpeed: 1.0 },
];

const planets: THREE.Mesh[] = [];

for (const data of planetData) {
    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.8, metalness: 0.2 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    planets.push(mesh);
}

// Moon for planet 2 (index 1)
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.1 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(1.5, 0, 0); // offset from planet center
planets[1].add(moon);

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    
    // Update planet positions
    for (let i = 0; i < planets.length; i++) {
        const data = planetData[i];
        const angle = data.speed * elapsed;
        planets[i].position.x = data.distance * Math.cos(angle);
        planets[i].position.z = data.distance * Math.sin(angle);
        // Spin
        planets[i].rotation.y = data.spinSpeed * elapsed;
    }
    
    // Moon orbit (local to planet 2)
    const moonAngle = 3.0 * elapsed;
    moon.position.x = 1.5 * Math.cos(moonAngle);
    moon.position.z = 1.5 * Math.sin(moonAngle);
    
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

Wait, I need to think about the PointLight intensity. In Three.js r155+, the default is physically correct lighting. PointLight intensity is in candela. With decay=2, the formula is intensity / (distance^2). 

At distance 4: 200/16 = 12.5
At distance 7: 200/49 ≈ 4.1
At distance 10: 200/100 = 2

These should give visible lighting on the planets. Let me keep it at 200.

Actually, let me reconsider. In more recent Three.js (r152+), `useLegacyLights` defaults to false, meaning physically correct lighting is on. The PointLight intensity with physically correct lighting is in candela. The values above should work fine.

Let me also make sure the sun looks good - maybe a slightly larger radius and a brighter color.

One issue: the moon is a child of planet[1], and I'm setting its position each frame. Since it's a child, the position is in local space of the planet. That's correct.

Let me also add a slight tilt to planet axes for visual interest? The prompt says "spins on its own axis" - I'll just spin around Y for simplicity, which is fine since orbits are in XZ plane and Y is up.

Let me finalize the code and make sure it compiles with strict mode. I need to be careful with types.

Actually, I realize I should double-check: `renderer.setAnimationLoop` callback receives a time parameter (in milliseconds) but I'm using `clock.getElapsedTime()` which is fine.

Let me also make sure I'm not using any deprecated APIs. The code looks good. Let me write the final version.
