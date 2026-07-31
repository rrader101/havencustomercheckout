import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CardElement,
  PaymentRequestButtonElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { usePostHog } from 'posthog-js/react';

import AddressAutocomplete from '../AddressAutocomplete';
import { SuccessPopup } from '../SuccessPopup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChequePaymentData,
  Deal,
  isNetworkError,
  PaymentData as ApiPaymentData,
  processChequePayment,
  processPayment,
} from '@/services/api';
import { usePaymentRequest } from '@/contexts/usePaymentRequest';
import { CheckoutEventProperties, CheckoutEvents, buildAddonProperties, getTimestamp } from '@/lib/analytics';

import {
  AddonLayout,
  COUNTRIES,
  Field,
  Icon,
  PaymentFields,
  ShippingData,
  getCountryDisplayName,
  money,
  normalizeCountry,
  usePrimarySubmitOnEnter,
} from './shared';

/**
 * A key that stays stable across manual retries within one checkout so the
 * backend can de-duplicate charges. If a payment "Load failed" after the server
 * already charged the card, resubmitting with the same key must not charge
 * again. Regenerated per component mount (i.e. per fresh checkout visit).
 */
const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `idem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;

/**
 * Step 03 — "Pay". Handles the Stripe Card flow, an alternative Check flow,
 * Apple Pay / Google Pay via PaymentRequestButton, and optional separate
 * billing address. On success it shows the SuccessPopup and routes to
 * /order-confirmed/:orderId.
 */
export default function PaymentStep({
  data,
  onUpdate,
  onBack,
  total,
  currency,
  shippingData,
  addOns,
  invoices,
  deal,
  dealId,
  hasSubscriptionUpgrade,
  billingOption,
  addonLayout,
  hideBack = false,
}: {
  data: PaymentFields;
  onUpdate: (data: Partial<PaymentFields>) => void;
  onBack: () => void;
  total: number;
  currency: 'USD' | 'CAD';
  shippingData: ShippingData;
  addOns: Record<string, boolean>;
  invoices: Record<string, boolean>;
  deal: Deal;
  dealId: string;
  hasSubscriptionUpgrade: boolean;
  billingOption: 'monthly' | 'annual_upfront';
  /** The add-on UI variant the customer was shown ('bundle' | 'carousel'). */
  addonLayout: AddonLayout;
  hideBack?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isOtherBillingCountry, setIsOtherBillingCountry] = useState(false);
  const [orderId, setOrderId] = useState('');
  const clickedRef = useRef(false);
  const idempotencyKeyRef = useRef(newIdempotencyKey());
  const country = deal.mailing_address_country || shippingData.country || 'US';

  const {
    paymentRequest,
    canMakePayment,
    updatePaymentRequest,
    setPaymentMethodHandler,
    setErrorHandler,
  } = usePaymentRequest(currency, country);

  const selectedAddOns = useMemo(() => Object.keys(addOns || {}).filter((key) => addOns[key]), [addOns]);
  const selectedInvoices = useMemo(() => Object.keys(invoices || {}).filter((key) => invoices[key]), [invoices]);

  // Order-level add-on summary for analytics: has_addon, addon_ids, addon_count,
  // addon_titles, addon_types, addon_revenue, and the bundle/carousel UI variant.
  const addonProperties = useMemo(
    () => buildAddonProperties({ catalog: deal.add_ons, selectedIds: selectedAddOns, layout: addonLayout }),
    [deal.add_ons, selectedAddOns, addonLayout],
  );

  const submitToApi = useCallback(
    async (paymentMethodId: string, method: string) => {
      if (posthog) {
        posthog.capture(CheckoutEvents.PAYMENT_ATTEMPTED, {
          [CheckoutEventProperties.PAYMENT_METHOD]: method,
          [CheckoutEventProperties.TOTAL_AMOUNT]: total,
          [CheckoutEventProperties.CURRENCY]: currency,
          [CheckoutEventProperties.DEAL_ID]: dealId,
          [CheckoutEventProperties.CURRENT_STEP]: 'payment',
          ...addonProperties,
          [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
        });
      }

      try {
        setIsLoading(true);
        let result;
        if (method === 'check') {
          const chequeData: ChequePaymentData = {
            uuid: dealId,
            shipping_name: shippingData.name || null,
            shipping_email: shippingData.email || null,
            shipping_street_address: shippingData.streetAddress || null,
            shipping_city: shippingData.city || null,
            shipping_state: shippingData.state || null,
            shipping_zipcode: shippingData.zipCode || null,
            shipping_country: shippingData.country || null,
            billing_name: data.cardholderName || shippingData.name || null,
            billing_email: data.userEmail || shippingData.email || null,
            billing_street_address: data.useDifferentBilling ? data.billing_street_address || null : shippingData.streetAddress || null,
            billing_city: data.useDifferentBilling ? data.billing_city || null : shippingData.city || null,
            billing_state: data.useDifferentBilling ? data.billing_state || null : shippingData.state || null,
            billing_zipcode: data.useDifferentBilling ? data.billing_zipcode || null : shippingData.zipCode || null,
            billing_country: data.useDifferentBilling ? data.billing_country || null : shippingData.country || null,
            add_ons: selectedAddOns,
            invoice_ids: selectedInvoices,
            billing_option: billingOption,
            idempotency_key: idempotencyKeyRef.current,
          };
          result = await processChequePayment(chequeData);
        } else {
          const paymentData: ApiPaymentData = {
            uuid: dealId,
            payment_token: paymentMethodId,
            amount: total,
            shipping_name: shippingData.name || null,
            shipping_email: shippingData.email || null,
            shipping_street_address: shippingData.streetAddress || null,
            shipping_city: shippingData.city || null,
            shipping_state: shippingData.state || null,
            shipping_zipcode: shippingData.zipCode || null,
            shipping_country: shippingData.country || null,
            billing_name: data.cardholderName || shippingData.name || null,
            billing_email: data.userEmail || shippingData.email || null,
            billing_street_address: data.useDifferentBilling ? data.billing_street_address || null : shippingData.streetAddress || null,
            billing_city: data.useDifferentBilling ? data.billing_city || null : shippingData.city || null,
            billing_state: data.useDifferentBilling ? data.billing_state || null : shippingData.state || null,
            billing_zipcode: data.useDifferentBilling ? data.billing_zipcode || null : shippingData.zipCode || null,
            billing_country: data.useDifferentBilling ? data.billing_country || null : shippingData.country || null,
            add_ons: selectedAddOns,
            invoice_ids: selectedInvoices,
            billing_option: billingOption,
            idempotency_key: idempotencyKeyRef.current,
          };
          result = await processPayment(paymentData);
        }

        if (result?.order_id) {
          setOrderId(result.order_id);
          setShowSuccessPopup(true);
          // Stash the add-on summary so the checkout_completed event on the
          // order-confirmed page (a fresh navigation without the deal data) can
          // report the same has_addon / addon_ids / addon_revenue / layout.
          try {
            localStorage.setItem(`checkout_summary_${result.order_id}`, JSON.stringify(addonProperties));
          } catch {
            // localStorage can throw in private mode — non-fatal for analytics.
          }
          if (posthog) {
            posthog.capture(CheckoutEvents.PAYMENT_SUCCEEDED, {
              [CheckoutEventProperties.PAYMENT_METHOD]: method,
              [CheckoutEventProperties.TOTAL_AMOUNT]: total,
              [CheckoutEventProperties.CURRENCY]: currency,
              [CheckoutEventProperties.DEAL_ID]: dealId,
              [CheckoutEventProperties.CURRENT_STEP]: 'payment',
              order_id: result.order_id,
              ...addonProperties,
              [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
            });
          }
        }
      } catch (error) {
        const networkError = isNetworkError(error);
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        const rawMessage = error instanceof Error ? error.message : 'Unknown error';
        // A network reject on a payment POST is ambiguous — the charge may have
        // gone through while the response was lost. Don't nudge "try again"
        // (that risks a double charge); tell them to check for a receipt first.
        // (The raw technical message still goes to analytics below.)
        const displayMessage = networkError
          ? "Your connection dropped before we could confirm your payment. Check your email for a receipt before retrying, if you were charged, don't resubmit. Contact us if you're unsure."
          : error instanceof Error
            ? error.message
            : 'Payment processing failed. Please try again.';
        setErrors({ payment: displayMessage });
        if (posthog) {
          posthog.capture(CheckoutEvents.PAYMENT_FAILED, {
            [CheckoutEventProperties.PAYMENT_METHOD]: method,
            [CheckoutEventProperties.TOTAL_AMOUNT]: total,
            [CheckoutEventProperties.CURRENCY]: currency,
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.CURRENT_STEP]: 'payment',
            [CheckoutEventProperties.ERROR_TYPE]: networkError ? 'payment_network_unconfirmed' : 'payment_processing_failed',
            [CheckoutEventProperties.ERROR_MESSAGE]: rawMessage,
            [CheckoutEventProperties.IS_NETWORK_ERROR]: networkError,
            [CheckoutEventProperties.WAS_OFFLINE]: offline,
            [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [addonProperties, billingOption, currency, data, dealId, posthog, selectedAddOns, selectedInvoices, shippingData, total],
  );

  useEffect(() => {
    setPaymentMethodHandler(submitToApi);
  }, [setPaymentMethodHandler, submitToApi]);

  useEffect(() => {
    setErrorHandler((error: string) => setErrors({ payment: error }));
  }, [setErrorHandler]);

  useEffect(() => {
    if (total > 0) updatePaymentRequest(total);
  }, [total, updatePaymentRequest]);

  useEffect(() => {
    const updates: Partial<PaymentFields> = {};
    if (data.userEmail == null) updates.userEmail = shippingData.email || '';
    if (data.cardholderName == null) updates.cardholderName = shippingData.name || '';
    if (!data.method) updates.method = 'card';
    if (Object.keys(updates).length) onUpdate(updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCardPayment = async () => {
    if (!stripe || !elements || isLoading || clickedRef.current) return;
    if (total <= 0 && !hasSubscriptionUpgrade) {
      setErrors({ payment: 'Cannot complete order with zero total amount. Please select items or contact support.' });
      return;
    }
    if (!data.userEmail?.trim()) {
      setErrors({ userEmail: 'Email is required' });
      return;
    }
    if (!data.cardholderName?.trim()) {
      setErrors({ cardholderName: 'Cardholder name is required' });
      return;
    }
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    clickedRef.current = true;
    setIsLoading(true);
    setErrors({});
    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { name: data.cardholderName, email: data.userEmail || shippingData.email },
      });
      if (error || !paymentMethod) {
        setErrors({ payment: error?.message || 'Payment failed. Please check your card and try again.' });
        return;
      }
      onUpdate({ paymentMethodId: paymentMethod.id, method: 'card' });
      await submitToApi(paymentMethod.id, 'card');
    } catch (error) {
      setErrors({ payment: error instanceof Error ? error.message : 'Payment processing failed. Please try again.' });
    } finally {
      clickedRef.current = false;
      setIsLoading(false);
    }
  };

  const submit = () => {
    setErrors({});
    if (data.method === 'check') {
      if (total <= 0 && !hasSubscriptionUpgrade) {
        setErrors({ payment: 'Cannot complete order with zero total amount. Please select items or contact support.' });
        return;
      }
      submitToApi('', 'check');
      return;
    }
    handleCardPayment();
  };

  const payLabel =
    isLoading ? 'Processing...' : data.method === 'check' ? `Confirm ${money(total, currency)}` : total > 0 ? `Pay ${money(total, currency)}` : 'Complete Order';
  const canSubmitPayment =
    !isLoading && (data.method === 'check' || Boolean(stripe && elements)) && (total > 0 || Boolean(hasSubscriptionUpgrade)) && !showSuccessPopup;

  const handleBillingAddressSelect = (addressComponents: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  }) => {
    const nextCountry = normalizeCountry(addressComponents.country);
    onUpdate({
      billing_street_address: addressComponents.streetAddress,
      billing_city: addressComponents.city,
      billing_state: addressComponents.state,
      billing_country: nextCountry,
      billing_zipcode: addressComponents.zipCode,
    });
    if (nextCountry && !COUNTRIES.includes(nextCountry)) {
      setIsOtherBillingCountry(true);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  usePrimarySubmitOnEnter(submit, canSubmitPayment);

  return (
    <form
      className="hc-fade-in"
      data-screen-label="03 Payment"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="hc-section-head">
        {/* hideBack is only true in the express (invoice-only) flow, where there was
            no prior step — so "One last step" doesn't fit. */}
        <h1 className="hc-section-title">{hideBack ? "Let's settle up." : 'One last step.'}</h1>
        <p className="hc-section-sub">
          {hideBack
            ? `One tap and you're all square. Receipts go to ${data.userEmail || shippingData.email || 'your email'}.`
            : `Charged when you confirm. Receipts go to ${data.userEmail || shippingData.email || 'your email'}.`}
        </p>
      </div>

      {paymentRequest && canMakePayment && total > 0 && (
        <>
          <div className="hc-wallet-slot">
            <PaymentRequestButtonElement
              options={{
                paymentRequest,
                style: {
                  paymentRequestButton: {
                    type: 'default',
                    theme: 'dark',
                    height: '44px',
                  },
                },
              }}
            />
          </div>
          <div className="hc-pay-divider">or pay another way</div>
        </>
      )}

      <div className="hc-pay-tabs">
        <button type="button" className={`hc-tab ${data.method !== 'check' ? 'active' : ''}`} onClick={() => onUpdate({ method: 'card' })}>
          Card
        </button>
        <button type="button" className={`hc-tab ${data.method === 'check' ? 'active' : ''}`} onClick={() => onUpdate({ method: 'check' })}>
          Check
        </button>
      </div>

      <div className="hc-payment-fields">
        <Field label="Email for receipt" error={errors.userEmail}>
          <input type="email" value={data.userEmail || ''} onChange={(event) => onUpdate({ userEmail: event.target.value })} />
        </Field>

        {data.method !== 'check' && (
          <>
            <Field label="Card information" error={errors.card}>
              <div className={`hc-card-field ${focused ? 'focused' : ''} ${errors.payment ? 'has-error' : ''}`}>
                <CardElement
                  options={{
                    // These values are the resolved equivalents of .hc-field input
                    // (see checkout-redesign.css). Stripe Elements run in an
                    // iframe so they can't read our CSS variables directly — we
                    // pass concrete values here. The DM Sans family is loaded
                    // into the iframe via Elements.options.fonts in App.tsx.
                    style: {
                      base: {
                        fontSize: '17px',
                        fontWeight: '400',
                        fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
                        fontSmoothing: 'antialiased',
                        letterSpacing: '0',
                        lineHeight: '1.35',
                        color: '#333232',
                        '::placeholder': {
                          color: '#a5a3a0',
                        },
                      },
                      invalid: { color: '#a73535' },
                    },
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onChange={(event) => setErrors((prev) => ({ ...prev, payment: event.error?.message || '' }))}
                />
              </div>
            </Field>
            <Field label="Cardholder name" error={errors.cardholderName}>
              <input value={data.cardholderName || ''} onChange={(event) => onUpdate({ cardholderName: event.target.value })} />
            </Field>
            <button
              type="button"
              className={`hc-checkbox-row ${data.useDifferentBilling ? '' : 'on'}`}
              onClick={() => onUpdate({ useDifferentBilling: !data.useDifferentBilling })}
            >
              <span className="hc-cb" />
              Billing address matches mailing address
            </button>
            {data.useDifferentBilling && (
              <div className="hc-fade-in hc-fields">
                <Field label="Billing street address" className="hc-address-field">
                  <AddressAutocomplete
                    value={data.billing_street_address || ''}
                    onChange={(value) => onUpdate({ billing_street_address: value })}
                    onAddressSelect={handleBillingAddressSelect}
                    placeholder="Start typing your billing address..."
                    label=""
                    className="hc-address-autocomplete"
                  />
                </Field>
                <div className="hc-grid-3">
                  <Field label="City">
                    <input value={data.billing_city || ''} onChange={(event) => onUpdate({ billing_city: event.target.value })} />
                  </Field>
                  <Field label="State">
                    <input value={data.billing_state || ''} onChange={(event) => onUpdate({ billing_state: event.target.value })} />
                  </Field>
                  <Field label="Postal code">
                    <input value={data.billing_zipcode || ''} onChange={(event) => onUpdate({ billing_zipcode: event.target.value })} />
                  </Field>
                </div>
                <Field label="Country" className="hc-country-field hc-select-field">
                  {!isOtherBillingCountry ? (
                    <Select
                      value={data.billing_country || ''}
                      onValueChange={(value) => {
                        if (value === 'Other') {
                          setIsOtherBillingCountry(true);
                          onUpdate({ billing_country: '' });
                        } else {
                          onUpdate({ billing_country: value });
                        }
                      }}
                    >
                      <SelectTrigger className="hc-select-trigger">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="hc-select-content">
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country} className="hc-select-item">
                            {getCountryDisplayName(country)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <input
                        value={data.billing_country || ''}
                        onChange={(event) => onUpdate({ billing_country: event.target.value })}
                        placeholder="Enter your country"
                      />
                      <button
                        type="button"
                        className="hc-country-back"
                        onClick={() => {
                          setIsOtherBillingCountry(false);
                          onUpdate({ billing_country: 'United States' });
                        }}
                      >
                        Back to country list
                      </button>
                    </>
                  )}
                </Field>
              </div>
            )}
          </>
        )}

        {data.method === 'check' && (
          <div className="hc-check-instructions hc-fade-in">
            <p className="hc-check-lead">Please send your check to:</p>
            <address className="hc-check-address">
              HAVEN
              <br />
              33 Irving Pl, 3rd Floor
              <br />
              New York, NY 10003
              <br />
              United States
            </address>
            <p className="hc-check-payable">
              Make checks payable to <strong>HAVEN | FINE</strong>
            </p>
          </div>
        )}
      </div>

      {(errors.payment || errors.api || errors.card) && <div className="hc-payment-error">{errors.payment || errors.api || errors.card}</div>}

      <div className="hc-step-footer">
        {hideBack ? (
          <span />
        ) : (
          <button type="button" className="hc-link-btn" onClick={onBack}>
            <Icon.Back /> Back
          </button>
        )}
        <button
          type="submit"
          className="hc-btn accent lg"
          disabled={isLoading || (data.method !== 'check' && (!stripe || !elements)) || (total === 0 && !hasSubscriptionUpgrade)}
        >
          {payLabel}
          <span className="hc-arrow">
            <Icon.Arrow />
          </span>
        </button>
      </div>

      <p className="hc-legal">
        By confirming, you agree to our{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
        .
      </p>

      <SuccessPopup
        isVisible={showSuccessPopup}
        orderId={orderId}
        onClose={() => {
          setShowSuccessPopup(false);
          if (orderId) navigate(`/order-confirmed/${orderId}?dealId=${dealId}`);
        }}
      />
    </form>
  );
}
