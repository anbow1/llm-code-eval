

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0.0 },
  },
  vertexShader: `
    uniform float uTime;
    varying float vHeight;

    void main() {
      float w1 = sin(position.x * 0.8 + uTime * 1.2) * 0.45;
      float w2 = cos(position.y * 0.6 + uTime * 0.8) * 0.35;
      float w3 = sin((position.x + position.y) * 0.5 + uTime * 1.5) * 0.25;
      float w4 = cos((position.x - position.y) * 0.7 + uTime * 0.6) * 0.15;
      float height = w1 + w2 + w3 + w4;
      vHeight = height;
      vec3 pos = position;
      pos.y += height;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying float vHeight;

    void main() {
      float t = smoothstep(-0.7, 0.7, vHeight);
      vec3 deepBlue = vec3(0.0, 0.05, 0.25);
      vec3 midBlue  = vec3(0.1, 0.3, 0.6);
      vec3 white    = vec3(1.0, 1.0, 1.0);

      vec3 color;
      if (t < 0.5) {
        color = mix(deepBlue, midBlue, t * 2.0);
      } else {
        color = mix(midBlue, white, (t - 0.5) * 2.0);
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `,
});

const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

const clock = new THREE.Clock();
let elapsed = 0;

renderer.setAnimationLoop((_time: number): void => {
  const delta = clock.getDelta();
  elapsed += delta;
  material.uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);
  (window as any).__ready = true;
});

window.addEventListener('resize', (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```