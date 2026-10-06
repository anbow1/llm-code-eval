The user wants a single TypeScript file that:
1. Creates a 100x100 grid of small cubes using a single InstancedMesh
2. Animates a radial wave on the Y axis using sin(distance * k - time * speed) * amplitude
3. Colors each instance with a gradient based on grid position
4. Reuses Object3D/Matrix4 (no allocations in the render loop)
5. Uses MeshStandardMaterial with AmbientLight + DirectionalLight
6. Camera at an angle to see the whole grid
7. Follows all the hard rules (imports, renderer setup, resize handling, animation loop with delta time, window exports, __ready flag)

Let me write this carefully:

- 100x100 = 10,000 instances
- Each cube is small, say 0.8x0.8x0.8 with some spacing
- Grid spacing: I'll use 1.0 spacing so the grid spans 100 units
- Center is at (49.5, 0, 49.5) or I'll center the grid at origin
- Wave: sin(dist * k - time * speed) * amplitude
- Color gradient: based on grid position (e.g., hue based on distance or x+z position)
- Pre-compute positions and distances to avoid allocations in the loop

Let me think about the structure:
- Create geometry: BoxGeometry(0.8, 0.8, 0.8)
- Create InstancedMesh with count = 10000
- Pre-compute an array of positions (x, z) and distances from center
- In the animation loop, for each instance, set y based on wave, compose matrix, setMatrixAt
- Use a reused Object3D (dummy) to set position and update matrix
- Use setColorAt once during setup for the gradient

For colors, I'll use HSL based on grid position to create a nice gradient.

Let me make sure no allocations happen in the render loop - I'll pre-allocate the Float32Array for positions and distances.

The camera should be at an angle, like (80, 60, 80) looking at center.

Let me write the code:
