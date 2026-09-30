The user wants a complete TypeScript file that:
1. Creates a PlaneGeometry 10x10 with 128x128 segments
2. Rotates it to lie flat in XZ plane (rotate -π/2 around X axis)
3. Uses a custom ShaderMaterial with vertex and fragment shaders
4. Vertex shader: displaces vertices based on position and uTime uniform for wave pattern
5. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
6. Updates uTime every frame from elapsed time
7. No lights needed
8. Camera at an angle so waves are visible
9. Must compile with tsc --strict
10. Expose scene, camera, renderer on window
11. Set window.__ready after first frame
12. Handle resize

Let me write this carefully:

- The plane needs to be rotated to XZ. I'll apply the rotation to the geometry itself (rotateX(-Math.PI/2)) so the vertices are in XZ plane, then the vertex shader can displace along Y.
- Actually, if I rotate the geometry, then position.y in the vertex shader would be the height. But wait - if I rotate the geometry, the vertices' positions are transformed. Let me think...

If I do `geometry.rotateX(-Math.PI / 2)`, the plane that was in XY becomes XZ. Then in the vertex shader, `position.y` will be near 0 (the flat plane height), and I can displace it upward.

Actually, a better approach: create the plane, rotate the mesh (not geometry), but then in the vertex shader the local positions would still be in XY. Hmm, that's confusing.

Let me just rotate the geometry itself with `geometry.rotateX(-Math.PI / 2)`. This bakes the rotation into the vertex positions. So after rotation, vertices have x and z as the plane coordinates, and y = 0. In the vertex shader, I can use `position.x` and `position.z` to compute waves and displace along y.

For the vertex shader:
- Use position.x and position.z to compute a wave height based on uTime
- Add a varying for the height
- Displace position.y by the wave height

For the fragment shader:
- Use the varying height to mix colors from deep blue to white

Let me write a nice wave pattern - maybe combine several sine waves for an ocean-like effect.

For strict TypeScript, I need to be careful with types. The uniform type for uTime is `{ value: number }`.

Let me write the code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(5, 5, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const uniforms = {
  uTime: { value: 0 }
};

const vertexShader = `...`;
const fragmentShader = `...`;

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader,
  fragmentShader,
  side: THREE.DoubleSide
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Render loop
const clock = new THREE.Clock();
let firstFrame = false;

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  uniforms.uTime.value = elapsed;
  renderer.render(scene, camera);
  if (!firstFrame) {
    firstFrame = true;
    (window as any).__ready = true;
  }
});

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

For the shaders, let me write a good wave pattern:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
  vec3 pos = position;
  float wave1 = sin(pos.x * 2.0 + uTime * 2.0) * 0.5;
  float wave2 = sin(pos.z * 3.0 + uTime * 1.5) * 0.3;
  float wave3 = sin((pos.x + pos.z) * 1.5 + uTime * 3.0) * 0.4;
  float h = wave1 + wave2 + wave3;
  pos.y += h;
  vHeight = h;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
  // Map height to color
  float t = clamp((vHeight + 1.2) / 2.4, 0.0, 1.0);
  vec3 deepBlue = vec3(0.0, 0.05, 0.3);
  vec3 midBlue = vec3(0.0, 0.3, 0.7);
  vec3 white = vec3(1.0);
  
  vec3 color;
  if (t < 0.5) {
    color = mix(deepBlue, midBlue, t * 2.0);
  } else {
    color = mix(midBlue, white, (t - 0.5) * 2.0);
  }
  
  gl_FragColor = vec4(color, 1.0);
}
```

Wait, the max wave height: wave1 max 0.5, wave2 max 0.3, wave3 max 0.4, total max 1.2, min -1.2. So the range is [-1.2, 1.2], total range 2.4. That matches my clamping.

This should work well. Let me finalize.
