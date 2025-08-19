import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ClipboardList, Loader2 } from 'lucide-react';
import { ShippingDetails } from './ShippingDetails';
import { AddOnsSection } from './AddOnsSection';
import { PaymentSection } from './PaymentSection';
import { FormProgress } from './FormProgress';
import Logo from './Logo';
import { fetchDealsData, DealsResponse, DealAddOn, Deal } from '@/services/api';
import NotFound from '@/pages/NotFound';

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
  addOns: Record<string, boolean>;
  payment: {
    method: 'card' | 'google-pay' | 'apple-pay' | 'check';
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
  };
  currency: 'USD' | 'CAD';
}

const PaymentForm = () => {
  const { dealId } = useParams<{ dealId: string }>();
  const [currentStep, setCurrentStep] = useState<'shipping' | 'addons' | 'payment'>('shipping');
  const [dealsData, setDealsData] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotFound, setShowNotFound] = useState(false);

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
    addOns: {},
    payment: {
      method: 'card',
    },
    currency: 'USD',
  });

  // Fetch deals data on component mount
  useEffect(() => {
    const loadDealsData = async () => {
      try {
        setLoading(true);
        const currentDealId = dealId || '006VL00000LCZE1YAP'; // Use URL param or fallback
        const response = await fetchDealsData(currentDealId);
        const dealData = response.deal;
        setDealsData(dealData);
        
        // Initialize addOns state based on API response
        const initialAddOns: Record<string, boolean> = {};
        dealData.add_ons.forEach(addon => {
          initialAddOns[addon.id.toString()] = false;
        });
        
        // Pre-fill form data from API response
        setFormData(prev => ({
          ...prev,
          shipping: {
            ...prev.shipping,
            name: dealData.name || '',
            email: dealData.contact_email || '',
            streetAddress: dealData.mailing_address_street || '',
            city: dealData.mailing_address_city || '',
            state: dealData.mailing_address_state || '',
            country: normalizeCountry(dealData.mailing_address_country || ''),
            zipCode: dealData.mailing_address_zipcode || ''
          },
          addOns: initialAddOns,
          currency: dealData.currency as 'USD' | 'CAD'
        }));
      } catch (err) {
        console.error('API Error:', err);
        // Show NotFound component inline instead of redirecting
        setShowNotFound(true);
        setError(err instanceof Error ? err.message : 'Failed to load deals data');
      } finally {
        setLoading(false);
      }
    };

    loadDealsData();
  }, [dealId]);

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
    if (!dealsData) return 0;
    
    let total = dealsData.amount;
    
    // Add selected add-ons
    dealsData.add_ons.forEach(addon => {
      if (formData.addOns[addon.id.toString()]) {
        if (addon.pricing_behavior === 'Replace') {
          // For replace behavior, use the addon price instead of base price
          total = parseFloat(addon.amount);
        } else {
          // For add behavior, add to the total
          total += parseFloat(addon.amount);
        }
      }
    });
    
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

  // Show loading spinner while API call is in progress
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ 
        borderTop: '3px solid black',
        backgroundColor: 'hsl(0 0% 96.86%)'
      }}>
        <div className="text-center">
          <div className="mb-4">
            <Logo size="lg" className="mx-auto" />
          </div>
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Loading your checkout...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show NotFound component if API error occurred
  if (showNotFound) {
    return <NotFound />;
  }

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
                availableAddOns={dealsData?.add_ons || []}
                loading={loading}
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
                <span className="font-medium">{dealsData?.invoices[0]?.invoice_num || 'N/A'}</span>
              </div>
              
              {/* Payment Due Date */}
              <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                <span className="text-sm">Payment Due</span>
                <span className="font-medium">{dealsData?.invoices[0]?.due_date ? new Date(dealsData.invoices[0].due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
              </div>
              
              {/* Payment Status */}
              <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                <span className="text-sm">Status</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${paymentStatus.bgColor} ${paymentStatus.textColor}`}>
                  {dealsData?.invoices[0]?.status || paymentStatus.status}
                </span>
              </div>
              
              <div className="space-y-3">
                {/* Base Deal */}
                {dealsData && (
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-sm">{dealsData.deal_products[0]?.name || 'Base Deal'}</span>
                    <span className="font-medium">${dealsData.amount}</span>
                  </div>
                )}
                
                {/* Selected Add-ons */}
                {dealsData?.add_ons.map(addon => (
                  formData.addOns[addon.id.toString()] && (
                    <div key={addon.id} className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm">{addon.title}</span>
                      <span className="font-medium">${addon.amount}</span>
                    </div>
                  )
                ))}
                
                {calculateTotal() === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Select add-ons to see pricing</p>
                  </div>
                )}
                
                {calculateTotal() > 0 && (
                  <>
                    {formData.payment?.method !== 'check' && Object.values(formData.addOns).every(selected => !selected) && (
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
                        ${(formData.payment?.method === 'check' || Object.values(formData.addOns).some(selected => selected))
                          ? calculateTotal().toFixed(2) 
                          : (calculateTotal() * (1 + (formData.currency === 'CAD' ? 0.024 : 0.029))).toFixed(2)
                        }
                      </span>
                    </div>
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