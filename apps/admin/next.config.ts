import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const prismaStub = path.resolve(__dirname, "src/lib/prisma-client-stub.ts");

const config: NextConfig = {
	reactStrictMode: true,
	output: "standalone",
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
	experimental: {
		turbo: {
			resolveAlias: {
				"@prisma/client": { browser: prismaStub },
				"@prisma/client/runtime/library": { browser: prismaStub },
			},
		},
	},
	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.resolve.alias = {
				...(config.resolve.alias as Record<string, unknown>),
				"@prisma/client/runtime/library": false,
				"@prisma/client": false,
			};
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				path: false,
				crypto: false,
				os: false,
				stream: false,
				tls: false,
				net: false,
				child_process: false,
				async_hooks: false,
			};
		}
		return config;
	},
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(config);
