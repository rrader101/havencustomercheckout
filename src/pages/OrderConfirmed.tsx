import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import { CheckoutEvents, CheckoutEventProperties, getTimestamp } from '@/lib/analytics';
import { Icon } from '@/components/new-checkout/shared';
import '@/components/checkout-redesign.css';

/**
 * Order-confirmed page.
 *
 * UI ported from haven-checkout-new (the "You're in." confirmation screen):
 * a centered card with a black check-mark medallion, a serif headline,
 * a one-line receipt note, and a newsletter subscribe link. The existing
 * analytics + localStorage cleanup logic is preserved.
 */
export const OrderConfirmed: React.FC = () => {
  const { orderID } = useParams<{ orderID: string }>();
  const [searchParams] = useSearchParams();
  const dealId = searchParams.get('dealId');
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog && orderID) {
      // The payment step stashed the order's add-on summary (has_addon,
      // addon_ids, addon_revenue, addon_layout, …) keyed by order id, since
      // this page is a fresh navigation without the deal data. Attach it here
      // so checkout_completed carries the same add-on context as payment_succeeded.
      let addonSummary: Record<string, unknown> = {};
      try {
        const stored = localStorage.getItem(`checkout_summary_${orderID}`);
        if (stored) addonSummary = JSON.parse(stored) as Record<string, unknown>;
      } catch {
        // Ignore malformed/unavailable storage — checkout_completed still fires.
      }

      posthog.capture(CheckoutEvents.CHECKOUT_COMPLETED, {
        order_id: orderID,
        ...addonSummary,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
      });

      try {
        localStorage.removeItem(`checkout_summary_${orderID}`);
      } catch {
        // Non-fatal.
      }
    }

    if (dealId) {
      localStorage.removeItem(`checkout_addons_${dealId}`);
    }
  }, [posthog, orderID, dealId]);

  return (
    <div className="hc-redesign">
      <div className="hc-topbar">
        <img className="hc-wordmark" src="/logo-final.png" alt="Haven Lifestyles" />
        <div className="hc-meta">
          <Icon.Lock /> Secure checkout
        </div>
      </div>

      <div className="hc-confirm hc-fade-in" data-screen-label="04 Confirmation">
        <div className="hc-confirm-mark">
          <Icon.Check />
        </div>
        <h1 className="hc-section-title">You're in.</h1>
        <p className="hc-section-sub hc-confirm-sub">Your receipt is on its way.</p>
        <p className="hc-section-sub hc-confirm-sub">
          <a
            className="hc-confirm-link"
            href="https://www.havenlifestyles.com/emailsubscribe/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Subscribe
          </a>{' '}
          to the HAVEN newsletter for market features and new issues.
        </p>
        {orderID && <p className="hc-confirm-order">Order ID · {orderID}</p>}
      </div>
    </div>
  );
};

export default OrderConfirmed;
