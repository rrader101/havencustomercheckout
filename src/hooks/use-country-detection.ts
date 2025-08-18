import { useState, useEffect } from 'react';

export const useCountryDetection = () => {
  const [detectedCountry, setDetectedCountry] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Try IP-based geolocation first (more reliable)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.country_name) {
          setDetectedCountry(data.country_name);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.log('IP geolocation failed, trying browser geolocation...');
      }

      // Fallback to browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              const data = await response.json();
              
              if (data.countryName) {
                setDetectedCountry(data.countryName);
              }
            } catch (error) {
              console.log('Reverse geocoding failed');
            } finally {
              setIsLoading(false);
            }
          },
          (error) => {
            console.log('Geolocation failed:', error);
            setIsLoading(false);
          }
        );
      } else {
        setIsLoading(false);
      }
    };

    detectCountry();
  }, []);

  return { detectedCountry, isLoading };
};
