import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchDealsData } from '@/services/api';
import type { Deal } from '@/services/api';
import { ASSET_BASE, Icon, enrichAddon, fmt, parseNumber } from '@/components/new-checkout/shared';
import '@/components/checkout-redesign.css';

/**
 * Standalone "make the switch" upsell — a single, focused screen with NO order
 * summary. It reframes the customer's one-time invoice as the first payment of
 * a HAVEN Annual Partnership: same placement, now billed monthly.
 *
 * Route: /switch/:dealId
 *
 * The two monthly tiers (Full Page / Two-Page Spread) are the whole point of the
 * screen, so they are defined here rather than pulled from the deal — the deal
 * only needs to provide the customer's name, the invoice amount to beat, and the
 * Annual Partnership artwork.
 */

type PlanId = 'full' | 'spread';

interface Plan {
  id: PlanId;
  label: string;
  price: number;
  blurb: string;
}

const FULL_PAGE_FALLBACK = 195;
const TWO_PAGE_PRICE = 295;

const FALLBACK_IMAGE = `${ASSET_BASE}/annual-partnership.png`;

export default function InvoiceSwitch() {
  const { dealId } = useParams<{ dealId: string }>();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PlanId>('full');

  useEffect(() => {
    let active = true;
    if (!dealId) {
      setLoading(false);
      return;
    }
    fetchDealsData(dealId)
      .then((res) => {
        if (active) setDeal(res.deal);
      })
      .catch(() => {
        /* Design screen — fall back to defaults rather than blocking on the API. */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dealId]);

  // Pull what the pitch needs off the deal, with sensible fallbacks so the screen
  // still renders as a design even when the API is unavailable.
  const { firstName, invoiceAmount, currency, image, fullPagePrice } = useMemo(() => {
    const annual = deal?.add_ons?.map(enrichAddon).find((a) => a.kind === 'annual');
    return {
      firstName: deal?.contact_first_name?.trim() || deal?.name?.trim().split(/\s+/)[0] || 'there',
      invoiceAmount: parseNumber(deal?.amount) || 395,
      currency: deal?.currency || 'USD',
      image: annual?.image || FALLBACK_IMAGE,
      fullPagePrice: annual?.price || FULL_PAGE_FALLBACK,
    };
  }, [deal]);

  const plans: Plan[] = useMemo(
    () => [
      { id: 'full', label: 'Full Page', price: fullPagePrice, blurb: 'Your full-page ad, held in every issue.' },
      { id: 'spread', label: 'Two-Page Spread', price: TWO_PAGE_PRICE, blurb: 'The largest canvas HAVEN offers, both pages yours.' },
    ],
    [fullPagePrice],
  );

  const activePlan = plans.find((p) => p.id === selected) ?? plans[0];
  const symbol = currency === 'USD' ? '$' : '';

  if (loading) {
    return (
      <div className="hc-redesign hc-loading" data-theme="modern">
        <div className="hc-topbar">
          <img className="hc-wordmark" src="/logo-final.png" alt="Haven Lifestyles" />
        </div>
      </div>
    );
  }

  return (
    <div className="hc-redesign" data-theme="modern">
      <div className="hc-topbar">
        <img className="hc-wordmark" src="/logo-final.png" alt="Haven Lifestyles" />
        <div className="hc-meta">
          <Icon.Lock /> Secure checkout
        </div>
      </div>

      <div className="hc-layout solo">
        <main className="hc-main-pane">
          <div className="hc-switch hc-fade-in" data-screen-label="Make the switch">
            <div className="hc-switch-hero">
              <img src={image} alt="HAVEN Annual Partnership" loading="lazy" />
              <span className="hc-badge">Make the switch</span>
            </div>

            <div className="hc-switch-body">
              <p className="hc-switch-eyebrow">Before you pay — a better way to run this placement</p>
              <h1 className="hc-section-title">
                {firstName}, put that {symbol}
                {fmt(invoiceAmount)} to work all year.
              </h1>
              <p className="hc-switch-lede">
                Instead of paying your{' '}
                <strong>
                  {symbol}
                  {fmt(invoiceAmount)} invoice
                </strong>{' '}
                once and being done, switch to a HAVEN <strong>Annual Partnership</strong>. The same placement is
                reserved across <strong>all 8 issues</strong> with continuous digital promotion — and today's charge
                simply becomes your first easy monthly payment.
              </p>

              <div className="hc-switch-compare">
                <div className="hc-switch-col was">
                  <span className="hc-switch-cap">Your invoice today</span>
                  <span className="hc-switch-amt">
                    {symbol}
                    {fmt(invoiceAmount)}
                  </span>
                  <span className="hc-switch-sub">one-time</span>
                </div>
                <span className="hc-switch-sep" aria-hidden="true">
                  <Icon.Arrow />
                </span>
                <div className="hc-switch-col now">
                  <span className="hc-switch-cap">Switch to</span>
                  <span className="hc-switch-amt">
                    {symbol}
                    {fmt(activePlan.price)}
                    <em>/mo</em>
                  </span>
                  <span className="hc-switch-sub">billed monthly</span>
                </div>
              </div>

              <div className="hc-switch-plans" role="radiogroup" aria-label="Choose your placement">
                {plans.map((plan) => {
                  const isActive = plan.id === selected;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`hc-switch-plan ${isActive ? 'selected' : ''}`}
                      onClick={() => setSelected(plan.id)}
                    >
                      <span className="hc-switch-plan-mark" aria-hidden="true">
                        {isActive && <Icon.Check />}
                      </span>
                      <span className="hc-switch-plan-text">
                        <span className="hc-switch-plan-label">{plan.label}</span>
                        <span className="hc-switch-plan-blurb">{plan.blurb}</span>
                      </span>
                      <span className="hc-switch-plan-price">
                        {symbol}
                        {fmt(plan.price)}
                        <em>/mo</em>
                      </span>
                    </button>
                  );
                })}
              </div>

              <ul className="hc-switch-perks">
                <li>
                  <Icon.Check /> Reserved in all 8 print issues
                </li>
                <li>
                  <Icon.Check /> 120,000+ readers across the year
                </li>
                <li>
                  <Icon.Check /> Priority placement in the layout queue
                </li>
                <li>
                  <Icon.Check /> Seller-ready distribution reports
                </li>
              </ul>

              <div className="hc-switch-cta">
                <button type="button" className="hc-btn lg">
                  Switch to {symbol}
                  {fmt(activePlan.price)}/mo
                  <span className="hc-arrow">
                    <Icon.Arrow />
                  </span>
                </button>
                <button type="button" className="hc-link-btn">
                  No thanks — keep my {symbol}
                  {fmt(invoiceAmount)} invoice
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
