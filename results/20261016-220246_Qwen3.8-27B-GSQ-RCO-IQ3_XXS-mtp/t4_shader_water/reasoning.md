The user wants a complete TypeScript file that:
1. Creates a plane (PlaneGeometry 10x10 with 128x128 segments)
2. Rotated to lie flat in XZ plane
3. Custom THREE.ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader: displaces vertices with moving wave pattern based on position and uTime uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam), passes height with varying
6. Update uTime every frame from elapsed time
7. No lights needed
8. Camera at an angle so waves are clearly visible
9. Import Three.js as `import * as THREE from 'three';`
10. Must compile with `tsc --strict`
11. Create WebGLRenderer, append canvas to document.body
12. Size renderer from window.innerWidth/innerHeight, handle resize
13. Use renderer.setAnimationLoop for render loop
14. Expose __scene, __camera, __renderer on window
15. After first frame, set (window as any).__ready = true
16. No external assets
17. Reply with single ts code block

Let me write the shaders:

Vertex shader:
- Use position attribute (xyz from PlaneGeometry)
- The plane is in XY by default, we rotate it to XZ. But actually, I can just apply the rotation to the mesh object. Or I can do the wave in local space.
- Let me think: PlaneGeometry creates vertices in XY plane (x, y, z=0). If I rotate the mesh by -PI/2 around X axis, it lies in XZ plane.
- In the vertex shader, I'll compute the wave displacement based on local position (x, y) and add it to z (which becomes "up" after rotation).
- Actually, let me think more carefully. The plane geometry has vertices at (x, y, 0). After rotating by -PI/2 around X, the vertices become (x, 0, y) in world space. The local z becomes world -y... hmm.

Actually, let me just work in local coordinates. The plane is in local XY, and local Z is "up" in local space. After the mesh is rotated, local Z maps to world Y (up). So in the vertex shader, I displace local z based on local x and y position.

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
    vec3 pos = position;
    float wave = sin(pos.x * 1.5 + uTime * 2.0) * 0.3 + cos(pos.y * 1.2 + uTime * 1.5) * 0.2 + sin((pos.x + pos.y) * 0.8 + uTime) * 0.15;
    pos.z += wave;
    vHeight = pos.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
    // Map height from roughly -0.65 to +0.65 to 0..1
    float t = clamp((vHeight + 0.7) / 1.4, 0.0, 1.0);
    vec3 deepBlue = vec3(0.0, 0.05, 0.3);
    vec3 whiteFoam = vec3(1.0, 1.0, 1.0);
    vec3 color = mix(deepBlue, whiteFoam, t);
    gl_FragColor = vec4(color, 1.0);
}
```

Now for the TypeScript file:

```typescript
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Shaders
const vertexShader = `...`;
const fragmentShader = `...`;

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0.0 } },
    vertexShader,
    fragmentShader,
});

const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;
    material.uniforms.uTime.value = elapsed;
    renderer.render(scene, camera);
    if (!ready) {
        ready = true;
        (window as any).__ready = true;
    }
});
```

Let me make sure this compiles with `tsc --strict`. The main concerns:
- All variables are properly typed
- No implicit any
- The shader strings are just strings, fine
- clock.getDelta() returns number
- material.uniforms.uTime.value is number

Let me double-check: `THREE.ShaderMaterial` uniforms are typed as `{ [key: string]: { value: unknown } }` or similar. Actually in Three.js types, it's `IUniform` which has `value: unknown`. So assigning a number should be fine since number is assignable to unknown.

Actually, let me check - in strict mode, `material.uniforms.uTime.value = elapsed;` where elapsed is number. The type of uniforms in ShaderMaterial... In Three.js, `ShaderMaterial` extends `Material` which has `uniforms: { [uniform: string]: IUniform }` where `IUniform` is `{ value: unknown; optional: boolean }`. So setting `.value` to a number is fine since number is assignable to unknown.

Let me also make sure I'm not using any addons. I'm not. Good.

Let me finalize the code.
