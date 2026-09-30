The user wants a complete TypeScript file that creates a Three.js scene with:
1. A single cube (BoxGeometry + MeshStandardMaterial) at the origin
2. Continuous rotation around X and Y axes
3. AmbientLight + DirectionalLight
4. PerspectiveCamera positioned to see the cube clearly
5. Background color different from cube color
6. Frame-rate independent rotation using delta time
7. Must compile with tsc --strict
8. Handle window resize
9. Use renderer.setAnimationLoop
10. Expose __scene, __camera, __renderer, __ready
11. No external assets
12. Single ts code block

Let me write this carefully with strict TypeScript compliance.
