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

const API_DOMAIN = import.meta.env.VITE_API_DOMAIN;

if (!API_DOMAIN) {
  throw new Error('VITE_API_DOMAIN environment variable is not set');
}

export const fetchDealsData = async (dealId: string): Promise<DealsResponse> => {
  try {
    const response = await fetch(`https://${API_DOMAIN}/api/deals/${dealId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch deal: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching deals data:', error);
    throw error;
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
      // Create structured error object with message property
      const errorObj = {
        message: result.message || result.error || 'Payment failed',
        error: result.error,
        status: response.status
      };
      throw new Error(JSON.stringify(errorObj));
    }

    return result;
  } catch (error) {
    console.error('Payment API error:', error);
    throw error;
  }
};

export const saveAddress = async (addressData: AddressData): Promise<AddressResponse> => {
  try {
    const response = await fetch(`https://${API_DOMAIN}/api/payments/address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addressData),
    });

    const result = await response.json();

    if (!response.ok) {
      // Create structured error object with message property
      const errorObj = {
        message: result.message || result.error || 'Address save failed',
        error: result.error,
        status: response.status
      };
      throw new Error(JSON.stringify(errorObj));
    }

    return result;
  } catch (error) {
    console.error('Address API error:', error);
    throw error;
  }
};

export const processChequePayment = async (chequeData: ChequePaymentData): Promise<ChequePaymentResponse> => {
  const response = await fetch(`https://${API_DOMAIN}/cheque-payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(chequeData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Create structured error object with message property
    const errorObj = {
      message: errorData.message || errorData.error || `HTTP error! status: ${response.status}`,
      error: errorData.error,
      status: response.status
    };
    throw new Error(JSON.stringify(errorObj));
  }

  const result = await response.json();
  return result;
};