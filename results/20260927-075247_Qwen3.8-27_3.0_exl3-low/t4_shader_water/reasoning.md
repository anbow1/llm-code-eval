The user wants a complete TypeScript file that:
1. Creates a PlaneGeometry (10x10, 128x128 segments)
2. Rotates it to lie flat in XZ plane
3. Uses a custom ShaderMaterial with:
   - Vertex shader: displaces vertices up/down with moving wave pattern based on position and uTime uniform
   - Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
4. Updates uTime every frame from elapsed time
5. No lights (ShaderMaterial is unlit)
6. Camera at an angle so waves are clearly visible
7. Must compile with tsc --strict
8. Follows all the hard rules about imports, renderer setup, resize, animation loop, etc.

Let me write this:

- PlaneGeometry(10, 10, 128, 128)
- Rotate -PI/2 around X to make it lie flat in XZ plane
- Vertex shader: use position.xy (before rotation, the plane is in XY, so after rotation the position.xy maps to xz... wait, no. The geometry is created in XY plane. When we rotate the mesh, the positions in the shader are still in local space (XY plane). So I should use position.x and position.y in the shader for the wave pattern, and displace along position.z (which becomes world Y after rotation).

Actually, let me think about this more carefully. The PlaneGeometry creates vertices in the XY plane (z=0). When we rotate the mesh by -PI/2 around X, the local Y axis becomes world -Z, and local Z becomes world Y. So displacing along local Z will move vertices up/down in world space.

In the vertex shader, I'll use position.x and position.y (local coordinates) to compute the wave, and displace position.z.

For the wave pattern, I'll use something like:
- Multiple sine waves with different frequencies and directions
- The wave amplitude and frequency create a nice ocean-like effect

Fragment shader:
- Receive varying vHeight (the displacement)
- Map from deep blue (low) to white (high)
- Could use a smoothstep or mix

Let me write the code:

```typescript
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  varying float vHeight;
  
  void main() {
    vec3 pos = position;
    
    float wave1 = sin(pos.x * 1.5 + uTime * 2.0) * 0.3;
    float wave2 = sin(pos.y * 2.0 + uTime * 1.5) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 1.0 + uTime * 1.0) * 0.15;
    
    float height = wave1 + wave2 + wave3;
    pos.z += height;
    
    vHeight = height;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  varying float vHeight;
  
  void main() {
    // Normalize height to 0-1 range (height ranges roughly from -0.65 to 0.65)
    float t = clamp((vHeight + 0.65) / 1.3, 0.0, 1.0);
    
    vec3 deepBlue = vec3(0.0, 0.05, 0.2);
    vec3 midBlue = vec3(0.0, 0.3, 0.6);
    vec3 white = vec3(1.0, 1.0, 1.0);
    
    vec3 color;
    if (t < 0.5) {
      color = mix(deepBlue, midBlue, t * 2.0);
    } else {
      color = mix(midBlue, white, (t - 0.5) * 2.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10, 10, 128, 128);
geometry.rotateX(-Math.PI / 2);

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 }
  }
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let ready = false;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  
  material.uniforms.uTime.value = elapsed;
  
  renderer.render(scene, camera);
  
  if (!ready) {
    ready = true;
    (window as any).__ready = true;
  }
});

(window as any).__scene = scene;
(window as any).__camera = camera;
(window as any).__renderer = renderer;
```

Wait, I should double-check the strict mode compliance. Let me think about potential issues:
- `material.uniforms.uTime.value` - this should be fine since uniforms is typed
- The clock methods return numbers
- All types should be fine

Actually, let me reconsider the wave amplitudes. With 0.3 + 0.2 + 0.15 = 0.65 max, and -0.65 min. The normalization in the fragment shader should work.

Let me also make sure the camera angle is good. Position (0, 5, 8) looking at origin should give a nice angled view of the plane.

I think this is solid. Let me finalize it.
