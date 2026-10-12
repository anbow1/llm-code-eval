The user wants a mini solar system in TypeScript using Three.js. Let me plan this out:

1. Scene setup with camera, renderer
2. Sun at origin with MeshBasicMaterial (emissive, doesn't need light)
3. PointLight at origin to illuminate planets - need to be careful about physically correct lighting
4. 3 planets with MeshStandardMaterial at distances 4, 7, 10
5. Different angular speeds (inner faster)
6. Each planet spins on its own axis
7. Planet 2 has a moon as a child
8. Weak AmbientLight
9. Camera above and to the side

Key considerations:
- Physically based lighting: In newer Three.js versions, PointLight intensity is in candela. I'll use a reasonable intensity value. Also need to consider `renderer.physicallyCorrectLights` or the newer `renderer.useLegacyLights = false` (or it's default in newer versions).
- For PointLight with physically correct lights, intensity is in candela. A value of around 100-200 should work for distances of 4-10 units. Actually, let me think about this more carefully. With `decay = 2` (physically correct), the light falls off as 1/distance². At distance 4, intensity would be I/16, at distance 7 it's I/49, at distance 10 it's I/100. So I need a fairly high intensity. Let me use something like 500-1000.
- Actually in modern Three.js (r155+), `useLegacyLights` is removed and physically correct is the default. PointLight intensity is in candela. Let me use intensity around 500.
- I'll use `renderer.outputColorSpace` and tone mapping for better results.
- Camera position: something like (12, 8, 12) looking at origin to see the whole system.

Let me also make sure:
- Orbits in XZ plane (Y up)
- Use delta time from clock
- Planet spins on own axis (rotate the mesh itself)
- Moon is child of planet mesh, orbits planet
- Window resize handler
- __ready flag after first frame

Let me write this out:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 8, 12);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
const planets: Array<{ mesh: THREE.Mesh; distance: number; speed: number; spinSpeed: number }> = [];

function createPlanet(radius: number, color: number, distance: number, speed: number, spinSpeed: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    planets.push({ mesh, distance, speed, spinSpeed });
    return mesh;
}

const planet1 = createPlanet(0.4, 0x4488ff, 4, 1.0, 2.0);
const planet2 = createPlanet(0.6, 0x44ff44, 7, 0.6, 1.5);
const planet3 = createPlanet(0.5, 0xff8844, 10, 0.3, 1.0);

// Moon for planet 2
const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planet2.add(moon);
let moonAngle = 0;

// Clock
const clock = new THREE.Clock();

let firstFrame = true;

// Animation
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    
    // Update planet positions (orbit in XZ plane)
    for (const p of planets) {
        const angle = elapsed * p.speed;
        p.mesh.position.x = Math.cos(angle) * p.distance;
        p.mesh.position.z = Math.sin(angle) * p.distance;
        // Spin on own axis (Y axis)
        p.mesh.rotation.y += p.spinSpeed * delta;
    }
    
    // Moon orbit around planet 2 (in local space of planet2, so XZ relative to planet)
    moonAngle += 3.0 * delta;
    moon.position.x = Math.cos(moonAngle) * 1.2;
    moon.position.z = Math.sin(moonAngle) * 1.2;
    
    renderer.render(scene, camera);
    
    if (firstFrame) {
        firstFrame = false;
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

Wait, I need to think about the PointLight intensity more carefully. In Three.js r152+, `physicallyCorrectLights` was deprecated and replaced by `useLegacyLights`. In r155+, physically correct is the default. With `decay = 2`, the formula is `intensity / (distance^2)`. 

For a distance of 4: 500/16 = 31.25 - should be bright enough
For a distance of 10: 500/100 = 5 - still visible with ambient light

That seems reasonable. Let me also consider if I need to set `renderer.useLegacyLights = false` or if it's already the default. In recent versions it's default. I'll just use a reasonable intensity.

Actually, let me reconsider. If the user is on an older version where `physicallyCorrectLights` isn't default, the behavior might be different. But since I'm writing for modern Three.js, I'll assume the latest behavior. I'll set intensity to 500 which should work well.

Let me also make sure the code compiles with `tsc --strict`. I think it should be fine - no implicit any issues since everything is typed.

One more thing - I should make sure `clock.getDelta()` and `clock.getElapsedTime()` are called correctly. `getDelta()` returns time since last call, `getElapsedTime()` returns total elapsed time. Both should work fine together.

Let me finalize the code.
