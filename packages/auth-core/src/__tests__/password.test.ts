import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("password", () => {
	it("hashes and verifies a password", async () => {
		const hash = await hashPassword("Password123!");
		expect(hash).not.toBe("Password123!");
		expect(await verifyPassword("Password123!", hash)).toBe(true);
	});

	it("rejects a wrong password", async () => {
		const hash = await hashPassword("Password123!");
		expect(await verifyPassword("wrong-password", hash)).toBe(false);
	});

	it("produces different hashes for the same input (random salt)", async () => {
		const a = await hashPassword("Password123!");
		const b = await hashPassword("Password123!");
		expect(a).not.toBe(b);
	});
});
