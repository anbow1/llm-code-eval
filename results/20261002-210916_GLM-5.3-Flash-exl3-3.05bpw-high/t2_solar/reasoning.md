Simple task. Write the code. Need physically correct point light intensity/decay: with default decay=2, intensity falls off as r²; use intensity like ~300. Also renderer.setAnimationLoop, __ready after first frame.

Camera above and to the side: position like (12, 10, 16), looking at origin. Need whole system visible — radius 10, so distance ~ sqrt fine.

PointLight intensity with decay 2: illuminance at distance d = intensity / d². At d=10, intensity 300 → 3. Might want ~400-500. Use intensity = 500.

Write code.