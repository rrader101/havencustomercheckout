import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CardElement,
  PaymentRequestButtonElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { usePostHog } from 'posthog-js/react';
import NotFound from '@/pages/NotFound';
import {
  ChequePaymentData,
  Deal,
  DealAddOn,
  fetchDealsData,
  PaymentData as ApiPaymentData,
  processChequePayment,
  processPayment,
  saveAddress,
} from '@/services/api';
import { usePaymentRequest } from '@/contexts/usePaymentRequest';
import { CheckoutEventProperties, CheckoutEvents, getTimestamp } from '@/lib/analytics';
import { SuccessPopup } from './SuccessPopup';
import AddressAutocomplete from './AddressAutocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/check-box';
import { ArrowLeft, ArrowRight, Check, Lock, Plus, TrendingUp } from 'lucide-react';
import './checkout-redesign.css';

type CheckoutStep = 'shipping' | 'addons' | 'payment';
type AddonLayout = 'bundle' | 'carousel';
type CheckoutTheme = 'modern' | 'editorial' | 'linen' | 'noir';

interface ShippingData {
  name: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

interface PaymentFields {
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

interface CheckoutFormData {
  shipping: ShippingData;
  addOns: Record<string, boolean>;
  invoices: Record<string, boolean>;
  payment: PaymentFields;
}

interface EnrichedAddon {
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

const ASSET_BASE = '/checkout-redesign/assets';

const COUNTRIES = [
  'Other',
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Cape Verde',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'East Timor',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Ivory Coast',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
];

const ADDON_COPY: Record<EnrichedAddon['kind'], Omit<EnrichedAddon, 'id' | 'source' | 'price' | 'subscription' | 'per'>> = {
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
    socialProof: '87% of returning agents choose this',
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
    socialProof: 'Avg. 5x more property views',
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

const fmt = (value: number) => Math.round(value || 0).toLocaleString('en-US');

const money = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value || 0);

const splitCents = (value: number) => {
  const safe = Number.isFinite(value) ? value : 0;
  const dollars = Math.floor(safe);
  const cents = Math.round((safe - dollars) * 100).toString().padStart(2, '0');
  return [dollars, cents] as const;
};

const parseNumber = (value: string | number | null | undefined) => {
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

const enrichAddon = (addon: DealAddOn): EnrichedAddon => {
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

const normalizeCountry = (country: string): string => {
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

const getCountryDisplayName = (country: string): string => (country === 'Other' ? 'Other Country' : country);

const validStep = (step: string | null): CheckoutStep => {
  return step === 'addons' || step === 'payment' || step === 'shipping' ? step : 'shipping';
};

const readLayout = (value: string | null, fallback: AddonLayout = 'bundle'): AddonLayout => {
  if (value === 'bundle' || value === 'carousel') return value;
  return fallback;
};

const readTheme = (value: string | null, fallback: CheckoutTheme = 'modern'): CheckoutTheme => {
  if (value === 'editorial' || value === 'linen' || value === 'noir') return value;
  return fallback;
};

function renderRich(text: string) {
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

/**
 * Thin wrappers around lucide-react icons sized to match the original inline SVGs.
 * Anywhere we used Icon.Check / Icon.Plus etc. before, we can keep using them
 * without rewriting every call site.
 */
const Icon = {
  Arrow: () => <ArrowRight size={14} strokeWidth={1.5} />,
  Back: () => <ArrowLeft size={14} strokeWidth={1.5} />,
  Lock: () => <Lock size={12} strokeWidth={1.4} />,
  Check: () => <Check size={14} strokeWidth={3}  />,
  Plus: () => <Plus size={12} strokeWidth={3} />,
  Trend: () => <TrendingUp size={14} strokeWidth={1.5} />,
};

function Topbar() {
  return (
    <div className="hc-topbar">
      <img className="hc-wordmark" src="/logo-final.png" alt="Haven Lifestyles" />
      <div className="hc-meta">
        <Icon.Lock /> Secure checkout
      </div>
    </div>
  );
}

function Stepper({
  currentStep,
  onJump,
}: {
  currentStep: CheckoutStep;
  onJump: (step: CheckoutStep) => void;
}) {
  const steps = [
    { id: 'shipping' as const, label: 'Details' },
    { id: 'addons' as const, label: 'Customize' },
    { id: 'payment' as const, label: 'Pay' },
  ];
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStep));

  return (
    <div className="hc-stepper">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <React.Fragment key={step.id}>
            {index > 0 && <div className={`hc-step-divider ${index <= currentIndex ? 'lit' : ''}`} />}
            <button
              type="button"
              className={`hc-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
              onClick={() => (done || active) && onJump(step.id)}
            >
              <span className="hc-pip">{done ? <Icon.Check /> : index + 1}</span>
              <span>{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function DetailsStep({
  data,
  onUpdate,
  onNext,
  loading,
}: {
  data: ShippingData;
  onUpdate: (data: Partial<ShippingData>) => void;
  onNext: () => void;
  loading: boolean;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOtherCountry, setIsOtherCountry] = useState(false);
  const firstName = data.name.trim().split(/\s+/)[0];
  const title = firstName ? `${firstName}, where should we send your copies?` : 'Where should we send your copies?';

  useEffect(() => {
    if (data.country && !COUNTRIES.includes(data.country)) {
      setIsOtherCountry(true);
    }
  }, [data.country]);

  const update = (field: keyof ShippingData, value: string) => {
    onUpdate({ [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleAddressSelect = (addressComponents: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  }) => {
    const nextCountry = normalizeCountry(addressComponents.country);
    onUpdate({
      streetAddress: addressComponents.streetAddress,
      city: addressComponents.city,
      state: addressComponents.state,
      country: nextCountry,
      zipCode: addressComponents.zipCode,
    });
    if (nextCountry && !COUNTRIES.includes(nextCountry)) {
      setIsOtherCountry(true);
    }
    setErrors((prev) => ({
      ...prev,
      streetAddress: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    }));
  };

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!data.name.trim()) nextErrors.name = 'Name is required';
    if (!data.email.trim()) nextErrors.email = 'Email is required';
    if (!data.streetAddress.trim()) nextErrors.streetAddress = 'Street address is required';
    if (!data.city.trim()) nextErrors.city = 'City is required';
    if (!data.state.trim()) nextErrors.state = 'State is required';
    if (!data.country.trim()) nextErrors.country = 'Country is required';
    if (!data.zipCode.trim()) nextErrors.zipCode = 'Postal code is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onNext();
  };

  return (
    <div className="hc-fade-in hc-details-step" data-screen-label="01 Details">
      <div className="hc-section-head">
        <h1 className="hc-section-title">{title}</h1>
        <p className="hc-section-sub">We'll send copies to your preferred address after the magazine is finalized.</p>
      </div>

      <div className="hc-fields">
        <Field label="Full name" error={errors.name}>
          <input value={data.name} onChange={(event) => update('name', event.target.value)} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" value={data.email} onChange={(event) => update('email', event.target.value)} />
        </Field>
        <Field label="Street address" error={errors.streetAddress} className="hc-address-field">
          <AddressAutocomplete
            value={data.streetAddress}
            onChange={(value) => update('streetAddress', value)}
            onAddressSelect={handleAddressSelect}
            placeholder="Start typing your address..."
            label=""
            className="hc-address-autocomplete"
          />
        </Field>
        <div className="hc-grid-3">
          <Field label="City" error={errors.city}>
            <input value={data.city} onChange={(event) => update('city', event.target.value)} />
          </Field>
          <Field label="State" error={errors.state}>
            <input value={data.state} onChange={(event) => update('state', event.target.value)} />
          </Field>
          <Field label="Postal code" error={errors.zipCode}>
            <input value={data.zipCode} onChange={(event) => update('zipCode', event.target.value)} />
          </Field>
        </div>
        <Field label="Country" error={errors.country} className="hc-country-field hc-select-field">
          {!isOtherCountry ? (
            <Select
              value={data.country}
              onValueChange={(value) => {
                if (value === 'Other') {
                  setIsOtherCountry(true);
                  update('country', '');
                } else {
                  update('country', value);
                }
              }}
            >
              <SelectTrigger className="hc-select-trigger">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="hc-select-content">
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country} className="hc-select-item">
                    {getCountryDisplayName(country)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <>
              <input value={data.country} onChange={(event) => update('country', event.target.value)} placeholder="Enter your country" />
              <button
                type="button"
                className="hc-country-back"
                onClick={() => {
                  setIsOtherCountry(false);
                  update('country', 'United States');
                }}
              >
                Back to country list
              </button>
            </>
          )}
        </Field>
      </div>

      <div className="hc-step-footer">
        <div className="hc-footer-note">
          <Icon.Lock />
          <span>Encrypted. We use these details only to mail your issue.</span>
        </div>
        <button className="hc-btn lg" onClick={submit} disabled={loading}>
          {loading ? 'Saving...' : 'Looks good'}
          <span className="hc-arrow">
            <Icon.Arrow />
          </span>
        </button>
      </div>
    </div>
  );
}

function Field({
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

function AddonsStep({
  addons,
  selected,
  onToggle,
  onBack,
  onNext,
  layout,
  anchorPricing,
  socialProof,
  customerName,
}: {
  addons: EnrichedAddon[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  layout: AddonLayout;
  anchorPricing: boolean;
  socialProof: boolean;
  customerName: string;
}) {
  const firstName = customerName.trim().split(/\s+/)[0];
  const title = firstName ? `${firstName}, make this issue do more.` : 'Make this issue do more.';

  return (
    <div className="hc-fade-in" data-screen-label="02 Customize">
      <div className="hc-section-head">
        <h1 className="hc-section-title">{title}</h1>
        <p className="hc-section-sub">Your order is set. These extras attach to the same buy. Tap to add, remove any time before paying.</p>
      </div>

      {addons.length === 0 && <p className="hc-section-sub">No add-ons are available for this order.</p>}
      {addons.length > 0 && layout === 'bundle' && (
        <BundleLayout addons={addons} selected={selected} onToggle={onToggle} anchorPricing={anchorPricing} socialProof={socialProof} />
      )}
      {addons.length > 0 && layout === 'carousel' && (
        <CarouselLayout addons={addons} selected={selected} onToggle={onToggle} anchorPricing={anchorPricing} socialProof={socialProof} />
      )}

      <div className="hc-step-footer">
        <button className="hc-link-btn" onClick={onBack}>
          <Icon.Back /> Back
        </button>
        <button className="hc-btn lg" onClick={onNext}>
          Continue to payment
          <span className="hc-arrow">
            <Icon.Arrow />
          </span>
        </button>
      </div>
    </div>
  );
}

function BundleLayout({
  addons,
  selected,
  onToggle,
  anchorPricing,
  socialProof,
}: {
  addons: EnrichedAddon[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  anchorPricing: boolean;
  socialProof: boolean;
}) {
  const [hero, ...rest] = addons;
  return (
    <div className="hc-addons">
      <AddonCard
        addon={hero}
        featured
        selected={!!selected[hero.id]}
        onToggle={() => onToggle(hero.id)}
        anchorPricing={anchorPricing}
        socialProof={socialProof}
      />
      {rest.map((addon) => (
        <AddonCard
          key={addon.id}
          addon={addon}
          selected={!!selected[addon.id]}
          onToggle={() => onToggle(addon.id)}
          anchorPricing={anchorPricing}
          socialProof={socialProof}
        />
      ))}
    </div>
  );
}

function AddonCard({
  addon,
  selected,
  onToggle,
  featured,
  anchorPricing,
  socialProof,
}: {
  addon: EnrichedAddon;
  selected: boolean;
  onToggle: () => void;
  featured?: boolean;
  anchorPricing: boolean;
  socialProof: boolean;
}) {
  // The card itself is the toggle target. We use a div-with-role rather than a
  // <button> so the shared Checkbox component (which renders its own button)
  // can be nested without invalid HTML. Keyboard handling mirrors a button.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };
  const cardProps = {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onToggle,
    onKeyDown: handleKeyDown,
    'aria-pressed': selected,
  };

  // The Checkbox forwards its own click; stop propagation so the outer
  // card's onClick doesn't fire a second time and immediately untoggle it.
  const checkbox = (
    <Checkbox
      checked={selected}
      onCheckedChange={() => onToggle()}
      onClick={(event) => event.stopPropagation()}
      className="hc-check"
      aria-label={`${selected ? 'Remove' : 'Add'} ${addon.title}`}
    />
  );

  if (featured) {
    return (
      <div {...cardProps} className={`hc-addon featured ${selected ? 'selected' : ''}`}>
        {addon.tag && <span className="hc-badge">{addon.tag}</span>}
        <img className="hc-feat-banner" src={addon.image} alt="" loading="lazy" />
        <span className="hc-feat-inner">
          <span className="hc-addon-body">
            <span className="hc-addon-title">{addon.title}</span>
            <span className="hc-desc">{renderRich(addon.shortDesc)}</span>
            {addon.detailLine && <span className="hc-desc-detail">{addon.detailLine}</span>}
            {socialProof && addon.socialProof && (
              <span className="hc-social-proof">
                <Icon.Trend />
                {addon.socialProof}
              </span>
            )}
          </span>
          <PriceColumn addon={addon} anchorPricing={anchorPricing} />
          {checkbox}
        </span>
      </div>
    );
  }

  return (
    <div {...cardProps} className={`hc-addon ${selected ? 'selected' : ''}`}>
      <img className="hc-thumb" src={addon.image} alt="" loading="lazy" />
      <span className="hc-addon-body">
        <span className="hc-addon-title">{addon.title}</span>
        <span className="hc-desc">{renderRich(addon.shortDesc)}</span>
        {addon.detailLine && <span className="hc-desc-detail">{addon.detailLine}</span>}
        {socialProof && addon.socialProof && (
          <span className="hc-social-proof">
            <Icon.Trend />
            {addon.socialProof}
          </span>
        )}
      </span>
      <PriceColumn addon={addon} anchorPricing={anchorPricing} />
      {checkbox}
    </div>
  );
}

function PriceColumn({ addon, anchorPricing }: { addon: EnrichedAddon; anchorPricing: boolean }) {
  return (
    <span className="hc-price-col">
      {anchorPricing && addon.anchor && <span className="hc-anchor">${fmt(addon.anchor)}</span>}
      <span className="hc-price">${fmt(addon.price)}</span>
      <span className="hc-per">{addon.per}</span>
      {addon.saveLabel && <span className="hc-save">{addon.saveLabel}</span>}
    </span>
  );
}

function CarouselLayout({
  addons,
  selected,
  onToggle,
  anchorPricing,
  socialProof,
}: {
  addons: EnrichedAddon[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  anchorPricing: boolean;
  socialProof: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const addon = addons[Math.min(index, addons.length - 1)];
  const paragraphs = addon.desc.split(/\n\s*\n/);
  const isSelected = !!selected[addon.id];

  const go = (delta: number) => {
    setIndex((current) => (current + delta + addons.length) % addons.length);
    setExpanded(false);
  };

  return (
    <div className="hc-addon-carousel">
      <div className={`hc-carousel-card ${isSelected ? 'selected' : ''}`}>
        {addon.tag && <span className="hc-badge">{addon.tag}</span>}
        <img className="hc-carousel-img" src={addon.image} alt="" />
        <div className="hc-carousel-body">
          <div className="hc-carousel-top">
            <h3>{addon.title}</h3>
            <IncludedList items={addon.tags} />
            <div className="hc-carousel-text">
              {(expanded ? paragraphs : paragraphs.slice(0, 1)).map((paragraph, paragraphIndex, visible) => (
                <p key={paragraphIndex} className="hc-desc">
                  {renderRich(paragraph)}
                  {paragraphs.length > 1 && paragraphIndex === visible.length - 1 && (
                    <>
                      {' '}
                      <button className="hc-see-more" onClick={() => setExpanded((value) => !value)}>
                        {expanded ? 'See less' : 'See more'}
                      </button>
                    </>
                  )}
                </p>
              ))}
              {socialProof && addon.socialProof && (
                <div className="hc-social-proof">
                  <Icon.Trend />
                  {addon.socialProof}
                </div>
              )}
            </div>
          </div>
          <div className="hc-carousel-foot">
            <PriceColumn addon={addon} anchorPricing={anchorPricing} />
            <button className={`hc-addon-toggle ${isSelected ? 'selected' : ''}`} onClick={() => onToggle(addon.id)}>
              <span className="hc-addon-toggle-mark">{isSelected ? <Icon.Check /> : <Icon.Plus />}</span>
              {isSelected ? 'Added' : 'Add to order'}
            </button>
          </div>
          <div className="hc-carousel-nav">
            <button className="hc-carousel-nav-btn" onClick={() => go(-1)}>
              <Icon.Back />
              <span>Prev</span>
            </button>
            <div className="hc-carousel-dots">
              {addons.map((item, itemIndex) => (
                <button
                  key={item.id}
                  className={`hc-dot ${itemIndex === index ? 'active' : ''} ${selected[item.id] ? 'added' : ''}`}
                  aria-label={`Go to ${item.title}`}
                  onClick={() => {
                    setIndex(itemIndex);
                    setExpanded(false);
                  }}
                />
              ))}
              <span className="hc-carousel-count">
                {index + 1} of {addons.length}
              </span>
            </div>
            <button className="hc-carousel-nav-btn" onClick={() => go(1)}>
              <span>Next</span>
              <Icon.Arrow />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncludedList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="hc-included">
      <span className="hc-included-label">What's included</span>
      <ul className="hc-addon-checklist">
        {items.map((item) => (
          <li key={item}>
            <span className="hc-check-ico">
              <Icon.Check />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* TieredLayout, CompactLayout, FeatureLayout removed — only bundle and carousel are supported. */

function OrderSummary({
  deal,
  addons,
  selected,
  invoices,
  invoiceSelection,
  onInvoiceToggle,
  subtotal,
  total,
  currency,
  summaryNudge,
  isPayStep,
  onAddNudge,
  onToggleAnnual,
  onRemove,
}: {
  deal: Deal;
  addons: EnrichedAddon[];
  selected: Record<string, boolean>;
  invoices: Deal['invoices'];
  invoiceSelection: Record<string, boolean>;
  onInvoiceToggle: (id: string, selected: boolean) => void;
  subtotal: number;
  total: number;
  currency: string;
  summaryNudge: boolean;
  isPayStep: boolean;
  onAddNudge: (id: string) => void;
  onToggleAnnual: () => void;
  onRemove: (id: string) => void;
}) {
  const selectedAddons = addons.filter((addon) => selected[addon.id]);
  const annual = addons.find((addon) => addon.subscription);
  const annualSelected = !!annual && !!selected[annual.id];
  const processingFee = Math.max(0, total - subtotal);
  const [dollars, cents] = splitCents(total);
  const productName = deal.deal_products?.[0]?.name || deal.name || 'Placement';
  const issueLine = deal.invoices?.[0]?.invoice_num || deal.issue || deal.type;
  const nudgeAddon = addons.find((addon) => !addon.subscription && !selected[addon.id]);
  const visibleInvoices = invoices?.filter((invoice) => invoice.status !== 'Paid') || [];

  return (
    <aside className="hc-summary" data-screen-label="Order Summary">
      <h3>Order summary</h3>

      <div className="hc-product-head">
        <div className="hc-product-name">{productName}</div>
        {issueLine && <div className="hc-product-issue">{issueLine}</div>}
      </div>

      {visibleInvoices.length > 0 && (
        <div className="hc-invoice-list">
          {visibleInvoices.map((invoice) => {
            const id = invoice.id.toString();
            const checked = !!invoiceSelection[id];
            return (
              <div key={invoice.id} className="hc-summary-invoice">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => onInvoiceToggle(id, value === true)}
                  aria-label={invoice.invoice_num || 'Invoice'}
                />
                <span>
                  <strong>{invoice.invoice_num || 'Invoice'}</strong>
                  <small>{invoice.status}</small>
                </span>
                <b>{money(parseNumber(invoice.amount), currency)}</b>
              </div>
            );
          })}
        </div>
      )}

      {selectedAddons.map((addon) => (
        <div key={addon.id} className="hc-summary-addon">
          <div className="hc-line add-on">
            <span className="hc-lbl">
              {addon.title}
              {addon.subscription && <span className="hc-line-sub">billed monthly</span>}
              <button className="hc-line-remove" onClick={() => onRemove(addon.id)}>
                Remove
              </button>
            </span>
            <span>
              {money(addon.price, currency)}
              {addon.subscription && <span className="hc-per-mo">/mo</span>}
            </span>
          </div>
          {addon.tags.length > 0 && (
            <ul className="hc-summary-checklist">
              {addon.tags.slice(0, 6).map((item) => (
                <li key={item}>
                  <span className="hc-mini-check">
                    <Icon.Check />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {!annualSelected && isPayStep && annual && (
        <button type="button" className="hc-annual-switch" onClick={onToggleAnnual} aria-pressed="false">
          <span className="hc-cb" />
          <span className="hc-annual-switch-body">
            <strong>Pay Just {money(annual.price, currency)} Today</strong>
            <span className="hc-annual-switch-sub">
              The HAVEN Annual Partnership reserves your {annual.placementPhrase || 'ad'} in all 8 issues plus continuous digital promotion.
            </span>
            {annual.pitchBullets && (
              <span className="hc-annual-switch-checks">
                {annual.pitchBullets.map((item) => (
                  <span key={item} className="hc-mini-check-row">
                    <span className="hc-mini-check">
                      <Icon.Check />
                    </span>
                    {item}
                  </span>
                ))}
              </span>
            )}
          </span>
        </button>
      )}

      {/*
       * Only render this divider when we actually have content between the
       * head/invoice block and the totals. Otherwise the bottom border on
       * .hc-product-head (or .hc-invoice-list) already separates the totals,
       * and adding a second rule below it creates an empty gap.
       */}
      {(selectedAddons.length > 0 || (!annualSelected && isPayStep && annual)) && (
        <div className="hc-divider" />
      )}
      <div className="hc-line muted">
        <span className="hc-lbl">Subtotal</span>
        <span>{money(subtotal, currency)}</span>
      </div>
      <div className="hc-line muted">
        <span className="hc-lbl">Processing</span>
        <span>{processingFee > 0 ? money(processingFee, currency) : '$0'}</span>
      </div>

      <div className="hc-total">
        <span className="hc-lbl">Total</span>
        <span className="hc-amount">
          ${fmt(dollars)}
          <span className="hc-cents">.{cents}</span>
        </span>
      </div>

      {summaryNudge && nudgeAddon && (
        <div className="hc-nudge">
          <span className="hc-nudge-icon"><Icon.Plus /></span>
          <div className="hc-nudge-body">
            <span className="hc-nudge-lead">
              Add <strong>{nudgeAddon.title}</strong> for {money(nudgeAddon.price, currency)}
            </span>
            <span className="hc-nudge-proof">{nudgeAddon.socialProof || 'Popular with agents in your area'}</span>
            <button onClick={() => onAddNudge(nudgeAddon.id)}>Add to order</button>
          </div>
        </div>
      )}

      <div className="hc-footnote">
        Charged at confirmation. Placement is held while we send proofs. Receipts are emailed automatically.
      </div>
    </aside>
  );
}

function PaymentStep({
  data,
  onUpdate,
  onBack,
  total,
  currency,
  shippingData,
  addOns,
  invoices,
  deal,
  dealId,
  hasSubscriptionUpgrade,
}: {
  data: PaymentFields;
  onUpdate: (data: Partial<PaymentFields>) => void;
  onBack: () => void;
  total: number;
  currency: 'USD' | 'CAD';
  shippingData: ShippingData;
  addOns: Record<string, boolean>;
  invoices: Record<string, boolean>;
  deal: Deal;
  dealId: string;
  hasSubscriptionUpgrade: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isOtherBillingCountry, setIsOtherBillingCountry] = useState(false);
  const [orderId, setOrderId] = useState('');
  const clickedRef = useRef(false);
  const country = deal.mailing_address_country || shippingData.country || 'US';

  const {
    paymentRequest,
    canMakePayment,
    updatePaymentRequest,
    setPaymentMethodHandler,
    setErrorHandler,
  } = usePaymentRequest(currency, country);

  const selectedAddOns = useMemo(() => Object.keys(addOns || {}).filter((key) => addOns[key]), [addOns]);
  const selectedInvoices = useMemo(() => Object.keys(invoices || {}).filter((key) => invoices[key]), [invoices]);

  const submitToApi = useCallback(
    async (paymentMethodId: string, method: string) => {
      if (posthog) {
        posthog.capture(CheckoutEvents.PAYMENT_ATTEMPTED, {
          [CheckoutEventProperties.PAYMENT_METHOD]: method,
          [CheckoutEventProperties.TOTAL_AMOUNT]: total,
          [CheckoutEventProperties.CURRENCY]: currency,
          [CheckoutEventProperties.DEAL_ID]: dealId,
          [CheckoutEventProperties.CURRENT_STEP]: 'payment',
          [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
        });
      }

      try {
        setIsLoading(true);
        let result;
        if (method === 'check') {
          const chequeData: ChequePaymentData = {
            uuid: dealId,
            shipping_name: shippingData.name || null,
            shipping_email: shippingData.email || null,
            shipping_street_address: shippingData.streetAddress || null,
            shipping_city: shippingData.city || null,
            shipping_state: shippingData.state || null,
            shipping_zipcode: shippingData.zipCode || null,
            shipping_country: shippingData.country || null,
            billing_name: data.cardholderName || shippingData.name || null,
            billing_email: data.userEmail || shippingData.email || null,
            billing_street_address: data.useDifferentBilling ? data.billing_street_address || null : shippingData.streetAddress || null,
            billing_city: data.useDifferentBilling ? data.billing_city || null : shippingData.city || null,
            billing_state: data.useDifferentBilling ? data.billing_state || null : shippingData.state || null,
            billing_zipcode: data.useDifferentBilling ? data.billing_zipcode || null : shippingData.zipCode || null,
            billing_country: data.useDifferentBilling ? data.billing_country || null : shippingData.country || null,
            add_ons: selectedAddOns,
            invoice_ids: selectedInvoices,
          };
          result = await processChequePayment(chequeData);
        } else {
          const paymentData: ApiPaymentData = {
            uuid: dealId,
            payment_token: paymentMethodId,
            amount: total,
            shipping_name: shippingData.name || null,
            shipping_email: shippingData.email || null,
            shipping_street_address: shippingData.streetAddress || null,
            shipping_city: shippingData.city || null,
            shipping_state: shippingData.state || null,
            shipping_zipcode: shippingData.zipCode || null,
            shipping_country: shippingData.country || null,
            billing_name: data.cardholderName || shippingData.name || null,
            billing_email: data.userEmail || shippingData.email || null,
            billing_street_address: data.useDifferentBilling ? data.billing_street_address || null : shippingData.streetAddress || null,
            billing_city: data.useDifferentBilling ? data.billing_city || null : shippingData.city || null,
            billing_state: data.useDifferentBilling ? data.billing_state || null : shippingData.state || null,
            billing_zipcode: data.useDifferentBilling ? data.billing_zipcode || null : shippingData.zipCode || null,
            billing_country: data.useDifferentBilling ? data.billing_country || null : shippingData.country || null,
            add_ons: selectedAddOns,
            invoice_ids: selectedInvoices,
          };
          result = await processPayment(paymentData);
        }

        if (result?.order_id) {
          setOrderId(result.order_id);
          setShowSuccessPopup(true);
          if (posthog) {
            posthog.capture(CheckoutEvents.PAYMENT_SUCCEEDED, {
              [CheckoutEventProperties.PAYMENT_METHOD]: method,
              [CheckoutEventProperties.TOTAL_AMOUNT]: total,
              [CheckoutEventProperties.CURRENCY]: currency,
              [CheckoutEventProperties.DEAL_ID]: dealId,
              [CheckoutEventProperties.CURRENT_STEP]: 'payment',
              order_id: result.order_id,
              [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
            });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
        setErrors({ payment: message });
        if (posthog) {
          posthog.capture(CheckoutEvents.PAYMENT_FAILED, {
            [CheckoutEventProperties.PAYMENT_METHOD]: method,
            [CheckoutEventProperties.TOTAL_AMOUNT]: total,
            [CheckoutEventProperties.CURRENCY]: currency,
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.CURRENT_STEP]: 'payment',
            [CheckoutEventProperties.ERROR_TYPE]: 'payment_processing_failed',
            [CheckoutEventProperties.ERROR_MESSAGE]: message,
            [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [currency, data, dealId, posthog, selectedAddOns, selectedInvoices, shippingData, total],
  );

  useEffect(() => {
    setPaymentMethodHandler(submitToApi);
  }, [setPaymentMethodHandler, submitToApi]);

  useEffect(() => {
    setErrorHandler((error: string) => setErrors({ payment: error }));
  }, [setErrorHandler]);

  useEffect(() => {
    if (total > 0) updatePaymentRequest(total);
  }, [total, updatePaymentRequest]);

  useEffect(() => {
    const updates: Partial<PaymentFields> = {};
    if (data.userEmail == null) updates.userEmail = shippingData.email || '';
    if (data.cardholderName == null) updates.cardholderName = shippingData.name || '';
    if (!data.method) updates.method = 'card';
    if (Object.keys(updates).length) onUpdate(updates);
  }, []);

  const handleCardPayment = async () => {
    if (!stripe || !elements || isLoading || clickedRef.current) return;
    if (total <= 0 && !hasSubscriptionUpgrade) {
      setErrors({ payment: 'Cannot complete order with zero total amount. Please select items or contact support.' });
      return;
    }
    if (!data.userEmail?.trim()) {
      setErrors({ userEmail: 'Email is required' });
      return;
    }
    if (!data.cardholderName?.trim()) {
      setErrors({ cardholderName: 'Cardholder name is required' });
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    clickedRef.current = true;
    setIsLoading(true);
    setErrors({});
    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name: data.cardholderName, email: data.userEmail || shippingData.email },
      });
      if (error || !paymentMethod) {
        setErrors({ payment: error?.message || 'Payment failed. Please check your card and try again.' });
        return;
      }
      onUpdate({ paymentMethodId: paymentMethod.id, method: 'card' });
      await submitToApi(paymentMethod.id, 'card');
    } catch (error) {
      setErrors({ payment: error instanceof Error ? error.message : 'Payment processing failed. Please try again.' });
    } finally {
      clickedRef.current = false;
      setIsLoading(false);
    }
  };

  const submit = () => {
    setErrors({});
    if (data.method === 'check') {
      if (total <= 0 && !hasSubscriptionUpgrade) {
        setErrors({ payment: 'Cannot complete order with zero total amount. Please select items or contact support.' });
        return;
      }
      submitToApi('', 'check');
      return;
    }
    handleCardPayment();
  };

  const payLabel =
    isLoading ? 'Processing...' : data.method === 'check' ? `Confirm ${money(total, currency)}` : total > 0 ? `Pay ${money(total, currency)}` : 'Complete Order';

  const handleBillingAddressSelect = (addressComponents: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  }) => {
    const nextCountry = normalizeCountry(addressComponents.country);
    onUpdate({
      billing_street_address: addressComponents.streetAddress,
      billing_city: addressComponents.city,
      billing_state: addressComponents.state,
      billing_country: nextCountry,
      billing_zipcode: addressComponents.zipCode,
    });
    if (nextCountry && !COUNTRIES.includes(nextCountry)) {
      setIsOtherBillingCountry(true);
    }
  };

  return (
    <div className="hc-fade-in" data-screen-label="03 Payment">
      <div className="hc-section-head">
        <h1 className="hc-section-title">One last step.</h1>
        <p className="hc-section-sub">Charged when you confirm. Receipts go to {data.userEmail || shippingData.email || 'your email'}.</p>
      </div>

      {paymentRequest && canMakePayment && total > 0 && (
        <>
          <div className="hc-wallet-slot">
            <PaymentRequestButtonElement
              options={{
                paymentRequest,
                style: {
                  paymentRequestButton: {
                    type: 'default',
                    theme: 'dark',
                    height: '44px',
                  },
                },
              }}
            />
          </div>
          <div className="hc-pay-divider">or pay another way</div>
        </>
      )}

      <div className="hc-pay-tabs">
        <button className={`hc-tab ${data.method !== 'check' ? 'active' : ''}`} onClick={() => onUpdate({ method: 'card' })}>
          Card
        </button>
        <button className={`hc-tab ${data.method === 'check' ? 'active' : ''}`} onClick={() => onUpdate({ method: 'check' })}>
          Check
        </button>
      </div>

      <div className="hc-payment-fields">
        <Field label="Email for receipt" error={errors.userEmail}>
          <input type="email" value={data.userEmail || ''} onChange={(event) => onUpdate({ userEmail: event.target.value })} />
        </Field>

        {data.method !== 'check' && (
          <>
            <Field label="Card information" error={errors.card}>
              <div className={`hc-card-field ${focused ? 'focused' : ''} ${errors.payment ? 'has-error' : ''}`}>
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: '17px',
                        color: '#2f2f2d',
                        fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
                        '::placeholder': { color: '#9b9994' },
                      },
                      invalid: { color: '#a73535' },
                    },
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(event) => setErrors((prev) => ({ ...prev, payment: event.error?.message || '' }))}
                />
              </div>
            </Field>
            <Field label="Cardholder name" error={errors.cardholderName}>
              <input value={data.cardholderName || ''} onChange={(event) => onUpdate({ cardholderName: event.target.value })} />
            </Field>
            <button
              type="button"
              className={`hc-checkbox-row ${data.useDifferentBilling ? '' : 'on'}`}
              onClick={() => onUpdate({ useDifferentBilling: !data.useDifferentBilling })}
            >
              <span className="hc-cb" />
              Billing address matches mailing address
            </button>
            {data.useDifferentBilling && (
              <div className="hc-fade-in hc-fields">
                <Field label="Billing street address" className="hc-address-field">
                  <AddressAutocomplete
                    value={data.billing_street_address || ''}
                    onChange={(value) => onUpdate({ billing_street_address: value })}
                    onAddressSelect={handleBillingAddressSelect}
                    placeholder="Start typing your billing address..."
                    label=""
                    className="hc-address-autocomplete"
                  />
                </Field>
                <div className="hc-grid-3">
                  <Field label="City">
                    <input value={data.billing_city || ''} onChange={(event) => onUpdate({ billing_city: event.target.value })} />
                  </Field>
                  <Field label="State">
                    <input value={data.billing_state || ''} onChange={(event) => onUpdate({ billing_state: event.target.value })} />
                  </Field>
                  <Field label="Postal code">
                    <input value={data.billing_zipcode || ''} onChange={(event) => onUpdate({ billing_zipcode: event.target.value })} />
                  </Field>
                </div>
                <Field label="Country" className="hc-country-field hc-select-field">
                  {!isOtherBillingCountry ? (
                    <Select
                      value={data.billing_country || ''}
                      onValueChange={(value) => {
                        if (value === 'Other') {
                          setIsOtherBillingCountry(true);
                          onUpdate({ billing_country: '' });
                        } else {
                          onUpdate({ billing_country: value });
                        }
                      }}
                    >
                      <SelectTrigger className="hc-select-trigger">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="hc-select-content">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country} className="hc-select-item">
                            {getCountryDisplayName(country)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <input
                        value={data.billing_country || ''}
                        onChange={(event) => onUpdate({ billing_country: event.target.value })}
                        placeholder="Enter your country"
                      />
                      <button
                        type="button"
                        className="hc-country-back"
                        onClick={() => {
                          setIsOtherBillingCountry(false);
                          onUpdate({ billing_country: 'United States' });
                        }}
                      >
                        Back to country list
                      </button>
                    </>
                  )}
                </Field>
              </div>
            )}
          </>
        )}

        {data.method === 'check' && (
          <div className="hc-check-instructions hc-fade-in">
            <p className="hc-check-lead">Please send your check to:</p>
            <address className="hc-check-address">
              HAVEN
              <br />
              33 Irving Pl, 3rd Floor
              <br />
              New York, NY 10003
              <br />
              United States
            </address>
            <p className="hc-check-payable">
              Make checks payable to <strong>HAVEN | FINE</strong>
            </p>
          </div>
        )}
      </div>

      {(errors.payment || errors.api || errors.card) && <div className="hc-payment-error">{errors.payment || errors.api || errors.card}</div>}

      <div className="hc-step-footer">
        <button className="hc-link-btn" onClick={onBack}>
          <Icon.Back /> Back
        </button>
        <button
          className="hc-btn accent lg"
          onClick={submit}
          disabled={isLoading || (data.method !== 'check' && (!stripe || !elements)) || (total === 0 && !hasSubscriptionUpgrade)}
        >
          {payLabel}
          <span className="hc-arrow">
            <Icon.Arrow />
          </span>
        </button>
      </div>

      <p className="hc-legal">
        By confirming, you agree to our{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
        .
      </p>

      <SuccessPopup
        isVisible={showSuccessPopup}
        orderId={orderId}
        onClose={() => {
          setShowSuccessPopup(false);
          if (orderId) navigate(`/order-confirmed/${orderId}?dealId=${dealId}`);
        }}
      />
    </div>
  );
}

const emptyFormData: CheckoutFormData = {
  shipping: {
    name: '',
    email: '',
    streetAddress: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
  },
  addOns: {},
  invoices: {},
  payment: {
    method: 'card',
  },
};

const getSelectedInvoiceTotal = (deal: Deal, invoices: Record<string, boolean>) => {
  if (!deal.invoices?.length) return 0;
  return deal.invoices
    .filter((invoice) => invoices[invoice.id.toString()] && invoice.status !== 'Paid')
    .reduce((sum, invoice) => sum + parseNumber(invoice.amount), 0);
};

interface RedesignedPaymentFormProps {
  defaultLayout?: AddonLayout;
  defaultTheme?: CheckoutTheme;
  defaultSocialProof?: boolean;
  defaultSummaryNudge?: boolean;
}

export default function RedesignedPaymentForm({
  defaultLayout = 'bundle',
  defaultTheme = 'modern',
  defaultSocialProof = false,
  defaultSummaryNudge = true,
}: RedesignedPaymentFormProps = {}) {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const layout = readLayout(searchParams.get('layout'), defaultLayout);
  const theme = readTheme(searchParams.get('theme'), defaultTheme);
  const anchorPricing = searchParams.get('anchorPricing') !== 'false';
  const socialProof = searchParams.has('socialProof') ? searchParams.get('socialProof') === 'true' : defaultSocialProof;
  const summaryNudge = searchParams.has('summaryNudge') ? searchParams.get('summaryNudge') !== 'false' : defaultSummaryNudge;
  const canonicalStep = validStep(searchParams.get('step'));

  const [currentStep, setCurrentStep] = useState<CheckoutStep>(canonicalStep);
  const [dealsData, setDealsData] = useState<Deal | null>(null);
  const [formData, setFormData] = useState<CheckoutFormData>(emptyFormData);
  const [loading, setLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);
  const [stepStartTime, setStepStartTime] = useState<Date>(new Date());
  const hasLoadedData = useRef(false);
  const initialShipping = useRef<ShippingData | null>(null);
  const posthog = usePostHog();

  useEffect(() => {
    if (canonicalStep !== currentStep) {
      setCurrentStep(canonicalStep);
      setStepStartTime(new Date());
    }
  }, [canonicalStep, currentStep]);

  useEffect(() => {
    if (hasLoadedData.current) return;

    const loadDealsData = async () => {
      try {
        setLoading(true);
        hasLoadedData.current = true;
        const response = await fetchDealsData(dealId);
        const deal = response.deal;
        setDealsData(deal);

        const initialAddOns: Record<string, boolean> = {};
        deal.add_ons.forEach((addon) => {
          initialAddOns[addon.id.toString()] = false;
        });
        const savedAddOns = localStorage.getItem(`checkout_addons_${dealId}`);
        if (savedAddOns) {
          try {
            const parsed = JSON.parse(savedAddOns) as Record<string, boolean>;
            Object.keys(parsed).forEach((addonId) => {
              if (addonId in initialAddOns) initialAddOns[addonId] = parsed[addonId];
            });
          } catch (error) {
            console.error('Failed to parse saved add-ons:', error);
          }
        }

        const initialInvoices: Record<string, boolean> = {};
        deal.invoices.forEach((invoice) => {
          initialInvoices[invoice.id.toString()] = invoice.status !== 'Paid';
        });

        const contactFullName = [deal.contact_first_name, deal.contact_last_name].filter(Boolean).join(' ');
        const shipping = {
          name: contactFullName || '',
          email: deal.contact_email || '',
          streetAddress: deal.mailing_address_street || '',
          city: deal.mailing_address_city || '',
          state: deal.mailing_address_state || '',
          country: normalizeCountry(deal.mailing_address_country || ''),
          zipCode: deal.mailing_address_zipcode || '',
        };
        initialShipping.current = shipping;

        setFormData({
          shipping,
          addOns: initialAddOns,
          invoices: initialInvoices,
          payment: {
            method: 'card',
            userEmail: shipping.email,
            cardholderName: shipping.name,
          },
        });

        if (posthog) {
          posthog.identify(deal.contact_email || `deal_${dealId}`, {
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.DEAL_TYPE]: deal.type,
            [CheckoutEventProperties.CURRENCY]: deal.currency,
            [CheckoutEventProperties.COUNTRY]: deal.mailing_address_country,
            name: deal.name,
            contact_email: deal.contact_email,
          });
          posthog.capture(CheckoutEvents.CHECKOUT_PAGE_VIEW, {
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.DEAL_TYPE]: deal.type,
            [CheckoutEventProperties.CURRENCY]: deal.currency,
            [CheckoutEventProperties.CURRENT_STEP]: canonicalStep,
            [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
          });
        }
      } catch (error) {
        console.error('API Error:', error);
        setShowNotFound(true);
        if (posthog) {
          posthog.capture(CheckoutEvents.API_ERROR, {
            [CheckoutEventProperties.ERROR_TYPE]: 'deals_data_load_failed',
            [CheckoutEventProperties.ERROR_MESSAGE]: error instanceof Error ? error.message : 'Unknown error',
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadDealsData();
  }, [canonicalStep, dealId, posthog]);

  const handleStepChange = useCallback(
    (nextStep: CheckoutStep) => {
      const now = new Date();
      const timeSpent = now.getTime() - stepStartTime.getTime();

      if (posthog) {
        posthog.capture(CheckoutEvents.CHECKOUT_STEP_TRANSITION, {
          [CheckoutEventProperties.DEAL_ID]: dealId,
          [CheckoutEventProperties.FROM_STEP]: currentStep,
          [CheckoutEventProperties.TO_STEP]: nextStep,
          [CheckoutEventProperties.TIME_SPENT_MS]: timeSpent,
          [CheckoutEventProperties.TIME_SPENT_SECONDS]: Math.round(timeSpent / 1000),
          [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
        });
      }

      setCurrentStep(nextStep);
      setStepStartTime(now);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('step', nextStep);
      nextParams.delete('flow');
      navigate({ search: nextParams.toString() });
    },
    [currentStep, dealId, navigate, posthog, searchParams, stepStartTime],
  );

  const updateFormData = useCallback(
    <K extends keyof CheckoutFormData>(section: K, data: Partial<CheckoutFormData[K]>) => {
      setFormData((prev) => {
        const currentSection = prev[section];
        const nextFormData = {
          ...prev,
          [section]: typeof currentSection === 'object' && currentSection !== null ? { ...currentSection, ...data } : data,
        } as CheckoutFormData;

        if (section === 'addOns' && dealId) {
          localStorage.setItem(`checkout_addons_${dealId}`, JSON.stringify(nextFormData.addOns));
        }

        if (posthog && dealsData) {
          if (section === 'addOns') {
            Object.keys(data as Record<string, boolean>).forEach((addonId) => {
              const addon = dealsData.add_ons.find((item) => item.id.toString() === addonId);
              if (!addon) return;
              const wasSelected = prev.addOns[addonId];
              const nowSelected = (data as Record<string, boolean>)[addonId];
              if (wasSelected !== nowSelected) {
                posthog.capture(nowSelected ? CheckoutEvents.ADDON_SELECTED : CheckoutEvents.ADDON_DESELECTED, {
                  [CheckoutEventProperties.ADDON_ID]: addonId,
                  [CheckoutEventProperties.ADDON_TITLE]: addon.title,
                  [CheckoutEventProperties.ADDON_AMOUNT]: addon.amount,
                  [CheckoutEventProperties.DEAL_ID]: dealId,
                  [CheckoutEventProperties.CURRENT_STEP]: currentStep,
                  [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
                });
              }
            });
          } else if (section === 'invoices') {
            Object.keys(data as Record<string, boolean>).forEach((invoiceId) => {
              const invoice = dealsData.invoices.find((item) => item.id.toString() === invoiceId);
              if (!invoice) return;
              const wasSelected = prev.invoices[invoiceId];
              const nowSelected = (data as Record<string, boolean>)[invoiceId];
              if (wasSelected !== nowSelected) {
                posthog.capture(nowSelected ? CheckoutEvents.INVOICE_SELECTED : CheckoutEvents.INVOICE_DESELECTED, {
                  [CheckoutEventProperties.INVOICE_ID]: invoiceId,
                  [CheckoutEventProperties.INVOICE_AMOUNT]: invoice.amount,
                  [CheckoutEventProperties.DEAL_ID]: dealId,
                  [CheckoutEventProperties.CURRENT_STEP]: currentStep,
                  [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
                });
              }
            });
          } else if (section === 'payment' && (data as Partial<PaymentFields>).method) {
            posthog.capture(CheckoutEvents.PAYMENT_METHOD_CHANGED, {
              [CheckoutEventProperties.PAYMENT_METHOD]: (data as Partial<PaymentFields>).method,
              [CheckoutEventProperties.DEAL_ID]: dealId,
              [CheckoutEventProperties.CURRENT_STEP]: currentStep,
              [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
            });
          }
        }

        return nextFormData;
      });
    },
    [currentStep, dealId, dealsData, posthog],
  );

  const availableAddOns = useMemo(() => {
    if (!dealsData?.add_ons) return [];
    return dealsData.add_ons
      .filter((addon) => !(dealsData.type === 'One Time' && dealsData.has_active_subscription && addon.type === 'Subscription'))
      .map(enrichAddon);
  }, [dealsData]);

  const getProcessingFeeRate = useCallback(
    (country: string) => {
      if (dealsData?.processing_fee_exempt) return 0;
      const normalizedCountry = country.toLowerCase().trim();
      return ['usa', 'us', 'united states', 'united states of america'].includes(normalizedCountry) ? 0.029 : 0.024;
    },
    [dealsData?.processing_fee_exempt],
  );

  const subtotal = useMemo(() => {
    if (!dealsData) return 0;
    let transactionAmount = 0;

    if (dealsData.type === 'One Time') {
      const invoiceTotal = getSelectedInvoiceTotal(dealsData, formData.invoices);
      transactionAmount = invoiceTotal > 0 ? invoiceTotal : dealsData.invoices?.length ? 0 : dealsData.amount || 0;
    } else if (dealsData.type === 'Subscription') {
      if (dealsData.has_active_subscription) {
        transactionAmount = getSelectedInvoiceTotal(dealsData, formData.invoices);
      } else {
        transactionAmount = dealsData.monthly_subscription_price || 0;
      }
    } else {
      transactionAmount = dealsData.amount || 0;
    }

    if (dealsData.add_ons) {
      const selectedAddOns = dealsData.add_ons.filter((addon) => formData.addOns[addon.id.toString()]);
      if (selectedAddOns.length > 0) {
        if (dealsData.has_active_subscription) {
          transactionAmount += selectedAddOns.reduce((sum, addon) => {
            if (addon.type === 'Subscription') return sum;
            return sum + parseNumber(addon.amount);
          }, 0);
        } else if (selectedAddOns.length > 1) {
          transactionAmount = selectedAddOns.reduce((sum, addon) => sum + parseNumber(addon.amount), 0);
        } else {
          const addon = selectedAddOns[0];
          if (addon.pricing_behavior?.toLowerCase() === 'add') {
            transactionAmount += parseNumber(addon.amount);
          } else {
            transactionAmount = parseNumber(addon.amount);
          }
        }
      }
    }

    return transactionAmount;
  }, [dealsData, formData.addOns, formData.invoices]);

  const total = useMemo(() => {
    if (!dealsData || subtotal <= 0) return 0;
    if (dealsData.type === 'Subscription' && !dealsData.has_active_subscription) return parseFloat(subtotal.toFixed(2));
    if (dealsData.type === 'Subscription' && dealsData.has_active_subscription) {
      if (formData.payment.method === 'check') return parseFloat(subtotal.toFixed(2));
      return parseFloat((subtotal * (1 + getProcessingFeeRate(formData.shipping.country || ''))).toFixed(2));
    }
    if (dealsData.type === 'One Time') {
      if (formData.payment.method === 'check' || Object.values(formData.addOns).some(Boolean)) return parseFloat(subtotal.toFixed(2));
      return parseFloat((subtotal * (1 + getProcessingFeeRate(formData.shipping.country || ''))).toFixed(2));
    }
    return parseFloat(subtotal.toFixed(2));
  }, [dealsData, formData.addOns, formData.payment.method, formData.shipping.country, getProcessingFeeRate, subtotal]);

  const handleShippingNext = async () => {
    if (!dealId) return;
    const changed = JSON.stringify(initialShipping.current) !== JSON.stringify(formData.shipping);
    if (changed) {
      try {
        setSavingAddress(true);
        await saveAddress({
          uuid: dealId,
          shipping_street_address: formData.shipping.streetAddress,
          shipping_city: formData.shipping.city,
          shipping_state: formData.shipping.state,
          shipping_zipcode: formData.shipping.zipCode,
          shipping_country: formData.shipping.country,
        });
        initialShipping.current = formData.shipping;
      } catch (error) {
        console.error('Failed to save address:', error);
      } finally {
        setSavingAddress(false);
      }
    }
    handleStepChange('addons');
  };

  const toggleAddon = (id: string) => updateFormData('addOns', { [id]: !formData.addOns[id] });
  const hasSubscriptionUpgrade = !!(
    dealsData?.has_active_subscription &&
    dealsData.add_ons?.some((addon) => addon.type === 'Subscription' && formData.addOns[addon.id.toString()])
  );

  if (loading) {
    return (
      <div className="hc-redesign hc-loading" data-theme={theme}>
        <img className="hc-loading-logo" src="/logo-final.png" alt="HAVEN" />
        <div className="hc-spinner" />
        <p>Loading your checkout...</p>
      </div>
    );
  }

  if (showNotFound || !dealsData) return <NotFound />;

  const isPaymentStep = currentStep === 'payment';
  const showSummary = currentStep !== 'shipping';
  const currency = (dealsData.currency as 'USD' | 'CAD') || 'USD';

  return (
    <div className="hc-redesign" data-theme={theme}>
      <Topbar />
      <Stepper currentStep={currentStep} onJump={handleStepChange} />

      <div className={`hc-layout ${currentStep === 'shipping' ? 'solo' : ''}`}>
        <main className="hc-main-pane">
          {currentStep === 'shipping' && (
            <DetailsStep
              data={formData.shipping}
              onUpdate={(data) => updateFormData('shipping', data)}
              onNext={handleShippingNext}
              loading={savingAddress}
            />
          )}

          {currentStep === 'addons' && (
            <AddonsStep
              addons={availableAddOns}
              selected={formData.addOns}
              onToggle={toggleAddon}
              onBack={() => handleStepChange('shipping')}
              onNext={() => handleStepChange('payment')}
              layout={layout}
              anchorPricing={anchorPricing}
              socialProof={socialProof}
              customerName={formData.shipping.name}
            />
          )}

          {isPaymentStep && (
            <PaymentStep
              data={formData.payment}
              onUpdate={(data) => updateFormData('payment', data)}
              onBack={() => handleStepChange('addons')}
              total={total}
              currency={currency}
              shippingData={formData.shipping}
              addOns={formData.addOns}
              invoices={formData.invoices}
              deal={dealsData}
              dealId={dealId || ''}
              hasSubscriptionUpgrade={hasSubscriptionUpgrade}
            />
          )}
        </main>

        {showSummary && (
          <OrderSummary
            deal={dealsData}
            addons={availableAddOns}
            selected={formData.addOns}
            invoices={dealsData.invoices}
            invoiceSelection={formData.invoices}
            onInvoiceToggle={(id, selectedInvoice) => updateFormData('invoices', { [id]: selectedInvoice })}
            subtotal={subtotal}
            total={total}
            currency={currency}
            summaryNudge={summaryNudge}
            isPayStep={isPaymentStep}
            onAddNudge={toggleAddon}
            onToggleAnnual={() => {
              const annual = availableAddOns.find((addon) => addon.subscription);
              if (annual) toggleAddon(annual.id);
            }}
            onRemove={toggleAddon}
          />
        )}
      </div>
    </div>
  );
}
