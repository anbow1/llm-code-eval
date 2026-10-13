Need physically based lighting: PointLight with intensity in candela, decay=2. Use intensity like 300 to reach distance 10. With decay 2, illuminance = intensity / d². At d=10, need reasonable value; intensity 400 gives 4 at d=10. Good.

Write code with types: planets array typed. Moon orbits planet: moon as child of planet, positioned each frame around planet in XZ plane. Spin planets on axis (Y axis). Delta time via clock.getDelta.

Compile strict: no unused vars. Provide resize handler. setAnimationLoop callback receives time parameter but use THREE.Clock.

Camera above and side: e.g. (12, 10, 14), lookAt origin. Whole system visible (radius 10 + planet sizes). Maybe position (0, 12, 18)? "above and to the side". Use (11, 10, 13) distance ~20, fov 50 fine.

Star background? Not required. Keep simple, maybe subtle stars optional — skip or add points, fine, no assets. I'll add a faint starfield points for polish? Rules say no external assets; points are fine. Keep it minimal but okay to add. I'll add.

Write code.