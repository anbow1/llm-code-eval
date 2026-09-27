The user wants a complete TypeScript file that:
1. Creates a PlaneGeometry 10x10 with 128x128 segments
2. Rotates it to lie flat in XZ plane (rotate around X axis by -PI/2)
3. Uses a custom THREE.ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader: displaces vertices up/down with a moving wave pattern based on position and uTime uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam), passes height with varying
6. Updates uTime every frame from elapsed time
7. No lights needed (ShaderMaterial is unlit)
8. Camera at an angle so waves are visible
9. Follows all the hard rules from the system prompt

Let me write this carefully:

- Import THREE from 'three'
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use renderer.setAnimationLoop
- Motion uses delta/elapsed time
- Expose __scene, __camera, __renderer
- After first frame, set __ready = true
- No external assets

Let me think about the shaders:

Vertex shader:
- Take position, use uTime uniform
- Create a wave pattern: sin/cos of position.x and position.z multiplied by uTime
- Displace position.y (which after rotation becomes the "up" direction)
- Actually, since the plane is rotated to XZ, the local Y axis of the plane becomes the world Z or something... Let me think.

PlaneGeometry is in XY plane by default. If I rotate the mesh by -PI/2 around X, it lies flat in XZ. The local Y of the geometry becomes the world... Let me think about this differently.

Actually, the simplest approach: create the PlaneGeometry (which is in XY plane), rotate the MESH (not the geometry) so it's flat. Then in the vertex shader, the position attribute is still in the local XY space of the plane. The displacement should be along the local Z axis (which after rotation becomes the world Y/up direction).

Wait, let me reconsider. PlaneGeometry(10, 10, 128, 128) creates a plane in the XY plane facing +Z. If I rotate the mesh by rotation.x = -Math.PI/2, the plane lies flat in XZ with normal pointing up (+Y).

In the vertex shader, the `position` attribute is in local space. For a PlaneGeometry, positions are in XY (x goes -5 to 5, y goes -5 to 5, z is 0). After the mesh rotation, local Z becomes world Y (up).

So in the vertex shader, I should displace position.z (local) which will become the world up direction.

Actually wait - let me reconsider. The position attribute in the shader is the local vertex position. For PlaneGeometry, vertices have x, y in [-5,5] and z = 0. The mesh rotation transforms this. If I displace position.z in the vertex shader, that will be along the local Z axis, which after rotation.x = -PI/2, becomes the world Y axis (up). Yes, that's correct.

So in the vertex shader:
- Use position.x and position.y (which map to world X and Z after rotation) for the wave pattern
- Displace position.z for the height

Let me write the shaders:

```glsl
// Vertex
uniform float uTime;
varying float vHeight;

void main() {
    float wave1 = sin(position.x * 2.0 + uTime * 1.5) * 0.3;
    float wave2 = cos(position.y * 3.0 + uTime * 2.0) * 0.2;
    float wave3 = sin((position.x + position.y) * 1.5 + uTime * 1.0) * 0.15;
    float height = wave1 + wave2 + wave3;
    
    vHeight = height;
    
    vec3 newPos = position;
    newPos.z += height;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
```

```glsl
// Fragment
varying float vHeight;

void main() {
    // Normalize height to 0..1 range (approximate)
    float h = clamp(vHeight / 0.65 + 0.5, 0.0, 1.0); // center around 0, max ~0.65
    
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 white = vec3(1.0, 1.0, 1.0);
    
    // Maybe add some foam effect near the top
    vec3 color = mix(deepBlue, white, h);
    
    // Add foam: if h is high, add some white sparkle
    float foam = smoothstep(0.7, 1.0, h);
    color = mix(color, vec3(1.0), foam * 0.5);
    
    gl_FragColor = vec4(color, 1.0);
}
```

Let me refine the height range. The max displacement is 0.3 + 0.2 + 0.15 = 0.65, and min is -0.65. So I'll normalize from -0.65 to 0.65 to 0 to 1.

Camera: position it at something like (0, 5, 8) looking at origin, or (8, 6, 8) for a nice angled view.

Let me now write the complete file. I need to be careful with TypeScript strict mode.

For the elapsed time, I'll use a clock or just track time from the start. Using performance.now() or a THREE.Clock.

Let me use a simple approach: record start time, compute elapsed each frame.

Actually, I'll use THREE.Clock for simplicity.

Let me make sure everything is properly typed for strict mode.

```typescript
import * as THREE from 'three';

// Shaders
const vertexShader = `...`;
const fragmentShader = `...`;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Geometry and material
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

// Time tracking
const clock = new THREE.Clock();

// Animation
renderer.setAnimationLoop(() => {
    const elapsed = clock.getElapsedTime();
    material.uniforms.uTime.value = elapsed;
    
    renderer.render(scene, camera);
    
    if (!(window as any).__ready) {
        (window as any).__ready = true;
    }
});

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose
(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I should make sure the uniform access is typed correctly. In strict mode, `material.uniforms.uTime.value` should work since it's typed as `{ value: number }` but actually the uniforms type is `Record<string, IUniform>` where IUniform has `value: any`. So accessing `.value` should be fine.

Actually, let me double-check: THREE.ShaderMaterial's uniforms are typed as `{ [uniform: string]: IUniform }` where IUniform is `{ value: any }`. So `material.uniforms.uTime.value` is `any` and assigning a number to it is fine.

Let me also make the scene background a dark blue/navy to complement the ocean.

Let me finalize and make sure the code is complete and correct.
