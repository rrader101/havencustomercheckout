import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CreditCard, Shield, Receipt, Link, Zap, Mail } from 'lucide-react';
import { useAppleDevice } from '../hooks/use-apple-device';

interface PaymentData {
  method: 'card' | 'google-pay' | 'apple-pay' | 'check';
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
  country?: string;
  zipCode?: string;
  userEmail?: string;
}

interface PaymentSectionProps {
  data: PaymentData;
  onUpdate: (data: Partial<PaymentData>) => void;
  onBack: () => void;
  total: number;
  userEmail?: string;
  shippingData?: {
    name?: string;
    country?: string;
    zipCode?: string;
  };
  addOns?: Record<string, boolean>;
  currency: 'USD' | 'CAD';
  dealData?: {
    type: string;
    mailing_address_country: string;
  };
}

export const PaymentSection = React.memo(({ data, onUpdate, onBack, total, userEmail, shippingData, addOns, currency, dealData }: PaymentSectionProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const [hasAutoPopulated, setHasAutoPopulated] = useState(false);
  const { isApplePaySupported } = useAppleDevice();

  // Helper function to determine processing fee rate based on country
  const getProcessingFeeRate = (country: string) => {
    const normalizedCountry = country.toLowerCase().trim();
    const usaVariants = ['usa', 'us', 'united states', 'united states of america'];
    return usaVariants.includes(normalizedCountry) ? 0.029 : 0.024;
  };

  // Comprehensive country list (same as ShippingDetails)
  const countries = ['USA', 'Canada'];

  // Normalize country names to match dropdown options
  const normalizeCountry = (country: string): string => {
    const normalized = country.toLowerCase().trim();
    if (['usa', 'us', 'united states', 'united states of america'].includes(normalized)) {
      return 'USA';
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
      const updates: Partial<PaymentData> = {};
      
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
  }, [shippingData, onUpdate, data.method, data.cardholderName, data.country, data.zipCode]);





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
    if (validateForm()) {
      // Handle payment submission
      console.log('Processing payment...', { data, total });
    }
  };

  const handleInputChange = (field: keyof PaymentData, value: string) => {
    onUpdate({ [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAutoPopulate = async () => {
    if (!userEmail) return;
    
    setIsAutoPopulating(true);
    
    // Simulate API call to Link service
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock data - in real implementation, this would come from Link API
    const mockPaymentData = {
      cardNumber: '4242 4242 4242 4242',
      expiryDate: '12/28',
      cvv: '123'
    };
    
    onUpdate(mockPaymentData);
    setHasAutoPopulated(true);
    setIsAutoPopulating(false);
    
    // Show success message
    console.log('Payment information auto-populated successfully!');
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
      

                      {/* Top Priority Payment Buttons - Stripe Style */}
         <div className="mb-6">
           {/* Apple Pay/Google Pay and Link Buttons in Two Columns */}
           <div className="grid grid-cols-2 gap-3">
             {/* Apple Pay or Google Pay Button - Show one or the other */}
             {isApplePaySupported ? (
               <Button 
                 variant="outline" 
                 className="w-full h-12 bg-black text-white hover:bg-gray-800 hover:text-white border-black rounded-lg"
                 onClick={() => onUpdate({ method: 'apple-pay' })}
               >
                 {/* Official Apple Pay Logo */}
                 <img 
                   src="/Apple_Pay_logo_white.png" 
                   alt="Apple Pay" 
                   className="h-5 w-auto"
                 />
               </Button>
             ) : (
               <Button 
                 variant="outline" 
                 className="w-full h-12 bg-black text-white hover:bg-gray-800 hover:text-white border-black rounded-lg"
                 onClick={() => onUpdate({ method: 'google-pay' })}
               >
                 {/* Official Google Pay Logo */}
                 <img 
                   src="/Google_Pay_logo_whitePay_fixed.png" 
                   alt="Google Pay" 
                   className="h-6 w-auto"
                 />
               </Button>
             )}

             {/* Stripe Link Button */}
             <Button 
               variant="outline" 
               className="w-full h-12 bg-[#f7f7f7] text-gray-900 hover:bg-gray-200 hover:text-gray-900 border border-gray-300 rounded-lg"
               onClick={handleAutoPopulate}
               disabled={isAutoPopulating}
             >
               <div className="flex items-center justify-center">
                 {/* Official Link Logo */}
                 <img 
                   src="/Link_logo_transparent.png" 
                   alt="Pay with Link" 
                   className="h-5 w-auto"
                 />
               </div>
             </Button>
           </div>
         </div>

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

               {/* Credit Card Fields - Only show when check is NOT selected */}
               {data.method !== 'check' && (
                 <>
                   {/* Card Information */}
                   <div>
                     <Label htmlFor="cardNumber">Card information</Label>
                     <Input
                       id="cardNumber"
                       placeholder="1234 1234 1234 1234"
                       value={data.cardNumber || ''}
                       onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                       className={`mt-0 ${errors.cardNumber ? 'border-red-500' : ''}`}
                     />
                     {errors.cardNumber && <p className="text-xs text-red-500">{errors.cardNumber}</p>}
                   </div>

                   {/* Expiry and CVC Row */}
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label htmlFor="expiryDate">Expiry date</Label>
                       <Input
                         id="expiryDate"
                         placeholder="MM/YY"
                         value={data.expiryDate || ''}
                         onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
                         className={`mt-0 ${errors.expiryDate ? 'border-red-500' : ''}`}
                       />
                       {errors.expiryDate && <p className="text-xs text-red-500">{errors.expiryDate}</p>}
                     </div>
                     
                     <div>
                       <Label htmlFor="cvv">CVC</Label>
                       <Input
                         id="cvv"
                         placeholder="123"
                         value={data.cvv || ''}
                         onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                         className={`mt-0 ${errors.cvv ? 'border-red-500' : ''}`}
                       />
                       {errors.cvv && <p className="text-xs text-red-500">{errors.cvv}</p>}
                     </div>
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

      {/* Processing Fee Information - Only for one-time deals */}
      {dealData?.type === 'One Time' && data.method !== 'check' && (!addOns || !Object.values(addOns).some(selected => selected)) && (
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
            onClick={handleSubmit} 
            className="gap-2 bg-primary hover:bg-primary-hover transition-colors"
          >
            {total > 0 
              ? data.method === 'check'
                ? `Complete $${total.toFixed(2)}`
                : (addOns && Object.values(addOns).some(selected => selected))
                  ? `Pay $${total.toFixed(2)}`
                  : dealData?.type === 'One Time'
                    ? (() => {
                        const country = data.country || shippingData?.country || '';
                        const feeRate = getProcessingFeeRate(country);
                        return `Pay $${(total * (1 + feeRate)).toFixed(2)}`;
                      })()
                    : `Pay $${total.toFixed(2)}` // No processing fee for subscriptions
              : 'Complete Order'
            }
          </Button>
         </div>


       </Card>
     );
});