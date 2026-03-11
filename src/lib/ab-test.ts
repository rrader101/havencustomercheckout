/**
 * Simple AB test utility using localStorage for persistence.
 * 50/50 split — once assigned, the variant sticks for the user.
 */

const STORAGE_KEY = 'haven_ab_addons_variant';

export type AddOnsVariant = 'control' | 'carousel';

export function getAddOnsVariant(): AddOnsVariant {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'control' || stored === 'carousel') {
    return stored;
  }

  // Clear stale values (e.g. old "two-step" variant)
  localStorage.removeItem(STORAGE_KEY);

  const variant: AddOnsVariant = Math.random() < 0.5 ? 'control' : 'carousel';
  localStorage.setItem(STORAGE_KEY, variant);
  return variant;
}
