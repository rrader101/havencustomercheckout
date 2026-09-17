import type { Deal, DealAddOn } from '@/services/api';

/**
 * Which add-ons this deal is allowed to be offered.
 *
 * Shared by both checkouts (the redesign and the legacy `?layout=legacy` form)
 * so the rule lives in exactly one place.
 *
 * Only subscription add-ons are ever withheld:
 *
 *   - Contract deals already run under a multi-issue Agreement (e.g. "1 of 8").
 *     Taking the monthly/annual switch would rewrite that Agreement and flip the
 *     deal to Subscription mid-contract, so the switch is never offered.
 *   - A One Time deal whose customer already has an active subscription has
 *     nothing left to upgrade to.
 *
 * The backend applies the Contract rule too (Deal::addOns). This mirror keeps a
 * selection saved in localStorage from an earlier visit — or a response from an
 * older backend — from putting the add-on back on the page and into the total.
 */
export const isAddonOffered = (
  deal: Pick<Deal, 'type' | 'has_active_subscription'>,
  addon: Pick<DealAddOn, 'type'>,
): boolean => {
  if (addon.type !== 'Subscription') return true;
  if (deal.type === 'Contract') return false;
  if (deal.type === 'One Time' && deal.has_active_subscription) return false;
  return true;
};
