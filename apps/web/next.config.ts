import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
	reactStrictMode: true,
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
			{ protocol: "http", hostname: "localhost", port: "4000" },
		],
	},
	experimental: {},
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(config);
