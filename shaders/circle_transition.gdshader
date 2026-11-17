shader_type canvas_item;

// Circle wipe: radius 1.3 = fully open (transparent), 0.0 = fully closed (covered).
uniform float radius : hint_range(0.0, 1.3) = 1.3;
uniform vec4 circle_color : source_color = vec4(0.05, 0.03, 0.02, 1.0);

void fragment() {
	vec2 centered = UV - vec2(0.5);
	centered.x *= 16.0 / 9.0;
	float d = length(centered);
	float cover = smoothstep(radius, radius + 0.03, d);
	COLOR = vec4(circle_color.rgb, cover * circle_color.a);
}
