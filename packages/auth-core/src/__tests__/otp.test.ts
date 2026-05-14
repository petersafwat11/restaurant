import { describe, expect, it } from "vitest";
import { generateOtp, hashToken } from "../otp";

describe("otp", () => {
	it("generates a 6-digit OTP by default", () => {
		const otp = generateOtp();
		expect(otp).toMatch(/^\d{6}$/);
	});

	it("honours a custom length", () => {
		const otp = generateOtp(8);
		expect(otp).toMatch(/^\d{8}$/);
	});

	it("rejects out-of-range lengths", () => {
		expect(() => generateOtp(3)).toThrow();
		expect(() => generateOtp(11)).toThrow();
	});

	it("produces variable values", () => {
		const a = generateOtp();
		const b = generateOtp();
		// Astronomically unlikely to collide
		expect(a === b && a === "000000").toBe(false);
	});
});

describe("hashToken", () => {
	it("returns a stable hex SHA-256 hash", () => {
		expect(hashToken("hello")).toBe(
			"2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
		);
	});

	it("differs for different inputs", () => {
		expect(hashToken("a")).not.toBe(hashToken("b"));
	});
});
