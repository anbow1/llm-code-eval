30x30 grid, spacing 1.0, size 0.8, centered. Coordinates from -14.5 to 14.5. Need camera to see whole grid with margin. Grid width 29 units (from -14.5 to 14.5). With margin, camera at z such that viewport covers ~34 units. Use fov 50, aspect from window. Compute distance based on min(vHeight, vWidth). But aspect varies; simplest: set position at fixed distance, e.g., fov 50, distance so vertical extent ≥ 32 and horizontal ≥ 32. If aspect < 1, vertical must cover 32/aspect horizontally... Horizontal extent = 2*d*tan(fov/2)*aspect. To cover 32 both ways: d = 16/max(tan(fov/2), tan(fov/2)/aspect) = 16/(tan*min(1,aspect))? Actually vertical covers 2*d*tan; horizontal = vertical*aspect. Need vertical ≥ 32 if aspect ≥ ... need 2*d*tan ≥ 32 and 2*d*tan*aspect ≥ 32. So d = max(16/tan, 16/(tan*aspect)). On resize, recompute camera distance. Let's implement a fitCamera function.

Raycast on pointerdown click. Use mesh instanceId. Colors array state. mesh.instanceColor.needsUpdate = true after change.

instanceColor exists after setColorAt calls at setup.

Write code: