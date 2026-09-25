The user wants a mini solar system built with Three.js in a single TypeScript file. Let me plan this out:

1. Sun at origin with MeshBasicMaterial (self-illuminated) and a PointLight
2. 3 planets with MeshStandardMaterial at distances 4, 7, 10
3. Different angular speeds (inner faster)
4. Each planet spins on its own axis
5. Planet 2 has a moon as a child
6. Weak AmbientLight
7. Camera positioned to see the whole system

Key considerations:
- Y is up, orbits in XZ plane
- PointLight with physically correct settings (decay, intensity)
- For physical light: PointLight intensity is in candela when using physically correct lights. But by default in newer Three.js, intensity is in candela with decay=2. I need to make sure the planets are actually lit. With distances of 4, 7, 10, I need sufficient intensity.
- renderer.useLegacyLights is deprecated in newer versions. In modern Three.js (r155+), lights use physical units by default. PointLight intensity is in candela, and the light contribution is intensity / distance^2. So for a planet at distance 10, I need intensity around 1000 or more to get decent illumination. Let me use a high intensity value like 5000 or so.
- Actually, let me think about this more carefully. With MeshStandardMaterial and physically correct lights:
  - The illuminance from a PointLight at distance d is: intensity / d^2 (with decay=2)
  - For distance 4: intensity/16
  - For distance 7: intensity/49
  - For distance 10: intensity/100
  - To get reasonable brightness at distance 10, I need intensity around 100-200 at minimum, but higher values give better results with the Standard material's roughness/metalness.
  - Let me use intensity around 2000-3000 to ensure all planets are well lit.

- For delta time: use renderer.setAnimationLoop and compute delta from clock.getDelta()

Let me structure the code:

```ts
import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(...);
const renderer = new THREE.WebGLRenderer(...);

// Sun
// Planets (3)
// Moon (child of planet 2)
// Lights
// Animation loop
```

Let me write the complete file now. I'll make sure it compiles with strict mode.

For the PointLight with physical units: In Three.js r152+, `renderer.useLegacyLights = false` is the default (and the property is deprecated/removed in r165+). So by default, PointLight intensity is in candela. I'll set a high enough value.

Let me use:
- PointLight intensity: 3000, decay: 2, distance: 0 (infinite)
- AmbientLight intensity: 0.15 or so

For the camera: position it at something like (15, 12, 15) looking at origin.

Angular speeds: inner faster. Maybe 1.0, 0.6, 0.35 rad/s.

Planet spin: different speeds for each.

Moon orbit: child of planet 2, orbiting at some speed.

Let me write this out carefully.
