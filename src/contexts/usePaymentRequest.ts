import { useContext } from 'react';
import { PaymentRequestContext } from './PaymentRequestContextBase';

export const usePaymentRequest = (currency: 'USD' | 'CAD' = 'USD', country: string = 'US') => {
  const context = useContext(PaymentRequestContext);
  if (context === undefined) {
    throw new Error('usePaymentRequest must be used within a PaymentRequestProvider');
  }

  const { initializePaymentRequest, ...rest } = context;

  if (initializePaymentRequest) {
    initializePaymentRequest(currency, country);
  }

  return {
    ...rest,
    initializePaymentRequest,
  };
};
