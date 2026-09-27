The user wants a complete TypeScript file that:
1. Renders a 100x100 grid (10,000 cubes) using ONE InstancedMesh
2. Animates a radial wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude via setMatrixAt
3. Each instance has its own color via setColorAt (gradient by grid position)
4. Reuses one Object3D or Matrix4 for updates - no allocations in render loop
5. Uses MeshStandardMaterial, AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid and wave
7. Must follow all the hard rules about Three.js import, renderer setup, resize, setAnimationLoop, exposing scene/camera/renderer, __ready flag

Let me write this carefully:

- Import THREE from 'three'
- Create renderer, append to document.body
- Size from window.innerWidth/innerHeight
- Handle resize
- Use setAnimationLoop
- Motion uses delta/elapsed time
- Expose __scene, __camera, __renderer
- __ready after first frame
- No external assets

For the InstancedMesh:
- Geometry: BoxGeometry (small cube, maybe 0.9 size with 1.0 spacing)
- Material: MeshStandardMaterial
- 100x100 = 10000 instances
- Pre-compute distances from center
- In render loop: reuse a Matrix4 (or Object3D), set position Y based on wave formula, call setMatrixAt for each instance
- Set instanceMatrix.needsUpdate = true each frame
- Colors: set once at init with gradient based on grid position (x/z normalized)

Let me think about the wave formula:
- distanceFromCenter = sqrt(dx^2 + dz^2) where dx, dz are offset from center
- Y = sin(distanceFromCenter * k - time * speed) * amplitude

For performance with 10,000 instances, I should pre-compute the distances and store them in a Float32Array.

For the reusable Matrix4: I'll create one Matrix4 and reuse it. Actually, I can use a single Object3D and update its position, then updateMatrix, then compose the matrix. Or I can directly set the matrix elements. Since the cubes don't rotate or scale, I can just set the translation part of the matrix.

Actually, the simplest approach: create a single Matrix4, and for each instance, set the translation (elements 12, 13, 14) and keep the rest identity. Since we only change Y, we can set element 13 (the Y translation in column-major) each iteration.

Wait, Matrix4 is column-major. The translation is in elements 12, 13, 14 (0-indexed): m[12] = x, m[13] = y, m[14] = z.

So I can:
- Pre-allocate a Matrix4
- For each instance: set m[12] = x, m[13] = y, m[14] = z, with the rest being identity (set once)
- Call setMatrixAt(i, matrix)

Actually, even simpler: I'll pre-compute the x and z positions, and only update the y. Let me use a single Matrix4, set its elements directly.

Let me structure:
- Pre-compute: xPositions (Float32Array), zPositions (Float32Array), distances (Float32Array)
- In loop: for each i, set matrix elements [12]=x, [13]=y, [14]=z, call setMatrixAt

For colors: gradient by grid position. I'll use a Color and set it once during init.

Let me write the code now.
