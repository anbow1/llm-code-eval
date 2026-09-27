The user wants a mini solar system in a single TypeScript file. Let me plan this out:

1. Import THREE from 'three'
2. Create scene, camera, renderer
3. Sun: sphere at origin with MeshBasicMaterial (emissive-looking) + PointLight at origin
4. 3 planets with MeshStandardMaterial at distances ~4, 7, 10
5. Different angular speeds (inner faster)
6. Planets spin on their own axis
7. Planet 2 has a moon (child of planet mesh) orbiting the planet
8. Weak AmbientLight
9. Camera above and to the side, looking at origin
10. Handle resize
11. Use setAnimationLoop with delta time
12. Expose __scene, __camera, __renderer
13. Set __ready after first frame

Let me think about the light. In Three.js, with physically correct lighting (which is default in newer versions), a PointLight's intensity is in candela units. I need to make sure the light actually illuminates the planets. Let me use a reasonable intensity value. With `renderer.useLegacyLights = false` (which is default in modern Three.js), the PointLight intensity is in candela. For objects at distance 4-10, I need enough intensity. Let me use something like 200 or so. Actually, let me think... at distance 4, the illuminance would be intensity/16. At distance 10, it'd be intensity/100. So if I want decent lighting, I need intensity around 200-500. Let me go with 300.

Actually, in Three.js r155+, `useLegacyLights` defaults to false, and PointLight intensity is in candela. The physical formula is E = I / d². So at distance 4, E = 300/16 ≈ 18.75 lux. At distance 10, E = 300/100 = 3 lux. That should be visible.

Wait, let me reconsider. In Three.js, the default for `useLegacyLights` was changed. In recent versions (r155+), physically correct lighting is the default. The PointLight with `decay = 2` (default) and `intensity` in candela. Let me use intensity of 500 to be safe.

For the sun material, I'll use MeshBasicMaterial with a warm yellow/orange color. Since MeshBasicMaterial doesn't respond to lights, it will always be bright - perfect for a sun.

Planet sizes: Let's say radius 0.5, 0.7, 0.6 for planets 1, 2, 3.
Moon: radius 0.15, orbiting at distance ~1.5 from planet 2.

Angular speeds: inner faster. Let's say:
- Planet 1 (dist 4): speed 1.0 rad/s
- Planet 2 (dist 7): speed 0.5 rad/s
- Planet 3 (dist 10): speed 0.3 rad/s

Spin speeds: different for each, e.g., 2.0, 1.5, 1.0 rad/s

Moon orbit speed around planet 2: 3.0 rad/s

For the moon orbiting planet 2: I add the moon as a child of planet 2's mesh. But wait - if the moon is a child of the planet mesh, and the planet mesh is at the planet's position, then the moon's local position would be relative to the planet. But if the planet spins (rotation.y), the moon would spin with it. That's not what we want.

Actually, let me re-read the requirement: "Planet 2 has a moon: a small sphere added as a child of the planet mesh (planet.add(moon)), orbiting that planet."

So the moon is a child of the planet mesh. But if the planet rotates (spins), the moon would be affected. Hmm, the requirement says to do `planet.add(moon)`. Let me think about this differently.

Actually, if I rotate the planet's position around the sun (the orbital motion), and then rotate the planet mesh itself (spin), the moon as a child would be affected by both. 

One approach: 
- Planet 2's mesh position is set each frame to (7*cos(angle2), 0, 7*sin(angle2))
- Planet 2's mesh rotation.y is set for spin
- Moon is child of planet 2 mesh
- Moon's local position is (1.5*cos(moonAngle), 0, 1.5*sin(moonAngle))

But the spin of planet 2 would rotate the moon's local frame. That means the moon would appear to orbit faster/slower depending on the spin.

Actually wait - the requirement says "orbiting that planet." If the moon is a child and we set its local position in the XZ plane, the planet's spin (rotation.y) will rotate the moon's local frame. So the moon's apparent orbital speed would be moonSpeed + planetSpinSpeed. That's actually physically wrong but the requirement says to do it this way.

Alternatively, I could counter-rotate the moon to compensate, but the requirement just says to add it as a child and orbit it. Let me just set the moon's local position and let it be affected by the planet's rotation. The visual effect will still look like the moon orbits the planet.

Actually, let me reconsider. The requirement says "orbiting that planet" - the visual result should show the moon going around planet 2. If the planet spins at, say, 1.5 rad/s, and I set the moon's local position with a rotation, the moon will appear to orbit at (moonLocalSpeed + planetSpinSpeed) in world space. That's fine - it still looks like it's orbiting.

Let me just make sure the moon's local position updates each frame:
moon.position.set(1.5 * cos(moonAngle * delta), 0, 1.5 * sin(moonAngle * delta))

Wait, I should accumulate the angle. Let me use elapsed time for all motions.

Let me structure the code:

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
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// PointLight at origin
const pointLight = new THREE.PointLight(0xffffff, 500, 0, 2);
scene.add(pointLight);

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

// Planets
const planetData = [
    { radius: 0.5, distance: 4, orbitSpeed: 1.0, spinSpeed: 2.0, color: 0x4488ff },
    { radius: 0.7, distance: 7, orbitSpeed: 0.5, spinSpeed: 1.5, color: 0xff6633 },
    { radius: 0.6, distance: 10, orbitSpeed: 0.3, spinSpeed: 1.0, color: 0x88cc44 },
];

const planets = planetData.map(data => {
    const geo = new THREE.SphereGeometry(data.radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.7, metalness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return { mesh, ...data };
});

// Moon for planet 2
const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
const moonMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.1 });
const moon = new THREE.Mesh(moonGeo, moonMat);
planets[1].mesh.add(moon);

// Animation
const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;
    
    // Orbit planets
    planets.forEach((p, i) => {
        const angle = p.orbitSpeed * elapsed;
        p.mesh.position.set(
            p.distance * Math.cos(angle),
            0,
            p.distance * Math.sin(angle)
        );
        p.mesh.rotation.y = p.spinSpeed * elapsed;
    });
    
    // Moon orbit
    const moonAngle = 3.0 * elapsed;
    moon.position.set(
        1.5 * Math.cos(moonAngle),
        0,
        1.5 * Math.sin(moonAngle)
    );
    
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

Let me check for TypeScript strict mode issues:
- All variables are typed implicitly or explicitly
- No unused variables
- The `planetData` array needs proper typing

Let me also think about the PointLight. In Three.js r155+, `useLegacyLights` is false by default. The PointLight constructor is `PointLight(color, intensity, distance, decay)`. With physically correct lights, intensity is in candela. At distance 4, illuminance = 500/16 = 31.25. At distance 10, illuminance = 500/100 = 5. That should be visible with MeshStandardMaterial.

Actually, I want to double-check: does `useLegacyLights` default to false in recent Three.js? Yes, since r155. So I'll assume physically correct lighting. Intensity 500 should work.

Wait, let me reconsider the camera position. The system extends to distance 10 in XZ. With camera at (15, 12, 15), looking at origin, the FOV is 60 degrees. The farthest planet is at distance 10 from origin. The camera is at distance sqrt(15²+12²+15²) = sqrt(225+144+225) = sqrt(594) ≈ 24.4 from origin. The farthest planet would be at most 10 + 24.4 ≈ 34.4 from camera. With FOV 60, the visible height at distance 34.4 is 2*34.4*tan(30°) ≈ 39.7. The system diameter is about 20 (from -10 to 10), so it should fit. Good.

Let me also make sure the moon's orbit is in the XZ plane relative to the planet. Since the moon is a child of the planet mesh, and the planet mesh's Y rotation is the spin, the moon's local XZ plane rotates with the planet. That's fine - it still looks like the moon orbits the planet.

One more thing: the requirement says "Y is up; all orbits are in the XZ plane around the origin." So planets orbit in XZ plane (y=0), which is what I have.

Let me finalize the code and make sure it compiles with tsc --strict. I need to be careful about types.

Actually, for the planets array, I should type it properly:

```typescript
interface PlanetData {
    radius: number;
    distance: number;
    orbitSpeed: number;
    spinSpeed: number;
    color: number;
}
```

And the planets array:
```typescript
interface Planet {
    mesh: THREE.Mesh;
    radius: number;
    distance: number;
    orbitSpeed: number;
    spinSpeed: number;
}
```

Let me write the final clean version.
