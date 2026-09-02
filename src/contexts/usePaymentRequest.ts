import { useContext, useEffect } from 'react';
import { PaymentRequestContext } from './PaymentRequestContextBase';

export const usePaymentRequest = (currency: 'USD' | 'CAD' = 'USD', country: string = 'US') => {
  const context = useContext(PaymentRequestContext);
  if (context === undefined) {
    throw new Error('usePaymentRequest must be used within a PaymentRequestProvider');
  }

  const { initializePaymentRequest, ...rest } = context;

  // This MUST run as an effect, never during render.
  //
  // It used to be called inline in the render body, which built a fresh
  // stripe.paymentRequest() on every render. Each one's canMakePayment()
  // resolved and set provider state to brand-new object identities, which
  // re-rendered this consumer, which built another one — an unbounded loop that
  // retains a Stripe object plus a 'paymentmethod' listener per iteration.
  //
  // It only closed where a wallet is actually available (Safari + Apple Pay):
  // with no wallet, canMakePayment() resolves null, setState(null) on
  // already-null state bails out of re-rendering and it ran exactly once. That
  // is why it never showed up in desktop testing.
  //
  // The provider is idempotent per (currency, country), so re-running this
  // effect is cheap and safe.
  useEffect(() => {
    initializePaymentRequest?.(currency, country);
  }, [initializePaymentRequest, currency, country]);

  return {
    ...rest,
    initializePaymentRequest,
  };
};
