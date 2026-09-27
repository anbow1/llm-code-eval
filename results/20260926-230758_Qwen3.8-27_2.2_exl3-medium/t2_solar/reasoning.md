The user wants a mini solar system in Three.js with TypeScript. Let me plan this out:

1. Sun: sphere at origin with MeshBasicMaterial (emissive look), PointLight at origin
2. 3 planets at distances ~4, 7, 10, orbiting in XZ plane
3. Each planet spins on its own axis
4. Planet 2 has a moon as a child
5. AmbientLight for dark sides
6. Camera above and to the side, looking at origin
7. Resize handling
8. setAnimationLoop with delta time
9. Expose scene, camera, renderer, __ready

Let me think about the structure:

- Sun: SphereGeometry, MeshBasicMaterial (colored, no lighting needed)
- PointLight at origin with physically based settings (decay=2, appropriate intensity)
- Planets: SphereGeometry, MeshStandardMaterial, positioned in XZ plane
- Orbit: I'll use a group or just compute position each frame using angle
- Spin: rotate each planet mesh around its own axis (Y axis)
- Moon: child of planet 2's mesh, orbits planet 2

For the orbit mechanism:
- I'll track each planet's angle and update position each frame
- Planet position: x = r * cos(angle), z = r * sin(angle), y = 0

For the moon:
- It's a child of planet 2's mesh
- I'll position it at a local offset from the planet
- It orbits around the planet in the XZ plane (local space)

Let me think about the PointLight physically based settings:
- In Three.js, with physically correct lights, the intensity is in candela
- For a point light, decay should be 2 (physically correct)
- The distance from sun to planets is 4, 7, 10
- At distance 4, intensity should be high enough; at distance 10, it'll be dimmer
- I'll set intensity to something like 200-500 to make it work well

Actually, let me use `renderer.useLegacyLights = false` or the newer approach. In newer Three.js versions, physically correct lights are default. Let me set:
- PointLight intensity: around 500 (candela), decay: 2
- This means at distance 4, the illuminance is 500/16 ≈ 31
- At distance 7, 500/49 ≈ 10
- At distance 10, 500/100 = 5

That should work. Let me use intensity 500.

Actually, let me reconsider. With physically based lighting in Three.js:
- PointLight with decay=2 means the falloff is 1/d²
- Intensity is in candela
- At d=4: 500/16 = 31.25 (bright)
- At d=7: 500/49 ≈ 10.2 (medium)
- At d=10: 500/100 = 5 (dimmer but visible)

That seems reasonable. Let me go with intensity 400.

For the camera:
- Position it above and to the side: maybe (15, 12, 15) looking at origin
- This should show the whole system (radius 10)

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Sun
const sunGeometry = new THREE.SphereGeometry(1.5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// PointLight (physically based)
const sunLight = new THREE.PointLight(0xffffff, 400, 0, 2);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0x222222, 0.3);
scene.add(ambientLight);

// Planets
interface PlanetData {
    mesh: THREE.Mesh;
    radius: number;
    angularSpeed: number;
    spinSpeed: number;
    angle: number;
}

const planetData: PlanetData[] = [];

const planetConfigs = [
    { radius: 0.5, color: 0x4488ff, distance: 4, angularSpeed: 0.5, spinSpeed: 1.0 },
    { radius: 0.7, color: 0xcc8844, distance: 7, angularSpeed: 0.3, spinSpeed: 0.7 },
    { radius: 0.6, color: 0x88cc88, distance: 10, angularSpeed: 0.2, spinSpeed: 0.5 },
];

for (const cfg of planetConfigs) {
    const geo = new THREE.SphereGeometry(cfg.radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: cfg.color, roughness: 0.8, metalness: 0.1 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    planetData.push({
        mesh,
        radius: cfg.distance,
        angularSpeed: cfg.angularSpeed,
        spinSpeed: cfg.spinSpeed,
        angle: Math.random() * Math.PI * 2,
    });
}

// Moon on planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.2, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.0 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planetData[1].mesh.add(moon);

let moonAngle = 0;
const moonOrbitRadius = 1.5;
const moonOrbitSpeed = 0.8;

// Animation
let ready = false;
const clock = new THREE.Clock();

renderer.setAnimationLoop((time) => {
    const delta = clock.getDelta();
    
    // Update planets
    for (const p of planetData) {
        p.angle += p.angularSpeed * delta;
        p.mesh.position.x = p.radius * Math.cos(p.angle);
        p.mesh.position.z = p.radius * Math.sin(p.angle);
        p.mesh.position.y = 0;
        p.mesh.rotation.y += p.spinSpeed * delta;
    }
    
    // Update moon
    moonAngle += moonOrbitSpeed * delta;
    moon.position.x = moonOrbitRadius * Math.cos(moonAngle);
    moon.position.z = moonOrbitRadius * Math.sin(moonAngle);
    moon.position.y = 0;
    
    renderer.render(scene, camera);
    
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful with `tsc --strict`. Let me check:
- `clock.getDelta()` returns a number - fine
- All types are properly defined
- The `for...of` loop over `planetData` - fine
- No unused variables

Let me also make sure the moon's position is relative to the planet (since it's a child). The moon is added as a child of `planetData[1].mesh`, so its position is in local space of the planet. Since the planet is at (x, 0, z) in world space, the moon's local position (1.5*cos, 0, 1.5*sin) will be relative to the planet center. That's correct.

Actually wait - the planet mesh is at position (x, 0, z) in world space. The moon is a child, so its position is relative to the planet. So moon.position.x = 1.5 * cos(moonAngle) means the moon is 1.5 units from the planet center in local XZ plane. That's correct.

Let me also add some orbit lines or rings for visual clarity? The user didn't ask for that, so I'll keep it simple.

Let me also make sure the ambient light intensity is appropriate. With physically based lighting, the ambient light in Three.js... actually, in newer Three.js versions, ambient light intensity works differently. Let me use a small value like 0.3 or maybe just 0.15.

Actually, in Three.js with physically correct lights, the ambient light intensity is just a multiplier. 0.3 should be fine for a "weak" ambient.

Let me finalize the code and make sure it compiles with strict mode. I need to be careful about:
- No implicit any
- All variables typed
- No unused variables (strict doesn't flag unused by default, but let's be clean)

One more thing: `renderer.useLegacyLights` - in newer Three.js (r155+), this is deprecated and physically correct is default. I'll just not set it and assume modern Three.js.

Actually, let me double-check: in Three.js r155+, `useLegacyLights` defaults to false, meaning physically correct lighting is on by default. The PointLight intensity is in candela. So my setup should work.

Let me write the final clean version.
