// api.ts (API service for fetching deals data)

export interface DealAddOn {
  id: number;
  type: string;
  product_name: string;
  title: string;
  amount: string;
  description: string;
  pricing_behavior: string;
  tags?: string; // comma-separated tags
  isPopular?: boolean;
  // Agreement configuration fields
  issue_count?: number;
  total_months?: number;
  subscription_term?: number;
  billing_interval?: string;
  billing_interval_count?: number;
}

export interface DealProduct {
  id: number;
  deal_uuid: string;
  name: string;
  product_id: string;
  product_code: string;
  quantity: number;
  unit_price: string;
}

export interface Invoice {
  id: number;
  deal_uuid: string;
  invoice_num: string;
  due_date: string;
  status: string;
  amount: string;
  sf_quote_id: string;
  payment_confirmation_num: string | null;
  published_at: string;
  invoice_products: {
    invoice_id: number;
    name: string;
    quantity: string;
    price: string;
  }[];
}

export interface Deal {
  deal_uuid: string;
  user_id: string | null;
  name: string;
  amount: number;
  currency: string;
  issue: string;
  mailing_address_street: string;
  mailing_address_city: string;
  mailing_address_state: string;
  mailing_address_zipcode: string;
  mailing_address_country: string;
  status: boolean;
  contact_email: string;
  type: string;
  contract_step: string | null;
  contract_length: string;
  monthly_subscription_price: number;
  subscription_term: string;
  agreement_status: string | null;
  close_date: string;
  stage_name: string;
  agreement_id: string | null;
  contact_id: string;
  owner_id: string;
  formatted_price: string;
  add_ons: DealAddOn[];
  deal_products: DealProduct[];
  invoices: Invoice[];
  // Active subscription info
  has_active_subscription: boolean;
  active_subscription_amount: number | null;
  stripe_subscription_id?: string;
}

export interface DealsResponse {
  deal: Deal;
}

export interface PaymentData {
  uuid: string;
  payment_token: string;
  amount: number;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_street_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zipcode: string | null;
  shipping_country: string | null;
  billing_name: string | null;
  billing_email: string | null;
  billing_street_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zipcode: string | null;
  billing_country: string | null;
  add_ons: string[];
  invoice_ids: string[];
}

export interface PaymentResponse {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
  message?: string;
  order_id?: string;
}

export interface AddressData {
  uuid: string;
  shipping_street_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zipcode: string | null;
  shipping_country: string | null;
}

export interface AddressResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export interface ChequePaymentData {
  uuid: string;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_street_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zipcode: string | null;
  shipping_country: string | null;
  billing_name: string | null;
  billing_email: string | null;
  billing_street_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zipcode: string | null;
  billing_country: string | null;
  add_ons: string[];
  invoice_ids: string[];
}

export interface ChequePaymentResponse {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
  message?: string;
  order_id?: string;
}

/**
 * Config
 * - VITE_API_BASE_URL: full base url, e.g. https://xxxx.ngrok-free.app or https://api.yourdomain.com
 * - VITE_NGROK_BYPASS: "true" to send ngrok-skip-browser-warning header
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const NGROK_BYPASS = import.meta.env.VITE_NGROK_BYPASS === 'true';

console.log('API_BASE_URL:', API_BASE_URL);
console.log('NGROK_BYPASS:', NGROK_BYPASS);

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL environment variable is not set');
}

// Normalize base URL (remove trailing slashes)
const BASE_URL = API_BASE_URL.replace(/\/+$/, '');

const maybeNgrokHeaders = (): HeadersInit =>
  NGROK_BYPASS ? { 'ngrok-skip-browser-warning': 'true' } : {};

const jsonHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  ...maybeNgrokHeaders(),
});

async function parseJsonSafe<T>(response: Response): Promise<T | object> {
  try {
    return (await response.json()) as T;
  } catch {
    return {};
  }
}

function buildError(response: Response, body: unknown, fallbackMessage: string) {
  const bodyObj = typeof body === 'object' && body !== null ? (body as { message?: string; error?: string }) : {};
  return new Error(
    JSON.stringify({
      message: bodyObj.message || bodyObj.error || fallbackMessage,
      error: bodyObj.error,
      status: response.status,
    })
  );
}

export const fetchDealsData = async (dealId: string): Promise<DealsResponse> => {
  const response = await fetch(`${BASE_URL}/api/deals/${dealId}`, {
    headers: maybeNgrokHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch deal: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as DealsResponse;
};

export const processPayment = async (paymentData: PaymentData): Promise<PaymentResponse> => {
  const response = await fetch(`${BASE_URL}/api/payments`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(paymentData),
  });

  const result = await parseJsonSafe<PaymentResponse>(response);

  if (!response.ok) {
    throw buildError(response, result, 'Payment failed');
  }

  return result as PaymentResponse;
};

export const saveAddress = async (addressData: AddressData): Promise<AddressResponse> => {
  const response = await fetch(`${BASE_URL}/api/payments/address`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(addressData),
  });

  const result = await parseJsonSafe<AddressResponse>(response);

  if (!response.ok) {
    throw buildError(response, result, 'Address save failed');
  }

  return result as AddressResponse;
};

export const processChequePayment = async (
  chequeData: ChequePaymentData
): Promise<ChequePaymentResponse> => {
  const response = await fetch(`${BASE_URL}/api/payments/cheque-payments`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(chequeData),
  });

  const result = await parseJsonSafe<ChequePaymentResponse>(response);

  if (!response.ok) {
    throw buildError(
      response,
      result,
      `HTTP error! status: ${response.status}`
    );
  }

  return result as ChequePaymentResponse;
};
