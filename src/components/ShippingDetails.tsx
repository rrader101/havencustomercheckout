import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Truck } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';

interface ShippingData {
  name: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

interface ShippingDetailsProps {
  data: ShippingData;
  onUpdate: (data: Partial<ShippingData>) => void;
  onNext: () => void;
}

export const ShippingDetails = React.memo(({ data, onUpdate, onNext }: ShippingDetailsProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Comprehensive country list (same as PaymentSection)
  const countries = ['USA', 'Canada'];

  // Normalize country names to match dropdown options
  const normalizeCountry = (country: string): string => {
    const normalized = country.toLowerCase().trim();
    if (['usa', 'us', 'united states', 'united states of america'].includes(normalized)) {
      return 'USA';
    }
    if (['canada', 'ca'].includes(normalized)) {
      return 'Canada';
    }
    return country; // Return original if no match
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!data.name.trim()) newErrors.name = 'Name is required';
    if (!data.email.trim()) newErrors.email = 'Email is required';
    if (!data.streetAddress.trim()) newErrors.streetAddress = 'Street address is required';
    if (!data.city.trim()) newErrors.city = 'City is required';
    if (!data.state.trim()) newErrors.state = 'State is required';
    if (!data.country.trim()) newErrors.country = 'Country is required';
    if (!data.zipCode.trim()) newErrors.zipCode = 'Zip code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const handleInputChange = (field: keyof ShippingData, value: string) => {
    onUpdate({ [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
          <Card className="p-6 border-0 bg-card animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Truck className="w-5 h-5 text-foreground" />
                            <h2 className="text-xl font-semibold" style={{ fontWeight: 700, fontSize: '1.4rem', letterSpacing: '-0.02rem' }}>Shipping Details</h2>
        </div>
        <p className="text-muted-foreground">Let's get your copies to you</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={data.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your full name"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>
          
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
          </div>
        </div>

        <div>
            <AddressAutocomplete
              value={data.streetAddress}
              onChange={(value) => handleInputChange('streetAddress', value)}
              onAddressSelect={(addressComponents) => {
                // Auto-fill the address fields when user selects from Google Places
                console.log('Received address components in ShippingDetails:', addressComponents);
                console.log('Current form data before update:', data);
                
                const updatedData = {
                  streetAddress: addressComponents.streetAddress,
                  city: addressComponents.city,
                  state: addressComponents.state,
                  country: normalizeCountry(addressComponents.country),
                  zipCode: addressComponents.zipCode
                };
                
                console.log('Updating form with:', updatedData);
                onUpdate(updatedData);
              }}
              placeholder="123 Main Street"
              label="Street Address"
              error={errors.streetAddress}
            />
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              placeholder="City"
              className={errors.city ? 'border-destructive' : ''}
            />
            {errors.city && <p className="text-sm text-destructive mt-1">{errors.city}</p>}
          </div>
          
          <div>
            <Label htmlFor="state">State/Province</Label>
            <Input
              id="state"
              value={data.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              placeholder="State or Province"
              className={errors.state ? 'border-destructive' : ''}
            />
            {errors.state && <p className="text-sm text-destructive mt-1">{errors.state}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country">Country</Label>
            <Select
              value={data.country}
              onValueChange={(value) => handleInputChange('country', value)}
            >
              <SelectTrigger 
                className={errors.country ? 'border-destructive' : ''}
                style={{ backgroundColor: '#f7f7f7', border: '1px solid rgba(0, 0, 0, 0.1)' }}
              >
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-[#f7f7f7]">
                {countries.map((country) => (
                  <SelectItem 
                    key={country} 
                    value={country}
                    className="hover:bg-gray-200 focus:bg-gray-200 data-[highlighted]:bg-gray-200"
                  >
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.country && <p className="text-sm text-destructive mt-1">{errors.country}</p>}
          </div>
          
          <div>
            <Label htmlFor="zipCode">Postal Code</Label>
            <Input
              id="zipCode"
              value={data.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              placeholder="Postal/Zip Code"
              className={errors.zipCode ? 'border-destructive' : ''}
            />
            {errors.zipCode && <p className="text-sm text-destructive mt-1">{errors.zipCode}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={handleSubmit} className="gap-2">
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
});