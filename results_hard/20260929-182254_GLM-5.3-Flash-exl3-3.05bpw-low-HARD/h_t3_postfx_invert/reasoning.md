The trick: render in linear (outputColorSpace LinearSRGB so RenderPass writes linear... actually simplest: set renderer.outputColorSpace = THREE.LinearSRGBColorSpace so no conversion in RenderPass; then OutputPass converts linear→sRGB at end. But composer renders to render targets in linear anyway; OutputPass does tone mapping + sRGB conversion. The inversion must happen in linear space before OutputPass so inverse applies to sRGB-encoded values? Requirement: screen shows 0xcc9966 for background 0x336699. The base rendering (without effect) would show 0x336699 on screen (sRGB-encoded). Inversion must happen in sRGB space. So: RenderPass output linear, ShaderPass converts linear→sRGB, invert, back to linear, OutputPass converts to sRGB. Or simpler: do the inversion of the sRGB-displayed value.

Plan: renderer.outputColorSpace = LinearSRGBColorSpace? Actually OutputPass converts working color space (linear) to sRGB always. Keep default SRGBColorSpace; composer targets are linear (HalfFloat). ShaderPass shader: convert input linear color to sRGB (approx via pow 1/2.2? must be exact-ish). Exact conversion: use LinearToSRGB formula. Then invert, convert back to linear. Use GLSL functions.

Write shader:

vec3 LinearToSRGB(vec3 c){ return mix(c*12.92, pow(c, vec3(1.0/2.4))*1.055-0.055, step(0.0031308, c)); }
vec3 SRGBToLinear... invert: 1.0 - srgb, then back to linear.

That yields screen value = 1 - srgb(linear input). Good.

Resize: composer.setSize.