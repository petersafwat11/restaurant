import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const prismaStub = path.resolve(__dirname, "src/lib/prisma-client-stub.ts");

// Next's standalone trace-copy step creates symlinks for workspace packages.
// Native Windows can reject that final copy with EPERM even after compilation
// succeeds. Production images build on Linux, so retain standalone output there
// while allowing Windows developers/CI to produce a normal `.next` build.
const output = process.platform === "win32" ? undefined : "standalone";

const config: NextConfig = {
	reactStrictMode: true,
	output,
	async headers() {
		return [
			{
				source: "/sw.js",
				headers: [
					{
						key: "Content-Type",
						value: "application/javascript; charset=utf-8",
					},
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
					{
						key: "Content-Security-Policy",
						value: "default-src 'self'; script-src 'self'",
					},
					{ key: "Service-Worker-Allowed", value: "/" },
				],
			},
		];
	},
	// Don't advertise the framework (plan ??I3). Caddy also strips this at the
	// edge; disabling at the source is defense-in-depth.
	poweredByHeader: false,
	// Trace workspace files from the repo root so the standalone build pulls
	// in the workspace packages (api-client, ui, types, utils, realtime, etc.).
	outputFileTracingRoot: path.join(__dirname, "../.."),
	transpilePackages: [
		"@repo/api-client",
		"@repo/types",
		"@repo/i18n",
		"@repo/tailwind-config",
		"@repo/ui",
		"@repo/utils",
		"@repo/realtime-client",
	],
	// Next 16 builds with Turbopack by default; its config moved from
	// `experimental.turbo` to the top-level `turbopack` key, and a custom
	// `webpack()` hook now fails the Turbopack build. The client bundle must
	// never pull in Prisma (@repo/utils re-exports money.ts, which imports
	// @prisma/client), so alias it to an empty stub for the browser.
	turbopack: {
		resolveAlias: {
			"@prisma/client": { browser: prismaStub },
			"@prisma/client/runtime/library": { browser: prismaStub },
		},
	},
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(config);

