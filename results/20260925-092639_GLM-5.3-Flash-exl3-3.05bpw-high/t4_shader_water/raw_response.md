```ts
import * as THREE from 'three';

const scene: THREE.Scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a12);

const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(6, 5, 8);
camera.lookAt(new THREE.Vector3(0, 0, 0));

const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const vertexShader = /* glsl */ `
  uniform float uTime;

  varying float vHeight;
  varying vec3 vWorldPos;

  void main() {
    // Geometry lies in the local XY plane before the mesh is rotated into XZ.
    // We displace along local Z (which becomes world up after the mesh rotation),
    // using the local XY coordinates as the wave domain.
    vec2 p = position.xy;

    // Layered wave pattern: two crossing wave trains plus a slow ripple.
    float w1 = sin(p.x * 1.4 + uTime * 1.1);
    float w2 = sin(p.y * 1.8 + uTime * 0.9);
    float w3 = sin((p.x + p.y) * 2.2 + uTime * 1.7) * 0.35;
    float w4 = sin(length(p) * 2.0 - uTime * 2.0) * 0.15;

    float elevation = w1 + w2 + w3 + w4;

    // Normalized height (-1..1 range roughly) for the fragment shader.
    vHeight = elevation / 2.5;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

    vec3 displaced = position;
    displaced.z += elevation * 0.25;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;
  varying vec3 vWorldPos;

  void main() {
    // Deep blue -> lighter blue -> white foam, driven by wave height.
    vec3 deepBlue = vec3(0.02, 0.12, 0.35);
    vec3 midBlue  = vec3(0.10, 0.35, 0.65);
    vec3 foam     = vec3(0.95, 0.98, 1.0);

    // Remap height into 0..1.
    float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.55, t));
    color = mix(color, foam, smoothstep(0.62, 0.95, t));

    // Subtle sparkle lines in the upper regions for a foam-crest feel.
    float crest = smoothstep(0.7, 0.9, t);
    float stripes = sin(vWorldPos.x * 12.0) * sin(vWorldPos.z * 12.0);
    color += crest * max(stripes, 0.0) * 0.08;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0.0 }
  }
});

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const plane = new THREE.Mesh(geometry, material);
// Rotate the XY plane into the XZ plane so local +Z becomes world +Y (up).
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

const clock = new THREE.Clock();

let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!ready && elapsed > 0) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```