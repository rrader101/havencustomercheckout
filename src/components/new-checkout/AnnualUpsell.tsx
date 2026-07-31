import { useEffect, useState } from 'react';
import { Check, Minus, ArrowUpRight, ChevronDown } from 'lucide-react';
import { Icon, fmt } from './shared';
import '@/components/checkout-redesign.css';

/**
 * "Year-Round Reach" annual upsell — presentational. Reframes a one-time invoice
 * as an 8-issue Annual Partnership. Rendered both as the standalone /year-round
 * design route and as the in-flow interstitial in RedesignedPaymentForm.
 *
 * Pricing is passed in, read straight off the deal:
 *   fromPrice = the one-time invoice amount        (e.g. 395 / 495)
 *   toPrice   = the annual add-on's monthly amount (e.g. 195 / 250)
 */

export interface AnnualUpsellProps {
  firstName?: string;
  invoiceNum?: string;
  fromPrice: number;
  toPrice: number;
  /** "full page" | "two-page spread" — drives the body copy. */
  placementPhrase?: string;
  onUpgrade: () => void;
  onDecline: () => void;
  /** Personalized copy fades in when the deal data is ready (avoids a name-jump
   *  on the async standalone route). In-flow the data is already loaded → true. */
  ready?: boolean;
}

const COVERS = [
  { src: '/checkout-redesign/assets/covers/mag-1.jpg', cls: 'a', delay: '0ms' },
  { src: '/checkout-redesign/assets/covers/mag-2.jpg', cls: 'b', delay: '80ms' },
  { src: '/checkout-redesign/assets/covers/mag-3.jpg', cls: 'c', delay: '160ms' },
  { src: '/checkout-redesign/assets/covers/mag-4.jpg', cls: 'd', delay: '240ms' },
];

const ISSUES_PER_YEAR = 8;

const SINGLE_ISSUE = [
  'Your placement in this one issue',
  'Print + digital for about six weeks',
  'Seen while it’s the current issue',
  'Rebook each issue to keep running',
];

const ANNUAL_INCLUDED = [
  'Guaranteed page reservation, all 8 issues',
  'Refresh your creative every issue',
  'Print + digital, always on',
  '120,000+ readers across the year',
  'Priority placement + seller reports',
  'Locked-in pricing all year',
];

export default function AnnualUpsell({
  firstName,
  invoiceNum,
  fromPrice,
  toPrice,
  placementPhrase = 'full page',
  onUpgrade,
  onDecline,
  ready = true,
}: AnnualUpsellProps) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<'annual' | 'single'>('annual');

  return (
    <div className="hc-redesign yr" data-theme="modern">
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
              partnership and your invoice today drops from ${fmt(fromPrice)} to ${fmt(toPrice)}/mo.
              Your {placementPhrase} runs in all {ISSUES_PER_YEAR} issues of HAVEN this year — refresh
              your print ad each issue, and make digital updates every month.
            </p>
            <p className="yr-lede-kicker">Your clients see HAVEN all year. Make sure they see you.</p>
          </div>
        </div>

        <div className="yr-compare">
          <button
            type="button"
            className="yr-compare-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
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
                      {SINGLE_ISSUE.map((item) => (
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
                      {ANNUAL_INCLUDED.map((item) => (
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
