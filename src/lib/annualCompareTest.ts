/**
 * A/B test: is the annual-upsell comparison shown open, or collapsed behind
 * "See everything that's included" (the original design)?
 *
 *   control → collapsed (unchanged screen)
 *   open    → comparison open on arrival, in a tighter layout
 *
 * Assignment is a stable 50/50 split on the deal id, so a customer who reloads
 * or comes back from a reminder email sees the same version. The first 15
 * characters are used because Salesforce ids arrive as 15 or 18 characters.
 * The arm can be read back from the deal id alone (same hash) if PostHog
 * properties are ever missing.
 *
 * `?compare=open` / `?compare=control` forces an arm for previews.
 */
export type AnnualCompareArm = 'control' | 'open';

export const ANNUAL_COMPARE_TEST = 'annual_compare_open_2026_11';

export function annualCompareArm(dealId: string | undefined, override?: string | null): AnnualCompareArm {
  if (override === 'open' || override === 'control') return override;
  const id = (dealId || '').trim().slice(0, 15);
  if (!id) return 'control';
  // FNV-1a, 32-bit.
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 2 === 0 ? 'control' : 'open';
}
