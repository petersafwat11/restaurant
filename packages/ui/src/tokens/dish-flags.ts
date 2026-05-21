/**
 * Customer-site dietary/feature flags shown on DishCard + ItemDetailSheet.
 *
 * `token` resolves to a semantic Tailwind class — never literal hex. The
 * carry-over fix from web-02 §1 carry-over #2: `gluten-free` is `positive`
 * (olive), NOT `info` — the SD source had it wrong; we don't port the bug.
 */

export type DishFlag = 'vegetarian' | 'vegan' | 'gluten-free' | 'spicy' | 'featured';

export interface DishFlagMeta {
  label: string;
  /** Semantic token name; primitives map to a Tailwind class. */
  token: 'positive' | 'warning' | 'accent';
  /** lucide-react icon name to render before the label. */
  icon: 'leaf' | 'wheat-off' | 'flame' | 'sparkles';
}

export const DISH_FLAG_TOKENS: Record<DishFlag, DishFlagMeta> = {
  vegetarian: { label: 'V', token: 'positive', icon: 'leaf' },
  vegan: { label: 'Vegan', token: 'positive', icon: 'leaf' },
  'gluten-free': { label: 'GF', token: 'positive', icon: 'wheat-off' },
  spicy: { label: 'Spicy', token: 'warning', icon: 'flame' },
  featured: { label: 'Featured', token: 'accent', icon: 'sparkles' },
};

/** Tailwind classes per token — chip bg + text + border. */
export const DISH_FLAG_CLASSES: Record<DishFlagMeta['token'], string> = {
  positive:
    'bg-positive/10 text-positive border border-positive/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  accent: 'bg-accent/10 text-accent border border-accent/20',
};
