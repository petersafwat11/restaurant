/**
 * Base ESLint flat config. Biome handles most lint/format; ESLint is here
 * only for the rules Biome doesn't cover (Next.js core-web-vitals).
 */
export default [
	{
		ignores: [
			"**/node_modules/**",
			"**/.next/**",
			"**/dist/**",
			"**/.turbo/**",
			"**/coverage/**",
		],
	},
];
