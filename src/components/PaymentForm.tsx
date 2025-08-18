import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ClipboardList } from 'lucide-react';
import { ShippingDetails } from './ShippingDetails';
import { AddOnsSection } from './AddOnsSection';
import { PaymentSection } from './PaymentSection';
import { FormProgress } from './FormProgress';
import Logo from './Logo';

export interface FormData {
  shipping: {
    name: string;
    email: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  addOns: {
    monthlyPlan: boolean;
    digitalExposure: boolean;
  };
  payment: {
    method: 'card' | 'google-pay' | 'apple-pay' | 'check';
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
  };
  currency: 'USD' | 'CAD';
}

const PaymentForm = () => {
  const [currentStep, setCurrentStep] = useState<'shipping' | 'addons' | 'payment'>('shipping');
  const [formData, setFormData] = useState<FormData>({
    shipping: {
      name: '',
      email: '',
      streetAddress: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
    addOns: {
      monthlyPlan: false,
      digitalExposure: false,
    },
    payment: {
      method: 'card',
    },
    currency: 'USD',
  });

  const updateFormData = <K extends keyof FormData>(section: K, data: Partial<FormData[K]>) => {
    setFormData(prev => {
      const currentSection = prev[section];
      if (typeof currentSection === 'object' && currentSection !== null) {
        return {
          ...prev,
          [section]: { ...currentSection, ...data }
        };
      }
      return {
        ...prev,
        [section]: data
      };
    });
  };

  const calculateTotal = () => {
    let total = 0;
    
    // Monthly Plan replaces the Single Full Page
    if (formData.addOns.monthlyPlan) {
      total = 195; // Monthly plan base price
    } else {
      total = 495; // Single Full Page base price
    }
    
    // Enhanced Digital Exposure is an add-on to either plan
    if (formData.addOns.digitalExposure) total += 95;
    
    return total;
  };

  // Payment status logic
  const getPaymentStatus = () => {
    const dueDate = new Date('2025-08-25'); // Updated due date: August 25, 2025
    const today = new Date();
    
    // Reset time to compare just dates
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    if (today > dueDate) {
      return {
        status: 'Overdue',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800'
      };
    } else {
      return {
        status: 'Open',
        bgColor: 'bg-gray-100',
        textColor: 'text-foreground'
      };
    }
  };

  const paymentStatus = getPaymentStatus();

  const getNextChargeDate = () => {
    const now = new Date();
    const next = new Date(now);
    next.setMonth(now.getMonth() + 1);
    return next.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
            <div className="min-h-screen p-4 md:p-8 relative" style={{ 
          borderTop: '3px solid black',
          backgroundColor: 'hsl(0 0% 96.86%)' // #f7f7f7 converted to HSL
        }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in" style={{ marginTop: '1.2rem' }}>
          <div className="mb-2">
            <Logo size="lg" className="mx-auto" />
          </div>
          <p className="text-muted-foreground">Last steps — simple and secure</p>
          

        </div>

        {/* Progress Indicator */}
        <FormProgress currentStep={currentStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            {currentStep === 'shipping' && (
              <ShippingDetails
                data={formData.shipping}
                onUpdate={(data) => updateFormData('shipping', data)}
                onNext={() => setCurrentStep('addons')}
              />
            )}
            
            {currentStep === 'addons' && (
              <AddOnsSection
                data={formData.addOns}
                onUpdate={(data) => updateFormData('addOns', data)}
                onNext={() => setCurrentStep('payment')}
                onBack={() => setCurrentStep('shipping')}
              />
            )}
            
            {currentStep === 'payment' && (
              <PaymentSection
                data={formData.payment}
                onUpdate={(data) => updateFormData('payment', data)}
                onBack={() => setCurrentStep('addons')}
                total={calculateTotal()}
                userEmail={formData.shipping.email}
                shippingData={formData.shipping}
                addOns={formData.addOns}
                currency={formData.currency}
              />
            )}
          </div>

          {/* Order Summary - Always Visible */}
          <div className="lg:col-span-1">
            <Card className="p-6 border-0 sticky top-8">
              <div className="flex items-center gap-3 mb-4">
                <ClipboardList className="w-5 h-5 text-foreground" />
                <h3 className="text-lg font-semibold text-foreground" style={{ fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02rem' }}>Order Summary</h3>
              </div>
              
              {/* Invoice Number */}
              <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                <span className="text-sm">Invoice #</span>
                <span className="font-medium">INV-2024-001</span>
              </div>
              
              {/* Payment Due Date */}
              <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                <span className="text-sm">Payment Due</span>
                <span className="font-medium">Aug 25, 2025</span>
              </div>
              
              {/* Payment Status */}
              <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                <span className="text-sm">Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentStatus.bgColor} ${paymentStatus.textColor}`}>
                  {paymentStatus.status}
                </span>
              </div>
              
              <div className="space-y-3">
                {/* Base Order Item or Monthly Plan */}
                {formData.addOns.monthlyPlan ? (
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm">Monthly Plan</span>
                    <span className="font-medium">$195</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm">Single Full Page</span>
                    <span className="font-medium">$495</span>
                  </div>
                )}
                
                {/* Enhanced Digital Exposure is an add-on */}
                {formData.addOns.digitalExposure && (
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm">Enhanced Digital Exposure</span>
                    <span className="font-medium">$95</span>
                  </div>
                )}
                
                {calculateTotal() === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Select add-ons to see pricing</p>
                  </div>
                )}
                
                {calculateTotal() > 0 && (
                  <>
                    {formData.payment?.method !== 'check' && !formData.addOns.monthlyPlan && !formData.addOns.digitalExposure && (
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm">Processing Fee</span>
                        <span className="font-medium">
                          ${(calculateTotal() * (formData.currency === 'CAD' ? 0.024 : 0.029)).toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-3 text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        ${(formData.payment?.method === 'check' || formData.addOns.monthlyPlan || formData.addOns.digitalExposure)
                          ? calculateTotal().toFixed(2) 
                          : (calculateTotal() * (1 + (formData.currency === 'CAD' ? 0.024 : 0.029))).toFixed(2)
                        }
                      </span>
                    </div>
                    
                    {/* Monthly Plan Notice */}
                    {formData.addOns.monthlyPlan && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-muted">
                        <p className="text-xs text-muted-foreground">
                          Monthly billing — ${calculateTotal().toFixed(2)}/month. 8 print issues/year; digital content refreshed monthly.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          First charge today; next charge on {getNextChargeDate()}. Receipts will be emailed to you. 12-month commitment; billed monthly; renews annually.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;