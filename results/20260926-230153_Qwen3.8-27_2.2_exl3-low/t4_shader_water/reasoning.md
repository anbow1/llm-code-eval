The user wants a complete TypeScript file that:
1. Creates a PlaneGeometry 10x10 with 128x128 segments
2. Rotates it to lie flat in the XZ plane (rotation around X axis by -PI/2)
3. Uses a custom ShaderMaterial with GLSL vertex and fragment shaders
4. Vertex shader: displaces vertices up/down with a moving wave pattern based on position and uTime uniform
5. Fragment shader: colors by height (low = deep blue, high = white foam), passes height via varying
6. Updates uTime every frame from elapsed time
7. No lights needed (ShaderMaterial is unlit)
8. Camera at an angle so waves are clearly visible
9. Must compile with tsc --strict
10. Follow all the hard rules

Let me write this carefully:

- Import THREE from 'three'
- Create WebGLRenderer, append canvas to document.body
- Size from window.innerWidth/innerHeight, handle resize
- Use renderer.setAnimationLoop
- Expose __scene, __camera, __renderer, __ready
- No external assets

For the wave pattern, I'll use a combination of sine waves that move over time. Something like:
- displacement = sin(x * freq + uTime) * amplitude + sin(z * freq + uTime * 0.7) * amplitude

For the fragment shader:
- varying vHeight
- Color: low = deep blue (something like vec3(0.0, 0.05, 0.2)), high = white (vec3(1.0, 1.0, 1.0))
- Mix based on normalized height

Let me write the shaders:

Vertex shader:
```glsl
uniform float uTime;
varying float vHeight;

void main() {
  float wave1 = sin(position.x * 1.5 + uTime * 1.2) * 0.3;
  float wave2 = sin(position.z * 1.0 + uTime * 0.8) * 0.25;
  float wave3 = sin((position.x + position.z) * 0.7 + uTime * 0.5) * 0.15;
  float displacement = wave1 + wave2 + wave3;
  
  vec3 pos = position;
  pos.y += displacement;
  
  vHeight = displacement;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

Fragment shader:
```glsl
varying float vHeight;

void main() {
  // Normalize height: range is roughly -0.7 to 0.7
  float normalized = (vHeight + 0.7) / 1.4;
  
  vec3 deepBlue = vec3(0.0, 0.05, 0.25);
  vec3 white = vec3(1.0, 1.0, 1.0);
  
  vec3 color = mix(deepBlue, white, normalized);
  
  gl_FragColor = vec4(color, 1.0);
}
```

For the camera, I'll position it at an angle looking down at the plane. Something like position (0, 5, 10) looking at origin.

Let me make sure the TypeScript compiles with --strict. I need to be careful with types.

The ShaderMaterial uniforms need to be typed properly. Let me think about this:

```typescript
const material = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    uTime: { value: 0.0 }
  }
});
```

This should work fine with strict mode.

For the animation loop, I'll use renderer.setAnimationLoop with a callback that receives the time parameter (in seconds). I'll track elapsed time.

Actually, the setAnimationLoop callback receives a `time` parameter in seconds. I can use that directly as uTime.

Let me write the complete file now.
