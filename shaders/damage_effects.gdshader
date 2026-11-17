// damage_effects.gdshader — fullscreen damage feedback.
// Blur + brightness + blackout for the heavy stuff (mine, death), and a
// low-HP vignette (darkened edges, like squinting eyes). NO fullscreen
// damage flash on purpose: flashing the whole screen on every hit is too
// much — the flash lives on the character sprite only now.
// Sits on a ColorRect in a CanvasLayer between the board and the HUD,
// so the board blurs/darkens but the HUD stays crisp (like the web,
// where the filter was on the canvas only, not the DOM HUD).
shader_type canvas_item;

uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;
uniform float blur_amount : hint_range(0.0, 8.0) = 0.0;
uniform float brightness : hint_range(0.0, 1.0) = 1.0;
uniform float dark_amount : hint_range(0.0, 1.0) = 0.0;
uniform float vignette_amount : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	vec2 uv = SCREEN_UV;
	vec4 col;
	if (blur_amount > 0.01) {
		// 9-tap box blur, radius in screen pixels.
		vec2 px = SCREEN_PIXEL_SIZE * blur_amount;
		col = texture(screen_texture, uv) * 4.0;
		col += texture(screen_texture, uv + vec2(px.x, 0.0));
		col += texture(screen_texture, uv + vec2(-px.x, 0.0));
		col += texture(screen_texture, uv + vec2(0.0, px.y));
		col += texture(screen_texture, uv + vec2(0.0, -px.y));
		col += texture(screen_texture, uv + px);
		col += texture(screen_texture, uv - px);
		col += texture(screen_texture, uv + vec2(px.x, -px.y));
		col += texture(screen_texture, uv + vec2(-px.x, px.y));
		col /= 12.0;
	} else {
		col = texture(screen_texture, uv);
	}
	col.rgb *= brightness;
	col.rgb = mix(col.rgb, vec3(0.0), dark_amount);
	if (vignette_amount > 0.001) {
		// Rectangular falloff: 0 at the center, 1 at ANY edge, so the
		// darkening is the same on all four sides on a 16:9 screen.
		// (A circular distance barely touches the left/right edges.)
		vec2 q = abs(uv - vec2(0.5)) * 2.0;
		float d = max(q.x, q.y);
		float vig = smoothstep(0.55, 1.0, d) * vignette_amount;
		col.rgb *= (1.0 - vig * 0.85);
	}
	COLOR = col;
}
