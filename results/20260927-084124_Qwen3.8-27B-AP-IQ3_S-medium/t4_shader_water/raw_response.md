```ts
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeight;

  void main() {
    vec3 pos = position;

    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.30;
    float wave2 = cos(pos.y * 3.0 + uTime * 2.0) * 0.20;
    float wave3 = sin((pos.x + pos.y) * 1.5 + uTime * 1.0) * 0.15;
    float wave4 = cos(pos.x * 4.0 - pos.y * 2.0 + uTime * 3.0) * 0.08;

    float height = wave1 + wave2 + wave3 + wave4;

    vHeight = height;

    pos.z += height;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vHeight;

  void main() {
    float h = clamp(vHeight / 0.73 + 0.5, 0.0, 1.0);

    vec3 deepBlue  = vec3(0.00, 0.04, 0.18);
    vec3 midBlue   = vec3(0.05, 0.30, 0.55);
    vec3 white     = vec3(1.00, 1.00, 1.00);

    vec3 color = mix(deepBlue, midBlue, smoothstep(0.0, 0.5, h));
    color = mix(color, white, smoothstep(0.6, 1.0, h));

    float foam = smoothstep(0.75, 1.0, h);
    color += vec3(foam * 0.4);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060610);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(6, 5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 }
  },
  side: THREE.DoubleSide
});

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const elapsed: number = clock.getElapsedTime();
  (material.uniforms.uTime as { value: number }).value = elapsed;

  renderer.render(scene, camera);

  if (!(window as any).__ready) {
    (window as any).__ready = true;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```