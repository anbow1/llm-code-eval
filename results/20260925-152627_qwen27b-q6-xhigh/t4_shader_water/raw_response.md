```ts
import * as THREE from 'three';

// ---------- Shaders ----------

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Sum of several travelling waves for a natural sea-like motion.
    float h = 0.0;
    h += sin(modelPosition.x * 1.5 + uTime * 1.8) * 0.32;
    h += cos(modelPosition.z * 1.2 + uTime * 1.4) * 0.28;
    h += sin((modelPosition.x + modelPosition.z) * 0.9 + uTime * 2.2) * 0.22;
    h += sin(modelPosition.x * 2.3 - modelPosition.z * 1.7 + uTime * 2.8) * 0.12;

    modelPosition.y += h;
    vHeight = h;

    gl_Position = projectionMatrix * viewMatrix * modelPosition;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    // vHeight ranges roughly [-1.0, 1.0] -> normalize to [0, 1]
    float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);

    vec3 deepBlue  = vec3(0.01, 0.08, 0.22);
    vec3 midBlue   = vec3(0.04, 0.32, 0.58);
    vec3 foamWhite = vec3(0.96, 0.98, 1.00);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.05, 0.55, t));
    color = mix(color, foamWhite, smoothstep(0.72, 0.98, t));

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------- Renderer ----------

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(renderer.domElement);

// ---------- Scene & Camera ----------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070d1a);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
// Angled view so the wave crests and foam read clearly.
camera.position.set(0, 6.5, 10.5);
camera.lookAt(0, 0, 0);

// ---------- Wavy plane ----------

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2); // lay flat in the XZ plane

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
  },
  side: THREE.DoubleSide,
});

const waves = new THREE.Mesh(geometry, material);
waves.name = 'waves';
scene.add(waves);

// ---------- Animation ----------

const clock = new THREE.Clock();
let firstFrameRendered = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime(); // seconds
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (!firstFrameRendered) {
    firstFrameRendered = true;
    (window as any).__ready = true;
  }
});

// ---------- Resize ----------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Expose for testing ----------

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```