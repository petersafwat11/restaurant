import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	esbuild: {
		jsx: "automatic",
	},
	test: {
		environment: "happy-dom",
		setupFiles: ["./src/test/setup.ts"],
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		globals: false,
		server: {
			deps: {
				inline: ["next-intl"],
			},
		},
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
			"next/navigation": resolve(
				__dirname,
				"node_modules/next/navigation.js",
			),
		},
	},
});
