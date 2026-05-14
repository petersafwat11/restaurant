import { config as loadDotenv } from "dotenv";
import type { ZodSchema, z } from "zod";

export interface CreateEnvOptions {
	loadDotenv?: boolean;
	source?: Record<string, string | undefined>;
}

/**
 * Validate and freeze a process environment against a Zod schema.
 * Throws a single readable error listing all missing/invalid vars.
 */
export function createEnv<TSchema extends ZodSchema>(
	schema: TSchema,
	opts: CreateEnvOptions = {},
): z.infer<TSchema> {
	const { loadDotenv: shouldLoadDotenv = true, source = process.env } = opts;

	if (shouldLoadDotenv) {
		loadDotenv();
	}

	const parsed = schema.safeParse(source);

	if (!parsed.success) {
		const issues = parsed.error.issues
			.map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
			.join("\n");
		throw new Error(`Invalid environment variables:\n${issues}`);
	}

	return Object.freeze(parsed.data);
}
