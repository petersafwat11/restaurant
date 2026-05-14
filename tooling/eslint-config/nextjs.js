import base from "./index.js";

export default [
	...base,
	{
		files: ["**/*.{ts,tsx}"],
		rules: {
			// Next-specific rules layered on top of Biome's defaults.
			// The `next` plugin is loaded via the .eslintrc.json shim in each Next app.
		},
	},
];
