import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { PaymentRequest } from '@stripe/stripe-js';
import { useStripe } from '@stripe/react-stripe-js';

interface PaymentRequestContextType {
  paymentRequest: PaymentRequest | null;
  canMakePayment: {applePay?: boolean; googlePay?: boolean; link?: boolean} | null;
  updatePaymentRequest: (total: number) => void;
  setPaymentMethodHandler: (handler: (paymentMethodId: string, method: string) => void | Promise<void>) => void;
}

const PaymentRequestContext = createContext<PaymentRequestContextType | undefined>(undefined);

export const usePaymentRequest = () => {
  const context = useContext(PaymentRequestContext);
  if (context === undefined) {
    throw new Error('usePaymentRequest must be used within a PaymentRequestProvider');
  }
  return context;
};

interface PaymentRequestProviderProps {
  children: ReactNode;
}

export const PaymentRequestProvider: React.FC<PaymentRequestProviderProps> = ({ children }) => {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState<{applePay?: boolean; googlePay?: boolean; link?: boolean} | null>(null);
  const paymentMethodHandlerRef = useRef<((paymentMethodId: string, method: string) => void | Promise<void>) | null>(null);

  // Initialize payment request when Stripe is available
  useEffect(() => {
    if (!stripe) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: 'Total',
        amount: 100, // Default amount, will be updated
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    // Check what payment methods are available
    pr.canMakePayment().then(result => {
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(result);
      }
    });

    // Handle payment method selection
    pr.on('paymentmethod', async (event) => {
      try {
        if (!paymentMethodHandlerRef.current) {
          event.complete('fail');
          return;
        }

        // Determine payment method type
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
        event.complete('fail');
      }
    });

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

  const value = {
    paymentRequest,
    canMakePayment,
    updatePaymentRequest,
    setPaymentMethodHandler: setPaymentMethodHandlerWrapper,
  };

  return (
    <PaymentRequestContext.Provider value={value}>
      {children}
    </PaymentRequestContext.Provider>
  );
};