import React, { createContext } from 'react';
import { PaymentRequest } from '@stripe/stripe-js';

export interface PaymentRequestContextType {
  paymentRequest: PaymentRequest | null;
  canMakePayment: { applePay?: boolean; googlePay?: boolean; link?: boolean } | null;
  updatePaymentRequest: (total: number) => void;
  initializePaymentRequest: (currency: 'USD' | 'CAD', country: string) => void;
  setPaymentMethodHandler: (handler: (paymentMethodId: string, method: string) => void | Promise<void>) => void;
  setErrorHandler: (handler: (error: string) => void) => void;
}

export const PaymentRequestContext = createContext<PaymentRequestContextType | undefined>(undefined);
