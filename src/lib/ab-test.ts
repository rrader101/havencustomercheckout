/**
 * Simple AB test utility using localStorage for persistence.
 * 50/50 split — once assigned, the variant sticks for the user.
 */

const STORAGE_KEY = 'haven_ab_addons_variant';

export type AddOnsVariant = 'control' | 'two-step';

export function getAddOnsVariant(): AddOnsVariant {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'control' || stored === 'two-step') {
    return stored;
  }

  const variant: AddOnsVariant = Math.random() < 0.5 ? 'control' : 'two-step';
  localStorage.setItem(STORAGE_KEY, variant);
  return variant;
}
