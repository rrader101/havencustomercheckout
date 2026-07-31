import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchDealsData } from '@/services/api';
import type { Deal } from '@/services/api';
import { enrichAddon, parseNumber } from '@/components/new-checkout/shared';
import AnnualUpsell from '@/components/new-checkout/AnnualUpsell';

/**
 * Standalone design-preview route for the annual upsell (/year-round/:dealId).
 * The real in-flow version lives in RedesignedPaymentForm; both render the shared
 * <AnnualUpsell> view. Here the CTAs just hand off to the normal checkout.
 */
export default function YearRoundReach() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!dealId) {
      setReady(true);
      return;
    }
    fetchDealsData(dealId)
      .then((res) => {
        if (active) setDeal(res.deal);
      })
      .catch(() => {
        /* Design route — fall back to defaults rather than blocking on the API. */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [dealId]);

  const { firstName, fromPrice, toPrice, invoiceNum, placementPhrase } = useMemo(() => {
    const annual = deal?.add_ons?.map(enrichAddon).find((a) => a.kind === 'annual');
    const label = annual?.title || annual?.source?.product_name || '';
    const isTwoPage = /two[- ]?page/i.test(label);
    return {
      firstName: deal?.contact_first_name?.trim() || deal?.name?.trim().split(/\s+/)[0] || '',
      fromPrice: parseNumber(deal?.amount) || 395,
      toPrice: annual?.price || 195,
      invoiceNum: deal?.invoices?.[0]?.invoice_num || '',
      placementPhrase: isTwoPage ? 'two-page spread' : 'full page',
    };
  }, [deal]);

  const goToCheckout = () => {
    if (dealId) navigate(`/checkout/${dealId}`);
  };

  return (
    <AnnualUpsell
      firstName={firstName}
      invoiceNum={invoiceNum}
      fromPrice={fromPrice}
      toPrice={toPrice}
      placementPhrase={placementPhrase}
      ready={ready}
      onUpgrade={goToCheckout}
      onDecline={goToCheckout}
    />
  );
}
