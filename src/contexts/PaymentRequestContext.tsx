import React, { useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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

  const initializePaymentRequest = useCallback((currency: 'USD' | 'CAD', country: string) => {
    if (!stripe) return;

    const stripeCurrency = currency.toLowerCase();
    
    let stripeCountry;
    if (currency === 'CAD') {
      stripeCountry = 'CA'; // Canadian dollars require Canada
    } else {
      stripeCountry = 'US'; // US dollars require United States
    }


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

    pr.canMakePayment().then(result => {
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
      setPaymentRequest(null);
      setCanMakePayment(null);
    };
  }, [stripe]);

  const updatePaymentRequest = (total: number) => {
    if (paymentRequest && total > 0) {
      paymentRequest.update({
        total: {
          label: 'Total',
          amount: Math.floor(total * 100),
        },
      });
    }
  };

  const setPaymentMethodHandlerWrapper = useCallback((handler: (paymentMethodId: string, method: string) => Promise<void>) => {
    paymentMethodHandlerRef.current = handler;
  }, []);

  const setErrorHandlerWrapper = useCallback((handler: (error: string) => void) => {
    errorHandlerRef.current = handler;
  }, []);

  const value = {
    paymentRequest,
    canMakePayment,
    updatePaymentRequest,
    initializePaymentRequest,
    setPaymentMethodHandler: setPaymentMethodHandlerWrapper,
    setErrorHandler: setErrorHandlerWrapper,
  };

  return (
    <PaymentRequestContext.Provider value={value}>
      {children}
    </PaymentRequestContext.Provider>
  );
};
