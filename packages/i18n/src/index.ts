export type Locale = "en" | "ar";
export type Direction = "rtl" | "ltr";

export const LOCALES: readonly Locale[] = ["en", "ar"] as const;
export const DEFAULT_LOCALE: Locale = "en";

export function getDir(locale: Locale): Direction {
	return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(value: string): value is Locale {
	return (LOCALES as readonly string[]).includes(value);
}
