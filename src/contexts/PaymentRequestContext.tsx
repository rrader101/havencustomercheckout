import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { PaymentRequest } from '@stripe/stripe-js';
import { useStripe } from '@stripe/react-stripe-js';

interface PaymentRequestContextType {
  paymentRequest: PaymentRequest | null;
  canMakePayment: {applePay?: boolean; googlePay?: boolean; link?: boolean} | null;
  updatePaymentRequest: (total: number) => void;
  initializePaymentRequest: (currency: 'USD' | 'CAD', country: string) => void;
  setPaymentMethodHandler: (handler: (paymentMethodId: string, method: string) => void | Promise<void>) => void;
  setErrorHandler: (handler: (error: string) => void) => void;
}

const PaymentRequestContext = createContext<PaymentRequestContextType | undefined>(undefined);

export const usePaymentRequest = (currency: 'USD' | 'CAD' = 'USD', country: string = 'US') => {
  const context = useContext(PaymentRequestContext);
  if (context === undefined) {
    throw new Error('usePaymentRequest must be used within a PaymentRequestProvider');
  }
  
  // Initialize with the provided currency and country immediately
  const { initializePaymentRequest, ...rest } = context;
  
  // Call initialization directly since currency and country won't change
  if (initializePaymentRequest) {
    initializePaymentRequest(currency, country);
  }
  
  return {
    ...rest,
    initializePaymentRequest // Still expose it in case needed
  };
};

interface PaymentRequestProviderProps {
  children: ReactNode;
}

export const PaymentRequestProvider: React.FC<PaymentRequestProviderProps> = ({ children }) => {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState<{applePay?: boolean; googlePay?: boolean; link?: boolean} | null>(null);
  const paymentMethodHandlerRef = useRef<((paymentMethodId: string, method: string) => void | Promise<void>) | null>(null);
  const errorHandlerRef = useRef<((error: string) => void) | null>(null);

  // Function to initialize payment request with specific currency and country
  const initializePaymentRequest = useCallback((currency: 'USD' | 'CAD', country: string) => {
    if (!stripe) return;

    // Map currency to lowercase for Stripe
    const stripeCurrency = currency.toLowerCase();
    
    // Map country code for Stripe - Important: currency and country must match for Apple Pay
    // CAD currency requires CA country, USD currency requires US country
    let stripeCountry;
    if (currency === 'CAD') {
      stripeCountry = 'CA'; // Canadian dollars require Canada
    } else {
      stripeCountry = 'US'; // US dollars require United States
    }

    console.log(`🏗️ Creating PaymentRequest:`, { 
      currency: stripeCurrency, 
      country: stripeCountry, 
      originalCountry: country 
    });

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
      console.log(`🍎 Apple Pay check for ${currency} in ${stripeCountry}:`, result);
      if (result) {
        console.log('✅ Payment methods available:', result);
        setPaymentRequest(pr);
        setCanMakePayment(result);
      } else {
        console.warn('❌ No payment methods available for', {
          currency,
          country: stripeCountry,
          originalCountry: country
        });
        // Clear previous payment request if currency change made it unavailable
        setPaymentRequest(null);
        setCanMakePayment(null);
      }
    });

    // Handle payment method selection
    pr.on('paymentmethod', async (event) => {
      try {
        if (!paymentMethodHandlerRef.current) {
          event.complete('fail');
          if (errorHandlerRef.current) {
            errorHandlerRef.current('Payment method handler not available');
          }
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
        const errorMessage = error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
        if (errorHandlerRef.current) {
          errorHandlerRef.current(errorMessage);
        }
        event.complete('fail');
      }
    });
  }, [stripe]);

  // Initialize payment request when Stripe is available
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