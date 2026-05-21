import path from "node:path";
import type { NextConfig } from "next";

const prismaStub = path.resolve(__dirname, "src/lib/prisma-client-stub.ts");

const config: NextConfig = {
	reactStrictMode: true,
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
				// `@repo/utils` barrel re-exports money.ts which imports Prisma's
				// Decimal class. Browser never calls Decimal arithmetic — stub
				// Prisma out for the browser condition so its node-only deps
				// (`fs`, `async_hooks`, …) don't enter the client bundle.
				"@prisma/client": { browser: prismaStub },
				"@prisma/client/runtime/library": { browser: prismaStub },
			},
		},
	},
	webpack: (config, { isServer }) => {
		// Same stubbing as the Turbopack block above, for the production
		// `next build` path (which still uses Webpack).
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

export default config;
