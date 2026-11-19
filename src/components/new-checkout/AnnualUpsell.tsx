import { useEffect, useState } from 'react';
import { Check, Minus, ArrowUpRight, ChevronDown } from 'lucide-react';
import { Icon, fmt } from './shared';
import { ANNUAL_PLACEMENT_COPY, type AnnualPlacement } from '@/lib/annualPlacement';
import '@/components/checkout-redesign.css';

/**
 * "Year-Round Reach" annual upsell — presentational. Reframes a one-time invoice
 * as an 8-issue Annual Partnership. Rendered both as the standalone /year-round
 * design route and as the in-flow interstitial in RedesignedPaymentForm.
 *
 * Pricing is passed in, read straight off the deal:
 *   fromPrice = the one-time invoice amount        (e.g. 395 / 495)
 *   toPrice   = the annual add-on's monthly amount (e.g. 195 / 250)
 *
 * `placement` picks the size-specific wording (full page, two-page spread, half
 * page, 1/6 page, cover wrap …) from lib/annualPlacement.ts.
 */

export interface AnnualUpsellProps {
  firstName?: string;
  invoiceNum?: string;
  fromPrice: number;
  toPrice: number;
  /** Which placement the plan is for — drives the size wording and the comparison lists. */
  placement?: AnnualPlacement;
  onUpgrade: () => void;
  onDecline: () => void;
  /** Personalized copy fades in when the deal data is ready (avoids a name-jump
   *  on the async standalone route). In-flow the data is already loaded → true. */
  ready?: boolean;
  /** Show the comparison open on arrival, in the tighter layout (A/B test arm). */
  compareOpen?: boolean;
  /** Fired when the customer opens or closes the comparison. */
  onCompareToggle?: (open: boolean) => void;
}

const COVERS = [
  { src: '/checkout-redesign/assets/covers/mag-1.jpg', cls: 'a', delay: '0ms' },
  { src: '/checkout-redesign/assets/covers/mag-2.jpg', cls: 'b', delay: '80ms' },
  { src: '/checkout-redesign/assets/covers/mag-3.jpg', cls: 'c', delay: '160ms' },
  { src: '/checkout-redesign/assets/covers/mag-4.jpg', cls: 'd', delay: '240ms' },
];

export default function AnnualUpsell({
  firstName,
  invoiceNum,
  fromPrice,
  toPrice,
  placement = 'full',
  onUpgrade,
  onDecline,
  ready = true,
  compareOpen = false,
  onCompareToggle,
}: AnnualUpsellProps) {
  const copy = ANNUAL_PLACEMENT_COPY[placement] ?? ANNUAL_PLACEMENT_COPY.full;
  const [expanded, setExpanded] = useState(compareOpen);
  const [selected, setSelected] = useState<'annual' | 'single'>('annual');

  return (
    <div className={`hc-redesign yr ${compareOpen ? 'yr--compare-open' : ''}`} data-theme="modern">
      <nav className="yr-nav">
        <img className="yr-wordmark" src="/logo-final.png" alt="Haven Lifestyles" />
        <div className="yr-nav-meta">
          {invoiceNum && <span className="yr-nav-invoice">Invoice {invoiceNum}</span>}
          {invoiceNum && <span className="yr-dot" aria-hidden="true" />}
          <span>Checkout</span>
        </div>
      </nav>

      <section className="yr-hero">
        <div className="yr-hero-head">
          <h1 className="yr-title">
            <span className="yr-title-lead">
              <span className="yr-title-l1">Drop your payment</span>{' '}
              <span className="yr-title-l2">
                to <span className="yr-price-hl">${fmt(toPrice)}/mo</span>.
              </span>
            </span>
            <span className="yr-title-sub">Be in every issue.</span>
          </h1>
          <div className={`yr-lede ${ready ? 'is-in' : ''}`}>
            <p>
              {firstName ? `${firstName}, switch` : 'Switch'} your single placement to an annual
              partnership and your invoice today drops from ${fmt(fromPrice)} to ${fmt(toPrice)}/mo.{' '}
              {copy.runsLine}
            </p>
            <p className="yr-lede-kicker">Your clients see HAVEN all year. Make sure they see you.</p>
          </div>
        </div>

        <div className="yr-compare">
          <button
            type="button"
            className="yr-compare-toggle"
            aria-expanded={expanded}
            onClick={() => {
              const next = !expanded;
              setExpanded(next);
              onCompareToggle?.(next);
            }}
          >
            <span className="yr-compare-toggle-label">
              {expanded ? 'Hide the comparison' : "See everything that's included"}
            </span>
            <ChevronDown className={`yr-compare-chev ${expanded ? 'open' : ''}`} strokeWidth={1.75} />
          </button>

          <div className={`yr-compare-wrap ${expanded ? 'open' : ''}`}>
            <div className="yr-compare-inner">
              <div className="yr-compare-body">
                <div className="yr-compare-grid">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected === 'single'}
                    className={`yr-compare-col ${selected === 'single' ? 'selected' : ''}`}
                    onClick={() => setSelected('single')}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setSelected('single');
                      }
                    }}
                  >
                    <span className="yr-compare-eyebrow">Pay the invoice</span>
                    <div className="yr-compare-price">
                      <span className="yr-compare-amt">${fmt(fromPrice)}</span>
                      <span className="yr-compare-per">once</span>
                    </div>
                    <p className="yr-compare-sub">Just this issue</p>
                    <ul className="yr-compare-list">
                      {copy.single.map((item) => (
                        <li key={item}>
                          <Minus className="yr-compare-ic neutral" strokeWidth={2} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected === 'annual'}
                    className={`yr-compare-col annual ${selected === 'annual' ? 'selected' : ''}`}
                    onClick={() => setSelected('annual')}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setSelected('annual');
                      }
                    }}
                  >
                    <span className="yr-compare-badge">Make the switch</span>
                    <span className="yr-compare-eyebrow">Annual Partnership</span>
                    <div className="yr-compare-price">
                      <span className="yr-compare-amt">
                        ${fmt(toPrice)}
                        <em>/mo</em>
                      </span>
                    </div>
                    <p className="yr-compare-sub">Today’s charge is month one</p>
                    <ul className="yr-compare-list">
                      {copy.included.map((item) => (
                        <li key={item}>
                          <Check className="yr-compare-ic positive" strokeWidth={2.5} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="yr-covers" aria-hidden="true">
          <div className="yr-covers-stage">
            {COVERS.map((c) => (
              <div key={c.src} className={`yr-cover ${c.cls}`} style={{ animationDelay: c.delay }}>
                <img src={c.src} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="yr-footer">
        <div className="yr-footer-inner">
          <p className="yr-footer-fine">
            Lock in this rate today. Cancel anytime after 6 months. <br />
            Pricing includes all production and proofs.
          </p>
          <div className="yr-footer-cta">
            <button type="button" className="yr-btn ghost" onClick={onDecline}>
              Continue with single issue
              <span className="yr-btn-sub">
                <Icon.Lock /> ${fmt(fromPrice)} once
              </span>
            </button>
            <button type="button" className="yr-btn primary" onClick={onUpgrade}>
              <ArrowUpRight strokeWidth={2} className="yr-btn-icon" />
              Upgrade to annual — ${fmt(toPrice)}/mo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
