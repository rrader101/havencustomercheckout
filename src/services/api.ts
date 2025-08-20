// API service for fetching deals data

export interface DealAddOn {
  id: number;
  type: string;
  product_name: string;
  title: string;
  amount: string;
  description: string;
  pricing_behavior: string;
  isPopular?: boolean;
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
}

export interface DealsResponse {
  deal: Deal;
}

export interface PaymentData {
  uuid: string;
  payment_token: string;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_street_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_zipcode: string | null;
  shipping_country: string | null;
  add_ons: string[];
  invoice_ids: string[];
}

export interface PaymentResponse {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
  message?: string;
}

const API_DOMAIN = import.meta.env.VITE_API_DOMAIN;

if (!API_DOMAIN) {
  throw new Error('VITE_API_DOMAIN environment variable is not set');
}

// Simple in-memory cache
const cache = new Map<string, { data: DealsResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Request timeout utility
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Retry utility
const retryFetch = async (url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok) {
        return response;
      }
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status} ${response.statusText}`);
      }
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError!;
};

export const fetchDealsData = async (dealId: string): Promise<DealsResponse> => {
  // Check cache first
  const cacheKey = `deals_${dealId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    const response = await fetch(`https://${API_DOMAIN}/api/deals/${dealId}`);
    const data = await response.json();
    
    // Cache the result
    cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  } catch (error) {
    console.error('Error fetching deals data:', error);
    throw error;
  }
};

// Clear cache utility (useful for testing or manual cache invalidation)
export const clearCache = (dealId?: string): void => {
  if (dealId) {
    cache.delete(`deals_${dealId}`);
  } else {
    cache.clear();
  }
};

export const processPayment = async (paymentData: PaymentData): Promise<PaymentResponse> => {
  try {
    const response = await fetch(`https://${API_DOMAIN}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Payment failed');
    }

    return result;
  } catch (error) {
    console.error('Payment API error:', error);
    throw error;
  }
};