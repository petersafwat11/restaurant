import { createHash, randomInt } from "node:crypto";

/**
 * Generate a numeric OTP of the given length (default 6).
 * Uses crypto.randomInt to avoid modulo bias.
 */
export function generateOtp(length = 6): string {
	if (length < 4 || length > 10)
		throw new Error("OTP length must be between 4 and 10");
	let out = "";
	for (let i = 0; i < length; i++) out += randomInt(0, 10).toString();
	return out;
}

/**
 * SHA-256 hex digest. Used to store hashed refresh tokens / OTPs so DB leaks
 * don't expose the raw value.
 */
export function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}
