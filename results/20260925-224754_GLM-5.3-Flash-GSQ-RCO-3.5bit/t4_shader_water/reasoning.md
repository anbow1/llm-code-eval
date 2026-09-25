Write a complete TS file. ShaderMaterial with custom vertex/fragment shaders. Need varying for height. Displacement in vertex shader. PlaneGeometry rotated -PI/2 on X to lie flat in XZ. Camera angled. Handle resize, animation loop, delta time, __ready after first frame.

Vertex shader: position is in local space (XY plane before rotation). Displace z (local) = height. Compute height from world-ish position: since plane rotated, local x,y map to world x, -z. Just use position.xy in shader. Height: sum of sines. varying vHeight. In fragment, normalize height range to mix deep blue to white foam.

Uniform uTime. Compile with strict: uniforms typed as {[uniform: string]: THREE.IUniform}.

Code:

```ts
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1e);

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 100);
camera.position.set(6, 5, 8);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10,10,128,128);
const uniforms = { uTime: { value: 0 } };
const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: `...`,
  fragmentShader: `...`,
  side: THREE.DoubleSide
});
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = -Math.PI/2;
scene.add(mesh);
```

Vertex shader:

```glsl
uniform float uTime;
varying float vHeight;

float wave(vec2 p, float t){
  return sin(p.x * 1.5 + t * 1.2) * 0.35
       + sin(p.y * 2.0 - t * 0.8) * 0.25
       + sin((p.x + p.y) * 1.1 + t * 1.7) * 0.2;
}

void main(){
  float h = wave(position.xy, uTime);
  vec3 displaced = position;
  displaced.z += h; // local z becomes world y after rotation
  vHeight = h;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
```

Fragment: height range approx [-0.8, 0.8]. t = clamp(vHeight / 0.8 * 0.5 + 0.5). Mix deep blue (0.02,0.09,0.28) to white foam. Maybe add foam threshold near top.

```glsl
varying float vHeight;
void main(){
  float t = clamp(vHeight * 0.6 + 0.5, 0.0, 1.0);
  vec3 deep = vec3(0.02, 0.09, 0.30);
  vec3 mid = vec3(0.10, 0.45, 0.65);
  vec3 foam = vec3(1.0);
  vec3 col = mix(deep, mid, smoothstep(0.0, 0.6, t));
  col = mix(col, foam, smoothstep(0.75, 1.0, t));
  gl_FragColor = vec4(col, 1.0);
}
```

Loop: use clock; renderer.setAnimationLoop((time) => ...) — time is in ms since start; better use THREE.Clock with getDelta/getElapsedTime. In setAnimationLoop callback, time param is DOMTimeStamp. Use clock.getElapsedTime().

__ready: after first frame rendered. Render first, then set flag.

Resize handler. Expose window vars.