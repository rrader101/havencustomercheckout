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

const API_DOMAIN = import.meta.env.VITE_API_DOMAIN;

if (!API_DOMAIN) {
  throw new Error('VITE_API_DOMAIN environment variable is not set');
}

export const fetchDealsData = async (dealId: string): Promise<DealsResponse> => {
  try {
    const response = await fetch(`https://${API_DOMAIN}/api/deals/${dealId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch deals data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching deals data:', error);
    throw error;
  }
};