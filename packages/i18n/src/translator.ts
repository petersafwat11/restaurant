import { type MessageKey, getMessageCatalog, lookupMessage } from './catalog';
import { DEFAULT_LOCALE, type Locale } from './locale';

export type TranslateVars = Record<string, string | number>;

/**
 * Minimal ICU-ish message formatter:
 *  - `{name}` → variable interpolation
 *  - `{name, plural, one {# x} other {# y}}` → CLDR plural selection via
 *    `Intl.PluralRules`, with `#` replaced by the formatted number and
 *    optional `=N {…}` exact-match arms.
 * Deliberately small — full ICU (select, number skeletons) is not needed by
 * this product and would pull a heavy dep.
 */
export function formatMessage(template: string, vars: TranslateVars, locale: Locale): string {
  return interpolate(template, vars, locale);
}

function interpolate(input: string, vars: TranslateVars, locale: Locale): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === '{') {
      const end = matchBrace(input, i);
      if (end === -1) {
        out += input.slice(i);
        break;
      }
      const body = input.slice(i + 1, end);
      out += renderArg(body, vars, locale);
      i = end + 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  return out;
}

function matchBrace(input: string, open: number): number {
  let depth = 0;
  for (let i = open; i < input.length; i += 1) {
    if (input[i] === '{') depth += 1;
    else if (input[i] === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function renderArg(body: string, vars: TranslateVars, locale: Locale): string {
  const firstComma = body.indexOf(',');
  if (firstComma === -1) {
    const name = body.trim();
    const v = vars[name];
    return v === undefined ? `{${name}}` : String(v);
  }

  const name = body.slice(0, firstComma).trim();
  const rest = body.slice(firstComma + 1).trim();
  if (!rest.startsWith('plural')) {
    const v = vars[name];
    return v === undefined ? `{${name}}` : String(v);
  }

  const armsStr = rest.slice('plural'.length).replace(/^\s*,?\s*/, '');
  const arms = parseArms(armsStr);
  const raw = Number(vars[name] ?? 0);
  const exact = arms[`=${raw}`];
  const category = new Intl.PluralRules(locale).select(raw);
  const chosen = exact ?? arms[category] ?? arms.other ?? '';
  const numStr = new Intl.NumberFormat(locale).format(raw);
  return interpolate(chosen.replace(/#/g, numStr), vars, locale);
}

function parseArms(input: string): Record<string, string> {
  const arms: Record<string, string> = {};
  let i = 0;
  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i] as string)) i += 1;
    let key = '';
    while (i < input.length && input[i] !== '{') {
      key += input[i];
      i += 1;
    }
    key = key.trim();
    if (i >= input.length || input[i] !== '{') break;
    const end = matchBrace(input, i);
    if (end === -1) break;
    arms[key] = input.slice(i + 1, end);
    i = end + 1;
  }
  return arms;
}

export type Translator = (key: MessageKey, vars?: TranslateVars) => string;

export function createTranslator(locale: Locale): Translator {
  const catalog = getMessageCatalog(locale);
  const fallback = getMessageCatalog(DEFAULT_LOCALE);
  return (key, vars = {}) => {
    const template = lookupMessage(catalog, key) ?? lookupMessage(fallback, key);
    if (template === undefined) return key;
    return formatMessage(template, vars, locale);
  };
}

/** Convenience for one-off server-side translation (e.g. a single email). */
export function translate(locale: Locale, key: MessageKey, vars?: TranslateVars): string {
  return createTranslator(locale)(key, vars);
}
