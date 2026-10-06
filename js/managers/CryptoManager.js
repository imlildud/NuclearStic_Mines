// ==============================================================
// ===================== CRYPTO MANAGER ==========================
// ==============================================================
// Handles encryption and decryption of save data.
//
// This manager provides:
// - Deterministic obfuscation for localStorage keys.
// - Randomized encryption for localStorage values.
// - Integrity verification for encrypted values.
// - JSON/object encryption helpers.
// - Backwards compatibility detection.
//
// NOTE:
// This is client-side save protection. The secret is bundled with
// the game and therefore cannot be considered permanently secret.
// It is designed to prevent casual save editing and make exported
// save files difficult to understand or modify manually.
// ==============================================================

export class CryptoManager {

    // ======================= CONSTANTS =======================

    static SECRET = "NuclearStic_Mines_Save_2026";

    static KEY_PREFIX = "NSK1:";
    static VALUE_PREFIX = "NSV1:";

    static VERSION = 1;

    // ======================= TEXT UTILITIES =======================

    // Convert a string to UTF-8 bytes
    static stringToBytes(text) {
        return new TextEncoder().encode(String(text));
    }

    // Convert UTF-8 bytes back to a string
    static bytesToString(bytes) {
        return new TextDecoder().decode(bytes);
    }

    // ======================= HEX UTILITIES =======================

    // Convert bytes to hexadecimal
    static bytesToHex(bytes) {
        return Array.from(bytes)
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    // Convert hexadecimal to bytes
    static hexToBytes(hex) {
        if (!hex || hex.length % 2 !== 0) {
            return new Uint8Array();
        }

        const bytes = new Uint8Array(hex.length / 2);

        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
        }

        return bytes;
    }

    // ======================= BASE64 UTILITIES =======================

    // Convert bytes to Base64
    static bytesToBase64(bytes) {
        let binary = "";

        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return btoa(binary);
    }

    // Convert Base64 to bytes
    static base64ToBytes(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    }

    // Convert bytes to URL-safe Base64
    static bytesToBase64Url(bytes) {
        return this.bytesToBase64(bytes)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");
    }

    // Convert URL-safe Base64 back to bytes
    static base64UrlToBytes(value) {
        let base64 = value
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        while (base64.length % 4 !== 0) {
            base64 += "=";
        }

        return this.base64ToBytes(base64);
    }

    // ======================= SHA-256 =======================

    // Rotate bits to the right
    static rotr(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    // Calculate SHA-256
    static sha256(data) {
        if (!(data instanceof Uint8Array)) {
            data = this.stringToBytes(data);
        }

        const K = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
            0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
            0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
            0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
            0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
            0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
            0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
            0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
            0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];

        let H = [
            0x6a09e667,
            0xbb67ae85,
            0x3c6ef372,
            0xa54ff53a,
            0x510e527f,
            0x9b05688c,
            0x1f83d9ab,
            0x5be0cd19
        ];

        const bitLength = data.length * 8;

        let paddedLength = data.length + 1;

        while ((paddedLength % 64) !== 56) {
            paddedLength++;
        }

        const padded = new Uint8Array(paddedLength + 8);

        padded.set(data);

        padded[data.length] = 0x80;

        for (let i = 0; i < 8; i++) {
            padded[padded.length - 1 - i] =
                Math.floor(bitLength / Math.pow(2, i * 8)) & 0xff;
        }

        const W = new Uint32Array(64);

        for (let offset = 0; offset < padded.length; offset += 64) {

            for (let i = 0; i < 16; i++) {
                const index = offset + i * 4;

                W[i] =
                    ((padded[index] << 24) |
                    (padded[index + 1] << 16) |
                    (padded[index + 2] << 8) |
                    padded[index + 3]) >>> 0;
            }

            for (let i = 16; i < 64; i++) {
                const s0 =
                    this.rotr(W[i - 15], 7) ^
                    this.rotr(W[i - 15], 18) ^
                    (W[i - 15] >>> 3);

                const s1 =
                    this.rotr(W[i - 2], 17) ^
                    this.rotr(W[i - 2], 19) ^
                    (W[i - 2] >>> 10);

                W[i] = (
                    W[i - 16] +
                    s0 +
                    W[i - 7] +
                    s1
                ) >>> 0;
            }

            let a = H[0];
            let b = H[1];
            let c = H[2];
            let d = H[3];
            let e = H[4];
            let f = H[5];
            let g = H[6];
            let h = H[7];

            for (let i = 0; i < 64; i++) {

                const S1 =
                    this.rotr(e, 6) ^
                    this.rotr(e, 11) ^
                    this.rotr(e, 25);

                const ch =
                    (e & f) ^
                    (~e & g);

                const temp1 = (
                    h +
                    S1 +
                    ch +
                    K[i] +
                    W[i]
                ) >>> 0;

                const S0 =
                    this.rotr(a, 2) ^
                    this.rotr(a, 13) ^
                    this.rotr(a, 22);

                const maj =
                    (a & b) ^
                    (a & c) ^
                    (b & c);

                const temp2 = (
                    S0 +
                    maj
                ) >>> 0;

                h = g;
                g = f;
                f = e;
                e = (d + temp1) >>> 0;
                d = c;
                c = b;
                b = a;
                a = (temp1 + temp2) >>> 0;
            }

            H[0] = (H[0] + a) >>> 0;
            H[1] = (H[1] + b) >>> 0;
            H[2] = (H[2] + c) >>> 0;
            H[3] = (H[3] + d) >>> 0;
            H[4] = (H[4] + e) >>> 0;
            H[5] = (H[5] + f) >>> 0;
            H[6] = (H[6] + g) >>> 0;
            H[7] = (H[7] + h) >>> 0;
        }

        const result = new Uint8Array(32);

        for (let i = 0; i < 8; i++) {
            result[i * 4] = (H[i] >>> 24) & 0xff;
            result[i * 4 + 1] = (H[i] >>> 16) & 0xff;
            result[i * 4 + 2] = (H[i] >>> 8) & 0xff;
            result[i * 4 + 3] = H[i] & 0xff;
        }

        return result;
    }

    // ======================= RANDOM DATA =======================

    // Generate cryptographically strong random bytes
    static generateRandomBytes(length) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return bytes;
    }

    // ======================= BYTE COMPARISON =======================

    // Compare two byte arrays
    static bytesEqual(a, b) {
        if (!a || !b || a.length !== b.length) {
            return false;
        }

        let difference = 0;

        for (let i = 0; i < a.length; i++) {
            difference |= a[i] ^ b[i];
        }

        return difference === 0;
    }

    // ======================= KEY STREAM =======================

    // Generate a deterministic byte stream
    static generateKeyStream(length, context) {

        const result = new Uint8Array(length);

        let generated = 0;
        let counter = 0;

        while (generated < length) {

            const input = this.stringToBytes(
                `${this.SECRET}|${context}|${counter}`
            );

            const block = this.sha256(input);

            const amount = Math.min(
                block.length,
                length - generated
            );

            result.set(
                block.slice(0, amount),
                generated
            );

            generated += amount;
            counter++;
        }

        return result;
    }

    // ======================= KEY ENCRYPTION =======================

    // Encrypt a localStorage key deterministically
    //
    // Keys must remain deterministic so SaveManager can always
    // locate the same encrypted localStorage entry.
    static encryptKey(key) {

        const text = String(key);
        const bytes = this.stringToBytes(text);

        const stream = this.generateKeyStream(
            bytes.length,
            "KEY"
        );

        const encrypted = new Uint8Array(bytes.length);

        for (let i = 0; i < bytes.length; i++) {
            encrypted[i] = bytes[i] ^ stream[i];
        }

        const tag = this.sha256(
            new Uint8Array([
                ...this.stringToBytes(`${this.SECRET}|KEY_TAG|`),
                ...encrypted
            ])
        );

        return (
            this.KEY_PREFIX +
            this.bytesToBase64Url(encrypted) +
            "." +
            this.bytesToBase64Url(tag.slice(0, 8))
        );
    }

    // Decrypt a localStorage key
    static decryptKey(value) {

        if (!this.isEncryptedKey(value)) {
            return value;
        }

        try {

            const content = value.substring(this.KEY_PREFIX.length);
            const separator = content.indexOf(".");

            if (separator === -1) {
                return null;
            }

            const encryptedPart = content.substring(0, separator);
            const tagPart = content.substring(separator + 1);

            const encrypted = this.base64UrlToBytes(encryptedPart);
            const storedTag = this.base64UrlToBytes(tagPart);

            const expectedTag = this.sha256(
                new Uint8Array([
                    ...this.stringToBytes(`${this.SECRET}|KEY_TAG|`),
                    ...encrypted
                ])
            ).slice(0, 8);

            if (!this.bytesEqual(storedTag, expectedTag)) {
                return null;
            }

            const stream = this.generateKeyStream(
                encrypted.length,
                "KEY"
            );

            const decrypted = new Uint8Array(encrypted.length);

            for (let i = 0; i < encrypted.length; i++) {
                decrypted[i] = encrypted[i] ^ stream[i];
            }

            return this.bytesToString(decrypted);

        } catch (error) {
            console.error("[CryptoManager] Key decryption failed:", error);
            return null;
        }
    }

    // Check whether a value is an encrypted key
    static isEncryptedKey(value) {
        return (
            typeof value === "string" &&
            value.startsWith(this.KEY_PREFIX)
        );
    }

    // ======================= VALUE ENCRYPTION =======================

    // Encrypt a string value
    static encryptString(value) {

        const text = String(value);
        const plaintext = this.stringToBytes(text);

        // Generate a unique nonce for every save operation
        const nonce = this.generateRandomBytes(12);

        const stream = new Uint8Array(plaintext.length);

        let generated = 0;
        let counter = 0;

        while (generated < plaintext.length) {

            const context = new Uint8Array([
                ...this.stringToBytes(`${this.SECRET}|VALUE|`),
                ...nonce,
                ...this.stringToBytes(`|${counter}`)
            ]);

            const block = this.sha256(context);

            const amount = Math.min(
                block.length,
                plaintext.length - generated
            );

            stream.set(
                block.slice(0, amount),
                generated
            );

            generated += amount;
            counter++;
        }

        const encrypted = new Uint8Array(plaintext.length);

        for (let i = 0; i < plaintext.length; i++) {
            encrypted[i] = plaintext[i] ^ stream[i];
        }

        // Generate a keyed integrity tag
        const tag = this.sha256(
            new Uint8Array([
                ...this.stringToBytes(`${this.SECRET}|VALUE_TAG|`),
                ...nonce,
                ...encrypted
            ])
        );

        return [
            this.VALUE_PREFIX,
            this.bytesToBase64Url(nonce),
            this.bytesToBase64Url(encrypted),
            this.bytesToBase64Url(tag.slice(0, 16))
        ].join(".");
    }

    // Decrypt a string value
    static decryptString(value) {

        if (!this.isEncryptedValue(value)) {
            return value;
        }

        try {

            const content = value.substring(this.VALUE_PREFIX.length);
            const parts = content.split(".");

            if (parts.length !== 3) {
                throw new Error("Invalid encrypted value format.");
            }

            const nonce = this.base64UrlToBytes(parts[0]);
            const encrypted = this.base64UrlToBytes(parts[1]);
            const storedTag = this.base64UrlToBytes(parts[2]);

            // Verify integrity before decrypting
            const expectedTag = this.sha256(
                new Uint8Array([
                    ...this.stringToBytes(`${this.SECRET}|VALUE_TAG|`),
                    ...nonce,
                    ...encrypted
                ])
            ).slice(0, 16);

            if (!this.bytesEqual(storedTag, expectedTag)) {
                throw new Error("Encrypted save integrity check failed.");
            }

            const stream = new Uint8Array(encrypted.length);

            let generated = 0;
            let counter = 0;

            while (generated < encrypted.length) {

                const context = new Uint8Array([
                    ...this.stringToBytes(`${this.SECRET}|VALUE|`),
                    ...nonce,
                    ...this.stringToBytes(`|${counter}`)
                ]);

                const block = this.sha256(context);

                const amount = Math.min(
                    block.length,
                    encrypted.length - generated
                );

                stream.set(
                    block.slice(0, amount),
                    generated
                );

                generated += amount;
                counter++;
            }

            const decrypted = new Uint8Array(encrypted.length);

            for (let i = 0; i < encrypted.length; i++) {
                decrypted[i] = encrypted[i] ^ stream[i];
            }

            return this.bytesToString(decrypted);

        } catch (error) {
            console.error("[CryptoManager] Value decryption failed:", error);
            return null;
        }
    }

    // Check whether a value is encrypted
    static isEncryptedValue(value) {
        return (
            typeof value === "string" &&
            value.startsWith(this.VALUE_PREFIX)
        );
    }

    // ======================= OBJECT ENCRYPTION =======================

    // Encrypt an object as a JSON string
    static encryptObject(object) {
        return this.encryptString(JSON.stringify(object));
    }

    // Decrypt an encrypted JSON object
    static decryptObject(value) {

        const decrypted = this.decryptString(value);

        if (decrypted === null) {
            return null;
        }

        try {
            return JSON.parse(decrypted);
        } catch (error) {
            console.error("[CryptoManager] JSON parsing failed:", error);
            return null;
        }
    }
}