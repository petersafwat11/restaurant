import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["src/**/*.spec.ts"],
		globals: false,
		passWithNoTests: true,
		// notification-matrix.spec boots a full nestjs-i18n context (loads every
		// message JSON). Under parallel turbo CPU contention that setup can exceed
		// the 10s default, so allow the same 30s the e2e config uses.
		hookTimeout: 30_000,
		testTimeout: 30_000,
	},
	resolve: {
		alias: { "@": resolve(__dirname, "src") },
	},
});
