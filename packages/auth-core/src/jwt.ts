import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

export interface AccessTokenClaims {
	sub: string; // user id
	email: string;
	roles: string[];
	permissions: string[];
}

export interface RefreshTokenClaims {
	sub: string;
	jti: string; // refresh token id (matched against RefreshToken.tokenHash)
}

export interface JwtConfig {
	accessSecret: string;
	refreshSecret: string;
	accessTtl: string | number; // e.g. '15m' or 900
	refreshTtl: string | number; // e.g. '30d' or 60*60*24*30
}

export function signAccessToken(
	claims: AccessTokenClaims,
	config: JwtConfig,
): string {
	const opts: SignOptions = {
		expiresIn: config.accessTtl as SignOptions["expiresIn"],
	};
	return jwt.sign(claims, config.accessSecret, opts);
}

export function signRefreshToken(
	claims: RefreshTokenClaims,
	config: JwtConfig,
): string {
	const opts: SignOptions = {
		expiresIn: config.refreshTtl as SignOptions["expiresIn"],
	};
	return jwt.sign(claims, config.refreshSecret, opts);
}

export function verifyAccessToken(
	token: string,
	config: JwtConfig,
): AccessTokenClaims {
	const decoded = jwt.verify(token, config.accessSecret);
	if (typeof decoded === "string") throw new Error("Invalid access token");
	return decoded as unknown as AccessTokenClaims;
}

export function verifyRefreshToken(
	token: string,
	config: JwtConfig,
): RefreshTokenClaims {
	const decoded = jwt.verify(token, config.refreshSecret);
	if (typeof decoded === "string") throw new Error("Invalid refresh token");
	return decoded as unknown as RefreshTokenClaims;
}
