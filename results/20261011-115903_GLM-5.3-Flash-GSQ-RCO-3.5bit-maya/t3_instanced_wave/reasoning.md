100x100 grid, spacing say 1.2. Reuse dummy Object3D, Color, Matrix4. No allocations in loop. Precompute grid positions in arrays. Wave: y = sin(dist*k - t*speed)*amp. Color gradient by position set once via setColorAt, then instanceColor.needsUpdate not needed if set once before first render (still fine). Update instanceMatrix each frame.

Camera angled, look at center. Lights.