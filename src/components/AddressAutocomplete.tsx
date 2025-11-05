import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Track whether Google Maps API options have been set to avoid repeated calls
let gmapsApiOptionsInitialized: boolean = false;

interface AddressComponents {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (addressComponents: AddressComponents) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  error?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter street address",
  label = "Street Address",
  className = "",
  error
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Sync with external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    // Configure loader options once and import the Places library
    try {
      if (!gmapsApiOptionsInitialized) {
        setOptions({ key: import.meta.env.VITE_GOOGLE_MAPS_PLACES_API_KEY, v: 'weekly' });
        gmapsApiOptionsInitialized = true;
      }

      (async () => {
        const { Autocomplete } = await importLibrary('places') as google.maps.PlacesLibrary;

        if (inputRef.current) {
          const autocomplete = new Autocomplete(inputRef.current, {
            types: ['address'],
            fields: ['address_components', 'formatted_address'],
            componentRestrictions: { country: ['us', 'ca'] }
          } as google.maps.places.AutocompleteOptions);

          autocompleteRef.current = autocomplete;
          setIsLoaded(true);

          // Handle place selection from Google Places only
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();

            if (!place || !place.address_components) {
              console.warn('No valid place data received from Google Places');
              return;
            }

            console.log('Google Place selected:', place);

            // Extract address components
            const components: AddressComponents = {
              streetAddress: '',
              city: '',
              state: '',
              country: '',
              zipCode: ''
            };

            let streetNumber = '';
            let route = '';
            let subpremise = '';

            place.address_components.forEach((component) => {
              const types = component.types;

              if (types.includes('street_number')) {
                streetNumber = component.long_name;
              } else if (types.includes('route')) {
                route = component.long_name;
              } else if (types.includes('subpremise')) {
                subpremise = component.long_name;
              } else if (types.includes('locality')) {
                components.city = component.long_name;
              } else if (types.includes('administrative_area_level_1')) {
                components.state = component.short_name;
              } else if (types.includes('country')) {
                components.country = component.long_name;
              } else if (types.includes('postal_code')) {
                components.zipCode = component.long_name;
              }
            });

            // Combine street number, route, and subpremise (unit number) for street address
            const addressParts = [streetNumber, route];
            if (subpremise) {
              addressParts.push(`${subpremise}`);
            }
            components.streetAddress = addressParts.filter(part => part).join(' ').trim();

            // If no street address found, use formatted address first part
            if (!components.streetAddress && place.formatted_address) {
              const parts = place.formatted_address.split(',');
              components.streetAddress = parts[0]?.trim() || '';
            }

            console.log('Extracted components:', components);

            // Update input with street address
            const streetAddr = components.streetAddress;
            setInputValue(streetAddr);
            onChange(streetAddr);
            onAddressSelect(components);
          });
        }
      })().catch((error) => {
        console.error('Error loading Google Maps Places library:', error);
      });
    } catch (error) {
      console.error('Error setting Google Maps options:', error);
    }
  }, [onChange, onAddressSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {label}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={!isLoaded}
          className="placeholder:text-muted-foreground/60 placeholder:text-sm"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {!isLoaded && (
        <p className="text-sm text-gray-500">Loading Google Maps...</p>
      )}
      <p className="text-xs text-gray-400">
        Start typing an address and select from Google suggestions.
      </p>
    </div>
  );
};

export default AddressAutocomplete;