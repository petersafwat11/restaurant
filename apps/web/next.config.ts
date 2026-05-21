import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Allow loading <Image /> from the API host. In dev that's localhost:4000; in
// prod it's https://api.{domain}. APP_URL_API is supplied at build time.
const apiUrl = new URL(process.env.APP_URL_API ?? "http://localhost:4000");

const config: NextConfig = {
	reactStrictMode: true,
	output: "standalone",
	// Trace workspace files from the repo root so the standalone build pulls
	// in the workspace packages (api-client, ui, types, utils, etc.).
	outputFileTracingRoot: path.join(__dirname, "../.."),
	transpilePackages: [
		"@repo/api-client",
		"@repo/types",
		"@repo/i18n",
		"@repo/tailwind-config",
		"@repo/ui",
		"@repo/utils",
	],
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "images.unsplash.com" },
			{
				protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
				hostname: apiUrl.hostname,
				port: apiUrl.port || undefined,
				pathname: "/uploads/**",
			},
		],
	},
	experimental: {},
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(config);
