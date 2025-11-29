/**
 * Centralized constants for PostHog analytics events in the checkout flow.
 * Follows PostHog best practices for event naming and properties.
 */

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