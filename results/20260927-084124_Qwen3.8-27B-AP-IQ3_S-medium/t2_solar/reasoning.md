The user wants a mini solar system in TypeScript with Three.js. Let me plan this out:

1. Sun: sphere at origin with MeshBasicMaterial + PointLight at origin
2. 3 planets at distances ~4, 7, 10 in XZ plane
3. Planets orbit at different angular speeds (inner faster)
4. Planets spin on their own axis
5. Planet 2 has a moon (child of planet mesh)
6. Weak AmbientLight
7. Camera above and to the side, looking at origin
8. Proper PBR light intensity/decay for PointLight

Let me write this carefully:

- PointLight with physically based rendering: In newer Three.js versions, `useLegacyLights` is deprecated and physically based lighting is default. PointLight intensity is in candela, and decay should be 2 for physically correct falloff. I'll use `decay = 2` and a reasonable intensity.

- For the orbit system: I'll use pivot groups (Object3D) for each planet orbit. Actually, I'll just compute positions manually using sin/cos with elapsed time.

- Planet rotation (spinning on own axis): I'll rotate each planet mesh around its Y axis.

- Moon: added as child of planet 2 mesh, orbiting in XZ plane relative to planet.

Let me think about the structure:

```
Scene
├── Sun (mesh at origin)
├── PointLight (at origin)
├── AmbientLight
├── Planet 1 (mesh, positioned each frame)
├── Planet 2 (mesh, positioned each frame)
│   └── Moon (child of planet 2)
├── Planet 3 (mesh, positioned each frame)
```

Wait, the moon should orbit the planet. If the moon is a child of planet 2, and planet 2 is positioned in the scene, then the moon's local position will be relative to planet 2. I'll rotate the moon around the planet in local space.

For orbit positions:
- Planet 1: distance 4, angular speed e.g. 0.5 rad/s
- Planet 2: distance 7, angular speed e.g. 0.3 rad/s
- Planet 3: distance 10, angular speed e.g. 0.15 rad/s

For PBR PointLight:
- intensity: In physically based mode, intensity is in candela. For a scene this scale, something like 50-200 should work. Let me use something reasonable. Actually, with the default renderer settings (which now use physically correct lights by default in r155+), I need to make sure the intensity is high enough. Let me use intensity around 100-200 with decay 2.

Actually, let me check: In Three.js r155+, `renderer.useLegacyLights` defaults to false, meaning physically correct lighting. PointLight intensity is in candela. For a scene of this size (planets at distance 4-10), I need intensity that gives reasonable brightness at those distances. With decay=2, the falloff is 1/distance². So at distance 7, the effective intensity would be intensity/49. I want that to be reasonable (maybe 1-3 for a nice look). So intensity should be around 50-150.

Let me use intensity = 200 with decay = 2. At distance 4: 200/16 = 12.5, at distance 7: 200/49 ≈ 4, at distance 10: 200/100 = 2. That seems reasonable.

For the camera: position it above and to the side, like (15, 12, 15) looking at origin. The farthest planet is at distance 10, so I need the camera far enough back.

Let me also add some orbit visual lines (optional - the user didn't ask for them, so I'll skip).

Let me write the code now:

```typescript
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(15, 12, 15);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 200, 0, 2);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planets
// Planet 1: distance 4, faster
const planet1Geometry = new THREE.SphereGeometry(0.3, 32, 32);
const planet1Material = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.7, metalness: 0.3 });
const planet1 = new THREE.Mesh(planet1Geometry, planet1Material);
scene.add(planet1);

// Planet 2: distance 7, medium, has moon
const planet2Geometry = new THREE.SphereGeometry(0.5, 32, 32);
const planet2Material = new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.8, metalness: 0.2 });
const planet2 = new THREE.Mesh(planet2Geometry, planet2Material);
scene.add(planet2);

// Moon (child of planet 2)
const moonGeometry = new THREE.SphereGeometry(0.12, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9, metalness: 0.1 });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
planet2.add(moon);

// Planet 3: distance 10, slower
const planet3Geometry = new THREE.SphereGeometry(0.4, 32, 32);
const planet3Material = new THREE.MeshStandardMaterial({ color: 0x44cc44, roughness: 0.7, metalness: 0.3 });
const planet3 = new THREE.Mesh(planet3Geometry, planet3Material);
scene.add(planet3);

// Orbital parameters
const orbit1 = { radius: 4, speed: 0.5, spin: 1.0 };
const orbit2 = { radius: 7, speed: 0.25, spin: 0.8 };
const orbit3 = { radius: 10, speed: 0.12, spin: 0.6 };
const moonOrbit = { radius: 1.0, speed: 1.5 };

// Animation
let ready = false;
const clock = new THREE.Clock();

function animate() {
    const elapsed = clock.getElapsedTime();
    const delta = clock.getDelta(); // Can't use both getElapsedTime and getDelta reliably... 
    // Actually, getElapsedTime() returns time since clock started, and getDelta() returns time since last call.
    // I should use elapsed for orbit positions and delta for... actually the user says "Motion must use delta/elapsed time"
    // I'll use elapsed for the orbital angles and spin angles.
    
    // Planet 1 orbit
    const angle1 = orbit1.speed * elapsed;
    planet1.position.set(
        orbit1.radius * Math.cos(angle1),
        0,
        orbit1.radius * Math.sin(angle1)
    );
    planet1.rotation.y = orbit1.spin * elapsed;
    
    // Planet 2 orbit
    const angle2 = orbit2.speed * elapsed;
    planet2.position.set(
        orbit2.radius * Math.cos(angle2),
        0,
        orbit2.radius * Math.sin(angle2)
    );
    planet2.rotation.y = orbit2.spin * elapsed;
    
    // Moon orbit (relative to planet 2)
    const moonAngle = moonOrbit.speed * elapsed;
    moon.position.set(
        moonOrbit.radius * Math.cos(moonAngle),
        0,
        moonOrbit.radius * Math.sin(moonAngle)
    );
    
    // Planet 3 orbit
    const angle3 = orbit3.speed * elapsed;
    planet3.position.set(
        orbit3.radius * Math.cos(angle3),
        0,
        orbit3.radius * Math.sin(angle3)
    );
    planet3.rotation.y = orbit3.spin * elapsed;
    
    // Sun rotation
    sun.rotation.y = 0.1 * elapsed;
    
    renderer.render(scene, camera);
    
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
}

renderer.setAnimationLoop(animate);

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

Wait, I need to be careful with `clock.getElapsedTime()` - it returns time since the clock started. But if I also call `getDelta()`, it might interfere. Actually, looking at Three.js source, `getElapsedTime()` calls `getDelta()` internally in older versions, but in newer versions they're independent. Let me just use `getElapsedTime()` since I don't actually need delta separately - I'm using elapsed time for all computations.

Actually wait - the user says "Motion must use delta/elapsed time, not frame counts." Using elapsed time is fine.

Let me also make sure the PointLight has proper settings. In Three.js r155+, the default is physically correct lights. The PointLight constructor is `PointLight(color, intensity, distance, decay)`. I'll set decay to 2 (physically correct) and a good intensity.

Let me also add some visual interest - maybe slight orbital inclinations? No, the user says "all orbits are in the XZ plane around the origin" so they should be flat.

Let me also think about the moon orbit radius. If planet 2 has radius 0.5, the moon at distance 1.0 from center seems fine.

I think this is good. Let me also make sure I handle the strict TypeScript - no implicit any, all types specified.

One concern: `clock.getElapsedTime()` - does this work correctly with `setAnimationLoop`? Yes, it does. The clock starts when first `getDelta()` or `getElapsedTime()` is called.

Let me finalize the code.
