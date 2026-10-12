The user wants a simple Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at origin
2. Continuous rotation around X and Y axes (frame-rate independent)
3. One AmbientLight and one DirectionalLight
4. PerspectiveCamera positioned to see the cube clearly
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. Must compile with `tsc --strict`
8. Must expose __scene, __camera, __renderer
9. Must set __ready = true after first frame
10. Use renderer.setAnimationLoop

Let me write this carefully:

- For delta time with setAnimationLoop, the callback receives a `time` parameter (elapsed time in ms). I need to track the previous time to compute delta, or I can use a Clock. Let me use a simple approach with tracking elapsed time.

Actually, `setAnimationLoop` callback receives `time` as the first argument (timestamp in milliseconds). I'll compute delta from that.

Wait, actually looking at the Three.js docs more carefully - `setAnimationLoop(callback)` where callback receives `(time)` as the timestamp. But it's not guaranteed to be delta. Let me use a Clock for cleaner delta computation, or track previous time manually.

Let me use a Clock for simplicity and reliability.

For strict TypeScript, I need to be careful with types. Let me make sure everything is properly typed.

Let me write the complete file:
