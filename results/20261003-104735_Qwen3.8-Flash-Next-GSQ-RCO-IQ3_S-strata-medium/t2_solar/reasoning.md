The user wants a mini solar system built with Three.js in TypeScript. Let me plan this out:

1. Sun: sphere at origin with MeshBasicMaterial + PointLight at origin
2. 3 planets at distances ~4, 7, 10 with MeshStandardMaterial, orbiting at different speeds (inner faster)
3. Planets spin on their own axis
4. Planet 2 (distance 7) has a moon as a child
5. Weak AmbientLight
6. Camera above and to the side, looking at origin

Key considerations:
- Y is up, orbits in XZ plane
- PointLight with physically based intensity/decay - in newer Three.js, PointLight uses physically correct lighting by default. Need to set intensity appropriately (high values like 100+) and decay (2 for physically correct)
- Use setAnimationLoop with elapsed time for animation
- Handle resize
- Expose __scene, __camera, __renderer, __ready

Let me write the complete file:

- Scene setup
- Renderer with antialias
- Camera positioned above and to the side (e.g., position [15, 10, 15] looking at origin)
- Sun mesh (yellow/orange MeshBasicMaterial) + PointLight (high intensity, decay 2)
- AmbientLight (weak, like 0.1)
- 3 planet groups at distances 4, 7, 10
- Each planet has MeshStandardMaterial with different colors
- Orbit angles updated each frame using elapsed time
- Planet spin on Y axis
- Planet 2 has a moon child orbiting it
- Resize handler
- setAnimationLoop with delta time

For physically based lighting with Three.js (r152+), PointLight intensity is in candelas by default. I'll use a high intensity value like 500 or 1000 with decay=2 to ensure planets are well lit at distances 4-10.

Let me write the code carefully to ensure strict TypeScript compliance.
