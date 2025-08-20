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
import { processPayment, PaymentData as ApiPaymentData } from '@/services/api';

// Initialize Stripe


interface PaymentFormData {
  method: 'card' | 'google-pay' | 'apple-pay' | 'link' | 'check';
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
  country?: string;
  zipCode?: string;
  userEmail?: string;
  paymentMethodId?: string;
  linkEmail?: string;
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
  // Removed useAppleDevice hook - relying solely on Stripe's canMakePayment method
  
  // Handle Stripe payment success
  const handlePaymentSuccess = async (paymentMethodId: string, method: string) => {
    setIsProcessing(true);
    // Clear any previous API errors
    setErrors({ ...errors, api: '' });
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
      setErrors({ ...errors, api: errorMessage });
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
        add_ons: selectedAddOns,
        invoice_ids: selectedInvoices,
      };

      const result = await processPayment(paymentData);
      console.log('Checkout successful:', result);
      // Handle successful checkout (redirect, show success message, etc.)
    } catch (error) {
      console.error('Payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
      setErrors({ ...errors, api: errorMessage });
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
      if (!data.country) {
        updates.country = shippingData.country ? normalizeCountry(shippingData.country) : '';
      }
      if (!data.zipCode) {
        updates.zipCode = shippingData.zipCode || '';
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
    if (!data.cardNumber?.trim()) newErrors.cardNumber = 'Card number is required';
    if (!data.expiryDate?.trim()) newErrors.expiryDate = 'Expiry date is required';
    if (!data.cvv?.trim()) newErrors.cvv = 'CVV is required';
    if (!data.cardholderName?.trim()) newErrors.cardholderName = 'Cardholder name is required';
    if (!data.country?.trim()) newErrors.country = 'Country is required';
    if (!data.zipCode?.trim()) newErrors.zipCode = 'ZIP code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    // Prevent submission if total is 0 or missing
    if (total <= 0) {
      setErrors({ ...errors, api: 'Cannot complete order with zero total amount. Please select items or contact support.' });
      return;
    }
    
    if (validateForm()) {
      // Handle payment submission
      console.log('Processing payment...', { data, total });
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

        handleInputChange={handleInputChange}
        validateForm={validateForm}
        handleSubmit={handleSubmit}
        formatCardNumber={formatCardNumber}
        formatExpiryDate={formatExpiryDate}
        getProcessingFeeRate={getProcessingFeeRate}
        countries={countries}
      />
    </Card>
  );
});

// Stripe Payment Content Component (inside Elements provider)
const StripePaymentContent = ({ 
  data, onUpdate, total, userEmail, shippingData, dealData, onPaymentSuccess, 
  errors, setErrors, isProcessing, setIsProcessing, isLoading, addOns, currency, onBack,
  handleInputChange, validateForm, handleSubmit,
  formatCardNumber, formatExpiryDate, getProcessingFeeRate, countries
}: {
  data: PaymentFormData;
  onUpdate: (data: Partial<PaymentFormData>) => void;
  total: number;
  userEmail?: string;
  shippingData?: { name?: string; country?: string; zipCode?: string; };
  dealData?: { type: string; mailing_address_country: string; };
  onPaymentSuccess: (paymentMethodId: string, method: string) => void;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  isLoading: boolean;
  addOns?: Record<string, boolean>;
  currency: 'USD' | 'CAD';
  onBack: () => void;
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
  const { paymentRequest, canMakePayment, updatePaymentRequest, setPaymentMethodHandler } = usePaymentRequest();

  // Set up payment method handler when component mounts
  useEffect(() => {
    setPaymentMethodHandler(onPaymentSuccess);
  }, [onPaymentSuccess, setPaymentMethodHandler]);

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
    // Clear any previous payment errors
    setErrors({ ...errors, payment: '' });

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: data.cardholderName,
          email: userEmail,
          address: {
            country: data.country,
            postal_code: data.zipCode,
          },
        },
      });

      if (error) {
        console.error('Payment method creation failed:', error);
        setErrors({ ...errors, payment: error.message || 'Payment failed' });
        setIsProcessing(false);
        return;
      }

      // Call the payment success handler
      await onPaymentSuccess(paymentMethod.id, 'card');
    } catch (error) {
      console.error('Payment processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed. Please try again.';
      setErrors({ ...errors, payment: errorMessage });
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Single Payment Request Button that handles Apple Pay, Google Pay, and Link */}
      {paymentRequest && canMakePayment && (
        <div className="mb-6">
          <div className="w-full h-12 rounded-lg overflow-hidden">
            <PaymentRequestButtonElement 
              key={`payment-request-${total}`}
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
      )}

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
      </div>

      {/* Credit Card Form */}
      <div className="space-y-4 animate-fade-in">
        <div className="space-y-4 animate-fade-in">
          {/* Email Field - Pre-filled from previous stage */}
           <div className="pt-4">
             <Label htmlFor="email">Email</Label>
             <Input
               id="email"
               type="email"
               value={data.userEmail || userEmail || ''}
               placeholder="email@example.com"
               onChange={(e) => handleInputChange('userEmail', e.target.value)}
               className={`bg-background mt-0 ${errors.userEmail ? 'border-red-500' : ''}`}
             />
             {errors.userEmail && <p className="text-xs text-red-500 mt-1">{errors.userEmail}</p>}
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
                        setErrors({ ...errors, card: event.error.message });
                      } else {
                        setErrors({ ...errors, card: '' });
                      }
                    }}
                  />
                </div>
                {/* Card Element Errors - Below Card Element */}
                {errors.card && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.card}
                  </p>
                )}
                {/* Payment Method Creation Errors - Below Card Element */}
                {errors.payment && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.payment}
                  </p>
                )}
              </div>

              {/* Cardholder Name */}
              <div>
                <Label htmlFor="cardholderName">Cardholder name</Label>
                <Input
                  id="cardholderName"
                  placeholder="Full name on card"
                  value={data.cardholderName || ''}
                  onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                  className={`mt-0 ${errors.cardholderName ? 'border-red-500' : ''}`}
                />
                {errors.cardholderName && <p className="text-xs text-red-500">{errors.cardholderName}</p>}
              </div>

              {/* Country and ZIP Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={data.country || ''}
                    onValueChange={(value) => handleInputChange('country', value)}
                  >
                    <SelectTrigger 
                      className={`mt-0 custom-country-select ${errors.country ? 'border-red-500' : ''}`}
                      style={{ backgroundColor: '#f7f7f7', border: '1px solid rgba(0, 0, 0, 0.1)' }}
                    >
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#f7f7f7]">
                      {countries.map((country) => (
                        <SelectItem 
                          key={country} 
                          value={country}
                          className="hover:bg-gray-200 focus:bg-gray-200 data-[highlighted]:bg-gray-200"
                        >
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.country && <p className="text-xs text-red-500">{errors.country}</p>}
                </div>
                
                <div>
                  <Label htmlFor="zipCode">ZIP</Label>
                  <Input
                    id="zipCode"
                    placeholder="12345"
                    value={data.zipCode || ''}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    className={`mt-0 ${errors.zipCode ? 'border-red-500' : ''}`}
                  />
                  {errors.zipCode && <p className="text-xs text-red-500">{errors.zipCode}</p>}
                </div>
              </div>
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

      {/* Processing Fee Information - Only for one-time deals with selected invoices */}
      {dealData?.type === 'One Time' && data.method !== 'check' && total > 0 && (!addOns || !Object.values(addOns).some(selected => selected)) && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-muted">
          <p className="text-sm text-muted-foreground">
            {(() => {
              const country = data.country || shippingData?.country || '';
              const feeRate = getProcessingFeeRate(country);
              return `${(feeRate * 100).toFixed(1)}% processing fee applies to digital payments. Check payments have no fee.`;
            })()}
          </p>
        </div>
      )}

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
      
      {/* API Error Display - Below Payment Button */}
      {errors.api && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.api}</p>
        </div>
      )}
    </>
  );
};