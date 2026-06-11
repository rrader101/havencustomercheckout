/**
 * Shared building blocks for the redesigned checkout's three steps.
 *
 * The step components (ShippingDetails, AddOnsSection, PaymentSection) each
 * live in their own file. Anything they all need — types, helpers, the icon
 * wrapper, the <Field> primitive — lives here so we don't end up with a
 * circular import back to RedesignedPaymentForm.tsx.
 */
import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, Lock, Plus, Receipt, TrendingUp } from 'lucide-react';
import { DealAddOn } from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────

export type CheckoutStep = 'shipping' | 'addons' | 'payment';
export type AddonLayout = 'bundle' | 'carousel';
export type CheckoutTheme = 'modern' | 'editorial' | 'linen' | 'noir';

export interface ShippingData {
  name: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface PaymentFields {
  method: 'card' | 'google-pay' | 'apple-pay' | 'link' | 'check';
  cardholderName?: string;
  userEmail?: string;
  paymentMethodId?: string;
  linkEmail?: string;
  billing_street_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  billing_zipcode?: string;
  useDifferentBilling?: boolean;
}

export interface CheckoutFormData {
  shipping: ShippingData;
  addOns: Record<string, boolean>;
  invoices: Record<string, boolean>;
  payment: PaymentFields;
}

export interface EnrichedAddon {
  id: string;
  source: DealAddOn;
  kind: 'annual' | 'enhanced' | 'cwo' | 'generic';
  title: string;
  shortDesc: string;
  desc: string;
  detailLine?: string;
  tags: string[];
  image: string;
  tag?: string;
  price: number;
  anchor?: number | null;
  saveLabel?: string | null;
  per: string;
  subscription: boolean;
  socialProof?: string | null;
  placementPhrase?: string;
  pitchBullets?: string[];
  stats?: { value: string; label: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────

export const ASSET_BASE = '/checkout-redesign/assets';

export const COUNTRIES = [
  'Other',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas',
  'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin',
  'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada',
  'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia',
  'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini',
  'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany',
  'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan',
  'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia',
  'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
  'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
  'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama',
  'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
  'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
  'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea',
  'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda',
  'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen',
  'Zambia', 'Zimbabwe',
];

export const ADDON_COPY: Record<EnrichedAddon['kind'], Omit<EnrichedAddon, 'id' | 'source' | 'price' | 'subscription' | 'per'>> = {
  annual: {
    kind: 'annual',
    title: 'Annual Partnership',
    shortDesc: 'A full year in HAVEN, billed monthly, with continuous digital promotion.',
    detailLine: 'Year-round digital promotion and priority placement in the layout queue.',
    desc:
      'Upgrade your marketing strategy with a Haven | Homes + Lifestyles Annual Partnership. Your placement is reserved across the year, paired with continuous digital promotion and handled without re-booking issue by issue.\n\nAnnual partners receive post-issue distribution reports, seller-ready reporting, and priority consideration in the layout queue.',
    tags: ['8 Issues (Annual)', 'Always-On Presence', 'Print + Digital', 'Priority Placement', 'Seller Reports', 'Monthly Billing'],
    image: `${ASSET_BASE}/annual-partnership.png`,
    tag: 'Most chosen',
    anchor: null,
    saveLabel: null,
    // socialProof: '87% of returning agents choose this',
    placementPhrase: 'ad',
    pitchBullets: ['120,000+ readers per year', 'Post-issue distribution reports', 'Priority placement in the layout queue'],
    stats: [
      { value: '8', label: 'Print Issues' },
      { value: '120K+', label: 'Readers Reached' },
      { value: '<2c', label: 'Per Reader' },
    ],
  },
  enhanced: {
    kind: 'enhanced',
    title: 'Enhanced Digital Exposure',
    shortDesc: 'Your listing across every HAVEN channel, built to add meaningful digital reach.',
    detailLine: 'Editorial, social, and newsletter placements, plus an end-of-cycle seller report.',
    desc:
      'Take your listing beyond the page and across every channel HAVEN runs. Enhanced Digital Exposure puts your property and brand in front of an estimated **5,000 more views** through editorial, social, and newsletter placements.\n\nIncluded: a Haven of the Day homepage feature, sponsored editorial support, social promotion, listing article placement, newsletter inclusion, and a digital performance report.',
    tags: ['Haven of the Day', 'Sponsored Article', 'Social Promotion', 'Listing Article', 'Newsletter Feature', 'Seller Report'],
    image: `${ASSET_BASE}/enhanced-digital.jpg`,
    anchor: null,
    saveLabel: null,
    // socialProof: 'Avg. 5x more property views',
    stats: [
      { value: '6', label: 'Digital Placements' },
      { value: '200K', label: 'Monthly Readers' },
      { value: '15K+', label: 'Social Followers' },
    ],
  },
  cwo: {
    kind: 'cwo',
    title: 'Signature Cover Wrap',
    shortDesc: 'Be the face of the issue with a four-page custom cover wrap, fully produced.',
    detailLine: 'Includes printed copies, a digital article, and a branded landing page.',
    desc:
      'Not a page in the issue, the face of it. The Signature Cover Wrap is a four-page, dual-sided wrap built around your listings and your brand: front cover, inside front, inside back, and back cover.\n\nIncluded: co-branded wrap pages, printed copies for open houses and client gifting, a digital article, a branded landing page, and complete design support.',
    tags: ['4-Page Cover Wrap', 'Front + Back Cover', 'Printed Copies', 'Digital Article', 'Branded Landing Page', 'Design Included'],
    image: `${ASSET_BASE}/cover-wrap.jpg`,
    anchor: null,
    saveLabel: null,
    socialProof: null,
    stats: [
      { value: '4', label: 'Cover Pages' },
      { value: '50', label: 'Printed Copies' },
      { value: '200K', label: 'Readers' },
    ],
  },
  generic: {
    kind: 'generic',
    title: 'Marketing Add-on',
    shortDesc: 'Add this option to the same checkout before paying.',
    desc: 'Add this option to the same checkout before paying.',
    tags: [],
    image: '/placeholder.svg',
    anchor: null,
    saveLabel: null,
    socialProof: null,
  },
};

// ─── Annual "pay upfront" pricing ─────────────────────────────────────────

// Flat discount applied when an annual/subscription add-on is paid for the
// full term in one charge instead of billed monthly. Keep in sync with the
// backend (PaymentController) — both must agree on the discount amount.
export const ANNUAL_UPFRONT_DISCOUNT = 100;

// Total charged when paying the whole subscription term upfront:
// monthly price × term months − the flat discount (never below zero).
export const annualUpfrontTotal = (monthlyPrice: number, months: number): number =>
  Math.max(0, monthlyPrice * (months > 0 ? months : 12) - ANNUAL_UPFRONT_DISCOUNT);

// ─── Formatting / math helpers ────────────────────────────────────────────

export const fmt = (value: number) => Math.round(value || 0).toLocaleString('en-US');

export const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value || 0);

export const splitCents = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  const dollars = Math.floor(safe);
  const cents = Math.round((safe - dollars) * 100).toString().padStart(2, '0');
  return [dollars, cents] as const;
};

export const parseNumber = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseTags = (tags?: string) =>
  (tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

const firstParagraph = (text: string, maxLength = 170) => {
  const paragraph = (text || '').split(/\n\s*\n/)[0]?.trim() || '';
  return paragraph.length > maxLength ? `${paragraph.slice(0, maxLength - 3).trim()}...` : paragraph;
};

const classifyAddon = (addon: DealAddOn): EnrichedAddon['kind'] => {
  const text = `${addon.title || ''} ${addon.product_name || ''} ${addon.description || ''} ${addon.tags || ''}`.toLowerCase();
  if (text.includes('cover wrap') || text.includes('signature cover') || text.includes('cwo')) return 'cwo';
  if (text.includes('enhanced') || text.includes('digital exposure')) return 'enhanced';
  if (addon.type === 'Subscription' || text.includes('annual') || text.includes('partnership')) return 'annual';
  return 'generic';
};

export const enrichAddon = (addon: DealAddOn): EnrichedAddon => {
  const kind = classifyAddon(addon);
  const copy = ADDON_COPY[kind];
  const tags = parseTags(addon.tags);
  const desc = addon.description?.trim() || copy.desc;
  const title = addon.title || addon.product_name || copy.title;
  const subscription = addon.type === 'Subscription' || kind === 'annual';

  return {
    ...copy,
    id: addon.id.toString(),
    source: addon,
    title,
    desc,
    shortDesc: addon.description ? firstParagraph(addon.description) : copy.shortDesc,
    tags: tags.length ? tags : copy.tags,
    price: parseNumber(addon.amount),
    subscription,
    per: subscription ? 'per month' : kind === 'cwo' ? 'starting price' : 'one-time',
    placementPhrase: copy.placementPhrase || title.toLowerCase(),
  };
};

export const normalizeCountry = (country: string): string => {
  const normalized = country.toLowerCase().trim();
  if (['usa', 'us', 'united states', 'united states of america'].includes(normalized)) return 'United States';
  if (['canada', 'ca'].includes(normalized)) return 'Canada';
  if (['bahamas', 'the bahamas', 'bs'].includes(normalized)) return 'Bahamas';
  if (['barbados', 'bb'].includes(normalized)) return 'Barbados';
  if (['cayman islands', 'cayman', 'ky'].includes(normalized)) return 'Cayman Islands';
  if (['jamaica', 'jm'].includes(normalized)) return 'Jamaica';
  if (['trinidad and tobago', 'trinidad', 'tobago', 'tt'].includes(normalized)) return 'Trinidad and Tobago';
  if (['turks and caicos', 'turks and caicos islands', 'tc'].includes(normalized)) return 'Turks and Caicos Islands';
  if (['british virgin islands', 'bvi', 'vg'].includes(normalized)) return 'British Virgin Islands';
  if (['us virgin islands', 'usvi', 'virgin islands', 'vi'].includes(normalized)) return 'US Virgin Islands';
  if (['bermuda', 'bm'].includes(normalized)) return 'Bermuda';
  return country;
};

export const getCountryDisplayName = (country: string): string =>
  country === 'Other' ? 'Other Country' : country;

export const validStep = (step: string | null): CheckoutStep =>
  step === 'addons' || step === 'payment' || step === 'shipping' ? step : 'shipping';

export const readLayout = (value: string | null, fallback: AddonLayout = 'bundle'): AddonLayout =>
  value === 'bundle' || value === 'carousel' ? value : fallback;

export const readTheme = (value: string | null, fallback: CheckoutTheme = 'modern'): CheckoutTheme =>
  value === 'editorial' || value === 'linen' || value === 'noir' ? value : fallback;

// ─── Enter-to-submit document-level handler ───────────────────────────────

const shouldSubmitOnEnter = (event: KeyboardEvent): boolean => {
  if (event.key !== 'Enter') return false;
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return false;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return true;

  const role = target.getAttribute('role');
  if (target.tagName === 'TEXTAREA') return false;
  if (role === 'combobox' || role === 'menuitem' || role === 'option') return false;
  if (target.closest('[role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]')) return false;
  if (document.querySelector('.pac-container .pac-item-selected')) return false;

  return true;
};

export function usePrimarySubmitOnEnter(onSubmit: () => void, enabled = true) {
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldSubmitOnEnter(event)) return;
      event.preventDefault();
      event.stopPropagation();
      onSubmitRef.current();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);
}

// ─── Rich-text helper ─────────────────────────────────────────────────────

export function renderRich(text: string) {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      out.push(
        <strong key={key++} className="hc-desc-em">
          {match[1]}
        </strong>,
      );
    } else {
      out.push(
        <a
          key={key++}
          className="hc-desc-link"
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {match[2]}
        </a>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

// ─── Shared icon wrapper ──────────────────────────────────────────────────

/**
 * Thin wrappers around lucide-react icons sized to match the original inline
 * SVGs. Anywhere we used Icon.Check / Icon.Plus etc., it stays the same
 * shape — components don't have to know about lucide-react directly.
 */
export const Icon = {
  Arrow: () => <ArrowRight size={14} strokeWidth={1.5} />,
  Back: () => <ArrowLeft size={14} strokeWidth={1.5} />,
  Lock: () => <Lock size={12} strokeWidth={1.4} />,
  Check: () => <Check size={14} strokeWidth={3} />,
  Plus: () => <Plus size={12} strokeWidth={3} />,
  Trend: () => <TrendingUp size={14} strokeWidth={1.5} />,
  Receipt: () => <Receipt size={28} strokeWidth={1.4} />,
};

// ─── Shared <Field /> primitive ───────────────────────────────────────────

export function Field({
  label,
  error,
  className = '',
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`hc-field ${className} ${error ? 'has-error' : ''}`}>
      <label>{label}</label>
      {children}
      {error && <p className="hc-error">{error}</p>}
    </div>
  );
}
