import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Loader2, Truck } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';
import { saveAddress } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { usePostHog } from 'posthog-js/react';
import { CheckoutEvents, CheckoutEventProperties, getTimestamp } from '@/lib/analytics';

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
  dealId?: string;
}

export const ShippingDetails = React.memo(({ data, onUpdate, onNext, dealId }: ShippingDetailsProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const [initialData, setInitialData] = useState<ShippingData | null>(null);
  const [isOtherCountry, setIsOtherCountry] = useState(false);

  // Comprehensive country list including Caribbean countries
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
  const posthog = usePostHog();


  // Display mapping for country names
  const getCountryDisplayName = (countryCode: string): string => {
    switch (countryCode) {
      case 'US':
        return 'United States';
      case 'Canada':
        return 'Canada';
      case 'Bahamas':
        return 'Bahamas';
      case 'Barbados':
        return 'Barbados';
      case 'Cayman Islands':
        return 'Cayman Islands';
      case 'Jamaica':
        return 'Jamaica';
      case 'Trinidad and Tobago':
        return 'Trinidad and Tobago';
      case 'Turks and Caicos Islands':
        return 'Turks and Caicos Islands';
      case 'British Virgin Islands':
        return 'British Virgin Islands';
      case 'US Virgin Islands':
        return 'US Virgin Islands';
      case 'Bermuda':
        return 'Bermuda';
      case 'Other':
        return 'Other Country';
      default:
        return countryCode;
    }
  };

  // Normalize country names to match dropdown options
  const normalizeCountry = (country: string): string => {
    const normalized = country.toLowerCase().trim();
    if (['usa', 'us', 'united states', 'united states of america'].includes(normalized)) {
      // Match dropdown option value
      return 'United States';
    }
    if (['canada', 'ca'].includes(normalized)) {
      return 'Canada';
    }
    if (['bahamas', 'the bahamas', 'bs'].includes(normalized)) {
      return 'Bahamas';
    }
    if (['barbados', 'bb'].includes(normalized)) {
      return 'Barbados';
    }
    if (['cayman islands', 'cayman', 'ky'].includes(normalized)) {
      return 'Cayman Islands';
    }
    if (['jamaica', 'jm'].includes(normalized)) {
      return 'Jamaica';
    }
    if (['trinidad and tobago', 'trinidad', 'tobago', 'tt'].includes(normalized)) {
      return 'Trinidad and Tobago';
    }
    if (['turks and caicos', 'turks and caicos islands', 'tc'].includes(normalized)) {
      return 'Turks and Caicos Islands';
    }
    if (['british virgin islands', 'bvi', 'vg'].includes(normalized)) {
      return 'British Virgin Islands';
    }
    if (['us virgin islands', 'usvi', 'virgin islands', 'vi'].includes(normalized)) {
      return 'US Virgin Islands';
    }
    if (['bermuda', 'bm'].includes(normalized)) {
      return 'Bermuda';
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

    // PostHog: Track validation errors
    if (Object.keys(newErrors).length > 0 && posthog) {
      posthog.capture(CheckoutEvents.FORM_VALIDATION_ERROR, {
        [CheckoutEventProperties.ERROR_TYPE]: 'shipping_validation_failed',
        [CheckoutEventProperties.ERROR_MESSAGE]: Object.keys(newErrors).join(', '),
        [CheckoutEventProperties.DEAL_ID]: dealId,
        [CheckoutEventProperties.CURRENT_STEP]: 'shipping',
        [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
      });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      // Call address API only if user has made changes
    if (dealId && hasUserChanges) {
      try {
        setIsLoading(true);
        await saveAddress({
          uuid: dealId,
          shipping_street_address: data.streetAddress,
          shipping_city: data.city,
          shipping_state: data.state,
          shipping_zipcode: data.zipCode,
          shipping_country: data.country
        });
        onNext();
      } catch (error) {
        console.error('Failed to save address:', error);
        toast({
        description: 'Failed to save shipping address. Please try again.',
        });
        // You might want to show an error message to the user here
      } finally {
        setIsLoading(false);
      }
    } else {
      onNext();
    }
    }
  };

  // Track initial data to detect user changes
  useEffect(() => {
    if (!initialData && data.name) {
      setInitialData({ ...data });
    }
  }, [data, initialData]);

  const handleInputChange = (field: keyof ShippingData, value: string) => {
    onUpdate({ [field]: value });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Mark that user has made changes
    if (initialData && !hasUserChanges) {
      setHasUserChanges(true);
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
              
              const updatedData = {
                streetAddress: addressComponents.streetAddress,
                city: addressComponents.city,
                state: addressComponents.state,
                country: normalizeCountry(addressComponents.country),
                zipCode: addressComponents.zipCode
              };
              
              onUpdate(updatedData);
              
              // Mark that user has made changes when selecting from autocomplete
              if (initialData && !hasUserChanges) {
                setHasUserChanges(true);
              }

              // PostHog: Track autocomplete usage
              if (posthog) {
                posthog.capture(CheckoutEvents.SHIPPING_ADDRESS_AUTOCOMPLETE_USED, {
                  [CheckoutEventProperties.DEAL_ID]: dealId,
                  [CheckoutEventProperties.CURRENT_STEP]: 'shipping',
                  [CheckoutEventProperties.TIMESTAMP]: getTimestamp()
                });
              }
            }}
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
            {!isOtherCountry ? (
              <>
                <Select
                  value={data.country}
                  onValueChange={(value) => {
                    if (value === 'Other') {
                      setIsOtherCountry(true);
                      handleInputChange('country', '');
                    } else {
                      handleInputChange('country', value);
                    }
                  }}
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
                        {getCountryDisplayName(country)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Input
                  id="country"
                  value={data.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  placeholder="Enter your country"
                  className={errors.country ? 'border-destructive' : ''}
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsOtherCountry(false);
                    handleInputChange('country', 'US');
                  }}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  ← Back to country list
                </button>
              </>
            )}
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

      <div className="space-y-6 mt-6">
        <div className="flex justify-end">
          <Button onClick={handleSubmit} className="gap-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm
                <Check className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

      
      </div>
    </Card>
  );
});
