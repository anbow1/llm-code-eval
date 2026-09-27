Let me build a mini solar system with the following components:

1. Sun: sphere at origin with MeshBasicMaterial (emissive-like appearance)
2. PointLight at origin with physically based intensity/decay
3. 3 planets at distances ~4, 7, 10 with MeshStandardMaterial
4. Each planet orbits at different angular speeds (inner faster)
5. Each planet spins on its own axis
6. Planet 2 has a moon as a child
7. Weak AmbientLight
8. Camera above and to the side, looking at origin

Key considerations:
- Physically based light: PointLight with decay=2 and appropriate intensity. In Three.js with physically based rendering, intensity is in candela units. For a point light at the origin to light planets at distance 4-10, I need sufficient intensity. With decay=2 (physically correct), intensity needs to be high enough. At distance 4, illuminance = intensity / (4^2) = intensity/16. At distance 10, illuminance = intensity/100. So I'll use something like 200-500 for intensity to get reasonable lighting.

- Orbits in XZ plane: y is up, so planets move in xz plane (y=0)
- Different angular speeds: inner faster. Something like 1.0, 0.5, 0.25 rad/s
- Planet self-rotation: rotate on y axis (or some axis)
- Moon as child of planet 2's mesh, orbiting in a local XZ plane

Let me think about the structure:
- Scene, camera, renderer
- Sun mesh (MeshBasicMaterial with a warm color)
- PointLight at origin
- AmbientLight (weak)
- 3 planet meshes (MeshStandardMaterial)
- Moon as child of planet 2
- Animation loop with delta time

For the orbit positions, I'll use angle-based positioning:
- x = distance * cos(angle)
- z = distance * sin(angle)
- y = 0

For the moon, since it's a child of the planet, its position will be relative to the planet. I'll make it orbit in the local XZ plane.

Let me write the code:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 25);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Sun
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// PointLight - physically based
const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

// Planets
const planets: { mesh: THREE.Mesh; distance: number; speed: number; spinSpeed: number; angle: number; moon?: THREE.Mesh; moonAngle?: number; moonDistance?: number; moonSpeed?: number }[] = [];

const planetData = [
    { radius: 0.3, color: 0x4488cc, distance: 4, orbitSpeed: 1.0, spinSpeed: 2.0 },
    { radius: 0.5, color: 0xcc8844, distance: 7, orbitSpeed: 0.5, spinSpeed: 1.5 },
    { radius: 0.4, color: 0x88cc44, distance: 10, orbitSpeed: 0.25, spinSpeed: 1.0 },
];

for (const data of planetData) {
    const geo = new THREE.SphereGeometry(data.radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.7, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    planets.push({ mesh, distance: data.distance, speed: data.orbitSpeed, spinSpeed: data.spinSpeed, angle: Math.random() * Math.PI * 2 });
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].mesh.add(moon);
planets[1].moon = moon;
planets[1].moonDistance = 1.0;
planets[1].moonSpeed = 3.0;
planets[1].moonAngle = 0;

// Animation
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    
    for (const p of planets) {
        p.angle += p.speed * delta;
        p.mesh.position.x = p.distance * Math.cos(p.angle);
        p.mesh.position.z = p.distance * Math.sin(p.angle);
        p.mesh.rotation.y += p.spinSpeed * delta;
        
        if (p.moon && p.moonDistance !== undefined && p.moonSpeed !== undefined && p.moonAngle !== undefined) {
            p.moonAngle += p.moonSpeed * delta;
            p.moon.position.x = p.moonDistance * Math.cos(p.moonAngle);
            p.moon.position.z = p.moonDistance * Math.sin(p.moonAngle);
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

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to make sure the PointLight intensity is correct for physically based rendering. With `decay: 2` (which is the default for physically correct), the formula is:
- illuminance at distance d = intensity / d²

At distance 4: illuminance = 300 / 16 = 18.75
At distance 7: illuminance = 300 / 49 ≈ 6.1
At distance 10: illuminance = 300 / 100 = 3.0

These seem reasonable for a visible scene. Let me go with 300 or maybe even 500 to make it a bit brighter.

Actually, let me reconsider. In Three.js, when `renderer.useLegacyLights` is false (which is the default in newer versions), the PointLight intensity is in candela. The default decay is 2. So intensity 300 should work well.

Let me also make sure the TypeScript is strict-mode compatible. I'll use proper types and avoid any issues.

One thing to note: I should initialize the planet angles to different random values so they don't all start at the same position.

Let me finalize the code.
