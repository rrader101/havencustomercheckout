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
  // Contact name info
  contact_first_name: string | null;
  contact_last_name: string | null;
  // Processing fee exemption
  processing_fee_exempt: boolean;
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
  // 'annual_upfront' => charge the full subscription term in one payment
  // (minus the upfront discount) instead of starting a monthly Stripe plan.
  billing_option?: 'monthly' | 'annual_upfront';
  // Client-generated key that stays stable across manual retries of the same
  // payment. The backend MUST use it to de-duplicate charges so a network blip
  // ("Load failed") that hides a succeeded charge can't turn into a double
  // charge on retry. Harmlessly ignored until the backend honors it.
  idempotency_key?: string;
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
  billing_option?: 'monthly' | 'annual_upfront';
  // See PaymentData.idempotency_key.
  idempotency_key?: string;
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

/**
 * Thrown when a request never got a usable HTTP response — the browser rejected
 * the fetch (Safari's "Load failed" / Chrome's "Failed to fetch") or our own
 * timeout aborted it. This is distinct from an HTTP error status: on iOS Safari
 * a request that is interrupted (weak signal, backgrounded tab, in-app browser)
 * surfaces here, NOT as `response.ok === false`.
 */
export class NetworkError extends Error {
  readonly isNetwork = true;
  readonly attempts: number;
  constructor(message: string, attempts: number, options?: { cause?: unknown }) {
    super(message);
    this.name = 'NetworkError';
    this.attempts = attempts;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/** True for any failure where the request didn't complete (vs. a real HTTP status). */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof NetworkError) return true;
  if (error instanceof Error) {
    return /load failed|failed to fetch|networkerror|network request failed|timed out|operation was aborted/i.test(
      error.message,
    );
  }
  return false;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// 300ms, 600ms, 1200ms … capped at 2s, plus jitter to avoid a retry thundering herd.
const backoffDelay = (attempt: number) => Math.min(2000, 300 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 200);

// Transient server responses worth another attempt (idempotent requests only).
const isRetriableStatus = (status: number) =>
  status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);

const normalizeFetchError = (error: unknown): Error =>
  error instanceof DOMException && error.name === 'AbortError'
    ? new Error('Request timed out')
    : error instanceof Error
      ? error
      : new Error('Network request failed');

/**
 * fetch() for IDEMPOTENT requests (GET): adds a per-attempt timeout and retries
 * transient failures — network rejects, timeouts, and 5xx/429 — with backoff.
 * Returns the final Response (which may still carry a non-2xx status; the caller
 * decides). Throws NetworkError only when every attempt failed to complete.
 * NEVER use for non-idempotent writes (POST) — a retry could double-submit.
 */
async function fetchIdempotentWithRetry(
  url: string,
  init: RequestInit = {},
  { timeoutMs = 12000, maxAttempts = 3 }: { timeoutMs?: number; maxAttempts?: number } = {},
): Promise<Response> {
  let lastError: Error = new Error('Network request failed');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (isRetriableStatus(response.status) && attempt < maxAttempts) {
        await wait(backoffDelay(attempt));
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = normalizeFetchError(error);
      if (attempt < maxAttempts) {
        await wait(backoffDelay(attempt));
        continue;
      }
    }
  }
  throw new NetworkError(lastError.message, maxAttempts, { cause: lastError });
}

/**
 * fetch() with a timeout but NO retry — for non-idempotent writes (payments).
 * A dropped connection here is ambiguous (the server may have processed the
 * request while the response was lost), so we surface it as a NetworkError and
 * let the caller warn the user rather than silently resubmitting.
 */
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 45000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    const normalized = normalizeFetchError(error);
    throw new NetworkError(normalized.message, 1, { cause: normalized });
  } finally {
    clearTimeout(timer);
  }
}

export const fetchDealsData = async (dealId: string): Promise<DealsResponse> => {
  const response = await fetchIdempotentWithRetry(`${BASE_URL}/api/deals/${dealId}`, {
    headers: maybeNgrokHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch deal: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as DealsResponse;
};

export const processPayment = async (paymentData: PaymentData): Promise<PaymentResponse> => {
  const response = await fetchWithTimeout(`${BASE_URL}/api/payments`, {
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
  const response = await fetchWithTimeout(`${BASE_URL}/api/payments/cheque-payments`, {
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
