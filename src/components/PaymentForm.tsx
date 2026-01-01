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

import { PaymentSection } from './PaymentSection';
import { AddOnsSection } from './AddOnsSection';
import { ShippingDetails } from './ShippingDetails';

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

  const normalizeCountry = (country: string): string => {
    const normalized = country.toLowerCase().trim();
    if (['usa', 'us', 'united states', 'united states of america'].includes(normalized)) {
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

  useEffect(() => {
    if (hasLoadedData.current) return;
    
    const loadDealsData = async () => {
      try {
        setLoading(true);
        hasLoadedData.current = true;
        const currentDealId = dealId;
        const response = await fetchDealsData(currentDealId);
        const dealData = response.deal;
        setDealsData(dealData);
        
        const initialAddOns: Record<string, boolean> = {};
        dealData.add_ons.forEach(addon => {
          initialAddOns[addon.id.toString()] = false;
        });

        const localStorageKey = `checkout_addons_${currentDealId}`;
        const savedAddOns = localStorage.getItem(localStorageKey);
        if (savedAddOns) {
          try {
            const parsedAddOns = JSON.parse(savedAddOns);
            Object.keys(parsedAddOns).forEach(addonId => {
              if (addonId in initialAddOns) {
                initialAddOns[addonId] = parsedAddOns[addonId];
              }
            });
          } catch (e) {
            console.error('Failed to parse saved add-ons:', e);
          }
        }
        
        const initialInvoices: Record<string, boolean> = {};
        dealData.invoices.forEach(invoice => {
          initialInvoices[invoice.id.toString()] = true;
        });
        
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
        setShowNotFound(true);
        setError(err instanceof Error ? err.message : 'Failed to load deals data');

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
  }, [dealId]); // Only re-run if dealId changes

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

      if (section === 'addOns' && dealId) {
        const localStorageKey = `checkout_addons_${dealId}`;
        const updatedAddOns = typeof currentSection === 'object' && currentSection !== null
          ? { ...currentSection, ...data }
          : data;
        localStorage.setItem(localStorageKey, JSON.stringify(updatedAddOns));
      }

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
    
    // Check if any add-ons are selected
    const hasSelectedAddOns = dealsData.add_ons && dealsData.add_ons.some(addon => formData.addOns[addon.id.toString()]);
    
    if (dealsData.type === 'One Time') {
      const selectedInvoiceIds = Object.keys(formData.invoices).filter(id => formData.invoices[id]);
      if (selectedInvoiceIds.length > 0 && dealsData.invoices) {
        const selectedInvoices = dealsData.invoices.filter(invoice => 
          selectedInvoiceIds.includes(invoice.id.toString()) && invoice.status !== 'Paid'
        );
        if (selectedInvoices.length > 0) {
          transactionAmount = selectedInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0);
        }
      }
    } else if (dealsData.type === 'Subscription') {
      // If user has active subscription, base amount is $0 (they already paid)
      // They only pay for add-ons they select OR pending invoices
      if (dealsData.has_active_subscription) {
        // Check if there are pending invoices selected
        const selectedInvoiceIds = Object.keys(formData.invoices).filter(id => formData.invoices[id]);
        if (selectedInvoiceIds.length > 0 && dealsData.invoices) {
          const selectedInvoices = dealsData.invoices.filter(invoice => 
            selectedInvoiceIds.includes(invoice.id.toString()) && invoice.status !== 'Paid'
          );
          if (selectedInvoices.length > 0) {
            transactionAmount = selectedInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0);
          }
        }
      } else {
        transactionAmount = dealsData.monthly_subscription_price || 0;
      }
    } else {
      transactionAmount = dealsData.amount || 0;
    }
    
    if (dealsData.add_ons) {
      const selectedAddOns = dealsData.add_ons.filter(addon => formData.addOns[addon.id.toString()]);
      
      if (selectedAddOns.length > 0) {
        // When user has active subscription
        if (dealsData.has_active_subscription) {
          transactionAmount += selectedAddOns.reduce((sum, addon) => {
            // For subscription upgrades, we do NOT charge proration
            // The customer simply starts paying the new price from the next billing cycle
            if (addon.type === 'Subscription') {
              return sum; // Don't add anything for subscription upgrades
            }
            // For non-subscription add-ons (one-time), add the full amount
            return sum + parseFloat(addon.amount);
          }, 0);
        } else if (selectedAddOns.length > 1) {
          transactionAmount = selectedAddOns.reduce((sum, addon) => sum + parseFloat(addon.amount), 0);
        } else {
          const addon = selectedAddOns[0];
          if (addon.pricing_behavior.toLowerCase() === 'add') {
            transactionAmount = transactionAmount + parseFloat(addon.amount);
          } else {
            transactionAmount = parseFloat(addon.amount);
          }
        }
      }
    }
    
    return transactionAmount;
  }, [dealsData, formData.invoices, formData.addOns]);

  const calculateTotalWithProcessingFee = useMemo(() => {
    if (calculateTotal <= 0) return 0;
    
    // For subscription deals WITHOUT active subscription (new subscription), no processing fee on frontend
    // The subscription itself doesn't have processing fee added
    if (dealsData?.type === 'Subscription' && !dealsData?.has_active_subscription) {
      return parseFloat(calculateTotal.toFixed(2));
    }
    
    // For subscription deals WITH active subscription (paying invoices/add-ons), add processing fee
    // This matches backend logic in processInvoicePaymentForActiveSubscription
    if (dealsData?.type === 'Subscription' && dealsData?.has_active_subscription) {
      if (formData.payment?.method === 'check') {
        return parseFloat(calculateTotal.toFixed(2));
      }
      const processingFeeRate = getProcessingFeeRate(formData.shipping.country || '');
      const totalWithFee = calculateTotal * (1 + processingFeeRate);
      return parseFloat(totalWithFee.toFixed(2));
    }
    
    // For One Time deals
    if (dealsData?.type === 'One Time') {
      if (formData.payment?.method === 'check' || Object.values(formData.addOns).some(selected => selected)) {
        return parseFloat(calculateTotal.toFixed(2));
      }
      const processingFeeRate = getProcessingFeeRate(formData.shipping.country || '');
      const totalWithFee = calculateTotal * (1 + processingFeeRate);
      return parseFloat(totalWithFee.toFixed(2));
    }
    
    return parseFloat(calculateTotal.toFixed(2));
  }, [calculateTotal, dealsData?.type, dealsData?.has_active_subscription, formData.payment?.method, formData.addOns, formData.shipping.country, getProcessingFeeRate]);

  const getPaymentStatus = () => {
    const dueDate = new Date('2025-08-25'); // Updated due date: August 25, 2025
    const today = new Date();
    
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
                hasActiveSubscription={dealsData?.has_active_subscription}
                activeSubscriptionAmount={dealsData?.active_subscription_amount}
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
                hasSubscriptionUpgrade={dealsData?.has_active_subscription && dealsData?.add_ons?.some(addon => 
                  addon.type === 'Subscription' && formData.addOns[addon.id.toString()]
                )}
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
                {/* For Active Subscription Users - Redesigned Summary */}
                {dealsData?.has_active_subscription ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <ClipboardList className="w-5 h-5 text-foreground" />
                      <h3 className="text-lg font-semibold text-foreground" style={{ fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02rem' }}>Order Summary</h3>
                    </div>

                    {/* Section 1: Current Subscription */}
                    <div className="mb-5 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-semibold text-foreground">Current Subscription</span>
                      </div>
                      <div className="space-y-1 pl-5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Product</span>
                          <span className="font-medium">{dealsData.deal_products?.[0]?.name || 'Subscription'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Monthly Price</span>
                          <span className="font-medium text-green-600">${dealsData.active_subscription_amount?.toFixed(2)}/mo</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Subscription Upgrade (if selected) */}
                    {(() => {
                      const selectedUpgrade = dealsData.add_ons?.find(addon => 
                        addon.type === 'Subscription' && formData.addOns[addon.id.toString()]
                      );
                      if (!selectedUpgrade) return null;
                      
                      return (
                        <div className="mb-5 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Upgrading To</span>
                          </div>
                          <div className="space-y-1 pl-6">
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700 dark:text-blue-400">New Product</span>
                              <span className="font-medium text-blue-900 dark:text-blue-200">{selectedUpgrade.product_name || selectedUpgrade.title}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-blue-700 dark:text-blue-400">New Monthly Price</span>
                              <span className="font-bold text-blue-900 dark:text-blue-200">${parseFloat(selectedUpgrade.amount).toFixed(2)}/mo</span>
                            </div>
                            {selectedUpgrade.issue_count && (
                              <div className="flex justify-between text-sm">
                                <span className="text-blue-700 dark:text-blue-400">Issues/Year</span>
                                <span className="font-medium text-blue-900 dark:text-blue-200">{selectedUpgrade.issue_count}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-700">
                            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              Effective from next billing cycle
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Section 3: One-Time Add-ons (if any) */}
                    {(() => {
                      const oneTimeAddOns = dealsData.add_ons?.filter(addon => 
                        addon.type !== 'Subscription' && formData.addOns[addon.id.toString()]
                      );
                      if (!oneTimeAddOns || oneTimeAddOns.length === 0) return null;
                      
                      const oneTimeTotal = oneTimeAddOns.reduce((sum, addon) => sum + parseFloat(addon.amount), 0);
                      
                      return (
                        <div className="mb-5">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="text-sm font-semibold text-foreground">One-Time Add-ons</span>
                          </div>
                          <div className="space-y-2 pl-6">
                            {oneTimeAddOns.map(addon => (
                              <div key={addon.id} className="flex justify-between items-center text-sm py-1 border-b border-border/30">
                                <span className="text-muted-foreground">{addon.title}</span>
                                <span className="font-medium">${parseFloat(addon.amount).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center text-sm pt-1">
                              <span className="font-medium">Add-ons Subtotal</span>
                              <span className="font-semibold">${oneTimeTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Section 4: Pending Invoices */}
                    {dealsData.invoices && dealsData.invoices.length > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-semibold text-foreground">Pending Invoices</span>
                        </div>
                        <div className="pl-6">
                          <Suspense fallback={<div className="flex items-center justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>}>
                            <InvoiceSelection
                              data={formData.invoices}
                              onUpdate={(data) => updateFormData('invoices', data)}
                              availableInvoices={dealsData.invoices}
                              deal={dealsData}
                              loading={loading}
                              isOrderSummary={true}
                            />
                          </Suspense>
                        </div>
                      </div>
                    )}

                    {/* Section 5: Payment Summary */}
                    <div className="mt-4 pt-4 border-t-2 border-border">
                      {(() => {
                        const selectedUpgrade = dealsData.add_ons?.find(addon => 
                          addon.type === 'Subscription' && formData.addOns[addon.id.toString()]
                        );
                        const oneTimeAddOns = dealsData.add_ons?.filter(addon => 
                          addon.type !== 'Subscription' && formData.addOns[addon.id.toString()]
                        ) || [];
                        const oneTimeAddOnTotal = oneTimeAddOns.reduce((sum, addon) => sum + parseFloat(addon.amount), 0);
                        
                        // Calculate selected invoice total
                        const selectedInvoiceIds = Object.keys(formData.invoices).filter(id => formData.invoices[id]);
                        const selectedInvoices = dealsData.invoices?.filter(invoice => 
                          selectedInvoiceIds.includes(invoice.id.toString()) && invoice.status !== 'Paid'
                        ) || [];
                        const invoiceTotal = selectedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
                        
                        const oneTimeCharges = oneTimeAddOnTotal + invoiceTotal;
                        const processingFeeRate = getProcessingFeeRate(formData.shipping.country || '');
                        const processingFee = oneTimeCharges > 0 && formData.payment?.method !== 'check' 
                          ? oneTimeCharges * processingFeeRate 
                          : 0;
                        const totalDueToday = oneTimeCharges + processingFee;
                        
                        return (
                          <div className="space-y-3">
                            {/* Upgrade Info */}
                            {selectedUpgrade && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Subscription Upgrade</span>
                                <span className="text-green-600 font-medium">$0.00 today</span>
                              </div>
                            )}
                            
                            {/* One-time charges breakdown */}
                            {oneTimeAddOnTotal > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">One-Time Add-ons</span>
                                <span className="font-medium">${oneTimeAddOnTotal.toFixed(2)}</span>
                              </div>
                            )}
                            
                            {invoiceTotal > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Invoice Payment</span>
                                <span className="font-medium">${invoiceTotal.toFixed(2)}</span>
                              </div>
                            )}
                            
                            {/* Processing Fee */}
                            {processingFee > 0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Processing Fee ({(processingFeeRate * 100).toFixed(1)}%)</span>
                                <span className="font-medium">${processingFee.toFixed(2)}</span>
                              </div>
                            )}
                            
                            {/* Total Due Today */}
                            <div className="flex justify-between items-center pt-3 border-t border-border">
                              <span className="text-lg font-bold">Total Due Today</span>
                              <span className="text-xl font-bold text-primary">${totalDueToday.toFixed(2)}</span>
                            </div>
                            
                            {/* Next Billing Info */}
                            {selectedUpgrade && (
                              <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">
                                  📅 From Next Billing Cycle:
                                </p>
                                <p className="text-sm text-green-800 dark:text-green-300 font-bold">
                                  ${parseFloat(selectedUpgrade.amount).toFixed(2)}/month
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  Your subscription will be upgraded immediately. No extra charge today.
                                </p>
                              </div>
                            )}
                            
                            {/* Info when only paying invoices/add-ons */}
                            {!selectedUpgrade && totalDueToday > 0 && (
                              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-muted">
                                <p className="text-xs text-muted-foreground">
                                  One-time payment. Your subscription of ${dealsData.active_subscription_amount?.toFixed(2)}/month continues unchanged.
                                </p>
                              </div>
                            )}
                            
                            {/* No selections made */}
                            {!selectedUpgrade && totalDueToday === 0 && (
                              <div className="text-center py-4 text-muted-foreground">
                                <p className="text-sm">Select add-ons or invoices to continue</p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  /* Original summary for non-active-subscription users */
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <ClipboardList className="w-5 h-5 text-foreground" />
                      <h3 className="text-lg font-semibold text-foreground" style={{ fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02rem' }}>Order Summary</h3>
                    </div>
                    
                    {/* Invoice Selection - Show for 'One Time' and 'Subscription' deals with pending invoices */}
                    {(dealsData?.type === 'One Time' || (dealsData?.type === 'Subscription' && dealsData?.invoices && dealsData.invoices.length > 0)) && (
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
                    
                    {/* Deal Summary - Show for non-'One Time' deals that don't have invoices displayed */}
                    {dealsData?.type !== 'One Time' && !(dealsData?.type === 'Subscription' && dealsData?.invoices && dealsData.invoices.length > 0) && (
                      <>
                        {/* Invoice Number */}
                        <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                          <span className="text-sm">Deal Type</span>
                          <span className="font-medium">{dealsData?.type}</span>
                        </div>
                        
                        {/* Product Name */}
                        <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                          <span className="text-sm">Product</span>
                          <span className="font-medium">{dealsData?.deal_products[0].name}</span>
                        </div>
                        
                        {/* Price Display - Different for each deal type */}
                        {dealsData?.type === 'Subscription' ? (
                          <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                            <span className="text-sm">Monthly Payment</span>
                            <span className="font-medium">${dealsData?.monthly_subscription_price?.toFixed(2) || '0.00'}</span>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                            <span className="text-sm">Amount</span>
                            <span className="font-medium">${dealsData?.amount?.toFixed(2) || '0.00'}</span>
                          </div>
                        )}

                        {/* Additional Details based on deal type */}
                        {dealsData?.type === 'Subscription' && (
                          <>
                            <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                              <span className="text-sm">Contract Length</span>
                              <span className="font-medium">{dealsData?.contract_length || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                              <span className="text-sm">Subscription Term</span>
                              <span className="font-medium">{dealsData?.subscription_term || 'N/A'}</span>
                            </div>
                          </>
                        )}

                        {(dealsData?.type === 'BOGO' || dealsData?.type === 'Contract') && (
                          <>
                            {dealsData?.contract_length && (
                              <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                                <span className="text-sm">Contract Length</span>
                                <span className="font-medium">{dealsData?.contract_length}</span>
                              </div>
                            )}
                            {dealsData?.stage_name && (
                              <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                                <span className="text-sm">Stage</span>
                                <span className="font-medium">{dealsData?.stage_name}</span>
                              </div>
                            )}
                            {dealsData?.issue && (
                              <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                                <span className="text-sm">Issue</span>
                                <span className="font-medium">{dealsData?.issue}</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Agreement Status for BOGO, Contract, and Subscription */}
                        {(dealsData?.type === 'BOGO' || dealsData?.type === 'Contract' || dealsData?.type === 'Subscription') && dealsData?.agreement_status && (
                          <div className="flex justify-between items-center py-2 border-b border-border/50" style={{ marginBottom: '0.7rem' }}>
                            <span className="text-sm">Agreement Status</span>
                            <span className="font-medium">{dealsData?.agreement_status}</span>
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
                      {dealsData?.add_ons.map(addon => {
                        if (!formData.addOns[addon.id.toString()]) return null;
                        
                        return (
                          <div key={addon.id} className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-sm">{addon.title}</span>
                            <span className="font-medium">${addon.amount}</span>
                          </div>
                        );
                      })}
                      
                      {calculateTotal === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Select add-ons to see pricing</p>
                        </div>
                      )}
                      
                      {calculateTotal > 0 && (
                        <>
                          {/* Show processing fee for one-time deals (without add-ons selected) */}
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
                              ${calculateTotalWithProcessingFee.toFixed(2)}
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
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentForm;
