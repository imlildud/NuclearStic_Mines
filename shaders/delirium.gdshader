shader_type canvas_item;

// Delirium: full-screen grayscale

uniform float grayscale : hint_range(0.0, 1.0) = 0.0;
uniform float brightness : hint_range(0.0, 2.0) = 1.0;

uniform sampler2D screen_texture : hint_screen_texture, filter_linear_mipmap;

void fragment() {
	vec4 c = texture(screen_texture, SCREEN_UV);
	float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
	c.rgb = mix(c.rgb, vec3(lum), grayscale) * brightness;
	COLOR = c;
}
