import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePostHog } from 'posthog-js/react';
import NotFound from '@/pages/NotFound';
import {
  Deal,
  fetchDealsData,
  saveAddress,
} from '@/services/api';
import { CheckoutEventProperties, CheckoutEvents, getTimestamp } from '@/lib/analytics';
import { Checkbox } from '@/components/ui/check-box';

import DetailsStep from './new-checkout/ShippingDetails';
import AddonsStep from './new-checkout/AddOnsSection';
import PaymentStep from './new-checkout/PaymentSection';
import {
  AddonLayout,
  CheckoutFormData,
  CheckoutStep,
  CheckoutTheme,
  EnrichedAddon,
  Icon,
  PaymentFields,
  ShippingData,
  ANNUAL_UPFRONT_DISCOUNT,
  annualUpfrontTotal,
  enrichAddon,
  fmt,
  money,
  normalizeCountry,
  parseNumber,
  readLayout,
  readTheme,
  splitCents,
  validStep,
} from './new-checkout/shared';
import './checkout-redesign.css';

/**
 * The orchestrator for the redesigned checkout. Owns the data fetch,
 * the form state, the analytics, and step routing. Each of the three
 * step UIs lives in its own file under ./new-checkout:
 *
 *   - DetailsStep   → ./new-checkout/ShippingDetails
 *   - AddonsStep    → ./new-checkout/AddOnsSection
 *   - PaymentStep   → ./new-checkout/PaymentSection
 *
 * Topbar, Stepper, and OrderSummary stay co-located here because they
 * frame the steps rather than belonging to any one of them.
 */

// ─── Topbar / Stepper ────────────────────────────────────────────────────

function Topbar() {
  return (
    <div className="hc-topbar">
      <img className="hc-wordmark" src="/logo-final.png" alt="Haven Lifestyles" />
      <div className="hc-meta">
        <Icon.Lock /> Secure checkout
      </div>
    </div>
  );
}

function Stepper({
  currentStep,
  onJump,
}: {
  currentStep: CheckoutStep;
  onJump: (step: CheckoutStep) => void;
}) {
  const steps = [
    { id: 'shipping' as const, label: 'Details' },
    { id: 'addons' as const, label: 'Customize' },
    { id: 'payment' as const, label: 'Pay' },
  ];
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStep));

  return (
    <div className="hc-stepper">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <React.Fragment key={step.id}>
            {index > 0 && <div className={`hc-step-divider ${index <= currentIndex ? 'lit' : ''}`} />}
            <button
              type="button"
              className={`hc-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
              onClick={() => (done || active) && onJump(step.id)}
            >
              <span className="hc-pip">{done ? <Icon.Check /> : index + 1}</span>
              <span>{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Order summary (right-hand column on addons + payment) ───────────────

function OrderSummary({
  deal,
  addons,
  selected,
  invoices,
  invoiceSelection,
  onInvoiceToggle,
  subtotal,
  total,
  currency,
  summaryNudge,
  isPayStep,
  payUpfront,
  onAddNudge,
  onToggleAnnual,
  onToggleUpfront,
  onRemove,
}: {
  deal: Deal;
  addons: EnrichedAddon[];
  selected: Record<string, boolean>;
  invoices: Deal['invoices'];
  invoiceSelection: Record<string, boolean>;
  onInvoiceToggle: (id: string, selected: boolean) => void;
  subtotal: number;
  total: number;
  currency: string;
  summaryNudge: boolean;
  isPayStep: boolean;
  payUpfront: boolean;
  onAddNudge: (id: string) => void;
  onToggleAnnual: () => void;
  onToggleUpfront: () => void;
  onRemove: (id: string) => void;
}) {
  const selectedAddons = addons.filter((addon) => selected[addon.id]);
  const annual = addons.find((addon) => addon.subscription);
  const annualSelected = !!annual && !!selected[annual.id];
  const annualMonths = annual?.source.total_months ?? 12;
  const processingFee = Math.max(0, total - subtotal);
  const [dollars, cents] = splitCents(total);
  const productName = deal.deal_products?.[0]?.name || deal.name || 'Placement';
  const issueLine = deal.invoices?.[0]?.invoice_num || deal.issue || deal.type;
  const nudgeAddon = addons.find((addon) => !addon.subscription && !selected[addon.id]);
  const visibleInvoices = invoices?.filter((invoice) => invoice.status !== 'Paid') || [];
  // Products the customer is subscribing to — their invoice line is replaced by the subscription.
  const subscribedNames = addons
    .filter((a) => a.subscription && selected[a.id] && a.source.product_name)
    .map((a) => a.source.product_name.toLowerCase().trim());

  return (
    <aside className="hc-summary" data-screen-label="Order Summary">
      <h3>Order summary</h3>

      <div className="hc-product-head">
        <div className="hc-product-name">{productName}</div>
        {issueLine && <div className="hc-product-issue">{issueLine}</div>}
      </div>

      {visibleInvoices.length > 0 && (
        <div className="hc-invoice-list">
          {visibleInvoices.map((invoice) => {
            const id = invoice.id.toString();
            const checked = !!invoiceSelection[id];
            const products = invoice.invoice_products || [];
            // Only break the invoice down per product when it has more than one.
            const showBreakdown = products.length > 1;
            const adjusted = adjustedInvoiceAmount(invoice, subscribedNames);
            const reduced = adjusted < parseNumber(invoice.amount);
            return (
              <div key={invoice.id} className="hc-summary-invoice">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => onInvoiceToggle(id, value === true)}
                  aria-label={invoice.invoice_num || 'Invoice'}
                />
                <span>
                  <strong>{invoice.invoice_num || 'Invoice'}</strong>
                  <small>{invoice.status}</small>
                  {showBreakdown && (
                    <ul className="hc-invoice-products">
                      {products.map((product, idx) => {
                        const replaced = invoiceProductIsSubscribed(product.name, subscribedNames);
                        return (
                          <li key={`${id}-${idx}`} className={replaced ? 'replaced' : undefined}>
                            <span>{product.name}</span>
                            <span>
                              {money(parseNumber(product.price), currency)}
                              {replaced && <em> · in subscription</em>}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </span>
                <b>
                  {reduced && <s className="hc-invoice-was">{money(parseNumber(invoice.amount), currency)}</s>}
                  {money(adjusted, currency)}
                </b>
              </div>
            );
          })}
        </div>
      )}

      {selectedAddons.map((addon) => {
        const months = addon.source.total_months ?? 12;
        const upfront = addon.subscription && payUpfront;
        const lineAmount = upfront ? annualUpfrontTotal(addon.price, months) : addon.price;
        return (
        <div key={addon.id} className="hc-summary-addon">
          <div className="hc-line add-on">
            <span className="hc-lbl">
              {addon.title}
              {addon.subscription && (
                <span className="hc-line-sub">{upfront ? `billed once · ${months} months` : 'billed monthly'}</span>
              )}
              <button className="hc-line-remove" onClick={() => onRemove(addon.id)}>
                Remove
              </button>
            </span>
            <span>
              {money(lineAmount, currency)}
              {addon.subscription && !upfront && <span className="hc-per-mo">/mo</span>}
            </span>
          </div>
          {addon.tags.length > 0 && (
            <ul className="hc-summary-checklist">
              {addon.tags.slice(0, 6).map((item) => (
                <li key={item}>
                  <span className="hc-mini-check">
                    <Icon.Check />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
        );
      })}

      {!annualSelected && isPayStep && annual && (
        <button type="button" className="hc-annual-switch" onClick={onToggleAnnual} aria-pressed="false">
          <span className="hc-cb" />
          <span className="hc-annual-switch-body">
            <strong>Pay Just {money(annual.price, currency)} Today</strong>
            <span className="hc-annual-switch-sub">
              The HAVEN Annual Partnership reserves your {annual.placementPhrase || 'ad'} in all 8 issues plus continuous digital promotion.
            </span>
            {annual.pitchBullets && (
              <span className="hc-annual-switch-checks">
                {annual.pitchBullets.map((item) => (
                  <span key={item} className="hc-mini-check-row">
                    <span className="hc-mini-check">
                      <Icon.Check />
                    </span>
                    {item}
                  </span>
                ))}
              </span>
            )}
          </span>
        </button>
      )}

      {annualSelected && isPayStep && annual && (
        <button
          type="button"
          className={`hc-annual-switch hc-upfront-toggle ${payUpfront ? 'checked' : ''}`}
          onClick={onToggleUpfront}
          aria-pressed={payUpfront}
        >
          <span className="hc-cb" />
          <span className="hc-annual-switch-body">
            <strong>Pay it all upfront for {money(ANNUAL_UPFRONT_DISCOUNT, currency)} off</strong>
            <span className="hc-annual-switch-sub">
              {payUpfront
                ? `One charge of ${money(annualUpfrontTotal(annual.price, annualMonths), currency)} for all ${annualMonths} months.`
                : `Pay ${money(annualUpfrontTotal(annual.price, annualMonths), currency)} once instead of ${money(annual.price, currency)}/mo for ${annualMonths} months.`}
            </span>
          </span>
        </button>
      )}

      {/*
       * Only render this divider when we actually have content between the
       * head/invoice block and the totals. Otherwise the bottom border on
       * .hc-product-head (or .hc-invoice-list) already separates the totals,
       * and adding a second rule below it creates an empty gap.
       */}
      {(selectedAddons.length > 0 || (!annualSelected && isPayStep && annual)) && (
        <div className="hc-divider" />
      )}
      <div className="hc-line muted">
        <span className="hc-lbl">Subtotal</span>
        <span>{money(subtotal, currency)}</span>
      </div>
      <div className="hc-line muted">
        <span className="hc-lbl">Processing</span>
        <span>{processingFee > 0 ? money(processingFee, currency) : '$0'}</span>
      </div>

      <div className="hc-total">
        <span className="hc-lbl">Total</span>
        <span className="hc-amount">
          ${fmt(dollars)}
          <span className="hc-cents">.{cents}</span>
        </span>
      </div>

      {summaryNudge && nudgeAddon && (
        <div className="hc-nudge">
          <span className="hc-nudge-icon"><Icon.Plus /></span>
          <div className="hc-nudge-body">
            <span className="hc-nudge-lead">
              Add <strong>{nudgeAddon.title}</strong> for {money(nudgeAddon.price, currency)}
            </span>
            <span className="hc-nudge-proof">{nudgeAddon.socialProof || 'Popular with agents in your area'}</span>
            <button onClick={() => onAddNudge(nudgeAddon.id)}>Add to order</button>
          </div>
        </div>
      )}

      <div className="hc-footnote">
        Charged at confirmation. Placement is held while we send proofs. Receipts are emailed automatically.
      </div>
    </aside>
  );
}

// ─── Local helpers used only by the orchestrator ─────────────────────────

const emptyFormData: CheckoutFormData = {
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
};

// Product names the customer is subscribing to (selected Subscription add-ons).
// Matched against invoice line-items so the subscribed product's price can be
// excluded from the invoice charge — it's billed as the subscription instead.
const getSubscribedProductNames = (deal: Deal, addOns: Record<string, boolean>): string[] =>
  (deal.add_ons || [])
    .filter((a) => addOns[a.id.toString()] && a.type === 'Subscription' && a.product_name)
    .map((a) => a.product_name.toLowerCase().trim());

export const invoiceProductIsSubscribed = (productName: string, subscribedNames: string[]): boolean => {
  const p = (productName || '').toLowerCase().trim();
  return subscribedNames.some((n) => n !== '' && (p.includes(n) || n.includes(p)));
};

// An invoice's billable amount once any product the customer is subscribing to is
// removed. Single-product invoice → 0 when that product is the subscribed one;
// multi-product invoice → only the subscribed product's price is subtracted.
const adjustedInvoiceAmount = (invoice: Deal['invoices'][number], subscribedNames: string[]): number => {
  const amount = parseNumber(invoice.amount);
  if (!subscribedNames.length || !invoice.invoice_products?.length) return amount;
  const removed = invoice.invoice_products
    .filter((p) => invoiceProductIsSubscribed(p.name, subscribedNames))
    .reduce((sum, p) => sum + parseNumber(p.price), 0);
  return Math.max(0, amount - removed);
};

const getSelectedInvoiceTotal = (
  deal: Deal,
  invoices: Record<string, boolean>,
  subscribedNames: string[] = [],
) => {
  if (!deal.invoices?.length) return 0;
  return deal.invoices
    .filter((invoice) => invoices[invoice.id.toString()] && invoice.status !== 'Paid')
    .reduce((sum, invoice) => sum + adjustedInvoiceAmount(invoice, subscribedNames), 0);
};

// ─── Main component ──────────────────────────────────────────────────────

interface RedesignedPaymentFormProps {
  defaultLayout?: AddonLayout;
  defaultTheme?: CheckoutTheme;
  defaultSocialProof?: boolean;
  defaultSummaryNudge?: boolean;
}

export default function RedesignedPaymentForm({
  defaultLayout = 'bundle',
  defaultTheme = 'modern',
  defaultSocialProof = false,
  defaultSummaryNudge = true,
}: RedesignedPaymentFormProps = {}) {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const layout = readLayout(searchParams.get('layout'), defaultLayout);
  const theme = readTheme(searchParams.get('theme'), defaultTheme);
  const anchorPricing = searchParams.get('anchorPricing') !== 'false';
  const socialProof = searchParams.has('socialProof') ? searchParams.get('socialProof') === 'true' : defaultSocialProof;
  const summaryNudge = searchParams.has('summaryNudge') ? searchParams.get('summaryNudge') !== 'false' : defaultSummaryNudge;
  const canonicalStep = validStep(searchParams.get('step'));

  const [currentStep, setCurrentStep] = useState<CheckoutStep>(canonicalStep);
  const [dealsData, setDealsData] = useState<Deal | null>(null);
  const [formData, setFormData] = useState<CheckoutFormData>(emptyFormData);
  const [loading, setLoading] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);
  const [payUpfront, setPayUpfront] = useState(false);
  const [stepStartTime, setStepStartTime] = useState<Date>(new Date());
  const hasLoadedData = useRef(false);
  const initialShipping = useRef<ShippingData | null>(null);
  const posthog = usePostHog();

  useEffect(() => {
    if (canonicalStep !== currentStep) {
      setCurrentStep(canonicalStep);
      setStepStartTime(new Date());
    }
  }, [canonicalStep, currentStep]);

  useEffect(() => {
    if (hasLoadedData.current) return;

    const loadDealsData = async () => {
      try {
        setLoading(true);
        hasLoadedData.current = true;
        const response = await fetchDealsData(dealId);
        const deal = response.deal;
        setDealsData(deal);

        const initialAddOns: Record<string, boolean> = {};
        deal.add_ons.forEach((addon) => {
          initialAddOns[addon.id.toString()] = false;
        });
        const savedAddOns = localStorage.getItem(`checkout_addons_${dealId}`);
        if (savedAddOns) {
          try {
            const parsed = JSON.parse(savedAddOns) as Record<string, boolean>;
            Object.keys(parsed).forEach((addonId) => {
              if (addonId in initialAddOns) initialAddOns[addonId] = parsed[addonId];
            });
          } catch (error) {
            console.error('Failed to parse saved add-ons:', error);
          }
        }

        const initialInvoices: Record<string, boolean> = {};
        deal.invoices.forEach((invoice) => {
          initialInvoices[invoice.id.toString()] = invoice.status !== 'Paid';
        });

        const contactFullName = [deal.contact_first_name, deal.contact_last_name].filter(Boolean).join(' ');
        const shipping = {
          name: contactFullName || '',
          email: deal.contact_email || '',
          streetAddress: deal.mailing_address_street || '',
          city: deal.mailing_address_city || '',
          state: deal.mailing_address_state || '',
          country: normalizeCountry(deal.mailing_address_country || ''),
          zipCode: deal.mailing_address_zipcode || '',
        };
        initialShipping.current = shipping;

        setFormData({
          shipping,
          addOns: initialAddOns,
          invoices: initialInvoices,
          payment: {
            method: 'card',
            userEmail: shipping.email,
            cardholderName: shipping.name,
          },
        });

        if (posthog) {
          posthog.identify(deal.contact_email || `deal_${dealId}`, {
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.DEAL_TYPE]: deal.type,
            [CheckoutEventProperties.CURRENCY]: deal.currency,
            [CheckoutEventProperties.COUNTRY]: deal.mailing_address_country,
            name: deal.name,
            contact_email: deal.contact_email,
          });
          posthog.capture(CheckoutEvents.CHECKOUT_PAGE_VIEW, {
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.DEAL_TYPE]: deal.type,
            [CheckoutEventProperties.CURRENCY]: deal.currency,
            [CheckoutEventProperties.CURRENT_STEP]: canonicalStep,
            [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
          });
        }
      } catch (error) {
        console.error('API Error:', error);
        setShowNotFound(true);
        if (posthog) {
          posthog.capture(CheckoutEvents.API_ERROR, {
            [CheckoutEventProperties.ERROR_TYPE]: 'deals_data_load_failed',
            [CheckoutEventProperties.ERROR_MESSAGE]: error instanceof Error ? error.message : 'Unknown error',
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadDealsData();
  }, [canonicalStep, dealId, posthog]);

  const handleStepChange = useCallback(
    (nextStep: CheckoutStep) => {
      const now = new Date();
      const timeSpent = now.getTime() - stepStartTime.getTime();

      if (posthog) {
        posthog.capture(CheckoutEvents.CHECKOUT_STEP_TRANSITION, {
          [CheckoutEventProperties.DEAL_ID]: dealId,
          [CheckoutEventProperties.FROM_STEP]: currentStep,
          [CheckoutEventProperties.TO_STEP]: nextStep,
          [CheckoutEventProperties.TIME_SPENT_MS]: timeSpent,
          [CheckoutEventProperties.TIME_SPENT_SECONDS]: Math.round(timeSpent / 1000),
          [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
        });
      }

      setCurrentStep(nextStep);
      setStepStartTime(now);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('step', nextStep);
      nextParams.delete('flow');
      navigate({ search: nextParams.toString() });
    },
    [currentStep, dealId, navigate, posthog, searchParams, stepStartTime],
  );

  const updateFormData = useCallback(
    <K extends keyof CheckoutFormData>(section: K, data: Partial<CheckoutFormData[K]>) => {
      setFormData((prev) => {
        const currentSection = prev[section];
        const nextFormData = {
          ...prev,
          [section]: typeof currentSection === 'object' && currentSection !== null ? { ...currentSection, ...data } : data,
        } as CheckoutFormData;

        if (section === 'addOns' && dealId) {
          localStorage.setItem(`checkout_addons_${dealId}`, JSON.stringify(nextFormData.addOns));
        }

        if (posthog && dealsData) {
          if (section === 'addOns') {
            Object.keys(data as Record<string, boolean>).forEach((addonId) => {
              const addon = dealsData.add_ons.find((item) => item.id.toString() === addonId);
              if (!addon) return;
              const wasSelected = prev.addOns[addonId];
              const nowSelected = (data as Record<string, boolean>)[addonId];
              if (wasSelected !== nowSelected) {
                posthog.capture(nowSelected ? CheckoutEvents.ADDON_SELECTED : CheckoutEvents.ADDON_DESELECTED, {
                  [CheckoutEventProperties.ADDON_ID]: addonId,
                  [CheckoutEventProperties.ADDON_TITLE]: addon.title,
                  [CheckoutEventProperties.ADDON_AMOUNT]: addon.amount,
                  [CheckoutEventProperties.DEAL_ID]: dealId,
                  [CheckoutEventProperties.CURRENT_STEP]: currentStep,
                  [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
                });
              }
            });
          } else if (section === 'invoices') {
            Object.keys(data as Record<string, boolean>).forEach((invoiceId) => {
              const invoice = dealsData.invoices.find((item) => item.id.toString() === invoiceId);
              if (!invoice) return;
              const wasSelected = prev.invoices[invoiceId];
              const nowSelected = (data as Record<string, boolean>)[invoiceId];
              if (wasSelected !== nowSelected) {
                posthog.capture(nowSelected ? CheckoutEvents.INVOICE_SELECTED : CheckoutEvents.INVOICE_DESELECTED, {
                  [CheckoutEventProperties.INVOICE_ID]: invoiceId,
                  [CheckoutEventProperties.INVOICE_AMOUNT]: invoice.amount,
                  [CheckoutEventProperties.DEAL_ID]: dealId,
                  [CheckoutEventProperties.CURRENT_STEP]: currentStep,
                  [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
                });
              }
            });
          } else if (section === 'payment' && (data as Partial<PaymentFields>).method) {
            posthog.capture(CheckoutEvents.PAYMENT_METHOD_CHANGED, {
              [CheckoutEventProperties.PAYMENT_METHOD]: (data as Partial<PaymentFields>).method,
              [CheckoutEventProperties.DEAL_ID]: dealId,
              [CheckoutEventProperties.CURRENT_STEP]: currentStep,
              [CheckoutEventProperties.TIMESTAMP]: getTimestamp(),
            });
          }
        }

        return nextFormData;
      });
    },
    [currentStep, dealId, dealsData, posthog],
  );

  const availableAddOns = useMemo(() => {
    if (!dealsData?.add_ons) return [];
    const enriched = dealsData.add_ons
      .filter((addon) => !(dealsData.type === 'One Time' && dealsData.has_active_subscription && addon.type === 'Subscription'))
      .map(enrichAddon);

    // Surface the monthly/annual plan first — it becomes the hero in the
    // bundle layout and the opening slide in the carousel layout. We do a
    // stable partition rather than a full sort so the relative order of all
    // the other add-ons is preserved.
    const subscriptions = enriched.filter((addon) => addon.subscription);
    const others = enriched.filter((addon) => !addon.subscription);
    return [...subscriptions, ...others];
  }, [dealsData]);

  const getProcessingFeeRate = useCallback(
    (country: string) => {
      if (dealsData?.processing_fee_exempt) return 0;
      const normalizedCountry = country.toLowerCase().trim();
      return ['usa', 'us', 'united states', 'united states of america'].includes(normalizedCountry) ? 0.029 : 0.024;
    },
    [dealsData?.processing_fee_exempt],
  );

  const subtotal = useMemo(() => {
    if (!dealsData) return 0;
    let transactionAmount = 0;

    // Invoice total with any product the customer is subscribing to removed
    // (single-product invoice → 0, multi-product → that one line subtracted).
    const subscribedNames = getSubscribedProductNames(dealsData, formData.addOns);
    const adjustedInvoiceTotal = getSelectedInvoiceTotal(dealsData, formData.invoices, subscribedNames);

    if (dealsData.type === 'One Time') {
      transactionAmount = adjustedInvoiceTotal > 0 ? adjustedInvoiceTotal : dealsData.invoices?.length ? 0 : dealsData.amount || 0;
    } else if (dealsData.type === 'Subscription') {
      if (dealsData.has_active_subscription) {
        transactionAmount = adjustedInvoiceTotal;
      } else {
        transactionAmount = dealsData.monthly_subscription_price || 0;
      }
    } else {
      transactionAmount = dealsData.amount || 0;
    }

    if (dealsData.add_ons) {
      const selectedAddOns = dealsData.add_ons.filter((addon) => formData.addOns[addon.id.toString()]);
      // A subscription add-on paid upfront contributes its full term
      // (monthly × months − discount) instead of a single month's price.
      const addonAmount = (addon: (typeof selectedAddOns)[number]) =>
        payUpfront && addon.type === 'Subscription'
          ? annualUpfrontTotal(parseNumber(addon.amount), addon.total_months ?? 12)
          : parseNumber(addon.amount);
      if (selectedAddOns.length > 0) {
        if (dealsData.has_active_subscription) {
          transactionAmount += selectedAddOns.reduce((sum, addon) => {
            if (addon.type === 'Subscription') return sum;
            return sum + parseNumber(addon.amount);
          }, 0);
        } else if (selectedAddOns.length > 1) {
          // Add-ons + whatever invoice products remain after removing the subscribed one.
          transactionAmount = adjustedInvoiceTotal + selectedAddOns.reduce((sum, addon) => sum + addonAmount(addon), 0);
        } else {
          const addon = selectedAddOns[0];
          if (addon.pricing_behavior?.toLowerCase() === 'add') {
            transactionAmount += addonAmount(addon);
          } else {
            // Replace: the subscribed product is already excluded from the invoice
            // total above, so the add-on amount is added to the remaining products.
            transactionAmount = adjustedInvoiceTotal + addonAmount(addon);
          }
        }
      }
    }

    return transactionAmount;
  }, [dealsData, formData.addOns, formData.invoices, payUpfront]);

  const total = useMemo(() => {
    if (!dealsData || subtotal <= 0) return 0;
    if (dealsData.type === 'Subscription' && !dealsData.has_active_subscription) return parseFloat(subtotal.toFixed(2));
    if (dealsData.type === 'Subscription' && dealsData.has_active_subscription) {
      if (formData.payment.method === 'check') return parseFloat(subtotal.toFixed(2));
      return parseFloat((subtotal * (1 + getProcessingFeeRate(formData.shipping.country || ''))).toFixed(2));
    }
    if (dealsData.type === 'One Time') {
      if (formData.payment.method === 'check' || Object.values(formData.addOns).some(Boolean)) return parseFloat(subtotal.toFixed(2));
      return parseFloat((subtotal * (1 + getProcessingFeeRate(formData.shipping.country || ''))).toFixed(2));
    }
    return parseFloat(subtotal.toFixed(2));
  }, [dealsData, formData.addOns, formData.payment.method, formData.shipping.country, getProcessingFeeRate, subtotal]);

  const handleShippingNext = async () => {
    if (!dealId) return;
    const changed = JSON.stringify(initialShipping.current) !== JSON.stringify(formData.shipping);
    if (changed) {
      try {
        setSavingAddress(true);
        await saveAddress({
          uuid: dealId,
          shipping_street_address: formData.shipping.streetAddress,
          shipping_city: formData.shipping.city,
          shipping_state: formData.shipping.state,
          shipping_zipcode: formData.shipping.zipCode,
          shipping_country: formData.shipping.country,
        });
        initialShipping.current = formData.shipping;
      } catch (error) {
        console.error('Failed to save address:', error);
      } finally {
        setSavingAddress(false);
      }
    }
    handleStepChange('addons');
  };

  const toggleAddon = (id: string) => updateFormData('addOns', { [id]: !formData.addOns[id] });
  const hasSubscriptionUpgrade = !!(
    dealsData?.has_active_subscription &&
    dealsData.add_ons?.some((addon) => addon.type === 'Subscription' && formData.addOns[addon.id.toString()])
  );

  if (loading) {
    return (
      <div className="hc-redesign hc-loading" data-theme={theme}>
        <img className="hc-loading-logo" src="/logo-final.png" alt="HAVEN" />
        <div className="hc-spinner" />
        <p>Loading your checkout...</p>
      </div>
    );
  }

  if (showNotFound || !dealsData) return <NotFound />;

  const isPaymentStep = currentStep === 'payment';
  const showSummary = currentStep !== 'shipping';
  const currency = (dealsData.currency as 'USD' | 'CAD') || 'USD';

  // "Pay upfront" only applies when a subscription add-on is actually selected.
  const annualAddon = availableAddOns.find((addon) => addon.subscription);
  const annualSelected = !!annualAddon && !!formData.addOns[annualAddon.id];
  const effectiveUpfront = payUpfront && annualSelected;
  const billingOption: 'monthly' | 'annual_upfront' = effectiveUpfront ? 'annual_upfront' : 'monthly';

  return (
    <div className="hc-redesign" data-theme={theme}>
      <Topbar />
      <Stepper currentStep={currentStep} onJump={handleStepChange} />

      <div className={`hc-layout ${currentStep === 'shipping' ? 'solo' : ''}`}>
        <main className="hc-main-pane">
          {currentStep === 'shipping' && (
            <DetailsStep
              data={formData.shipping}
              onUpdate={(data) => updateFormData('shipping', data)}
              onNext={handleShippingNext}
              loading={savingAddress}
            />
          )}

          {currentStep === 'addons' && (
            <AddonsStep
              addons={availableAddOns}
              selected={formData.addOns}
              onToggle={toggleAddon}
              onBack={() => handleStepChange('shipping')}
              onNext={() => handleStepChange('payment')}
              layout={layout}
              anchorPricing={anchorPricing}
              socialProof={socialProof}
              customerName={formData.shipping.name}
            />
          )}

          {isPaymentStep && (
            <PaymentStep
              data={formData.payment}
              onUpdate={(data) => updateFormData('payment', data)}
              onBack={() => handleStepChange('addons')}
              total={total}
              currency={currency}
              shippingData={formData.shipping}
              addOns={formData.addOns}
              invoices={formData.invoices}
              deal={dealsData}
              dealId={dealId || ''}
              hasSubscriptionUpgrade={hasSubscriptionUpgrade}
              billingOption={billingOption}
            />
          )}
        </main>

        {showSummary && (
          <OrderSummary
            deal={dealsData}
            addons={availableAddOns}
            selected={formData.addOns}
            invoices={dealsData.invoices}
            invoiceSelection={formData.invoices}
            onInvoiceToggle={(id, selectedInvoice) => updateFormData('invoices', { [id]: selectedInvoice })}
            subtotal={subtotal}
            total={total}
            currency={currency}
            summaryNudge={summaryNudge}
            isPayStep={isPaymentStep}
            payUpfront={effectiveUpfront}
            onAddNudge={toggleAddon}
            onToggleAnnual={() => {
              const annual = availableAddOns.find((addon) => addon.subscription);
              if (annual) toggleAddon(annual.id);
            }}
            onToggleUpfront={() => setPayUpfront((value) => !value)}
            onRemove={toggleAddon}
          />
        )}
      </div>
    </div>
  );
}
