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
	theme: {
		extend: {
			// ── Generic token aliases (admin density) ──────────────────────────
			// Many shared `@repo/ui` primitives (EmptyState, KeyValueGrid,
			// SettingsSectionCard, SettingsAnchorNav, StatusPill, FormField, …)
			// reference the *generic* token names (`text-body`, `rounded-button`,
			// …). The customer web app defines those in its own tailwind.config,
			// but the admin app previously used only the bare preset — which
			// exposes just the `-admin`-suffixed scale — so those utilities were
			// never generated and the primitives silently fell back to browser
			// defaults (unstyled headings, square corners). We map the generic
			// names to the LOCKED admin scale (docs/design-prompts/README.md §4)
			// so shared primitives render at admin density. Web is untouched.
			fontSize: {
				display: ["2rem", { lineHeight: "1.2", fontWeight: "600" }], // 32/600
				hero: ["2rem", { lineHeight: "1.15", fontWeight: "600" }], // alias of display (admin has no hero)
				h1: ["1.5rem", { lineHeight: "1.25", fontWeight: "600" }], // 24/600
				h2: ["1rem", { lineHeight: "1.4", fontWeight: "600" }], // 16/600
				h3: ["1.125rem", { lineHeight: "1.35", fontWeight: "600" }], // 18/600 — gap-filler for shared comps (EmptyState lg, section titles)
				"body-l": ["1rem", { lineHeight: "1.5", fontWeight: "400" }], // 16/400
				body: ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }], // 14/400
				small: ["0.8125rem", { lineHeight: "1.4", fontWeight: "400" }], // 13/400
				caption: [
					"0.75rem",
					{ lineHeight: "1.3", fontWeight: "500", letterSpacing: "0.06em" },
				], // 12/500 (uppercase applied at call sites)
				eyebrow: [
					"0.75rem",
					{ lineHeight: "1.3", fontWeight: "600", letterSpacing: "0.08em" },
				], // 12/600
				price: ["1.5rem", { lineHeight: "1.2", fontWeight: "600" }], // 24/600 tnum
			},
			borderRadius: {
				// Match the admin Button/Input (which use `rounded-md` = 12px) so
				// components using the generic `rounded-button`/`rounded-input`
				// names stay visually consistent instead of rendering square.
				button: "0.75rem", // 12px
				input: "0.75rem", // 12px
				image: "0.5rem", // 8px — inline thumbnails
				"image-lg": "0.75rem", // 12px
			},
			spacing: {
				// A few shared primitives offset by the web "site-nav" height.
				// Alias to the admin topbar height so those (rare) offsets resolve.
				"site-nav": "3.5rem", // 56px (= admin topbar)
				"site-nav-mobile": "3.5rem",
			},
		},
	},
};

export default config;
