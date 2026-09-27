The user wants a complete TypeScript file that creates a wave plane using Three.js with a custom ShaderMaterial. Let me break down the requirements:

1. PlaneGeometry 10x10 with 128x128 segments
2. Rotated to lie flat in XZ plane (rotate -PI/2 around X axis)
3. Custom ShaderMaterial with:
   - Vertex shader: displace vertices up/down with moving wave pattern based on position and uTime uniform
   - Fragment shader: color by height (low = deep blue, high = white foam), pass height via varying
4. Update uTime every frame from elapsed time
5. No lights needed
6. Camera at an angle so waves are visible
7. Standard setup: WebGLRenderer, resize handling, setAnimationLoop, expose scene/camera/renderer on window, set __ready after first frame

Let me write this carefully:

- The plane is 10x10, rotated -PI/2 around X to lie in XZ plane
- Vertex shader uses position (which in local space before rotation is XY, but after rotation... actually the rotation is applied to the mesh, so the shader works in local space where the plane is in XY plane with Z as normal)
- Wait, actually if I rotate the mesh, the vertices in the shader are still in local coordinates. The plane geometry creates vertices in the XY plane by default. When I rotate the mesh -PI/2 around X, it becomes XZ plane in world space.
- In the vertex shader, I should displace along the local Z axis (which becomes Y in world space after rotation). Actually, let me think about this more carefully.

PlaneGeometry creates a plane in the XY plane with normal pointing in +Z direction. If I rotate the mesh by -PI/2 around X, the plane lies in the XZ plane with normal pointing up (+Y).

In the vertex shader, I work in local coordinates. The position attribute is in local space (XY plane). To displace "up" (which is world Y), I should displace along local Z.

Actually, let me just use `position.z += wave` or modify `transformed` / the final position. In a ShaderMaterial, I work with `position` which is the local vertex position. I'll displace `position.z` in the vertex shader, and after the mesh rotation, this will appear as vertical displacement.

For the wave pattern, I'll use a combination of sine waves based on x and y position and time.

For the fragment shader, I'll pass the height (displacement value) as a varying and use it to interpolate between deep blue and white.

Let me write the complete file:

```typescript
import * as THREE from 'three';

// Vertex shader
const vertexShader = `
  uniform float uTime;
  varying float vHeight;
  
  void main() {
    vec3 pos = position;
    
    float wave1 = sin(pos.x * 2.0 + uTime * 1.5) * 0.3;
    float wave2 = sin(pos.y * 3.0 + uTime * 2.0) * 0.2;
    float wave3 = sin((pos.x + pos.y) * 1.5 + uTime * 1.0) * 0.25;
    
    float height = wave1 + wave2 + wave3;
    pos.z += height;
    
    vHeight = height;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// Fragment shader
const fragmentShader = `
  varying float vHeight;
  
  void main() {
    // Normalize height to 0-1 range (approximately)
    float normalized = vHeight * 0.8 + 0.5; // shift and scale
    normalized = clamp(normalized, 0.0, 1.0);
    
    vec3 deepBlue = vec3(0.0, 0.1, 0.4);
    vec3 midBlue = vec3(0.1, 0.4, 0.8);
    vec3 foam = vec3(1.0);
    
    vec3 color;
    if (normalized < 0.5) {
      color = mix(deepBlue, midBlue, normalized * 2.0);
    } else {
      color = mix(midBlue, foam, (normalized - 0.5) * 2.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
  }
`;
```

Wait, I should be careful with the `position` variable in the vertex shader. In Three.js ShaderMaterial, `position` is automatically declared as an attribute. Let me make sure I'm not redeclaring it.

Actually in Three.js ShaderMaterial, the following are automatically prepended:
- `attribute vec3 position;`
- `attribute vec3 normal;`
- `attribute vec2 uv;`
- `uniform mat4 modelViewMatrix;`
- `uniform mat4 projectionMatrix;`
- etc.

So I should NOT redeclare `position`. I'll just use it directly.

Let me also make sure the wave displacement is visible. With a 10x10 plane and 128x128 segments, the displacement of ~0.3-0.8 units should be visible from a good camera angle.

Camera position: something like (0, 8, 10) looking at origin would give a nice angled view.

Let me finalize the code.
