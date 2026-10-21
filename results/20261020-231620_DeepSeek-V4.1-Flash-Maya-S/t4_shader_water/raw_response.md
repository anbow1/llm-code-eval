```ts
import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * Renderer / Scene / Camera
 * ------------------------------------------------------------------ */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04070e);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(8.5, 7, 10);
camera.lookAt(0, 0, 0);

/* ------------------------------------------------------------------ *
 * Shaders
 * ------------------------------------------------------------------ */

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  // Sum of travelling sine waves in the plane's local XY space.
  float waveHeight(vec2 p, float t) {
    float h = 0.0;
    h += sin(p.x * 1.60 + t * 1.50) * 0.34;
    h += cos(p.y * 1.90 - t * 1.15) * 0.26;
    h += sin((p.x + p.y) * 2.70 + t * 2.20) * 0.12;
    h += sin(length(p) * 3.20 - t * 1.80) * 0.09;
    return h;
  }

  void main() {
    vec3 pos = position;          // plane lies in local XY, +Z is "up" after mesh rotation
    float h = waveHeight(pos.xy, uTime);

    pos.z += h;                   // displace along local normal
    vHeight = h;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // Normalise the height range of the wave stack (~[-0.85, 0.85]).
    float t = clamp((vHeight + 0.85) / 1.70, 0.0, 1.0);

    vec3 deepBlue  = vec3(0.015, 0.085, 0.320);
    vec3 midBlue   = vec3(0.050, 0.420, 0.760);
    vec3 crestCyan = vec3(0.520, 0.860, 0.980);
    vec3 foamWhite = vec3(1.000, 1.000, 1.000);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.00, 0.55, t));
    color = mix(color, crestCyan, smoothstep(0.55, 0.85, t));
    color = mix(color, foamWhite, smoothstep(0.85, 1.00, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

/* ------------------------------------------------------------------ *
 * Wave mesh
 * ------------------------------------------------------------------ */

const uniforms = {
  uTime: { value: 0 },
};

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide,
});

const waveMesh = new THREE.Mesh(geometry, material);
waveMesh.rotation.x = -Math.PI / 2; // lay flat in the XZ plane, normal facing +Y
scene.add(waveMesh);

/* ------------------------------------------------------------------ *
 * Resize
 * ------------------------------------------------------------------ */

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------------------------------------------ *
 * Render loop
 * ------------------------------------------------------------------ */

const clock = new THREE.Clock();
let firstFrameDone = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();

  uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameDone) {
    firstFrameDone = true;
    (window as any).__ready = true;
  }
});

/* ------------------------------------------------------------------ *
 * Testing hooks
 * ------------------------------------------------------------------ */

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```