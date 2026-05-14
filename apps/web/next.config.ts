import type { NextConfig } from "next";

const config: NextConfig = {
	reactStrictMode: true,
	transpilePackages: [
		"@repo/api-client",
		"@repo/types",
		"@repo/i18n",
		"@repo/tailwind-config",
	],
	experimental: {},
};

export default config;
