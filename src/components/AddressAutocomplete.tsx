import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const [isSelecting, setIsSelecting] = useState(false);
  const [streetAddress, setStreetAddress] = useState(value);

  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_PLACES_API_KEY,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      if (inputRef.current) {
        // Create autocomplete directly on visible input
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['address_components', 'formatted_address'],
          componentRestrictions: { country: ['us', 'ca'] }
        });
        
        autocompleteRef.current = autocomplete;
        setIsLoaded(true);
        
        // Create place changed handler function
        const handlePlaceChanged = () => {
          const place = autocompleteRef.current?.getPlace();
          if (place?.address_components) {
            setIsSelecting(true);
            
            // Parse address components
            const addressComponents = extractAddressComponents(place.address_components);
            
            // Clear the autocomplete service to prevent dropdown
            if (autocompleteRef.current) {
              google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
            
            // Update state with only street address
            setStreetAddress(addressComponents.streetAddress);
            
            // Blur and clear the input to hide dropdown completely
            if (inputRef.current) {
              inputRef.current.blur();
              // Set the input value directly to prevent any flash
              inputRef.current.value = addressComponents.streetAddress;
            }
            
            // Trigger callbacks
            onAddressSelect(addressComponents);
            
            // Recreate autocomplete after a delay
            setTimeout(() => {
              if (inputRef.current) {
                const newAutocomplete = new google.maps.places.Autocomplete(inputRef.current, {
                  types: ['address'],
                  fields: ['address_components', 'formatted_address'],
                  componentRestrictions: { country: ['us', 'ca'] }
                });
                
                autocompleteRef.current = newAutocomplete;
                
                // Re-add the place_changed listener
                newAutocomplete.addListener('place_changed', handlePlaceChanged);
              }
              setIsSelecting(false);
            }, 200);
          }
        };
        
        // Handle place selection
        autocomplete.addListener('place_changed', handlePlaceChanged);
      }
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
    });
  }, [onAddressSelect]);



  // Enhanced address component extraction with global support and better parsing
  const extractAddressComponents = (components: google.maps.GeocoderAddressComponent[]): AddressComponents => {
    const result: AddressComponents = {
      streetAddress: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    };

    let streetNumber = '';
    let route = '';
    let subpremise = '';
    let premise = '';
    let establishment = '';
    let streetAddress = '';

    components.forEach((component) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) {
        route = component.long_name;
      } else if (types.includes('subpremise')) {
        subpremise = component.long_name;
      } else if (types.includes('premise')) {
        premise = component.long_name;
      } else if (types.includes('establishment')) {
        establishment = component.long_name;
      } else if (types.includes('street_address')) {
        streetAddress = component.long_name;
      } else if (types.includes('locality')) {
        result.city = component.long_name;
      } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
        if (!result.city) {
          result.city = component.long_name;
        }
      } else if (types.includes('administrative_area_level_3') && !result.city) {
        result.city = component.long_name;
      } else if (types.includes('administrative_area_level_2') && !result.city) {
        result.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        // Use long_name for international addresses, short_name for US/CA
        const countryComponent = components.find(c => c.types.includes('country'));
        const isUSorCA = countryComponent && ['US', 'CA'].includes(countryComponent.short_name);
        result.state = isUSorCA ? component.short_name : component.long_name;
      } else if (types.includes('country')) {
        result.country = component.long_name;
      } else if (types.includes('postal_code')) {
        result.zipCode = component.long_name;
      } else if (types.includes('postal_code_suffix')) {
        if (result.zipCode) {
          result.zipCode += `-${component.long_name}`;
        } else {
          result.zipCode = component.long_name;
        }
      }
    });

    // Enhanced street address construction with multiple fallback strategies
    const streetParts = [];
    
    // Strategy 1: Use direct street_address if available
    if (streetAddress) {
      // Extract only the street part, remove city/state/country
      const parts = streetAddress.split(',');
      result.streetAddress = parts[0].trim();
    } else {
      // Strategy 2: Construct from components
      if (streetNumber && route) {
        // Standard format: number + street name
        streetParts.push(streetNumber, route);
      } else if (premise && route) {
        // Building name + street
        streetParts.push(premise, route);
      } else if (establishment && route) {
        // Establishment + street (for businesses)
        streetParts.push(establishment, route);
      } else if (route) {
        // Just street name
        streetParts.push(route);
      } else if (premise) {
        // Just building/premise name
        streetParts.push(premise);
      } else if (establishment) {
        // Just establishment name
        streetParts.push(establishment);
      } else if (streetNumber) {
        // Just number (rare case)
        streetParts.push(streetNumber);
      }
      
      // Add apartment/unit number if present
      if (subpremise) {
        const unitPrefix = /^\d+$/.test(subpremise) ? 'Unit' : '';
        streetParts.push(unitPrefix ? `${unitPrefix} ${subpremise}` : subpremise);
      }
      
      result.streetAddress = streetParts.join(' ').trim();
    }

    // Strategy 3: Enhanced fallback for edge cases
    if (!result.streetAddress && components.length > 0) {
      // Try different component types in order of preference
      const fallbackTypes = [
        'street_address',
        'establishment', 
        'point_of_interest',
        'subpremise',
        'premise',
        'route'
      ];
      
      for (const type of fallbackTypes) {
        const component = components.find(c => c.types.includes(type));
        if (component) {
          let address = component.long_name;
          
          // Clean up the address - remove everything after first comma
          if (address.includes(',')) {
            address = address.split(',')[0].trim();
          }
          
          // Skip if it's just a city, state, or country
          if (!result.city || !address.toLowerCase().includes(result.city.toLowerCase())) {
            result.streetAddress = address;
            break;
          }
        }
      }
      
      // Final fallback: use first component if nothing else worked
      if (!result.streetAddress && components[0]) {
        let address = components[0].long_name;
        if (address.includes(',')) {
          address = address.split(',')[0].trim();
        }
        result.streetAddress = address;
      }
    }

    return result;
  };



  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Input
        ref={inputRef}
        type="text"
        value={streetAddress}
        onChange={(e) => {
          if (!isSelecting) {
            const newValue = e.target.value;
            setStreetAddress(newValue);
            onChange(newValue);
          }
        }}
        placeholder={placeholder}
        className={error ? 'border-red-500' : ''}
        disabled={!isLoaded}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default AddressAutocomplete;