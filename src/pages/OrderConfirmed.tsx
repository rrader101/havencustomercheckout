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
      posthog.capture(CheckoutEvents.CHECKOUT_COMPLETED, {
        order_id: orderID,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
      });
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
