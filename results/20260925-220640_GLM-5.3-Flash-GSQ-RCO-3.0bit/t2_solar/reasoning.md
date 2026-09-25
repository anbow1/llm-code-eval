Need physically based lighting: PointLight with intensity in candela... In three.js r155+, use physicallyCorrectLights by default; PointLight intensity in candela with decay 2. Need intensity high enough. distance ~10, so intensity maybe 300-1000. Use renderer.useLegacyLights false (default in modern three).

Write TypeScript file. Strict compile. Set animationLoop with time param (DOMHighResTimeStamp). Use delta.

Let's write:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
camera.position.set(14, 12, 14);
camera.lookAt(0,0,0);

renderer... setAnimationLoop((t) => compute dt)
```

Track previous time; use elapsed time for angular positions: planetAngle = speed * elapsed. Or accumulate delta.

Planets: radius 0.5, distances 4,7,10. Angular speeds decreasing. Spin speeds.

Moon child of planet 2: moon orbits planet. Add moon at distance e.g., 1 from planet center as child; animate moon position in local XZ plane each frame.

Ambient light intensity ~0.15 (or in physical units, ambient intensity small). PointLight(0xffffff, intensity, 0, decay=2). For physically-based: intensity is candela. At distance 10, illuminance = I/d^2 = I/100; want maybe 1.5 → I=150. Let's use ~400 for decent brightness. Actually with decay 2, at distance 4: 400/16=25 lux — very bright, would need exposure tone mapping. Use renderer.toneMapping = ACESFilmicToneMapping and exposure ~1. Or just set intensity like 50: at d=4 → 3.125; d=7 → 1; d=10 → 0.5. Good. Ambient 0.4? AmbientLight intensity is in... with physically-based, ambient light intensity still similar scale. Use 0.3.

Note: three r155 default useLegacyLights=false. Keep it simple; no legacy flag.

Also sun sphere with MeshBasicMaterial color 0xffdd66. Maybe emissive glow: MeshBasicMaterial is fine.

Set __ready after first frame.

Write code with types, handle strict: e.g., time param type number. AnimationLoopCallback: (time: number) => void.

Moon angle also uses elapsed.

Camera above and side: (16, 10, 16) looking at origin; fov 50 ensures visibility to radius 10+ planet sizes.

Resize handler.

Code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(15, 10, 15);
camera.lookAt(0, 0, 0);

// lights
const sunLight = new THREE.PointLight(0xffffff, 50, 0, 2);
scene.add(sunLight);
const ambient = new THREE.AmbientLight(0x404040, 0.3);
scene.add(ambient);

// sun
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffcc44 })
);
scene.add(sun);

// planets
interface PlanetState { mesh, orbitSpeed, orbitRadius, spinSpeed, angle }
```

Implement with arrays.

Planet radius 0.5, second maybe 0.55? Keep 0.5 each.

Moon: radius 0.15, child of planet2, position updated: moon.position.set(Math.cos(moonAngle)*moonDist, 0, Math.sin(moonAngle)*moonDist).

Angles: orbit angle = orbitSpeed * elapsed. elapsed = time * 0.001.

Add starfield? Not required. Keep minimal but nice: maybe dark background.

Let me compute angular speeds: speeds 0.8, 0.5, 0.3 rad/s? That's fast-ish for visual; fine. Spin speeds: 2, 1.5, 1 rad/s. Moon speed 2.4.

First frame ready: set in loop after first render: let ready = false; in callback, after render, if(!ready){ __ready = true; ready = true; }.

Expose scene etc.

Full code strict-safe. window as any casts.

Edge: THREE.SphereGeometry args fine.

Write final.