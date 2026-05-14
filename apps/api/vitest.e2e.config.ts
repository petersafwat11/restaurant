import { resolve } from "node:path";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		// NestJS needs decorator metadata, which esbuild does not emit. SWC does.
		swc.vite({
			module: { type: "es6" },
			jsc: {
				parser: { syntax: "typescript", decorators: true, tsx: true },
				transform: {
					legacyDecorator: true,
					decoratorMetadata: true,
					react: { runtime: "automatic" },
				},
				target: "es2022",
				keepClassNames: true,
			},
		}),
	],
	test: {
		environment: "node",
		include: ["test/**/*.e2e-spec.ts"],
		globals: false,
		testTimeout: 30_000,
		hookTimeout: 30_000,
		pool: "forks",
		poolOptions: { forks: { singleFork: true } },
	},
	resolve: {
		alias: { "@": resolve(__dirname, "src") },
	},
});
