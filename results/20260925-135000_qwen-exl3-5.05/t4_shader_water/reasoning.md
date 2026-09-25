We need answer user wants single ts code block only. Need produce complete TypeScript file. Need think through requirements. Need ensure tsc --strict zero errors. Use import * as THREE from 'three'; addons? Not needed maybe. Create renderer, append canvas. PlaneGeometry 10x10 with 128x128 segments rotated to lie flat XZ plane. Plane default XY, rotate x -PI/2. Custom ShaderMaterial with vertex and fragment GLSL. Vertex displaces up/down based on position and uTime. Fragment color by height low deep blue high white foam, pass height varying. Update uTime every frame from elapsed time. Unlit. Camera angle.

Need be careful TypeScript strict with THREE types. Need maybe cast ShaderMaterial uniforms to any? We can define uniform object typed as { [key:string]: THREE.IUniform }. In strict, accessing uniforms.uTime.value ok if typed any or THREE.IUniform<number>. Use const uniforms: { uTime: { value: number } } etc. ShaderMaterial accepts Partial<ShaderMaterialParameters>? Let's recall three types: ShaderMaterial constructor(parameters?: Partial<ShaderMaterialParameters>). uniforms?: { [uniform: string]: IUniform }; So custom object compatible? { uTime: { value: 0 } } is assignable to { [uniform: string]: IUniform }? yes. Access material.uniforms.uTime.value maybe uniform type could be unknown? In strict if material.uniforms is {[string]: IUniform}, IUniform has value: any? IUniform<TValue=any> { value: TValue }. So ok. But if using ShaderMaterial type, uniforms property may be { [uniform: string]: IUniform } yes.

Renderer: const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); document.body.appendChild(renderer.domElement);

Camera perspective: fov 60, near 0.1, far 100. Position angle e.g. 0, 4, 8? Plane 10x10, waves maybe amplitude 0.5. Camera at (0, 5, 8) lookAt(0,0,0). Need waves visible.

Vertex shader: varying float vHeight; uniform float uTime; attribute? position built-in. Plane after rotation? If rotate mesh -PI/2, geometry positions are still XY with Z=0, but model matrix rotates. If displace along geometry local Y? In vertex shader, position.y is local plane coordinate (Y). If mesh rotated -PI/2, local Y maps to world -Z? Wait default PlaneGeometry lies in XY plane with vertices x,y, z=0. Mesh rotation.x = -Math.PI/2 rotates local Y to world Z? Let's calculate: rotate -90 about X: local y -> world? For rotation x -90: vector (0,1,0) maps to (0,0,-1)? R_x(theta): y' = y cos - z sin, z'= y sin + z cos. theta=-pi/2: y'=0, z'=-y. So local Y maps to world -Z. Local Z maps to world Y. To displace up/down in world Y, we need displace along local Z, because local Z becomes world Y after rotation? R_x(-90): local Z (0,0,1) -> (0,1,0)? y' = -sin? Actually y' = y cos - z sin = 0 - 1*(-1)=1, z'=0+0=0. Yes local Z maps to world Y. Thus in vertex shader if we do transformed.y = wave, that is horizontal along plane, not vertical. But many examples don't rotate geometry and use plane XY but look from? Requirement plane rotated to lie flat XZ plane and displace vertices up/down. We can either rotate mesh and displace along local Z in shader; or create geometry and rotate geometry itself? It says plane rotated to lie flat XZ plane. Could set mesh.rotation.x = -Math.PI/2 and in vertex shader set transformed.z = wave; but wave based on position.x and position.y (local coords) after rotation become world x and z? Local x = world x, local y = world -z. For wave pattern based on position, can use position.x and position.y. That's okay. Fragment color uses height vHeight = wave. Need vary height.

But if using normal matrix? Not needed. Could compute displaced position in view? We can use position.z displacement. If mesh rotation applied by projectionMatrix * modelViewMatrix * vec4(displaced,1.0). If local Z is displaced, after modelView it's vertical in world. Good.

Alternatively, rotate geometry with geometry.rotateX(-Math.PI/2) before creating mesh; then geometry positions have x,z (local = world if mesh not rotated). But PlaneGeometry rotated via geometry.rotateX(-Math.PI/2) means vertices y mostly 0, z from original y. Then vertex shader can displace position.y. Requirement "rotated to lie flat in XZ plane" could be mesh rotation or geometry. Simpler to satisfy: geometry.rotateX(-Math.PI/2); mesh no rotation; vertex displace y. But text: "Create a plane (PlaneGeometry 10x10 with 128x128 segments) rotated to lie flat in the XZ plane" Could be achieved by mesh.rotation. The shader should displace up/down. If geometry rotate, it's easier: plane local coordinates after rotation: x remains x, y becomes 0? Actually geometry.rotateX(-PI/2) modifies positions: original (x,y,0) -> (x,0,-y). So plane vertices y=0, z=-y. Displace position.y up/down. Good. Use geometry.rotateX(-Math.PI/2). That satisfies rotated to lie flat. Then shader displaces y. But note position.y initially 0, position.z has coordinates. We can use position.x and position.z. Good. We'll do geometry.rotateX(-Math.PI/2) and mesh.rotation identity. The phrase "rotated to lie flat" doesn't require mesh rotation. Good.

Need no external assets. Set __ready after first frame. Need handle first frame flag. Use clock? Use THREE.Clock. In setAnimationLoop: const elapsed = clock.getElapsedTime(); material.uniforms.uTime.value = elapsed; renderer.render(scene,camera); if (!ready) { ready=true; (window as any).__ready = true; }

Strict: window may not have __scene etc. Use (window as any). Need maybe declare const? No.

Need compile tsc --strict. If using string template shaders, okay. Need maybe ShaderMaterial side: THREE.DoubleSide. Could set transparent false.

GLSL: vertexShader: uniform float uTime; varying float vHeight; void main(){ vec3 pos = position; float xz = pos.x + pos.z; float wave = sin(pos.x*1.2 + uTime*1.1)*0.22 + sin(pos.z*1.7 - uTime*0.9)*0.18 + sin((pos.x+pos.z)*0.8 + uTime*1.6)*0.12; pos.y += wave; vHeight = wave; gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0); } Fragment: varying float vHeight; void main(){ float t = clamp((vHeight + 0.6) / 1.2, 0.0, 1.0); vec3 deep = vec3(0.02,0.08,0.25); vec3 mid = vec3(0.05,0.35,0.55); vec3 foam = vec3(1.0); vec3 color = mix(deep, mid, smoothstep(0.0,0.55,t)); color = mix(color, foam, smoothstep(0.72,1.0,t)); gl_FragColor = vec4(color,1.0); }

Need ensure wave height range around +/-0.5. t mapping with 0.6/1.2 covers. Could compute normalized height using known min/max? Sum amplitudes max 0.52 min -0.52. t = clamp((vHeight + 0.52)/1.04). Use 0.55. Fine.

Could add uColor variables? not needed.

Potential issue with tsc strict and template literal strings with #version? no. Use gl_FragColor supported. In strict? It's string, not checked.

Potential issue: PlaneGeometry type in three has rotateX returns geometry. geometry.rotateX is available.

Need create WebGLRenderer with alpha? No.

Need setAnimationLoop callback param maybe time? Use THREE.Clock.

Full code:
import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(5, 6, 9); camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.PlaneGeometry(10,10,128,128);
geometry.rotateX(-Math.PI/2);

const uniforms = { uTime: { value: 0 } };
const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.DoubleSide });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const clock = new THREE.Clock();
let ready = false;
renderer.setAnimationLoop(() => { uniforms.uTime.value = clock.getElapsedTime(); renderer.render(scene,camera); if(!ready){ ready=true; (window as any).__ready = true; } });

function onResize(){ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }
window.addEventListener('resize', onResize);

(window as any).__scene = scene; ...

Need maybe remove event listener? not necessary. But strict might complain on window.devicePixelRatio? number. Math.min number.

Need no unused variables? tsc strict doesn't care unless noUnusedLocals maybe? Not specified just strict. Could remove ready variable? Use (window as any).__ready false initial? Could:
let firstFrame = true; ... if (firstFrame) { firstFrame=false; (window as any).__ready = true; }

Need maybe document.body might be null? document.body is Element type not null in DOM lib. OK.

Potential issue: Three types: window.addEventListener('resize', onResize) with onResize EventListener? Function with no args okay.

Need ensure (window as any).__renderer = renderer; before loop? after renderer creation.

Need maybe import addons? no. But hard rule says addons from 'three/addons/...' if used. No need.

Need final reply single ```ts code block nothing else. Ensure no additional prose.

Double-check tsc strict with ShaderMaterial type: `const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.DoubleSide });` If vertexShader and fragmentShader are const strings. OK. uniforms object inferred as { uTime: { value: number } }; Partial<ShaderMaterialParameters> expects uniforms?: { [uniform: string]: IUniform } | undefined. `{ uTime: { value: number } }` should assign to index signature? Object literal with known property can assign to index signature? In TS, an object literal with property `uTime` can be assigned to `{ [uniform: string]: IUniform }` because property values type `{ value: number }` assignable to IUniform<any> { value: any }. Yes. But later `uniforms.uTime.value = elapsed;` works.

Need maybe if use `const uniforms = { uTime: { value: 0 } } as const` no. Avoid.

Potential issue: clock.getElapsedTime returns number. good.

Need maybe set `renderer.outputColorSpace`? no.

Need ensure waves clearly visible: camera angle at (7,5,9) maybe. Plane 10x10. Use amplitude 0.35.

Let's craft final code. But need maybe include `renderer.domElement.style.display = 'block';` to avoid scrollbar. Could set body margin 0? Page no other HTML. Could document.body.style.margin = '0'; But strict: document.body.style exists. Good. Add to avoid scrollbars. Not necessary but nice.

Need ensure after first frame rendered, __ready true. setAnimationLoop callback runs after first render. Good.

Could there be issue `renderer.setAnimationLoop(() => { ... })` expects FrameRequestCallback signature (time: number) => void; no args ok.

Need maybe dispose? no.

Let's consider geometry rotation and varying height. If geometry.rotateX(-Math.PI/2), plane vertices y=0, z original negative y. Vertex shader uses pos.x and pos.z. Displaces pos.y. good.

Wave formula: maybe make sum of sines, deterministic. `float wave = sin(pos.x * 1.4 + uTime * 1.1) * 0.25 + sin(pos.z * 1.7 - uTime * 0.8) * 0.20 + sin((pos.x + pos.z) * 0.9 + uTime * 1.6) * 0.10;` max 0.55. Color t = clamp((vHeight + 0.55)/1.1,0,1). Use smoothstep. low deep blue high white foam. Good.

Need maybe include `vHeight = wave;` before gl_Position.

Could also use `float t = clamp((vHeight + 0.55) / 1.1, 0.0, 1.0);`

Potential shader precision? Not needed. Could add `precision highp float;` automatically by three? ShaderMaterial adds. Fine.

Need final with only code block. Ensure no comments? Comments okay. But final only code block.

Double-check `new THREE.PlaneGeometry(10, 10, 128, 128);` type exists. Yes.

Potential strict with `document.body.style.margin = '0';` If document.body is `HTMLElement` in lib.dom? Actually `document.body` type `HTMLElement | null`? In DOM lib, `document.body: HTMLElement | null`? Let's recall: Body interface? `document.body` returns HTMLElement | null? The property may be `HTMLElement | null`? In lib.dom.d.ts: `document.body: HTMLElement | null;` I think yes. So strict `document.body.style` error possibly object is possibly null. The user says page has no other HTML but document.body exists. But tsc strict may error. Need handle: `const body = document.body; if (body) { body.style.margin = '0'; body.appendChild(renderer.domElement); }` But requirement append canvas to document.body. If body null? In browser not. For strict, can do `document.body!.style.margin = '0'; document.body!.appendChild(renderer.domElement);` Non-null assertion. tsc strict allows. Or check. But if check, maybe not append if null. Use `document.body!.appendChild(renderer.domElement);` and `document.body!.style.margin = '0';`.

Potential strict with `window.innerWidth` etc number.

Need maybe use `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));` window.devicePixelRatio number. OK.

Could add `(window as any).__ready = false;` initial maybe. not required. But if checker expects after first frame true. We can set false initially. Good.

Need perhaps no lights, but scene background maybe. Fine.

Let's produce final.
