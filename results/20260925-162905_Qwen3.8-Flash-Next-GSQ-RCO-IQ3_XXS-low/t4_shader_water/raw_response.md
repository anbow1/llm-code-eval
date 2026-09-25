```ts
import * as THREE from 'three';

// --- Scene setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(5, 6, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- Geometry ---
const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

// --- Shader Material ---
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying float vHeight;

    void main() {
      vec3 pos = position;

      // Compute wave height using multiple wave components
      float wave1 = sin(pos.x * 1.5 + uTime * 2.0) * 0.3;
      float wave2 = cos(pos.y * 1.2 + uTime * 1.5) * 0.25;
      float wave3 = sin((pos.x + pos.y) * 0.8 + uTime * 3.0) * 0.15;
      float wave4 = sin(pos.x * 3.0 - pos.y * 2.0 + uTime * 4.0) * 0.1;

      float h = wave1 + wave2 + wave3 + wave4;

      // Displace in z (object space); after mesh rotation this becomes world Y
      pos.z += h;

      vHeight = h;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying float vHeight;

    void main() {
      // Map height to 0..1 range for coloring
      // h ranges roughly from -0.8 to +0.8
      float t = clamp((vHeight + 0.8) / 1.6, 0.0, 1.0);

      // Deep blue at low, lighter blue mid, white foam at high
      vec3 deepBlue = vec3(0.01, 0.02, 0.15);
      vec3 midBlue  = vec3(0.05, 0.2, 0.5);
      vec3 foam     = vec3(0.95, 0.97, 1.0);

      vec3 color;
      if (t < 0.5) {
        color = mix(deepBlue, midBlue, t * 2.0);
      } else {
        float foamMix = (t - 0.5) * 2.0;
        // Smoothstep for foam appearance
        float foamFactor = smoothstep(0.0, 1.0, foamMix * foamMix);
        color = mix(midBlue, foam, foamFactor);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.DoubleSide,
});

// --- Mesh ---
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2; // Lie flat in XZ plane
scene.add(mesh);

// --- Clock ---
const clock = new THREE.Clock();

// --- Render loop ---
let firstFrame = true;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  material.uniforms.uTime.value = elapsed;

  renderer.render(scene, camera);

  if (firstFrame) {
    (window as any).__ready = true;
    firstFrame = false;
  }
});

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Expose for testing ---
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```