The user wants a simple Three.js scene with:
1. A single cube at the origin with BoxGeometry + MeshStandardMaterial
2. Continuous rotation around X and Y axes using delta time
3. AmbientLight and DirectionalLight
4. PerspectiveCamera positioned to clearly see the cube
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. Must compile with `tsc --strict`
8. Must expose scene, camera, renderer on window
9. Set __ready = true after first frame
10. No external assets

Let me write this carefully to ensure strict TypeScript compliance. I need to be careful with types - `performance.now()` returns a number, `setAnimationLoop` callback has no arguments by default in Three.js types but actually it receives a `time` parameter. Let me check: in Three.js, `setAnimationLoop(callback)` where callback is `(time: number) => void`. Actually, looking at Three.js types, the callback signature is `(time: number) => void`.

For delta time, I'll track the previous timestamp and compute delta from that.

Let me make sure strict mode is satisfied:
- No unused variables
- Proper typing
- No implicit any

Let me write the code:
