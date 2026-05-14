import { describe, expect, it } from "vitest";
import {
	type JwtConfig,
	signAccessToken,
	signRefreshToken,
	verifyAccessToken,
	verifyRefreshToken,
} from "../jwt";

const config: JwtConfig = {
	accessSecret: "a".repeat(64),
	refreshSecret: "b".repeat(64),
	accessTtl: "15m",
	refreshTtl: "30d",
};

describe("jwt", () => {
	it("signs and verifies an access token", () => {
		const token = signAccessToken(
			{
				sub: "u1",
				email: "a@b.c",
				roles: ["customer"],
				permissions: ["order:create"],
			},
			config,
		);
		const claims = verifyAccessToken(token, config);
		expect(claims.sub).toBe("u1");
		expect(claims.permissions).toEqual(["order:create"]);
	});

	it("signs and verifies a refresh token", () => {
		const token = signRefreshToken({ sub: "u1", jti: "t1" }, config);
		const claims = verifyRefreshToken(token, config);
		expect(claims.sub).toBe("u1");
		expect(claims.jti).toBe("t1");
	});

	it("rejects a token signed with the wrong secret", () => {
		const token = signAccessToken(
			{ sub: "u1", email: "a@b.c", roles: [], permissions: [] },
			config,
		);
		expect(() =>
			verifyAccessToken(token, { ...config, accessSecret: "different-secret" }),
		).toThrow();
	});
});
