/**
 * Which placement an Annual Partnership add-on is for, and the size-specific copy
 * the annual upsell page shows for it.
 *
 * The placement is read from the subscription add-on the pay backend attaches to
 * the deal (its title / product_name, e.g. "Annual Partnership — Half-Page",
 * product "Half-Page Ad"). The monthly PRICE always comes from that same add-on,
 * because it is the amount the backend charges — nothing here sets a price.
 */

export type AnnualPlacement = 'full' | 'two' | 'half' | 'sixth' | 'quarter' | 'coverwrap' | 'other';

export const annualPlacementOf = (label: string): AnnualPlacement => {
  const t = label.toLowerCase();
  if (/cover[- ]?wrap|signature cover|\bcwo\b/.test(t)) return 'coverwrap';
  if (/two[- ]?page|spread/.test(t)) return 'two';
  if (/full[- ]?page/.test(t)) return 'full';
  if (/half[- ]?page|1\/2/.test(t)) return 'half';
  if (/1\/6|sixth/.test(t)) return 'sixth';
  if (/1\/4|quarter/.test(t)) return 'quarter';
  return 'other';
};

export interface AnnualPlacementCopy {
  /** Inline noun phrase: "Your {phrase} runs in all 8 issues". */
  phrase: string;
  /** Second half of the lede, after the price sentence. */
  runsLine: string;
  /** "Pay the invoice" column. */
  single: string[];
  /** "Annual Partnership" column. */
  included: string[];
}

const PAGE_SINGLE = [
  'Your placement in this one issue',
  'Print + digital for about six weeks',
  'Seen while it’s the current issue',
  'Rebook each issue to keep running',
];

const pageIncluded = (reservation: string) => [
  reservation,
  'Refresh your creative every issue',
  'Print + digital, always on',
  '120,000+ readers across the year',
  'Priority placement + seller reports',
  'Locked-in pricing all year',
];

const pageCopy = (phrase: string, reservation: string): AnnualPlacementCopy => ({
  phrase,
  runsLine: `Your ${phrase} runs in all 8 issues of HAVEN this year — refresh your print ad each issue, and make digital updates every month.`,
  single: PAGE_SINGLE,
  included: pageIncluded(reservation),
});

export const ANNUAL_PLACEMENT_COPY: Record<AnnualPlacement, AnnualPlacementCopy> = {
  full: pageCopy('full page', 'Guaranteed page reservation, all 8 issues'),
  two: pageCopy('two-page spread', 'Guaranteed page reservation, all 8 issues'),
  half: pageCopy('half page', 'Half page reserved, all 8 issues'),
  sixth: pageCopy('1/6-page ad', '1/6 page reserved, all 8 issues'),
  quarter: pageCopy('quarter-page ad', 'Quarter page reserved, all 8 issues'),
  other: pageCopy('placement', 'Guaranteed placement, all 8 issues'),
  // The cover wrap plan is a Signature Cover Wrap on every issue; the lines below
  // are what one cover wrap includes (four wrap pages, 50 printed copies, a digital
  // article, a branded landing page, design included), repeated each issue.
  coverwrap: {
    phrase: 'cover wrap',
    runsLine:
      'Your four-page cover wrap goes on all 8 issues of HAVEN this year, with fresh listings and 50 printed copies every time.',
    single: [
      'Your cover wrap on this one issue',
      '50 printed copies, one time',
      'Seen while it’s the current issue',
      'Rebook each issue to keep running',
    ],
    included: [
      'Your 4-page cover wrap, all 8 issues',
      '50 printed copies of every issue',
      'New listings on your wrap each issue',
      'Digital article + branded landing page',
      'Design included, every issue',
      'Locked-in pricing all year',
    ],
  },
};
