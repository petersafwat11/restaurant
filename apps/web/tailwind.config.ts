import preset from "@repo/tailwind-config/tailwind.preset";
import type { Config } from "tailwindcss";

const config: Config = {
	presets: [preset as Partial<Config>],
	content: ["./src/**/*.{ts,tsx}"],
};

export default config;
