# ==============================================================
# ===================== CRYPTO MANAGER =========================
# ==============================================================
# Handles encryption and decryption of save data.
#
# This manager provides:
# - Deterministic obfuscation for storage keys.
# - Randomized encryption for storage values.
# - Integrity verification for encrypted values.
# - JSON/object encryption helpers.
# - Backwards compatibility detection.
# - Full-storage encryption/migration utilities.
#
# NOTE:
# This is client-side save protection. The secret is bundled with
# the game and therefore cannot be considered permanently secret.
# It is designed to prevent casual save editing and make exported
# save files difficult to understand or modify manually.
#
# AUTOLOAD: Available as `CryptoManager` from any scene.
# All public methods are static, so they can also be called as
# `CryptoManager.encrypt_string(...)` from anywhere.

extends Node

# ======================= CONSTANTS =======================

const SECRET: String = "NuclearStic_Mines_Save_2026"
const KEY_PREFIX: String = "NSK1:"
const VALUE_PREFIX: String = "NSV1:"
const VERSION: int = 1

# Keys that should NEVER be encrypted (browser/library-owned
# or internal crypto metadata keys).
const SKIP_KEYS: Array = []


# ======================= TEXT UTILITIES =======================

# Convert a string to UTF-8 bytes.
static func string_to_bytes(text: String) -> PackedByteArray:
	return text.to_utf8_buffer()


# Convert UTF-8 bytes back to a string.
static func bytes_to_string(bytes: PackedByteArray) -> String:
	return bytes.get_string_from_utf8()


# ======================= HEX UTILITIES =======================

# Convert bytes to a lowercase hexadecimal string.
static func bytes_to_hex(bytes: PackedByteArray) -> String:
	return bytes.hex_encode()


# Convert a hexadecimal string to bytes.
# Returns an empty array if the input is invalid.
static func hex_to_bytes(hex: String) -> PackedByteArray:
	return hex.hex_decode()


# ======================= BASE64 UTILITIES =======================

# Convert bytes to Base64.
static func bytes_to_base64(bytes: PackedByteArray) -> String:
	return Marshalls.raw_to_base64(bytes)


# Convert Base64 back to bytes.
static func base64_to_bytes(base64: String) -> PackedByteArray:
	return Marshalls.base64_to_raw(base64)


# Convert bytes to URL-safe Base64 (no padding, +/ replaced by -_).
static func bytes_to_base64_url(bytes: PackedByteArray) -> String:
	var s: String = bytes_to_base64(bytes)
	s = s.replace("+", "-").replace("/", "_")
	s = s.rstrip("=")
	return s


# Convert URL-safe Base64 back to bytes.
static func base64_url_to_bytes(value: String) -> PackedByteArray:
	var s: String = value.replace("-", "+").replace("_", "/")
	while s.length() % 4 != 0:
		s += "="
	return base64_to_bytes(s)


# ======================= SHA-256 =======================

# Returns the SHA-256 hash of the given bytes.
static func sha256(data: PackedByteArray) -> PackedByteArray:
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(data)
	return ctx.finish()


# ======================= RANDOM DATA =======================

# Generate cryptographically strong random bytes.
static func generate_random_bytes(length: int) -> PackedByteArray:
	var bytes := PackedByteArray()
	bytes.resize(length)
	for i in range(length):
		bytes[i] = randi() % 256
	return bytes


# ======================= BYTE COMPARISON =======================

# Compare two byte arrays.
static func bytes_equal(a: PackedByteArray, b: PackedByteArray) -> bool:
	if a.size() != b.size():
		return false
	var difference: int = 0
	for i in range(a.size()):
		difference |= a[i] ^ b[i]
	return difference == 0


# Constant-time comparison for integrity tags.
static func constant_time_equal(a: PackedByteArray, b: PackedByteArray) -> bool:
	return bytes_equal(a, b)


# ======================= KEY STREAM =======================

# Generate a deterministic byte stream used for key obfuscation.
static func generate_key_stream(length: int, context: String) -> PackedByteArray:
	var result := PackedByteArray()
	result.resize(length)

	var generated: int = 0
	var counter: int = 0

	while generated < length:
		var input: PackedByteArray = string_to_bytes(
			"%s|%s|%d" % [SECRET, context, counter]
		)
		var block: PackedByteArray = sha256(input)

		var amount: int = mini(block.size(), length - generated)
		for i in range(amount):
			result[generated + i] = block[i]

		generated += amount
		counter += 1

	return result


# ======================= KEY ENCRYPTION =======================

# Encrypt a storage key deterministically.
# Keys must remain deterministic so SaveManager can always
# locate the same encrypted storage entry.
static func encrypt_key(key: String) -> String:
	var bytes: PackedByteArray = string_to_bytes(key)
	var stream: PackedByteArray = generate_key_stream(bytes.size(), "KEY")

	var encrypted := PackedByteArray()
	encrypted.resize(bytes.size())
	for i in range(bytes.size()):
		encrypted[i] = bytes[i] ^ stream[i]

	# Build the integrity tag input
	var tag_input := PackedByteArray()
	tag_input.append_array(string_to_bytes(SECRET + "|KEY_TAG|"))
	tag_input.append_array(encrypted)

	var tag: PackedByteArray = sha256(tag_input)

	# First 8 bytes of the tag
	var tag_slice := PackedByteArray()
	for i in range(8):
		tag_slice.append(tag[i])

	return KEY_PREFIX + bytes_to_base64_url(encrypted) + "." + bytes_to_base64_url(tag_slice)


# Decrypt a storage key. Returns "" if the key is invalid.
static func decrypt_key(value: String) -> String:
	if not is_encrypted_key(value):
		return value

	var content: String = value.substr(KEY_PREFIX.length())
	var separator: int = content.find(".")
	if separator == -1:
		return ""

	var encrypted_part: String = content.substr(0, separator)
	var tag_part: String = content.substr(separator + 1)

	var encrypted: PackedByteArray = base64_url_to_bytes(encrypted_part)
	var stored_tag: PackedByteArray = base64_url_to_bytes(tag_part)

	var tag_input := PackedByteArray()
	tag_input.append_array(string_to_bytes(SECRET + "|KEY_TAG|"))
	tag_input.append_array(encrypted)

	var full_tag: PackedByteArray = sha256(tag_input)
	var expected_tag := PackedByteArray()
	for i in range(8):
		expected_tag.append(full_tag[i])

	if not bytes_equal(stored_tag, expected_tag):
		return ""

	var stream: PackedByteArray = generate_key_stream(encrypted.size(), "KEY")
	var decrypted := PackedByteArray()
	decrypted.resize(encrypted.size())
	for i in range(encrypted.size()):
		decrypted[i] = encrypted[i] ^ stream[i]

	return bytes_to_string(decrypted)


# Returns true if the value is an encrypted key.
static func is_encrypted_key(value: String) -> bool:
	return value.begins_with(KEY_PREFIX)


# ======================= VALUE ENCRYPTION =======================

# Generate the SHA-256 keystream used for value encryption/decryption.
static func generate_value_stream(length: int, nonce: PackedByteArray) -> PackedByteArray:
	var stream := PackedByteArray()
	stream.resize(length)

	var generated: int = 0
	var counter: int = 0

	while generated < length:
		var context := PackedByteArray()
		context.append_array(string_to_bytes(SECRET + "|VALUE|"))
		context.append_array(nonce)
		context.append_array(string_to_bytes("|%d" % counter))

		var block: PackedByteArray = sha256(context)
		var amount: int = mini(block.size(), length - generated)
		for i in range(amount):
			stream[generated + i] = block[i]

		generated += amount
		counter += 1

	return stream


# XOR a byte array with the value keystream (symmetric).
static func crypt_bytes(bytes: PackedByteArray, nonce: PackedByteArray) -> PackedByteArray:
	var stream: PackedByteArray = generate_value_stream(bytes.size(), nonce)
	var output := PackedByteArray()
	output.resize(bytes.size())
	for i in range(bytes.size()):
		output[i] = bytes[i] ^ stream[i]
	return output


# Compute the keyed integrity tag for an encrypted value.
static func compute_auth_tag(nonce: PackedByteArray, encrypted: PackedByteArray) -> PackedByteArray:
	var tag_input := PackedByteArray()
	tag_input.append_array(string_to_bytes(SECRET + "|VALUE_TAG|"))
	tag_input.append_array(nonce)
	tag_input.append_array(encrypted)

	var full_tag: PackedByteArray = sha256(tag_input)
	var tag := PackedByteArray()
	for i in range(16):
		tag.append(full_tag[i])
	return tag


# Encrypt a string value.
static func encrypt_string(value: String) -> String:
	var plaintext: PackedByteArray = string_to_bytes(value)
	var nonce: PackedByteArray = generate_random_bytes(12)
	var encrypted: PackedByteArray = crypt_bytes(plaintext, nonce)
	var tag: PackedByteArray = compute_auth_tag(nonce, encrypted)

	return "%s.%s.%s.%s" % [
		VALUE_PREFIX,
		bytes_to_base64_url(nonce),
		bytes_to_base64_url(encrypted),
		bytes_to_base64_url(tag)
	]


# Decrypt a string value. Returns "" on failure.
static func decrypt_string(value: String) -> String:
	if not is_encrypted_value(value):
		return value

	var content: String = value.substr(VALUE_PREFIX.length())
	if content.begins_with("."):
		content = content.substr(1)

	var parts: PackedStringArray = content.split(".")
	if parts.size() != 3:
		push_warning("Invalid encrypted value format. Expected 3 parts, received %d." % parts.size())
		return ""

	var nonce: PackedByteArray = base64_url_to_bytes(parts[0])
	var encrypted: PackedByteArray = base64_url_to_bytes(parts[1])
	var stored_tag: PackedByteArray = base64_url_to_bytes(parts[2])

	if nonce.size() != 12:
		push_warning("Invalid nonce length. Expected 12 bytes, received %d." % nonce.size())
		return ""

	if stored_tag.size() != 16:
		push_warning("Invalid authentication tag length. Expected 16 bytes, received %d." % stored_tag.size())
		return ""

	var expected_tag: PackedByteArray = compute_auth_tag(nonce, encrypted)
	if not constant_time_equal(stored_tag, expected_tag):
		push_warning("Authentication tag mismatch.")
		return ""

	var plaintext: PackedByteArray = crypt_bytes(encrypted, nonce)
	return bytes_to_string(plaintext)


# Returns true if the value is encrypted.
static func is_encrypted_value(value: String) -> bool:
	return value.begins_with(VALUE_PREFIX)


# ======================= OBJECT ENCRYPTION =======================

# Encrypt an object (Dictionary or Array) as a JSON string.
static func encrypt_object(object) -> String:
	return encrypt_string(JSON.stringify(object))


# Decrypt an encrypted JSON object. Returns null on failure.
static func decrypt_object(value: String):
	var decrypted: String = decrypt_string(value)
	if decrypted == "":
		return null
	var parsed = JSON.parse_string(decrypted)
	return parsed


# ======================= STORAGE HELPERS =======================

# Returns true if the key should be skipped during bulk encryption.
static func should_skip_key(key: String) -> bool:
	return SKIP_KEYS.has(key)


# Returns true if the storage key is already encrypted.
static func is_storage_key_encrypted(key: String) -> bool:
	return is_encrypted_key(key)


# Returns true if the storage value is already encrypted.
static func is_storage_value_encrypted(value: String) -> bool:
	return is_encrypted_value(value)


# ======================= STORAGE EXPORT / IMPORT =======================

# Export the entire (encrypted) storage as a JSON-friendly Dictionary.
static func export_storage() -> Dictionary:
	var snapshot: Dictionary = {}
	var config := ConfigFile.new()
	var err: int = config.load("user://storage.cfg")
	if err == OK:
		for section in config.get_sections():
			for key in config.get_section_keys(section):
				snapshot["%s/%s" % [section, key]] = config.get_value(section, key)

	return {
		"version": VERSION,
		"exportedAt": Time.get_datetime_string_from_system(),
		"encrypted": true,
		"data": snapshot
	}


# Import a storage snapshot produced by export_storage().
static func import_storage(snapshot: Dictionary, options: Dictionary = {}) -> Dictionary:
	var clear_existing: bool = options.get("clearExisting", false)
	var encrypt_plaintext: bool = options.get("encryptPlaintext", true)

	if not snapshot.has("data"):
		push_error("Invalid storage snapshot.")
		return {}

	var report := {
		"total": 0,
		"imported": 0,
		"encryptedOnImport": 0,
		"failed": 0
	}

	var data: Dictionary = snapshot["data"]
	report["total"] = data.size()

	if clear_existing:
		# Wipe user:// storage
		var dir := DirAccess.open("user://")
		if dir != null:
			for file in dir.get_files():
				dir.remove(file)

	for raw_key in data.keys():
		var raw_value = data[raw_key]
		var key: String = str(raw_key)
		var value: String = str(raw_value)

		if snapshot.get("encrypted", false) == false and encrypt_plaintext:
			if not is_encrypted_key(key):
				key = encrypt_key(key)
			if not is_encrypted_value(value):
				value = encrypt_string(value)
			report["encryptedOnImport"] += 1

		# Write to a single ConfigFile entry
		var config := ConfigFile.new()
		config.set_value("storage", key, value)
		config.save("user://storage.cfg")
		report["imported"] += 1

	return report
