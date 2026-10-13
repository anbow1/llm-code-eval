```ts
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Scene setup
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 6, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// Expose for testing
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    // Two overlapping sine waves moving in different directions
    float wave1 = sin(pos.x * 1.5 + uTime * 1.2) * 0.4;
    float wave2 = sin(pos.y * 2.0 - uTime * 1.8) * 0.25;
    // A diagonal ripple for extra detail
    float wave3 = sin((pos.x + pos.y) * 3.0 + uTime * 2.5) * 0.1;

    pos.z += wave1 + wave2 + wave3;
    vHeight = pos.z;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  uniform float uTime;

  void main() {
    // Map height range roughly [-0.75, 0.75] to [0, 1]
    float h = clamp(vHeight / 0.75 * 0.5 + 0.5, 0.0, 1.0);

    // Deep blue -> lighter blue -> white foam
    vec3 deepBlue = vec3(0.01, 0.12, 0.35);
    vec3 midBlue  = vec3(0.10, 0.45, 0.75);
    vec3 foam     = vec3(0.95, 0.98, 1.00);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.55, h));
    color = mix(color, foam, smoothstep(0.55, 1.0, h));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Ocean plane
// ---------------------------------------------------------------------------

// PlaneGeometry is created in the XY plane; rotate -90 deg on X to lie flat
// in the XZ plane (Y becomes "up").
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 }
  }
});

const ocean = new THREE.Mesh(geometry, material);
ocean.rotation.x = -Math.PI / 2;
scene.add(ocean);

// ---------------------------------------------------------------------------
// Resize handling
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});
```

**Notes on the implementation:**

- **Geometry orientation**: `PlaneGeometry` is built in the XY plane. In the vertex shader, `position.z` is the "height" before the mesh's `-PI/2` X-rotation is applied, so displacing along `z` displaces the world-space Y axis — exactly what we want for waves.
- **Waves**: three superimposed sine waves (`sin(x·f + t)`, `sin(y·f − t)`, plus a diagonal ripple) create a moving, non-repeating-looking pattern. `vHeight` carries the displaced height to the fragment shader.
- **Color ramp**: the fragment shader maps height through `smoothstep` mixes — deep blue → mid blue → white foam at crests.
- **Timing**: `THREE.Clock.getElapsedTime()` drives `uTime` every frame, so motion is time-based, not frame-based.
- **Testing hooks**: `__scene`, `__camera`, `__renderer` are exposed immediately; `__ready` flips to `true` after the first rendered frame.