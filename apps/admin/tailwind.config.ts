import preset from "@repo/tailwind-config/tailwind.preset";
import type { Config } from "tailwindcss";

const config: Config = {
	presets: [preset as Partial<Config>],
	darkMode: "class",
	content: [
		"./src/**/*.{ts,tsx}",
		// Pick up class names used inside shared workspace primitives so
		// Tailwind generates utilities for them in the admin build.
		"../../packages/ui/src/**/*.{ts,tsx}",
	],
};

export default config;
