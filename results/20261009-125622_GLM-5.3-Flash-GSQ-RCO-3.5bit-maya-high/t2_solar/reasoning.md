Let me write a single TypeScript file. Requirements:

- import THREE, create renderer, append canvas, resize handler.
- Sun sphere MeshBasicMaterial at origin, PointLight at origin with proper intensity/decay (default decay=2, use intensity like 100-300 since physically based; with renderer.useLegacyLights false default in newer three, PointLight intensity in candela; distance 4-10 so intensity ~200 works).
- 3 planets at radii 4,7,10, orbiting with different angular speeds (inner faster), spin on own axis.
- Planet 2 moon child, orbiting planet.
- AmbientLight weak.
- Camera above/side looking at origin.
- Expose window.__scene etc, __ready after first frame.
- setAnimationLoop, delta time.

Note: planets orbit — use pivot approach or compute position directly. Keep planet spin separate: use pivot objects for orbit, planet mesh as child positioned at radius, so spinning mesh doesn't affect orbit. Moon orbits planet: add moon to planet mesh, but if planet mesh spins, moon would inherit spin. Better: add a moon pivot child of planet mesh? If planet mesh spins on Y axis, moon as child would orbit due to spin — but spin speed then equals moon orbital speed; that's acceptable? The spec says moon orbiting planet, added as child of planet mesh. Simplest compliant: moon child of planet, positioned at offset, and animate moon angle around planet by setting moon.position each frame (moon.position.set(cos*d, 0, sin*d)). Child of planet mesh; planet mesh spin is rotation.y about its own center, moon position rotates with parent... if parent rotates, moon local position is in rotating frame, so moon's world motion = planet spin + local angle. To keep it clean, tilt-free: set moon position each frame in local space accounting... Actually simplest: parent moon to planet mesh, and each frame set moon.rotation.y += moonSpeed*dt won't orbit unless offset. Set moon.position from angle each frame; the parent's spin adds to it, making moon orbit slightly different but still orbiting. That's fine and satisfies "orbiting that planet". Alternatively counteract: moonAngle = globalAngle - planetSpin accumulated. To keep it simple and visually correct, I can add the moon as child of planet mesh and update moon.position using an angle; since parent rotates, the moon will still orbit at (spinSpeed + moonSpeed). Fine.

Actually cleaner: create planet mesh that spins, and a moonOrbit Group as child of planet mesh... group also spins with parent. Hmm. Alternative: planet pivot (orbit), child planetSpin group at radius which spins the planet mesh, moon pivot child of planetSpin? Still inherits spin. Could just counter-rotate: moonPivot.rotation.y = -planetSpin.rotation.y + moonAngle. Simpler to just set moon.position each frame with angle minus accumulated spin? Overkill. I'll just do moon.position.set from angle each frame — orbits fine.

Compile-safe TypeScript with tsc --strict. No DOM elements other than canvas append.

Code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.1, 200);
camera.position.set(12, 10, 14);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// lights
const sunLight = new THREE.PointLight(0xffffff, 300, 0, 2);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

// sun
const sun = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffdd66 }));
scene.add(sun);

// planets data
interface Planet { pivot: THREE.Object3D; mesh: THREE.Mesh; orbitSpeed: number; spinSpeed: number; }
planets creation with pivot rotation.y for orbit, mesh positioned at radius.

Actually orbit by pivot rotation: pivot = new Object3D; scene.add(pivot); mesh position x = radius; pivot.rotation.y += speed*dt. Spin: mesh.rotation.y += spinSpeed*dt.

Planet 2 moon: moon = Mesh sphere radius 0.25, mesh.add(moon); moonAngle += moonSpeed*dt; moon.position.set(Math.cos(a)*1.2, 0, Math.sin(a)*1.2).

Note moon inherits planet spin rotation — moon world orbit = spin + local angle. To make moon orbit independent, could place moon in a group child of pivot instead... but spec says planet.add(moon). Keep as is; adjust moon angular speed to include compensation? I'll just set moon position each frame — still orbits. Fine.

Star background optional — "no external assets"; could add small points as stars, allowed (geometry). Keep simple, maybe add stars via Points with random positions — no assets needed. Optional; I'll add subtle stars for polish. But Y up, orbits XZ — fine.

Resize: window.addEventListener('resize', ...) update camera.aspect, projection matrix, renderer size.

Animation loop: renderer.setAnimationLoop((time) => ...) — use clock delta. Use THREE.Clock: const dt = clock.getDelta().

Ready flag: let firstFrame = true; in loop after render, if firstFrame { (window as any).__ready = true; firstFrame = false; }

Expose __scene, __camera, __renderer.

PointLight intensity: with decay 2 and distances 4-10, intensity = candela; illuminance at 4 = I/16. For good lighting, I ~ 250. Use 300. Also renderer.outputColorSpace default SRGB; tone mapping maybe ACES. Keep default; set renderer.toneMapping = THREE.ACESFilmicToneMapping perhaps. Fine.

Camera fit: max radius 10, camera at (0? ) "above and to the side" e.g. (10, 8, 14) looking at origin, fov 50 — distance ~19, covers radius 10 easily.

Write code carefully typed. window resize: also camera.

Moon also needs to not be lit weird — MeshStandardMaterial fine.

Let me finalize.