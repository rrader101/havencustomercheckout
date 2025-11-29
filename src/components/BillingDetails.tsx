import React, { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';
import { saveAddress } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface BillingData {
  name: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

interface BillingDetailsProps {
  data: BillingData;
  onUpdate: (data: Partial<BillingData>) => void;
  onNext: () => void;
  onBack: () => void;
  dealId?: string;
}

export const BillingDetails = React.memo(({ data, onUpdate, onNext, onBack, dealId }: BillingDetailsProps) => {
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [initialData, setInitialData] = useState<BillingData | null>(null);

  // Comprehensive country list (same as PaymentSection)
  const countries = ['US', 'Canada'];

  // Country normalization handled inline in address selection callback

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!data.name?.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!data.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!data.streetAddress?.trim()) {
      newErrors.streetAddress = 'Street address is required';
    }

    if (!data.city?.trim()) {
      newErrors.city = 'City is required';
    }

    if (!data.state?.trim()) {
      newErrors.state = 'State/Province is required';
    }

    if (!data.country?.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!data.zipCode?.trim()) {
      newErrors.zipCode = 'ZIP/Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await saveAddress({
        uuid: dealId || '',
        shipping_street_address: data.streetAddress,
        shipping_city: data.city,
        shipping_state: data.state,
        shipping_zipcode: data.zipCode,
        shipping_country: data.country
      });
      onNext();
    } catch (error) {
      console.error('Error saving billing address::::::::::::::::', error);
      setErrors({ submit: 'Failed to save billing address. Please try again.' });
      toast({
        title: 'Error',
        description: 'Failed to save billing address. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = useCallback((field: keyof BillingData, value: string) => {
    onUpdate({ [field]: value });
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [onUpdate, errors]);

  const handleAddressSelect = useCallback((addressData: {
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  }) => {
    // Normalize the country from Google Places API
    const normalizedInput = addressData.country.toLowerCase().trim();
    const normalizedCountry = [
      'usa',
      'us',
      'united states',
      'united states of america',
    ].includes(normalizedInput)
      ? 'US'
      : ['canada', 'ca'].includes(normalizedInput)
      ? 'Canada'
      : addressData.country;
    onUpdate({
      streetAddress: addressData.streetAddress,
      city: addressData.city,
      state: addressData.state,
      country: normalizedCountry,
      zipCode: addressData.zipCode,
    });
    
    // Clear related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.streetAddress;
      delete newErrors.city;
      delete newErrors.state;
      delete newErrors.country;
      delete newErrors.zipCode;
      return newErrors;
    });
  }, [onUpdate]);

  // Store initial data on mount
  useEffect(() => {
    if (!initialData) {
      setInitialData({ ...data });
    }
  }, [data, initialData]);

  return (
    <Card className="p-6 border-0">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-foreground" />
        <h2 className="text-xl font-semibold text-foreground" style={{ fontWeight: 700, fontSize: '1.6rem', letterSpacing: '-0.02rem' }}>
          Billing Information
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="billing-name" className="text-sm font-medium text-foreground">
            Full Name *
          </Label>
          <Input
            id="billing-name"
            type="text"
            value={data.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`${errors.name ? 'border-red-500' : ''}`}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="billing-email" className="text-sm font-medium text-foreground">
            Email Address *
          </Label>
          <Input
            id="billing-email"
            type="email"
            value={data.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`${errors.email ? 'border-red-500' : ''}`}
            placeholder="Enter your email address"
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Address Autocomplete */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Street Address *
          </Label>
          <AddressAutocomplete
            onAddressSelect={handleAddressSelect}
            placeholder="Start typing your address..."
            className={`${errors.streetAddress ? 'border-red-500' : ''}`}
            value={data.streetAddress || ''}
            onChange={(value) => handleInputChange('streetAddress', value)}
            allowedCountries={['us', 'ca']}
          />
          {errors.streetAddress && (
            <p className="text-sm text-red-600">{errors.streetAddress}</p>
          )}
        </div>

        {/* City and State Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billing-city" className="text-sm font-medium text-foreground">
              City *
            </Label>
            <Input
              id="billing-city"
              type="text"
              value={data.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className={`${errors.city ? 'border-red-500' : ''}`}
              placeholder="Enter city"
            />
            {errors.city && (
              <p className="text-sm text-red-600">{errors.city}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-state" className="text-sm font-medium text-foreground">
              State/Province *
            </Label>
            <Input
              id="billing-state"
              type="text"
              value={data.state || ''}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className={`${errors.state ? 'border-red-500' : ''}`}
              placeholder="Enter state/province"
            />
            {errors.state && (
              <p className="text-sm text-red-600">{errors.state}</p>
            )}
          </div>
        </div>

        {/* Country and ZIP Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billing-country" className="text-sm font-medium text-foreground">
              Country *
            </Label>
            <Select
              value={data.country || ''}
              onValueChange={(value) => handleInputChange('country', value)}
            >
              <SelectTrigger className={`${errors.country ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country === 'US' ? 'United States' : country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && (
              <p className="text-sm text-red-600">{errors.country}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-zipcode" className="text-sm font-medium text-foreground">
              ZIP/Postal Code *
            </Label>
            <Input
              id="billing-zipcode"
              type="text"
              value={data.zipCode || ''}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              className={`${errors.zipCode ? 'border-red-500' : ''}`}
              placeholder="Enter ZIP/postal code"
            />
            {errors.zipCode && (
              <p className="text-sm text-red-600">{errors.zipCode}</p>
            )}
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="flex items-center justify-center gap-2 h-12 text-base font-medium border-2 border-border hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <Button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 h-12 text-base font-medium bg-black hover:bg-black/90 text-white transition-colors flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
});

BillingDetails.displayName = 'BillingDetails';
