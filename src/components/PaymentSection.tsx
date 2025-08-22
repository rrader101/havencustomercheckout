import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CreditCard, Shield, Receipt, Link, Zap, Mail, Loader2 } from 'lucide-react';
import {
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { usePaymentRequest } from '@/contexts/PaymentRequestContext';
import { processPayment, PaymentData as ApiPaymentData, processChequePayment, ChequePaymentData } from '@/services/api';
import { SuccessPopup } from './SuccessPopup';
import { useNavigate } from 'react-router-dom';

// Initialize Stripe


interface PaymentFormData {
  method: 'card' | 'google-pay' | 'apple-pay' | 'link' | 'check';
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
  userEmail?: string;
  paymentMethodId?: string;
  linkEmail?: string;
  billing_street_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  billing_zipcode?: string;
  useDifferentBilling?: boolean;
}

interface PaymentSectionProps {
  data: PaymentFormData;
  onUpdate: (data: Partial<PaymentFormData>) => void;
  onBack: () => void;
  total: number;
  userEmail?: string;
  shippingData?: {
    name?: string;
    email?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  addOns?: Record<string, boolean>;
  invoices?: Record<string, boolean>;
  currency: 'USD' | 'CAD';
  dealId: string;
  dealData?: {
    type: string;
    mailing_address_country: string;
  };
}



export const PaymentSection = React.memo(({ data, onUpdate, onBack, total, userEmail, shippingData, addOns, invoices, currency, dealId, dealData }: PaymentSectionProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const navigate = useNavigate();
  // Removed useAppleDevice hook - relying solely on Stripe's canMakePayment method
  
  // Handle Stripe payment success
  const handlePaymentSuccess = async (paymentMethodId: string, method: string) => {
    setIsProcessing(true);
    // Clear any previous API errors
    setErrors(prev => ({ ...prev, api: '' }));
    try {
      // Update payment data with the payment method ID
      onUpdate({ 
        paymentMethodId, 
        method: method as PaymentFormData['method']
      });
      
      // Call the checkout API
      await handleCheckoutAPI(paymentMethodId, method);
    } catch (error) {
      console.error('Payment processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
      // Set API error to payment error for consistent display
      setErrors(prev => ({ ...prev, payment: errorMessage, api: '' }));
    }
    setIsProcessing(false);
  };

  // Handle checkout API call
  const handleCheckoutAPI = async (paymentMethodId: string, method: string) => {
    setIsLoading(true);
    try {
      // Convert add_ons and invoices from Record<string, boolean> to arrays of selected IDs
      const selectedAddOns = addOns ? Object.keys(addOns).filter(key => addOns[key]) : [];
      const selectedInvoices = invoices ? Object.keys(invoices).filter(key => invoices[key]) : [];

      let result;
      
      if (method === 'check') {
        // Handle check payment
        const chequeData: ChequePaymentData = {
          uuid: dealId,
          shipping_name: shippingData?.name || null,
          shipping_email: shippingData?.email || null,
          shipping_street_address: shippingData?.streetAddress || null,
          shipping_city: shippingData?.city || null,
          shipping_state: shippingData?.state || null,
          shipping_zipcode: shippingData?.zipCode || null,
          shipping_country: shippingData?.country || null,
          billing_name: data.cardholderName || null,
          billing_email: data.userEmail || null,
          billing_street_address: data.billing_street_address || null,
          billing_city: data.billing_city || null,
          billing_state: data.billing_state || null,
          billing_zipcode: data.billing_zipcode || null,
          billing_country: data.billing_country || null,
          add_ons: selectedAddOns,
          invoice_ids: selectedInvoices,
        };
        
        result = await processChequePayment(chequeData);
        console.log('Cheque payment successful:', result);
      } else {
        // Handle card payment
        const paymentData: ApiPaymentData = {
          uuid: dealId,
          payment_token: paymentMethodId,
          shipping_name: shippingData?.name || null,
          shipping_email: shippingData?.email || null,
          shipping_street_address: shippingData?.streetAddress || null,
          shipping_city: shippingData?.city || null,
          shipping_state: shippingData?.state || null,
          shipping_zipcode: shippingData?.zipCode || null,
          shipping_country: shippingData?.country || null,
          billing_name: data.cardholderName || null,
          billing_email: data.userEmail || null,
          billing_street_address: data.billing_street_address || null,
          billing_city: data.billing_city || null,
          billing_state: data.billing_state || null,
          billing_zipcode: data.billing_zipcode || null,
          billing_country: data.billing_country || null,
          add_ons: selectedAddOns,
          invoice_ids: selectedInvoices,
          amount: total,
        };
        
        result = await processPayment(paymentData);
        console.log('Card payment successful:', result);
      }
      
      // Handle successful checkout - show popup and prepare for redirect
      if (result && result.order_id) {
        setOrderId(result.order_id);
        setShowSuccessPopup(true);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
      // Set API error to payment error for consistent display
      setErrors(prev => ({ ...prev, payment: errorMessage, api: '' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to determine processing fee rate based on country
  const getProcessingFeeRate = (country: string) => {
    const normalizedCountry = country.toLowerCase().trim();
    const usaVariants = ['usa', 'us', 'united states', 'united states of america'];
    return usaVariants.includes(normalizedCountry) ? 0.029 : 0.024;
  };

  // Comprehensive country list (same as ShippingDetails)
  const countries = ['US', 'Canada'];

  // Normalize country names to match dropdown options
  const normalizeCountry = (country: string): string => {
    const normalized = country.toLowerCase().trim();
    if (['usa', 'us', 'united states', 'united states of america'].includes(normalized)) {
    return 'US';
    }
    if (['canada', 'ca'].includes(normalized)) {
      return 'Canada';
    }
    return country; // Return original if no match
  };

  // Handle popup close and navigation
  const handlePopupClose = () => {
    setShowSuccessPopup(false);
    if (orderId) {
      navigate(`/order-confirmed/${orderId}`);
    }
  };

  // Handle check payment submission
  const handleCheckPayment = async () => {
    setErrors({ payment: '', api: '', card: '' });
    await handleCheckoutAPI('', 'check');
  };

  // Auto-populate shipping data when component mounts
  useEffect(() => {
    console.log('PaymentSection useEffect triggered:', { shippingData, data });
    
    if (shippingData) {
      // Only auto-populate if the fields are empty (don't override user input)
      const updates: Partial<PaymentFormData> = {};
      
      if (!data.userEmail) {
        updates.userEmail = userEmail || '';
      }
      if (!data.cardholderName) {
        updates.cardholderName = shippingData.name || '';
      }
      
      // Only update if there are fields to populate
      if (Object.keys(updates).length > 0) {
        console.log('Auto-populating payment fields with:', updates);
        onUpdate(updates);
      }
    }
    
    // Set default payment method to card if not already set
    if (!data.method) {
      onUpdate({ method: 'card' });
    }
  }, [shippingData, onUpdate, userEmail]); // eslint-disable-line react-hooks/exhaustive-deps





  const validateForm = () => {
    if (data.method === 'google-pay' || data.method === 'apple-pay' || data.method === 'check') return true;
    
    const newErrors: Record<string, string> = {};
    
    if (!data.userEmail?.trim()) newErrors.userEmail = 'Email is required';
    if (!data.cardholderName?.trim()) newErrors.cardholderName = 'Cardholder name is required';
    // Note: Card validation is handled by Stripe CardElement, billing fields have no validation

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    // Prevent submission if total is 0 or missing
    if (total <= 0) {
      setErrors(prev => ({ ...prev, payment: 'Cannot complete order with zero total amount. Please select items or contact support.' }));
      return;
    }
    
    if (validateForm()) {
      if (data.method === 'check') {
        handleCheckPayment();
      } else {
        // Handle other payment methods
        console.log('Processing payment...', { data, total });
      }
    }
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    onUpdate({ [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };



  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
    }
    return v;
  };

  return (
    <Card className="p-6 border-0 bg-card animate-fade-in">
      <StripePaymentContent 
        data={data}
        onUpdate={onUpdate}
        total={total}
        userEmail={userEmail}
        shippingData={shippingData}
        dealData={dealData}
        onPaymentSuccess={handlePaymentSuccess}
        errors={errors}
        setErrors={setErrors}
        isProcessing={isProcessing}
        setIsProcessing={setIsProcessing}
        isLoading={isLoading}
        addOns={addOns}
        currency={currency}
        onBack={onBack}
        handleCheckPayment={handleCheckPayment}
        handleInputChange={handleInputChange}
        validateForm={validateForm}
        handleSubmit={handleSubmit}
        formatCardNumber={formatCardNumber}
        formatExpiryDate={formatExpiryDate}
        getProcessingFeeRate={getProcessingFeeRate}
        countries={countries}
      />
      
      <SuccessPopup
        isVisible={showSuccessPopup}
        orderId={orderId}
        onClose={handlePopupClose}
      />
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders that cause Stripe remounting
  return (
    prevProps.data === nextProps.data &&
    prevProps.total === nextProps.total &&
    prevProps.userEmail === nextProps.userEmail &&
    prevProps.shippingData === nextProps.shippingData &&
    prevProps.addOns === nextProps.addOns &&
    prevProps.invoices === nextProps.invoices &&
    prevProps.currency === nextProps.currency &&
    prevProps.dealId === nextProps.dealId &&
    prevProps.dealData === nextProps.dealData
  );
});

// Stripe Payment Content Component (inside Elements provider)
const StripePaymentContent = React.memo(({ 
  data, onUpdate, total, userEmail, shippingData, dealData, onPaymentSuccess, 
  errors, setErrors, isProcessing, setIsProcessing, isLoading, addOns, currency, onBack,
  handleCheckPayment, handleInputChange, validateForm, handleSubmit,
  formatCardNumber, formatExpiryDate, getProcessingFeeRate, countries
}: {
  data: PaymentFormData;
  onUpdate: (data: Partial<PaymentFormData>) => void;
  total: number;
  userEmail?: string;
  shippingData?: { name?: string; email?: string; streetAddress?: string; city?: string; state?: string; country?: string; zipCode?: string; };
  dealData?: { type: string; mailing_address_country: string; };
  onPaymentSuccess: (paymentMethodId: string, method: string) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  isLoading: boolean;
  addOns?: Record<string, boolean>;
  currency: 'USD' | 'CAD';
  onBack: () => void;
  handleCheckPayment: () => void;
  handleInputChange: (field: keyof PaymentFormData, value: string) => void;
  validateForm: () => boolean;
  handleSubmit: () => void;
  formatCardNumber: (value: string) => string;
  formatExpiryDate: (value: string) => string;
  getProcessingFeeRate: (country: string) => number;
  countries: string[];
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { paymentRequest, canMakePayment, updatePaymentRequest, setPaymentMethodHandler, setErrorHandler } = usePaymentRequest();

  // Set up payment method handler when component mounts
  useEffect(() => {
    setPaymentMethodHandler(onPaymentSuccess);
  }, [onPaymentSuccess, setPaymentMethodHandler]);

  // Set up error handler for payment request button
  useEffect(() => {
    setErrorHandler((error: string) => {
      setErrors(prev => ({ ...prev, payment: error }));
    });
  }, [setErrorHandler]);

  // Update payment request total when total changes
  useEffect(() => {
    if (total > 0) {
      updatePaymentRequest(total);
    }
  }, [total, updatePaymentRequest]);



  const handleCardPayment = async () => {
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setIsProcessing(true);
    // Clear all previous errors (payment, api, and card)
    setErrors({ payment: '', api: '', card: '' });

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: data.cardholderName,
          email: userEmail,
        },
      });

      if (error) {
        console.error('Payment method creation failed:', error);
        setErrors({ payment: error.message || 'Payment failed', api: '', card: '' });
        setIsProcessing(false);
        return;
      }

      // Call the payment success handler
      await onPaymentSuccess(paymentMethod.id, 'card');
    } catch (error) {
      console.error('Payment processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
      setErrors({ payment: errorMessage, api: '', card: '' });
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Single Payment Request Button that handles Apple Pay, Google Pay, and Link */}
      {paymentRequest && canMakePayment && (
        <>
          <div className="mb-6">
            <div className="w-full h-12 rounded-lg overflow-hidden">
              <PaymentRequestButtonElement 
                options={{
                  paymentRequest: paymentRequest,
                  style: {
                    paymentRequestButton: {
                      type: 'default',
                      theme: 'dark',
                      height: '48px',
                    },
                  },
                }}
              />
            </div>
          </div>
          
          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
          </div>
        </>
      )}

      

      {/* Credit Card Form */}
      <div className="space-y-4 animate-fade-in">
        <div className="space-y-4 animate-fade-in">
          {/* Email Field - Now editable */}
           <div className="pt-4">
             <Label htmlFor="email">Email</Label>
             <Input
               id="email"
               type="email"
               value={data.userEmail || shippingData?.email || userEmail || ''}
               placeholder="email@example.com"
               onChange={(e) => onUpdate({ userEmail: e.target.value })}
               className="mt-0"
             />
           </div>



          {/* Credit Card Fields - Only show when check is NOT selected and not Link */}
           {data.method !== 'check' && data.method !== 'link' && (
            <>
              {/* Stripe Card Element */}
              <div>
                <Label htmlFor="card-element">Card information</Label>
                <div className="mt-1 p-3 border border-input rounded-md bg-background">
                  <CardElement 
                    options={{
                      style: {
                        base: {
                          fontSize: '16px',
                          color: '#424770',
                          '::placeholder': {
                            color: '#aab7c4',
                          },
                        },
                        invalid: {
                          color: '#9e2146',
                        },
                      },
                    }}
                    onChange={(event) => {
                      if (event.error) {
                        setErrors({ ...errors, payment: event.error.message });
                      } else {
                        setErrors({ ...errors, payment: '' });
                      }
                    }}
                  />
                </div>

              </div>

              {/* Cardholder Name - Now editable */}
              <div>
                <Label htmlFor="cardholderName">Cardholder name</Label>
                <Input
                  id="cardholderName"
                  placeholder="Full name on card"
                  value={data.cardholderName || shippingData?.name || ''}
                  onChange={(e) => onUpdate({ cardholderName: e.target.value })}
                  className="mt-0"
                />
              </div>

              {/* Billing Address Toggle */}
                 <div className="pt-4">
                   <div className="flex items-center space-x-2">
                     <input
                       type="checkbox"
                       id="useDifferentBilling"
                       checked={data.useDifferentBilling || false}
                       onChange={(e) => {
                         const checked = e.target.checked;
                         onUpdate({ 
                           useDifferentBilling: checked,
                           billing_street_address: checked ? '' : shippingData?.streetAddress || '',
                           billing_city: checked ? '' : shippingData?.city || '',
                           billing_state: checked ? '' : shippingData?.state || '',
                           billing_country: checked ? '' : shippingData?.country || '',
                           billing_zipcode: checked ? '' : shippingData?.zipCode || ''
                         });
                       }}
                       className="rounded"
                     />
                     <Label htmlFor="useDifferentBilling" className="text-sm">
                       Use different billing address
                     </Label>
                   </div>
                 </div>

                 {/* Billing Address Fields - Only show when checkbox is checked */}
                 {data.useDifferentBilling && (
                   <div className="space-y-4 mt-4">
                     {/* Billing Street Address */}
                <div className="mb-4">
                  <Label htmlFor="billing_street_address">Billing street address</Label>
                  <Input
                    id="billing_street_address"
                    placeholder="123 Main St"
                    value={data.billing_street_address || shippingData?.streetAddress || ''}
                    onChange={(e) => onUpdate({ billing_street_address: e.target.value })}
                    className="mt-0"
                  />
                </div>

                {/* Billing City and State */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="billing_city">City</Label>
                    <Input
                      id="billing_city"
                      placeholder="City"
                      value={data.billing_city || shippingData?.city || ''}
                      onChange={(e) => onUpdate({ billing_city: e.target.value })}
                      className="mt-0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="billing_state">State</Label>
                    <Input
                      id="billing_state"
                      placeholder="State"
                      value={data.billing_state || shippingData?.state || ''}
                      onChange={(e) => onUpdate({ billing_state: e.target.value })}
                      className="mt-0"
                    />
                  </div>
                </div>

                {/* Billing Country and ZIP */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="billing_country">Country</Label>
                    <Select value={data.billing_country || shippingData?.country || ''} onValueChange={(value) => onUpdate({ billing_country: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="billing_zipcode">ZIP Code</Label>
                    <Input
                      id="billing_zipcode"
                      placeholder="12345"
                      value={data.billing_zipcode || shippingData?.zipCode || ''}
                      onChange={(e) => onUpdate({ billing_zipcode: e.target.value })}
                      className="mt-0"
                    />
                  </div>
                </div>
                    </div>
                  )}

            </>
          )}

          {/* Check Payment Option */}
          <div className="pt-4 border-t">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="check"
                name="paymentMethod"
                checked={data.method === 'check'}
                onChange={(e) => onUpdate({ method: e.target.checked ? 'check' : 'card' })}
                className="h-4 w-4 focus:ring-purple-500 border-gray-300 rounded"
                style={{ accentColor: 'hsl(var(--primary))' }}
              />
              <Label htmlFor="check" className="text-base font-medium cursor-pointer flex items-center gap-2">
                <Mail className="w-4 h-4 text-black" />
                Pay by check instead
              </Label>
            </div>
          </div>
        </div>

        {/* Check Payment Instructions */}
        {data.method === 'check' && (
          <div className="p-4 bg-muted/50 rounded-lg border border-muted animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-2">Check Payment Instructions</h4>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Please send your check to:</p>
                  <div className="space-y-1 mb-3">
                    <p className="font-medium">HAVEN</p>
                    <p>33 Irving Pl, 3rd Floor</p>
                    <p>New York, NY 10003</p>
                    <p>United States</p>
                  </div>
                  <p className="text-xs">
                    Make checks payable to: <span className="font-medium">HAVEN | FINE</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Security Notice */}
      <div className="mt-6 p-4 bg-white rounded-lg border border-border flex items-start gap-3">
        <div className="p-2 bg-muted rounded-lg">
          <Shield className="w-5 h-5 text-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">🔒 Secure Checkout</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your payment information is encrypted with industry-standard SSL encryption. All transactions are protected.
          </p>
        </div>
      </div>



      {/* Action Buttons */}
      <div className="flex justify-between mt-6">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="gap-2 text-foreground border-0 hover:text-white transition-colors custom-back-button" 
          style={{ backgroundColor: 'hsl(0deg 0% 96.86%)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <Button 
           onClick={() => {
              if (data.method === 'card') {
                handleCardPayment();
              } else {
                handleSubmit();
              }
            }} 
           disabled={isProcessing || isLoading || (data.method !== 'check' && (!stripe || !elements)) || total === 0}
           className="gap-2 bg-black border-black text-white hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
         >
          {(isProcessing || isLoading) ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing
            </>
          ) : (
            total > 0 
              ? data.method === 'check'
                ? `Complete $${parseFloat(total.toFixed(2)).toFixed(2)}`
                : `Pay $${parseFloat(total.toFixed(2)).toFixed(2)}`
              : 'Complete Order'
          )}
        </Button>
      </div>
      
      {/* Error Display - Below Payment Button */}
      {(errors.payment || errors.api || errors.card) && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-md shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
              <div className="mt-1 text-sm text-red-700">
                {(() => {
                  const errorObj = errors.payment || errors.api || errors.card;
                  try {
                    const parsed = JSON.parse(errorObj);
                    return parsed.message || parsed.error || errorObj;
                  } catch {
                    return errorObj;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Prevent Stripe elements from remounting when only form data changes
  // Only re-render when essential props change, but allow error display updates
  return (
    prevProps.data.method === nextProps.data.method &&
    prevProps.total === nextProps.total &&
    prevProps.userEmail === nextProps.userEmail &&
    prevProps.shippingData === nextProps.shippingData &&
    prevProps.dealData === nextProps.dealData &&
    prevProps.addOns === nextProps.addOns &&
    prevProps.currency === nextProps.currency &&
    prevProps.errors.payment === nextProps.errors.payment &&
    prevProps.errors.api === nextProps.errors.api &&
    prevProps.errors.card === nextProps.errors.card
    // Intentionally NOT comparing isProcessing, isLoading to prevent remounting
  );
});