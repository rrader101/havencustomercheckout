import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const [inputValue, setInputValue] = useState(value);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedValue, setLastProcessedValue] = useState('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state with external value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounced manual address parsing for fallback
  const parseManualAddress = useCallback((address: string): AddressComponents => {
    console.log('Parsing manual address:', address);
    
    const result: AddressComponents = {
      streetAddress: '',
      city: '',
      state: '',
      country: 'USA', // Default to USA
      zipCode: ''
    };
    
    // First try comma-separated format: "123 Main St, New York, NY 10001"
    if (address.includes(',')) {
      const parts = address.split(',').map(part => part.trim());
      
      result.streetAddress = parts[0] || address;
      
      if (parts.length >= 2) {
        result.city = parts[1];
      }
      
      if (parts.length >= 3) {
        const stateZipPart = parts[2];
        const stateZipMatch = stateZipPart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
        const zipOnlyMatch = stateZipPart.match(/^(\d{5}(?:-\d{4})?)$/);
        
        if (stateZipMatch) {
          result.state = stateZipMatch[1].trim();
          result.zipCode = stateZipMatch[2];
        } else if (zipOnlyMatch) {
          result.zipCode = zipOnlyMatch[1];
        } else {
          result.state = stateZipPart;
        }
      }
      
      if (parts.length >= 4) {
        result.country = parts[parts.length - 1];
      }
    } else {
      // Handle space-separated format: "123 Main St New York NY 10001"
      const words = address.trim().split(/\s+/);
      
      if (words.length === 0) {
        result.streetAddress = address;
        return result;
      }
      
      // Extract zip code (5 digits, optionally followed by -4 digits)
      const zipIndex = words.findIndex(word => /^\d{5}(?:-\d{4})?$/.test(word));
      if (zipIndex !== -1) {
        result.zipCode = words[zipIndex];
        words.splice(zipIndex, 1); // Remove zip from words array
      }
      
      // Extract state (2-letter abbreviation or common state names)
      const stateAbbreviations = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
      const stateNames = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
      
      const stateIndex = words.findIndex(word => 
        stateAbbreviations.includes(word.toUpperCase()) || 
        stateNames.some(state => state.toLowerCase() === word.toLowerCase())
      );
      
      if (stateIndex !== -1) {
        result.state = words[stateIndex];
        words.splice(stateIndex, 1); // Remove state from words array
      }
      
      // Remaining words: first part is street address, last part(s) are city
      if (words.length > 0) {
        // Try to identify where street address ends and city begins
        // Common street indicators
        const streetIndicators = ['st', 'street', 'ave', 'avenue', 'rd', 'road', 'blvd', 'boulevard', 'ln', 'lane', 'dr', 'drive', 'ct', 'court', 'pl', 'place', 'way', 'pkwy', 'parkway'];
        
        let streetEndIndex = -1;
        for (let i = 0; i < words.length; i++) {
          if (streetIndicators.includes(words[i].toLowerCase().replace(/[.,]/g, ''))) {
            streetEndIndex = i;
            break;
          }
        }
        
        if (streetEndIndex !== -1) {
          // Street address is from start to streetEndIndex (inclusive)
          result.streetAddress = words.slice(0, streetEndIndex + 1).join(' ');
          // City is the remaining words
          result.city = words.slice(streetEndIndex + 1).join(' ');
        } else {
          // Fallback: assume first 2-3 words are street address, rest is city
          const streetWords = Math.min(3, Math.max(2, words.length - 2));
          result.streetAddress = words.slice(0, streetWords).join(' ');
          result.city = words.slice(streetWords).join(' ');
        }
      }
    }
    
    console.log('Parsed manual address result:', result);
    return result;
  }, []);

  // Input sanitization
  const sanitizeInput = useCallback((input: string): string => {
    return input
      .replace(/[^\w\s,.-]/g, '') // Remove special characters except common address chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }, []);

  // Enhanced address validation with geocoding verification
  const validateAddressComponents = useCallback((components: AddressComponents): boolean => {
    // Check if we have meaningful address data
    const hasStreet = Boolean(components.streetAddress && components.streetAddress.length > 2);
    const hasLocation = Boolean(components.city || components.state || components.zipCode);
    
    return hasStreet && hasLocation;
  }, []);

  // Geocoding verification for additional validation
  const verifyAddressWithGeocoding = useCallback(async (address: string): Promise<boolean> => {
    if (!window.google?.maps?.Geocoder) return true; // Skip if geocoder not available
    
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results) {
            resolve(results);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
      
      return result.length > 0;
    } catch (error) {
      console.warn('Geocoding verification failed:', error);
      return true; // Don't block if geocoding fails
    }
  }, []);

  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_PLACES_API_KEY,
      version: 'weekly',
      libraries: ['places']
    });

    loader.load().then(() => {
      if (inputRef.current) {
        // Create autocomplete with minimal configuration
        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['address_components', 'formatted_address'],
          componentRestrictions: { country: ['us', 'ca'] }
        });
        autocompleteRef.current = autocomplete;
        setIsLoaded(true);
        
        // Enhanced place selection handler with multiple fallback strategies
        const handlePlaceChanged = async () => {
          if (isProcessing) return; // Prevent concurrent processing
          
          setIsProcessing(true);
          const place = autocomplete.getPlace();
          
          console.log('Place selected:', place);
          
          try {
            if (!place) {
              console.warn('No place data received');
              return;
            }
            
            let addressComponents: AddressComponents;
            let streetAddr = '';
            
            // Strategy 1: Use address_components if available
            if (place.address_components && place.address_components.length > 0) {
              addressComponents = extractAddressComponents(place.address_components);
              streetAddr = addressComponents.streetAddress;
              
              // Validate the extracted components
              if (validateAddressComponents(addressComponents)) {
                console.log('Successfully extracted from address_components:', addressComponents);
                setInputValue(streetAddr);
                onChange(streetAddr);
                onAddressSelect(addressComponents);
                setLastProcessedValue(streetAddr);
                return;
              }
            }
            
            // Strategy 2: Use formatted_address as fallback
            if (place.formatted_address) {
              console.log('Falling back to formatted_address parsing');
              addressComponents = extractFromFormattedAddress(place.formatted_address);
              streetAddr = addressComponents.streetAddress;
              
              if (validateAddressComponents(addressComponents)) {
                console.log('Successfully extracted from formatted_address:', addressComponents);
                setInputValue(streetAddr);
                onChange(streetAddr);
                onAddressSelect(addressComponents);
                setLastProcessedValue(streetAddr);
                return;
              }
            }
            
            // Strategy 3: Use place name as last resort
            if (place.name) {
              console.log('Using place name as final fallback');
              const manualComponents = parseManualAddress(place.name);
              setInputValue(place.name);
              onChange(place.name);
              onAddressSelect(manualComponents);
              setLastProcessedValue(place.name);
              return;
            }
            
            console.warn('Could not extract meaningful address data from any strategy');
            
          } catch (error) {
            console.error('Error in handlePlaceChanged:', error);
            
            // Final fallback: try to parse whatever we have
            if (place?.formatted_address || place?.name) {
              const fallbackText = place.formatted_address || place.name || '';
              const fallbackComponents = parseManualAddress(fallbackText);
              setInputValue(fallbackText);
              onChange(fallbackText);
              onAddressSelect(fallbackComponents);
            }
          } finally {
            setIsProcessing(false);
          }
        };
        
        // Add place changed listener with debouncing
        autocomplete.addListener('place_changed', handlePlaceChanged);
        
        // Add additional listeners for better UX with validation
        inputRef.current.addEventListener('blur', async () => {
          // If user typed manually and didn't select from dropdown
          if (inputValue && inputValue !== lastProcessedValue && !isProcessing) {
            const sanitizedInput = sanitizeInput(inputValue);
            console.log('Manual input detected, parsing:', sanitizedInput);
            
            setValidationStatus('validating');
            const manualComponents = parseManualAddress(sanitizedInput);
            
            if (validateAddressComponents(manualComponents)) {
              // Optional: Verify with geocoding
              const isValid = await verifyAddressWithGeocoding(sanitizedInput);
              if (isValid) {
                setValidationStatus('valid');
                onAddressSelect(manualComponents);
                setLastProcessedValue(sanitizedInput);
              } else {
                setValidationStatus('invalid');
                console.warn('Address could not be verified with geocoding');
              }
            } else {
              setValidationStatus('invalid');
            }
          }
        });
        
        // Handle Enter key for manual input with validation
        inputRef.current.addEventListener('keydown', async (e) => {
          if (e.key === 'Enter' && inputValue && inputValue !== lastProcessedValue) {
            e.preventDefault();
            const sanitizedInput = sanitizeInput(inputValue);
            console.log('Enter pressed, parsing manual input:', sanitizedInput);
            
            setValidationStatus('validating');
            const manualComponents = parseManualAddress(sanitizedInput);
            
            if (validateAddressComponents(manualComponents)) {
              const isValid = await verifyAddressWithGeocoding(sanitizedInput);
              if (isValid) {
                setValidationStatus('valid');
                onAddressSelect(manualComponents);
                setLastProcessedValue(sanitizedInput);
              } else {
                setValidationStatus('invalid');
              }
            } else {
              setValidationStatus('invalid');
            }
          }
        });
      }
    }).catch((error) => {
      console.error('Error loading Google Maps:', error);
    });
  }, [onChange, onAddressSelect]);

  // Fallback function to extract address components from formatted address string
  const extractFromFormattedAddress = (formattedAddress: string): AddressComponents => {
    const parts = formattedAddress.split(',').map(part => part.trim());
    
    const result: AddressComponents = {
      streetAddress: parts[0] || '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    };
    
    // Try to extract city, state, zip from the remaining parts
    if (parts.length >= 2) {
      result.city = parts[1] || '';
    }
    
    if (parts.length >= 3) {
      const stateZipPart = parts[2];
      // Try to extract state and zip code (e.g., "CA 90210" or "California 90210")
      const stateZipMatch = stateZipPart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
      if (stateZipMatch) {
        result.state = stateZipMatch[1].trim();
        result.zipCode = stateZipMatch[2];
      } else {
        result.state = stateZipPart;
      }
    }
    
    if (parts.length >= 4) {
      result.country = parts[parts.length - 1] || '';
    }
    
    return result;
  };

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
    
    console.log('Processing address components:', components);

    components.forEach((component) => {
      const types = component.types;
      console.log(`Processing component: ${component.long_name} (${types.join(', ')})`);
      
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
    
    console.log('Parsed components before street address construction:', {
      streetNumber, route, subpremise, premise, establishment, streetAddress,
      city: result.city, state: result.state, country: result.country, zipCode: result.zipCode
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

    // Final validation and cleanup
    console.log('Final extracted components:', result);
    
    // Ensure we have at least some address information
    if (!result.streetAddress && !result.city && !result.state && !result.country) {
      console.warn('No meaningful address components extracted');
      // Try to use the first component as street address
      if (components.length > 0) {
        result.streetAddress = components[0].long_name;
      }
    }
    
    // Clean up any empty strings and trim whitespace
    Object.keys(result).forEach(key => {
      const value = result[key as keyof AddressComponents];
      if (typeof value === 'string') {
        result[key as keyof AddressComponents] = value.trim();
      }
    });

    return result;
  };



  // Get validation styling
  const getValidationClassName = () => {
    if (error) return 'border-red-500';
    if (validationStatus === 'validating') return 'border-yellow-400';
    if (validationStatus === 'valid') return 'border-green-500';
    if (validationStatus === 'invalid') return 'border-red-400';
    return '';
  };

  const getValidationMessage = () => {
    // Only show validating message, no success or error messages
    if (validationStatus === 'validating') return 'Validating address...';
    return null;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setInputValue(newValue);
            onChange(newValue);
            // Reset validation status on input change
            if (validationStatus !== 'idle') {
              setValidationStatus('idle');
            }
          }}
          placeholder={placeholder}
          className={`${getValidationClassName()} ${isProcessing ? 'opacity-75' : ''}`}
          disabled={!isLoaded || isProcessing}
        />
        {isProcessing && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {getValidationMessage() && (
         <p className="text-sm text-yellow-600">
           {getValidationMessage()}
         </p>
       )}
      {!isLoaded && (
        <p className="text-sm text-gray-500">Loading Google Maps...</p>
      )}
      <p className="text-xs text-gray-400">
        Start typing an address or select from suggestions. Manual entry is also supported.
      </p>
    </div>
  );
};

export default AddressAutocomplete;