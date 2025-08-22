import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ClipboardList, Loader2 } from 'lucide-react';
import { FormProgress } from './FormProgress';
import Logo from './Logo';
import { fetchDealsData, DealsResponse, DealAddOn, Deal } from '@/services/api';
import NotFound from '@/pages/NotFound';

// Import PaymentSection directly for immediate availability
import { PaymentSection } from './PaymentSection';

// Lazy load other heavy components
const ShippingDetails = lazy(() => import('./ShippingDetails').then(module => ({ default: module.ShippingDetails })));
const AddOnsSection = lazy(() => import('./AddOnsSection').then(module => ({ default: module.AddOnsSection })));

const InvoiceSelection = lazy(() => import('./InvoiceSelection').then(module => ({ default: module.InvoiceSelection })));

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
  invoices: Record<string, boolean>;
  payment: {
    method: 'card' | 'google-pay' | 'apple-pay' | 'link' | 'check';
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardholderName?: string;
    userEmail?: string;
    paymentMethodId?: string;
    linkEmail?: string;
  };
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
    return 'US';
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
    invoices: {},
    payment: {
      method: 'card',
    },
  });

  // Fetch deals data on component mount
  useEffect(() => {
    const loadDealsData = async () => {
      try {
        setLoading(true);
        const currentDealId = dealId;
        const response = await fetchDealsData(currentDealId);
        const dealData = response.deal;
        setDealsData(dealData);
        
        // Initialize addOns state based on API response
        const initialAddOns: Record<string, boolean> = {};
        dealData.add_ons.forEach(addon => {
          initialAddOns[addon.id.toString()] = false;
        });
        
        // Initialize invoices state - select all invoices by default
        const initialInvoices: Record<string, boolean> = {};
        dealData.invoices.forEach(invoice => {
          // Select all invoices by default, but disable paid ones from being toggled
          initialInvoices[invoice.id.toString()] = true;
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
          invoices: initialInvoices,
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

  // Helper function to determine processing fee rate based on country
  const getProcessingFeeRate = useCallback((country: string) => {
    const normalizedCountry = country.toLowerCase().trim();
    const usaVariants = ['usa', 'us', 'united states', 'united states of america'];
    return usaVariants.includes(normalizedCountry) ? 0.029 : 0.024;
  }, []);

  const updateFormData = useCallback(<K extends keyof FormData>(section: K, data: Partial<FormData[K]>) => {
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
  }, []);

  const calculateTotal = useMemo(() => {
    if (!dealsData) return 0;
    
    let transactionAmount = 0;
    
    // Handle different deal types - base amount calculation
    if (dealsData.type === 'One Time') {
      // For One Time deals, only use invoice amounts if invoices are selected
      const selectedInvoiceIds = Object.keys(formData.invoices).filter(id => formData.invoices[id]);
      if (selectedInvoiceIds.length > 0 && dealsData.invoices) {
        const selectedInvoices = dealsData.invoices.filter(invoice => 
          selectedInvoiceIds.includes(invoice.id.toString()) && invoice.status !== 'Paid'
        );
        if (selectedInvoices.length > 0) {
          transactionAmount = selectedInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0);
        }
      }
      // If no invoices selected, transactionAmount remains 0
    } else if (dealsData.type === 'Subscription') {
      // For subscription deals, use monthly_subscription_price
      transactionAmount = dealsData.monthly_subscription_price || 0;
    } else {
      // For BOGO and Contract deals, use amount
      transactionAmount = dealsData.amount || 0;
    }
    
    // Handle add-ons with pricing behavior logic
    if (dealsData.add_ons) {
      const selectedAddOns = dealsData.add_ons.filter(addon => formData.addOns[addon.id.toString()]);
      
      if (selectedAddOns.length > 0) {
        if (selectedAddOns.length > 1) {
          // Multiple add-ons: use sum of add-on amounts
          transactionAmount = selectedAddOns.reduce((sum, addon) => sum + parseFloat(addon.amount), 0);
        } else {
          // Single add-on: apply pricing behavior
          const addon = selectedAddOns[0];
          if (addon.pricing_behavior.toLowerCase() === 'add') {
            transactionAmount = transactionAmount + parseFloat(addon.amount);
          } else {
            // Replace behavior or default
            transactionAmount = parseFloat(addon.amount);
          }
        }
      }
    }
    
    return transactionAmount;
  }, [dealsData, formData.invoices, formData.addOns]);

  // Calculate total with processing fee for payment processing
  const calculateTotalWithProcessingFee = useMemo(() => {
    if (calculateTotal <= 0) return 0;
    
    // For subscriptions, no processing fee
    if (dealsData?.type !== 'One Time') {
      return parseFloat(calculateTotal.toFixed(2));
    }
    
    // For one-time deals with check payment or add-ons selected, no processing fee
    if (formData.payment?.method === 'check' || Object.values(formData.addOns).some(selected => selected)) {
      return parseFloat(calculateTotal.toFixed(2));
    }
    
    // For one-time deals with digital payment and no add-ons, add processing fee
    const processingFeeRate = getProcessingFeeRate(formData.shipping.country || '');
    const totalWithFee = calculateTotal * (1 + processingFeeRate);
    return parseFloat(totalWithFee.toFixed(2));
  }, [calculateTotal, dealsData?.type, formData.payment?.method, formData.addOns, formData.shipping.country, getProcessingFeeRate]);

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
            <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
              {currentStep === 'shipping' && (
                <ShippingDetails
                  data={formData.shipping}
                  onUpdate={(data) => updateFormData('shipping', data)}
                  onNext={() => setCurrentStep('addons')}
                  dealId={dealId}
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
              

            </Suspense>
            
            {/* PaymentSection rendered directly for immediate availability */}
            {currentStep === 'payment' && (
              <PaymentSection
                data={formData.payment}
                onUpdate={(data) => updateFormData('payment', data)}
                onBack={() => setCurrentStep('addons')}
                total={calculateTotalWithProcessingFee}
                userEmail={formData.shipping.email}
                shippingData={formData.shipping}
                addOns={formData.addOns}
                invoices={formData.invoices}
                currency={dealsData?.currency as 'USD' | 'CAD' || 'USD'}
                dealId={dealId || '006VL00000LCZE1YAP'}
                dealData={dealsData ? {
                  type: dealsData.type,
                  mailing_address_country: dealsData.mailing_address_country
                } : undefined}
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
              
              {/* Invoice Selection - Only show for 'One Time' deals */}
              {dealsData?.type === 'One Time' && (
                <div className="mb-4">
                  <Suspense fallback={<div className="flex items-center justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
                    <InvoiceSelection
                      data={formData.invoices}
                      onUpdate={(data) => updateFormData('invoices', data)}
                      availableInvoices={dealsData?.invoices || []}
                      deal={dealsData}
                      loading={loading}
                      isOrderSummary={true}
                    />
                  </Suspense>
                </div>
              )}
              
              {/* Deal Summary - Show for non-'One Time' deals */}
              {dealsData?.type !== 'One Time' && (
                <div className="mb-6">
                  {/* Deal Header */}
                  <div className="bg-gradient-to-r from-black to-gray-800 text-white px-4 py-3 rounded-t-lg shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide">
                        {dealsData.type}
                      </h4>
                    </div>
                  </div>
                  
                  {/* Deal Content */}
                  <div className="bg-white border border-gray-200 rounded-b-lg p-4 space-y-3">
                    {/* Product Name */}
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Product</span>
                      <p className="font-medium text-foreground">{dealsData.deal_products[0].name }</p>
                    </div>
                    
                    {/* Price Display - Different for each deal type */}
                    {dealsData.type === 'Subscription' ? (
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">Monthly Payment</span>
                        <span className="font-medium text-foreground">${dealsData.monthly_subscription_price?.toFixed(2) || '0.00'}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">Amount</span>
                        <span className="font-medium text-foreground">${dealsData.amount?.toFixed(2) || '0.00'}</span>
                      </div>
                    )}
                    
                    {/* Additional Details based on deal type */}
                    {dealsData.type === 'Subscription' && (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground text-sm">Contract Length</span>
                          <p className="font-medium text-foreground">{dealsData.contract_length || 'N/A'}</p>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                          <span className="text-muted-foreground text-sm">Subscription Term</span>
                          <p className="font-medium text-foreground">{dealsData.subscription_term || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    
                    {(dealsData.type === 'BOGO' || dealsData.type === 'Contract') && (
                       <>
                         {dealsData.contract_length && (
                           <div className="flex justify-between items-center py-2 border-b border-border/50">
                             <span className="text-muted-foreground text-sm">Contract Length</span>
                             <p className="font-medium text-foreground">{dealsData.contract_length}</p>
                           </div>
                         )}
                         {dealsData.stage_name && (
                           <div className="flex justify-between items-center py-2 border-b border-border/50">
                             <span className="text-muted-foreground text-sm">Stage</span>
                             <p className="font-medium text-foreground">{dealsData.stage_name}</p>
                           </div>
                         )}
                         {dealsData.issue && (
                           <div className="flex justify-between items-center py-2 border-b border-border/50">
                             <span className="text-muted-foreground text-sm">Issue</span>
                             <p className="font-medium text-foreground">{dealsData.issue}</p>
                           </div>
                         )}
                       </>
                     )}
                     
                     {/* Agreement Status for BOGO, Contract, and Subscription */}
                     {(dealsData.type === 'BOGO' || dealsData.type === 'Contract' || dealsData.type === 'Subscription') && dealsData.agreement_status && (
                       <div className="flex justify-between items-center py-2 border-b border-border/50">
                         <span className="text-muted-foreground text-sm">Agreement Status</span>
                         <p className="font-medium text-foreground">{dealsData.agreement_status}</p>
                       </div>
                     )}
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {/* Show message if no invoices selected - Only for 'One Time' deals */}
                {dealsData?.type === 'One Time' && Object.values(formData.invoices).every(selected => !selected) && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <p>No invoices selected</p>
                  </div>
                )}
                
                {/* Selected Add-ons */}
                {dealsData?.add_ons.map(addon => (
                  formData.addOns[addon.id.toString()] && (
                    <div key={addon.id} className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">{addon.title}</span>
                      <span className="font-medium text-foreground">${addon.amount}</span>
                    </div>
                  )
                ))}
                
                {calculateTotal === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Select add-ons to see pricing</p>
                  </div>
                )}
                
                {calculateTotal > 0 && (
                  <>
                    {/* Only show processing fee for one-time deals */}
                    {dealsData?.type === 'One Time' && formData.payment?.method !== 'check' && Object.values(formData.addOns).every(selected => !selected) && (
                      <div className="flex justify-between items-center py-2 border-b border-border/50">
                        <span className="text-sm">Processing Fee</span>
                        <span className="font-medium">
                          ${parseFloat((calculateTotal * getProcessingFeeRate(formData.shipping.country || '')).toFixed(2)).toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-3 font-semibold text-base">
                      <span className="text-foreground">Total</span>
                      <span className="text-foreground">
                        ${(() => {
                          // For subscriptions, no processing fee
                          if (dealsData?.type !== 'One Time') {
                            return parseFloat(calculateTotal.toFixed(2)).toFixed(2);
                          }
                          // For one-time deals with check payment or add-ons selected, no processing fee
                          if (formData.payment?.method === 'check' || Object.values(formData.addOns).some(selected => selected)) {
                            return parseFloat(calculateTotal.toFixed(2)).toFixed(2);
                          }
                          // For one-time deals with digital payment and no add-ons, add processing fee
                          const processingFeeRate = getProcessingFeeRate(formData.shipping.country || '');
                          const totalWithFee = calculateTotal * (1 + processingFeeRate);
                          return parseFloat(totalWithFee.toFixed(2)).toFixed(2);
                        })()}
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