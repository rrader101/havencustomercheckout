import React, { useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { PaymentRequest } from '@stripe/stripe-js';
import { useStripe } from '@stripe/react-stripe-js';
import { PaymentRequestContext, type PaymentRequestContextType } from './PaymentRequestContextBase';


interface PaymentRequestProviderProps {
  children: ReactNode;
}

export const PaymentRequestProvider: React.FC<PaymentRequestProviderProps> = ({ children }) => {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState<{applePay?: boolean; googlePay?: boolean; link?: boolean} | null>(null);
  const paymentMethodHandlerRef = useRef<((paymentMethodId: string, method: string) => void | Promise<void>) | null>(null);
  const errorHandlerRef = useRef<((error: string) => void) | null>(null);
  // Exactly one PaymentRequest per (country, currency). Each stripe.paymentRequest()
  // registers its own 'paymentmethod' listener and is retained by Stripe, so
  // building them repeatedly leaks — see the note in usePaymentRequest.ts.
  const builtKeyRef = useRef<string | null>(null);
  const paymentRequestRef = useRef<PaymentRequest | null>(null);

  const initializePaymentRequest = useCallback((currency: 'USD' | 'CAD', country: string) => {
    if (!stripe) return;

    const stripeCurrency = currency.toLowerCase();

    let stripeCountry;
    if (currency === 'CAD') {
      stripeCountry = 'CA'; // Canadian dollars require Canada
    } else {
      stripeCountry = 'US'; // US dollars require United States
    }

    // Already built for this pair — reuse it. Callers may invoke this on every
    // mount/param change; only an actual currency/country switch rebuilds.
    const key = `${stripeCountry}:${stripeCurrency}`;
    if (builtKeyRef.current === key) return;
    builtKeyRef.current = key;

    const pr = stripe.paymentRequest({
      country: stripeCountry,
      currency: stripeCurrency,
      total: {
        label: 'Total',
        amount: 100, // Default amount, will be updated
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });
    paymentRequestRef.current = pr;

    pr.canMakePayment().then(result => {
      // A currency/country switch may have superseded this request while
      // canMakePayment() was in flight — don't let a stale answer win.
      if (paymentRequestRef.current !== pr) return;
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(result);
      } else {
        console.warn('❌ No payment methods available for', {
          currency,
          country: stripeCountry,
          originalCountry: country
        });
        setPaymentRequest(null);
        setCanMakePayment(null);
      }
    });

    pr.on('paymentmethod', async (event) => {
      try {
        if (!paymentMethodHandlerRef.current) {
          event.complete('fail');
          if (errorHandlerRef.current) {
            errorHandlerRef.current('Payment method handler not available');
          }
          return;
        }

        let method = 'card';
        if (event.walletName === 'applePay') method = 'apple-pay';
        else if (event.walletName === 'googlePay') method = 'google-pay';
        else if (event.walletName === 'link') method = 'link';

        const result = paymentMethodHandlerRef.current(event.paymentMethod.id, method);
        if (result instanceof Promise) {
          await result;
        }
        event.complete('success');
      } catch (error) {
        console.error('Payment failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
        if (errorHandlerRef.current) {
          errorHandlerRef.current(errorMessage);
        }
        event.complete('fail');
      }
    });
  }, [stripe]);

  useEffect(() => {
    if (!stripe) return;

    return () => {
      // Drop the cached PaymentRequest too, so a new Stripe instance rebuilds
      // one instead of reusing an object bound to the old instance.
      builtKeyRef.current = null;
      paymentRequestRef.current = null;
      setPaymentRequest(null);
      setCanMakePayment(null);
    };
  }, [stripe]);

  const updatePaymentRequest = useCallback((total: number) => {
    const pr = paymentRequestRef.current;
    if (!pr || total <= 0) return;
    pr.update({
      total: {
        label: 'Total',
        // Math.round, not Math.floor: 74.99 * 100 is 7498.999…, so flooring
        // showed the wallet a cent less than the card path charged.
        amount: Math.round(total * 100),
      },
    });
  }, []);

  const setPaymentMethodHandlerWrapper = useCallback((handler: (paymentMethodId: string, method: string) => Promise<void>) => {
    paymentMethodHandlerRef.current = handler;
  }, []);

  const setErrorHandlerWrapper = useCallback((handler: (error: string) => void) => {
    errorHandlerRef.current = handler;
  }, []);

  // Memoized so provider re-renders don't hand every consumer a new context
  // object (and, with the old inline initialize call, restart the loop).
  const value = useMemo<PaymentRequestContextType>(
    () => ({
      paymentRequest,
      canMakePayment,
      updatePaymentRequest,
      initializePaymentRequest,
      setPaymentMethodHandler: setPaymentMethodHandlerWrapper,
      setErrorHandler: setErrorHandlerWrapper,
    }),
    [
      paymentRequest,
      canMakePayment,
      updatePaymentRequest,
      initializePaymentRequest,
      setPaymentMethodHandlerWrapper,
      setErrorHandlerWrapper,
    ],
  );

  return (
    <PaymentRequestContext.Provider value={value}>
      {children}
    </PaymentRequestContext.Provider>
  );
};
