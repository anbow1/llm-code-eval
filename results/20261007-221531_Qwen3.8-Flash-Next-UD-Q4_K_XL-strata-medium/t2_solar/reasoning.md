The user wants a mini solar system in TypeScript using Three.js. Let me plan this carefully:

1. Import Three.js
2. Create scene, camera, renderer
3. Sun: MeshBasicMaterial sphere at origin + PointLight at origin
4. 3 planets with MeshStandardMaterial at distances 4, 7, 10
5. Different angular speeds (inner faster)
6. Each planet spins on its own axis
7. Planet 2 has a moon as a child
8. Weak AmbientLight
9. Camera above and to the side, looking at origin
10. Handle resize
11. Use setAnimationLoop with delta time
12. Expose __scene, __camera, __renderer, __ready

Key considerations:
- Physically based light: In newer Three.js, PointLight uses physical units. I need to set `renderer.physicallyCorrectLights = true` or use `renderer.useLegacyLights = false` (deprecated in newer versions). Actually, in Three.js r155+, `useLegacyLights` is removed and physically correct lights is the default. I'll set the intensity high enough. Let me use a reasonable intensity like 200-500 for a PointLight with default decay of 2.
- Orbits in XZ plane (Y is up)
- Angular speeds: inner faster. Let's say speeds 1.0, 0.5, 0.3 rad/s
- Planet spins: rotate around Y axis at different speeds
- Moon orbiting planet 2 as child
- Camera at something like (15, 10, 15) looking at origin

Let me write the code:

```typescript
import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 10, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeo = new THREE.SphereGeometry(1.2, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Planets
const planetData = [
    { distance: 4, radius: 0.4, speed: 1.0, spinSpeed: 2.0, color: 0x4488ff },
    { distance: 7, radius: 0.6, speed: 0.5, spinSpeed: 1.5, color: 0xff6633 },
    { distance: 10, radius: 0.5, speed: 0.3, spinSpeed: 1.0, color: 0x33cc66 },
];

const planets: THREE.Mesh[] = [];

for (let i = 0; i < planetData.length; i++) {
    const d = planetData[i];
    const geo = new THREE.SphereGeometry(d.radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: d.color, roughness: 0.7 });
    const planet = new THREE.Mesh(geo, mat);
    scene.add(planet);
    planets.push(planet);
}

// Moon for planet 2 (index 1)
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
const moon = new THREE.Mesh(moonGeo, moonMat);
// Position moon at offset from planet center
moon.position.set(1.2, 0, 0);
planets[1].add(moon);

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation
const clock = new THREE.Clock();
let elapsed = 0;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    elapsed += delta;

    // Orbit planets
    for (let i = 0; i < planets.length; i++) {
        const d = planetData[i];
        const angle = elapsed * d.speed;
        planets[i].position.x = d.distance * Math.cos(angle);
        planets[i].position.z = d.distance * Math.sin(angle);
        // Spin on own axis
        planets[i].rotation.y = elapsed * d.spinSpeed;
    }

    renderer.render(scene, camera);

    if (!(window as any).__ready) {
        (window as any).__ready = true;
    }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I need to be careful about the moon orbiting the planet. Since the moon is a child of the planet mesh, if the planet rotates (rotation.y changes), the moon will orbit with it. But actually, if the moon is at position (1.2, 0, 0) and the planet rotates around Y, the moon will orbit in the XZ plane relative to the planet. That works! The moon will orbit the planet because the parent's rotation carries it around.

But wait - the planet's own spin rotation.y is being set. That means the moon will orbit the planet at the same rate as the planet's spin. Let me think... if I want the moon to orbit at a different rate, I should use a pivot group. But the requirement says "a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." So using the planet's own rotation to orbit the moon is acceptable, but the moon's orbital speed equals the planet's spin speed. 

Actually, re-reading: "Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet." The simplest approach is to put the moon as a child and let the planet's rotation naturally orbit it. But if I want independent moon orbit speed, I could use a pivot. However, the requirement explicitly says planet.add(moon), so let me keep it as a child. The planet's rotation.y will naturally orbit the moon around the planet.

Actually, let me use a pivot group as child of the planet for independent moon orbit speed. No wait - the requirement says "planet.add(moon)". Let me just add the moon directly. The planet's rotation will orbit the moon. That's fine and satisfies the requirement.

Let me also make sure I'm not setting the moon's position in a way that it would be inside the planet. Planet 2 has radius 0.6, moon at position (1.2, 0, 0) should be fine.

Let me also think about the PointLight intensity. With physically correct lights (default in modern Three.js), PointLight intensity is in candelas. A value of 300 should illuminate planets at distances 4-10 reasonably well. The formula is roughly intensity / (4π * distance²) for irradiance. At distance 4: 300/(4π*16) ≈ 1.49. At distance 10: 300/(4π*100) ≈ 0.24. That should work with MeshStandardMaterial. Let me bump it up a bit to maybe 500 to ensure outer planets are visible.

Actually, let me check - in Three.js r152+, the default for PointLight is physically correct. intensity of 100-500 should work for our distances. Let me use 400.

One more thing - I should make sure the code compiles with `tsc --strict`. Let me make sure all types are correct, no unused variables, etc.

Let me finalize the code.
