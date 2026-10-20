Need a single TS file. Let's write it carefully for strict mode.

Renderer, scene, camera, lights, cube, animation loop with delta.

Use Clock for delta.

Set __ready after first frame rendered — inside animation loop after renderer.render, set once.

Strict: no unused vars. Let's write.

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 4);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 2.0);
directional.position.set(5, 8, 6);
scene.add(directional);

const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
const material = new THREE.MeshStandardMaterial({ color: 0xffa500, roughness: 0.4, metalness: 0.2 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

window resizing...

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  cube.rotation.x += delta * 0.8;
  cube.rotation.y += delta * 1.2;
  renderer.render(scene, camera);
  if (!ready) { ready = true; (window as any).__ready = true; }
});

(window as any).__scene = scene;
...
```

Careful: `(window as any).__scene` assignment must be after declarations — fine.

Note: strict compile — the callback param type inferred fine.

Also body margin 0 maybe: document.body.style.margin = '0'; overflow hidden. Fine.

Use `renderer.setPixelRatio` before setSize.

Also handle resize.

Add `let ready = false;` used.

One thing: `THREE.Clock` getDelta fine.

Write final.