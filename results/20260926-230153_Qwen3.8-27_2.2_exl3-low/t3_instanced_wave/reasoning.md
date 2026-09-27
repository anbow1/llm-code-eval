Let me plan this out:

1. Create a 100x100 grid of small cubes using InstancedMesh (10,000 instances)
2. Animate a radial wave using setMatrixAt with a reused Object3D/Matrix4
3. Use setColorAt for per-instance colors (gradient by grid position)
4. MeshStandardMaterial with AmbientLight + DirectionalLight
5. Camera positioned at an angle to see the whole grid
6. Handle resize, use setAnimationLoop, expose testing hooks

Key considerations:
- Grid: 100x100 = 10,000 instances
- Each cube is small, say 0.5 units, spaced 1 unit apart
- Grid spans from -50 to +50 in X and Z
- Wave: Y = sin(distanceFromCenter * k - time * speed) * amplitude
- Reuse one Object3D for matrix updates
- Colors: gradient by grid position (e.g., red to blue based on x+z or distance)
- Camera at an angle - something like (60, 40, 60) looking at origin

Let me write this carefully:

- Grid positions: x from -49.5 to 49.5 (100 values), z from -49.5 to 49.5
- Cube size: 0.8 (so they don't overlap)
- Spacing: 1.0
- Wave parameters: k = 0.15, speed = 2, amplitude = 2

For the InstancedMesh:
- Geometry: BoxGeometry(0.8, 0.8, 0.8)
- Material: MeshStandardMaterial
- Count: 10000

For colors, I'll use a gradient based on grid position - maybe hue from position.

Let me make sure I reuse a single Object3D and Matrix4 for the updates.

The render loop:
- Get elapsed time
- For each instance, compute position, set matrix
- instanceMatrix.needsUpdate = true

Let me write the code now.
