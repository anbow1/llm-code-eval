The user wants a complete TypeScript file for a mini solar system using Three.js. Let me plan this out:

1. Set up renderer, scene, camera
2. Sun: sphere at origin with MeshBasicMaterial (emissive-looking) + PointLight at origin
3. 3 planets: spheres with MeshStandardMaterial at distances ~4, 7, 10
4. Each planet orbits at different angular speeds (inner faster)
5. Planets spin on their own axis
6. Planet 2 (distance 7) has a moon as a child mesh
7. Weak AmbientLight
8. Camera positioned above and to the side
9. Handle resize, use setAnimationLoop, delta time
10. Expose __scene, __camera, __renderer, __ready

For physically based light intensity/decay with MeshStandardMaterial:
- PointLight with intensity needs to account for the decay. With physicallyCorrectLights (or renderer.useLegacyLights = false which is default in newer Three.js), intensity is in candela and falloff follows inverse square law.
- I'll set decay to 2 (physically correct) and a reasonable intensity value. Since distances are 4-10, I need enough intensity. Let me use something like 300 or so for intensity.
- Actually in newer Three.js (r152+), `renderer.useLegacyLights` is deprecated and physically correct lights are the default. So PointLight intensity is in candela. For distances of 4-10, an intensity of around 200-500 should work well.

Let me structure the code:

```ts
import * as THREE from 'three';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 10, 15);
camera.lookAt(0, 0, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 300, 0, 2); // decay=2
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

// Sun
const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Planets
// Planet 1: distance 4, size 0.4
// Planet 2: distance 7, size 0.6, has moon
// Planet 3: distance 10, size 0.5

// Orbit speeds: inner faster
// speed1 > speed2 > speed3

// I'll use pivot objects or just compute positions in the loop.

// For the moon as child of planet 2, I need to be careful: if the planet mesh rotates (spins), the moon will also rotate with it. To avoid this, I can either:
// - Add the moon to a non-rotating child group of the planet
// - Or use a different approach

Actually, the spec says "a small sphere added as a child of the planet mesh (planet.add(moon))". So I should literally do planet.add(moon). The moon will orbit the planet, but since the planet spins, the moon's orbital plane will also spin with the planet. That's fine - the moon will still orbit around the planet (just the reference frame rotates with the planet's spin).

Wait, actually if I add the moon as a child of the planet, and the planet spins around its Y axis, the moon will appear to orbit in a rotating frame. The moon's local position rotates, so in world space it'll still appear to orbit. Let me think...

If moon is child of planet, and moon's local position is (r, 0, 0) rotating around Y, then in world space the moon's position = planet.position + rotateY(spinAngle) * moonLocalPosition. Since both the planet's spin and the moon's orbital angle are around Y, the net angular velocity of the moon in world space is (planet_spin_speed + moon_orbit_speed). That should still look like an orbit. It's fine.

Let me write the code now.

For delta time, I'll use a Clock or compute delta from performance.now(). I'll use THREE.Clock.

Let me make sure it compiles with tsc --strict. I need to be careful with types.

Let me write it out:
