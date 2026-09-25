We need answer user's request with single ts code block only. Need produce final with ```ts only. Need ensure TypeScript strict, Three.js imports. Need no external assets. Create renderer, append canvas, resize, animation loop, delta. Expose globals, ready after first frame. Single cube BoxGeometry MeshStandardMaterial, ambient, directional, perspective camera, background different. Frame-rate independent rotation using delta time. Need maybe import THREE from 'three'; in strict with moduleResolution? User says import as import * as THREE from 'three'; addons none.

Need ensure (window as any) assignments. Renderer setSize. Clock for delta. Use elapsed? clock.getDelta() and getElapsedTime? We can accumulate. After first frame set ready. Need render first frame then ready maybe inside loop with firstFrame flag.

Potential strict issues: document.body could be null? Hard rules page no other HTML, but strict TS document.body is HTMLElement? In DOM lib, document.body is HTMLElement (non-null?) Actually lib.dom: body: HTMLElement | null? Let's check: Document.body: HTMLElement | null. In strict, renderer.domElement appendChild maybe if null. Use const container = document.body ?? (() => { const b = document.createElement('body'); document.documentElement.appendChild(b); return b; })(); But document.body may be null at script execution? Since no HTML, likely body exists. But to satisfy strict, handle.

Need import types? No.

Renderer: const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

Camera: fov 75, aspect innerWidth/innerHeight, near 0.1, far 1000, position (0,0,3).

Cube: size 1. material color maybe 0x00ff88, background 0x112233. Lights: AmbientLight(0xffffff, 0.4), DirectionalLight(0xffffff, 1.0) position 5,10,7.

Animation: let elapsed = 0; const rotateSpeed = { x: 0.7, y: 1.1 }; clock = new THREE.Clock(); renderer.setAnimationLoop(() => { const delta = clock.getDelta(); elapsed += delta; cube.rotation.x = elapsed * rotateSpeed.x; cube.rotation.y = elapsed * rotateSpeed.y; renderer.render(scene,camera); if(!ready){ ready=true; ... } }); Alternatively increment cube.rotation.x += rotateSpeed.x * delta. More direct. Use Math.min? no.

Resize: window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(...); });

Need after first frame rendered set ready. setAnimationLoop calls function, render, then if first. Could set ready after first render call in loop.

Potential issue with __ready after first frame rendered, maybe requestAnimationFrame ensures rendered? We set after renderer.render. Fine.

Need no console. Need single code block. Could use const renderer = new THREE.WebGLRenderer();

Need type strict: (window as any) OK.

Need maybe dispose? not required.

Let's craft final. Ensure no extra text outside code block.
