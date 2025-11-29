import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { ClipboardList, Loader2 } from 'lucide-react';
import { FormProgress } from './FormProgress';
import Logo from './Logo';
import { fetchDealsData, DealsResponse, DealAddOn, Deal } from '@/services/api';
import NotFound from '@/pages/NotFound';
import { usePostHog } from 'posthog-js/react';
import { CheckoutEvents, CheckoutEventProperties, getTimestamp } from '@/lib/analytics';

// Import commonly used components directly for immediate availability
import { PaymentSection } from './PaymentSection';
import { AddOnsSection } from './AddOnsSection';
import { ShippingDetails } from './ShippingDetails';

// Lazy load less frequently used components
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStep = (searchParams.get('step') || 'shipping') as 'shipping' | 'addons' | 'payment';
  const [currentStep, setCurrentStep] = useState<'shipping' | 'addons' | 'payment'>(initialStep);
  const [dealsData, setDealsData] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotFound, setShowNotFound] = useState(false);
  const [stepStartTime, setStepStartTime] = useState<Date>(new Date());
  const posthog = usePostHog();
  const hasLoadedData = useRef(false);

  const handleStepChange = useCallback((step: 'shipping' | 'addons' | 'payment') => {
    const now = new Date();
    const timeSpent = now.getTime() - stepStartTime.getTime();

    // PostHog: Track step transition
    if (posthog) {
      posthog.capture(CheckoutEvents.CHECKOUT_STEP_TRANSITION, {
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.FROM_STEP]: currentStep,
        [CheckoutEventProperties.TO_STEP]: step,
        [CheckoutEventProperties.TIME_SPENT_MS]: timeSpent,
        [CheckoutEventProperties.TIME_SPENT_SECONDS]: Math.round(timeSpent / 1000),
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
      });
    }

    setCurrentStep(step);
    setStepStartTime(now);
    navigate(`?step=${step}`, { replace: true });
  }, [navigate, currentStep, stepStartTime, posthog, dealId]);

  // Normalize country names to match dropdown options
  const normalizeCountry = (country: string): string => {
    const normalized = country.toLowerCase().trim();
    if (['usa', 'us', 'united states', 'united states of america'].includes(normalized)) {
      // Match dropdown option value
      return 'United States';
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
    // Only load once
    if (hasLoadedData.current) return;
    
    const loadDealsData = async () => {
      try {
        setLoading(true);
        hasLoadedData.current = true;
        const currentDealId = dealId;
        const response = await fetchDealsData(currentDealId);
        const dealData = response.deal;
        setDealsData(dealData);
        
        // Initialize addOns state based on API response
        const initialAddOns: Record<string, boolean> = {};
        dealData.add_ons.forEach(addon => {
          initialAddOns[addon.id.toString()] = false;
        });

        // Try to restore add-ons from localStorage
        const localStorageKey = `checkout_addons_${currentDealId}`;
        const savedAddOns = localStorage.getItem(localStorageKey);
        if (savedAddOns) {
          try {
            const parsedAddOns = JSON.parse(savedAddOns);
            // Only restore add-ons that still exist in the current deal
            Object.keys(parsedAddOns).forEach(addonId => {
              if (addonId in initialAddOns) {
                initialAddOns[addonId] = parsedAddOns[addonId];
              }
            });
          } catch (e) {
            console.error('Failed to parse saved add-ons:', e);
          }
        }
        
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

        // PostHog: Track API error
        if (posthog) {
          posthog.capture(CheckoutEvents.API_ERROR, {
            [CheckoutEventProperties.ERROR_TYPE]: 'deals_data_load_failed',
            [CheckoutEventProperties.ERROR_MESSAGE]: err instanceof Error ? err.message : 'Unknown error',
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadDealsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]); // Only re-run if dealId changes

  // Separate effect for PostHog tracking (runs when posthog is ready)
  useEffect(() => {
    if (posthog && dealsData) {
      posthog.identify(dealsData.contact_email || `deal_${dealId}`, {
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.DEAL_TYPE]: dealsData.type,
        [CheckoutEventProperties.CURRENCY]: dealsData.currency,
        [CheckoutEventProperties.COUNTRY]: dealsData.mailing_address_country,
        name: dealsData.name,
        contact_email: dealsData.contact_email
      });

      posthog.capture(CheckoutEvents.CHECKOUT_PAGE_VIEW, {
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.DEAL_TYPE]: dealsData.type,
        [CheckoutEventProperties.CURRENCY]: dealsData.currency,
        [CheckoutEventProperties.CURRENT_STEP]: initialStep,
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
      });
    }
  }, [posthog, dealsData, dealId, initialStep]);

  // Helper function to determine processing fee rate based on country
  const getProcessingFeeRate = useCallback((country: string) => {
    const normalizedCountry = country.toLowerCase().trim();
    const usaVariants = ['usa', 'us', 'united states', 'united states of america'];
    return usaVariants.includes(normalizedCountry) ? 0.029 : 0.024;
  }, []);

  const updateFormData = useCallback(<K extends keyof FormData>(section: K, data: Partial<FormData[K]>) => {
    setFormData(prev => {
      const currentSection = prev[section];
      const newFormData = typeof currentSection === 'object' && currentSection !== null
        ? { ...prev, [section]: { ...currentSection, ...data } }
        : { ...prev, [section]: data };

      // Save add-ons to localStorage when they change
      if (section === 'addOns' && dealId) {
        const localStorageKey = `checkout_addons_${dealId}`;
        const updatedAddOns = typeof currentSection === 'object' && currentSection !== null
          ? { ...currentSection, ...data }
          : data;
        localStorage.setItem(localStorageKey, JSON.stringify(updatedAddOns));
      }

      // PostHog: Track form updates (using the updated values from newFormData)
      if (posthog && dealsData) {
        if (section === 'addOns' && data) {
          Object.keys(data).forEach(addonId => {
            const addon = dealsData.add_ons.find(a => a.id.toString() === addonId);
            if (addon) {
              const wasSelected = prev.addOns[addonId];
              const nowSelected = (data as Record<string, boolean>)[addonId];
              if (wasSelected !== nowSelected) {
                posthog.capture(nowSelected ? CheckoutEvents.ADDON_SELECTED : CheckoutEvents.ADDON_DESELECTED, {
                  [CheckoutEventProperties.ADDON_ID]: addonId,
                  [CheckoutEventProperties.ADDON_TITLE]: addon.title,
                  [CheckoutEventProperties.ADDON_AMOUNT]: addon.amount,
                  [CheckoutEventProperties.DEAL_ID]: dealId,
                  [CheckoutEventProperties.CURRENT_STEP]: currentStep,
                  [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
                });
              }
            }
          });
        } else if (section === 'invoices' && data) {
          Object.keys(data).forEach(invoiceId => {
            const invoice = dealsData.invoices.find(i => i.id.toString() === invoiceId);
            if (invoice) {
              const wasSelected = prev.invoices[invoiceId];
              const nowSelected = (data as Record<string, boolean>)[invoiceId];
              if (wasSelected !== nowSelected) {
                posthog.capture(nowSelected ? CheckoutEvents.INVOICE_SELECTED : CheckoutEvents.INVOICE_DESELECTED, {
                  [CheckoutEventProperties.INVOICE_ID]: invoiceId,
                  [CheckoutEventProperties.INVOICE_AMOUNT]: invoice.amount,
                  [CheckoutEventProperties.DEAL_ID]: dealId,
                  [CheckoutEventProperties.CURRENT_STEP]: currentStep,
                  [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
                });
              }
            }
          });
        } else if (section === 'payment' && data) {
          const paymentData = data as Partial<FormData['payment']>;
          if (paymentData.method && paymentData.method !== prev.payment.method) {
            posthog.capture(CheckoutEvents.PAYMENT_METHOD_CHANGED, {
              [CheckoutEventProperties.PAYMENT_METHOD]: paymentData.method,
              [CheckoutEventProperties.DEAL_ID]: dealId,
              [CheckoutEventProperties.CURRENT_STEP]: currentStep,
              [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
            });
          }
        }
      }

      return newFormData;
    });
  }, [posthog, dealsData, dealId, currentStep]);

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

  const getNextChargeDate = () => {
    const now = new Date();
    const next = new Date(now);
    next.setMonth(now.getMonth() + 1);
    return next.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // PostHog: Track page drop-off on unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (posthog) {
        posthog.capture(CheckoutEvents.CHECKOUT_DROP_OFF, {
          [CheckoutEventProperties.CURRENT_STEP]: currentStep,
          [CheckoutEventProperties.DEAL_ID]: dealId,
          [CheckoutEventProperties.TIME_SPENT_SECONDS]: Math.round((new Date().getTime() - stepStartTime.getTime()) / 1000),
          [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [posthog, currentStep, dealId, stepStartTime]);

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
      backgroundColor: 'hsl(0 0% 96.86%)'
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

        <div className={`transition-all duration-700 ease-in-out ${
          currentStep === 'shipping' 
            ? 'grid grid-cols-1 max-w-4xl mx-auto' 
            : 'grid grid-cols-1 lg:grid-cols-3 gap-8'
        } mt-8`}>
          {/* Main Form Area */}
          <div className={`transition-all duration-700 ease-in-out ${
            currentStep === 'shipping' 
              ? 'w-full' 
              : 'lg:col-span-2'
          } space-y-6`}>
            {currentStep === 'shipping' && (
              <ShippingDetails
                data={formData.shipping}
                onUpdate={(data) => updateFormData('shipping', data)}
                onNext={() => handleStepChange('addons')}
                dealId={dealId}
              />
            )}
            
            {currentStep === 'addons' && (
              <AddOnsSection
                data={formData.addOns}
                onUpdate={(data) => updateFormData('addOns', data)}
                onNext={() => handleStepChange('payment')}
                onBack={() => handleStepChange('shipping')}
                availableAddOns={dealsData?.add_ons || []}
                loading={loading}
                dealId={dealId}
              />
            )}
            
            {currentStep === 'payment' && (
              <PaymentSection
                data={formData.payment}
                onUpdate={(data) => updateFormData('payment', data)}
                onBack={() => handleStepChange('addons')}
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

          {/* Order Summary - Only visible after shipping stage */}
          {currentStep !== 'shipping' && (
            <div
              className={"lg:col-span-1 animate-slide-in-right-fast transform-gpu"}
              style={{ willChange: 'transform, opacity' }}
            >
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
                  <>
                    {/* Invoice Number */}
                    <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                      <span className="text-sm">Deal Type</span>
                      <span className="font-medium">{dealsData.type}</span>
                    </div>
                    
                    {/* Product Name */}
                    <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                      <span className="text-sm">Product</span>
                      <span className="font-medium">{dealsData.deal_products[0].name}</span>
                    </div>
                    
                    {/* Price Display - Different for each deal type */}
                    {dealsData.type === 'Subscription' ? (
                      <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                        <span className="text-sm">Monthly Payment</span>
                        <span className="font-medium">${dealsData.monthly_subscription_price?.toFixed(2) || '0.00'}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                        <span className="text-sm">Amount</span>
                        <span className="font-medium">${dealsData.amount?.toFixed(2) || '0.00'}</span>
                      </div>
                    )}

                    {/* Additional Details based on deal type */}
                    {dealsData.type === 'Subscription' && (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                          <span className="text-sm">Contract Length</span>
                          <span className="font-medium">{dealsData.contract_length || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                          <span className="text-sm">Subscription Term</span>
                          <span className="font-medium">{dealsData.subscription_term || 'N/A'}</span>
                        </div>
                      </>
                    )}

                    {(dealsData.type === 'BOGO' || dealsData.type === 'Contract') && (
                      <>
                        {dealsData.contract_length && (
                          <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                            <span className="text-sm">Contract Length</span>
                            <span className="font-medium">{dealsData.contract_length}</span>
                          </div>
                        )}
                        {dealsData.stage_name && (
                          <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                            <span className="text-sm">Stage</span>
                            <span className="font-medium">{dealsData.stage_name}</span>
                          </div>
                        )}
                        {dealsData.issue && (
                          <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                            <span className="text-sm">Issue</span>
                            <span className="font-medium">{dealsData.issue}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Agreement Status for BOGO, Contract, and Subscription */}
                    {(dealsData.type === 'BOGO' || dealsData.type === 'Contract' || dealsData.type === 'Subscription') && dealsData.agreement_status && (
                      <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                        <span className="text-sm">Agreement Status</span>
                        <span className="font-medium">{dealsData.agreement_status}</span>
                      </div>
                    )}
                  </>
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
                        <span className="text-sm">{addon.title}</span>
                        <span className="font-medium">${addon.amount}</span>
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
                      
                      <div className="flex justify-between items-center pt-3 text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">
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
                      
                      {/* Subscription Notice */}
                      {dealsData?.type === 'Subscription' && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-muted">
                          <p className="text-xs text-muted-foreground">
                            Monthly billing — ${calculateTotal.toFixed(2)}/month. 8 print issues/year; digital content refreshed monthly.
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
