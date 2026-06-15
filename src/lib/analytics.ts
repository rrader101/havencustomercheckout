/**
 * Centralized constants for PostHog analytics events in the checkout flow.
 * Follows PostHog best practices for event naming and properties.
 */
import type { DealAddOn } from '@/services/api';

export enum CheckoutEvents {
  CHECKOUT_PAGE_VIEW = 'checkout_page_view',
  CHECKOUT_DROP_OFF = 'checkout_drop_off',
  CHECKOUT_COMPLETED = 'checkout_completed',

  CHECKOUT_STEP_TRANSITION = 'checkout_step_transition',

  SHIPPING_INFO_UPDATED = 'shipping_info_updated',
  SHIPPING_ADDRESS_AUTOCOMPLETE_USED = 'shipping_address_autocomplete_used',

  ADDON_SELECTED = 'addon_selected',
  ADDON_DESELECTED = 'addon_deselected',
  ADDON_VIEWED = 'addon_viewed',

  INVOICE_SELECTED = 'invoice_selected',
  INVOICE_DESELECTED = 'invoice_deselected',

  PAYMENT_METHOD_CHANGED = 'payment_method_changed',
  PAYMENT_BILLING_ADDRESS_TOGGLED = 'payment_billing_address_toggled',
  PAYMENT_BILLING_ADDRESS_UPDATED = 'payment_billing_address_updated',
  PAYMENT_CARDHOLDER_NAME_UPDATED = 'payment_cardholder_name_updated',
  PAYMENT_EMAIL_UPDATED = 'payment_email_updated',

  PAYMENT_ATTEMPTED = 'payment_attempted',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',

  FORM_VALIDATION_ERROR = 'form_validation_error',
  API_ERROR = 'api_error',
  STRIPE_ERROR = 'stripe_error',

  BUTTON_CLICKED = 'button_clicked',
  FORM_FIELD_FOCUSED = 'form_field_focused',
  FORM_FIELD_BLURRED = 'form_field_blurred',
}

/**
 * Standard properties to include with checkout events
 */
export const CheckoutEventProperties = {
  DEAL_ID: 'deal_id',
  DEAL_TYPE: 'deal_type',
  CURRENCY: 'currency',
  COUNTRY: 'country',
  CURRENT_STEP: 'current_step',
  FROM_STEP: 'from_step',
  TO_STEP: 'to_step',
  TIME_SPENT_MS: 'time_spent_ms',
  TIME_SPENT_SECONDS: 'time_spent_seconds',
  TIMESTAMP: 'timestamp',
  USER_EMAIL: 'user_email',
  TOTAL_AMOUNT: 'total_amount',
  PAYMENT_METHOD: 'payment_method',
  ADDON_ID: 'addon_id',
  ADDON_TITLE: 'addon_title',
  ADDON_AMOUNT: 'addon_amount',
  // Order-level add-on summary (attached to payment/checkout-completion events)
  HAS_ADDON: 'has_addon',
  ADDON_IDS: 'addon_ids',
  ADDON_TITLES: 'addon_titles',
  ADDON_TYPES: 'addon_types',
  ADDON_COUNT: 'addon_count',
  ADDON_REVENUE: 'addon_revenue',
  ADDON_LAYOUT: 'addon_layout',
  INVOICE_ID: 'invoice_id',
  INVOICE_AMOUNT: 'invoice_amount',
  ERROR_TYPE: 'error_type',
  ERROR_MESSAGE: 'error_message',
  BUTTON_NAME: 'button_name',
  FIELD_NAME: 'field_name',
} as const;

/**
 * Helper function to get current timestamp in ISO format
 */
export const getTimestamp = (): string => new Date().toISOString();

/**
 * Helper function to calculate time spent in milliseconds
 */
export const calculateTimeSpent = (startTime: Date): { ms: number; seconds: number } => {
  const now = new Date();
  const ms = now.getTime() - startTime.getTime();
  return { ms, seconds: Math.round(ms / 1000) };
};

/**
 * The minimal slice of an add-on we need to summarize an order for analytics.
 * Accepts the full `DealAddOn` (the deal's add-on catalog) directly.
 */
export type AddonForAnalytics = Pick<DealAddOn, 'id' | 'title' | 'amount' | 'type'>;

export interface AddonAnalyticsInput {
  /**
   * The deal's full add-on catalog. Used to resolve the selected IDs into
   * titles/types and to sum revenue. When omitted (e.g. a flow that doesn't
   * have the catalog handy) only the ID-based fields are emitted.
   */
  catalog?: AddonForAnalytics[];
  /** IDs (stringified) of the add-ons the customer actually selected. */
  selectedIds: string[];
  /** Which add-on UI variant the customer saw, e.g. 'bundle' | 'carousel'. */
  layout?: string | null;
}

/**
 * Build the order-level add-on properties to attach to checkout/payment events.
 *
 *   has_addon     — did the order include at least one add-on?
 *   addon_ids     — the selected add-on IDs, e.g. ['123', '456']
 *   addon_count   — how many add-ons were selected
 *   addon_titles  — selected add-on titles (only when the catalog is provided)
 *   addon_types   — selected add-on types  (only when the catalog is provided)
 *   addon_revenue — summed list price of the selected add-ons (catalog only)
 *   addon_layout  — the UI variant the add-ons were presented in (when known)
 *
 * Keeping this in one place means every event reports add-ons identically.
 */
export const buildAddonProperties = ({
  catalog,
  selectedIds,
  layout,
}: AddonAnalyticsInput): Record<string, unknown> => {
  const ids = selectedIds || [];
  const props: Record<string, unknown> = {
    [CheckoutEventProperties.HAS_ADDON]: ids.length > 0,
    [CheckoutEventProperties.ADDON_IDS]: ids,
    [CheckoutEventProperties.ADDON_COUNT]: ids.length,
  };

  if (catalog) {
    const selected = catalog.filter((addon) => ids.includes(addon.id.toString()));
    props[CheckoutEventProperties.ADDON_TITLES] = selected.map((addon) => addon.title);
    props[CheckoutEventProperties.ADDON_TYPES] = selected.map((addon) => addon.type);
    props[CheckoutEventProperties.ADDON_REVENUE] = selected.reduce(
      (sum, addon) => sum + (Number.parseFloat(addon.amount) || 0),
      0,
    );
  }

  if (layout) props[CheckoutEventProperties.ADDON_LAYOUT] = layout;

  return props;
};