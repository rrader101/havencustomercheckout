import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Shield, Mail, Loader2 } from "lucide-react";
import {
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { usePaymentRequest } from "@/contexts/usePaymentRequest";
import {
  processPayment,
  PaymentData as ApiPaymentData,
  processChequePayment,
  ChequePaymentData,
} from "@/services/api";
import { SuccessPopup } from "./SuccessPopup";
import { useNavigate } from "react-router-dom";
import AddressAutocomplete from "./AddressAutocomplete";
import StripeProvider from "./StripeProvider";
   const countries = [
  "Other",
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "East Timor",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Ivory Coast",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe"
]
import { usePostHog } from 'posthog-js/react';
import type { PostHog } from 'posthog-js';
import { CheckoutEvents, CheckoutEventProperties, getTimestamp } from '@/lib/analytics';

const getCountryDisplayName = (countryCode: string): string => {
  switch (countryCode) {
    case "US":
      return "United States";
    case "Canada":
      return "Canada";
    case "Bahamas":
      return "Bahamas";
    case "Barbados":
      return "Barbados";
    case "Cayman Islands":
      return "Cayman Islands";
    case "Jamaica":
      return "Jamaica";
    case "Trinidad and Tobago":
      return "Trinidad and Tobago";
    case "Turks and Caicos Islands":
      return "Turks and Caicos Islands";
    case "British Virgin Islands":
      return "British Virgin Islands";
    case "US Virgin Islands":
      return "US Virgin Islands";
    case "Bermuda":
      return "Bermuda";
    case "Other":
      return "Other Country";
    default:
      return countryCode;
  }
};

interface PaymentFormData {
  method: "card" | "google-pay" | "apple-pay" | "link" | "check";
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
  userEmail?: string;
  paymentMethodId?: string;
  linkEmail?: string;
  billing_street_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  billing_zipcode?: string;
  useDifferentBilling?: boolean;
}

interface PaymentSectionProps {
  data: PaymentFormData;
  onUpdate: (data: Partial<PaymentFormData>) => void;
  onBack: () => void;
  total: number;
  userEmail?: string;
  shippingData?: {
    name?: string;
    email?: string;
    streetAddress?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  addOns?: Record<string, boolean>;
  invoices?: Record<string, boolean>;
  currency: "USD" | "CAD";
  dealId: string;
  dealData?: {
    type: string;
    mailing_address_country: string;
  };
  hasSubscriptionUpgrade?: boolean;
}

export const PaymentSection = React.memo(
  ({
    data,
    onUpdate,
    onBack,
    total,
    userEmail,
    shippingData,
    addOns,
    invoices,
    currency,
    dealId,
    dealData,
    hasSubscriptionUpgrade,
  }: PaymentSectionProps) => {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [orderId, setOrderId] = useState<string>("");
    const navigate = useNavigate();
    const posthog = usePostHog();

    const handlePaymentSuccess = async (
      paymentMethodId: string,
      method: string
    ) => {
      setErrors((prev) => ({ ...prev, api: "" }));
      try {
        onUpdate({
          paymentMethodId,
          method: method as PaymentFormData["method"],
        });
        await handleCheckoutAPI(paymentMethodId, method);
      } catch (error) {
        console.error("Payment processing failed:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Payment processing failed. Please try again.";
        setErrors((prev) => ({ ...prev, payment: errorMessage, api: "" }));
      }
    };

    const handleCheckoutAPI = async (
      paymentMethodId: string,
      method: string
    ) => {
      if (posthog) {
        posthog.capture(CheckoutEvents.PAYMENT_ATTEMPTED, {
          [CheckoutEventProperties.PAYMENT_METHOD]: method,
          [CheckoutEventProperties.TOTAL_AMOUNT]: total,
          [CheckoutEventProperties.CURRENCY]: currency,
          [CheckoutEventProperties.DEAL_ID]: dealId,
          [CheckoutEventProperties.CURRENT_STEP]: 'payment',
          [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
        });
      }

      try {
        const selectedAddOns = addOns
          ? Object.keys(addOns).filter((key) => addOns[key])
          : [];
        const selectedInvoices = invoices
          ? Object.keys(invoices).filter((key) => invoices[key])
          : [];
        let result;

        if (method === "check") {
          const chequeData: ChequePaymentData = {
            uuid: dealId,
            shipping_name: shippingData?.name || null,
            shipping_email: shippingData?.email || null,
            shipping_street_address: shippingData?.streetAddress || null,
            shipping_city: shippingData?.city || null,
            shipping_state: shippingData?.state || null,
            shipping_zipcode: shippingData?.zipCode || null,
            shipping_country: shippingData?.country || null,
            billing_name: data.cardholderName || null,
            billing_email: data.userEmail || null,
            billing_street_address: data.useDifferentBilling
              ? data.billing_street_address || null
              : shippingData?.streetAddress || null,
            billing_city: data.useDifferentBilling
              ? data.billing_city || null
              : shippingData?.city || null,
            billing_state: data.useDifferentBilling
              ? data.billing_state || null
              : shippingData?.state || null,
            billing_zipcode: data.useDifferentBilling
              ? data.billing_zipcode || null
              : shippingData?.zipCode || null,
            billing_country: data.useDifferentBilling
              ? data.billing_country || null
              : shippingData?.country || null,
            add_ons: selectedAddOns,
            invoice_ids: selectedInvoices,
          };

          result = await processChequePayment(chequeData);
        } else {
          const paymentData: ApiPaymentData = {
            uuid: dealId,
            payment_token: paymentMethodId,
            shipping_name: shippingData?.name || null,
            shipping_email: shippingData?.email || null,
            shipping_street_address: shippingData?.streetAddress || null,
            shipping_city: shippingData?.city || null,
            shipping_state: shippingData?.state || null,
            shipping_zipcode: shippingData?.zipCode || null,
            shipping_country: shippingData?.country || null,
            billing_name: data.cardholderName || null,
            billing_email: data.userEmail || null,
            billing_street_address: data.useDifferentBilling
              ? data.billing_street_address || null
              : shippingData?.streetAddress || null,
            billing_city: data.useDifferentBilling
              ? data.billing_city || null
              : shippingData?.city || null,
            billing_state: data.useDifferentBilling
              ? data.billing_state || null
              : shippingData?.state || null,
            billing_zipcode: data.useDifferentBilling
              ? data.billing_zipcode || null
              : shippingData?.zipCode || null,
            billing_country: data.useDifferentBilling
              ? data.billing_country || null
              : shippingData?.country || null,
            add_ons: selectedAddOns,
            invoice_ids: selectedInvoices,
            amount: total,
          };

          result = await processPayment(paymentData);
        }

        if (result && result.order_id) {
          setOrderId(result.order_id);
          setShowSuccessPopup(true);

          if (posthog) {
            posthog.capture(CheckoutEvents.PAYMENT_SUCCEEDED, {
              [CheckoutEventProperties.PAYMENT_METHOD]: method,
              [CheckoutEventProperties.TOTAL_AMOUNT]: total,
              [CheckoutEventProperties.CURRENCY]: currency,
              [CheckoutEventProperties.DEAL_ID]: dealId,
              [CheckoutEventProperties.CURRENT_STEP]: 'payment',
              order_id: result.order_id,
              [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
            });
          }
        }
      } catch (error) {
        console.error("Payment failed:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Payment processing failed. Please try again.";
        setErrors((prev) => ({ ...prev, payment: errorMessage, api: "" }));

        if (posthog) {
          posthog.capture(CheckoutEvents.PAYMENT_FAILED, {
            [CheckoutEventProperties.PAYMENT_METHOD]: method,
            [CheckoutEventProperties.TOTAL_AMOUNT]: total,
            [CheckoutEventProperties.CURRENCY]: currency,
            [CheckoutEventProperties.DEAL_ID]: dealId,
            [CheckoutEventProperties.CURRENT_STEP]: 'payment',
            [CheckoutEventProperties.ERROR_TYPE]: 'payment_processing_failed',
            [CheckoutEventProperties.ERROR_MESSAGE]: errorMessage,
            [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    const getProcessingFeeRate = (country: string) => {
      const normalizedCountry = country.toLowerCase().trim();
      const usaVariants = [
        "usa",
        "us",
        "united states",
        "united states of america",
      ];
      return usaVariants.includes(normalizedCountry) ? 0.029 : 0.024;
    };

  

    const normalizeCountry = (country: string): string => {
      const normalized = country.toLowerCase().trim();
      if (
        ["usa", "us", "united states", "united states of america"].includes(
          normalized
        )
      ) {
        return "United States";
      }
      if (["canada", "ca"].includes(normalized)) {
        return "Canada";
      }
      if (["bahamas", "the bahamas", "bs"].includes(normalized)) {
        return "Bahamas";
      }
      if (["barbados", "bb"].includes(normalized)) {
        return "Barbados";
      }
      if (["cayman islands", "cayman", "ky"].includes(normalized)) {
        return "Cayman Islands";
      }
      if (["jamaica", "jm"].includes(normalized)) {
        return "Jamaica";
      }
      if (["trinidad and tobago", "trinidad", "tobago", "tt"].includes(normalized)) {
        return "Trinidad and Tobago";
      }
      if (["turks and caicos", "turks and caicos islands", "tc"].includes(normalized)) {
        return "Turks and Caicos Islands";
      }
      if (["british virgin islands", "bvi", "vg"].includes(normalized)) {
        return "British Virgin Islands";
      }
      if (["us virgin islands", "usvi", "virgin islands", "vi"].includes(normalized)) {
        return "US Virgin Islands";
      }
      if (["bermuda", "bm"].includes(normalized)) {
        return "Bermuda";
      }
      return country;
    };

    const handlePopupClose = () => {
      setShowSuccessPopup(false);
      if (orderId) {
        navigate(`/order-confirmed/${orderId}?dealId=${dealId}`);
      }
    };

    const handleCheckPayment = async () => {
      if (isLoading) return; // Prevent double submission
      setIsLoading(true);
      setErrors({ payment: "", api: "", card: "" });
      await handleCheckoutAPI("", "check");
    };

    useEffect(() => {
      if (shippingData) {
        const updates: Partial<PaymentFormData> = {};
        if (data.userEmail == null) updates.userEmail = userEmail || "";
        if (data.cardholderName == null)
          updates.cardholderName = shippingData.name || "";
        if (Object.keys(updates).length > 0) onUpdate(updates);
      }
      if (!data.method) onUpdate({ method: "card" });
    }, []);

    const validateForm = () => {
      if (
        data.method === "google-pay" ||
        data.method === "apple-pay" ||
        data.method === "check"
      )
        return true;
      const newErrors: Record<string, string> = {};
      if (!data.userEmail?.trim()) newErrors.userEmail = "Email is required";
      if (!data.cardholderName?.trim())
        newErrors.cardholderName = "Cardholder name is required";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
      // Allow $0 total for subscription upgrades (user pays new price from next billing cycle)
      if (total <= 0 && !hasSubscriptionUpgrade) {
        setErrors((prev) => ({
          ...prev,
          payment:
            "Cannot complete order with zero total amount. Please select items or contact support.",
        }));
        return;
      }
      if (validateForm()) {
        if (data.method === "check") {
          handleCheckPayment();
        }
      }
    };

    const handleInputChange = (field: keyof PaymentFormData, value: string) => {
      onUpdate({ [field]: value });
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const formatCardNumber = (value: string) => {
      const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
      const matches = v.match(/\d{4,16}/g);
      const match = (matches && matches[0]) || "";
      const parts = [];
      for (let i = 0, len = match.length; i < len; i += 4)
        parts.push(match.substring(i, i + 4));
      return parts.length ? parts.join(" ") : v;
    };

    const formatExpiryDate = (value: string) => {
      const v = value.replace(/\D/g, "");
      if (v.length >= 2) return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
      return v;
    };

    return (
      <StripeProvider>
        <Card className="p-6 border-0 bg-card animate-fade-in">
          <StripePaymentContent
            data={data}
            onUpdate={onUpdate}
            total={total}
            userEmail={userEmail}
            shippingData={shippingData}
            dealData={dealData}
            onPaymentSuccess={handlePaymentSuccess}
            errors={errors}
            setErrors={setErrors}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            addOns={addOns}
            currency={currency}
            onBack={onBack}
            handleCheckPayment={handleCheckPayment}
            handleInputChange={handleInputChange}
            validateForm={validateForm}
            handleSubmit={handleSubmit}
            formatCardNumber={formatCardNumber}
            formatExpiryDate={formatExpiryDate}
            getProcessingFeeRate={getProcessingFeeRate}
            countries={countries}
            getCountryDisplayName={getCountryDisplayName}
            normalizeCountry={normalizeCountry}
            posthog={posthog}
            dealId={dealId}
            hasSubscriptionUpgrade={hasSubscriptionUpgrade}
          />

          <SuccessPopup
            isVisible={showSuccessPopup}
            orderId={orderId}
            onClose={handlePopupClose}
          />
        </Card>
      </StripeProvider>
    );
  },
  (prevProps, nextProps) =>
    prevProps.data === nextProps.data &&
    prevProps.total === nextProps.total &&
    prevProps.userEmail === nextProps.userEmail &&
    prevProps.shippingData === nextProps.shippingData &&
    prevProps.addOns === nextProps.addOns &&
    prevProps.invoices === nextProps.invoices &&
    prevProps.currency === nextProps.currency &&
    prevProps.dealId === nextProps.dealId &&
    prevProps.dealData === nextProps.dealData &&
    prevProps.hasSubscriptionUpgrade === nextProps.hasSubscriptionUpgrade
);

const StripePaymentContent = React.memo(
  ({
    data,
    onUpdate,
    total,
    userEmail,
    shippingData,
    dealData,
    onPaymentSuccess,
    errors,
    setErrors,
    isLoading,
    setIsLoading,
    addOns,
    currency,
    onBack,
    handleCheckPayment,
    handleInputChange,
    validateForm,
    handleSubmit,
    formatCardNumber,
    formatExpiryDate,
    getProcessingFeeRate,
    countries,
    getCountryDisplayName,
    normalizeCountry,
    posthog,
    dealId,
    hasSubscriptionUpgrade,
  }: {
    data: PaymentFormData;
    onUpdate: (data: Partial<PaymentFormData>) => void;
    total: number;
    userEmail?: string;
    shippingData?: {
      name?: string;
      email?: string;
      streetAddress?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    };
    dealData?: { type: string; mailing_address_country: string };
    onPaymentSuccess: (paymentMethodId: string, method: string) => void;
    errors: Record<string, string>;
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    addOns?: Record<string, boolean>;
    currency: "USD" | "CAD";
    onBack: () => void;
    handleCheckPayment: () => void;
    handleInputChange: (field: keyof PaymentFormData, value: string) => void;
    validateForm: () => boolean;
    handleSubmit: () => void;
    formatCardNumber: (value: string) => string;
    formatExpiryDate: (value: string) => string;
    getProcessingFeeRate: (country: string) => number;
    countries: string[];
    getCountryDisplayName: (countryCode: string) => string;
    normalizeCountry: (country: string) => string;
    posthog: PostHog | null;
    dealId: string;
    hasSubscriptionUpgrade?: boolean;
  }) => {
    const stripe = useStripe();
    const elements = useElements();
    
    const country = dealData?.mailing_address_country || 'US';
    
    const {
      paymentRequest,
      canMakePayment,
      updatePaymentRequest,
      setPaymentMethodHandler,
      setErrorHandler,
    } = usePaymentRequest(currency, country);
    const [focused, setFocused] = useState(false);
    const hasError = Boolean(errors.payment);
    const [isOtherCountry, setIsOtherCountry] = useState(false);
    useEffect(() => {
      setPaymentMethodHandler(onPaymentSuccess);
    }, [onPaymentSuccess, setPaymentMethodHandler]);

    useEffect(() => {
      setErrorHandler((error: string) => {
        setErrors((prev) => ({ ...prev, payment: error }));
      });
    }, [setErrorHandler, setErrors]);

    useEffect(() => {
      if (total > 0) updatePaymentRequest(total);
    }, [total, updatePaymentRequest]);

    const clickedRef = React.useRef(false);
    const handleCardPayment = async () => {
      if (!stripe || !elements) return;
      if (isLoading || clickedRef.current) return; // Prevent double submission
      clickedRef.current = true;
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        clickedRef.current = false;
        return;
      }

      setIsLoading(true);
      setErrors({ payment: "", api: "", card: "" });

      try {
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: { name: data.cardholderName, email: userEmail },
        });

        if (error) {
          console.error("Payment method creation failed:", error);
          setErrors({
            payment: error.message || "Payment failed",
            api: "",
            card: "",
          });
          setIsLoading(false);
          clickedRef.current = false;
          return;
        }

        // Call onPaymentSuccess but isLoading is already true, so it will skip the guard and setIsLoading
        // handleCheckoutAPI will reset isLoading in finally block
        await onPaymentSuccess(paymentMethod.id, "card");
      } catch (error) {
        console.error("Payment processing failed:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Payment processing failed. Please try again.";
        setErrors({ payment: errorMessage, api: "", card: "" });
        setIsLoading(false);
      } finally {
        clickedRef.current = false;
      }
    };

    return (
      <>
        {/* Wallets (Apple Pay / Google Pay / Link) */}
        {paymentRequest && canMakePayment && (
          <>
            <div className="mb-6">
              <div className="w-full h-12 rounded-lg overflow-hidden">
                <PaymentRequestButtonElement
                  options={{
                    paymentRequest,
                    style: {
                      paymentRequestButton: {
                        type: "default",
                        theme: "dark",
                        height: "48px",
                      },
                    },
                  }}
                />
              </div>
            </div>
            {/* Divider styled like prior components */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
            </div>
          </>
        )}

        {/* Credit Card Form (styled to match the earlier clean, neutral look) */}
        <div className="space-y-4 animate-fade-in">
          {/* Email */}
          <div className="pt-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={data.userEmail || ""}
              placeholder="email@example.com"
              onChange={(e) => {
                onUpdate({ userEmail: e.target.value });

                if (posthog) {
                  posthog.capture(CheckoutEvents.PAYMENT_EMAIL_UPDATED, {
                    [CheckoutEventProperties.DEAL_ID]: dealId,
                    [CheckoutEventProperties.CURRENT_STEP]: 'payment',
                    [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
                  });
                }
              }}
              className="mt-0"
            />
          </div>

          {/* Card fields (hidden for check/link) */}
          {data.method !== "check" && data.method !== "link" && (
            <>
              <div>
                <Label htmlFor="card-element">Card information</Label>
                <div
                  className="mt-1 p-[9px] rounded-md transition-all duration-200"
                  style={{
                    backgroundColor: "hsl(0deg 0% 96.86%)",
                    border: hasError
                      ? "1px solid hsl(0deg 100% 40%)" // red border on error
                      : focused
                      ? "1px solid hsl(0deg 0% 0%)" // black border on focus
                      : "1px solid rgba(0, 0, 0, 0.1)",
                    boxShadow: hasError
                      ? "0 0 0 1px hsl(0deg 100% 40% / 0.3)" // red glow
                      : focused
                      ? "0 0 0 1px hsl(0deg 0% 0% / 0.1)" // subtle black glow
                      : "none",
                  }}
                >
                  <CardElement
                    options={{
                      style: {
                        base: {
                          fontSize: "13px",
                          color: "#424770",
                          fontFamily: '"Poppins", sans-serif',
                          fontWeight: "400",
                          "::placeholder": {
                            color: "rgba(67, 67, 67, 0.6)", // Lighter gray for placeholders
                            fontSize: "12px",
                            fontFamily: '"Poppins", sans-serif',
                          },
                        },
                        invalid: { color: "#9e2146" },
                      },
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={(event) => {
                      if (event.error)
                        setErrors({ ...errors, payment: event.error.message });
                      else setErrors({ ...errors, payment: "" });
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cardholderName">Cardholder name</Label>
                <Input
                  id="cardholderName"
                  placeholder="Full name on card"
                  value={data.cardholderName || ""}
                  onChange={(e) => {
                    onUpdate({ cardholderName: e.target.value });

                    if (posthog) {
                      posthog.capture(CheckoutEvents.PAYMENT_CARDHOLDER_NAME_UPDATED, {
                        [CheckoutEventProperties.DEAL_ID]: dealId,
                        [CheckoutEventProperties.CURRENT_STEP]: 'payment',
                        [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
                      });
                    }
                  }}
                  className="mt-0"
                />
              </div>

              {/* Billing address toggle & fields */}
              <div className="pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useDifferentBilling"
                    checked={data.useDifferentBilling || false}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      if (posthog) {
                        posthog.capture(CheckoutEvents.PAYMENT_BILLING_ADDRESS_TOGGLED, {
                          [CheckoutEventProperties.DEAL_ID]: dealId,
                          [CheckoutEventProperties.CURRENT_STEP]: 'payment',
                          use_different_billing: checked,
                          [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
                        });
                      }

                      if (checked) {
                        const updates: Partial<PaymentFormData> = {
                          useDifferentBilling: true,
                        };
                        if (!data.billing_street_address)
                          updates.billing_street_address = "";
                        if (!data.billing_city) updates.billing_city = "";
                        if (!data.billing_state) updates.billing_state = "";
                        if (!data.billing_country) updates.billing_country = "";
                        if (!data.billing_zipcode) updates.billing_zipcode = "";
                        onUpdate(updates);
                      } else {
                        onUpdate({ useDifferentBilling: false });
                      }
                    }}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: "hsl(var(--primary))" }}
                  />
                  <Label htmlFor="useDifferentBilling" className="text-sm cursor-pointer">
                    Use different billing address
                  </Label>
                </div>
              </div>

              {data.useDifferentBilling && (
                <div className="space-y-4 mt-4">
                  <div className="mb-4">
                    <AddressAutocomplete
                      value={data.billing_street_address || ""}
                      onChange={(value) =>
                        onUpdate({ billing_street_address: value })
                      }
                      onAddressSelect={(addressComponents) => {
                        onUpdate({
                          billing_street_address:
                            addressComponents.streetAddress,
                          billing_city: addressComponents.city,
                          billing_state: addressComponents.state,
                          billing_country: normalizeCountry(
                            addressComponents.country
                          ),
                          billing_zipcode: addressComponents.zipCode,
                        });
                      }}
                      placeholder="Start typing your billing address..."
                      className="mt-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="billing_city">City</Label>
                      <Input
                        id="billing_city"
                        placeholder="City"
                        value={data.billing_city || ""}
                        onChange={(e) =>
                          onUpdate({ billing_city: e.target.value })
                        }
                        className="mt-0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billing_state">State</Label>
                      <Input
                        id="billing_state"
                        placeholder="State"
                        value={data.billing_state || ""}
                        onChange={(e) =>
                          onUpdate({ billing_state: e.target.value })
                        }
                        className="mt-0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="billing_country">Country</Label>
                      {!isOtherCountry ? (
                        <>
                          <Select
                            value={data.billing_country || ""}
                            onValueChange={(value) => {
                              if (value === 'Other') {
                                setIsOtherCountry(true);
                                onUpdate({ billing_country: '' });
                              } else {
                                onUpdate({ billing_country: value });
                              }
                            }}
                            className="bg-[#f7f7f7] border border-input"
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country} value={country}>
                                  {getCountryDisplayName(country)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        <>
                          <Input
                            id="billing_country"
                            placeholder="Enter your country"
                            value={data.billing_country || ""}
                            onChange={(e) =>
                              onUpdate({ billing_country: e.target.value })
                            }
                            className="mt-0"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsOtherCountry(false);
                              onUpdate({ billing_country: 'United States' });
                            }}
                            className="text-xs text-primary hover:underline mt-1"
                          >
                            ← Back to country list
                          </button>
                        </>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="billing_zipcode">ZIP Code</Label>
                      <Input
                        id="billing_zipcode"
                        placeholder="12345"
                        value={data.billing_zipcode || ""}
                        onChange={(e) =>
                          onUpdate({ billing_zipcode: e.target.value })
                        }
                        className="mt-0"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Check Payment Option (neutral styling) */}
          <div className="pt-4 border-t ">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="check"
                name="paymentMethod"
                checked={data.method === "check"}
                onChange={(e) =>
                  onUpdate({ method: e.target.checked ? "check" : "card" })
                }
                className="h-4 w-4 rounded"
                style={{ accentColor: "hsl(var(--primary))" }}
              />
              <Label
                htmlFor="check"
                className="font-sm cursor-pointer flex items-center gap-2"
              >
                <Mail className="w-4 h-4 text-foreground" />
                Pay by check instead
              </Label>
            </div>
          </div>
        </div>

        {/* Check Payment Instructions (match prior banner style) */}
        {data.method === "check" && (
          <div className="p-4 mt-4 bg-muted/50 rounded-lg border border-muted animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Mail className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-2">
                  Check Payment Instructions
                </h4>
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Please send your check to:</p>
                  <div className="space-y-1 mb-3">
                    <p className="font-medium">HAVEN</p>
                    <p>33 Irving Pl, 3rd Floor</p>
                    <p>New York, NY 10003</p>
                    <p>United States</p>
                  </div>
                  <p className="text-xs">
                    Make checks payable to:{" "}
                    <span className="font-medium">HAVEN | FINE</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Notice styled like other value banners */}
        <div className="mt-6 p-4 bg-gradient-accent rounded-lg border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Shield className="w-5 h-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                🔒 Secure Checkout
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your payment information is encrypted with industry-standard SSL
                encryption. All transactions are protected.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons and Legal Text */}
        <div className="space-y-6 mt-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2 text-foreground border-0 hover:text-white transition-colors custom-back-button"
              style={{ backgroundColor: "hsl(0deg 0% 96.86%)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={() => {
                if (data.method === "card") {
                  handleCardPayment();
                } else {
                  handleSubmit();
                }
              }}
              disabled={
                isLoading ||
                (data.method !== "check" && (!stripe || !elements)) ||
                (total === 0 && !hasSubscriptionUpgrade)
              }
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing
                </>
              ) : total > 0 ? (
                data.method === "check" ? (
                  `Complete $${parseFloat(total.toFixed(2)).toFixed(2)}`
                ) : (
                  `Pay $${parseFloat(total.toFixed(2)).toFixed(2)}`
                )
              ) : (
                "Complete Order"
              )}
            </Button>
          </div>

          {/* Legal Links */}
          <div className="text-left text-sm text-muted-foreground">
            <p>
              By clicking "{total > 0 ? (data.method === "check" ? "Complete" : "Pay") : "Complete Order"}", you agree to our{' '}
              <a href="/terms" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-foreground transition-colors" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Error Display */}
        {(errors.payment || errors.api || errors.card) && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-md shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Payment Error
                </h3>
                <div className="mt-1 text-sm text-red-700">
                  {(() => {
                    const errorObj =
                      errors.payment || errors.api || errors.card;
                    try {
                      const parsed = JSON.parse(errorObj);
                      return parsed.message || parsed.error || errorObj;
                    } catch {
                      return errorObj;
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  },
  (prevProps, nextProps) =>
    prevProps.data.method === nextProps.data.method &&
    prevProps.total === nextProps.total &&
    prevProps.userEmail === nextProps.userEmail &&
    prevProps.shippingData === nextProps.shippingData &&
    prevProps.dealData === nextProps.dealData &&
    prevProps.addOns === nextProps.addOns &&
    prevProps.currency === nextProps.currency &&
    prevProps.errors.payment === nextProps.errors.payment &&
    prevProps.errors.api === nextProps.errors.api &&
    prevProps.errors.card === nextProps.errors.card
);
