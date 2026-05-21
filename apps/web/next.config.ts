import type { NextConfig } from "next";

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
		// Unsplash food photography for the design mock. Replace with our own CDN
		// + restaurant-specific image domains when real menu data lands.
		remotePatterns: [
			{ protocol: "https", hostname: "images.unsplash.com" },
			// Locally hosted menu/upload assets served by the API.
			{ protocol: "http", hostname: "localhost", port: "4000" },
		],
	},
	experimental: {},
};

export default config;
