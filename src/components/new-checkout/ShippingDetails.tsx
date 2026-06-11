import React, { useEffect, useState } from 'react';
import AddressAutocomplete from '../AddressAutocomplete';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  COUNTRIES,
  Field,
  Icon,
  ShippingData,
  getCountryDisplayName,
  normalizeCountry,
  usePrimarySubmitOnEnter,
} from './shared';

/**
 * Step 01 — "Details". Collects name, email, and mailing address.
 * Submits when the user clicks "Looks good" or presses Enter from any input
 * (Enter handling lives in usePrimarySubmitOnEnter, which carves out
 * dropdowns, comboboxes, and active Google Places suggestions).
 */
export default function DetailsStep({
  data,
  onUpdate,
  onNext,
  loading,
}: {
  data: ShippingData;
  onUpdate: (data: Partial<ShippingData>) => void;
  onNext: () => void;
  loading: boolean;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isOtherCountry, setIsOtherCountry] = useState(false);
  const firstName = data.name.trim().split(/\s+/)[0];
  const title = firstName ? `${firstName}, where should we send your copies?` : 'Where should we send your copies?';

  useEffect(() => {
    if (data.country && !COUNTRIES.includes(data.country)) {
      setIsOtherCountry(true);
    }
  }, [data.country]);

  const update = (field: keyof ShippingData, value: string) => {
    onUpdate({ [field]: value });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleAddressSelect = (addressComponents: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  }) => {
    const nextCountry = normalizeCountry(addressComponents.country);
    onUpdate({
      streetAddress: addressComponents.streetAddress,
      city: addressComponents.city,
      state: addressComponents.state,
      country: nextCountry,
      zipCode: addressComponents.zipCode,
    });
    if (nextCountry && !COUNTRIES.includes(nextCountry)) {
      setIsOtherCountry(true);
    }
    setErrors((prev) => ({
      ...prev,
      streetAddress: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    }));
  };

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!data.name.trim()) nextErrors.name = 'Name is required';
    if (!data.email.trim()) nextErrors.email = 'Email is required';
    if (!data.streetAddress.trim()) nextErrors.streetAddress = 'Street address is required';
    if (!data.city.trim()) nextErrors.city = 'City is required';
    if (!data.state.trim()) nextErrors.state = 'State is required';
    if (!data.country.trim()) nextErrors.country = 'Country is required';
    if (!data.zipCode.trim()) nextErrors.zipCode = 'Postal code is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onNext();
  };

  usePrimarySubmitOnEnter(submit, !loading);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <form
      className="hc-fade-in hc-details-step"
      data-screen-label="01 Details"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="hc-section-head">
        <h1 className="hc-section-title">{title}</h1>
        <p className="hc-section-sub">We'll send copies to your preferred address after the magazine is finalized.</p>
      </div>

      <div className="hc-fields">
        <Field label="Full name" error={errors.name}>
          <input value={data.name} onChange={(event) => update('name', event.target.value)} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" value={data.email} onChange={(event) => update('email', event.target.value)} />
        </Field>
        <Field label="Street address" error={errors.streetAddress} className="hc-address-field">
          <AddressAutocomplete
            value={data.streetAddress}
            onChange={(value) => update('streetAddress', value)}
            onAddressSelect={handleAddressSelect}
            placeholder="Start typing your address..."
            label=""
            className="hc-address-autocomplete"
          />
        </Field>
        <div className="hc-grid-3">
          <Field label="City" error={errors.city}>
            <input value={data.city} onChange={(event) => update('city', event.target.value)} />
          </Field>
          <Field label="State" error={errors.state}>
            <input value={data.state} onChange={(event) => update('state', event.target.value)} />
          </Field>
          <Field label="Postal code" error={errors.zipCode}>
            <input value={data.zipCode} onChange={(event) => update('zipCode', event.target.value)} />
          </Field>
        </div>
        <Field label="Country" error={errors.country} className="hc-country-field hc-select-field">
          {!isOtherCountry ? (
            <Select
              value={data.country}
              onValueChange={(value) => {
                if (value === 'Other') {
                  setIsOtherCountry(true);
                  update('country', '');
                } else {
                  update('country', value);
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
              <input value={data.country} onChange={(event) => update('country', event.target.value)} placeholder="Enter your country" />
              <button
                type="button"
                className="hc-country-back"
                onClick={() => {
                  setIsOtherCountry(false);
                  update('country', 'United States');
                }}
              >
                Back to country list
              </button>
            </>
          )}
        </Field>
      </div>

      <div className="hc-step-footer">
        <div className="hc-footer-note">
          <Icon.Lock />
          <span>Encrypted. We use these details only to mail your issue.</span>
        </div>
        <button type="submit" className="hc-btn lg" disabled={loading}>
          {loading ? 'Saving...' : 'Looks good'}
          <span className="hc-arrow">
            <Icon.Arrow />
          </span>
        </button>
      </div>
    </form>
  );
}
