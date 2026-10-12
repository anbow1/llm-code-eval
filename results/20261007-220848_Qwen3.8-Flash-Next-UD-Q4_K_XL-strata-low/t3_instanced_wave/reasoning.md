The user wants a single TypeScript file that renders a 100x100 grid of cubes using InstancedMesh with a radial wave animation. Let me plan this out:

1. Create scene, camera, renderer
2. Create a single InstancedMesh with BoxGeometry and MeshStandardMaterial
3. Set instance count to 10000
4. Give each instance a unique color via setColorAt (gradient by grid position)
5. Animate radial wave by updating matrices each frame
6. Reuse a dummy Object3D for matrix composition (no allocations in loop)
7. Add lights, handle resize, expose globals, set __ready after first frame

Key considerations:
- Need to call `material.needsUpdate` after setting colors? Actually for instanceColor, we need to make sure the material uses vertex colors or that instanceColor works with MeshStandardMaterial. In Three.js, InstancedMesh supports setColorAt which works with MeshStandardMaterial automatically - it uses instance attributes.
- The dummy object pattern is standard for InstancedMesh updates
- Camera at an angle - I'll position it to look at the center from above at an angle
- The wave formula: y = sin(distance * k - time * speed) * amplitude

Let me write the complete file.
